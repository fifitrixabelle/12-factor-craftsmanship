// Craftsmanship arm: the repo's own SKILL.md as the system prompt.
const fs = require('node:fs');
const path = require('node:path');

const skillPath = path.join(__dirname, '..', '..', 'skills', '12-factor-craftsmanship', 'SKILL.md');
const systemPrompt = fs.readFileSync(skillPath, 'utf8');

module.exports = ({ vars }) => [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: vars.prompt }
];
