#!/usr/bin/env node
/** Report heuristic checks on trusted fixtures or supplied model completions. */
const fs = require('node:fs');
const grade = require('./graders');
const fixtures = require('./fixtures');
const probes = require('./probes.json');
const knownProbes = new Set(probes.map(probe => probe.id));
const usage = 'Usage: node eval/run.js [--fixtures | --input <file.json>] [--markdown]';

function readOutputs(filename) {
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (!data || typeof data !== 'object') throw new Error('Input must be a probe/output array or object map.');
  const entries = Array.isArray(data) ? data.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Each input entry needs probe and output.');
    return [item.probe, item.output];
  }) : Object.entries(data);
  const outputs = Object.create(null);
  for (const [id, output] of entries) {
    if (!knownProbes.has(id)) throw new Error(`Unknown input probe: ${id}`);
    if (Object.hasOwn(outputs, id)) throw new Error(`Duplicate input probe: ${id}`);
    if (typeof output !== 'string') throw new Error(`Input output for ${id} must be a string.`);
    outputs[id] = output;
  }
  return outputs;
}

function evaluate(name, outputs) {
  const results = probes.map(probe => {
    const present = Object.hasOwn(outputs, probe.id);
    return { id: probe.id, status: present ? 'supplied' : 'missing',
      ...(present ? grade(outputs[probe.id], { vars: { probe: probe.id } }) : { pass: false, score: 0, reason: 'No completion supplied.' }) };
  });
  return { name, results, supplied: results.filter(r => r.status === 'supplied').length,
    score: results.reduce((sum, r) => sum + r.score, 0) };
}

function printReport(title, arms, markdown) {
  console.log(`${markdown ? '# ' : ''}${title}\n`);
  console.log('Heuristic text checks; passing does not establish runtime safety or model improvement.\n');
  for (const arm of arms) {
    console.log(`${arm.name}: ${arm.score}/${arm.supplied} heuristic passes; ${arm.supplied}/${probes.length} probes supplied.`);
  }
  console.log('');
  const rows = probes.map((probe, i) => [probe.id, ...arms.map(arm => {
    const result = arm.results[i];
    return result.status === 'missing' ? 'MISSING' : result.pass ? 'PASS' : 'FAIL';
  })]);
  const headers = ['Probe', ...arms.map(arm => arm.name)];
  if (markdown) {
    console.log(`| ${headers.join(' | ')} |`);
    console.log(`| ${headers.map(() => '---').join(' | ')} |`);
    for (const row of rows) console.log(`| ${row.join(' | ')} |`);
  } else {
    for (const row of [headers, ...rows]) console.log(row.map((cell, i) => cell.padEnd(i === 0 ? 34 : 24)).join(''));
  }
  for (const arm of arms) {
    for (const result of arm.results.filter(r => r.status === 'supplied' && !r.pass)) {
      console.log(`\n${arm.name} / ${result.id}: ${result.reason}`);
    }
  }
}

function main(args) {
  let inputFile;
  let fixturesRequested = false;
  const markdown = args.includes('--markdown');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--markdown') continue;
    if (args[i] === '--fixtures') { fixturesRequested = true; continue; }
    if (args[i] === '--help') { console.log(usage); return; }
    if (args[i] === '--input' && args[i + 1] && !args[i + 1].startsWith('--') && !inputFile) {
      inputFile = args[++i];
    } else throw new Error(`Invalid argument: ${args[i]}. ${usage}`);
  }
  if (inputFile && fixturesRequested) throw new Error(`Choose --fixtures or --input. ${usage}`);
  if (inputFile) {
    printReport('Supplied completions: heuristic report', [evaluate('Custom input', readOutputs(inputFile))], markdown);
    return;
  }
  const outputs = kind => Object.fromEntries(probes.map(p => [p.id, fixtures[p.id][kind]]));
  printReport('Fixture self-check (hand-authored examples)', [
    evaluate('Negative fixtures', outputs('failing')),
    evaluate('Positive fixtures', outputs('passing'))
  ], markdown);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
