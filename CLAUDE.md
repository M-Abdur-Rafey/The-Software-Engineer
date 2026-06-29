# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This directory **is** multi-agent software-engineering orchestration infrastructure — not an app to ship. Installed it lives at `~/.agents`; in development it is this repo (`MARafey/The-Software-Engineer`, default branch **master**). It ships two ways:

- **Claude Code plugin** — `.claude-plugin/{plugin,marketplace}.json` + `skills/software-engineer/SKILL.md` provide the `/software-engineer` slash command. The skill clones the repo to `~/.agents` on first run, then drives the Workflow scripts.
- **Cross-IDE MCP server** — `mcp/server.mjs` exposes the orchestrator to any MCP editor (Cursor/Windsurf/VS Code). See `mcp/README.md`.

Given a task + target project path, the orchestrator routes work through domain agents in dependency order, each grounded by its own SQLite `knowledge.db` + Obsidian vault.

## Commands

Run from the repo root (`~/.agents` once installed):

```
npm install              # deps incl. native better-sqlite3 + @modelcontextprotocol/sdk
npm run init             # bootstrap + seed + verify — REQUIRED after changing agents/contracts/seed notes
npm run verify           # health check, 42 checks (same as `/software-engineer test`)
npm test                 # verify + MCP protocol test
npm run test:mcp         # MCP stdio protocol test only (tests/mcp-protocol.mjs)
npm run mcp              # run the MCP server on stdio
node init/bootstrap.js   # create DBs + generate shared/contracts/*.schema.json
node init/seed-vaults.js # write baseline vault notes + the connected graph
```

There is no build step and no linter. `node shared/lib/db-cli.js <cmd> ...` is the data CLI the workflows call (`init-session`, `check-onboarded`, `save-decision`, `get-decisions`, `update-session-status`, …).

Invoke the orchestrator directly via the Workflow tool (always pass `agentsDir`):

```
Workflow({ scriptPath: '~/.agents/.claude/workflows/orchestrate.js',
  args: { task: "...", projectPath: "C:/abs/path", agentsDir: "~/.agents" } })
```

Individual domain workflows (`backend.js`, `frontend.js`, `database.js`, `testing.js`, `calls.js`, `gitdevops.js`, `mcpbridge.js`, `onboard.js`) can be invoked the same way.

## Architecture

Dependency order (always enforced):

```
[onboard — first use only] → database → backend → frontend + testing + calls (parallel) → mcpbridge → gitdevops
```

- Frontend/testing/calls parallelize after backend: frontend needs `BackendOutput.contractExports[]`, testing needs `BackendOutput.routes[]`, calls needs the backend + database outputs.
- **mcpbridge** validates the cross-domain JSON contracts and gates the commit; **gitdevops** runs last and commits only if the bridge passes its 10-point security scan.

Two communication layers — keep them distinct:

- **Knowledge (persistent):** per-agent `agents/<name>/vault/` (Obsidian markdown) + `agents/<name>/knowledge.db`. Vaults are cross-linked into one graph via `[[wikilinks]]` — open the `agents/` folder as a single Obsidian vault to navigate it.
- **Coordination (runtime):** typed JSON contracts (`shared/contracts/*.schema.json`) passed between workflows, plus the `shared/orchestrator.db` session log. Agents do **not** message each other through vault links.

Knowledge access is scoped by `shared/lib/acl.js`: agents call `db-cli --as <agent>`, which enforces write-own-only and read-own+upstream against the policy. `db-cli query` is **read-only** (rejects non-SELECT/multi-statement) and all DB output is **capped** via `shared/lib/truncate.js` so large result sets can't balloon an agent's input tokens. This is a guardrail (a caller could still spoof `--as`), not OS-level isolation.

Agents: an **orchestrator** (coordinator — decomposes, sequences, validates; never writes code) plus domain agents database/backend/frontend/testing/calls/mcpbridge/gitdevops. Each domain runs internal sub-agents — e.g. backend `flow-planner → data-architect → route-creator → prompt-engineer → code-standards → folder-structure`; frontend includes `layout-architect / positioning-specialist / contrast-specialist` for complex CSS. The backend **data-architect** enforces a single shared DB pool, disciplined AI queries (read-only, `LIMIT` + filters, no `SELECT *`), and caching.

## Editing Workflow scripts (`.claude/workflows/*.js`) — read first

These run in the Claude Code **Workflow tool sandbox**, not plain Node:

- Structure is `export const meta = {...}` followed by a body executed inside an async wrapper, so top-level `await` and top-level `return` are valid. `node --check file.js` will wrongly flag the `return`/`export`; to syntax-check, strip `export ` and wrap the body in `(async()=>{ … })()`.
- The sandbox has **no fs/Node APIs**, and `Date.now()` / `Math.random()` / argless `new Date()` throw. Do file/DB side effects by having an `agent()` run a shell command (db-cli) or use the Write tool inside the agent prompt.
- **Never hardcode the install path.** Each workflow uses `const AGENTS_DIR = (args && args.agentsDir) || '<dev fallback>'`, and `orchestrate.js` threads `agentsDir` into every sub-workflow's args.
- Model tiers via `agent(prompt, { model })`: mechanical command-runners use `'haiku'`, the 3D phase uses opus, everything else inherits the host model.

## Editing the init pipeline — keep it in sync

`bootstrap.js`, `seed-vaults.js`, and `verify.js` each carry an `AGENT_NAMES` list and must agree. Contracts are generated from the `CONTRACTS` object in `bootstrap.js`; `verify.js` has a matching `CONTRACT_NAMES`. To add an agent or contract: update those lists, add vault dirs to bootstrap `DIRS`, seed notes in `seed-vaults.js`, then run `npm run init` and confirm `verify` stays green. The connected vault graph (per-agent home notes, sub-agent stubs, orchestrator hub) is generated data-driven from the `GRAPH` object in `seed-vaults.js`.

## ESM vs CommonJS

`shared/lib/*` and `init/*` are CommonJS (`require`). `mcp/*.mjs` are ES modules (`import` the SDK; `createRequire` to load the CJS `shared/lib`). The MCP model layer (`mcp/lib/model.mjs`) resolves a model via MCP sampling → `ANTHROPIC_API_KEY` → `OPENAI_API_KEY`; no keys are bundled.

## Privacy / git

`.gitignore` keeps personal data local: all `knowledge.db`, `shared/orchestrator.db`, and runtime vault output (`vault/projects/`, testing collections/reports, bridge contracts, scan-results, orchestrator sessions). Only baseline seed vault notes ship to other users.

Windows/Git Bash caution: shell commands containing code-like tokens occasionally drop stray empty files (e.g. `Part`, `0)`, `f.severity`) into the repo root — check `git status` before `git add -A` so they aren't committed.
