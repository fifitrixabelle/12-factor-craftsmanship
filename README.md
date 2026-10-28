# 12 Factor Craftsmanship

An agent skill for AI coding agents: a practical mix of principles and ideas from different programming languages, frameworks, and engineering communities. It combines Twelve-Factor, Software Craftsmanship, Perl, Rails, typed functional programming, Eiffel, Clojure, Go, Erlang/OTP, and htmx into instructions agents can apply while building and reviewing software.

Each idea earns its place through a concrete action: model valid states, make contracts explicit, keep behavior discoverable, reduce coupling, limit interface size, or recover safely from failures. Apply the ideas that fit the task, language, platform, and team, and verify that they improve the result. The skill borrows useful techniques without requiring their original language or stack.

Its foundations include:

- [The Twelve-Factor App](https://12factor.net/): how the software runs.
- [The Manifesto for Software Craftsmanship](https://manifesto.softwarecraftsmanship.org/): how the software is made.
- **Perl philosophy:** [Larry Wall's three virtues](https://perldoc.perl.org/perlglossary#hubris), [Huffman coding for common operations](https://www.perl.com/pub/2001/10/02/apocalypse3.html/), and related design principles. Make common tasks easy, choose approaches that fit, keep behavior predictable, and balance laziness, impatience, and hubris with diligence, patience, and humility.
- [The Rails Doctrine: Convention over Configuration](https://rubyonrails.org/doctrine#convention-over-configuration), by David Heinemeier Hansson: use shared conventions to avoid recurring decisions and redundant configuration, and weigh the cost of exceptions.

These are starting points for judgment. The skill identifies the goal behind a rule, checks whether its usual implementation fits, and verifies the outcome. It explains meaningful trade-offs and revisits decisions when requirements, platforms, or evidence change. Use the right tool for the right job, including when that means changing an earlier choice.

That approach reflects the [ongoing evolution of Twelve-Factor](https://github.com/twelve-factor/twelve-factor/blob/next/UPDATE_FAQ.md), which separates enduring principles from changing implementation guidance, and [Sandi Metz's The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction), which explains why a once-useful abstraction may need to be undone. For example, mounted configuration can preserve separation from code, a managed function need not bind its own port, and temporary duplication can be better than coupling unrelated behavior. Security, observability, and other production needs must also be considered where relevant.

The skill is one file, [`skills/12-factor-craftsmanship/SKILL.md`](skills/12-factor-craftsmanship/SKILL.md). It uses the open [Agent Skills](https://agentskills.io) format, so any agent that reads `SKILL.md` files can load it.

The skill contains direct instructions for scoping changes, writing maintainable code, designing interfaces, checking service operation, and verifying results. Background and sources live here so agents can spend their context on actionable guidance.

It also adds **factor 13: convention over configuration**, adapted from [David Heinemeier Hansson's Rails Doctrine](https://rubyonrails.org/doctrine#convention-over-configuration). Use established conventions for routine structure and wiring, with explicit overrides for real exceptions. Deployment-specific values remain external. This is an extension in this skill, separate from the original Twelve-Factor App.

## Further sources

- [Scott Wlaschin: Making Illegal States Unrepresentable](https://fsharpforfunandprofit.com/posts/designing-with-types-making-illegal-states-unrepresentable/): model valid domain states with types and validate values at boundaries.
- [Eiffel: Design by Contract and Assertions](https://www.eiffel.org/doc/solutions/Design_by_Contract_and_Assertions): make preconditions, postconditions, and invariants explicit.
- [Carson Gross: Locality of Behaviour](https://htmx.org/essays/locality-of-behaviour/): make behavior discoverable near its point of use without exposing implementation details.
- [Rich Hickey: Simple Made Easy](https://www.infoq.com/presentations/Simple-Made-Easy/): assess simplicity by separating intertwined concerns, rather than by familiarity or convenience.
- [Rob Pike: Go Proverbs](https://go-proverbs.github.io/): keep interfaces small and weigh dependencies against modest local implementations.
- [Erlang/OTP: Supervision Principles](https://www.erlang.org/doc/system/sup_princ.html): isolate failures and define supervised, bounded recovery where the runtime supports it.
- [Beyond the Twelve-Factor App](https://www.oreilly.com/library/view/beyond-the-twelve-factor/9781492042631/): extends the discussion to API design, telemetry, and authentication and authorization.
- [Programming Perl: Natural and Artificial Languages](https://www.oreilly.com/library/view/programming-perl-3rd/0596000278/ch01s02.html): making easy things easy and hard things possible.
- [Perl 6 Design Philosophy](https://www.perl.com/pub/2003/06/25/perl6essentials.html/): DWIM and the waterbed theory of complexity.
- [Larry Wall: Diligence, Patience, and Humility](https://www.oreilly.com/openbook/opensources/book/larry.html): complementary virtues and more than one way to do it.

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

The agent loads the skill when a task fits: designing a service, adding config, logging, or background jobs, setting up deployment, or reviewing code for production readiness. Reviews focus on concrete risks and maintenance costs; a justified departure from a default is not automatically a defect. You can also ask for it by name:

> Review this service with the 12-factor-craftsmanship skill.

## License

MIT. The Twelve-Factor App, the Software Craftsmanship manifesto, and the other cited writings belong to their authors. This skill summarizes and adapts their ideas in its own words and links to the originals.
