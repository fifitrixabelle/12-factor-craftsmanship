const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
try {
  const { values } = parseArgs({ options: { dir: { type: 'string' }, days: { type: 'string' }, 'dry-run': { type: 'boolean' } } });
  const days = Number(values.days);
  if (!Number.isInteger(days) || days <= 0) throw new Error('--days must be a positive integer');
  if (!values.dir) throw new Error('--dir must name a real directory');
  const stat = fs.lstatSync(values.dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('--dir must name a real directory, not a symlink');
  const cutoff = Date.now() - days * 86400000;
  for (const name of fs.readdirSync(values.dir)) {
    const target = path.join(values.dir, name);
    const entry = fs.lstatSync(target);
    if (!entry.isDirectory() || entry.isSymbolicLink() || entry.mtimeMs >= cutoff) continue;
    if (values['dry-run']) console.log(`Would remove ${target}`);
    else { fs.rmSync(target, { recursive: true }); console.log(`Removed ${target}`); }
  }
} catch (error) { console.error(`Cache cleanup: ${error.message}`); process.exitCode = 1; }
