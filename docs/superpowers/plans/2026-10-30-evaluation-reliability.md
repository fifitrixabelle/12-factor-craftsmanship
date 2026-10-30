# Evaluation reliability implementation plan

**Goal:** Make the existing evaluation safe to run and honest about what it measures.

**Architecture:** Retain the dependency-free Node harness. Use argument-based subprocesses, explicit run metadata, criterion-level heuristic results, and executable checks for trusted fixtures. Preserve historical results with a warning rather than rewriting them.

**Scope:** Implements the repository review accepted with “lets go”; does not publish a release or claim a new model improvement without a clean live run.

- [x] Add failing regressions for missing rubric checks, unsafe fixtures, prompt transport, execution failures, and invalid CLI inputs.
- [x] Fix graders and fixtures; expose criterion results and label heuristic limits.
- [x] Fix live collection: exact stdin prompts, explicit model, isolated working directory, execution errors separate from grades, immutable result paths and provenance.
- [x] Generate Promptfoo cases from the canonical probes; validate metadata, versions, probe coverage, and add CI.
- [x] Correct benchmark documentation and fixture report labels; document reproducible live runs and judgment/cost validation still required.
- [x] Run the full test suite, fixture report, format/metadata checks, and inspect the final diff.

**Verification:** Regression tests must fail before the corresponding fix. Live runner integration uses a local fake executable so transport and failure handling are tested without API spending. Existing saved records remain historical, invalid evidence of uplift.

**Accepted steering:** Use mise for language dependencies, improve the README presentation, and do not use Node 20. Added `mise.toml` pinning Node 24.22.2, routed CI through mise, and set the package minimum to Node 24. Added an accessible SVG banner and a more scannable README while retaining sources and benchmark limitations.

**Final verification:** `mise exec -- node --version` returned v24.22.2. `mise run check` passed all 57 tests and correctly classified all ten positive/negative fixture pairs. Workflow YAML and SVG XML parse, README code fences/details are balanced, and `git diff --check` passed. Independent code review findings about hard timeouts and message-first raw-header logging were reproduced and fixed with regression tests. The historical JSON record is unchanged. A new live benchmark, Promptfoo execution, GitHub-hosted CI, and Claude's strict plugin validator were not run. No browser was available for visual preview of the banner.
