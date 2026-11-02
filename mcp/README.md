# Software Engineer — MCP server (cross-IDE)

This MCP server exposes the multi-agent orchestrator to **any editor that speaks MCP**
(Cursor, Windsurf, VS Code, Claude Code, Cline, …) — not just Claude Code.

## Tools

| Tool | What it does |
|------|--------------|
| `software_engineer_health` | Reports knowledge-base/contract status and which model backend is available. |
| `software_engineer_classify` | Classifies a task into the domains it touches (database/backend/frontend/calls). |
| `software_engineer_orchestrate` | Plans the task across the database, backend, frontend and calls agents in dependency order. **Safe by default** (returns a plan); pass `apply: true` to write the generated files into `projectPath`, which must be a git repository. The files are kept only if the pre-commit security scan passes; otherwise they are rolled back and the findings are returned. |

## How it gets a model

The server never bundles its own keys. It resolves a model in this order:

1. **MCP sampling** — the host IDE's own model. No API key. Works wherever the host supports
   `sampling` (Claude Code does; Cursor support is partial/evolving).
2. **`ANTHROPIC_API_KEY`** — direct Anthropic API (model via `SE_MAIN_MODEL` / `SE_SUB_MODEL`).
3. **`OPENAI_API_KEY`** — direct OpenAI API (model via `SE_OPENAI_MAIN_MODEL` / `SE_OPENAI_SUB_MODEL`).

If none is available, tools return a clear error explaining what to set. `main` = orchestrator/
reasoning tier; `sub` = cheaper sub-agent tier.

## Prerequisites

Run the one-time engine setup so the knowledge bases exist (the Claude Code skill does this for
you on first run; for standalone MCP use, do it manually):

```bash
git clone https://github.com/MARafey/The-Software-Engineer ~/.agents
cd ~/.agents && npm install && npm run init
```

## Editor configuration

Point the editor at the server with `node ~/.agents/mcp/server.mjs` (or `npx the-software-engineer-mcp`
once published to npm). On Windows use the full path, e.g. `C:/Users/you/.agents/mcp/server.mjs`.

### Cursor — `~/.cursor/mcp.json`
```json
{
  "mcpServers": {
    "software-engineer": {
      "command": "node",
      "args": ["~/.agents/mcp/server.mjs"],
      "env": { "ANTHROPIC_API_KEY": "sk-ant-..." }
    }
  }
}
```
(Omit `env` if your Cursor build supports MCP sampling.)

### Windsurf — `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "software-engineer": { "command": "node", "args": ["~/.agents/mcp/server.mjs"] }
  }
}
```

### VS Code (MCP) — `.vscode/mcp.json`
```json
{
  "servers": {
    "software-engineer": { "command": "node", "args": ["~/.agents/mcp/server.mjs"] }
  }
}
```

### Claude Code
```
claude mcp add software-engineer -- node ~/.agents/mcp/server.mjs
```
> In Claude Code you usually want the **plugin** instead (`/plugin install software-engineer@software-engineer`),
> which gives you the `/software-engineer` slash command. The MCP server is mainly for other editors.

## Scope / status

This is the v1 cross-IDE path. It plans and (with `apply: true`) writes the generated files for each
domain, reusing the same session log and per-agent vault knowledge as the Claude Code pipeline.

What runs here: the database, backend, frontend and calls agents, and the same pre-commit security scan
(`shared/lib/scan.js`) as the Claude Code pipeline, before any file is kept. Every result lists what did
**not** run under `notRun`: the requirements spec, Postman test generation, ponytail, the Verify phase,
the contract bridge, the git commit and SRE. Those exist only in the Claude Code workflow; bringing them
into the MCP path is the next step.
