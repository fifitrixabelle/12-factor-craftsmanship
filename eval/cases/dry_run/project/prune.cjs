const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { values } = parseArgs({ options: { dir: { type: 'string' }, days: { type: 'string' }, 'dry-run': { type: 'boolean' } } });
for (const name of fs.readdirSync(values.dir)) {
  const target = path.join(values.dir, name);
  fs.rmSync(target, { recursive: true, force: true });
  if (values['dry-run']) console.log(`Would remove ${target}`);
}
