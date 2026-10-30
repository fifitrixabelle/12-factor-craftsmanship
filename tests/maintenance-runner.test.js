const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cases = require('../eval/cases/cases.json');

test('review grading checks explicit decisions, not rationale wording', () => {
  const { gradeReview } = require('../eval/cases/grade');
  const shared = cases.find(c => c.id === 'shared_policy');
  assert.equal(gradeReview(shared, JSON.stringify({ decision: 'share', rationale: 'The supplied policy requires both wrappers to change together.', findings: [] })).pass, true);
  assert.equal(gradeReview(shared, JSON.stringify({ decision: 'keep-separate', rationale: 'Always avoid shared code.', findings: [] })).pass, false);
  assert.equal(gradeReview(shared, 'Use convention over configuration').status, 'invalid_submission');
  assert.equal(gradeReview(shared, '{"decision":"share"}').status, 'invalid_submission');
});

test('valid library control rejects invented defect findings and requires semantic review', () => {
  const { gradeReview } = require('../eval/cases/grade');
  const c = cases.find(c => c.id === 'library_adaptation');
  const response = { decision: 'accept', rationale: 'Matches the supplied contract.', findings: [] };
  const grade = gradeReview(c, '```json\n' + JSON.stringify(response) + '\n```');
  assert.equal(grade.pass, true);
  assert.equal(grade.rationaleReviewRequired, true);
  assert.equal(gradeReview(c, JSON.stringify({ ...response, findings: ['Must bind a port'] })).pass, false);
});

test('runner protects callers and rejects unauthorized additions', () => {
  const { prepareCase, snapshot, checkScope } = require('../eval/cases/run');
  const c = cases.find(c => c.id === 'payment_retry');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-runner-'));
  try {
    prepareCase(c, root);
    const before = snapshot(root);
    assert.ok(before['checkout.cjs']);
    fs.writeFileSync(path.join(root, 'payment.cjs'), '// repaired');
    assert.deepEqual(checkScope(c, before, snapshot(root)), []);
    fs.writeFileSync(path.join(root, 'helper.cjs'), '// unrequested');
    fs.writeFileSync(path.join(root, 'package.json'), '{"dependencies":{"extra":"1"}}');
    assert.deepEqual(checkScope(c, before, snapshot(root)).sort(), ['helper.cjs', 'package.json']);
    fs.rmSync(path.join(root, 'helper.cjs'));
    fs.rmSync(path.join(root, 'package.json'));
    fs.writeFileSync(path.join(root, 'checkout.cjs'), '// shortcut');
    assert.deepEqual(checkScope(c, before, snapshot(root)), ['checkout.cjs']);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('native grading invokes the sandbox with networking disabled and checks actual test counts', () => {
  const { gradeRepair } = require('../eval/cases/grade');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-native-'));
  try {
    const executable = path.join(root, 'fake-codex');
    fs.writeFileSync(executable, `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] !== 'sandbox' || !args.includes('sandbox_workspace_write.network_access=false')) process.exit(9);
console.log('TAP version 13\\n# tests 0\\n# pass 0\\n# fail 0');
`, { mode: 0o755 });
    const c = cases.find(c => c.id === 'payment_retry');
    const grade = gradeRepair(c, root, { executable });
    assert.equal(grade.status, 'completed');
    assert.equal(grade.pass, false, 'zero executed tests cannot pass a repair task');
    assert.equal(grade.expectedTests, 5);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('summary separates repair outcomes, review decisions, and execution failures', () => {
  const { summarizeCases } = require('../eval/cases/run');
  const result = pass => ({ status: 'completed', grade: { status: 'completed', pass } });
  const error = { status: 'execution_error', grade: null };
  const summary = summarizeCases([
    { kind: 'repair', baseline: result(false), skill: result(true) },
    { kind: 'review', baseline: result(true), skill: result(false) },
    { kind: 'repair', baseline: error, skill: result(true) }
  ]);
  assert.deepEqual(summary.repairs, { pairedCompleted: 1, baselinePass: 0, skillPass: 1 });
  assert.deepEqual(summary.reviewDecisions, { pairedCompleted: 1, baselinePass: 1, skillPass: 0 });
  assert.equal(summary.executionErrors, 1);
  assert.equal(summary.gradingErrors, 0);
});

test('paired runner preserves candidate files and separates executable repairs from review controls', () => {
  const { runBenchmark } = require('../eval/cases/run');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-paired-'));
  try {
    const executable = path.join(root, 'fake-codex');
    const reference = path.join(__dirname, '../eval/cases/prompt_transport/reference/transport.cjs');
    fs.writeFileSync(executable, `#!/usr/bin/env node
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const args = process.argv.slice(2);
if (args.includes('--version')) { console.log('fake-codex 1.0'); process.exit(0); }
if (args[0] === 'sandbox') {
  const command = args.slice(args.indexOf('--') + 1);
  const result = spawnSync(command[0], command.slice(1), {stdio:'inherit'});
  process.exit(result.status ?? 1);
}
if (args[args.indexOf('--model') + 1] !== 'fake-model') process.exit(9);
const repair = args[args.indexOf('--sandbox') + 1] === 'workspace-write';
if (repair) fs.copyFileSync(${JSON.stringify(reference)}, 'transport.cjs');
const output = repair ? 'Updated the existing transport module.' : JSON.stringify({decision:'accept',rationale:'Matches the supplied library contract.',findings:[]});
fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], output);
console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:100,output_tokens:20}}));
`, { mode: 0o755 });
    const outputFile = path.join(root, 'record.json');
    const record = runBenchmark({ model: 'fake-model', executable, outputFile,
      selected: cases.filter(c => ['prompt_transport', 'library_adaptation'].includes(c.id)) });
    assert.equal(record.suiteVersion, 'maintenance-v1');
    assert.equal(record.summary.executionErrors, 0);
    assert.equal(record.summary.gradingErrors, 0);
    assert.deepEqual(record.summary.repairs, { pairedCompleted: 1, baselinePass: 1, skillPass: 1 });
    assert.deepEqual(record.summary.reviewDecisions, { pairedCompleted: 1, baselinePass: 1, skillPass: 1 });
    assert.ok(record.completedAt);
    const repair = record.cases[0];
    assert.equal(repair.skill.grade.method, 'acceptance-tests');
    assert.equal(repair.skill.candidateFiles['transport.cjs'], fs.readFileSync(reference, 'utf8'));
    assert.ok(repair.baseline.prompt.includes('existing project files'));
    assert.ok(record.cases[1].skill.grade.rationaleReviewRequired);
    assert.deepEqual(JSON.parse(fs.readFileSync(outputFile)), record);
    assert.throws(() => runBenchmark({ model: 'fake-model', executable, outputFile, selected: [] }), /EEXIST/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('missing model and unknown case stop before any live requests', () => {
  const { spawnSync } = require('node:child_process');
  for (const args of [[], ['--case', 'missing', '--model', 'fake']]) {
    const result = spawnSync(process.execPath, ['eval/cases/run.js', ...args], {
      cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 1000
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--model|Unknown case/);
  }
});
