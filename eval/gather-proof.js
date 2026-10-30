#!/usr/bin/env node
/** Collect paired model responses. Importing this module never starts a run. */
const { spawnSync, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const grade = require('./graders');
const probes = require('./probes.json');

function collectResponse({ prompt, model, workDir, outputFile, executable = 'codex', timeoutMs = 120000, sandbox = 'read-only' }) {
  // Never let an old answer turn a failed invocation into a successful completion.
  fs.rmSync(outputFile, { force: true });
  const started = performance.now();
  const result = spawnSync(executable, [
    'exec', '--model', model, '-c', 'model_reasoning_effort="low"',
    '--ignore-user-config', '--ephemeral', '--skip-git-repo-check',
    '--sandbox', sandbox, '--cd', workDir, '--json',
    '--output-last-message', outputFile, '-'
  ], {
    input: prompt, encoding: 'utf8', cwd: workDir, timeout: timeoutMs, killSignal: 'SIGKILL',
    maxBuffer: 16 * 1024 * 1024
  });
  const durationMs = Math.round(performance.now() - started);
  if (result.error || result.status !== 0 || !fs.existsSync(outputFile)) {
    return {
      status: 'execution_error', output: null, durationMs, usage: null,
      error: result.error?.message || `Exit ${result.status}, signal ${result.signal || 'none'}; missing or failed completion`,
      stderr: result.stderr || '', signal: result.signal
    };
  }
  const output = fs.readFileSync(outputFile, 'utf8');
  if (!output.trim()) {
    return { status: 'execution_error', output: null, durationMs, usage: null, error: 'Empty completion' };
  }
  // Usage may be absent on older CLIs. Null means unavailable, never zero tokens.
  let usage = null;
  for (const line of (result.stdout || '').split('\n')) {
    try {
      const event = JSON.parse(line);
      if (event.type === 'turn.completed' && event.usage) usage = event.usage;
    } catch { /* CLI diagnostics are not always JSON. */ }
  }
  return { status: 'completed', output, durationMs, usage };
}

function summarize(records) {
  const paired = records.filter(p => p.baseline.status === 'completed' && p.skill.status === 'completed');
  const baselineScore = paired.filter(p => p.baseline.grade.pass).length;
  const skillScore = paired.filter(p => p.skill.grade.pass).length;
  return {
    total: records.length,
    pairedCompleted: paired.length,
    executionErrors: records.reduce((sum, p) => sum + ['baseline', 'skill'].filter(arm => p[arm].status !== 'completed').length, 0),
    baselineScore, skillScore,
    deltaPercentagePoints: paired.length ? 100 * (skillScore - baselineScore) / paired.length : null
  };
}

function gatherProof({ model, resultFile, executable = 'codex', timeoutMs = 120000 }) {
  if (!model) throw new Error('Specify --model <model-id>; the runner never assumes your configured model.');
  const root = path.join(__dirname, '..');
  const skillContent = fs.readFileSync(path.join(root, 'skills/12-factor-craftsmanship/SKILL.md'), 'utf8');
  const hash = content => crypto.createHash('sha256').update(content).digest('hex');
  const timestamp = new Date().toISOString();
  resultFile ||= path.join(__dirname, 'results', `${timestamp.replace(/[:.]/g, '-')}-${model.replace(/[^a-z0-9_-]/gi, '_')}-${crypto.randomUUID().slice(0, 8)}.json`);
  fs.mkdirSync(path.dirname(path.resolve(resultFile)), { recursive: true });
  const version = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 5000, killSignal: 'SIGKILL' });
  if (version.error || version.status !== 0) throw new Error(`Cannot run ${executable}: ${version.error?.message || version.stderr}`);
  const record = {
    schemaVersion: 2, timestamp, requestedModel: model,
    cliVersion: version.stdout.trim(), nodeVersion: process.version,
    sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
    skillSha256: hash(skillContent),
    probesSha256: hash(fs.readFileSync(path.join(__dirname, 'probes.json'))),
    gradersSha256: hash(fs.readFileSync(path.join(__dirname, 'graders.js'))),
    runnerSha256: hash(fs.readFileSync(__filename)),
    settings: { reasoningEffort: 'low', timeoutMs, sandbox: 'read-only', ignoreUserConfig: true, ephemeral: true },
    limitations: [
      'Single sample per probe; heuristic grades require manual or executable validation.',
      'Temporary working directories and ignored user config reduce ambient instructions; global skills and provider defaults may still affect both arms.',
      'requestedModel records the selected CLI argument, not independently verified server routing.',
      'Usage covers the reported completed turn, not a guaranteed billing total.'
    ],
    probes: []
  };
  // Reserve a unique destination before starting any paid requests; never overwrite historical runs.
  fs.writeFileSync(resultFile, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-eval-'));
  try {
    for (const probe of probes) {
      const entry = { id: probe.id, prompt: probe.prompt, promptSha256: hash(probe.prompt) };
      for (const arm of ['baseline', 'skill']) {
        // Each arm and probe starts in an empty directory outside the repository.
        const workDir = fs.mkdtempSync(path.join(tmpRoot, `${probe.id}-${arm}-`));
        const prompt = arm === 'baseline' ? probe.prompt
          : `You are a software engineer applying the following skill:\n\n${skillContent}\n\nTask:\n${probe.prompt}`;
        entry[arm] = collectResponse({ prompt, model, executable, timeoutMs, workDir,
          outputFile: path.join(tmpRoot, `${probe.id}-${arm}.txt`) });
        entry[arm].sentPromptSha256 = hash(prompt);
        entry[arm].grade = entry[arm].status === 'completed' ? grade(entry[arm].output, { vars: { probe: probe.id } }) : null;
        console.log(`${probe.id} ${arm}: ${entry[arm].status === 'completed' ? (entry[arm].grade.pass ? 'HEURISTIC PASS' : 'HEURISTIC FAIL') : 'EXECUTION ERROR'}`);
      }
      record.probes.push(entry);
      record.summary = summarize(record.probes);
      fs.writeFileSync(resultFile, JSON.stringify(record, null, 2) + '\n');
    }
    record.completedAt = new Date().toISOString();
    fs.writeFileSync(resultFile, JSON.stringify(record, null, 2) + '\n');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
  console.log(JSON.stringify(record.summary, null, 2));
  console.log(`Saved: ${resultFile}`);
  return record;
}

function main(args) {
  if (args.includes('--help')) {
    console.log('Usage: node eval/gather-proof.js --model <model-id> [--output <new-file.json>]');
    return;
  }
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--model', '--output'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error(`Invalid argument: ${args[i]}. Use --help.`);
    }
    options[args[i] === '--model' ? 'model' : 'resultFile'] = args[i + 1];
  }
  const record = gatherProof(options);
  if (record.summary.executionErrors) process.exitCode = 1;
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { collectResponse, summarize, gatherProof };
