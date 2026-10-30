const path = require('node:path');
const { spawnSync } = require('node:child_process');

function gradeReview(c, output) {
  let response;
  try { response = JSON.parse(output.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/, '$1')); }
  catch { return { status: 'invalid_submission', method: 'decision-check', pass: false, reason: 'Expected a JSON review response.' }; }
  if (!response || typeof response.rationale !== 'string' || !response.rationale.trim() || !Array.isArray(response.findings)) {
    return { status: 'invalid_submission', method: 'decision-check', pass: false, reason: 'Review needs decision, rationale, and findings.' };
  }
  return {
    status: 'completed', method: 'decision-check',
    pass: response.decision === c.expectedDecision && (c.id !== 'library_adaptation' || response.findings.length === 0),
    expectedDecision: c.expectedDecision, decision: response.decision ?? null,
    rationale: response.rationale, findings: response.findings,
    rationaleReviewRequired: true
  };
}

function runNode(workDir, args, { executable = 'codex', isolated = true, timeoutMs = 10000 } = {}) {
  const command = isolated ? executable : process.execPath;
  const commandArgs = isolated ? [
    'sandbox', '-c', 'sandbox_mode="workspace-write"',
    '-c', 'sandbox_workspace_write.network_access=false', '--', process.execPath, ...args
  ] : args;
  // Do not pass credentials, NODE_OPTIONS, or parent node:test context to candidate tests.
  return spawnSync(command, commandArgs, {
    cwd: workDir, env: { PATH: process.env.PATH, HOME: workDir, TMPDIR: workDir, CASE_DIR: workDir },
    encoding: 'utf8', timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 2 * 1024 * 1024
  });
}

function gradeRepair(c, workDir, options) {
  const testPath = path.join(__dirname, c.id, 'acceptance.test.cjs');
  const result = runNode(workDir, ['--test', '--test-reporter=tap', '--test-timeout=5000', testPath], options);
  if (result.error?.code === 'ETIMEDOUT') {
    return { status: 'completed', method: 'acceptance-tests', pass: false, reason: 'Acceptance test deadline exceeded.' };
  }
  if (result.error || !result.stdout.startsWith('TAP version 13')) {
    return { status: 'grading_error', method: 'acceptance-tests', pass: null,
      reason: result.error?.message || 'Native sandbox or test runner did not produce a TAP report.', stderr: result.stderr };
  }
  const actualTests = Number(result.stdout.match(/^# tests (\d+)$/m)?.[1] ?? 0);
  return {
    status: 'completed', method: 'acceptance-tests',
    pass: result.status === 0 && actualTests === c.testCount,
    expectedTests: c.testCount, actualTests, exitCode: result.status,
    stdout: result.stdout, stderr: result.stderr
  };
}

module.exports = { gradeReview, gradeRepair, runNode };
