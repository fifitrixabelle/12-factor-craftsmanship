// Baseline arm: no skill, bare model prompt
module.exports = ({ vars }) => [{ role: 'user', content: vars.prompt }];
