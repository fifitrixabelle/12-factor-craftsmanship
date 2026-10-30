# Evaluation (work in progress)

This suite covers ten craftsmanship capabilities: retry/idempotency, state variants,
independent domain rules, shutdown, config/logging, dry-run behavior, pure calculations,
rolling migrations, serverless review, and framework conventions.

## What the checks establish

`graders.js` uses heuristic text patterns. It reports a binary score, a reason, and
criterion checks. Some detected anti-patterns fail immediately. Passing means the
expected text signals were found, not that code is correct or production-ready.
Comments, alternative syntax, quoted examples, and naming differences can still
cause false positives or false negatives. Review model answers against the full
rubric in `probes.json` before drawing conclusions.

`fixtures.js` contains hand-authored positive and negative examples. Comparing those
examples tests the graders; it is not a baseline-versus-skill model benchmark.
The payment fixture is also executed against a simulated gateway to check permanent
HTTP failures, exhausted retries, transient failures, and stable idempotency keys.
Only trusted repository fixtures are executed, never arbitrary model output.

## Local checks

Use mise to install the Node.js version pinned in `mise.toml` (24.22.2).
No npm dependencies or model credentials are needed for local checks.

```bash
mise trust
mise install
mise run check
mise run fixtures --markdown
```

Tests cover grader counterexamples, fixture behavior, CLI validation, subprocess
transport and failures, and consistency between plugin/package/skill metadata,
probe IDs, fixtures, graders, and Promptfoo inputs. CI uses the same mise configuration and runs `mise run check`. This metadata check supplements the release-time
`claude plugin validate --strict .` check; it does not replace that validator.

## Evaluate collected completions

Supply either an array or an object keyed by probe ID:

```json
[
  { "probe": "retry_idempotency", "output": "...answer..." },
  { "probe": "state_variants", "output": "...answer..." }
]
```

```bash
mise run eval --input completions.json
mise run eval --input completions.json --markdown
```

Unknown probes, duplicate IDs, invalid JSON, non-string answers, and invalid options
are errors. Absent probes appear as `MISSING`, separately from failed answers.
An empty string is a supplied answer that fails the relevant heuristic checks.
The command exits nonzero for invalid input; a quality failure is reported in the
scorecard rather than the exit code.

## Collect paired answers with Codex

Use an authenticated Codex CLI whose `exec --help` supports `--ignore-user-config`,
`--ephemeral`, `--json`, and stdin prompts. Choose the model explicitly:

```bash
mise run benchmark --model YOUR_MODEL_ID
# Optional: choose a new destination; existing files are rejected.
mise run benchmark --model YOUR_MODEL_ID --output /tmp/new-run.json
```

Each run starts twenty Codex CLI sessions and incurs provider costs; tool loops can
make multiple model calls per session. Prompts are sent
exactly over stdin using an argument-based subprocess; shell interpolation is never
used. Each arm/probe gets an empty temporary working directory outside this repo.
User config is ignored, sessions are ephemeral, and model tools use a read-only
sandbox. Global skill discovery and provider defaults may still affect both arms:
for a controlled comparison, use a dedicated account/environment with no installed
skills or ambient instructions, and record its setup with the results.

Records include the requested model, CLI/Node versions, git revision and dirty state,
SHA-256 hashes of the skill, probes, graders, runner, and sent prompts, reasoning
effort, timeout, response time, raw answers, heuristic grades, and reported token usage.
The requested model is not independently verified server routing. Usage is the
reported completed turn, may be unavailable (`null`), and is not a guaranteed billing
total. Wall time includes CLI startup and tool use. Provider prices are not inferred.

Each record gets a unique filename. A checkpoint is written after every completed
pair. Execution failures have `status: execution_error`, `output: null`, and
`grade: null`; they are counted separately and make the CLI exit nonzero. Only pairs
where both arms completed enter the comparison denominator. An incomplete record
has no `completedAt` field and must not be presented as a completed benchmark.

## Promptfoo

`promptfooconfig.js` derives tests directly from `probes.json`; prompts are not copied
into a second configuration. Select an installed, pinned Promptfoo version and an
explicit provider/model ID supported by that version:

```bash
export EVAL_PROVIDER='YOUR_PROVIDER_AND_MODEL_ID'
# Set PROMPTFOO_VERSION to the exact version you have selected.
npx "promptfoo@$PROMPTFOO_VERSION" eval -c eval/promptfooconfig.js
```

Record the exact Promptfoo version, provider/model, skill revision, settings, and raw
outputs with published results. The two arms compare a bare user prompt with the
skill injected as a system prompt. The Codex collector injects the skill into its
user prompt instead; do not pool those experiments as equivalent.
See [Promptfoo configuration](https://www.promptfoo.dev/docs/configuration/guide/)
for supported configuration and provider options.

## Historical result: withdrawn as evidence of uplift

[`results/live-proof-gpt-6.1-sol.json`](results/live-proof-gpt-6.1-sol.json) is preserved
unchanged for transparency. Its stored 4/10 versus 6/10 scores do not establish an
improvement. The original collector:

- Embedded prompts in shell strings, executing backticks and removing task details.
- Counted process timeouts as model-answer failures.
- Labeled the model without explicitly selecting it and ran inside the repository.
- Used graders that omitted checks and sometimes rejected equivalent correct wording.

Do not recompute that record and call it a corrected benchmark: the original inputs
were corrupted. Fresh paired generations and independent grading are required.

## Next validation work

- Repeat clean paired runs across selected models; report sample counts, execution
  failures, uncertainty, and human-reviewed rubric scores.
- Add held-out judgment cases: valid mounted config, shared code implementing one
  policy, libraries that need no service infrastructure, and reviews with no defect.
  Measure false findings as well as missed defects.
- Compare completion time and token usage, including the cost of loading the skill.
- Execute generated implementations in an isolated environment for shutdown,
  dry-run filesystem preservation, retry replay, and schema compatibility.
- Evaluate multi-turn work on real repositories before claiming practical uplift.
