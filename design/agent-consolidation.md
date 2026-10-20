# Agent consolidation (issue #8): design

Status: **approved design** · 2026-10-20 · Issue: [MARafey/The-Software-Engineer#8](https://github.com/MARafey/The-Software-Engineer/issues/8)

## Problem

A full-stack `/software-engineer <task>` run spawns about 50 agents (plus 8 for onboarding on first use). Every agent starts from about 50–60k tokens of fixed context, then rebuilds its view of the project before doing any work. Only a JSON summary crosses each handoff, so the reasoning behind the work is lost. Several agents in a row often edit the same files toward the same goal.

## Measured baseline

Measured on the 4 pipeline runs of the [A/B test](ab-test-report.md): 206 agents, 15.5M billable tokens (excluding cache reads), **75k per agent on average**.

| Group | Agents per run | Billable per run | Writes code? |
|---|---|---|---|
| `load-context` / `load-ladder` (backend, database, frontend, gitdevops, mcpbridge, testing, ponytail) | 7 | ~440k | No: only reads vault notes for the next prompt |
| `persist-*` / `write-output` / session bookkeeping (`init-session`, `check-onboarded`, `session-final`, session note) | 13 | ~630k | No: runs `db-cli.js` or writes a note |
| Backend chain: flow-planner, data-architect, route-creator, code-standards, folder-structure | 5 | ~490k | Yes: two of them re-edit code they didn't write |
| Frontend chain: art-director … security-checker (no 3D) | 9 | ~940k | Yes: component-creator alone is 264k |
| Database chain: table-creator, schema-validator, query-optimizer | 3 | ~210k | Yes |
| Requirements: signal-analyst, spec-author | 2 | ~210k | Spec |
| Bridge checks: validate-contracts, auth-consistency, integration-stubs | 3 | ~150k | Review |
| Ponytail: review-changes, apply-simplifications | 2 | ~215k | Review + edits |

The first two rows, about 1.07M tokens and 20 agents per run, produce no work at all; they're plumbing.

## Principles

1. **Split by independence, not by job title.** An agent is worth spawning when it must not know what came before (reviewers, verifiers), or when its work runs in parallel with others. Everything else belongs in the prompt of the agent already doing the work.
2. **Reviewers stay fresh.** The domain reviewer, ponytail, the bridge and the security scan never see the author's reasoning: only the spec, the diff and the rules. That independence is their value.
3. **Build context once.** One compact project map per project, handed to every agent, instead of each agent exploring the repo again.
4. **The main session does bookkeeping.** The skill runs in the main session, which has a shell. Workflows spend agents only on reasoning.
5. **The pipeline scales to the task.** Gates (bridge, security scan) never shrink; the work around them does.
6. **`agents/<name>/CLAUDE.md` stays the source of truth.** Each domain's sub-agent pipeline is redefined there, and the workflow follows it.

## Changes

### 1. Remove the load-context agents

Seven workflows start with an agent whose only job is to read vault notes and return their text. Instead, the first working agent is told which notes to read itself. Ponytail's `load-ladder` is the same pattern.

### 2. Move bookkeeping out of the workflows

| Today (agent) | After |
|---|---|
| `init-session`, `check-onboarded` (orchestrate) | Skill runs `db-cli` before `Workflow` and passes `sessionId` and `onboarded` in `args` |
| `classify-task` (orchestrate) | Skill classifies during its clarification step (it already reads the task) and passes `classification` |
| `session-final`, `session-failed`, `session-awaiting`, session note | Skill sets the status and writes the note from the workflow's return value |
| `persist-state` / `persist-spec` / `persist-review` / `write-output` / `persist-diagnostics` | The domain's last working agent gets "then run: `db-cli …`" appended to its prompt |
| System Docs `drift-check`, `index`, `docs-gate` | Skill runs `sysdocs drift` up front (it decides whether a sync is needed at all); `index`/`gate` run as tails of the impact analyst and doc-updater |

**Compatibility:** when `args.sessionId` or `args.classification` is missing (a direct `Workflow` call or an older skill), `orchestrate.js` falls back to doing it itself, as today. The MCP server has its own orchestration path and is unaffected.

### 3. Author + reviewer per domain

| Domain | Today | After | Notes |
|---|---|---|---|
| Requirements | signal-analyst → spec-author → persist-spec (3) | **spec-author** (1) | Gathers signals and writes the spec in one pass; saves decisions as its tail |
| Database | load → table-creator → schema-validator → query-optimizer → persist (5) | **author → reviewer** (2) | Validation and index rules go into the author's checklist; the reviewer checks the migration against them |
| Backend | load → flow-planner → data-architect → route-creator → code-standards → folder-structure → persist (7) | **author → reviewer** (2) | Flow plan, data-access rules, code standards and folder rules become the author's checklist |
| Frontend | load → art-director → ui-designer → [3d-designer] → layout → positioning → contrast → component-creator → api-request-handler → atelier-curator → security-checker → persist (12) | **designer → author → reviewer** (3), plus 3d-designer only for 3D tasks | The designer keeps art direction separate from code (see open question 1); layout, positioning, contrast and API wiring become the author's checklist; atelier-curator, contrast and security checks become the reviewer's |
| Calls | load → flow-designer → telephony-integrator → voice-script-writer → compliance-checker → persist (6) | **author → compliance reviewer** (2) | Compliance stays independent |
| Testing | load → generate-collection → write-output (3) | **generator** (1) | |
| Ponytail | load-ladder → review-changes → apply-simplifications → persist-review (4) | **ponytail** (1) | Reviews and applies in one pass; still never sees author reasoning |
| Bridge | load → validate-contracts → auth-consistency → integration-stubs → persist (5) | **bridge** (1) | One independent check over all contracts |
| Git/DevOps | load → security-scan → [fail report] → branch-and-commit → persist (4–5) | **scan script + 1 agent** | The 10 checks are pattern checks: run them as a deterministic script (zero tokens); one agent writes the commit, or explains blocking findings |
| SRE | sre-diagnose → persist (2) | **sre** (1) | |

The vault's `sub-agents/*.md` notes stay, but turn from agent definitions into the checklists the author and reviewer read. The seed graph (`GRAPH` in `init/seed-vaults.js`) is updated to match.

### 4. Shared project map

- **What:** onboarding writes a compact map, at most 3000 characters, to the private vault (`agents/orchestrator/vault/projects/<name>/map.md`). It covers the stack, folder layout, conventions, main modules, routes and tables, and how to run things.
- **Who uses it:** every agent prompt includes it. When the project has System Docs, the impact analyst's briefing is added for the modules in scope.
- **Keeping it current:** each domain reviewer updates its section of the map when the session added or moved files, routes or tables. That's a tail step on an agent that already exists, not a new one.
- **Onboarding itself:** the three parallel scans stay. Discover-stack and extract-conventions merge into one agent, populate-knowledge and update-indexes merge into one that also writes the map, and mark-onboarded moves to the skill. That's 8 agents down to 5, on first use only.

### 5. Scale the pipeline to the task

The skill's classification adds a `size`:

| Size | When | Skipped |
|---|---|---|
| `small` | `fix` or `chore` touching one domain, and (with System Docs) no consumers of what changes, the existing `lightFix` condition | Requirements (the task text plus the briefing is the spec), ponytail, SRE |
| `normal` | everything else | nothing |

The bridge, the security scan and testing of changed routes always run. For a `small` task the skill asks before running: it names the stages it would skip and why the task qualifies, and runs the full pipeline unless you agree.

## Expected result (estimates, to be measured)

Per normal full-stack build, excluding first-use onboarding:

| | Today | After |
|---|---|---|
| Agents | ~50 | ~14 |
| Billable tokens | ~3.8M | ~1.8M (−50%) |

Small tasks shrink further. The estimate assumes merged authors cost about 1.5× today's biggest single agent in each chain; the measurement below decides.

## Measurement and quality gate

Rerun the A/B harness (`tests/ab/`) after each phase: same `TASK.md` and `CHANGE.md`, two runs per arm to see variance.

- **Must hold:** hidden suite 41/41 after the build and 54/54 after the change (including the 5 linked read-only checks), and the bridge and security scan behaving as before.
- **Targets:** at least 40% fewer agents and 30% fewer billable tokens per run.
- **Report:** agents, billable tokens, cache reads and wall time per phase, using `tokreport.mjs`. A phase that misses the quality bar is reverted, not tuned around.

## Phases

1. **Plumbing: built, not yet measured** (`dc5937a`, `17ee173`). Load-context agents removed; every domain returns its bookkeeping as `persistOps`, run once at the end by one agent through `shared/lib/persist.js`; the skill passes session, onboarding and classification data in; the docs gate is part of the impact analyst; the security scan is `shared/lib/scan.js` and gitdevops is one agent. Agents per full run (skill-started, no System Docs, no 3D): about 49 to about 28. Bookkeeping notes are still written by one agent rather than the skill, because the main session would have to re-type their contents (no cheaper path inside the Workflow sandbox).
2. **Author + reviewer:** change 3, domain by domain (backend first, then database, frontend, calls, requirements, the reviewers), with each `agents/<name>/CLAUDE.md`, the vault notes and the seed graph updated together. Run `npm run init` and keep `verify` green.
3. **Project map:** change 4.
4. **Task size:** change 5.

## Risks

| Risk | Mitigation |
|---|---|
| Merged author prompts get long and lose specialist depth (e.g. CSS layout, contrast) | Checklists are short rule lists, not whole notes; the reviewer re-checks each item; the quality gate catches regressions |
| A reviewer that shares context with the author stops being independent | Reviewers receive only the spec, the diff, the rules and the map, never the author's transcript or reasoning |
| The skill and workflows drift (bookkeeping moved out) | `orchestrate.js` keeps fallbacks when `args` lack session or classification data; `verify` gains a check that the skill and workflow agree on the args shape |
| `small` tasks skip something they needed | Only `lightFix`-type tasks qualify; the bridge, scan and testing never skip; the user approves the skip list every time |
| The scan script misses something an agent would have caught | The script implements exactly the 10 documented checks (`agents/gitdevops/vault/security-scans/checklist.md`), tested on fixtures for each check; blocking stays blocking, with no override |
| A stale project map misleads agents | Reviewers update their section each session; `onboard` rebuilds it from scratch |

## Decisions

| Topic | Decision |
|---|---|
| Frontend design | Keep a **separate designer** before the author: art direction stays independent of the code (designer → author → reviewer) |
| Security scan | The 10 checks become a **deterministic script** (`shared/lib/scan.js`, zero tokens). The gitdevops agent only writes the commit, or explains blocking findings in plain language |
| Small tasks | The skill **asks each time**: it shows which stages a `small` task would skip and runs the short pipeline only if you agree; otherwise the full pipeline runs |

## Open questions

None.
