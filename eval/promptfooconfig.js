// Select a provider explicitly; every test uses the canonical probe and rubric IDs.
const probes = require('./probes.json');

if (!process.env.EVAL_PROVIDER) {
  throw new Error('Set EVAL_PROVIDER to a Promptfoo provider/model ID before running the live benchmark.');
}

module.exports = {
  description: '12-Factor Craftsmanship: paired heuristic evaluation (not proof of runtime safety)',
  prompts: [
    { id: 'file://arms/baseline.js', label: 'baseline (no injected skill)' },
    { id: 'file://arms/craftsmanship.js', label: '12-factor-craftsmanship' }
  ],
  providers: [{ id: process.env.EVAL_PROVIDER, config: { temperature: 0.2, max_tokens: 4096 } }],
  defaultTest: { assert: [{ type: 'javascript', value: 'file://graders.js', metric: 'craftsmanship_heuristic_pass' }] },
  tests: probes.map(probe => ({ description: probe.title, vars: { probe: probe.id, prompt: probe.prompt } }))
};
