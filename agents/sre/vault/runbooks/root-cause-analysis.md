# Root-Cause Analysis Runbook

Given logs, stack traces, or bug reports, diagnose — don't just describe.

## Method
1. **Symptom**: the observable failure (error message, status code, user report).
2. **Trace**: follow the stack trace / log timeline to the first point where state went wrong.
3. **Root cause**: the code or config decision that allowed it — not the line that threw.
4. **Evidence**: the exact log lines / trace frames supporting the diagnosis.
5. **Suggested fix**: smallest change that removes the cause (not the symptom).

## Severity
- **critical** — data loss, security exposure, total outage
- **major** — a feature is broken for a class of users
- **minor** — degraded UX, noisy logs, slow path

Every diagnostic feeds back into the next requirements cycle via `feedback[]`.
