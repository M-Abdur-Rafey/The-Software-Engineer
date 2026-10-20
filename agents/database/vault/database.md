# Database Agent

> Part of the Software Engineer orchestration graph. Open the `agents/` folder as a single Obsidian vault to follow the links below.

**Role:** Designs tables and migrations, validates schema, optimizes queries.
**Orchestrated by:** [[orchestrator]]

## Talks to
- **Reads from (upstream):** — (entry point)
- **Hands off to (downstream):** [[backend]] · [[calls]]
- **Validated by:** [[mcpbridge]]

## Internal pipeline (sub-agents)
[[database-author]] → [[database-reviewer]]

**Checklists:** [[table-creator]] · [[schema-validator]] · [[query-optimizer]]

## Knowledge
Accumulated decisions and patterns live in this vault (see `INDEX.md`) and in `knowledge.db`.
