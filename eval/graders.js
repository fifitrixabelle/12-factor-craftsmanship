/**
 * 12-factor-craftsmanship Evaluation Graders
 *
 * Heuristic text checks for the 10 core craftsmanship capabilities.
 * These checks are diagnostic signals, not proof of runtime safety or correctness.
 * 1. retry_idempotency: Safe retry with idempotency key reuse, bounded attempts & backoff.
 * 2. state_variants: Illegal states unrepresentable (discriminated unions vs boolean flags).
 * 3. wrong_abstraction: Resisting premature DRY across independent domain rules.
 * 4. disposability_shutdown: SIGTERM/SIGINT signal handling & draining in-flight work.
 * 5. config_telemetry_safety: Secret externalization & sanitizing auth headers in logs.
 * 6. dwim_dry_run: Non-destructive --dry-run CLI with actionable operator errors.
 * 7. pure_core_imperative_shell: Decoupled business calculation logic from I/O & mutable state.
 * 8. rolling_migration: Two-phase expand-contract schema migration for rolling deploys.
 * 9. serverless_adaptation_review: Discerning sound adaptations vs defects with structured review format.
 * 10. convention_over_configuration: Leaning on framework conventions over redundant wiring.
 *
 * Each grader returns: { pass: boolean, score: number, reason: string }
 */

function checked(criteria) {
  const checks = Object.entries(criteria).map(([criterion, pass]) => ({ criterion, pass: Boolean(pass) }));
  const failures = checks.filter(check => !check.pass);
  return {
    pass: failures.length === 0,
    score: failures.length === 0 ? 1 : 0,
    method: 'heuristic',
    checks,
    reason: failures.length ? `Missing heuristic evidence: ${failures.map(check => check.criterion).join('; ')}`
      : 'All heuristic text checks passed; semantic review or execution is still required.'
  };
}

const GRADERS = {
  /**
   * Backing Services (Factor 4): Retry & Idempotency
   */
  retry_idempotency(output) {
    const text = String(output || '');

    // Check for fatal anti-pattern: generating a fresh UUID/idempotency key INSIDE a retry loop
    const generatesNewKeyInLoop =
      /(?:while|for)\s*\([^)]*\)\s*\{[\s\S]*?(?:uuidv4|randomUUID|generateIdempotencyKey|crypto\.randomUUID)\(\)[\s\S]*?(?:fetch|axios|request|post)/i.test(
        text
      ) ||
      /(?:while|for)\s*\([^)]*\)\s*\{[\s\S]*?idempotency(?:Key|[-_]key)\s*[:=]\s*(?:uuidv4|randomUUID|crypto\.)/i.test(
        text
      );

    if (generatesNewKeyInLoop) {
      return {
        pass: false,
        score: 0,
        reason:
          'Dangerous anti-pattern: generates a new idempotency key inside the retry loop, risking duplicate charges on timeout.'
      };
    }

    // Must preserve/reuse idempotency key or accept it as parameter/generate before loop
    const handlesIdempotency =
      /idempotency(?:[-_]key|Key)?/i.test(text) &&
      (/(?:key|idempotencyKey)\s*=\s*(?:uuid|randomUUID|idempotencyKey|key|options\.idempotencyKey)/i.test(
        text
      ) ||
        /idempotency-key/i.test(text) ||
        /(?:reuse|same)\s+(?:idempotency\s+)?key/i.test(text) ||
        /idempotencyKey\s*:\s*\w+/i.test(text));

    // Must have bounded retries (e.g. maxRetries, maxAttempts, <= 3)
    const boundedAttempts =
      /(?:max(?:Retries|Attempts|_retries|_attempts)|attempt\s*<=\s*\d+|retries\s*<=\s*\d+|\battempts?\s*<\s*(?:max|limit|\d+))/i.test(
        text
      );

    // Must include backoff delay
    const hasBackoff =
      /(?:backoff|delay|sleep|setTimeout|jitter|exponential)/i.test(text);

    // Must distinguish transient vs non-transient errors (5xx, 503, 429, ECONNRESET, timeout)
    const checksTransient =
      /(?:503|5\d\d|transient|timeout|ECONNRESET|ETIMEDOUT|429|status\s*>=\s*500)/i.test(
        text
      );

    if (!boundedAttempts) {
      return {
        pass: false,
        score: 0,
        reason: 'Missing bounded retry limit (risks unbounded retry storm).'
      };
    }

    if (!handlesIdempotency) {
      return {
        pass: false,
        score: 0,
        reason: 'Missing idempotency key reuse across retry attempts.'
      };
    }

    if (!hasBackoff) {
      return {
        pass: false,
        score: 0,
        reason: 'Missing retry backoff delay (immediate retry amplifies load).'
      };
    }

    return checked({
      'stable idempotency key': handlesIdempotency,
      'bounded attempts': boundedAttempts,
      'backoff delay': hasBackoff,
      'transient failure classification': checksTransient
    });
  },

  /**
   * Maintainable Code: Discriminated Unions / Variants vs Boolean Explosion
   */
  state_variants(output) {
    const text = String(output || '');

    // Anti-pattern: independent boolean flags for mutually exclusive states
    const booleanExplosion =
      /(?:isQueued|isLoading|isProcessing)\s*:\s*boolean[\s\S]*?(?:isCompleted|isSuccess)\s*:\s*boolean[\s\S]*?(?:isFailed|isError)\s*:\s*boolean/i.test(
        text
      ) ||
      /(?:is_queued|is_processing)\s*:\s*bool[\s\S]*?(?:is_completed|is_success)\s*:\s*bool[\s\S]*?(?:is_failed|is_error)\s*:\s*bool/i.test(
        text
      );

    if (booleanExplosion) {
      return {
        pass: false,
        score: 0,
        reason:
          'Anti-pattern: models mutually exclusive states with independent boolean flags, allowing illegal states.'
      };
    }

    // Must use discriminated union, tagged union, or enum-based variants
    const usesDiscriminatedUnion =
      /(?:type\s+\w+\s*=\s*|\binterface\s+\w+\s*\{[\s\S]*?\})\s*\|\s*\{/i.test(
        text
      ) ||
      /status\s*:\s*['"]queued['"][\s\S]*?status\s*:\s*['"]processing['"][\s\S]*?status\s*:\s*['"]completed['"][\s\S]*?status\s*:\s*['"]failed['"]/i.test(
        text
      ) ||
      /(?:discriminated\s+union|tagged\s+union|algebraic\s+data\s+type|variants?|illegal\s+states\s+unrepresentable)/i.test(
        text
      );

    // State-specific fields must be tied to their state
    const scopedFields =
      /\{(?=[^{}]*status\s*:\s*['"]processing['"])(?=[^{}]*progress\s*:)[^{}]*\}/i.test(text) &&
      /\{(?=[^{}]*status\s*:\s*['"]completed['"])(?=[^{}]*downloadUrl\s*:)[^{}]*\}/i.test(text) &&
      /\{(?=[^{}]*status\s*:\s*['"]failed['"])(?=[^{}]*error\s*:)[^{}]*\}/i.test(text);

    if (!usesDiscriminatedUnion) {
      return {
        pass: false,
        score: 0,
        reason:
          'Fails to model state with variants/discriminated unions; lacks compile-time state exclusivity.'
      };
    }

    return checked({ 'variant state model': usesDiscriminatedUnion, 'state-specific fields': scopedFields });
  },

  /**
   * Maintainable Code: Sandi Metz / The Wrong Abstraction
   */
  wrong_abstraction(output) {
    const text = String(output || '');

    // Anti-pattern: unqualified insistence on premature DRYing
    const blindDRY =
      /(?:always\s+dry|must\s+never\s+repeat|merge\s+them\s+immediately|merge\s+them\s+into\s+a\s+single\s+function|duplication\s+is\s+always\s+evil)/i.test(
        text
      ) &&
      !/(?:wrong\s+abstraction|separate|different\s+reasons|independent|premature)/i.test(
        text
      );

    if (blindDRY) {
      return {
        pass: false,
        score: 0,
        reason:
          'Anti-pattern: advocates blind deduplication solely based on temporary syntactic similarity.'
      };
    }

    // Must recognize that billing and shipping have different domain lifecycles
    const recognizesSeparation =
      /(?:keep\s+them\s+separate|separate\s+functions|wrong\s+abstraction|sandi\s+metz|different\s+(?:reasons|lifecycles|responsibilities)|change\s+independently|syntax\s+alone|premature\s+(?:dry|abstraction)|coincidental\s+duplication)/i.test(
        text
      );

    // Explains the consequence: flags, conditionals, or coupling
    const warnsOfCoupling =
      /(?:flag|conditional|branch|boolean|coupled|coupling|taxes?|customs?|future)/i.test(
        text
      );

    if (!recognizesSeparation) {
      return {
        pass: false,
        score: 0,
        reason:
          'Fails to identify that identical syntax across distinct business domains is not justification for coupling.'
      };
    }

    return checked({ 'independent domain responsibilities': recognizesSeparation, 'cost of coupling': warnsOfCoupling });
  },

  /**
   * Disposability (Factor 9) & Processes (Factor 6): Graceful Shutdown
   */
  disposability_shutdown(output) {
    const text = String(output || '');

    // Must listen to termination signals
    const listensToSignals =
      /process\.(?:on|once)\(\s*['"]SIG(?:TERM|INT)['"]/i.test(text);

    // Must track shutdown state to stop accepting new work
    const stopsNewWork =
      /(?:isShuttingDown|isStopping|running\s*=\s*false|shuttingDown\s*=\s*true|stopAccepting|closing\s*=\s*true)/i.test(
        text
      );

    // Must drain or wait for in-flight work before exit
    const drainsInFlight =
      /(?:inFlight|activeJobs|drain|await\s+Promise\.all|currentJob|pendingJobs|gracePeriod|timeout|deadline)/i.test(
        text
      );

    // Anti-pattern: abrupt exit with no cleanup
    const abruptExit =
      /process\.on\(\s*['"]SIGTERM['"],\s*\(\)\s*=>\s*process\.exit\(0\)\s*\)/i.test(
        text
      );

    if (abruptExit) {
      return {
        pass: false,
        score: 0,
        reason:
          'Abrupt exit: immediately exits process on SIGTERM without waiting for in-flight jobs.'
      };
    }

    if (!listensToSignals) {
      return {
        pass: false,
        score: 0,
        reason:
          'Missing SIGTERM/SIGINT signal handling for container lifecycle.'
      };
    }

    if (!stopsNewWork) {
      return {
        pass: false,
        score: 0,
        reason:
          'Does not stop polling or accepting new work when shutdown begins.'
      };
    }

    if (!drainsInFlight) {
      return {
        pass: false,
        score: 0,
        reason:
          'Does not wait for in-flight jobs to complete within a shutdown deadline.'
      };
    }

    return checked({
      'termination signals': listensToSignals,
      'stop new work': stopsNewWork,
      'drain in-flight work': drainsInFlight,
      'bounded shutdown deadline': /(?:setTimeout|AbortSignal\.timeout)\s*\(/i.test(text)
    });
  },

  /**
   * Config (Factor 3) & Telemetry (Factor 11): Secret Protection & Stdout Logs
   */
  config_telemetry_safety(output) {
    const text = String(output || '');

    // Anti-pattern: hardcoded fallback secret
    const hardcodedSecret =
      /process\.env\.\w*(?:SECRET|PASSWORD|KEY|TOKEN|AUTH|DATABASE_URL)\w*\s*(?:\|\||\?\?)\s*['"][^'"]+['"]/i.test(text);

    if (hardcodedSecret) {
      return {
        pass: false,
        score: 0,
        reason:
          'Security defect: contains hardcoded fallback credentials in source code.'
      };
    }

    // Anti-pattern: raw headers logged directly without redaction
    const withoutSanitizedHeaders = text.replace(
      /\b(?:redact|sanitize|mask|filter)\w*\s*\(\s*(?:req|request)\.headers\s*\)/gi,
      'SANITIZED_HEADERS'
    );
    const leaksHeaders =
      /(?:console\.(?:log|info|error)|logger\.\w+|process\.(?:stdout|stderr)\.write)\s*\([^;]*\b(?:req|request)\.headers\b/i.test(withoutSanitizedHeaders);

    if (leaksHeaders) {
      return {
        pass: false,
        score: 0,
        reason:
          'Telemetry defect: logs raw request headers without scrubbing authorization tokens or cookies.'
      };
    }

    // Must read config from env
    const readsEnv = /process\.env\./i.test(text);

    // Must scrub/sanitize sensitive data or omit Authorization/Cookie headers
    const scrubsSensitiveData =
      /(?:redact|sanitize|mask|filter|omit|delete\s+.*authorization|authorization:\s*['"]\[redacted\]['"]|\[redacted\])/i.test(
        text
      ) ||
      /(?:req\.method|req\.url|req\.path|statusCode|duration)/i.test(text);

    // Must output structured telemetry to stdout/stderr (not writing to file)
    const logsToStdout =
      /(?:process\.(?:stdout|stderr)\.write|console\.(?:log|info|error))\s*\(/i.test(text) &&
      /JSON\.stringify\s*\(/i.test(text) &&
      !/fs\.(?:writeFile|appendFile)(?:Sync)?\s*\(/i.test(text);

    if (!readsEnv) {
      return {
        pass: false,
        score: 0,
        reason: 'Configuration must be externalized via environment variables.'
      };
    }

    if (!logsToStdout) {
      return {
        pass: false,
        score: 0,
        reason:
          'Logs must be treated as event streams to stdout/stderr rather than local log files.'
      };
    }

    return checked({
      'external configuration': readsEnv,
      'no detected fallback credentials': !hardcodedSecret,
      'sensitive data omitted or scrubbed': scrubsSensitiveData && !leaksHeaders,
      'structured standard-stream logs': logsToStdout
    });
  },

  /**
   * Design for People: DWIM & Safe Dry-Run
   */
  dwim_dry_run(output) {
    const text = String(output || '');

    const performsDelete =
      /(?:os\.remove|shutil\.rmtree|unlink|rmdir|rmSync)\(/i.test(text);

    // Verify whether the destructive deletion is properly guarded by dry-run
    const guardsDelete =
      /if\s+(?:args\.)?dry_run:[\s\S]{1,300}?else:[\s\S]{1,300}?(?:shutil\.rmtree|os\.remove|unlink|rmdir|rmSync)/i.test(
        text
      ) ||
      /if\s+not\s+(?:args\.)?dry_run:[\s\S]{1,300}?(?:shutil\.rmtree|os\.remove|unlink|rmdir|rmSync)/i.test(
        text
      ) ||
      /if\s*\(!(?:args\.)?dryRun\)[\s\S]{1,300}?(?:unlink|rmdir|rmSync|rmtree)/i.test(
        text
      ) ||
      /if\s*\((?:args\.)?dryRun\)[\s\S]{1,300}?else[\s\S]{1,300}?(?:unlink|rmdir|rmSync)/i.test(
        text
      );

    if (performsDelete && !guardsDelete) {
      return {
        pass: false,
        score: 0,
        reason:
          'Destructive defect: executes file deletions without guarding against --dry-run.'
      };
    }

    // Must respect --dry-run and avoid writes
    const respectsDryRun =
      /(?:dry[-_]run|--dry-run)/i.test(text) &&
      /(?:if\s+(?:args\.)?dry_run|if\s*\(!?dryRun\)|if\s+not\s+(?:args\.)?dry_run)/i.test(
        text
      );

    // Must explain what would be done under dry-run
    const actionableOutput =
      /(?:would\s+(?:delete|remove|prune)|would\s+be\s+(?:deleted|removed|pruned)|\[dry[- ]run\])/i.test(
        text
      );

    // Must validate inputs with actionable feedback
    const validatesInput =
      /(?:ValueError|ArgumentTypeError|error|sys\.exit|must\s+be\s+positive|greater\s+than\s+0)/i.test(
        text
      );

    if (!respectsDryRun) {
      return {
        pass: false,
        score: 0,
        reason:
          'Missing proper guard checking --dry-run before performing mutations.'
      };
    }

    if (!actionableOutput) {
      return {
        pass: false,
        score: 0,
        reason:
          '--dry-run must report actionable information on what operations would be performed.'
      };
    }

    if (!validatesInput) {
      return {
        pass: false,
        score: 0,
        reason:
          'DWIM requires validating inputs and rejecting invalid arguments with actionable feedback.'
      };
    }

    return checked({
      'guarded deletion': performsDelete && guardsDelete,
      'dry-run branch': respectsDryRun,
      'operator feedback': actionableOutput,
      'input validation': validatesInput
    });
  },

  /**
   * Maintainable Code: Simple Made Easy / Decoupling I/O from Logic
   */
  pure_core_imperative_shell(output) {
    const text = String(output || '');

    // Anti-pattern: database queries or HTTP calls inside calculate function
    // Approximate declaration boundaries; this is not a JavaScript parser.
    const calculations = text.match(/function\s+calculate[\s\S]*?(?=\n\s*(?:export\s+)?(?:async\s+)?function\s+|$)/gi) || [];
    const entanglesIO = calculations.some(body => /(?:db\.|\.query\(|fetch\(|axios\.|\.execute\()/i.test(body));

    if (entanglesIO) {
      return {
        pass: false,
        score: 0,
        reason:
          'Coupling defect: embeds database/network I/O directly inside the business calculation logic.'
      };
    }

    // Separates pure computation from I/O or state
    const isolatesCalculation =
      /(?:pure\s+function|decouple|separate|pure\s+core|imperative\s+shell|deterministic|testable\s+without\s+mock)/i.test(
        text
      ) ||
      /(?:calculateTotal|calculateDiscount|calculateOrder)\s*\(\s*(?:order|items)/i.test(
        text
      );

    const allowsPureTesting =
      /(?:test|spec|expect|assert)/i.test(text) ||
      /calculateTotal\(/i.test(text);

    if (!isolatesCalculation) {
      return {
        pass: false,
        score: 0,
        reason:
          'Fails to separate pure calculation decisions from external I/O and mutable state.'
      };
    }

    return checked({ 'calculation separated from I/O': isolatesCalculation && !entanglesIO, 'isolated testing example': allowsPureTesting });
  },

  /**
   * Release Engineering (Factor 5): Safe Rolling Migrations
   */
  rolling_migration(output) {
    const text = String(output || '');

    // Anti-pattern: single-step column rename on live rolling database
    const immediateRename =
      /ALTER\s+TABLE\s+\w+\s+RENAME\s+COLUMN\s+customer_name\s+TO\s+full_name\s*;/i.test(
        text
      ) &&
      !/(?:expand[- ]contract|multi[- ]step|two[- ]phase|backward|rolling|both\s+columns)/i.test(
        text
      );

    if (immediateRename) {
      return {
        pass: false,
        score: 0,
        reason:
          'Production outage risk: immediate column rename breaks in-flight queries and old version instances during rolling deploy.'
      };
    }

    // Accounts for coexistence of old and new app versions
    const acknowledgesCoexistence =
      /(?:coexist|rolling\s+(?:deploy|update)|zero[- ]downtime|both\s+versions|old\s+and\s+new)/i.test(
        text
      );

    // Multi-phase expand and contract
    const multiPhase =
      /(?:expand[- ]and[- ]contract|expand[- ]contract|two[- ]phase|multi[- ]step|phase\s+1|step\s+1|add\s+column[\s\S]*?backfill[\s\S]*?drop)/i.test(
        text
      );

    // Delays dropping old column
    const delaysDestructiveDrop =
      /(?:drop[\s\S]*?(?:later|next\s+release|after\s+(?:old|deploy)|decommissioned)|(?:subsequent|later)[\s\S]*?drop|delay\s+destructive)/i.test(
        text
      );

    if (!acknowledgesCoexistence) {
      return {
        pass: false,
        score: 0,
        reason:
          'Fails to account for old and new application instances running concurrently during deployment.'
      };
    }

    if (!multiPhase) {
      return {
        pass: false,
        score: 0,
        reason:
          'Must use an expand-and-contract migration strategy to ensure continuous schema compatibility.'
      };
    }

    return checked({
      'coexisting application versions': acknowledgesCoexistence,
      'phased schema migration': multiPhase,
      'destructive change deferred': delaysDestructiveDrop
    });
  },

  /**
   * Review Judgment & Factor 7: Sound Adaptation vs Dogmatic Defect
   */
  serverless_adaptation_review(output) {
    const text = String(output || '');

    // Anti-pattern: agrees with the dogmatic claim and demands adding Express / port binding
    const dogmaticPortDemand =
      /(?:reviewer\s+is\s+correct|violates\s+factor\s+7|must\s+(?:bind|add)\s+(?:a\s+)?port|add\s+express|listen\(\d+\))/i.test(
        text
      ) &&
      !/(?:sound\s+adaptation|managed\s+function|invocation\s+contract|disagree|incorrect)/i.test(
        text
      );

    if (dogmaticPortDemand) {
      return {
        pass: false,
        score: 0,
        reason:
          'False finding: dogmatically flags a serverless function for not binding a port, ignoring platform invocation contracts.'
      };
    }

    // Recognizes sound adaptation
    const recognizesSoundAdaptation =
      /(?:sound\s+adaptation|invocation\s+contract|handler\s+contract|not\s+a\s+defect|incorrect|disagree|reject\s+(?:the\s+)?claim)/i.test(
        text
      );

    // Formats findings cleanly or catches real defect (like unhandled JSON.parse)
    const catchesRealIssue =
      /(?:JSON\.parse|syntax\s+error|malformed|try[- ]catch|error\s+handling|location\s*→|consequence|fix)/i.test(
        text
      );

    if (!recognizesSoundAdaptation) {
      return {
        pass: false,
        score: 0,
        reason:
          'Failed to reject the dogmatic review claim; must recognize serverless invocation as a valid 12-factor adaptation.'
      };
    }

    return checked({
      'reject dogmatic port claim': recognizesSoundAdaptation,
      'identify concrete defect': catchesRealIssue,
      'location, consequence, and fix': /(?:location|JSON\.parse)/i.test(text) && /(?:consequence|throws|500|failed invocation)/i.test(text) && /(?:fix|try\s*\/\s*catch|400)/i.test(text)
    });
  },

  /**
   * Factor 13: Convention Over Configuration
   */
  convention_over_configuration(output) {
    const text = String(output || '');

    // Anti-pattern: endorses creating redundant custom dynamic reflection / route registries
    const endorsesBespokeWiring =
      /(?:great\s+idea|recommend\s+the\s+xml\s+registry|build\s+the\s+reflection\s+router|custom\s+registry\s+is\s+better)/i.test(
        text
      );

    if (endorsesBespokeWiring) {
      return {
        pass: false,
        score: 0,
        reason:
          'Anti-pattern: endorses redundant custom registration infrastructure instead of framework conventions.'
      };
    }

    // Recommends standard conventions
    const usesConvention =
      /(?:convention\s+over\s+configuration|established\s+convention|file[- ]based\s+routing|standard\s+(?:directory|route|controller)|waterbed|redundant|cognitive\s+overhead)/i.test(
        text
      );

    // Explains that explicit overrides are for real exceptions
    const explainsExceptions =
      /(?:override|exception|simpler|unnecessary|framework\s+discovery)/i.test(
        text
      );

    if (!usesConvention) {
      return {
        pass: false,
        score: 0,
        reason:
          'Fails to apply Factor 13 (Convention over Configuration); misses standard placement and discovery.'
      };
    }

    return checked({ 'established framework convention': usesConvention, 'exceptions or wiring cost explained': explainsExceptions });
  }
};

/**
 * Universal grader function compatible with promptfoo and standalone scripts.
 * @param {string} output - The LLM or agent output text
 * @param {object} context - Context object containing vars.probe or test details
 */
module.exports = function grade(output, context) {
  const probe =
    (context && context.vars && context.vars.probe) ||
    (context && context.probe);
  if (!probe) {
    return {
      pass: false,
      score: 0,
      reason: 'No probe specified in context.'
    };
  }

  const grader = GRADERS[probe];
  if (!Object.hasOwn(GRADERS, probe)) {
    return {
      pass: false,
      score: 0,
      reason: `Unknown probe '${probe}'.`
    };
  }

  const result = grader(output);
  return { method: 'heuristic', checks: [{ criterion: result.reason, pass: result.pass }], ...result };
};

module.exports.GRADERS = GRADERS;
