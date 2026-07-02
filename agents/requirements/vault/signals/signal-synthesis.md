# Signal Synthesis

Requirements are derived from signals, not only from the raw task text. Before drafting
the spec, gather and synthesize every available source:

| Source | Where to look | What it yields |
|--------|--------------|----------------|
| task-text | the user's request | primary intent |
| sre-feedback | `agents/sre/vault/diagnostics/` + sre decisions | what failed in production last cycle |
| logs / bug-reports | project's logs, issue tracker exports in the repo | root causes, real failure modes |
| user-feedback | surveys, reviews, support exports found in the project | behaviour bottlenecks, usage patterns |
| codebase | onboarding summary | current architecture and constraints |

## Root-cause discipline
When a signal is a symptom ("checkout is slow"), record symptom → cause → evidence.
A spec item addressing a symptom without a cause is a guess — flag it as an open question.
