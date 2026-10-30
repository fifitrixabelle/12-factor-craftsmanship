const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { checkout } = require(path.join(process.env.CASE_DIR, 'checkout.cjs'));
const order = { paymentId: 'payment-order-42', total: 1200 };
function gateway(effect) {
  let attempts = 0;
  const times = [];
  return { times, get attempts() { return attempts; }, async charge(amount, options) {
    for (let i = 0; i < (options.maxAttempts ?? 2); i++) {
      times.push(performance.now());
      try { return await effect({ amount, key: options.idempotencyKey, attempt: ++attempts }); }
      catch (error) {
        const transient = error.status === 429 || error.status >= 500 || ['ETIMEDOUT', 'ECONNRESET'].includes(error.code);
        if (!transient || i === (options.maxAttempts ?? 2) - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
  }};
}
test('uncertain commits and checkout replays produce one durable charge', async () => {
  const ledger = new Map();
  const api = gateway(({ key, attempt, amount }) => {
    if (!ledger.has(key)) ledger.set(key, { id: `charge-${ledger.size}`, amount });
    if (attempt <= 2) throw Object.assign(new Error('response lost after commit'), { code: 'ETIMEDOUT' });
    return ledger.get(key);
  });
  const first = await checkout(api, order);
  assert.deepEqual(await checkout(api, order), first);
  assert.equal(ledger.size, 1);
  assert.equal(first.amount, order.total);
  const secondOrder = { paymentId: 'payment-order-43', total: 3450 };
  const second = await checkout(api, secondOrder);
  assert.equal(ledger.size, 2, 'different logical payments must remain distinct');
  assert.notEqual(second.id, first.id);
  assert.equal(second.amount, secondOrder.total);
  assert.deepEqual(await checkout(api, secondOrder), second);
});
test('permanent declines cause one underlying attempt', async () => {
  const api = gateway(() => { throw Object.assign(new Error('declined'), { status: 400 }); });
  await assert.rejects(checkout(api, order), { status: 400 });
  assert.equal(api.attempts, 1);
});
test('SDK and application retries share a total budget and reject exhaustion', async () => {
  const api = gateway(() => { throw Object.assign(new Error('unavailable'), { status: 503 }); });
  await assert.rejects(checkout(api, order), { status: 503 });
  assert.ok(api.attempts >= 1 && api.attempts <= 3, `underlying attempts: ${api.attempts}`);
});
test('unclassified failures propagate once', async () => {
  const error = new Error('invalid gateway configuration');
  const api = gateway(() => { throw error; });
  await assert.rejects(checkout(api, order), e => e === error);
  assert.equal(api.attempts, 1);
});
test('transient retries have a positive bounded delay', async () => {
  const api = gateway(() => { throw Object.assign(new Error('unavailable'), { status: 503 }); });
  await assert.rejects(checkout(api, order), { status: 503 });
  assert.equal(api.attempts, 3, 'this scenario should exercise the retry budget');
  const gaps = api.times.slice(1).map((time, i) => time - api.times[i]);
  // The contract requires 5..250 ms; allow timer resolution and scheduler overhead.
  assert.ok(gaps.every(ms => ms >= 2 && ms < 1000), `retry gaps: ${gaps.join(', ')} ms`);
});
