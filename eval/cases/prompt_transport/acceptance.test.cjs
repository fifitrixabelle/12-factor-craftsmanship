const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { runPrompt } = require(path.join(process.env.CASE_DIR, 'transport.cjs'));
const { echoPrompt } = require(path.join(process.env.CASE_DIR, 'caller.cjs'));
test('literal shell syntax and quotes are data', () => {
  for (const prompt of ['Keep `--dry-run` and `customer_name`.', 'Keep $(printf SUBSTITUTED), $HOME, "quotes", and apostrophes\'.']) {
    assert.equal(echoPrompt(prompt), prompt);
  }
});
test('multiline prompts and argument boundaries survive', () => {
  const prompt = 'first line\nsecond line\\literal\\path\n';
  assert.equal(runPrompt(process.execPath, ['-e', 'process.stdout.write(process.argv[1])'], prompt), prompt);
  const args = ['-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))', 'two words', ''];
  assert.deepEqual(JSON.parse(runPrompt(process.execPath, args, prompt)), ['two words', '', prompt]);
});
test('child failures propagate to callers', () => {
  assert.throws(() => runPrompt(process.execPath, ['-e', 'process.exit(7)'], 'task'), e => e.status === 7);
});
