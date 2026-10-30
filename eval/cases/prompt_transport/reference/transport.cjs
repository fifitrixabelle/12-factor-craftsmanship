const { execFileSync } = require('node:child_process');
exports.runPrompt = (executable, args, prompt) => execFileSync(executable, [...args, prompt], { encoding: 'utf8' });
