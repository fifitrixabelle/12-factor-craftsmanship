const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fixture = require('../eval/fixtures').retry_idempotency.passing;

function paymentGateway(statuses) {
  const calls = [];
  const context = {
    crypto: { randomUUID: () => 'stable-key' },
    AbortSignal,
    TypeError,
    setTimeout: resolve => { resolve(); },
    fetch: async (_url, options) => {
      calls.push(options);
      const status = statuses.shift() ?? 503;
      if (status instanceof Error) throw status;
      return { status, ok: status < 400, json: async () => ({ charged: true }) };
    }
  };
  // Strip only the known annotations in this trusted fixture; no generated model code is executed.
  const javascript = fixture.replace(/interface ChargeOptions \{[^}]*\}/, '')
    .replace('amount: number', 'amount').replace('currency: string', 'currency')
    .replace('options: ChargeOptions', 'options').replace('err: any', 'err');
  vm.runInNewContext(javascript, context);
  return { charge: context.chargeCustomer, calls };
}

test('passing payment fixture stops on non-transient HTTP failures', async () => {
  const gateway = paymentGateway([400, 200]);
  await assert.rejects(gateway.charge(10, 'GBP'), /400/);
  assert.equal(gateway.calls.length, 1);
});

test('passing payment fixture throws when transient failures exhaust retries', async () => {
  const gateway = paymentGateway([503, 503, 503]);
  await assert.rejects(gateway.charge(10, 'GBP'), /503|exhaust/i);
  assert.equal(gateway.calls.length, 3);
});

test('passing payment fixture preserves the caller idempotency key across retries', async () => {
  const gateway = paymentGateway([503, 200]);
  assert.deepEqual(JSON.parse(JSON.stringify(await gateway.charge(10, 'GBP', { idempotencyKey: 'logical-payment' }))), { charged: true });
  assert.deepEqual(gateway.calls.map(call => call.headers['Idempotency-Key']), ['logical-payment', 'logical-payment']);
});

test('passing payment fixture retries transient network failures and 429 responses', async () => {
  const gateway = paymentGateway([new TypeError('fetch failed'), 429, 200]);
  await gateway.charge(10, 'GBP');
  assert.equal(gateway.calls.length, 3);
  assert.equal(new Set(gateway.calls.map(call => call.headers['Idempotency-Key'])).size, 1);
});

test('passing payment fixture propagates unexpected errors without retrying', async () => {
  const gateway = paymentGateway([new Error('bad configuration'), 200]);
  await assert.rejects(gateway.charge(10, 'GBP'), /bad configuration/);
  assert.equal(gateway.calls.length, 1);
});
