# 12 Factor Craftsmanship

An agent skill that helps AI coding agents build and review software using two sources:

- [The Twelve-Factor App](https://12factor.net/): how the software runs.
- [The Manifesto for Software Craftsmanship](https://manifesto.softwarecraftsmanship.org/): how the software is made.

The skill is one file, [`skills/12-factor-craftsmanship/SKILL.md`](skills/12-factor-craftsmanship/SKILL.md). It uses the open [Agent Skills](https://agentskills.io) format, so any agent that reads `SKILL.md` files can load it.

## Install

### Any agent, with the `skills` CLI

```bash
npx skills add fifitrixabelle/12-factor-craftsmanship
```

### Claude Code, by hand

```bash
git clone https://github.com/fifitrixabelle/12-factor-craftsmanship.git
# For all projects:
cp -r 12-factor-craftsmanship/skills/12-factor-craftsmanship ~/.claude/skills/
# Or for one project only:
cp -r 12-factor-craftsmanship/skills/12-factor-craftsmanship .claude/skills/
```

### Other agents

Copy `skills/12-factor-craftsmanship/` into your agent's skills directory. If your agent has no skills support, paste the body of `SKILL.md` into its instructions file (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, and so on).

## Use

The agent loads the skill when a task fits: designing a service, adding config, logging, or background jobs, setting up deployment, or reviewing code for production readiness. You can also ask for it by name:

> Review this service with the 12-factor-craftsmanship skill.

## License

MIT. The Twelve-Factor App and the Software Craftsmanship manifesto belong to their authors. This skill summarizes them in its own words and links to the originals.
