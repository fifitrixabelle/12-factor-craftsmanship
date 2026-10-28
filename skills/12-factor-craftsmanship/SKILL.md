---
name: 12-factor-craftsmanship
description: Build, review, or refactor services and apps using the Twelve-Factor App methodology and the Software Craftsmanship manifesto. Use when designing a service, adding config, dependencies, logging, background jobs, deployment or Docker setup, reviewing code for production-readiness, or when the user mentions "12 factor", "twelve-factor", "craftsmanship", "cloud-native", or "well-crafted code".
---

# 12 Factor Craftsmanship

Two lenses, applied together:

- **Twelve-Factor** (https://12factor.net) — how the software *runs*: portable, deployable, scalable.
- **Software Craftsmanship** (https://manifesto.softwarecraftsmanship.org) — how the software is *made*: well-crafted, steadily improved, professionally delivered.

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
