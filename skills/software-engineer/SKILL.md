---
name: software-engineer
description: Automated full-stack software engineering — one command runs the entire dev lifecycle (database → backend → frontend → testing → security → git). Asks plain-English questions before building anything. Installs itself on first run. Triggers on: build a feature, add an endpoint, create a table, fix a route, add a page, generate tests, software engineer.
user-invokable: true
argument-hint: "[task | test | status | update | onboard | help]"
license: MIT
metadata:
  author: Muhammad Abdur Rafey
  repository: https://github.com/MARafey/The-Software-Engineer
---

# Software Engineer

A multi-agent system that covers the full development lifecycle:

**database → backend → frontend → testing → security scan → git commit**

Every agent has its own knowledge base. It learns from each session and carries that context into future runs. Before writing a single line of code, it asks you plain questions to remove all guesswork.

---

## On every invocation — follow these steps in order

### Step 1: Resolve install path

- **Windows:** `$env:USERPROFILE\.agents`
- **macOS/Linux:** `$HOME/.agents`

Check if installed:
- Windows: run `Test-Path "$env:USERPROFILE\.agents\shared\orchestrator.db"`
- macOS/Linux: run `[ -f "$HOME/.agents/shared/orchestrator.db" ] && echo yes`

### Step 2: Auto-install if not installed

Tell the user: _"First run — installing Software Engineer agents. This takes about 30 seconds..."_

Check prerequisites first:
- Run `git --version` — if it fails: _"Git is required. Download from https://git-scm.com and re-run."_
- Run `node --version` — if it fails: _"Node.js 18+ is required. Download from https://nodejs.org and re-run."_

**Windows (PowerShell):**
```powershell
git clone https://github.com/MARafey/The-Software-Engineer "$env:USERPROFILE\.agents" --depth 1
Set-Location "$env:USERPROFILE\.agents"
npm install --silent
node init/bootstrap.js
node init/seed-vaults.js
node init/verify.js
```

**macOS/Linux:**
```bash
git clone https://github.com/MARafey/The-Software-Engineer "$HOME/.agents" --depth 1
cd "$HOME/.agents"
npm install --silent && node init/bootstrap.js && node init/seed-vaults.js && node init/verify.js
```

- If `verify.js` exits 0: _"Done. Obsidian vaults are ready — open any folder in `agents/*/vault/` as a new Obsidian vault."_
- If it fails: Show the error output. Ask the user to open an issue at https://github.com/MARafey/The-Software-Engineer/issues

### Step 3: Route the command

| What the user typed | Action |
|---------------------|--------|
| `/software-engineer <task>` | Run the full pipeline — go to Step 4 |
| `/software-engineer test` | Run health check — go to the Test section |
| `/software-engineer status` | Show recent sessions — go to the Status section |
| `/software-engineer update` | Pull latest version — go to the Update section |
| `/software-engineer onboard` | Force re-scan of current project — go to the Onboard section |
| `/software-engineer graph` | Build a filtered code knowledge graph of the current project — go to the Graph section |
| `/software-engineer help` | Print usage — go to the Help section |

---

## Step 4: Clarification Phase (runs before every pipeline task)

**This is the most important step.** Never start building before completing it.

Get the current project path first:
- Windows: `(Get-Location).Path`
- macOS/Linux: `pwd`

---

### 4a: Understand the task

Read the task carefully. If it is genuinely unclear — for example, "make it better", "fix the thing", or a single word — ask one focused question:

> _"What specifically would you like me to build or fix? For example: 'add a login page', 'create a users table', 'fix the /api/orders route'."_

Do not ask this if the task is reasonably clear.

---

### 4b: Handle images and mockups

If the user has shared an image, screenshot, or wireframe:
- Look at it carefully
- If you can read it clearly: describe what you see and confirm: _"I can see [X]. I'll build this — does that match what you want?"_
- If it is blurry, cropped, or unclear in any area, ask about only the unclear parts. Be specific:
  > _"I can see the main card layout clearly. I'm not sure about the navigation — is that a top bar or a side drawer?"_
  > _"The color in the header area is hard to read. What color is that?"_

Do not ask the user to re-send the image. Ask targeted questions about the unclear parts only.

---

### 4c: Detect which domains this task touches

Decide which of these apply:
- **Database** — new tables, changing existing data structure, adding columns
- **Backend** — new API routes, changing how the server works, authentication
- **Frontend** — new pages, components, UI changes, anything the user sees
- **Calls** — phone calls, voice, IVR menus, Twilio/Vonage, dialing, voicemail, call recordings

---

### 4d: Ask domain-specific questions

Only ask questions relevant to the domains you detected above. Group all questions into one message — never ask one question at a time across multiple turns.

**Use plain language. Avoid technical jargon unless the user introduced it.**

---

**If the task touches FRONTEND — ask these:**

> _"A few quick questions about the design:"_
>
> **Colors:** What colors should this use?
> - If you have specific brand colors, share the hex codes (e.g., `#2563EB`)
> - If you want me to choose: I'll use a clean blue-and-white professional style
>
> **Layout:** How should users navigate to this?
> - A) Top navigation bar
> - B) Side menu
> - C) No navigation (standalone page or modal)
>
> **Mobile:** Should this work on phones and tablets as well? (yes / no)
>
> **Display style** (if this shows a list of items):
> - A) Cards (tiles, grid layout)
> - B) Table (rows and columns)
> - C) Simple list
>
> **3D / Immersive:** Does this feature need any 3D elements, animated scenes, particle effects, scroll-driven camera movement, or custom shaders? (yes / no)
> - If yes: Should objects respond to physics — falling, colliding, bouncing? (yes / no)
> - If yes: Is there scroll-driven animation — camera flying through a scene as you scroll? (yes / no)

If the project was already onboarded and has an established design system, skip questions whose answers are already known and just confirm: _"I'll match the existing design: [describe what was found]."_

---

**If the task touches CALLS — ask these:**

> _"A few questions about the phone/voice feature:"_
>
> **Direction:** Is this for:
> - A) Receiving calls (inbound) — callers phone in, navigate an IVR menu, get routed to an agent or voicemail
> - B) Making calls (outbound) — your system dials customers automatically
> - C) Both
>
> **Provider:** Which telephony provider should we use?
> → My recommendation: **Twilio** (most complete API, best documentation, global reach)
> → Alternatives: Vonage, Plivo, Telnyx
> → **Which would you like? Or "your recommendation" to go with Twilio.**
>
> **Call recording:** Should calls be recorded? (yes / no)
> → If yes, I'll include spoken consent at the start of each call and store recordings securely.
>
> **Call type:**
> - A) Fully automated IVR (callers press keys to navigate, no live agent)
> - B) IVR that routes to a live agent (IVR for initial menu, then transfer)
> - C) Outbound campaign (system dials a list of numbers with a pre-recorded or TTS script)
>
> **Transcription:** Should calls be transcribed automatically? (yes / no)

---

**If the task touches BACKEND — present recommendation and ask confirmation:**

> _"For the backend, here's what I'm planning — let me know if you want any changes:"_
>
> **Authentication:**
> → My recommendation: JWT tokens (no server-side sessions, scales well, works with any frontend). The token is stored in memory and sent as a header.
> → Alternatives: cookie sessions (simpler but stateful), API keys (good for machine-to-machine only)
> → **Which would you like? Or just say "your recommendation" to go with JWT.**
>
> **Rate limiting** (if routes are public-facing):
> → I recommend adding rate limiting (100 requests per minute per IP) to prevent abuse.
> → **Should I add this? (yes / no)**
>
> **API path format:**
> → Should these routes live under `/api/v1/` (versioned) or `/api/` (no versioning)?
> → I recommend `/api/v1/` — makes future migrations easier.

---

**If the task touches DATABASE — present recommendation and ask confirmation:**

> _"For the database, here's what I'm planning:"_
>
> **Timestamps:** I'll add `created_at` and `updated_at` to every new table (makes debugging and auditing much easier).
> → **Should I do this? (yes / skip timestamps)**
>
> **Deleting records:**
> → My recommendation: **soft delete** — records get marked as deleted but stay in the database. This means you can recover mistakes and keep an audit trail.
> → Alternative: hard delete — records are permanently removed (simpler but unrecoverable).
> → **Which would you like?**
>
> **Expected data size** (helps choose the right indexes):
> → A) Small — under 10,000 records per table
> → B) Medium — 10,000 to 1 million records
> → C) Large — over 1 million records
>
> **ID type:**
> → My recommendation: **UUID** (text like `a1b2c3d4-...`) — better for distributed systems, no sequential guessing.
> → Alternative: auto-increment integer (1, 2, 3…) — simpler, slightly smaller.
> → **Which would you like? (uuid / integer / your recommendation)**

---

### 4e: Resolve answers

Once the user replies:
- If they say "yes to all", "looks good", "just do it", or similar → use all your recommendations as defaults
- If they answer specific questions → use their answers, use defaults for anything not mentioned
- If any answer is still ambiguous → ask one short follow-up question, then proceed

Summarise what you're going to do in one short paragraph before starting the workflow. For example:
> _"Got it. I'll add a login page using your brand blue (#1E3A8A), top navigation, mobile-friendly. Backend will use JWT auth with rate limiting. Database will use UUIDs, soft deletes, and timestamps. Starting now..."_

---

### Step 5: Run the orchestration

Now collect all the user's answers into a preferences object and invoke the workflow:

```javascript
Workflow({
  scriptPath: `<install-path>/.claude/workflows/orchestrate.js`,
  args: {
    task: "<original task text>",
    projectPath: "<current working directory>",
    agentsDir: "<install-path>",
    clarifications: {
      designPreferences: {
        colors: "<hex codes or 'default' or null>",
        navigation: "<'top-bar'|'side-menu'|'none'|null>",
        mobile: <true|false|null>,
        displayStyle: "<'cards'|'table'|'list'|null>",
        use3D: <true|false|null>,
        usePhysics: <true|false|null>,
        useScrollAnimation: <true|false|null>
      },
      archPreferences: {
        authMethod: "<'jwt'|'sessions'|'api-keys'|'none'|null>",
        useRateLimiting: <true|false|null>,
        apiVersioning: "<'v1'|'none'|null>"
      },
      dbPreferences: {
        softDeletes: <true|false|null>,
        addTimestamps: <true|false|null>,
        dataSize: "<'small'|'medium'|'large'|null>",
        idType: "<'uuid'|'integer'|null>"
      },
      callPreferences: {
        callDirection: "<'inbound'|'outbound'|'both'|null>",
        provider: "<'twilio'|'vonage'|'plivo'|null>",
        callRecording: <true|false|null>,
        callType: "<'automated-ivr'|'live-agent-routing'|'outbound-campaign'|null>",
        requiresTranscription: <true|false|null>
      }
    }
  }
})
```

Replace `<install-path>` with the actual install path for the current OS, using **forward slashes** in the JavaScript string (e.g. `C:/Users/you/.agents` on Windows, `/Users/you/.agents` on macOS/Linux). This is the same path you pass as `agentsDir` so every sub-workflow resolves correctly.

---

### Step 6: Report results

After the workflow completes, summarise clearly:

- **Branch created:** `feat/...` (or why no branch was created)
- **Commit:** `feat(auth): add JWT login endpoint` (or why nothing was committed)
- **What was built:** list the key files created
- **Tests:** path to the Postman collection (or "no tests generated")
- **Security:** any issues found (or "all clear")
- **Contract check:** whether frontend/backend/database were consistent
- If anything was **blocked** (contract violation, security issue): explain in plain language what failed and what the user should do to fix it

---

## Subcommand: test (one-turn health check)

Run this to verify everything is installed and working correctly. No files are modified.

```
/software-engineer test
```

Get the install path, then run:
- Windows: `Set-Location "$env:USERPROFILE\.agents"; node init/verify.js`
- macOS/Linux: `cd "$HOME/.agents" && node init/verify.js`

Show the full output. If all checks pass: _"All systems operational. Ready to use."_

If any check fails: show which check failed, what it means in plain language, and how to fix it (usually re-running `npm run init`).

---

## Subcommand: status

Show the last 10 sessions.

Run:
```
node <install-path>/shared/lib/db-cli.js query orchestrator "SELECT id, task_text, status, started_at, completed_at FROM sessions ORDER BY started_at DESC LIMIT 10"
```

Format as a table: ID (first 8 characters), task summary, status, how long it took.

---

## Subcommand: update

Pull the latest version and re-run initialization.

**Windows:**
```powershell
Set-Location "$env:USERPROFILE\.agents"
git pull origin main
npm install --silent
node init/bootstrap.js
node init/verify.js
```

**macOS/Linux:**
```bash
cd "$HOME/.agents" && git pull origin main && npm install --silent && node init/bootstrap.js && node init/verify.js
```

Show which version is now installed: `git log -1 --oneline`

---

## Subcommand: onboard (force re-scan)

Forces a fresh scan of the current project even if it has been onboarded before. Use this after a major refactor or when switching to a different project at the same path.

Get the current project path, then run:
```javascript
Workflow({
  scriptPath: `<install-path>/.claude/workflows/onboard.js`,
  args: {
    sessionId: "manual-onboard",
    projectPath: "<current working directory>",
    agentsDir: "<install-path>"
  }
})
```

Tell the user what was found: tech stack, number of routes, components, tables.

---

## Subcommand: graph (filtered code knowledge graph)

Builds a **lean Obsidian knowledge graph of the current project** — only the routes, components, tables, features and relationships that actually exist in the code. Theoretical or unused entities are excluded on purpose, so the graph stays navigable instead of overflowing.

Works best right after `onboard` (it reuses the scan), but it will scan directly if the project hasn't been onboarded.

Get the current project path, then run:
```javascript
Workflow({
  scriptPath: `<install-path>/.claude/workflows/codegraph.js`,
  args: {
    sessionId: "manual-graph",
    projectPath: "<current working directory>",
    agentsDir: "<install-path>"
  }
})
```

When it finishes, tell the user the node/edge counts by type, how to open it (open `<install-path>/agents/orchestrator/vault` as an Obsidian vault → `projects/<name>/graph/_index.md` → Graph View), and note anything dropped for leanness. The graph is git-ignored (personal project data).

---

## Subcommand: help

Show:
```
/software-engineer <task>     — Plan, build, test, and commit anything
/software-engineer test       — Run health check (no files modified)
/software-engineer status     — Show recent sessions
/software-engineer update     — Pull latest version
/software-engineer onboard    — Re-scan current project
/software-engineer graph      — Build a filtered code knowledge graph (Obsidian)
/software-engineer help       — Show this

Examples:
  /software-engineer add user login with email and password
  /software-engineer fix the broken /api/orders route returning 500
  /software-engineer create a products table with categories
  /software-engineer add a dashboard showing sales stats
  /software-engineer generate Postman tests for all existing routes
  /software-engineer add security headers to the backend
```

---

## What each agent does

| Agent | What it does | Experts inside |
|-------|-------------|----------------|
| **Database** | Writes migration SQL, checks foreign keys, adds indexes | table-creator, schema-validator, query-optimizer |
| **Backend** | Creates routes, controllers, services with documentation | flow-planner, route-creator, code-standards, folder-structure |
| **Frontend** | Builds components, wires API calls, enforces security rules. For 3D tasks: designs Three.js/WebGL scene, physics, shaders, and scroll animation using Opus model | ui-designer, 3d-designer (Opus), component-creator, api-wirer, security-checker |
| **Testing** | Generates Postman tests (success case, error case, auth case per route) | — |
| **Calls** | Inbound IVR flows, outbound campaigns, webhook handlers, TTS scripts, TCPA/GDPR compliance | flow-designer, telephony-integrator, voice-script-writer, compliance-checker |
| **Ponytail** | "Lazy senior dev" pass — reviews the generated code against a minimal-code decision ladder (reuse > stdlib > native > deps > one-liner) and trims over-engineering. Never touches validation, security, or requested features. Advisory — never blocks. | — |
| **Bridge** | Checks that frontend and backend are talking to each other correctly | — |
| **Git** | Runs 10 security checks, creates branch, writes structured commit | — |

**Order (always enforced):**
```
[onboard — first use only] → database → backend → frontend + testing + calls → ponytail → bridge → git
```

---

## Security checks (always run before committing)

These block the commit automatically if found:
- `.env` file accidentally included
- Hardcoded passwords, API keys, or secrets
- Raw auth tokens in source code
- `localhost` URLs in production code
- Auth token read from browser localStorage
- Database passwords in JavaScript files
- CSP security headers missing when frontend changed

---

## Knowledge bases

Each agent keeps a personal knowledge base. Open any of these in Obsidian:
```
<install-path>/agents/backend/vault/    — route patterns, decisions, security rules
<install-path>/agents/frontend/vault/   — design tokens, storage rules, components
<install-path>/agents/database/vault/   — schemas, migrations, query notes
<install-path>/agents/testing/vault/    — Postman collections, test reports
<install-path>/agents/gitdevops/vault/  — branch history, security scan results
<install-path>/agents/mcpbridge/vault/  — contract validation history
```

---

## How to install this plugin

In Claude Code, register this repo as a plugin marketplace, then install it:

```
/plugin marketplace add MARafey/The-Software-Engineer
/plugin install software-engineer@software-engineer
```

Then type `/software-engineer` — the first run clones the engine to `~/.agents`, installs dependencies, and seeds the knowledge bases automatically.

To update later:
```
/plugin marketplace update software-engineer
/software-engineer update
```

> Note: installing a loose `software-engineer.md` into `~/.claude/skills/` does **not** work — Claude Code only loads skills that live in a folder as `skills/<name>/SKILL.md` (which is exactly how this plugin ships it).
