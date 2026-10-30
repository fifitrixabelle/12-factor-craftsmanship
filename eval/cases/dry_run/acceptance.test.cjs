const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = process.env.CASE_DIR;
function setup() {
  const scratch = fs.mkdtempSync(path.join(root, 'scratch-'));
  const dir = path.join(scratch, 'cache'); fs.mkdirSync(dir);
  for (const name of ['old', 'fresh']) fs.mkdirSync(path.join(dir, name));
  const old = new Date(Date.now() - 30 * 86400000);
  fs.utimesSync(path.join(dir, 'old'), old, old);
  fs.writeFileSync(path.join(dir, 'keep.txt'), 'keep');
  const external = path.join(scratch, 'outside'); fs.mkdirSync(external);
  fs.writeFileSync(path.join(external, 'keep.txt'), 'outside');
  fs.symlinkSync(external, path.join(dir, 'linked'));
  return { scratch, dir, external };
}
function run(dir, days, extra = []) {
  return spawnSync(process.execPath, [path.join(root, 'prune.cjs'), '--dir', dir, '--days', days, ...extra], { encoding: 'utf8', timeout: 2000 });
}
test('dry-run preserves all entries and reports the eligible directory', () => {
  const { dir } = setup(); const before = fs.readdirSync(dir);
  const result = run(dir, '7', ['--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readdirSync(dir), before);
  assert.ok(result.stdout.includes(path.join(dir, 'old')));
});
test('normal cleanup preserves fresh directories, files, links, and external data', () => {
  const { dir, external } = setup(); const result = run(dir, '7');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['fresh', 'keep.txt', 'linked']);
  assert.equal(fs.readFileSync(path.join(external, 'keep.txt'), 'utf8'), 'outside');
});
test('invalid retention fails clearly before changing the directory', () => {
  for (const days of ['0', '-1', '1.5', 'not-a-number']) {
    const { dir } = setup(); const before = fs.readdirSync(dir);
    const result = run(dir, days);
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes('--days'), 'feedback must identify the invalid option');
    assert.deepEqual(fs.readdirSync(dir), before);
  }
});
test('a symlink target is rejected before deleting external data', () => {
  const { scratch, dir } = setup();
  const linkedRoot = path.join(scratch, 'root-link'); fs.symlinkSync(dir, linkedRoot);
  const before = fs.readdirSync(dir); const result = run(linkedRoot, '7');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /dir|directory|symlink/i);
  assert.deepEqual(fs.readdirSync(dir), before);
});
