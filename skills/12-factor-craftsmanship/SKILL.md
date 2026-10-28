---
name: 12-factor-craftsmanship
description: Use when designing a service, adding config, dependencies, logging, background jobs, deployment or Docker setup, reviewing code for production-readiness, or when the user mentions "12 factor", "twelve-factor", "craftsmanship", "cloud-native", "well-crafted code", "Larry Wall", Perl design principles, Huffman coding in API design, TMTOWTDI, DWIM, or the programmer virtues of laziness, impatience, and hubris.
---

# 12 Factor Craftsmanship

## Scope the change

1. Read the project's instructions, the code being changed, its callers, and relevant tests.
2. Identify the required behavior, workload, runtime, and constraints. Apply only the guidance relevant to the task.
3. Choose the smallest clear change that meets the need. Follow existing conventions and keep unrelated cleanup separate.
4. Adapt a default when it conflicts with the actual requirements or platform. For a material adaptation, briefly explain the goal, trade-off, and verification in the existing review or decision record. Routine choices need no extra document or approval.
5. Reconsider earlier choices when requirements change, failures recur, or maintenance costs rise. Preserve correctness, security, and explicit user requirements while changing the approach.

## Write maintainable code

- Use names that describe intent and units with clear responsibilities. Split code when doing so makes behavior easier to understand or change; use line counts as investigation prompts.
- Remove dead code. Share code that represents the same knowledge or responsibility. Keep similar-looking code separate when its callers need different behavior or change independently.
- When a shared abstraction accumulates flags and unrelated branches, inspect its callers. Inline the relevant behavior into each caller, remove unused paths, and extract a smaller shared concept if one becomes clear.
- Improve what the task touches in small, reversible steps. Surface risks and explain consequential trade-offs early.
- **Use the right tool for the right job.** Start with project tools and standard capabilities. Use a parser for structured data, text search for literal strings, and transactions for related writes that must be atomic. Introduce or replace a tool for a concrete benefit that justifies its dependency, migration, and maintenance costs.

## Apply the programmer virtues

- **Laziness — save everyone future work.** Reuse existing tools, automate repeated chores when the savings exceed maintenance costs, and document how to run them. Keep necessary error handling and checks.
- **Impatience — remove wasted time.** Shorten feedback loops and remove redundant steps. Measure a slow path before optimizing and compare afterward. Preserve checks that catch failures; show progress for long-running user tasks.
- **Hubris — take responsibility for the result.** Review your diff, verify behavior, report limits, and correct flaws exposed by evidence or review. Favor code others can inspect and maintain.
- **Diligence, patience, and humility — investigate and revise.** Read unfamiliar code before changing it, investigate failed checks, and update mistaken assumptions. Stop investigating when further analysis would not change the decision or verification.

## Design for people

- **Huffman coding — give common operations a short, clear path.** Minimize setup and repeated arguments for frequent tasks; make unusual options explicit. For example, support `client.get(url)` with optional timeout settings. Keep names readable and side effects visible.
- **Easy things easy, hard things possible.** Provide simple defaults and explicit options or composition for demonstrated advanced needs. For example, accept a filename for ordinary parsing and a stream for large inputs. Add extension points when a real requirement needs them.
- **TMTOWTDI — choose the approach that fits.** Select one implementation based on requirements, project conventions, and maintenance cost. Reuse a suitable existing HTTP client instead of introducing a competing library for preference alone.
- **DWIM — match informed expectations.** Use the audience's vocabulary and established conventions for names, defaults, and errors. Make `--dry-run` show planned changes without writing them. Surface ambiguous targets and invalid inputs before acting; keep coercions explicit.
- **Waterbed theory — check where complexity moves.** Before extracting a helper or adding configuration, inspect the effect on callers, debugging, deployment, and maintenance. Delete unnecessary behavior first. Keep an abstraction when it reduces the total burden.

## Check service operation

For each area the change touches, apply the relevant checks below. For libraries, CLIs, embedded software, or managed runtimes, skip inapplicable mechanisms and verify the underlying need directly.

1. **Codebase:** Keep source-to-release provenance clear and builds reproducible. In a monorepo, give each deployable unit clear boundaries and ownership.
2. **Dependencies:** Declare runtime and build dependencies, including required system tools. Use the ecosystem's appropriate version constraints and lockfiles; verify a clean environment can build and run the app.
3. **Config:** Keep deploy-specific values outside the built artifact. Use env vars, mounted config, secret stores, or workload identity as appropriate. Keep credentials out of source and define configuration precedence. Version non-secret deployment config when useful.
4. **Backing services:** Configure service endpoints and credentials externally. Check connection, timeout, and failure behavior when changing databases, queues, caches, or APIs. Remove accidental assumptions that services run locally.
5. **Build, release, run:** Build a reproducible artifact, combine it with deployment config, and run that release. Keep dependency installation and source edits out of startup. Run migrations as controlled deployment operations rather than during image builds.
6. **Processes:** Keep replaceable instances independent of ephemeral state. Store durable data in persistent resources. For intentionally stateful workloads, define ownership, recovery, and scaling behavior.
7. **Port binding:** Have self-hosted services bind a configured port. For managed functions, implement and verify the platform handler contract.
8. **Concurrency:** Separate web, worker, or scheduler roles when their scaling or lifecycle needs differ. Keep roles together when that meets the requirements more simply. Let the platform manage process supervision and concurrency where supported.
9. **Disposability:** Follow the runtime lifecycle. For long-running processes, handle `SIGTERM`, stop accepting work, and finish or requeue in-flight jobs. For managed functions, handle deadlines and retries. Use idempotency or deduplication where work may repeat.
10. **Dev/prod parity:** Match behavior where differences could hide defects, such as database semantics. Use lightweight substitutes for fast local feedback when integration checks exercise the real service.
11. **Logs and telemetry:** Use structured stdout/stderr on platforms that collect process output, or their supported telemetry interfaces. Add metrics and traces needed to diagnose changed behavior. Keep sensitive data out of telemetry and delegate routing and rotation to the platform where supported.
12. **Admin processes:** Version migrations and management tools. Run them against the intended release and environment with appropriate access; make failures and retries safe.

## Additional factor

13. **Convention over configuration:** Use established framework and project conventions for naming, file placement, discovery, and wiring. Remove configuration that merely restates those conventions. Provide explicit overrides for demonstrated exceptions and make the effective behavior easy to inspect. Keep deploy-specific values such as credentials and service endpoints external, as in factor 3.

When changing exposed interfaces or access to data, check input validation, authentication, authorization, and failure behavior. Match these checks to the actual exposure and requirements.

## Verify and report

- Run checks that exercise the changed behavior. For logic changes, add or update tests that catch the relevant failure. For documentation or configuration changes, validate the affected format, references, or behavior as appropriate.
- Inspect the final diff for unintended changes, secrets, dead code, and needless complexity. Measure before and after when claiming a performance improvement.
- Investigate failures and review feedback. Report what changed, what was verified, and any remaining failures, skipped checks, or limits. Support success claims with results you observed.
- In code reviews, report `principle → location → concrete consequence → proportionate fix`. Rank security and data-loss risks first. Call out a departure from a default when it creates a concrete risk or cost; skip irrelevant rules and avoid findings based only on stylistic preference.
