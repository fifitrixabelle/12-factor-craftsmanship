const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const probes = require('../eval/probes.json');
const fixtures = require('../eval/fixtures');
const { GRADERS } = require('../eval/graders');

test('every unique probe has a rubric, both fixtures, and exactly one grader', () => {
  const ids = probes.map(probe => probe.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(Object.keys(fixtures).sort(), [...ids].sort());
  assert.deepEqual(Object.keys(GRADERS).sort(), [...ids].sort());
  for (const probe of probes) {
    assert.ok(probe.prompt && probe.title && probe.factor && probe.domain);
    assert.ok(probe.rubric.pass_criteria.length && probe.rubric.fail_criteria.length);
    assert.equal(typeof fixtures[probe.id].passing, 'string');
    assert.equal(typeof fixtures[probe.id].failing, 'string');
  }
});

test('plugin, marketplace, package, and skill metadata agree', () => {
  const pkg = require('../package.json');
  const plugin = require('../.claude-plugin/plugin.json');
  const market = require('../.claude-plugin/marketplace.json');
  const skill = fs.readFileSync(path.join(__dirname, '../skills/12-factor-craftsmanship/SKILL.md'), 'utf8');
  assert.equal(pkg.version, plugin.version);
  assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.name, plugin.name);
  assert.equal(pkg.license, plugin.license);
  assert.equal(pkg.description, plugin.description);
  assert.equal(market.plugins.length, 1);
  assert.equal(market.plugins[0].name, plugin.name);
  assert.equal(market.plugins[0].description, plugin.description);
  assert.equal(market.plugins[0].source, './');
  assert.match(skill, new RegExp(`^---\\nname: ${plugin.name}\\ndescription: .+\\n---`));
  assert.ok(fs.existsSync(path.join(__dirname, '../LICENSE')));
  assert.equal(pkg.engines.node, '>=24');
});

test('Promptfoo uses canonical probe prompts without duplicated definitions', () => {
  const previous = process.env.EVAL_PROVIDER;
  process.env.EVAL_PROVIDER = 'test-provider';
  try {
    const config = require('../eval/promptfooconfig');
    assert.equal(config.providers[0].id, 'test-provider');
    assert.deepEqual(config.tests.map(t => t.vars), probes.map(p => ({ probe: p.id, prompt: p.prompt })));
  } finally {
    if (previous === undefined) delete process.env.EVAL_PROVIDER;
    else process.env.EVAL_PROVIDER = previous;
  }
});
