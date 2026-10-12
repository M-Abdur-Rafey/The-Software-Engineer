# System Docs — design

Status: **draft for review** · 2026-10-12

## Problem

Agents change one feature and silently break another that depends on it, because nothing tells them the dependency exists. Context lives in private per-machine vaults (`~/.agents/agents/*/vault`) that teammates never see, and specs are written per session, not per feature, so knowledge doesn't accumulate.

## Goal

A Markdown documentation tree **inside the target project's repo**, shared by the whole team, that is the source of truth for every module, flow, API, data shape, dependency and decision. Agents read it before working and update it after. No module gets coded until its doc is approved.

## Decisions so far

| Topic | Decision |
|---|---|
| Location | Target project repo, committed, shared with the team |
| Granularity | One folder per module or feature, not per code folder (a feature spans routes/models/components; per-folder docs would split it, which is the root cause of missed links) |
| Format | Markdown only. Diagrams as Mermaid blocks. No generated HTML |
| Sync | Agents update docs when they change code; at session start they detect manual edits since the last sync and update docs for those too |
| Doc vs code conflict | Ask the user |
| Gate | No coding on a module until its doc is approved and has no open questions |
| Answers | Stored permanently in the doc. Asked in chat **and** answerable in the file by any teammate |
| Question detail | Every question gets a technical example, a plain-language example, and a data example |
| Approver | Anyone on the team. Every answer and approval records who and when; conflicting answers are flagged, never overwritten |
| Bug fixes | Impact-based: always run the impact check; full questions + approval only if the fix touches something another module uses |
| Cross-owner impact | Flag in the explanation, log in the affected module's doc, add an "Affects other owners" section to the PR/commit |
| Build order | Functional layers outer (foundation → auth → CRUD → access control …), database → backend → frontend → tests inside each layer; independent modules in a layer build in parallel |
| Existing projects | Ask the user how they want to use it (see "Existing projects") |
| Team | Map git emails to names in a shared file; ask when an unknown email appears |
| Merges | Explain each conflict (technical + plain + example of changed behavior), user decides, agent resolves once told |
| Integration | Extend existing agents (`requirements`, `onboard`, `codegraph`, `orchestrate`), not a parallel system |
| UI choices | Options shown in chat, each with a Markdown layout sketch; the user picks; the choice is recorded in the module doc |
| New-project planning | Docs and questions for **all** layers up front. Questions the user can't answer yet are **shelved** (`deferred`) and come back when their module is next up for building or touched |
| Folder name | `docs/system/` |

## 1. Doc tree in the target project

```
docs/system/
  INDEX.md          GENERATED: one line per module: layer, status, owner, paths
  dependencies.md   GENERATED: touchpoint → provider → every consumer
  layers.md         build order; user approves before building starts (new projects)
  team.md           email | name | role (anyone can add rows)
  modules/
    <module>/
      README.md     the module's source of truth (frontmatter + sections below)
      questions.md  open, answered and conflicting questions
      flows/
        <flow>.md   one file per flow, loaded only when that flow is in scope
```

**GENERATED** files are rebuilt by a script from module frontmatter. No model writes them, so they cost no tokens and can't drift from the modules.

### Module README frontmatter (machine-readable)

```yaml
---
module: auth
layer: 2
status: draft            # draft | in-review | approved
owner: Shan              # informational; anyone may approve
approved_by:
approved_at:
synced_at: 3f9c2e1       # commit the doc was last verified against
paths:                   # code this module owns
  - src/routes/auth.js
  - src/models/user.js
  - src/pages/Login.tsx
provides:                # touchpoints other modules may depend on
  - api:POST /api/auth/login
  - api:GET /api/users/:id#email
  - fn:requireAuth
  - table:users.role
depends_on:
  - module: foundation
    uses: [fn:db.pool, config:JWT_SECRET]
---
```

"Used by" is **never written by hand**: the script inverts every module's `depends_on` into `dependencies.md`. That inversion is what stops the "agent was unaware" failure. If a consumer declares a dependency, every provider change sees it.

### Module README sections

1. **What it does:** plain language, then technical
2. **Flows:** links to `flows/*.md`
3. **APIs:** method, path, request and response examples
4. **Data:** where each piece comes from (DB, third-party API, user input), stored format, a real example record, and how it is created, edited and deleted
5. **Depends on / Used by:** rendered from frontmatter plus `dependencies.md`
6. **Decisions:** answered questions promoted here (link back to `questions.md`)

### Flow file

Steps from user → frontend → backend → DB → back. One Mermaid sequence diagram. Plain-language walk-through. Failure cases.

### Question entry (`questions.md`)

```markdown
### Q-auth-003 — Stay logged in after the browser closes?
status: open             # open | answered | conflict | deferred
asked: 2026-10-12 · agent · session 7a1c
touches: fn:requireAuth, table:sessions   # drives the chain-reaction section

**Chain reaction:** what else changes depending on the answer (names consumer modules).
**Technical example:** refresh token in httpOnly cookie, 30-day expiry; `requireAuth` must accept refreshed tokens…
**Plain-language example:** you close the laptop Friday and open the app Monday: are you still signed in?
**Data example:**
    sessions row: { id: "s_91", user_id: 12, expires_at: "2026-11-11T09:00Z", device: "Chrome/Win" }
**Options:** A) 30-day remember-me  B) session ends on browser close  C) user chooses at login

**Answer:**
answered_by:  ·  answered_at:
```

A different answer from a second person sets `status: conflict` and keeps both; the agent asks the user to resolve it.

"Not sure yet" sets `status: deferred` (shelved) with `deferred_by` / `deferred_at`. A shelved question doesn't block other modules. It is re-asked when its own module comes up for building or is touched by a task, and must be answered then, because the gate still requires a complete doc for that module.

## 2. Helper script: `shared/lib/sysdocs.js` (no model, zero tokens)

| Command | Does |
|---|---|
| `index <project>` | Rebuild `INDEX.md` + `dependencies.md` from frontmatter; fail on unknown touchpoints or cycles |
| `impact <project> <touchpoint\|path>...` | List provider module + every consumer module (paths map to modules via `paths:`) |
| `drift <project>` | Per module, `git diff --name-only <synced_at>..HEAD` plus uncommitted changes on owned paths, and files owned by no module |
| `gate <project> <module>` | Pass only if `status: approved` and zero `open`/`conflict`/`deferred` questions in that module (deferred questions in other modules don't count) |
| `questions <project> [module]` | Emit open questions as JSON (for the skill to ask in chat); with a module, also resurfaces that module's deferred ones |
| `answer <project> <qid> <name> <text>` | Record an answer with who and when; set conflict if it differs from an existing answer |
| `defer <project> <qid> <name>` | Shelve a question the user can't answer yet |
| `team <project>` | List git author emails missing from `team.md` |

Workflows call it the way they call `db-cli` today, via a haiku command-runner agent.

## 3. Flows

### 3a. Gate (return-and-resume)

Workflow scripts can't pause for user input. The gate is enforced by **returning**:

1. The workflow writes questions to `questions.md`, then returns `{ status: "awaiting-answers", questions: [...] }`.
2. The skill (main chat) asks them, with all three examples, then records each answer via `sysdocs answer`.
3. The user (or a teammate, later, by editing the file) answers. Then `/software-engineer approve <module>` sets `status: approved`.
4. Re-running the task passes `gate` and building proceeds.

This also makes the MCP path work: answers can come in through the file with no interactive prompt.

### 3b. Any task on an existing project (extends `orchestrate.js`)

```
drift-check ─► doc-sync (only drifted modules) ─► ask on doc/code conflicts
     │
     ▼
impact-analyst: task → touched modules + touchpoints → `sysdocs impact`
     → reads ONLY those modules + direct consumers
     → chain-reaction report + questions (3 examples each)
     │
     ▼
gate ── fail ─► return awaiting-answers
     │ pass
     ▼
existing pipeline (requirements → database → backend → frontend+testing+calls → ponytail → bridge)
     │
     ▼
doc-updater: update touched modules' README/flows, bump synced_at, `sysdocs index`
     │
     ▼
gitdevops (commit includes docs; "Affects other owners" section when a consumer has a different owner) → sre
```

`requirements` changes: its Decisions table and `openQuestions` are written into the module's `questions.md` and README instead of only `~/.agents/.../specs/<session>.md`. The private spec stays as the session log.

### 3c. New project: plan, then build in layers

1. **Plan** (no code): from the idea, propose modules, assign layers, draft every module README plus flows, and generate questions for **all** layers up front so cross-layer dependencies surface early. The user approves `layers.md`, answers what they can, and shelves the rest.
2. **Build loop**, per layer N in order:
   - Gate every module in layer N, re-asking its shelved questions first (later layers may still be in draft or have shelved questions).
   - **In parallel, one per module:** database → backend → frontend + testing, each agent loading only its module doc plus the `provides` touchpoints of its dependencies.
   - **Integrate (sequential, single agent):** shared files that several modules touch (router index, nav, migration ordering, DI container). Parallel module agents never write these files, which avoids write races.
   - ponytail → bridge (contracts validated before the next layer builds on them) → doc-updater → gitdevops commit (one checkpoint per layer).
3. SRE runs once after the last layer.

### 3d. Existing projects: `/software-engineer docs`

Asks how to use it:

- **Incremental (default, cheapest):** document only the modules each task touches, as tasks come.
- **Full:** run `onboard` + `codegraph` extraction, then draft docs for every module. Questions are generated but the gate applies only when a module is next touched.
- **Selected:** the user picks modules.

`codegraph`'s extractor (real routes, components, tables and edges only) is reused to seed `paths`, `provides` and `depends_on`, so dependencies come from the code rather than guesses.

### 3e. Team and merges

- On every run `sysdocs team` finds new author emails; the skill asks for a name and role and writes `team.md`. Teammates see and reuse the mapping because it's committed.
- `/software-engineer merge <branch>`:
  1. Map changed files on each side to modules.
  2. Show which modules the branch adds or changes, and their dependencies on what's in the base.
  3. For each conflict or inconsistency (code **or** doc), explain both sides: technical, plain language, and an example of how a request/response or screen changes, plus the chain reaction.
  4. The user decides per conflict, the agent resolves, then runs `sysdocs index` and `drift`.

## 4. Token budget

- Agents start from `INDEX.md` (one line per module), never the whole tree.
- Each agent loads its own module README plus only the `provides` lines of its dependencies, not their full docs.
- Flows are separate files and load only when in scope.
- `INDEX.md`, `dependencies.md`, drift and impact lookup are deterministic script work.
- Doc-sync runs a model only on modules that drift reports changed.
- Command runners stay on haiku; parallel module builds per layer.

## 5. Changes to this repo

| Area | Change |
|---|---|
| `shared/lib/sysdocs.js` | New (section 2); add to `verify.js` shared-lib list |
| Templates | `agents/orchestrator/vault/templates/system-docs/` holds README, flow, questions, team and layers templates |
| `.claude/workflows/sysdocs.js` | New: plan (new project), bootstrap (existing), doc-sync, doc-updater phases |
| `orchestrate.js` | drift → impact → gate → pipeline → doc-updater; layer loop with parallel per-module builds + integrate step |
| `requirements.js` / `CLAUDE.md` | Write questions and decisions into module docs |
| `codegraph.js` | Expose extractor output for seeding frontmatter |
| `gitdevops.js` | Include `docs/system/**` in commits; "Affects other owners" section |
| `skills/software-engineer/SKILL.md` | New routes: `docs`, `answer`, `approve <module>`, `merge <branch>`, `team`; gate handling for `awaiting-answers` |
| Contracts | Add a `sysdocs` contract; `bootstrap.js` / `verify.js` lists |

## 6. Suggested build order

1. Doc format, templates, `sysdocs.js` (index, impact, drift, gate, questions, answer, team) + verify checks
2. `docs` command: bootstrap for existing projects + new-project plan
3. Gate loop in the skill + `approve` / `answer` commands
4. `orchestrate.js`: drift, impact, doc-updater around the existing pipeline
5. Layered build loop with parallel modules + integrate step
6. `team` + `merge` commands
7. UI variant picking: the frontend agent returns 2–3 options, each with a Markdown layout sketch (plus a plain-language description of how it behaves); the skill shows them in chat; the pick is recorded in the module README under Decisions

### UI option format (in chat)

```
Option B — side menu, table view
+----------+------------------------------------+
| Orders   |  Search [________]   [+ New order] |
| Products |  # | Customer | Total  | Status    |
| Users    |  1 | Ali      | $40.00 | Paid      |
| Settings |  2 | Sara     | $12.50 | Pending   |
+----------+------------------------------------+
Plain: everything is one click away on the left; best for staff who
switch sections all day. Works on desktop; on mobile the menu collapses.
```

## Open questions

None. All design questions are resolved.
