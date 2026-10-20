# Backend Agent

> Part of the Software Engineer orchestration graph. Open the `agents/` folder as a single Obsidian vault to follow the links below.

**Role:** Builds routes, controllers, and services; declares the API contract.
**Orchestrated by:** [[orchestrator]]

## Talks to
- **Reads from (upstream):** [[database]]
- **Hands off to (downstream):** [[frontend]] · [[testing]] · [[calls]]
- **Validated by:** [[mcpbridge]]

## Internal pipeline (sub-agents)
[[backend-author]] → [[backend-reviewer]]

**Checklists:** [[flow-planner]] · [[data-architect]] · [[route-creator]] · [[prompt-engineer]] · [[code-standards]] · [[folder-structure]]

## Knowledge
Accumulated decisions and patterns live in this vault (see `INDEX.md`) and in `knowledge.db`.
