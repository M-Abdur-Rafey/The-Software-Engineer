# Software Engineer

A multi-agent Claude Code skill that automates the full software development lifecycle.

One command. Every agent runs in sequence — database schema, backend routes, frontend components, Postman tests, security scan, git commit. Each agent has its own SQLite knowledge base and Obsidian vault that grows smarter with every session.

---

## Install (one command)

**Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null; Invoke-WebRequest -Uri "https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/software-engineer/main/skill.md" -OutFile "$env:USERPROFILE\.claude\skills\software-engineer.md"
```

**macOS/Linux:**
```bash
mkdir -p ~/.claude/skills && curl -o ~/.claude/skills/software-engineer.md https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/software-engineer/main/skill.md
```

That's it. Open Claude Code and run `/software-engineer` — it clones this repo and sets up everything automatically on first use.

---

## Usage

```
/software-engineer <task>
```

```
/software-engineer add user authentication with JWT and refresh tokens
/software-engineer fix the broken /api/orders route returning 500
/software-engineer create a products table with categories and inventory
/software-engineer add a dashboard page showing sales statistics
/software-engineer generate Postman tests for all existing routes
/software-engineer add CSP and security headers to the backend
```

Other commands:
```
/software-engineer onboard      — force re-scan of current project (auto-runs on first use)
/software-engineer status       — show recent sessions
/software-engineer update       — pull latest version
/software-engineer help         — show all commands
```

---

## What happens when you run a task

**First use on any project:** the system automatically scans your entire codebase before doing anything — routes, components, schema, conventions, security posture. This runs once per project and is stored in the agent knowledge bases. Every future session starts with that context already loaded.

Six agents then run in dependency order:

```
[onboard — first use only] → database → backend → frontend + testing (parallel) → bridge → git
```

| Agent | Does |
|-------|------|
| **Database** | Writes migration SQL, validates foreign keys, adds indexes |
| **Backend** | Creates Express routes, controllers, services with JSDoc |
| **Frontend** | Builds components, wires API calls, enforces token/storage rules |
| **Testing** | Generates Postman collection (positive + negative + auth tests per route) |
| **Bridge** | Validates that frontend bindings match backend contracts |
| **Git** | Runs 10-point security scan, creates feature branch, writes Conventional Commit |

---

## Security rules (enforced before every commit)

The git agent blocks commits that contain:

- `.env` files
- Hardcoded API keys, passwords, or secrets
- Raw JWT/bearer tokens in source
- `localhost` URLs in non-test files
- Auth tokens read from `localStorage`
- Database credentials in `.js` or `.json`

---

## Knowledge bases

Each agent builds up its own Obsidian-compatible knowledge vault at `~/.agents/agents/<name>/vault/`. Open any vault folder in Obsidian as a new vault to browse decisions, patterns, and session history.

```
~/.agents/agents/backend/vault/     Express patterns, security rules, route decisions
~/.agents/agents/frontend/vault/    Design tokens, storage rules, component library
~/.agents/agents/database/vault/    Schemas, migrations, query optimization notes
~/.agents/agents/testing/vault/     Postman collections, test reports
~/.agents/agents/gitdevops/vault/   Branch strategy, security scan results
~/.agents/agents/mcpbridge/vault/   Contract validation history
```

---

## Requirements

- [Claude Code](https://claude.ai/code) — CLI or IDE extension
- [Node.js](https://nodejs.org) 18 or later
- [Git](https://git-scm.com)
- [Obsidian](https://obsidian.md) *(optional — for browsing agent knowledge bases)*

---

## How it works internally

The skill file (`skill.md`) is the only file you install manually. Everything else is handled automatically:

1. First `/software-engineer` invocation → skill clones this repo to `~/.agents/`
2. `npm install` fetches `better-sqlite3`, `uuid`, `chalk`, `ajv`
3. `node init/bootstrap.js` creates all SQLite databases and contract schemas
4. `node init/seed-vaults.js` writes the initial Obsidian vault notes
5. All future runs go straight to the orchestration workflow

The agents communicate through typed JSON contracts validated against JSON Schema. The bridge agent blocks the git commit if any frontend↔backend or backend↔database contracts are inconsistent.

---

## Updating

```
/software-engineer update
```

Or manually:
```bash
cd ~/.agents && git pull origin main && npm install && node init/bootstrap.js && node init/verify.js
```
