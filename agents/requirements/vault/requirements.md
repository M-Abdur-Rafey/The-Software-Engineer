# Requirements Agent

> Part of the Software Engineer orchestration graph. Open the `agents/` folder as a single Obsidian vault to follow the links below.

**Role:** Spec-driven front of the lifecycle — synthesizes signals (task text, logs, bug reports, user feedback, SRE diagnostics) into user stories and a specification every domain agent follows.
**Orchestrated by:** [[orchestrator]]

## Talks to
- **Reads from (upstream):** [[sre]]
- **Hands off to (downstream):** [[database]] · [[backend]] · [[frontend]] · [[testing]] · [[calls]]
- **Validated by:** [[mcpbridge]]

## Internal pipeline (sub-agents)
[[signal-analyst]] → [[story-writer]] → [[spec-author]]

## Knowledge
Accumulated decisions and patterns live in this vault (see `INDEX.md`) and in `knowledge.db`.
