const { execSync } = require('node:child_process');
exports.runPrompt = (executable, args, prompt) => execSync(
  [executable, ...args.map(arg => JSON.stringify(arg)), JSON.stringify(prompt)].join(' '),
  { encoding: 'utf8' }
);
