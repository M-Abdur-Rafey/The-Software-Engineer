# Routing & dependency order

| Step | Agent | Consumes | Produces |
|------|-------|----------|----------|
| 1 | [[database]] | task | DatabaseOutput |
| 2 | [[backend]] | DatabaseOutput | BackendOutput |
| 3a | [[frontend]] | BackendOutput | FrontendOutput |
| 3b | [[testing]] | BackendOutput | Postman collection |
| 3c | [[calls]] | BackendOutput, DatabaseOutput | CallsOutput |
| 4 | [[ponytail]] | code outputs | simplified files + review |
| 5 | [[mcpbridge]] | all outputs | contract validation |
| 6 | [[gitdevops]] | validated outputs | branch + commit |

Steps 3a–3c run in parallel. Ponytail (step 4) trims the generated code before the
bridge re-validates contracts. The commit only happens if step 5 passes.
