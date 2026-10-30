const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const cases = require('../eval/cases/cases.json');

test('maintenance cases declare provenance, constraints, rubrics, and contrasting controls', () => {
  assert.equal(new Set(cases.map(c => c.id)).size, cases.length);
  assert.equal(cases.filter(c => c.kind === 'repair').length, 4);
  assert.equal(cases.filter(c => c.kind === 'review').length, 3);
  for (const c of cases) {
    assert.ok(c.task && c.constraints.length && c.rubric.length);
    assert.ok(['repo-regression', 'constructed'].includes(c.provenance.kind));
    assert.ok(c.provenance.description);
  }
  assert.equal(cases.find(c => c.id === 'shared_policy').expectedDecision, 'share');
  assert.equal(cases.find(c => c.id === 'independent_policy').expectedDecision, 'keep-separate');
  assert.equal(cases.find(c => c.id === 'library_adaptation').expectedDecision, 'accept');
});

for (const c of cases.filter(c => c.kind === 'repair')) {
  for (const variant of ['broken', 'reference']) {
    test(`${c.id}: acceptance tests ${variant === 'broken' ? 'expose the regression' : 'accept the reference repair'}`, () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-case-'));
      try {
        const caseDir = path.join(__dirname, '../eval/cases', c.id);
        fs.cpSync(path.join(caseDir, 'project'), root, { recursive: true });
        if (variant === 'reference') fs.cpSync(path.join(caseDir, 'reference'), root, { recursive: true });
        const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', path.join(caseDir, 'acceptance.test.cjs')], {
          env: { PATH: process.env.PATH, HOME: root, TMPDIR: root, CASE_DIR: root },
          cwd: root, encoding: 'utf8', timeout: 10000, killSignal: 'SIGKILL'
        });
        assert.ifError(result.error);
        assert.match(result.stdout, new RegExp(`# tests ${c.testCount}\\b`), result.stdout + result.stderr);
        if (variant === 'reference') assert.equal(result.status, 0, result.stdout + result.stderr);
        else assert.notEqual(result.status, 0, 'The broken project must demonstrate an observable failure');
      } finally { fs.rmSync(root, { recursive: true, force: true }); }
    });
  }
}
