const { loadToken } = require('./config.cjs');
exports.createClient = (tokenFile, Client) => new Client({ token: loadToken(tokenFile) });
