/**
 * Paired test fixtures for 12-factor-craftsmanship evaluation.
 * For each probe, provides:
 * - failing: typical naive LLM output exhibiting real production failure patterns
 * - passing: craftsmanship-compliant output adhering to 12-factor & craftsmanship principles
 */

module.exports = {
  retry_idempotency: {
    failing: `
async function chargeCustomer(amount: number, currency: string) {
  let attempts = 0;
  while (true) {
    try {
      attempts++;
      // Bug: Fresh idempotency key generated per attempt!
      const idempotencyKey = crypto.randomUUID();
      const response = await fetch("https://api.paymentgateway.com/v1/charges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({ amount, currency })
      });
      return await response.json();
    } catch (err) {
      // Immediate retry, unbounded attempts
      console.log("Retrying payment...");
    }
  }
}
`,
    passing: `
interface ChargeOptions {
  idempotencyKey?: string;
  maxAttempts?: number;
}

async function chargeCustomer(
  amount: number,
  currency: string,
  options: ChargeOptions = {}
) {
  // Safe: Re-use the SAME logical idempotency key across all retry attempts
  const idempotencyKey = options.idempotencyKey || crypto.randomUUID();
  const maxAttempts = options.maxAttempts ?? 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await fetch("https://api.paymentgateway.com/v1/charges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({ amount, currency })
      });

      if (response.ok) {
        return await response.json();
      }

      // Retry only transient failures (5xx, 429), not client errors (400, 401)
      if (response.status < 500 && response.status !== 429) {
        throw new Error(\`Non-retryable payment error: \${response.status}\`);
      }
    } catch (err: any) {
      if (attempt >= maxAttempts) throw err;
    }

    // Exponential backoff with jitter
    const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 200, 10000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
`
  },

  state_variants: {
    failing: `
interface ExportJob {
  id: string;
  isQueued: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  progress: number;
  downloadUrl?: string;
  error?: string;
}

function updateJob(job: ExportJob) {
  // Allows invalid combinations, e.g. isProcessing: true AND isFailed: true
  job.isProcessing = true;
  job.progress = 50;
}
`,
    passing: `
// Mutually exclusive states modeled with discriminated union variants
export type ExportJob =
  | { status: 'queued'; id: string; requestedAt: Date }
  | { status: 'processing'; id: string; progress: number; startedAt: Date }
  | { status: 'completed'; id: string; downloadUrl: string; completedAt: Date }
  | { status: 'failed'; id: string; error: string; failedAt: Date };

export function updateProgress(job: ExportJob, progress: number): ExportJob {
  if (job.status !== 'processing') {
    throw new Error('Cannot update progress for job that is not processing');
  }
  return { ...job, progress: Math.min(100, Math.max(0, progress)) };
}
`
  },

  wrong_abstraction: {
    failing: `
You should definitely merge these two functions immediately!
Always follow DRY (Don't Repeat Yourself). Duplicating the country and postal code checks in both places is code smell.
Here is the single generic helper you should replace both with:

\`\`\`typescript
export function validateAddress(addr: { postalCode?: string; country?: string }) {
  if (!addr.postalCode) throw new Error("Missing postal code");
  if (!addr.country) throw new Error("Missing country");
}
\`\`\`
`,
    passing: `
I recommend **keeping them separate**.

While the syntax looks identical today, billing address validation and shipping address validation belong to different domain responsibilities and have separate lifecycles:
- Billing address validation is governed by payment gateway fraud checks and sales tax calculation requirements.
- Shipping address validation is governed by postal carrier formatting, delivery zones, and customs requirements.

As Sandi Metz observed in *The Wrong Abstraction*, premature deduplication based on accidental syntax similarity causes future changes to add boolean flags and awkward conditionals (e.g. \`if (isShipping) checkCustomsCode()\`). Keep the separate functions until evidence demonstrates they truly share the exact same business policy.
`
  },

  disposability_shutdown: {
    failing: `
async function startWorker() {
  const queue = new QueueClient();
  console.log("Worker started");
  while (true) {
    const job = await queue.pop();
    if (job) {
      await processJob(job);
    }
  }
}
startWorker();
`,
    passing: `
async function startWorker() {
  const queue = new QueueClient();
  let isShuttingDown = false;
  let activeJobs = 0;

  async function shutdown(signal: string) {
    console.log(\`Received \${signal}. Starting graceful shutdown...\`);
    isShuttingDown = true;

    const deadline = setTimeout(() => {
      console.error("Grace period expired, forcing exit.");
      process.exit(1);
    }, 15000);

    while (activeJobs > 0) {
      await new Promise(r => setTimeout(r, 200));
    }
    clearTimeout(deadline);
    console.log("All in-flight jobs completed. Exiting cleanly.");
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  while (!isShuttingDown) {
    const job = await queue.pop({ timeoutMs: 2000 });
    if (job && !isShuttingDown) {
      activeJobs++;
      processJob(job).finally(() => { activeJobs--; });
    }
  }
}
startWorker();
`
  },

  config_telemetry_safety: {
    failing: `
import fs from 'fs';

const config = {
  dbUrl: process.env.DATABASE_URL || "postgres://admin:supersecret@localhost:5432/app",
  apiKey: process.env.API_KEY || "fallback_test_secret_12345"
};

export function loggerMiddleware(req, res, next) {
  // Leaking raw request headers including Authorization and Cookie
  fs.appendFileSync("server.log", JSON.stringify({
    url: req.url,
    headers: req.headers
  }) + "\\n");
  next();
}
`,
    passing: `
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  dbUrl: process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL is required'); })(),
  apiKey: process.env.API_KEY || (() => { throw new Error('API_KEY is required'); })()
};

export function requestLogger(req: any, res: any, next: any) {
  const startTime = Date.now();
  res.on('finish', () => {
    const logEvent = {
      level: 'info',
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startTime,
      // Scrub sensitive headers; omit authorization and cookie
      clientIp: req.ip
    };
    process.stdout.write(JSON.stringify(logEvent) + '\\n');
  });
  next();
}
`
  },

  dwim_dry_run: {
    failing: `
import os, sys, shutil

def prune_backups(days, dry_run=False):
  # Bug: deletes files even when dry_run is True!
  for path in os.listdir("/backups"):
    full_path = os.path.join("/backups", path)
    shutil.rmtree(full_path)
    if dry_run:
      print("Ran in dry run mode")
`,
    passing: `
import os, sys, time, shutil, argparse

def prune_backups(days: int, dry_run: bool = False):
  if days <= 0:
    raise ValueError("Retention days must be a positive integer greater than 0.")

  now = time.time()
  cutoff = now - (days * 86400)
  backup_dir = "/backups"

  for entry in os.listdir(backup_dir):
    path = os.path.join(backup_dir, entry)
    if os.path.isdir(path) and os.path.getmtime(path) < cutoff:
      if dry_run:
        print(f"[dry-run] Would delete expired backup directory: {path}")
      else:
        print(f"Pruning backup directory: {path}")
        shutil.rmtree(path)
`
  },

  pure_core_imperative_shell: {
    failing: `
async function calculateOrderTotal(orderId: string) {
  const order = await db.query("SELECT * FROM orders WHERE id = $1", [orderId]);
  let total = 0;
  for (const item of order.items) {
    const coupon = await db.query("SELECT * FROM coupons WHERE code = $1", [item.code]);
    const taxRate = await fetch("https://taxapi.internal/rate").then(r => r.json());
    total += item.price * (1 - coupon.discount) * (1 + taxRate.rate);
  }
  await db.query("UPDATE orders SET total = $1 WHERE id = $2", [total, orderId]);
  return total;
}
`,
    passing: `
// Pure business logic: separate computation from database and network I/O
export interface OrderItem { price: number; quantity: number; discountPercent?: number; }
export interface CalculationResult { subtotal: number; totalDiscount: number; taxAmount: number; finalTotal: number; }

export function calculateOrderTotals(
  items: OrderItem[],
  taxRate: number
): CalculationResult {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDiscount = items.reduce(
    (sum, item) => sum + (item.price * item.quantity * ((item.discountPercent || 0) / 100)),
    0
  );
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const taxAmount = Math.round(taxableAmount * taxRate);
  const finalTotal = taxableAmount + taxAmount;

  return { subtotal, totalDiscount, taxAmount, finalTotal };
}
`
  },

  rolling_migration: {
    failing: `
To rename the column, run this migration SQL:
\`\`\`sql
ALTER TABLE users RENAME COLUMN customer_name TO full_name;
\`\`\`
Then update your application code to read full_name and deploy it.
`,
    passing: `
In a zero-downtime rolling deployment, old and new application versions coexist concurrently. An instantaneous column rename breaks in-flight queries on the old instances.

Use a multi-phase expand-and-contract migration:

1. **Expand:** Add the new column \`full_name\` as nullable:
   \`ALTER TABLE users ADD COLUMN full_name TEXT;\`
2. **Dual-write / read-fallback:** Deploy application version that writes to both columns and reads \`full_name\` with fallback to \`customer_name\`.
3. **Backfill:** Run an admin task or migration script to backfill historical rows:
   \`UPDATE users SET full_name = customer_name WHERE full_name IS NULL;\`
4. **Enforce & contract:** Update application to use only \`full_name\`.
5. **Retire:** In a subsequent deployment after old versions are decommissioned, safely drop the old \`customer_name\` column:
   \`ALTER TABLE users DROP COLUMN customer_name;\`
`
  },

  serverless_adaptation_review: {
    failing: `
I agree with the reviewer. The code violates Factor 7 (Port Binding) of the Twelve-Factor App.
A Twelve-Factor service must bind its own port using app.listen().
You must install Express, create an HTTP server, and bind to process.env.PORT.
`,
    passing: `
### Review Verdict: Disagree with defect claim (Sound adaptation)

The reviewer's claim is incorrect:
- **Port binding adaptation:** Managed functions (such as AWS Lambda) follow the platform's invocation handler contract rather than self-hosted port binding. Introducing an HTTP server or port listener would add unnecessary latency and violates the platform contract.

### Legitimate Review Finding:
- **Location:** \`const body = JSON.parse(event.body || '{}');\`
- **Concrete consequence:** If a client sends an empty string or malformed JSON, \`JSON.parse\` throws an unhandled SyntaxError, returning an unexpected 500 error instead of a 400 Bad Request.
- **Proportionate fix:** Wrap \`JSON.parse\` in a safe helper or try/catch block and return an actionable 400 response on invalid JSON.
`
  },

  convention_over_configuration: {
    failing: `
Great idea! We should build a centralized routing XML/JSON schema and an automatic reflection registry.
Every controller can register its path and methods in \`config/routes.json\` and dynamically load the handler classes at runtime.
`,
    passing: `
I strongly advise against creating a bespoke reflection registry or XML configuration map.

Modern frameworks already follow **Factor 13: Convention over configuration**.
For example:
- In Next.js App Router, placing a handler at \`app/api/v1/projects/[id]/route.ts\` automatically discovers and wires the \`GET\` endpoint.
- In Rails or NestJS, standard controller decorator and naming conventions route the request without custom wiring.

As warned by the *Waterbed theory of complexity*, adding a custom dynamic registration layer merely shifts and amplifies cognitive load onto every future maintainer. Rely on the framework's established conventions, reserving explicit overrides strictly for verified edge cases.
`
  }
};
