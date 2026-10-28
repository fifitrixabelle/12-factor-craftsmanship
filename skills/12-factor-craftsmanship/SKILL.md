---
name: 12-factor-craftsmanship
description: Use when implementing, changing, designing, or reviewing services, configuration, dependencies, interfaces, background jobs, deployment, or production readiness; or when asked to apply Twelve-Factor, software craftsmanship, Larry Wall's virtues, Perl design principles, Huffman coding, TMTOWTDI, DWIM, or convention over configuration.
---

# 12 Factor Craftsmanship

## Scope the change

1. Read project instructions, the affected code, its callers, and relevant tests. Include framework discovery and lifecycle hooks when tracing behavior.
2. Identify the requested behavior and the constraints that affect it: compatibility, runtime, data durability, security, and deployment. Apply only checks relevant to the change.
3. Preserve behavior outside the request. Keep unrelated cleanup separate; prefer changes that can be reviewed and reverted independently.
4. Start with the defaults below. When a requirement or platform makes one unsuitable, choose an alternative that meets the underlying need. Explain material trade-offs and verification in the existing review or decision record; routine choices need no extra document or approval.

## Write maintainable code

- Name units for their purpose. Split a unit when it mixes responsibilities or makes a required change hard to isolate, rather than to meet a line limit.
- Keep business decisions separate from I/O and mutable state when this lets them be tested or changed independently. Add a layer only to isolate a dependency, policy, or independently changing responsibility.
- Make behavior discoverable from the point of use through clear calls, declarations, and established framework conventions. Keep related behavior close; retain implementation details behind interfaces.
- Model mutually exclusive states with variants or constrained construction when invalid combinations are possible. For example, represent pending, succeeded, and failed results as alternatives instead of independent flags. Use runtime validation when types cannot enforce the constraint.
- Express important input requirements, output guarantees, and state invariants through types, validation, assertions, or tests. Validate untrusted data at entry points; assertions that can be disabled must not be the only protection there.
- Share code when callers follow the same rule and should change together. Similar syntax alone is insufficient. If shared code gains flags or unrelated branches, inspect callers first; separate behavior only when they represent different responsibilities. Preserve behavior with focused checks before restructuring.
- Before deleting apparently unused code, check direct callers, framework discovery, configuration references, and public compatibility obligations. Delete it when those checks confirm it is unused or the task explicitly retires it.
- **Use the right tool for the right job / TMTOWTDI.** Reuse suitable project tools and standard capabilities. Use parsers for structured data and transactions for writes that must be atomic. Compare a new dependency with a small local implementation, accounting for correctness, integration, updates, and maintenance. Choose one approach that meets the actual requirements.

## Apply the programmer virtues

- **Laziness:** Automate a repeated chore when the saved work exceeds setup and maintenance; document how to run the automation.
- **Impatience:** When a task is slow, measure where time goes, remove redundant work, and compare afterward using the same workload. Preserve checks that detect failures; show progress for long-running user operations.
- **Hubris:** Own the delivered result: inspect the diff, verify claims, and report limits using **Verify and report** below.
- **Diligence, patience, and humility:** Investigate failed checks and conflicting evidence before changing the implementation. Revise a choice when new requirements or evidence invalidate its assumptions; retain the checks needed to establish the replacement's behavior.

## Design for people

- Expose operations that consumers need. Keep interfaces specific to those uses; avoid adding methods or extension points for hypothetical callers. Preserve existing public contracts unless changing them is part of the task.
- **Huffman coding:** Minimize repeated setup for common operations while keeping names and side effects clear. Put unusual options behind explicit arguments; do not shorten names merely to save characters.
- **Easy things easy, hard things possible:** Provide a simple default for ordinary use and options or composition for demonstrated advanced requirements. Keep those options out of the ordinary call path.
- **DWIM:** Match established vocabulary and behavior. Make `--dry-run` avoid writes; reject invalid input with actionable errors. Resolve ambiguous destructive targets before acting and make coercions visible.
- **Waterbed theory:** Before adding a helper, layer, or configuration option, check what callers and maintainers must now understand. Prefer the design that removes special cases and duplicated decisions across the affected paths.

## Check service operation

Check only areas touched by the change. For libraries, CLIs, embedded systems, and managed runtimes, use the applicable platform mechanism instead of introducing service infrastructure.

1. **Codebase:** Ensure each deployable artifact can be traced to its source revision and build inputs. Keep deployable boundaries clear in monorepos.
2. **Dependencies:** Declare runtime and build dependencies, including system tools. Use the ecosystem's version constraints and lockfiles. When changing dependency or build setup, verify it in a clean environment or existing CI job.
3. **Config:** Keep deploy-specific values outside the built artifact. Use the platform's env vars, mounted config, secret store, or workload identity. Keep credentials out of source; define precedence when multiple configuration sources exist.
4. **Backing services:** Configure endpoints and credentials externally. When changing an integration, check connection failures, timeouts, and error propagation. Check existing SDK and platform retries before adding any. Assign retry ownership; bound total attempts and elapsed time across layers. Retry only transient failures and operations safe to repeat.
5. **Build, release, run:** Build the artifact before deployment and associate it with release configuration. Keep dependency installation and source edits out of startup. Run migrations as controlled release operations with a failure and recovery path. For rolling deployments, verify schema compatibility while old and new versions coexist; delay destructive changes until old consumers are gone.
6. **Processes:** Store durable state outside replaceable instances. Treat local memory and ephemeral disk as disposable. For intentionally stateful workloads, define persistence, ownership, recovery, and scaling.
7. **Port binding:** Bind a configured port for self-hosted services. For managed functions, verify the platform's handler and invocation contract.
8. **Concurrency:** Separate roles when resource or lifecycle needs require independent scaling; otherwise retain the simpler deployment. Use existing platform supervision. Where supervised recovery is available, isolate failures, bound restarts, and surface exhausted recovery attempts. Before replaying effects with uncertain outcomes, reuse existing idempotency keys or reconcile durable outcomes. Surface unresolved work when safe replay cannot be established.
9. **Disposability:** Follow the runtime lifecycle. For long-running processes, stop accepting work on shutdown and finish or requeue in-flight work within the termination deadline. For functions, handle deadlines and redelivery. Use idempotency or deduplication for effects that may repeat.
10. **Dev/prod parity:** Test against the real service when behavior depends on its semantics. Keep fast local substitutes where useful; cover their relevant differences with integration checks.
11. **Logs and telemetry:** Use the platform's collection interfaces, such as structured stdout/stderr. Capture enough context to diagnose changed behavior without secrets or sensitive payloads. Add metrics or traces for specific operational questions; delegate routing and rotation where supported.
12. **Admin processes:** Version management tools and migrations. Verify the target release, environment, and access before running them; check partial-failure and rerun behavior.

For changes to exposed interfaces or data access, verify input validation, authentication, and authorization, including rejected requests.

## Additional factor

13. **Convention over configuration:** Use established naming, placement, discovery, and wiring conventions. Before removing an explicit setting, verify that the effective default preserves behavior across supported environments and framework versions. Keep settings that intentionally pin behavior. Add overrides for actual exceptions, document their precedence, and keep deploy-specific values external as in factor 3.

## Verify and report

- Run existing checks that exercise the changed behavior. Add or update a focused test when they do not catch the relevant failure. For documentation or configuration, validate the affected format, references, or behavior.
- Inspect the final diff for unintended changes, exposed credentials, and unnecessary complexity.
- Report what changed, which checks ran and their results, and remaining failures or limits. State when a required environment or check was unavailable. Claim success only for outcomes supported by observed results.
- For reviews, report `location → concrete consequence → proportionate fix`, naming the relevant principle when useful. Rank security and data-loss risks first. Establish a concrete risk or cost before flagging a departure from a default.
