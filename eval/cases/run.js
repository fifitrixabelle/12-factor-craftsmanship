#!/usr/bin/env node
/** Versioned maintenance tasks; legacy text probes remain in ../gather-proof.js. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync, execFileSync } = require('node:child_process');
const cases = require('./cases.json');
const { collectResponse } = require('../gather-proof');
const { gradeReview, gradeRepair, runNode } = require('./grade');
const hash = content => crypto.createHash('sha256').update(content).digest('hex');
const suiteVersion = 'maintenance-v1';

function snapshot(root, prefix = '', files = {}) {
  for (const entry of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Source artifact is a symbolic link: ${relative}`);
    if (entry.isDirectory()) snapshot(root, relative, files);
    else {
      const full = path.join(root, relative);
      if (fs.statSync(full).size > 128 * 1024 || Object.keys(files).length >= 100) throw new Error('Candidate exceeds source artifact size limits.');
      files[relative] = fs.readFileSync(full, 'utf8');
    }
  }
  return files;
}

function prepareCase(c, root, reference = false) {
  fs.cpSync(path.join(__dirname, c.id, 'project'), root, { recursive: true });
  if (reference && c.kind === 'repair') fs.cpSync(path.join(__dirname, c.id, 'reference'), root, { recursive: true });
}

function checkScope(c, before, after) {
  return Object.keys(before).filter(file => !(c.editable || []).includes(file) && after[file] !== before[file]);
}

function promptFor(c) {
  return [c.task, '\nRead the existing project files in the working directory before deciding what to change.',
    '\nConstraints:', ...c.constraints.map(x => `- ${x}`),
    '\nAcceptance criteria:', ...c.rubric.map(x => `- ${x}`),
    c.kind === 'repair' ? '\nImplement the repair in the existing files. Preserve the public contracts and unrelated behavior. Describe what changed and what you verified in your final response.' : ''
  ].join('\n');
}

function summarizeCases(records) {
  const summary = { repairs: { pairedCompleted: 0, baselinePass: 0, skillPass: 0 },
    reviewDecisions: { pairedCompleted: 0, baselinePass: 0, skillPass: 0 }, executionErrors: 0, gradingErrors: 0 };
  for (const record of records) {
    for (const arm of ['baseline', 'skill']) {
      if (record[arm]?.status === 'execution_error') summary.executionErrors++;
      if (record[arm]?.grade?.status === 'grading_error') summary.gradingErrors++;
    }
    if (!['baseline', 'skill'].every(arm => record[arm]?.status === 'completed' && record[arm].grade && record[arm].grade.status !== 'grading_error')) continue;
    const group = record.kind === 'repair' ? summary.repairs : summary.reviewDecisions;
    group.pairedCompleted++;
    for (const arm of ['baseline', 'skill']) if (record[arm].grade.pass) group[`${arm}Pass`]++;
  }
  return summary;
}

function fixtureChecks(selected) {
  let failed = false;
  for (const c of selected) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-fixture-'));
    try {
      if (c.kind === 'repair') {
        prepareCase(c, root);
        const broken = gradeRepair(c, root, { isolated: false });
        prepareCase(c, root, true);
        const reference = gradeRepair(c, root, { isolated: false });
        const correct = broken.status === 'completed' && !broken.pass && reference.pass;
        console.log(`${c.id}: broken=${broken.pass} reference=${reference.pass} (${correct ? 'OK' : 'FAIL'})`);
        if (!correct) { console.error(JSON.stringify({ broken, reference })); failed = true; }
      } else {
        const right = gradeReview(c, JSON.stringify({ decision: c.expectedDecision, rationale: c.rubric.join(' '), findings: [] }));
        const wrong = gradeReview(c, JSON.stringify({ decision: 'wrong-decision', rationale: 'Contradicts the supplied contract.', findings: [] }));
        console.log(`${c.id}: decision control (${right.pass && !wrong.pass ? 'OK; rationale still needs review' : 'FAIL'})`);
        if (!right.pass || wrong.pass) failed = true;
      }
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
  return !failed;
}

function runBenchmark({ model, outputFile, selected = cases, executable = 'codex', timeoutMs = 120000 }) {
  if (!model) throw new Error('Specify --model <model-id>.');
  const root = path.join(__dirname, '../..');
  const skill = fs.readFileSync(path.join(root, 'skills/12-factor-craftsmanship/SKILL.md'), 'utf8');
  const version = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 5000, killSignal: 'SIGKILL' });
  if (version.error || version.status !== 0) throw new Error(`Cannot run ${executable}: ${version.error?.message || version.stderr}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-maintenance-'));
  try {
    // Fail before paid sessions if generated repairs cannot be graded in the native sandbox.
    if (selected.some(c => c.kind === 'repair')) {
      const preflight = runNode(tmp, ['-e', 'console.log("sandbox-ready")'], { executable, timeoutMs: 5000 });
      if (preflight.error || preflight.status !== 0 || !preflight.stdout.includes('sandbox-ready')) {
        throw new Error(`Native grading sandbox unavailable: ${preflight.error?.message || preflight.stderr}`);
      }
    }
    const sourceFiles = Object.fromEntries(Object.entries(snapshot(__dirname)).map(([name, contents]) => [name, hash(contents)]));
    const record = {
      schemaVersion: 3, suiteVersion, startedAt: new Date().toISOString(), requestedModel: model,
      nodeVersion: process.version, cliVersion: version.stdout.trim(),
      sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
      suiteSourceHashes: sourceFiles, suiteSha256: hash(JSON.stringify(sourceFiles)), skillSha256: hash(skill),
      collectorSha256: hash(fs.readFileSync(path.join(__dirname, '../gather-proof.js'))),
      settings: { timeoutMs, reasoningEffort: 'low', nativeGradingSandbox: true, gradingNetworkAccess: false },
      limitations: ['Small contextual corpus, not a representative sample of all production work.',
        'One generation per arm per case; arm order alternates across cases.',
        'Review decisions are checked automatically; rationale quality still requires semantic review.',
        'Global skills and provider defaults may affect both arms; isolate the account/environment for effect estimates.',
        'Reported token usage is not a guaranteed billing total.'], cases: []
    };
    outputFile ||= path.join(__dirname, '../results', `${record.startedAt.replace(/[:.]/g, '-')}-${suiteVersion}-${crypto.randomUUID().slice(0, 8)}.json`);
    fs.mkdirSync(path.dirname(path.resolve(outputFile)), { recursive: true });
    fs.writeFileSync(outputFile, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
    const checkpoint = () => {
      record.summary = summarizeCases(record.cases);
      fs.writeFileSync(outputFile, JSON.stringify(record, null, 2) + '\n');
    };
    for (const [index, c] of selected.entries()) {
      const entry = { id: c.id, kind: c.kind, provenance: c.provenance, rubric: c.rubric };
      record.cases.push(entry);
      for (const arm of index % 2 === 0 ? ['baseline', 'skill'] : ['skill', 'baseline']) {
        const workDir = fs.mkdtempSync(path.join(tmp, `${c.id}-${arm}-`));
        prepareCase(c, workDir);
        const before = snapshot(workDir);
        const task = promptFor(c);
        const prompt = arm === 'skill' ? `Apply this skill:\n\n${skill}\n\nTask:\n${task}` : task;
        const response = collectResponse({ model, prompt, workDir, executable, timeoutMs,
          sandbox: c.kind === 'repair' ? 'workspace-write' : 'read-only', outputFile: path.join(tmp, `${c.id}-${arm}.txt`) });
        entry[arm] = { ...response, prompt, initialFiles: before, grade: null };
        if (response.status === 'completed') {
          try {
            const after = snapshot(workDir);
            entry[arm].candidateFiles = after;
            const changedProtected = checkScope(c, before, after);
            entry[arm].grade = changedProtected.length ? { status: 'invalid_submission', method: 'scope-check', pass: false, changedProtected }
              : c.kind === 'repair' ? gradeRepair(c, workDir, { executable }) : gradeReview(c, response.output);
          } catch (error) {
            entry[arm].grade = { status: 'invalid_submission', method: 'artifact-check', pass: false, reason: error.message };
          }
        }
        console.log(`${c.id} ${arm}: ${response.status}; ${entry[arm].grade?.method || 'not graded'}=${entry[arm].grade?.pass ?? 'unavailable'}`);
        checkpoint();
      }
    }
    record.completedAt = new Date().toISOString(); checkpoint();
    console.log(JSON.stringify(record.summary, null, 2)); console.log(`Saved: ${outputFile}`);
    return record;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

function main(args) {
  const options = {}; let fixtures = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') { console.log('Usage: mise run benchmark --model <id> [--case <id>] [--output <new.json>]\n       mise run benchmark:fixtures'); return; }
    if (arg === '--fixtures') { fixtures = true; continue; }
    if (!['--model', '--case', '--output'].includes(arg) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Invalid argument: ${arg}; use --help.`);
    options[arg.slice(2)] = args[++i];
  }
  const selected = options.case ? cases.filter(c => c.id === options.case) : cases;
  if (!selected.length) throw new Error(`Unknown case: ${options.case}`);
  if (fixtures) {
    if (options.model || options.output) throw new Error('--fixtures cannot be combined with --model or --output.');
    if (!fixtureChecks(selected)) process.exitCode = 1;
  } else {
    const record = runBenchmark({ model: options.model, outputFile: options.output, selected });
    if (record.summary.executionErrors || record.summary.gradingErrors) process.exitCode = 1;
  }
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { prepareCase, snapshot, checkScope, summarizeCases, runBenchmark, fixtureChecks, promptFor };
