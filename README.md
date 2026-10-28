# 12 Factor Craftsmanship

An agent skill that helps AI coding agents build and review software using three complementary perspectives:

- [The Twelve-Factor App](https://12factor.net/): how the software runs.
- [The Manifesto for Software Craftsmanship](https://manifesto.softwarecraftsmanship.org/): how the software is made.
- **Perl philosophy:** [Larry Wall's three virtues](https://perldoc.perl.org/perlglossary#hubris), [Huffman coding for common operations](https://www.perl.com/pub/2001/10/02/apocalypse3.html/), and related design principles. Make common tasks easy, choose approaches that fit, keep behavior predictable, and balance laziness, impatience, and hubris with diligence, patience, and humility.

The skill is one file, [`skills/12-factor-craftsmanship/SKILL.md`](skills/12-factor-craftsmanship/SKILL.md). It uses the open [Agent Skills](https://agentskills.io) format, so any agent that reads `SKILL.md` files can load it.

## Install

### Claude Code (recommended)

Inside Claude Code, run:

```
/plugin install 12-factor-craftsmanship --marketplace fifitrixabelle/12-factor-craftsmanship
```

On Claude Code versions before 2.1.275, add the marketplace first:

```
/plugin marketplace add fifitrixabelle/12-factor-craftsmanship
/plugin install 12-factor-craftsmanship@12-factor-craftsmanship
```

To pick up new versions, run `/plugin marketplace update 12-factor-craftsmanship`.

### Any agent, with the `skills` CLI

```bash
npx skills add fifitrixabelle/12-factor-craftsmanship
```

### Other agents

Copy `skills/12-factor-craftsmanship/` into your agent's skills directory. If your agent has no skills support, paste the body of `SKILL.md` into its instructions file (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, and so on).

## Use

The agent loads the skill when a task fits: designing a service, adding config, logging, or background jobs, setting up deployment, or reviewing code for production readiness. You can also ask for it by name:

> Review this service with the 12-factor-craftsmanship skill.

## License

MIT. The Twelve-Factor App, the Software Craftsmanship manifesto, and the cited Perl writings belong to their authors. This skill summarizes and adapts their ideas in its own words and links to the originals.
