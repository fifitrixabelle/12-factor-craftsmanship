# Representative maintenance examples

**Goal:** Exercise changes to existing code and contextual judgment with observable outcomes instead of answer vocabulary.

**Approach:** Keep the original ten prose probes as a legacy diagnostic suite. Make seven new cases the primary benchmark: four code repairs (prompt transport, payment retry, shutdown, dry-run) and three contextual reviews (shared policy, independent policies, sound library configuration). Supply existing files, callers, explicit compatibility constraints, and acceptance criteria. Two repairs derive from defects actually found here; other cases are explicitly constructed scenarios.

**Constraints:** Node 24.22.2 through mise; no new dependencies. Execute trusted corpus checks directly, and generated candidate code only through the native Codex sandbox with networking disabled and a bounded timeout. Keep model generation, test failures, and infrastructure errors distinct. Report repair tests and review decisions separately; rationale requires semantic review. Preserve all historical run records and the original suite.

- [ ] Create failing and reference projects plus runnable acceptance tests for the four repair cases.
- [ ] Add review controls with contrasting policy ownership and a valid library adaptation.
- [ ] Build case loading, fixture checks, isolated live workspaces, native sandbox grading, provenance, and candidate snapshots. Write regression tests before implementation.
- [ ] Route mise benchmark tasks to the maintenance suite and retain explicit legacy tasks.
- [ ] Document provenance, measurement limits, commands, and coverage; run all checks and independent review.

**Commit cadence:** Commit the corpus once its trusted fixture checks pass, commit live-runner integration once its tests pass, then commit documentation/review corrections. Previous reliability and presentation work is already committed as c0dc6b0 and be6c707.
