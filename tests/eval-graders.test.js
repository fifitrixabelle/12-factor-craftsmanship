#!/usr/bin/env node
/**
 * Unit test for 12-factor-craftsmanship evaluation graders.
 *
 * Runs with Node.js built-in test runner (zero external dependencies):
 *   node --test tests/eval-graders.test.js
 *
 * Verifies that each grader accurately distinguishes craftsmanship-compliant
 * practices from common baseline failure patterns.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const grade = require('../eval/graders');
const fixtures = require('../eval/fixtures');

const PROBES = [
  'retry_idempotency',
  'state_variants',
  'wrong_abstraction',
  'disposability_shutdown',
  'config_telemetry_safety',
  'dwim_dry_run',
  'pure_core_imperative_shell',
  'rolling_migration',
  'serverless_adaptation_review',
  'convention_over_configuration'
];

for (const probe of PROBES) {
  test(`grader: [${probe}] passes craftsmanship fixture`, () => {
    const fixture = fixtures[probe];
    assert.ok(fixture, `Missing fixture for probe ${probe}`);
    const result = grade(fixture.passing, { vars: { probe } });
    assert.equal(
      result.pass,
      true,
      `Expected ${probe} passing fixture to pass, but failed: ${result.reason}`
    );
    assert.equal(result.score, 1);
  });

  test(`grader: [${probe}] catches and fails baseline failure fixture`, () => {
    const fixture = fixtures[probe];
    assert.ok(fixture, `Missing fixture for probe ${probe}`);
    const result = grade(fixture.failing, { vars: { probe } });
    assert.equal(
      result.pass,
      false,
      `Expected ${probe} failing fixture to fail, but passed: ${result.reason}`
    );
    assert.equal(result.score, 0);
    assert.ok(result.reason.length > 0, 'Expected non-empty failure reason');
  });
}

test('grader: handles empty or null output gracefully', () => {
  const result = grade('', { vars: { probe: 'retry_idempotency' } });
  assert.equal(result.pass, false);
  assert.equal(result.score, 0);
});

test('grader: gracefully skips when probe is missing or unknown', () => {
  const noProbe = grade('some text', {});
  assert.equal(noProbe.pass, true);

  const unknownProbe = grade('some text', { vars: { probe: 'non_existent_probe' } });
  assert.equal(unknownProbe.pass, true);
});
