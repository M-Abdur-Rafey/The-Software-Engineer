# Routing & dependency order

| Step | Agent | Consumes | Produces |
|------|-------|----------|----------|
| 0 | [[requirements]] | task + signals + prior SRE feedback | RequirementsOutput (user stories + spec) |
| 1 | [[database]] | RequirementsOutput | DatabaseOutput |
| 2 | [[backend]] | RequirementsOutput, DatabaseOutput | BackendOutput |
| 3a | [[frontend]] | RequirementsOutput, BackendOutput | FrontendOutput |
| 3b | [[testing]] | RequirementsOutput, BackendOutput | Postman collection |
| 3c | [[calls]] | RequirementsOutput, BackendOutput, DatabaseOutput | CallsOutput |
| 4 | [[ponytail]] | code outputs | simplified files + review |
| 4b | Verify (`shared/lib/verify.js`) | changed files, the session's Postman collection | the project's own build/lint/test results |
| 5 | [[mcpbridge]] | all outputs | contract validation |
| 6 | [[gitdevops]] | validated outputs | security scan, then branch + commit |
| 7 | [[sre]] | all outputs + project logs | diagnostics + outcome metrics + feedback |

Steps 3a–3c run in parallel. Ponytail (step 4) trims the generated code, then Verify
runs the project's own checks (up to 2 fix rounds), then the bridge re-validates contracts.

**What stops the run before the commit:** a domain that returns `failed` (database blocking
violations, backend data-access or spec violations the reviewer could not fix, frontend
security errors, calls compliance failures), Verify still failing, bridge violations, and
the security scan in step 6. SRE (step 7) is advisory — it never blocks — and its feedback
is read by requirements next session.
