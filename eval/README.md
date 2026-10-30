# Evaluation (work in progress)

The primary benchmark is `maintenance-v1`: seven small tasks with existing project
files, public callers, constraints, and explicit acceptance criteria. It exercises
changes to existing code and contextual judgment. The original ten prose probes
remain available as **legacy diagnostics**; their regex scores are not the primary
measure of quality.

## Maintenance cases

| Case | Context and observable outcome | Provenance |
| --- | --- | --- |
| `prompt_transport` | Repair an existing subprocess wrapper. Preserve Markdown, quotes, newlines, argument boundaries, and failed-child behavior through its caller. | Repository regression: original `gather-proof.js` in `2e74586`. |
| `payment_retry` | Repair checkout with a retrying gateway SDK. Simulate a charge committed before a timeout, caller replay, permanent declines, exhausted budgets, and unknown failures. | Repository payment-fixture defects, extended with a constructed SDK and caller. |
| `worker_shutdown` | Repair a leased-message worker. Send real SIGTERM/SIGINT during work and polling; verify acknowledgement, intake closure, failed work, and a stalled-job deadline. | Constructed scenario. |
| `dry_run` | Repair a cache CLI using real temporary directories, ages, files, and symlinks. Verify preview preservation, actual cleanup, invalid retention, and target validation. | Constructed scenario. |
| `shared_policy` | Review an extraction where two callers deliberately implement one policy and must change together. | Constructed control. |
| `independent_policy` | Review the same code and proposal with independently owned policies and a documented upcoming divergence. | Paired constructed control. |
| `library_adaptation` | Review a small library with a valid mounted-token-file contract and no server or worker lifecycle. Avoid unsupported defect findings. | Constructed no-finding control. |

The source projects, reference repairs, acceptance tests, and rubrics are in
[`cases/`](cases/). `cases.json` records the origin and construction of each case.
The two policy controls deliberately have identical implementations and proposals;
their policy documents change the appropriate decision.

These are **contextualized examples, not a mined sample of production incidents**.
They cover selected failure modes, not all skill guidance. Missing coverage includes
larger dependency graphs, framework-specific discovery, real database migrations,
authorization, and multi-service incidents. Reference repairs illustrate one
acceptable implementation; candidate repairs are checked by behavior rather than
source equality.

## Local corpus and regression checks

Mise pins Node.js 24.22.2. No npm dependencies or model credentials are needed:

```bash
mise trust
mise install
mise run check
mise run fixtures
```

The repair corpus contains sixteen acceptance tests. Each broken project must fail
and its reference repair must pass. Review fixture checks verify categorical decision
handling; they do not establish that a rationale is sound. CI uses the same mise
configuration and runs `mise run check`.

Trusted repository fixtures run directly under Node. Model-generated repairs use
the native Codex sandbox instead. Native grading is also checked locally against
the reference repairs; the normal CI suite uses a fake CLI for runner integration
and does not require model access or a Codex installation.

`mise run plugin:validate` runs `claude plugin validate --strict .` when the Claude
Code CLI is installed. Repository metadata consistency tests supplement this
release-time validator; they do not replace it.

## Run the maintenance benchmark

Use an authenticated Codex CLI supporting `exec --ignore-user-config`, `--ephemeral`,
stdin prompts, and native `codex sandbox` execution. Select the model explicitly:

```bash
mise run benchmark --model YOUR_MODEL_ID
mise run benchmark --case payment_retry --model YOUR_MODEL_ID
mise run benchmark --model YOUR_MODEL_ID --output /tmp/new-maintenance-run.json
```

A full run starts fourteen CLI sessions; selecting one case starts two. Tool loops
can make multiple model calls per session. These calls incur provider costs.

Each arm gets a separate temporary project. Repair tasks allow workspace edits;
review tasks use read-only workspaces. Both arms receive the same project, task,
constraints, and rubric. The skill arm additionally receives `SKILL.md`. Arm order
alternates across cases. User config is ignored and sessions are ephemeral, but
global skills and provider defaults may still influence both arms. Use a dedicated
environment without ambient instructions for controlled effect estimates.

Generated repair tests run through the native Codex sandbox with networking
configured off, a minimal environment, a five-second Node test deadline, and a
ten-second process deadline. The trusted acceptance files remain outside the
candidate workspace. Original caller files are checked for unintended changes;
reference-source equality is not required. Missing tests, changed protected files,
invalid submissions, and failing acceptance checks cannot earn a repair pass.
There is no automatic unsandboxed fallback for generated code. The native sandbox
is checked before paid repair sessions start.

Review answers use JSON with `decision`, `rationale`, and `findings`. The categorical
decision is checked directly; the valid-library control also requires no unsupported
findings. **Rationale quality requires semantic review.** We do not search for
particular phrases such as “pure function” or specific variable names.

## Read the results

The JSON record reports these groups separately:

- `repairs`: paired completions and acceptance-test passes for each arm.
- `reviewDecisions`: paired completions and correct decisions for each arm.
- `executionErrors`: model collection failures, including timeouts.
- `gradingErrors`: native sandbox or test-runner infrastructure failures.

Only completed pairs without grading infrastructure errors enter their group's
denominator. Invalid review JSON is a failed submission, not an infrastructure
failure. Test-deadline exhaustion is a failed repair. There is no pooled quality
score combining repair tests and review decisions.

Records preserve prompts, original files, candidate source snapshots, test output,
raw answers, reported usage, session times, model/CLI/Node versions, git revision and
dirty state, skill/collector hashes, and per-file suite hashes. Snapshots are bounded
to 100 files and 128 KiB per file; symbolic links are rejected as source artifacts.
Execution and grading failures remain separate from ordinary test failures.

Each run reserves a new filename and checkpoints after every arm. Completed runs
have `completedAt`. Reported usage is the completed turn's CLI usage, not a guaranteed
billing total; no monetary cost is inferred. One sample per case is diagnostic.
Review rationales, inspect changes, repeat generations, and report uncertainty before
claiming that the skill improves real work. Acceptance tests establish their tested
contracts, not complete production safety or every qualitative rubric criterion.

## Legacy text suite and historical records

The original `probes.json`, `graders.js`, `fixtures.js`, and `promptfooconfig.js` remain
available for historical comparisons and grader diagnostics:

```bash
mise run fixtures:legacy --markdown
mise run eval --input completions.json --markdown
mise run benchmark:legacy --model YOUR_MODEL_ID
```

The external text-grading input is an array of `{ "probe": "id", "output": "answer" }`
objects or an object map from probe IDs to answer strings. Unknown/duplicate IDs and
non-string answers are errors; omitted probes appear as `MISSING`.

Legacy text graders use heuristic patterns and can reject equivalent correct answers.
Their hand-authored positive/negative fixtures are grader checks, not sampled model
baselines. The legacy Promptfoo config derives prompts from `probes.json`; use a
pinned Promptfoo version and an explicit provider/model:

```bash
export EVAL_PROVIDER='YOUR_PROVIDER_AND_MODEL_ID'
npx "promptfoo@$PROMPTFOO_VERSION" eval -c eval/promptfooconfig.js
```

Record the exact Promptfoo version and settings. Promptfoo injects the skill as a
system prompt; the Codex collectors inject it into the user prompt. Do not pool
those experiments as equivalent. See [Promptfoo configuration](https://www.promptfoo.dev/docs/configuration/guide/).

[`results/live-proof-gpt-6.1-sol.json`](results/live-proof-gpt-6.1-sol.json) is preserved
unchanged. Its original 4/10 versus 6/10 result is withdrawn as evidence of uplift:
the old collector corrupted prompts through shell substitution, counted execution
failures as answer failures, and did not select the labeled model explicitly.

The [corrected-collector diagnostic run](results/2026-10-30T19-10-44-432Z-gpt-6_1-sol-50243dce.md)
completed all twenty sessions but exposed further text-grader false negatives. Those
records do not establish a quality difference. Maintenance-v1 is a different corpus
and measurement method; its scores must not be directly compared with either older run.

The [first maintenance-v1 run](results/2026-10-30T19-58-29-820Z-maintenance-v1-77cd3e25.md)
completed all fourteen sessions. After correcting a worker assertion that incorrectly
required adjacent log events, both arms pass 4/4 repair cases and select 3/3 expected
review decisions. The original result and a separately hashed regrading correction
are retained. This single tied run does not demonstrate an incremental skill benefit.
