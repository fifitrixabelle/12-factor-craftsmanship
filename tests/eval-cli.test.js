const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const run = args => spawnSync(process.execPath, ['eval/run.js', ...args], {
  cwd: path.join(__dirname, '..'), encoding: 'utf8'
});

test('default scorecard clearly identifies hand-authored fixture checks', () => {
  const result = run([]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /fixture/i);
  assert.doesNotMatch(result.stdout, /Baseline \(no skill\)/);
});

for (const args of [['--input'], ['--unknown']]) {
  test(`CLI rejects invalid options: ${args.join(' ')}`, () => {
    const result = run(args);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /usage|argument|input/i);
  });
}

test('CLI rejects unknown, duplicate, and non-string probe completions', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-input-'));
  try {
    for (const data of [
      [{ probe: 'typo', output: 'text' }],
      [{ probe: 'retry_idempotency', output: 123 }],
      [{ probe: 'retry_idempotency', output: 'a' }, { probe: 'retry_idempotency', output: 'b' }],
      null
    ]) {
      const filename = path.join(root, 'input.json');
      fs.writeFileSync(filename, JSON.stringify(data));
      const result = run(['--input', filename]);
      assert.notEqual(result.status, 0, JSON.stringify(data));
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('custom input reports missing probes separately and supports Markdown', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-partial-'));
  try {
    const filename = path.join(root, 'input.json');
    fs.writeFileSync(filename, JSON.stringify([{ probe: 'state_variants', output: 'Use a union' }]));
    const result = run(['--input', filename, '--markdown']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /\|/);
    assert.match(result.stdout, /MISSING/);
    assert.match(result.stdout, /1\/10/);
    assert.doesNotMatch(result.stdout, /All safety and design checks passed/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
