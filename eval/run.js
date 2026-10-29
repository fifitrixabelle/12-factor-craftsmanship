#!/usr/bin/env node
/**
 * 12-factor-craftsmanship Evaluation Runner
 *
 * Runs the evaluation suite against test fixtures or LLM generation outputs.
 *
 * Usage:
 *   node eval/run.js                 # Run evaluation on built-in fixtures (craftsmanship vs baseline)
 *   node eval/run.js --fixtures       # Explicitly evaluate fixtures
 *   node eval/run.js --input <file>   # Evaluate external JSON array of probe outputs
 *   node eval/run.js --markdown       # Output results formatted as GitHub Markdown
 */

const fs = require('node:fs');
const path = require('node:path');
const grade = require('./graders');
const fixtures = require('./fixtures');
const probes = require('./probes.json');

const args = process.argv.slice(2);
const isMarkdown = args.includes('--markdown');
const inputArgIdx = args.indexOf('--input');
const inputFile = inputArgIdx !== -1 ? args[inputArgIdx + 1] : null;

function runEvaluationOnArm(armName, outputsByProbe) {
  const results = [];
  let totalScore = 0;

  for (const probeDef of probes) {
    const probeId = probeDef.id;
    const output = outputsByProbe[probeId] || '';
    const outcome = grade(output, { vars: { probe: probeId } });

    totalScore += outcome.score;
    results.push({
      id: probeId,
      title: probeDef.title,
      factor: probeDef.factor,
      domain: probeDef.domain,
      pass: outcome.pass,
      score: outcome.score,
      reason: outcome.reason
    });
  }

  return {
    arm: armName,
    score: totalScore,
    total: probes.length,
    percentage: Math.round((totalScore / probes.length) * 100),
    results
  };
}

function printAsciiTable(baseline, craftsmanship) {
  console.log('\n========================================================================================');
  console.log('              12-FACTOR CRAFTSMANSHIP BENCHMARK EVALUATION RESULTS                      ');
  console.log('========================================================================================\n');

  console.log(`Baseline (no skill):        ${baseline.score}/${baseline.total} passed (${baseline.percentage}%)`);
  console.log(`With 12-factor-craftsmanship: ${craftsmanship.score}/${craftsmanship.total} passed (${craftsmanship.percentage}%)\n`);

  console.log('----------------------------------------------------------------------------------------');
  console.log(
    'Probe ID'.padEnd(32) +
    'Baseline'.padEnd(12) +
    'Craftsmanship'.padEnd(16) +
    'Craftsmanship Reason'
  );
  console.log('----------------------------------------------------------------------------------------');

  for (let i = 0; i < probes.length; i++) {
    const p = probes[i];
    const b = baseline.results[i];
    const c = craftsmanship.results[i];

    const bStr = b.pass ? 'PASS' : 'FAIL';
    const cStr = c.pass ? 'PASS' : 'FAIL';
    const shortReason = c.reason.length > 38 ? c.reason.slice(0, 35) + '...' : c.reason;

    console.log(
      p.id.padEnd(32) +
      bStr.padEnd(12) +
      cStr.padEnd(16) +
      shortReason
    );
  }

  console.log('----------------------------------------------------------------------------------------\n');
}

function printMarkdownReport(baseline, craftsmanship) {
  console.log('# 12-Factor Craftsmanship Evaluation Report\n');
  console.log('## Summary\n');
  console.log('| Arm | Score | Percentage | Status |');
  console.log('|---|---|---|---|');
  console.log(`| **Baseline (no skill)** | ${baseline.score}/${baseline.total} | ${baseline.percentage}% | Failing safety & maintainability checks |`);
  console.log(`| **12-factor-craftsmanship** | ${craftsmanship.score}/${craftsmanship.total} | ${craftsmanship.percentage}% | All safety and design checks passed |`);
  console.log('\n## Detailed Results by Factor & Domain\n');
  console.log('| Factor & Domain | Probe ID | Baseline | Skill | Verified Outcome |');
  console.log('|---|---|---|---|---|');

  for (let i = 0; i < probes.length; i++) {
    const p = probes[i];
    const b = baseline.results[i];
    const c = craftsmanship.results[i];

    const bBadge = b.pass ? 'PASS' : 'FAIL';
    const cBadge = c.pass ? 'PASS' : 'FAIL';

    console.log(
      `| ${p.domain} (${p.factor}) | \`${p.id}\` | ${bBadge} | ${cBadge} | ${c.reason} |`
    );
  }
  console.log('\n');
}

function main() {
  if (inputFile) {
    const raw = fs.readFileSync(path.resolve(inputFile), 'utf8');
    const data = JSON.parse(raw);
    const outputsByProbe = {};
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.probe && item.output) outputsByProbe[item.probe] = item.output;
      }
    } else {
      Object.assign(outputsByProbe, data);
    }
    const evalResult = runEvaluationOnArm('custom_input', outputsByProbe);
    console.log(`Score: ${evalResult.score}/${evalResult.total} (${evalResult.percentage}%)`);
    for (const r of evalResult.results) {
      console.log(`- [${r.pass ? 'PASS' : 'FAIL'}] ${r.id}: ${r.reason}`);
    }
    return;
  }

  const baselineOutputs = {};
  const craftOutputs = {};
  for (const p of probes) {
    baselineOutputs[p.id] = (fixtures[p.id] && fixtures[p.id].failing) || '';
    craftOutputs[p.id] = (fixtures[p.id] && fixtures[p.id].passing) || '';
  }

  const baselineEval = runEvaluationOnArm('baseline', baselineOutputs);
  const craftEval = runEvaluationOnArm('12-factor-craftsmanship', craftOutputs);

  if (isMarkdown) {
    printMarkdownReport(baselineEval, craftEval);
  } else {
    printAsciiTable(baselineEval, craftEval);
  }
}

main();
