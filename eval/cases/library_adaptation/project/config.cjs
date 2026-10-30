const { readFileSync } = require('node:fs');
exports.loadToken = tokenFile => {
  if (typeof tokenFile !== 'string' || !tokenFile) throw new TypeError('A token file path is required');
  const token = readFileSync(tokenFile, 'utf8').trim();
  if (!token) throw new Error('Token file is empty');
  return token;
};
