const { runPrompt } = require('./transport.cjs');
exports.echoPrompt = prompt => runPrompt(process.execPath, ['-e', 'process.stdout.write(process.argv[1])'], prompt);
