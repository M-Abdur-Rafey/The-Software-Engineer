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
| 5 | [[mcpbridge]] | all outputs | contract validation |
| 6 | [[gitdevops]] | validated outputs | branch + commit |
| 7 | [[sre]] | all outputs + project logs | diagnostics + outcome metrics + feedback |

Steps 3a–3c run in parallel. Ponytail (step 4) trims the generated code before the
bridge re-validates contracts. The commit only happens if step 5 passes. SRE (step 7)
is advisory — it never blocks — and its feedback is read by requirements next session.
