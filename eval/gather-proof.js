#!/usr/bin/env node
/**
 * Live Proof Gatherer:
 * Executes the 10 eval probes against gpt-6.1-sol via `codex exec`
 * both WITHOUT the skill (baseline arm) and WITH 12-factor-craftsmanship (skill arm).
 *
 * Saves full outputs and grades to eval/results/live-proof-gpt-6.1-sol.json
 * and prints an empirical comparison scorecard.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const grade = require('./graders');
const probes = require('./probes.json');

const skillPath = path.join(__dirname, '..', 'skills', '12-factor-craftsmanship', 'SKILL.md');
const skillContent = fs.readFileSync(skillPath, 'utf8');

const resultsDir = path.join(__dirname, 'results');
fs.mkdirSync(resultsDir, { recursive: true });

const tmpDir = path.join(__dirname, '.tmp');
fs.mkdirSync(tmpDir, { recursive: true });

console.log('================================================================');
console.log('   GATHERING EMPIRICAL PROOF: 10 PROBES ON gpt-6.1-sol           ');
console.log('================================================================\n');

const empiricalRecord = {
  timestamp: new Date().toISOString(),
  model: 'gpt-6.1-sol',
  probes: []
};

let baselinePassCount = 0;
let skillPassCount = 0;

for (let i = 0; i < probes.length; i++) {
  const p = probes[i];
  console.log(`[${i + 1}/${probes.length}] Running probe: ${p.id} (${p.title})...`);

  // 1. Run Baseline (no skill)
  const baselineOutFile = path.join(tmpDir, `${p.id}_baseline.txt`);
  try {
    execSync(
      `codex exec -c 'model_reasoning_effort="low"' -s read-only -o ${baselineOutFile} ${JSON.stringify(p.prompt)}`,
      { stdio: 'ignore', timeout: 120000 }
    );
  } catch (err) {
    fs.writeFileSync(baselineOutFile, `ERROR: ${err.message}`);
  }
  const baselineOutput = fs.existsSync(baselineOutFile)
    ? fs.readFileSync(baselineOutFile, 'utf8')
    : '';
  const baselineGrade = grade(baselineOutput, { vars: { probe: p.id } });

  // 2. Run With Skill
  const skillOutFile = path.join(tmpDir, `${p.id}_skill.txt`);
  const promptWithSkill = `You are a software engineer applying the following skill:\n\n${skillContent}\n\nTask:\n${p.prompt}`;
  try {
    execSync(
      `codex exec -c 'model_reasoning_effort="low"' -s read-only -o ${skillOutFile} ${JSON.stringify(promptWithSkill)}`,
      { stdio: 'ignore', timeout: 120000 }
    );
  } catch (err) {
    fs.writeFileSync(skillOutFile, `ERROR: ${err.message}`);
  }
  const skillOutput = fs.existsSync(skillOutFile)
    ? fs.readFileSync(skillOutFile, 'utf8')
    : '';
  const skillGrade = grade(skillOutput, { vars: { probe: p.id } });

  if (baselineGrade.pass) baselinePassCount++;
  if (skillGrade.pass) skillPassCount++;

  console.log(`  -> Baseline:      ${baselineGrade.pass ? 'PASS' : 'FAIL'} (${baselineGrade.reason})`);
  console.log(`  -> Craftsmanship: ${skillGrade.pass ? 'PASS' : 'FAIL'} (${skillGrade.reason})\n`);

  empiricalRecord.probes.push({
    id: p.id,
    title: p.title,
    factor: p.factor,
    domain: p.domain,
    prompt: p.prompt,
    baseline: {
      pass: baselineGrade.pass,
      score: baselineGrade.score,
      reason: baselineGrade.reason,
      output: baselineOutput
    },
    skill: {
      pass: skillGrade.pass,
      score: skillGrade.score,
      reason: skillGrade.reason,
      output: skillOutput
    }
  });
}

empiricalRecord.summary = {
  total: probes.length,
  baselineScore: baselinePassCount,
  baselinePercent: Math.round((baselinePassCount / probes.length) * 100),
  skillScore: skillPassCount,
  skillPercent: Math.round((skillPassCount / probes.length) * 100),
  netDelta: Math.round(((skillPassCount - baselinePassCount) / probes.length) * 100)
};

const resultFilePath = path.join(resultsDir, 'live-proof-gpt-6.1-sol.json');
fs.writeFileSync(resultFilePath, JSON.stringify(empiricalRecord, null, 2));

console.log('================================================================');
console.log('                   EMPIRICAL PROOF SUMMARY                       ');
console.log('================================================================');
console.log(`Model:             gpt-6.1-sol`);
console.log(`Baseline (no skill):        ${baselinePassCount}/${probes.length} (${empiricalRecord.summary.baselinePercent}%)`);
console.log(`With 12-factor-craftsmanship: ${skillPassCount}/${probes.length} (${empiricalRecord.summary.skillPercent}%)`);
console.log(`Net Measured Improvement:    +${empiricalRecord.summary.netDelta}%\n`);
console.log(`Detailed results saved to: ${resultFilePath}`);
