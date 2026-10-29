# 12 Factor Craftsmanship

**Lessons learnt the hard way, turned into practical checks for coding agents.**

Wrong abstractions make every change harder. Hidden wiring makes behavior difficult to trace. Unsafe retries repeat side effects. Unchecked defaults change behavior across deployments. This skill turns those failure patterns into actions agents can take before delivering a change.

It mixes ideas from Twelve-Factor, Software Craftsmanship, Perl, Rails, typed functional programming, Eiffel, Clojure, Go, Erlang/OTP, and htmx. Borrow the techniques that fit the task, verify the outcome, and revise the approach when the evidence changes. No particular language or stack is required.

It also draws on first-hand experience delivering and operating production applications across a wide range of environments, stacks, and constraints. Some citations are decades old; the problems they help address still turn up in production. The checks bring those ideas together with lessons from delivery, maintenance, and failure recovery, and adapt them to the environment at hand.

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

### Update the Claude Code plugin

In your shell, run:

```bash
claude plugin update 12-factor-craftsmanship@12-factor-craftsmanship
```

Then run `/reload-plugins` inside an existing Claude Code session, or start a new session. Refreshing the marketplace listing alone does not update the loaded plugin.

### Cursor Agent

Register the marketplace. This does not install the plugin.

```bash
cursor-agent plugin marketplace add https://github.com/fifitrixabelle/12-factor-craftsmanship
```

Start `cursor-agent`, run `/plugins`, and install `12-factor-craftsmanship`. User scope makes it available in later CLI sessions. A plugin installed for your user in the Cursor app is available in the CLI as well.

To pick up a new release, re-index the marketplace and start a new session:

```bash
cursor-agent plugin marketplace update https://github.com/fifitrixabelle/12-factor-craftsmanship
```

### Any agent, with the `skills` CLI

```bash
npx skills add fifitrixabelle/12-factor-craftsmanship
```

### Other agents

Copy `skills/12-factor-craftsmanship/` into your agent's skills directory. If your agent has no skills support, paste the body of `SKILL.md` into its instructions file (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, and so on).

## Use

The agent loads the skill when a task fits: designing a service, adding config, logging, or background jobs, setting up deployment, or reviewing code for production readiness. Reviews focus on concrete risks and maintenance costs; a justified departure from a default is not automatically a defect. You can also ask for it by name:

> Review this service with the 12-factor-craftsmanship skill.

### Examples of applying judgment

Judge an adaptation by the outcome it preserves and the failure case it handles. In reviews, distinguish demonstrated defects, risks that depend on an unverified assumption, and optional improvements.

- **A sound adaptation:** A managed function uses the platform's invocation handler instead of binding a port. Verify that requests reach the handler and that failures propagate through the platform's invocation contract. The invocation mechanism changes while the service remains accessible through its supported interface; adding an HTTP listener would not improve that outcome.
- **An unsafe shortcut:** A payment integration retries after a timeout using a new idempotency key for every attempt. The first attempt may already have charged the customer, so the retries can create duplicate charges. Reuse the key for the same logical payment or reconcile its outcome before retrying. If the provider's duplicate-prevention behavior is unknown, report a conditional risk and identify the provider contract or integration check needed to resolve it.
- **A difference that needs no finding:** Two small validation functions look similar, but one implements a shipping rule and the other a billing rule, and those rules change independently. Similar syntax alone does not justify coupling them in a shared helper. Retain the duplication unless evidence shows that both callers must follow the same rule.

## Principles and sources

The cited principles give names and context to lessons reinforced by practical experience. Their age is not a reason to follow them unquestioningly or discard them: judge them by whether they help deliver reliable, maintainable software today. Its foundations include:

- [The Twelve-Factor App](https://12factor.net/): how the software runs.
- [The Manifesto for Software Craftsmanship](https://manifesto.softwarecraftsmanship.org/): how the software is made.
- **Perl philosophy:** [Larry Wall's three virtues](https://perldoc.perl.org/perlglossary#hubris), [Huffman coding for common operations](https://www.perl.com/pub/2001/10/02/apocalypse3.html/), and related design principles. Make common tasks easy, choose approaches that fit, keep behavior predictable, and balance laziness, impatience, and hubris with diligence, patience, and humility.
- [The Rails Doctrine: Convention over Configuration](https://rubyonrails.org/doctrine#convention-over-configuration), by David Heinemeier Hansson: use shared conventions to avoid recurring decisions and redundant configuration, and weigh the cost of exceptions.

These are starting points for judgment. The skill identifies the goal behind a rule, checks whether its usual implementation fits, and verifies the outcome. It explains meaningful trade-offs and revisits decisions when requirements, platforms, or evidence change. Use the right tool for the right job, including when that means changing an earlier choice.

That approach reflects the [ongoing evolution of Twelve-Factor](https://github.com/twelve-factor/twelve-factor/blob/next/UPDATE_FAQ.md), which separates enduring principles from changing implementation guidance, and [Sandi Metz's The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction), which explains why a once-useful abstraction may need to be undone. For example, mounted configuration can preserve separation from code, a managed function need not bind its own port, and temporary duplication can be better than coupling unrelated behavior. Security, observability, and other production needs must also be considered where relevant.

Modern tools and guidance often revisit the same concerns with new terminology and implementations. We see that continuity in the [AWS Builders' Library guidance on timeouts, retries, and backoff](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/), which addresses bounded recovery and safe repetition, and [OpenTelemetry's signals](https://opentelemetry.io/docs/concepts/signals/), which bring traces, metrics, and logs into a common observability framework. These are contemporary expressions and extensions of recurring engineering lessons; the practical question remains how well a technique serves the application and its operators.

The skill is one file, [`skills/12-factor-craftsmanship/SKILL.md`](skills/12-factor-craftsmanship/SKILL.md). It uses the open [Agent Skills](https://agentskills.io) format, so any agent that reads `SKILL.md` files can load it.

The skill contains direct instructions for scoping changes, writing maintainable code, designing interfaces, checking service operation, and verifying results. Background and sources live here so agents can spend their context on actionable guidance.

It also adds **factor 13: convention over configuration**, adapted from [David Heinemeier Hansson's Rails Doctrine](https://rubyonrails.org/doctrine#convention-over-configuration). Use established conventions for routine structure and wiring, with explicit overrides for real exceptions. Deployment-specific values remain external. This is an extension in this skill, separate from the original Twelve-Factor App.

We cite David Heinemeier Hansson (DHH) solely for convention over configuration. This project does not endorse anything else he has said or written.

## Further sources

This bibliography covers the ideas incorporated into the skill, including the foundations linked above. The practical instructions are this project's adaptations; the sources do not prescribe or endorse the whole combined skill.

### Service operation and craftsmanship

| Source and attribution | Ideas used in the skill |
| --- | --- |
| [The Twelve-Factor App — Adam Wiggins](https://12factor.net/) | The original twelve areas: codebase, dependencies, config, backing services, build/release/run, processes, port binding, concurrency, disposability, environment parity, logs, and admin processes. Informs **Check service operation**. |
| [Manifesto for Software Craftsmanship — the Software Craftsmanship community](https://manifesto.softwarecraftsmanship.org/) | Maintainable software, continued value, professional collaboration, and productive partnerships. Informs **Write maintainable code** and **Verify and report**. |
| [Twelve-Factor Update FAQ — Twelve-Factor maintainers](https://github.com/twelve-factor/twelve-factor/blob/next/UPDATE_FAQ.md) | Separate principles from examples and evolve guidance with platforms and workloads. Informs **Scope the change** and contextual adaptations of the service checks. This describes an update effort, not a replacement specification adopted wholesale here. |
| [Beyond the Twelve-Factor App — Kevin Hoffman](https://www.oreilly.com/library/view/beyond-the-twelve-factor/9781492042631/) | Broader consideration of API design, telemetry, authentication, and authorization. Informs the interface, observability, and access checks. |
| [Timeouts, retries, and backoff with jitter — Marc Brooker, AWS Builders' Library](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) | Production experience with transient failures, retry amplification, backoff, jitter, and idempotency. Reinforces the timeout and retry checks. |
| [Signals — OpenTelemetry contributors](https://opentelemetry.io/docs/concepts/signals/) | Traces, metrics, and logs as complementary telemetry signals. A modern reference for the observability checks. |

### Perl principles and programmer virtues

| Source and attribution | Ideas used in the skill |
| --- | --- |
| [Perl Glossary — Perl documentation contributors](https://perldoc.perl.org/perlglossary) | Definitions of [laziness](https://perldoc.perl.org/perlglossary#laziness), [impatience](https://perldoc.perl.org/perlglossary#impatience), and [hubris](https://perldoc.perl.org/perlglossary#hubris), associated with Larry Wall. Informs **Apply the programmer virtues**: reduce future work, remove wasted time, and own the result. |
| [Apocalypse 3 — Larry Wall](https://www.perl.com/pub/2001/10/02/apocalypse3.html/) | Huffman coding as a language-design analogy: frequently used operations deserve shorter forms. Adapted to common API calls and workflows in **Design for people**; the historical syntax proposals are not instructions for current Perl. |
| [Programming Perl: Natural and Artificial Languages — Larry Wall, Tom Christiansen, and Jon Orwant](https://www.oreilly.com/library/view/programming-perl-3rd/0596000278/ch01s02.html) | Make easy things easy and hard things possible. Informs simple defaults with explicit support for demonstrated advanced needs. |
| [Perl 6 Design Philosophy — Allison Randal, Dan Sugalski, and Leopold Tötsch](https://www.perl.com/pub/2003/06/25/perl6essentials.html/) | DWIM and the waterbed theory of complexity. Informs predictable interfaces and assessing complexity across callers, implementation, and operation. Used for design ideas, not current language documentation. |
| [Diligence, Patience, and Humility — Larry Wall](https://www.oreilly.com/openbook/opensources/book/larry.html) | Complementary virtues and the recognition of multiple valid approaches. Informs investigation, collaboration, revising assumptions, and the practical interpretation of TMTOWTDI. |

### Design, interfaces, and recovery

| Source and attribution | Ideas used in the skill |
| --- | --- |
| [The Rails Doctrine: Convention over Configuration — David Heinemeier Hansson](https://rubyonrails.org/doctrine#convention-over-configuration) | Use shared conventions to avoid repeated decisions and redundant wiring; weigh exceptions. Informs **factor 13**, this skill's extension to the original twelve. |
| [The Wrong Abstraction — Sandi Metz](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction) | Reconsider shared code when changing requirements produce flags and unrelated branches. Informs inspecting callers and separating unsuitable shared behavior while allowing duplication. |
| [Designing with Types: Making Illegal States Unrepresentable — Scott Wlaschin](https://fsharpforfunandprofit.com/posts/designing-with-types-making-illegal-states-unrepresentable/) | Encode valid domain states with variants and constrained construction. Informs state modeling and validation at boundaries; the article credits the phrase to Yaron Minsky. |
| [Design by Contract and Assertions — Eiffel documentation](https://www.eiffel.org/doc/solutions/Design_by_Contract_and_Assertions) | Preconditions, postconditions, invariants, and caller/supplier responsibilities. Adapted to types, validation, assertions, and tests without requiring Eiffel. |
| [Locality of Behaviour — Carson Gross](https://htmx.org/essays/locality-of-behaviour/) | Make behavior discoverable near its point of use while retaining implementation boundaries. Informs explicit calls and keeping related behavior close; the essay builds on Richard P. Gabriel's discussion of locality. |
| [Simple Made Easy — Rich Hickey](https://www.infoq.com/presentations/Simple-Made-Easy/) | Distinguish simplicity from convenience and familiarity; reduce intertwined concerns. Informs separating business rules, I/O, and mutable state where this reduces coupling. |
| [Go Proverbs — Rob Pike](https://go-proverbs.github.io/) | Small interfaces, clarity, and weighing a little copying against a dependency. Informs consumer-focused interfaces and comparing dependency costs with a small local implementation. |
| [Supervisor Behaviour: Supervision Principles — Erlang/OTP documentation](https://www.erlang.org/doc/system/sup_princ.html) | Supervised processes, restart strategies, and restart intensity limits. Informs failure isolation and bounded recovery where runtime or platform supervision is available. |

The selection, ordering, verification/reporting format, and advice to use the right tool for the right job are editorial synthesis. Runtime-specific adaptations—such as mounted configuration, managed-function handlers, and platform telemetry—must be checked against the target platform's documentation when applied.

## Releases

For each release that changes the plugin or skill, increment `version` in `.claude-plugin/plugin.json` and validate the plugin with `claude plugin validate --strict .` before pushing. An unchanged manifest version can leave installed users on the old copy even after new commits. See [Claude Code's publishing guidance](https://code.claude.com/docs/en/plugins/publish#prepare-your-plugin-for-release).

## License

MIT. The Twelve-Factor App, the Software Craftsmanship manifesto, and the other cited writings belong to their authors. This skill summarizes and adapts their ideas in its own words and links to the originals.
