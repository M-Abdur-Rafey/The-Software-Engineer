# SRE Agent

> Part of the Software Engineer orchestration graph. Open the `agents/` folder as a single Obsidian vault to follow the links below.

**Role:** Operate phase — post-session health checks, log/root-cause diagnostics, IaC review, and outcome metrics (system health, coverage, violations — never lines of code). Its feedback closes the loop into the next requirements cycle.
**Orchestrated by:** [[orchestrator]]

## Talks to
- **Reads from (upstream):** [[gitdevops]]
- **Hands off to (downstream):** [[requirements]]
- **Validated by:** — none

## Internal pipeline (sub-agents)
[[log-analyst]] → [[incident-diagnostician]] → [[metrics-reporter]]

## Knowledge
Accumulated decisions and patterns live in this vault (see `INDEX.md`) and in `knowledge.db`.
