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

const PROBES = require('../eval/probes.json').map(probe => probe.id);

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

test('grader: rejects missing or unknown probes', () => {
  const noProbe = grade('some text', {});
  assert.equal(noProbe.pass, false);

  const unknownProbe = grade('some text', { vars: { probe: 'non_existent_probe' } });
  assert.equal(unknownProbe.pass, false);
});

const misleadingAnswers = {
  retry_idempotency: 'Reuse same idempotency key. maxAttempts = 3; sleep(delay); retry every error.',
  state_variants: 'Use a discriminated union.',
  disposability_shutdown: "process.on('SIGTERM', () => { isShuttingDown = true; }); await Promise.all(activeJobs);",
  config_telemetry_safety: 'const token = process.env.API_TOKEN; console.log(req.headers); // authorization cookie',
  rolling_migration: 'Old and new versions coexist. Use expand-and-contract. Drop the old column immediately.',
  serverless_adaptation_review: 'Lambda',
  convention_over_configuration: 'Use convention over configuration.'
};

for (const [probe, output] of Object.entries(misleadingAnswers)) {
  test(`grader: [${probe}] rejects incomplete or misleading answers`, () => {
    assert.equal(grade(output, { vars: { probe } }).pass, false);
  });
}

test('grader: rejects deletion inside a positive dryRun guard', () => {
  const output = 'if (dryRun) { rmSync(path); } // would delete; error if days invalid';
  assert.equal(grade(output, { vars: { probe: 'dwim_dry_run' } }).pass, false);
});

test('grader: accepts a pure calculation followed by a separate I/O shell', () => {
  const output = `function calculateTotal(items) { return items.reduce((sum, x) => sum + x.price, 0); }
  async function loadOrder(id) { const order = await db.query(id); return calculateTotal(order.items); }
  // Pure function; assert.equal(calculateTotal([]), 0); test without mocks.`;
  assert.equal(grade(output, { vars: { probe: 'pure_core_imperative_shell' } }).pass, true);
});

test('grader: reports criterion checks and identifies its heuristic method', () => {
  const result = grade(fixtures.retry_idempotency.passing, { vars: { probe: 'retry_idempotency' } });
  assert.equal(result.method, 'heuristic');
  assert.ok(result.checks.length >= 4);
  assert.ok(result.checks.every(check => typeof check.pass === 'boolean' && check.criterion));
});

test('grader: accepts a redacted structured header log', () => {
  const output = 'const key = process.env.API_KEY; console.log(JSON.stringify({headers: redact(req.headers)}));';
  assert.equal(grade(output, { vars: { probe: 'config_telemetry_safety' } }).pass, true);
});

test('grader: rejects raw header objects through every accepted console sink', () => {
  for (const method of ['log', 'info', 'error']) {
    const output = `const key = process.env.API_KEY; console.${method}(JSON.stringify({headers: req.headers})); // req.method`;
    assert.equal(grade(output, { vars: { probe: 'config_telemetry_safety' } }).pass, false, method);
  }
});

test('grader: accepts reordered fields in state variants', () => {
  const output = fixtures.state_variants.passing
    .replace("status: 'processing'; id: string; progress: number", "progress: number; id: string; status: 'processing'")
    .replace("status: 'completed'; id: string; downloadUrl: string", "downloadUrl: string; id: string; status: 'completed'");
  assert.equal(grade(output, { vars: { probe: 'state_variants' } }).pass, true);
});

test('grader: catches raw headers after a logger message argument', () => {
  const output = "const key = process.env.API_KEY; console.log('request headers', JSON.stringify(req.headers)); // req.method";
  assert.equal(grade(output, { vars: { probe: 'config_telemetry_safety' } }).pass, false);
});
