# Orchestrator

The top-level coordinator. Routes each task through the domain agents in dependency order and passes typed JSON contracts between them.

## Dependency order
[[database]] → [[backend]] → ( [[frontend]] · [[testing]] · [[calls]] ) → [[ponytail]] → [[mcpbridge]] → [[gitdevops]]

## Domain agents
[[database]] · [[backend]] · [[frontend]] · [[testing]] · [[calls]] · [[ponytail]] · [[mcpbridge]] · [[gitdevops]]

## How they communicate
- **Knowledge (persistent):** each agent's vault + `knowledge.db` — this connected graph.
- **Coordination (live):** typed JSON contracts passed per task + `shared/orchestrator.db` session log.
- **Per-task history:** a session note is written to `sessions/` in real time (git-ignored — personal).
