const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');
const harness = `
const { start } = require(process.argv[1]);
const mode = process.argv[2];
let pending; let reads = 0;
const keepAlive = setInterval(() => {}, 1000);
const queue = {
  receive() {
    if (mode !== 'poll' && reads++ === 0) return Promise.resolve({ id: 1 });
    console.log(mode === 'poll' ? 'POLLING' : 'EXTRA_POLL');
    return new Promise(resolve => { pending = resolve; });
  },
  async ack() { console.log('ACK'); },
  close() { console.log('CLOSED'); pending?.(null); }
};
async function handle() {
  console.log('START');
  if (mode === 'error') throw new Error('job failed');
  if (mode === 'hang') await new Promise(() => {});
  else await new Promise(resolve => setTimeout(resolve, 80));
  console.log('DONE');
}
start(queue, handle, { shutdownMs: 200 }).then(() => clearInterval(keepAlive), e => {
  console.error(e); process.exitCode = 1; clearInterval(keepAlive);
});
`;
async function terminate(mode, signal) {
  const child = spawn(process.execPath, ['-e', harness, path.join(process.env.CASE_DIR, 'worker.cjs'), mode]);
  let stdout = ''; let stderr = ''; let sent = false;
  const deadline = setTimeout(() => child.kill('SIGKILL'), 3000);
  child.stdout.on('data', chunk => {
    stdout += chunk;
    if (!sent && stdout.includes(mode === 'poll' ? 'POLLING' : 'START')) {
      sent = true; child.kill(signal);
    }
  });
  child.stderr.on('data', chunk => { stderr += chunk; });
  return await new Promise((resolve, reject) => {
    child.on('error', e => { clearTimeout(deadline); reject(e); });
    child.on('close', (code, killedBy) => { clearTimeout(deadline); resolve({ code, killedBy, stdout, stderr }); });
  });
}
test('termination during processing drains and acknowledges before exit', async () => {
  const result = await terminate('work', 'SIGTERM');
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /DONE\nACK/);
  assert.doesNotMatch(result.stdout, /EXTRA_POLL/);
});
test('termination during polling closes intake', async () => {
  const result = await terminate('poll', 'SIGINT');
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /CLOSED/);
  assert.doesNotMatch(result.stdout, /START|ACK/);
});
test('a stalled job exceeds its deadline without acknowledgement', async () => {
  const result = await terminate('hang', 'SIGTERM');
  assert.equal(result.code, 1, JSON.stringify(result));
  assert.equal(result.killedBy, null, 'the worker must enforce its own deadline');
  assert.doesNotMatch(result.stdout, /ACK/);
});
test('a failed job remains unacknowledged', async () => {
  const result = await terminate('error', 'SIGTERM');
  assert.equal(result.code, 1, JSON.stringify(result));
  assert.doesNotMatch(result.stdout, /ACK/);
});
