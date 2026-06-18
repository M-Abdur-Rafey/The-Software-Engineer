---
name: software-engineer
description: Automated full-stack software engineering — one command runs the entire dev lifecycle. Database schema → backend routes → frontend components → Postman tests → security scan → git commit. Installs itself on first run.
---

# Software Engineer

A multi-agent orchestration system that covers the full software development lifecycle:

**database → backend → frontend → testing → security scan → git commit**

Every agent has its own persistent SQLite knowledge base and Obsidian-compatible knowledge vault. They learn from each session and carry context across future runs — no hallucinating, no repeating yourself.

---

## On every invocation — follow these steps exactly

### Step 1: Resolve install path and check if installed

- **Windows:** install path = `$env:USERPROFILE\.agents`
- **macOS/Linux:** install path = `$HOME/.agents`

Check if installed by looking for the orchestrator database:
- Windows: `Test-Path "$env:USERPROFILE\.agents\shared\orchestrator.db"`
- macOS/Linux: `[ -f "$HOME/.agents/shared/orchestrator.db" ]`

### Step 2: Auto-install on first run (skip if already installed)

Tell the user: _"First run detected — installing Software Engineer agents (~30 seconds)..."_

**Windows (PowerShell):**
```powershell
git clone https://github.com/YOUR_GITHUB_USERNAME/software-engineer "$env:USERPROFILE\.agents" --depth 1
Set-Location "$env:USERPROFILE\.agents"
npm install --silent
node init/bootstrap.js
node init/seed-vaults.js
node init/verify.js
```

**macOS/Linux (bash):**
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/software-engineer "$HOME/.agents" --depth 1
cd "$HOME/.agents"
npm install --silent && node init/bootstrap.js && node init/seed-vaults.js && node init/verify.js
```

- If `verify.js` exits 0: tell user _"Installed successfully. Obsidian vaults are ready at `<install-path>/agents/*/vault/` — open any as a new vault in Obsidian."_
- If it fails: show the error output, stop, and ask the user to report the issue.

**Prerequisites check** — before cloning, verify:
1. `git --version` works — if not: _"Git is required. Install from https://git-scm.com"_
2. `node --version` works — if not: _"Node.js 18+ is required. Install from https://nodejs.org"_

### Step 3: Parse command and route

Parse the full invocation: `/software-engineer <subcommand or task>`

| Invocation | Action |
|------------|--------|
| `/software-engineer <task text>` | Run full orchestration pipeline |
| `/software-engineer status` | Show recent sessions |
| `/software-engineer update` | Pull latest version and re-init |
| `/software-engineer onboard` | Learn the current project structure |
| `/software-engineer help` | Show usage examples |

---

## Subcommand: run the pipeline (default)

When the user provides a task description, run the full orchestration.

**Get current project path:**
- Windows: `(Get-Location).Path`
- macOS/Linux: `pwd`

**Invoke the orchestrator workflow:**
```javascript
Workflow({
  scriptPath: `<install-path>/.claude/workflows/orchestrate.js`,
  args: {
    task: "<task text from user>",
    projectPath: "<current working directory>"
  }
})
```

**After workflow completes, summarize:**
- Branch created and commit hash
- Which agents ran (database / backend / frontend / testing / bridge / git)
- Any contract violations or security flags that blocked the commit
- Postman collection path if testing agent ran
- Obsidian vault notes added this session

---

## Subcommand: status

Show the last 10 sessions from the orchestrator database.

Run:
```
node <install-path>/shared/lib/db-cli.js query orchestrator "SELECT id, task_text, status, started_at, completed_at FROM sessions ORDER BY started_at DESC LIMIT 10"
```

Format and display the results as a table. Show: session ID (first 8 chars), task, status, duration.

---

## Subcommand: update

Pull the latest version of the system and re-run init.

```powershell
# Windows
Set-Location "$env:USERPROFILE\.agents"
git pull origin main
npm install --silent
node init/bootstrap.js
node init/verify.js
```

```bash
# macOS/Linux
cd "$HOME/.agents" && git pull origin main && npm install --silent && node init/bootstrap.js && node init/verify.js
```

Tell user which version they're now on (`git log -1 --oneline`).

---

## Auto-onboarding (happens automatically — no command needed)

The first time any task is run on a project the system has never seen, it runs a full codebase scan automatically before doing any work. You do not need to run a separate onboard command.

The scan covers:
- All existing routes (method, path, middleware, auth requirement)
- All components (type, file, which APIs they call)
- Full database schema (tables, columns, foreign keys, migrations)
- Code conventions (commit style, import style, naming, linter config)
- Security posture (CORS, CSP, input validation, token storage method)
- Tech stack (framework, ORM, state management, styling, auth)

All findings are saved to every agent's knowledge.db and vault before the first session runs.

## Subcommand: onboard (force re-scan)

Forces a fresh codebase scan on the current project, even if it was onboarded before. Useful after a major refactor or when switching to a different codebase at the same path.

Get the current project path. Then run:
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

After onboarding, agents know:
- All existing API routes and their contracts
- Existing component structure and API bindings
- Database tables, relationships, and migration history
- Naming conventions, import style, and error handling patterns
- Security status: token storage, CORS, CSP, input validation

---

## Subcommand: help

Show this:

```
/software-engineer <task>            — Run full pipeline on current project
/software-engineer status            — Show recent sessions
/software-engineer update            — Update to latest version
/software-engineer onboard           — Learn current project structure

Examples:
  /software-engineer add user authentication with JWT and refresh tokens
  /software-engineer fix the broken /api/orders route returning 500
  /software-engineer create a products table with categories
  /software-engineer add a dashboard page showing sales statistics
  /software-engineer generate Postman tests for all existing routes
  /software-engineer add CSP and security headers to the backend
```

---

## What each agent does

| Agent | Responsibility | Sub-agents |
|-------|---------------|------------|
| **Database** | Migration SQL, FK validation, index optimization | table-creator, schema-validator, query-optimizer |
| **Backend** | Express routes, controllers, services, JSDoc, READMEs | flow-planner, route-creator, code-standards, folder-structure |
| **Frontend** | Components, API wiring, storage decisions | ui-designer, component-creator, api-request-handler, security-checker |
| **Testing** | Postman v2.1 collection with positive/negative/auth tests | *(single-phase)* |
| **Bridge** | Validates frontend↔backend↔database contract consistency | *(single-phase)* |
| **Git** | 10-point security scan → feature branch → Conventional Commit | *(single-phase)* |

**Dependency order (always enforced):**
```
database → backend → frontend + testing (parallel) → bridge → git
```

---

## Security rules enforced automatically

The git agent blocks commits if any of these are detected:

- `.env` files staged for commit
- Hardcoded API keys, passwords, or secrets in source
- Raw bearer tokens in source code
- `localhost` URLs in non-test files
- Auth token read from `localStorage`
- Database credentials in `.js` or `.json` files
- CSP headers missing when frontend files changed

---

## Knowledge bases (Obsidian vaults)

Each agent maintains a living Markdown knowledge base. Open any of these folders as a vault in Obsidian:

```
~/.agents/agents/backend/vault/      — Express patterns, security, decisions
~/.agents/agents/frontend/vault/     — Design tokens, storage rules, components
~/.agents/agents/database/vault/     — Schemas, migrations, query patterns
~/.agents/agents/testing/vault/      — Postman collections, test reports
~/.agents/agents/gitdevops/vault/    — Branch strategy, security scan results
~/.agents/agents/mcpbridge/vault/    — Contract validation history
```

---

## How to install this skill

**Windows (PowerShell — one command):**
```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null; Invoke-WebRequest -Uri "https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/software-engineer/main/skill.md" -OutFile "$env:USERPROFILE\.claude\skills\software-engineer.md"
```

**macOS/Linux (one command):**
```bash
mkdir -p ~/.claude/skills && curl -o ~/.claude/skills/software-engineer.md https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/software-engineer/main/skill.md
```

Then open Claude Code and type `/software-engineer` — it installs itself automatically.
