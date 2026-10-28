---
name: 12-factor-craftsmanship
description: Use when designing a service, adding config, dependencies, logging, background jobs, deployment or Docker setup, reviewing code for production-readiness, or when the user mentions "12 factor", "twelve-factor", "craftsmanship", "cloud-native", "well-crafted code", "Larry Wall", Perl design principles, Huffman coding in API design, TMTOWTDI, DWIM, or the programmer virtues of laziness, impatience, and hubris.
---

# 12 Factor Craftsmanship

Three lenses, applied together:

- **Twelve-Factor** (https://12factor.net) — how the software *runs*: portable, deployable, scalable.
- **Software Craftsmanship** (https://manifesto.softwarecraftsmanship.org) — how the software is *made*: well-crafted, steadily improved, professionally delivered.
- **Perl philosophy** — how the programmer *works* and designs for people: [Larry Wall's three virtues](https://perldoc.perl.org/perlglossary#hubris) and the practical design principles below.

Working code that violates the factors is not done. Code that satisfies the factors but is hard to read and change is not done either.

## The craftsmanship stance

The manifesto extends the Agile manifesto. Each line keeps the original value and adds one:

| Not only…                    | …but also                          | What it means for you as an agent |
|------------------------------|------------------------------------|-----------------------------------|
| working software             | **well-crafted software**          | Passing tests is the floor. Clear names, small units, no dead code, no copy-paste. |
| responding to change         | **steadily adding value**          | Leave the code a bit better than you found it. Small, safe, reversible steps. |
| individuals and interactions | **a community of professionals**   | Follow the project's conventions. Explain trade-offs. Make the next reader's job easy. |
| customer collaboration       | **productive partnerships**        | Push back on bad ideas with reasons. Surface risks early. Don't silently cut corners. |

In practice:

1. **Understand before changing.** Read the code you touch and its callers.
2. **Test what matters.** Write or update a test that fails if the logic breaks.
3. **Keep it simple.** The smallest clear design that meets today's need. No speculative abstractions.
4. **Refactor in passing, not in bulk.** Improve what you touch; propose bigger cleanups separately.
5. **Be honest.** Report failures, skipped steps, and known limits plainly.

### Use the right tool for the right job

Choose languages, libraries, commands, and services based on the problem's requirements and the project's constraints. Consider correctness, reliability, team familiarity, operational cost, and maintenance. Start with existing project tools and standard capabilities; introduce a different tool when it solves a concrete need better.

**Example:** Use a JSON parser to change structured JSON, a text search tool to find literal strings, and a database transaction to make related writes atomic.

**Boundary:** Familiarity alone does not make a tool suitable, and novelty alone does not justify a new dependency. Keep an existing tool when it meets the need; explain the benefit and migration cost when replacing it.

## Larry Wall's three virtues

Larry Wall's deliberately provocative names describe useful programming habits. Use these practical interpretations alongside the craftsmanship stance:

### Laziness: save everyone future work

Reduce the total effort needed to build, use, and maintain the software. Reuse existing tools, automate repeated chores, and document how things work so others can help themselves. Choose the smallest solution that saves more work than it creates.

**Example:** Turn a repeated manual deployment procedure into a script using existing tooling, with instructions for running it.

**Boundary:** Do the necessary work. Skipping error handling or tests shifts work onto someone else. Automation that costs more to maintain than the chore it replaces defeats the purpose.

### Impatience: remove wasted time

Make common tasks responsive and feedback quick. Remove needless steps and let computers handle repetitive work. Measure slow paths before optimizing, and address needs that exist today.

**Example:** Measure a slow test loop, remove redundant setup, and check that it runs faster while still catching the same failures. For a long-running user task, show progress so people know what is happening.

**Boundary:** Keep the checks that establish correctness. Rushing a change, disabling tests, or guessing at performance improvements creates more delays later.

### Hubris: make work you are proud to put your name on

Take responsibility for the result. Write clear, reliable code, verify your claims, and maintain what you deliver. Make the work easy for others to inspect and improve.

**Example:** Before reporting a fix, run the relevant checks and review the diff. When a reviewer identifies a flaw, investigate it and correct the work.

**Boundary:** Stay open to evidence and criticism. Clever code that others cannot maintain, defending a mistake, or claiming success without verification undermines the quality you are responsible for.

## More lessons from Perl

These are practical adaptations of Perl's design principles, not requirements to use Perl syntax or implement every language feature.

### Huffman coding: give common operations the shortest clear path

[Wall applies the Huffman coding analogy to operator design](https://www.perl.com/pub/2001/10/02/apocalypse3.html/): frequent operations deserve shorter forms than rare ones. Apply that idea to APIs, commands, and workflows: make everyday tasks require less ceremony, and let unusual options take more space.

**Example:** Offer `client.get(url)` for the usual request, with explicit optional arguments for unusual timeout or retry settings.

**Boundary:** Preserve meaning. Cryptic names, hidden side effects, and code golf make reading harder. Judge brevity by the effort saved across repeated use and maintenance, not character count alone.

### Easy things easy, hard things possible: a simple default with room for real needs

[This Perl design goal](https://www.oreilly.com/library/view/programming-perl-3rd/0596000278/ch01s02.html) means common tasks should work with little setup, while supported advanced tasks remain achievable through explicit options or composition.

**Example:** Let a parser read a normal file with one call, while accepting a stream for large inputs.

**Boundary:** Add advanced capabilities when a real requirement calls for them. Keep optional complexity out of the common path; avoid building a general framework for imagined needs.

### TMTOWTDI: choose the way that fits the problem and the team

[There's More Than One Way To Do It](https://www.oreilly.com/openbook/opensources/book/larry.html) encourages judgment about different valid approaches. Choose based on the task, existing conventions, and the people who will maintain the result.

**Example:** Reuse the project's existing HTTP client when it meets the requirement, even if you prefer another library.

**Boundary:** Pick one clear implementation. This principle does not require duplicate APIs, competing dependencies, or several styles for the same operation.

### DWIM: make behavior match informed expectations

[Do What I Mean](https://www.perl.com/pub/2003/06/25/perl6essentials.html/) means designing around the user's established vocabulary and conventions. Make names, defaults, and errors predictable for the intended audience.

**Example:** A command's `--dry-run` shows planned changes without writing them; invalid options produce actionable errors.

**Boundary:** Use explicit inputs when intent is ambiguous. Inferring a destructive target, silently changing input, or hiding surprising coercions violates predictable behavior.

### Waterbed theory: check where complexity moves

[The waterbed theory of complexity](https://www.perl.com/pub/2003/06/25/perl6essentials.html/) warns that simplifying one part can make another harder. Assess the caller, implementation, configuration, debugging, and maintenance together.

**Example:** A shared helper can simplify callers, but check whether its configuration and error handling cost more effort than the duplication it removes.

**Boundary:** The metaphor does not mean all complexity is unavoidable. Delete unnecessary requirements and dead code first; accept an abstraction when it reduces the total burden.

### Diligence, patience, and humility: balance the three virtues

[Wall also describes these complementary virtues](https://www.oreilly.com/openbook/opensources/book/larry.html). Apply diligence to understanding and verification, patience to investigation and collaboration, and humility to revising assumptions when evidence changes.

**Example:** Read an unfamiliar caller before changing an API, investigate a failing check, and update your approach when a reviewer exposes a mistaken assumption.

**Boundary:** Keep the work proportionate. Endless polishing and analysis that does not change a decision delay useful delivery.

## The twelve factors

Check each factor that the change touches. Each entry: the rule, then what to look for.

1. **Codebase** — One codebase in version control, many deploys.
   Flag: one app split across repos without a shared library, or several apps sharing one deployable unit.
2. **Dependencies** — Declare and isolate every dependency explicitly.
   Use a manifest plus lockfile (`package.json`/lock, `pyproject.toml`/`uv.lock`, `go.mod`, …). Flag: relying on globally installed tools or system packages that aren't declared.
3. **Config** — Store config in the environment.
   Anything that varies between deploys (URLs, credentials, feature toggles) comes from env vars. Flag: hard-coded secrets, per-environment config files committed to the repo, `if env == "prod"` branches.
4. **Backing services** — Treat databases, queues, caches, mail, and APIs as attached resources.
   Swapping a local Postgres for a managed one should be a config change only. Flag: hard-coded hosts, code that assumes a service is local.
5. **Build, release, run** — Strictly separate the three stages.
   Build produces an artifact; release = artifact + config; run executes a release. Flag: code changes or `pip install` at runtime, migrations baked into image builds.
6. **Processes** — Run as one or more stateless, share-nothing processes.
   Persist state in a backing service. Flag: in-memory sessions, local-disk uploads, sticky-session assumptions.
7. **Port binding** — Export services by binding to a port.
   The app is self-contained and serves HTTP (or another protocol) itself. Port comes from config (`PORT`).
8. **Concurrency** — Scale out via the process model.
   Separate process types (web, worker, scheduler) scale independently. Flag: one process doing everything, self-daemonizing, PID files.
9. **Disposability** — Fast startup and graceful shutdown.
   Handle `SIGTERM`: stop accepting work, finish or requeue in-flight jobs, exit. Jobs should be idempotent so a crash is safe.
10. **Dev/prod parity** — Keep development, staging, and production as similar as possible.
    Same backing service types and versions (e.g. Postgres locally, not SQLite). Small, frequent deploys. Flag: "works on my machine" adapters.
11. **Logs** — Treat logs as event streams.
    Write to stdout/stderr, one event per line, structured where possible. Flag: the app opening, rotating, or shipping its own log files.
12. **Admin processes** — Run admin/management tasks as one-off processes.
    Migrations and scripts ship with the code, run against the same release and config. Flag: ad-hoc SQL on prod, scripts that live outside the repo.

## How to apply

**When writing code:** follow the factors by default. If the project already breaks one, don't widen the break; mention it.

**When reviewing:** report findings as `factor or principle → location → issue → fix`. Rank by risk: secrets in code and data-loss risks first, style last. Skip factors the change doesn't touch.

**When a factor doesn't fit** (a CLI tool, a library, an embedded device): say which factor you're setting aside and why. The factors target networked services; craftsmanship applies to everything.

## Quick checklist

- [ ] No secrets or per-environment values in code; all config from env
- [ ] Dependencies declared and locked
- [ ] Stateless processes; state in backing services
- [ ] Logs to stdout; no log files managed by the app
- [ ] Graceful `SIGTERM` handling; idempotent jobs
- [ ] Admin tasks as versioned one-off commands
- [ ] Tests cover the changed logic and pass
- [ ] Code is clear enough that the next person can change it safely
- [ ] Repeated chores use existing tools or worthwhile automation; instructions let others help themselves
- [ ] Common tasks avoid needless waits; performance changes have measurements
- [ ] Quality claims have evidence, and review feedback has been addressed
- [ ] Common operations have a short, clear path; advanced options stay explicit
- [ ] Names and defaults match user expectations; ambiguous intent is surfaced
- [ ] The chosen approach fits the project and reduces total complexity
- [ ] Tools fit the task's requirements; new dependencies or replacements have a concrete benefit
