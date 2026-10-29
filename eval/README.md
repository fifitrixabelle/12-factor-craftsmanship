# 12-Factor Craftsmanship: Evaluation & Analysis

This directory contains the automated evaluation suite for `12-factor-craftsmanship`. It measures whether a coding agent or LLM applies production-grade operational principles, disciplined state modeling, sensible human-centered ergonomics, and calibrated review judgment.

---

## 1. Analysis: What is the Skill Good For?

Frontier LLMs write syntactically correct code, but frequently stumble into well-known production traps:
- They add naive retry loops that create duplicate financial charges or hammer broken services.
- They model multi-step workflows with an explosion of conflicting boolean flags.
- They aggressively merge unrelated functions purely because the code looks syntactically similar today (Sandi Metz's *Wrong Abstraction*).
- They write background workers that drop active jobs when Kubernetes or ECS sends a `SIGTERM`.
- They leak auth tokens into log streams and leave fallback secrets hardcoded in source files.
- In reviews, they act pedantically—flagging valid cloud adaptations (such as serverless handlers that do not bind an HTTP port) as defects, while missing unhandled runtime exceptions.

`12-factor-craftsmanship` bridges **cloud operational discipline** (Twelve-Factor App modernized) with **software craftsmanship** (Perl virtues, Scott Wlaschin, Sandi Metz, Carson Gross, Rich Hickey, Eiffel, Erlang/OTP, and Rails convention over configuration).

### Core Competencies & Capabilities

| Capability Domain | Principle / Foundation | What the Skill Enforces | Failure Mode Prevented |
|---|---|---|---|
| **Backing Services & Resilience** | Twelve-Factor (Factor 4), AWS Builders' Library | Reuses idempotency keys across retries; bounds attempts; applies exponential backoff with jitter; retries only transient errors (5xx/429). | Retry storms; duplicate credit card charges caused by generating fresh UUIDs per attempt. |
| **Domain State Modeling** | Scott Wlaschin (*Designing with Types*) | Models mutually exclusive states with discriminated unions / variants (algebraic data types); binds fields only to valid states. | Boolean flag explosion (`isLoading: true && isError: true`); impossible illegal states. |
| **Premature DRY & Abstraction** | Sandi Metz (*The Wrong Abstraction*) | Evaluates caller responsibilities before deduplicating; preserves duplication when lifecycles differ (e.g. billing vs shipping address rules). | Brittle coupling; shared helpers bloated with `isShipping` flags and special cases. |
| **Process Lifecycle & Disposability** | Twelve-Factor (Factors 6 & 9) | Traps `SIGTERM`/`SIGINT`; stops accepting new work; drains in-flight jobs within a shutdown deadline before exit. | Dropped jobs and corrupted transactions during container rolling restarts. |
| **Config & Telemetry Safety** | Twelve-Factor (Factors 3 & 11) | Externalizes secrets via environment; never leaves hardcoded fallback credentials; scrubs auth/cookie headers; streams structured logs to stdout. | Leaked API keys in Git; credential leakage in log aggregation systems. |
| **Ergonomics & DWIM** | Larry Wall / Perl (*DWIM & Huffman Coding*) | Guarantees `--dry-run` performs zero destructive writes; provides clear, actionable feedback on planned actions; validates input arguments. | Dangerous scripts that delete files during dry runs; cryptic CLI exits. |
| **Separation of Concerns** | Rich Hickey (*Simple Made Easy*) | Separates pure business calculation rules from external I/O, network calls, and mutable database state. | Untestable business logic tangled inside database queries and HTTP requests. |
| **Release & Schema Safety** | Twelve-Factor (Factor 5) | Employs multi-phase expand-and-contract migrations for zero-downtime rolling deploys; defers destructive drops until old versions exit. | Rolling deployment outages caused by single-step column renames breaking old pods. |
| **Review Judgment & Adaptation** | Software Craftsmanship & Twelve-Factor Evolution | Recognizes sound platform adaptations (e.g. AWS Lambda handler contract vs port binding); formats findings as `location → concrete consequence → proportionate fix`. | Dogmatic review rejections; false defect claims; unranked nits obscuring real safety bugs. |
| **Convention over Configuration** | Rails Doctrine (Factor 13) | Prefers established framework naming and discovery conventions over bespoke runtime registries or redundant configuration files. | Waterbed complexity; maintainers burdened with bespoke, non-standard wiring layers. |

---

## 2. Evaluation Architecture

The eval suite evaluates models across **10 targeted probes**:

1. `retry_idempotency` (Factor 4): Payment gateway retry with idempotency key preservation.
2. `state_variants` (Maintainable code): Job lifecycle modeled as a discriminated union.
3. `wrong_abstraction` (Sandi Metz): Reviewing a proposal to prematurely DRY distinct business rules.
4. `disposability_shutdown` (Factor 9 & 6): Background queue worker with graceful SIGTERM drain.
5. `config_telemetry_safety` (Factor 3 & 11): Environment configuration & sanitized stdout request logging.
6. `dwim_dry_run` (DWIM / Larry Wall): Backup pruning CLI with non-destructive `--dry-run`.
7. `pure_core_imperative_shell` (Simple Made Easy): Pure order calculation decoupled from database I/O.
8. `rolling_migration` (Factor 5): Expand-and-contract schema migration during rolling deployment.
9. `serverless_adaptation_review` (Review Judgment): Rejecting dogmatic port-binding claims on Lambda.
10. `convention_over_configuration` (Factor 13): Choosing framework convention over custom reflection router.

### Eval Components

- **`eval/probes.json`**: Probe specifications, user prompts, domain mappings, and grading rubrics.
- **`eval/graders.js`**: Deterministic rubric evaluators testing for positive craftsmanship signals and the absence of fatal anti-patterns.
- **`eval/fixtures.js`**: Curated paired samples (baseline failing vs craftsmanship passing) for every probe.
- **`tests/eval-graders.test.js`**: Native `node:test` suite verifying that all graders pass compliant code and fail anti-patterns.
- **`eval/run.js`**: Zero-dependency CLI runner that generates ASCII tables, evaluates custom model JSON, and prints GitHub-flavored Markdown reports.
- **`eval/promptfooconfig.yaml`**: Multi-model Promptfoo benchmark config comparing `arms/baseline.js` (no skill) vs `arms/craftsmanship.js` (with skill).

---

## 3. Running the Tests & Benchmark

### 1. Run the Grader Unit Tests (Zero Dependencies)

Requires Node.js ≥ 20. Uses Node's built-in test runner:

```bash
npm test
# or: node --test tests/eval-graders.test.js
```

### 2. Run the Benchmark Scorecard

Evaluate the built-in fixture baselines:

```bash
npm run eval
# or: node eval/run.js
```

Generate a Markdown report:

```bash
node eval/run.js --markdown
```

### 3. Evaluate External Model / Agent Generations

If you have collected completions in a JSON file:

```json
[
  { "probe": "retry_idempotency", "output": "...code..." },
  { "probe": "state_variants", "output": "...code..." }
]
```

Run:

```bash
node eval/run.js --input completions.json
```

### 4. Run Live LLM Evaluations with Promptfoo

To benchmark Claude, OpenAI, or Gemini across both arms:

```bash
npx promptfoo@latest eval -c eval/promptfooconfig.yaml
npx promptfoo@latest view
```

---

## 4. Work in Progress (WIP) Status & Initial Findings

> [!NOTE]
> This evaluation suite is currently in active development (**WIP**). The core measurement harness is validated, and initial empirical benchmarking has begun.

### Initial Empirical Proof (`gpt-6.1-sol`)

A live trial across all 10 probes was run against `gpt-6.1-sol` (via local non-interactive CLI). Full records are stored in [`eval/results/live-proof-gpt-6.1-sol.json`](results/live-proof-gpt-6.1-sol.json).

| Metric | Baseline (No Skill) | With `12-factor-craftsmanship` | Net Improvement |
|---|:---:|:---:|:---:|
| **Score** | **4 / 10 (40%)** | **6 / 10 (60%)** | **+20% (+50% relative)** |

#### Key Observed Behaviors
1. **Eliminating Hedging & Stalling**: On operational tasks (e.g., CLI tools, config loaders), bare models frequently stall asking conversational clarifying questions. With the skill, the model recognizes DWIM and standard conventions, delivering a complete, safe implementation (e.g., non-destructive `--dry-run` with input validation).
2. **Pure Domain Logic Separation**: The skill prompted the model to separate business calculation rules from I/O, writing clean domain math accompanied by comprehensive unit tests with zero mocking.
3. **Review Calibration**: The skill effectively guided the model to classify review findings as *conditional risks* versus *demonstrated defects*, preventing dogmatic rejection of sound platform adaptations (like serverless handlers).

### Roadmap to Full Validation
- [x] **Phase 1**: Grader rubric definition and unit test verification (22/22 passing).
- [x] **Phase 2**: Standalone CLI runner and Promptfoo harness.
- [x] **Phase 3**: Initial single-shot empirical validation on frontier model (`gpt-6.1-sol`).
- [ ] **Phase 4**: Multi-model benchmarking across Claude 3.7 Sonnet, Claude Opus, Gemini 2.5 Flash, and GPT-4o.
- [ ] **Phase 5**: Dynamic adversarial execution tests (spawning subprocesses to test actual `SIGTERM` draining and simulated 503 retry replay).
- [ ] **Phase 6**: Multi-turn agentic benchmark evaluating changes on real repositories.
