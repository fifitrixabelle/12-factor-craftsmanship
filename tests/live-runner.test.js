const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('collector preserves exact prompts and records model, usage, and elapsed time', () => {
  const { collectResponse } = require('../eval/gather-proof');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft proof-'));
  try {
    const executable = path.join(root, 'fake-codex');
    fs.writeFileSync(executable, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (!args.includes('--ignore-user-config') || !args.includes('--ephemeral')) process.exit(2);
if (args[args.indexOf('--model') + 1] !== 'test-model') process.exit(3);
fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], fs.readFileSync(0, 'utf8'));
console.log(JSON.stringify({type:'turn.completed', usage:{input_tokens:12,output_tokens:5}}));
`, { mode: 0o755 });
    const prompt = 'Keep `--dry-run` and $(printf bad), "quotes", $HOME and\nnewlines.';
    const result = collectResponse({ executable, model: 'test-model', prompt, workDir: root,
      outputFile: path.join(root, 'answer.txt'), timeoutMs: 1000 });
    assert.equal(result.status, 'completed');
    assert.equal(result.output, prompt);
    assert.deepEqual(result.usage, { input_tokens: 12, output_tokens: 5 });
    assert.ok(result.durationMs >= 0);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('collector keeps subprocess failures separate from quality grades and stale output', () => {
  const { collectResponse } = require('../eval/gather-proof');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-failure-'));
  try {
    const outputFile = path.join(root, 'answer.txt');
    fs.writeFileSync(outputFile, 'stale passing answer');
    const result = collectResponse({ executable: path.join(root, 'missing-executable'),
      model: 'test', prompt: 'test', workDir: root, outputFile, timeoutMs: 100 });
    assert.equal(result.status, 'execution_error');
    assert.equal(result.output, null);
    assert.ok(result.error);
    assert.equal(result.grade, undefined);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('importing collector has no live execution side effects', () => {
  const result = spawnSync(process.execPath, ['-e', "require('./eval/gather-proof')"],
    { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 1000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});

test('summary compares only completed pairs and counts execution errors', () => {
  const { summarize } = require('../eval/gather-proof');
  const success = pass => ({ status: 'completed', grade: { pass } });
  const error = { status: 'execution_error', grade: null };
  assert.deepEqual(summarize([
    { baseline: success(false), skill: success(true) },
    { baseline: error, skill: success(false) }
  ]), { total: 2, pairedCompleted: 1, executionErrors: 1, baselineScore: 0, skillScore: 1, deltaPercentagePoints: 100 });
  assert.equal(summarize([{ baseline: error, skill: error }]).deltaPercentagePoints, null);
});

test('live CLI requires an explicit model before collecting responses', () => {
  const result = spawnSync(process.execPath, ['eval/gather-proof.js'],
    { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 1000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--model/);
  assert.equal(result.stdout, '');
});

test('collector records timeouts as execution errors', () => {
  const { collectResponse } = require('../eval/gather-proof');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-timeout-'));
  try {
    const executable = path.join(root, 'fake-codex');
    fs.writeFileSync(executable, '#!/usr/bin/env node\nsetInterval(() => {}, 1000);\n', { mode: 0o755 });
    const result = collectResponse({ executable, model: 'test', prompt: 'test', workDir: root,
      outputFile: path.join(root, 'answer'), timeoutMs: 100 });
    assert.equal(result.status, 'execution_error');
    assert.match(result.error, /ETIMEDOUT/);
    assert.equal(result.output, null);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('collector enforces timeout even when a child handles SIGTERM', () => {
  const { collectResponse } = require('../eval/gather-proof');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-hard-timeout-'));
  try {
    const executable = path.join(root, 'fake-codex');
    fs.writeFileSync(executable, '#!/usr/bin/env node\nprocess.on("SIGTERM", () => {}); setTimeout(() => process.exit(0), 900);\n', { mode: 0o755 });
    const result = collectResponse({ executable, model: 'test', prompt: 'test', workDir: root,
      outputFile: path.join(root, 'answer'), timeoutMs: 500 });
    assert.equal(result.status, 'execution_error');
    assert.equal(result.signal, 'SIGKILL');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('paired collection preserves provenance, excludes failed pairs, and refuses to overwrite runs', () => {
  const { gatherProof } = require('../eval/gather-proof');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-full-run-'));
  try {
    const executable = path.join(root, 'fake-codex');
    fs.writeFileSync(executable, `#!/usr/bin/env node
const fs = require('node:fs');
if (process.argv.includes('--version')) { console.log('fake-codex 1.0'); process.exit(0); }
const prompt = fs.readFileSync(0, 'utf8');
if (prompt.startsWith('Write a TypeScript/Node.js payment')) process.exit(9);
const args = process.argv.slice(2);
fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], 'Test answer');
`, { mode: 0o755 });
    const resultFile = path.join(root, 'record.json');
    const record = gatherProof({ model: 'test-model', executable, resultFile });
    assert.equal(record.schemaVersion, 2);
    assert.equal(record.requestedModel, 'test-model');
    assert.equal(record.cliVersion, 'fake-codex 1.0');
    assert.match(record.skillSha256, /^[a-f0-9]{64}$/);
    assert.match(record.probesSha256, /^[a-f0-9]{64}$/);
    assert.match(record.sourceRevision, /^[a-f0-9]{40}$/);
    assert.ok(record.completedAt);
    assert.equal(record.probes.length, 10);
    assert.equal(record.summary.executionErrors, 1);
    assert.equal(record.summary.pairedCompleted, 9);
    assert.equal(record.probes[0].baseline.grade, null);
    assert.deepEqual(JSON.parse(fs.readFileSync(resultFile)), record);
    assert.throws(() => gatherProof({ model: 'test-model', executable, resultFile }), /EEXIST/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
