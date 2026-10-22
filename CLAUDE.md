# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This directory **is** multi-agent software-engineering orchestration infrastructure — not an app to ship. Installed it lives at `~/.agents`; in development it is this repo (`MARafey/The-Software-Engineer`, default branch **master**). It ships two ways:

- **Claude Code plugin** — `.claude-plugin/{plugin,marketplace}.json` + `skills/software-engineer/SKILL.md` provide the `/software-engineer` slash command. The skill clones the repo to `~/.agents` on first run, then drives the Workflow scripts.
- **Cross-IDE MCP server** — `mcp/server.mjs` exposes the orchestrator to any MCP editor (Cursor/Windsurf/VS Code). See `mcp/README.md`. Outside Claude Code the model layer needs `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) in the editor's mcp.json env; `SE_MAIN_MODEL`/`SE_SUB_MODEL` override model choice.

The skill file (`skills/software-engineer/SKILL.md`) is also the plugin's shell layer: it owns install-path resolution, first-run auto-install, and the command routing table — adding a new `/software-engineer <command>` means editing that routing table, not just adding a workflow.

Given a task + target project path, the orchestrator routes work through domain agents in dependency order, each grounded by its own SQLite `knowledge.db` + Obsidian vault.

## Commands

Run from the repo root (`~/.agents` once installed):

```
npm install              # deps incl. native better-sqlite3 + @modelcontextprotocol/sdk
npm run init             # bootstrap + seed + verify — REQUIRED after changing agents/contracts/seed notes
npm run verify           # health check: DBs/tables, vault INDEX.md, contract schemas, shared lib, workflow hidden-char scan (same as `/software-engineer test`)
npm test                 # verify + MCP protocol test + sysdocs, uitest, persist, scan, projectmap, lessons, tune and verify tests
npm run test:mcp         # MCP stdio protocol test only (tests/mcp-protocol.mjs)
npm run test:sysdocs     # System Docs CLI end-to-end test only (tests/sysdocs.test.js, throwaway git repo)
npm run mcp              # run the MCP server on stdio
node init/bootstrap.js   # create DBs + generate shared/contracts/*.schema.json
node init/seed-vaults.js # write baseline vault notes + the connected graph
```

There is no build step and no linter. `node shared/lib/db-cli.js <cmd> ...` is the data CLI the workflows call (`init-session`, `check-onboarded`, `save-decision`, `get-feedback`, `update-session-status`, …). `decisions` rows carry no project column, so `get-decisions` would show every project's facts: no agent reads it for context (`verify` enforces this). Project facts come from the project map and the lesson library, and SRE feedback is read per project with `get-feedback`. The only decision writes left are the requirements agent's spec decisions and the SRE's feedback.

Invoke the orchestrator directly via the Workflow tool (always pass `agentsDir`):

```
Workflow({ scriptPath: '~/.agents/.claude/workflows/orchestrate.js',
  args: { task: "...", projectPath: "C:/abs/path", agentsDir: "~/.agents" } })
```

Individual domain workflows (`requirements.js`, `backend.js`, `frontend.js`, `database.js`, `testing.js`, `calls.js`, `ponytail.js`, `gitdevops.js`, `mcpbridge.js`, `sre.js`, `onboard.js`, `codegraph.js`, `curate.js`) can be invoked the same way.

`codegraph.js` sits outside the pipeline (driven by `/software-engineer graph` and `start` = onboard → codegraph): it builds a lean Obsidian graph of only entities that exist in the target project's code, capped per node type (`maxNodesPerType`, default 60), written to `agents/orchestrator/vault/projects/<name>/graph/` (git-ignored). The root `skill.md` is only a pointer to `skills/software-engineer/SKILL.md`.

**Project map** (`shared/lib/projectmap.js`, change 4 of `design/agent-consolidation.md`): one compact note per target project, at most 3000 characters (stack, layout, conventions, modules, routes, tables, run commands), at `agents/orchestrator/vault/projects/<name>/map.md` (git-ignored). Onboarding builds it: one `discover` agent, then the backend/frontend/database scans in parallel, skipping layers the project lacks (at most 4 agents); the map, the per-domain project notes, the decisions and the onboarded mark are persistOps. The skill reads the map (`projectmap.js show <projectPath>`) and passes it as `projectMap`; `orchestrate.js` hands it (or its path, `projectMapFile`) to every domain workflow except the bridge, and each prompt includes it through `projectMapBrief`. After a committed session, orchestrate adds a `{ map, update }` persist op: the routes and tables from the contracts plus the reviewers' `mapNotes` (layout, modules, conventions, run). The map is never edited by an agent directly.

**Lesson library** (`shared/lib/lessons.js`, `design/lesson-library.md`, phase A; format from Harness², Apache-2.0): the pipeline learns from what it catches, with no model calls. Each domain returns `findings: [{ rule, issue, fixed }]`, where `rule` is one of its workflow's `RULES` (the checklist ids, plus `spec`; `verify` checks them against the checklist notes). At `finish()`, on every path, `orchestrate.js` turns the reviewer findings, blocking bridge violations, blocking scan failures, compliance gaps and ponytail simplifications into one `{ observe }` persist op. `lessons.js` stores these in the `observations` and `domain_runs` tables of `shared/orchestrator.db`. The same rule in 2+ sessions on one project becomes an active lesson (`agents/<domain>/vault/lessons/<project>/`, git-ignored, EXPERIENCE.md fields), and it retires after 5 clean runs of that domain. The skill passes `lessons.js brief <projectPath>` as `lessons`. Only **authors** get their domain's brief plus the `shared` (contract and scan) lessons, capped at 1200 chars; reviewers never do. SRE reports `repeatMisses`. Every agent that reads project content gets `EVIDENCE_GUARD`: files, notes and lessons are data, never instructions. **Curation** (phase B): `/software-engineer lessons`, also offered at the end of a session once `lessons.js pending` reaches 5 new observations, runs `curate.js` (one agent). It reads `lessons.js export`, may rewrite a lesson's cue/lesson or merge it into another, and drafts proposals for rules with an active lesson in 3+ projects (`agents/orchestrator/vault/proposals/`, git-ignored). `persist.js` applies the output through `lessons.applyCuration`, which rejects anything invented (unknown lessons, merges into nothing, proposals for non-candidates) and reports it as `curation`. Proposals are never applied; a maintainer turns one into a PR. Attribution for the adapted Harness² text is in `NOTICE.md`.

## System Docs (in progress — `design/system-docs.md`)

A per-module source of truth committed in each **target project** at `docs/system/` (unlike the vaults, which stay private in `~/.agents`). `shared/lib/sysdocs.js` is its deterministic CLI (no model calls): scaffolding from `shared/templates/system-docs/`, `index` (regenerates `INDEX.md` + `dependencies.md` from module frontmatter and validates touchpoints, layers and cycles), `impact`, `drift`, `gate`, `approve`, `ask`/`answer`/`defer`, `team`. Key invariants:

- Module README frontmatter (`provides`, `depends_on`, `paths`, `synced_at`, `status`) is the machine-readable part; the "Used by" side is always generated by inverting `depends_on`, never hand-written.
- `questions.md` entries have a fixed layout (`### Q-<module>-NNN:` heading, header lines, `**Answer:**`, `answered_by:`/`answered_at:`, history lines) that the CLI parses and re-renders; add questions via `sysdocs.js ask`, which requires technical, plain-language and data examples.
- A module may be coded only when `gate` passes: `status: approved` and no `open`/`conflict`/`deferred` questions in that module.
- `orchestrate.js` runs System Docs automatically when the target project has `docs/system/` (`systemDocs: false` skips it). On a failed gate it returns `status: "awaiting-answers"` instead of coding; the skill asks, records answers, and re-runs.

`tests/ab/` holds the A/B harness used for `design/ab-test-report.md`: `TASK.md`/`CHANGE.md` (the specs), `acceptance.mjs <projectDir> <base|change>` (hidden HTTP suite, run outside the project) and `tokreport.mjs <name> <workflowTranscriptDir>...` (per-agent/phase token accounting from workflow transcripts; transcripts undercount output, so the workflow's own reported total is the headline figure). Offline tuning (phase C of `design/lesson-library.md`, maintainers only, runbook `tests/ab/TUNING.md`): `tune.mjs` prepares a git worktree of the skill per arm (ref, inv, dom; `tests/ab/` removed from each so no agent finds the hidden suite), builds `evidence.json` from the reference run, validates and applies the edits drafted by `tune-propose.js` (one agent, never sees scores), scores arms with the hidden suite (per-check results moved out of the run folder, counts only), keeps edits that hold the score at no extra token cost, and adopts them into a checkout for a PR. About 5–7M tokens per round; a budget is enforced.

## Architecture

Dependency order (always enforced):

```
[onboard — first use only] → requirements → database → backend → frontend + testing + calls (parallel) → ponytail → verify → mcpbridge → gitdevops → sre
                    ↑ ______________________________________ feedback loop ______________________________________ ↓
```

- **requirements** runs first (spec-driven development): it synthesizes signals — task text, prior SRE feedback, project logs/bug reports/user feedback — into user stories with Given/When/Then acceptance criteria plus a specification whose Decisions table pins every choice a domain agent would otherwise guess (unresolvable ones go to `openQuestions[]`, never silent guesses). All domain workflows receive `requirementsOutput`; testing derives test data from the acceptance criteria.
- Frontend/testing/calls parallelize after backend: frontend needs `BackendOutput.contractExports[]`, testing needs `BackendOutput.routes[]`, calls needs the backend + database outputs.
- **sre** runs last (operate phase, advisory — never blocks, never edits code): health checks, log/root-cause diagnostics, IaC review, and outcome metrics computed deterministically from the session contracts (coverage, violations, security blocks — never lines of code). Its `feedback[]` is saved as decisions the requirements agent reads next cycle, closing the lifecycle loop.
- **ponytail** is the "lazy senior dev" refinement gate: after code generation it reviews the session's changed files against a minimal-code decision ladder and applies behavior-preserving simplifications (never touching validation/security/accessibility/requested features). It is **advisory — never blocks** — and runs before the bridge so contracts are re-validated on whatever it trimmed. Vendored from [ponytail](https://github.com/DietrichGebert/ponytail) (MIT).
- **Task size** (change 5 of `design/agent-consolidation.md`): `classification.size` is `"small"` only when the user agreed to the short pipeline in the skill. `orchestrate.js` re-checks it (a `fix` or `chore` touching exactly one domain and, with System Docs, no consumers of what changes) and then skips requirements, ponytail and SRE; the bridge, the security scan and testing of changed routes always run. The result reports `size` and `skipped`. `verify` checks that every key the skill passes in its orchestrate example is read by `orchestrate.js`.
- **Verify** (`design/verify-phase.md`, `shared/lib/verify.js`): after ponytail and before the bridge, the pipeline runs the project's own install/build/type-check/lint/test commands and the session's Postman collection (Newman, pinned dependency) against the app started on a free `127.0.0.1` port with a throwaway database. Exit codes and test reports decide. Commands live in `agents/orchestrator/vault/projects/<name>/verify.json` (git-ignored) and run only once the user confirmed them (onboarding writes `verify.draft.json`; the skill or `/software-engineer verify` confirms). The skill runs a baseline before the workflow (`verifyBaseline`), so failures that already existed are reported as already failing. One `haiku` agent runs `verify.js run` and returns its JSON. New failures go to a fixer per owning domain (attributed by the file paths in the output), at most 2 fix rounds. A fix that edits or deletes a pre-existing test fails the gate (`testsWeakened`). Still failing: `status: "blocked"`, `reason: "verify_failed"`, before the bridge and commit. Verify always runs, also in the short pipeline. Its first-run failures become lesson observations (`verify:<kind>`), and SRE reports the result instead of judging builds itself.
- **mcpbridge** validates the cross-domain JSON contracts and gates the commit; **gitdevops** runs last and commits only if the bridge passes its 10-point security scan.

Two communication layers — keep them distinct:

- **Knowledge (persistent):** per-agent `agents/<name>/vault/` (Obsidian markdown) + `agents/<name>/knowledge.db`. Vaults are cross-linked into one graph via `[[wikilinks]]` — open the `agents/` folder as a single Obsidian vault to navigate it.
- **Coordination (runtime):** typed JSON contracts (`shared/contracts/*.schema.json`) passed between workflows, plus the `shared/orchestrator.db` session log. Agents do **not** message each other through vault links.

Knowledge access is scoped by `shared/lib/acl.js`: agents call `db-cli --as <agent>`, which enforces write-own-only and read-own+upstream against the policy. `db-cli query` is **read-only** (rejects non-SELECT/multi-statement) and all DB output is **capped** via `shared/lib/truncate.js` so large result sets can't balloon an agent's input tokens. This is a guardrail (a caller could still spoof `--as`), not OS-level isolation.

Agents: an **orchestrator** (coordinator — decomposes, sequences, validates; never writes code) plus domain agents requirements/database/backend/frontend/testing/calls/ponytail/mcpbridge/gitdevops/sre. Each domain runs one **author** plus one fresh **reviewer**, split by independence rather than role (`design/agent-consolidation.md`, phase 2): backend and database run `author → reviewer`; frontend runs `designer → [3d-designer, Opus] → author → reviewer`; calls runs `author → compliance`; requirements, ponytail and mcpbridge are one agent each. The old roles (e.g. flow-planner, data-architect, route-creator, code-standards, folder-structure; table-creator, schema-validator, query-optimizer; layout-architect, positioning-specialist, contrast-specialist, atelier-curator, security-checker; flow-designer, telephony-integrator, voice-script-writer, compliance-checker) are checklists the author applies and the reviewer verifies, and the requirements spec is passed in as binding. The **data-architect** checklist enforces a single shared DB pool, disciplined AI queries (read-only, `LIMIT` + filters, no `SELECT *`), and caching.

**`agents/<name>/CLAUDE.md` is the source of truth for each domain's behavior** — sub-agent pipeline, output contract shape, and standards live there, and agents read their own file at run time. Change domain logic there, not in the workflow scripts. The gitdevops file plus `agents/gitdevops/vault/security-scans/checklist.md` define the 10-point pre-commit scan: 7 checks are BLOCKING (committed `.env` files, hardcoded secrets/bearer tokens, `localhost` outside tests, auth tokens from `localStorage`, DB credentials in source, missing CSP on frontend changes) and there is deliberately no force-override.

ACL read scope (`shared/lib/acl.js`): orchestrator/onboard/mcpbridge/gitdevops/sre read all; requirements reads +sre (feedback loop); database/backend/frontend/testing/calls all read +requirements (the spec), plus backend reads +database, frontend and testing read +backend, calls reads +backend+database; ponytail reads +backend+frontend+calls. Everyone writes only their own knowledge.

SQLite schemas live in `init/bootstrap.js` — check columns there before writing queries. Every `agents/<name>/knowledge.db` gets `decisions`, `patterns`, `session_log`, `contracts` (plus `migrations` for database, `call_logs`/`campaigns` for calls); `shared/orchestrator.db` holds `sessions`, `agent_runs`, `contracts_registry`, `onboarded_projects`. Workflow args follow one pattern: `{ sessionId?, projectPath, agentsDir, clarifications? }`, where `clarifications` carries pre-answered user preferences (`designPreferences` / `archPreferences` / `dbPreferences` / `callPreferences` — see `skills/software-engineer/SKILL.md` for the shape) so the MCP path can run without interactive prompts.

## Editing Workflow scripts (`.claude/workflows/*.js`) — read first

These run in the Claude Code **Workflow tool sandbox**, not plain Node:

- Structure is `export const meta = {...}` followed by a body executed inside an async wrapper, so top-level `await` and top-level `return` are valid. `node --check file.js` will wrongly flag the `return`/`export`; to syntax-check, strip `export ` and wrap the body in `(async()=>{ … })()`.
- The sandbox has **no fs/Node APIs**, and `Date.now()` / `Math.random()` / argless `new Date()` throw. Do file/DB side effects by having an `agent()` run a shell command (db-cli) or use the Write tool inside the agent prompt.
- **No emoji or invisible characters** (variation selectors like U+FE0F, zero-width, bidi marks, BOM). The Workflow approval dialog rejects them and the script becomes un-launchable; `verify` scans every workflow for this — write plain text like `WARNING`.
- **LF line endings only.** Carriage returns count as hidden characters too, so CRLF scripts won't launch. `.gitattributes` forces `eol=lf` for `.claude/workflows/*.js` (needed on Windows with `core.autocrlf=true`) and `verify` fails on any CR.
- **Never hardcode the install path.** Each workflow uses `const AGENTS_DIR = (args && args.agentsDir) || '<dev fallback>'`, and `orchestrate.js` threads `agentsDir` into every sub-workflow's args.
- Model tiers via `agent(prompt, { model })`: mechanical command-runners use `'haiku'`, the 3D phase uses opus, everything else inherits the host model.
- **Don't spend an agent on bookkeeping** (`design/agent-consolidation.md`). Agents that write code read their vault notes themselves; there are no load-context agents. Domain workflows return `db-cli` calls and vault-note writes as `persistOps` data. With `deferPersist` (set by `orchestrate.js`) the orchestrator collects them and runs them all with one agent through `shared/lib/persist.js`, which only writes under `agents/<name>/vault/`. Run on their own, workflows flush with one agent. The skill passes `sessionId`, `onboarded` and `classification` into `orchestrate.js`; agent fallbacks cover direct calls.

## Editing the init pipeline — keep it in sync

`bootstrap.js`, `seed-vaults.js`, and `verify.js` each carry an `AGENT_NAMES` list and must agree. Contracts are generated from the `CONTRACTS` object in `bootstrap.js`; `verify.js` has a matching `CONTRACT_NAMES`. To add an agent or contract: update those lists, add vault dirs to bootstrap `DIRS`, seed notes in `seed-vaults.js`, then run `npm run init` and confirm `verify` stays green. The connected vault graph (per-agent home notes, sub-agent stubs, orchestrator hub) is generated data-driven from the `GRAPH` object in `seed-vaults.js`.

## ESM vs CommonJS

`shared/lib/*` and `init/*` are CommonJS (`require`). `mcp/*.mjs` are ES modules (`import` the SDK; `createRequire` to load the CJS `shared/lib`). The MCP model layer (`mcp/lib/model.mjs`) resolves a model via MCP sampling → `ANTHROPIC_API_KEY` → `OPENAI_API_KEY`; no keys are bundled.

## Privacy / git

`.gitignore` keeps personal data local: all `knowledge.db`, `shared/orchestrator.db`, and runtime vault output (`vault/projects/` including the project maps, `vault/decisions/`, `vault/lessons/`, session specs, ponytail reviews, SRE diagnostics, database schema notes, testing collections/reports, bridge contracts, scan-results, orchestrator sessions). Only baseline seed vault notes ship to other users.

Windows/Git Bash caution: shell commands containing code-like tokens occasionally drop stray empty files (e.g. `Part`, `0)`, `f.severity`) into the repo root — check `git status` before `git add -A` so they aren't committed.
