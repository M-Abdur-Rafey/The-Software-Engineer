# Calls Agent

> Part of the Software Engineer orchestration graph. Open the `agents/` folder as a single Obsidian vault to follow the links below.

**Role:** Builds inbound IVR / outbound campaigns, webhooks, voice scripts, compliance.
**Orchestrated by:** [[orchestrator]]

## Talks to
- **Reads from (upstream):** [[backend]] · [[database]]
- **Hands off to (downstream):** — (leaf)
- **Validated by:** [[mcpbridge]]

## Internal pipeline (sub-agents)
[[calls-author]] → [[calls-compliance]]

**Checklists:** [[flow-designer]] · [[telephony-integrator]] · [[voice-script-writer]] · [[compliance-checker]]

## Knowledge
Accumulated decisions and patterns live in this vault (see `INDEX.md`) and in `knowledge.db`.
