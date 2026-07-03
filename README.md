# Software Engineer

A multi-agent system that automates the full software development lifecycle — as a **Claude Code plugin** (the `/software-engineer` command) and as a **cross-IDE MCP server** (Cursor, Windsurf, VS Code, and other MCP editors).

One command. Every agent runs in sequence — requirements spec, database schema, backend routes, frontend components, Postman tests, inbound/outbound call systems, simplification pass, contract validation, security scan, git commit, and a post-release SRE review that feeds the next cycle. Each agent has its own SQLite knowledge base and Obsidian vault that grows smarter with every session.

---

## Install

In Claude Code, register this repo as a plugin marketplace, then install the plugin:

```
/plugin marketplace add MARafey/The-Software-Engineer
/plugin install software-engineer@software-engineer
```

That's it. Then run:

```
/software-engineer start
```

`start` is the one-command setup: it clones this repo to `~/.agents`, installs dependencies, seeds the knowledge bases, scans your current project, and builds its code knowledge graph — leaving you ready to build. (Running any `/software-engineer <task>` also auto-installs on first use, but `start` gets everything, including the graph, in one shot.)

> Why a plugin and not a loose file? Claude Code only loads skills that live in a folder as `skills/<name>/SKILL.md`. Dropping a single `software-engineer.md` into `~/.claude/skills/` will **not** register the slash command — the plugin packaging is what makes `/software-engineer` appear.

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
/software-engineer start        — one-command setup: install + scan project + build code graph
/software-engineer test         — run health checks, verify install is working (no files modified)
/software-engineer onboard      — force re-scan of current project (auto-runs on first use)
/software-engineer graph        — build a filtered code knowledge graph of the project (Obsidian)
/software-engineer status       — show recent sessions
/software-engineer update       — pull latest version
/software-engineer help         — show all commands
```

---

## Other editors (Cursor, Windsurf, VS Code) — MCP server

Not on Claude Code? The same orchestrator is exposed as an MCP server, so any MCP-capable editor can use it. After the engine is set up (clone + `npm run init` — see *How it works internally*), point the editor at `node ~/.agents/mcp/server.mjs`:

```json
{
  "mcpServers": {
    "software-engineer": { "command": "node", "args": ["~/.agents/mcp/server.mjs"] }
  }
}
```

Tools: `software_engineer_health`, `software_engineer_classify`, and `software_engineer_orchestrate` (plan by default; pass `apply: true` to write files). Reasoning uses the host's model via MCP sampling, or `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` when sampling isn't available — no keys are bundled. Per-editor setup in [`mcp/README.md`](mcp/README.md).

---

## Before building anything, it asks you

Before writing code, the system asks plain-language questions to remove all guesswork:

- **Frontend tasks:** What colors? Top bar or side menu? Mobile-friendly?
- **Backend tasks:** JWT auth or sessions? Rate limiting? API versioning?
- **Database tasks:** Soft delete or hard delete? UUIDs or integers? Expected data size?

For each decision, it shows you its recommendation first and asks if you agree. You can answer all questions at once or just say "use your recommendations" to accept all defaults.

If you share a mockup image or screenshot, it reads it and only asks about the parts that are unclear — not generic "what do you want?" questions.

---

## What happens when you run a task

**First use on any project:** the system automatically scans your entire codebase before doing anything — routes, components, schema, conventions, security posture. This runs once per project and is stored in the agent knowledge bases. Every future session starts with that context already loaded.

The pipeline mirrors the full software delivery lifecycle — requirements → design → build → test → release → operate — with a feedback loop from operations back into requirements:

```mermaid
flowchart TD
    U(["👤 You<br/>/software-engineer &lt;task&gt;"]) --> O["🧠 Orchestrator<br/>classify · sequence · pass contracts"]

    O --> ONB["🔍 Onboard<br/><i>first use only — deep codebase scan</i>"]
    ONB --> REQ

    subgraph PLAN["📋 Plan"]
        REQ["📝 Requirements<br/>signals → user stories → spec"]
    end

    subgraph BUILD["🏗️ Build"]
        DB[("🗄️ Database<br/>tables · migrations · indexes")]
        BE["⚙️ Backend<br/>routes · services · AI micro-agents"]
        FE["🎨 Frontend<br/>components · art direction · 3D"]
        TEST["🧪 Testing<br/>Postman: positive · negative · auth"]
        CALLS["📞 Calls<br/>IVR · campaigns · compliance"]
    end

    subgraph GATE["✅ Refine & Gate"]
        PONY["✂️ Ponytail<br/>trims over-engineering<br/><i>advisory — never blocks</i>"]
        BRIDGE["🌉 MCP Bridge<br/>cross-domain contract validation<br/>🚫 blocks commit on violation"]
    end

    subgraph SHIP["🚀 Release & Operate"]
        GIT["🔐 Git/DevOps<br/>10-point security scan → branch → commit"]
        SRE["📡 SRE<br/>health · root-cause · drift · metrics<br/><i>advisory — never blocks</i>"]
    end

    REQ -->|spec + stories| DB
    DB -->|DatabaseOutput| BE
    BE -->|BackendOutput| FE
    BE -->|routes| TEST
    BE --> CALLS
    DB --> CALLS
    FE & TEST & CALLS --> PONY
    PONY --> BRIDGE
    BRIDGE -->|"passed ✔"| GIT
    BRIDGE -.->|"violations ✖ — session blocked"| O
    GIT --> SRE
    SRE -.->|"feedback closes the loop"| REQ

    style PLAN fill:#e8f0fe,stroke:#4285f4
    style BUILD fill:#e6f4ea,stroke:#34a853
    style GATE fill:#fef7e0,stroke:#f9ab00
    style SHIP fill:#fce8e6,stroke:#ea4335
```

Frontend, Testing, and Calls run **in parallel** once the backend contract exists.

| Agent | Icon | Does |
|-------|------|------|
| **Requirements** | 📝 | Runs first (spec-driven development). Synthesizes signals — your task, project logs/bug reports, last cycle's SRE feedback — into user stories with Given/When/Then acceptance criteria and a spec whose Decisions table pins every choice the other agents would otherwise guess. Undecidable items come back to you as open questions |
| **Database** | 🗄️ | Writes migration SQL, validates foreign keys, adds indexes |
| **Backend** | ⚙️ | A *data-architect* first plans lean data access — a single shared DB pool, disciplined AI queries (read-only, `LIMIT` + filters, no `SELECT *`), caching/lookup tables — then routes, controllers, services with JSDoc. AI/LLM features follow a full model lifecycle (traceable data, bias checks, fairness evaluation) |
| **Frontend** | 🎨 | Builds components, wires API calls, enforces token/storage rules. Dedicated *layout / positioning / contrast* specialists handle complex parent-child CSS. 3D tasks invoke Opus for scene/physics/shader design |
| **Testing** | 🧪 | Generates Postman collection (positive + negative + auth tests per route), deriving test data from the spec's acceptance criteria |
| **Calls** | 📞 | Inbound IVR flows, outbound dialing campaigns, Twilio/Vonage webhooks, TTS scripts, TCPA/GDPR/DNC compliance |
| **Ponytail** | ✂️ | The "lazy senior dev": reviews the generated code and applies behavior-preserving simplifications — never touching validation, security, or accessibility. Advisory, never blocks |
| **Bridge** | 🌉 | Validates that frontend bindings and telephony webhooks match backend contracts, and that handlers reference real tables. Any blocking violation stops the pipeline before commit |
| **Git/DevOps** | 🔐 | Runs the 10-point security scan, creates a feature branch, writes a Conventional Commit. No force-override exists by design |
| **SRE** | 📡 | Runs last (operate phase): health checks, log/root-cause diagnostics, IaC review, model-drift monitoring, and outcome metrics (coverage, violations — never lines of code). Its feedback is what Requirements reads next session |

### Release sign-off — nobody signs their own work

Borrowed from aerospace engineering: a drawing is never released by the person who drew it. Every session passes an independent chain, and each stage verifies its own discipline:

```mermaid
flowchart LR
    D["✏️ Designer<br/><i>domain agents</i><br/>make the change"]
    C["🔎 Checker<br/><i>ponytail</i><br/>standards & simplicity"]
    S["🏋️ Stress engineer<br/><i>bridge</i><br/>do the contracts hold?"]
    M["🏭 Manufacturing<br/><i>testing</i><br/>can it be exercised?"]
    R["🖋️ Certified releaser<br/><i>git/devops</i><br/>security scan → commit"]

    D --> C --> S --> M --> R
    S -- "violation → STOP 🚫<br/>plain-language failure scenario required" --> X(["no commit"])

    style X fill:#fce8e6,stroke:#ea4335
```

Two rules are absolute: a failed gate **blocks even under schedule pressure** (there is no force flag), and every blocking violation must explain its concrete failure scenario in plain language — a known risk poorly explained counts as a sign-off failure.

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

Each agent builds up its own Obsidian-compatible knowledge vault at `~/.agents/agents/<name>/vault/`.

```
~/.agents/agents/orchestrator/vault/  Routing, dependency order, per-task session history
~/.agents/agents/requirements/vault/  Specs, user stories, signal-synthesis playbooks
~/.agents/agents/backend/vault/       Express patterns, security rules, AI model lifecycle, route decisions
~/.agents/agents/frontend/vault/      Design tokens, storage rules, 3D scene patterns, component library
~/.agents/agents/database/vault/      Schemas, migrations, query optimization notes
~/.agents/agents/testing/vault/       Postman collections, test reports
~/.agents/agents/calls/vault/         IVR flows, campaign patterns, TTS scripts, TCPA/GDPR compliance
~/.agents/agents/ponytail/vault/      Minimal-code philosophy, review history
~/.agents/agents/gitdevops/vault/     Branch strategy, secure-by-design principles, scan results
~/.agents/agents/mcpbridge/vault/     Contract validation history, release sign-off discipline
~/.agents/agents/sre/vault/           Root-cause runbooks, drift monitoring, outcome metrics
```

## Code knowledge graph (`/software-engineer graph`)

The vaults above map the **orchestration system**. To map **your project's own code**, run `/software-engineer graph` — it parses the codebase (reusing the onboarding scan) and emits a *filtered* Obsidian graph containing only entities that actually exist in the source. Theoretical or unused nodes are deliberately excluded so the graph stays lean instead of overflowing.

```mermaid
flowchart LR
    subgraph FEAT["📦 feature: users"]
      direction TB
      C["🎨 cmp-UserList<br/><i>page</i>"] -->|calls| R["⚙️ route-get-api-users<br/><i>GET /api/users · auth</i>"]
      R -->|reads-writes| T[("🗄️ tbl-users<br/><i>id · email · created_at</i>")]
    end
    T -->|fk| T2[("🗄️ tbl-orders")]

    style FEAT fill:#e8f0fe,stroke:#4285f4
```

Each node becomes an Obsidian note with **YAML frontmatter metadata** (file path, HTTP method, columns, auth) and `[[wikilinks]]` for every real relationship — `calls` (component → route), `reads-writes` (route → table), `fk` (table → table), and `belongs-to` (entity → feature). The output lands in `agents/orchestrator/vault/projects/<name>/graph/` (git-ignored, personal) plus a machine-readable `graph.json` for tooling. Open that vault in Obsidian and switch to Graph View to navigate your codebase as a live map.

### See the whole graph

The vaults are cross-linked with Obsidian `[[wikilinks]]`. To navigate the system as one
connected knowledge graph, **open the `~/.agents/agents/` folder itself as a single Obsidian vault**
(not an individual agent folder). You'll get:

- an **orchestrator** hub note linking to every domain agent, plus the dependency order;
- a **home note per agent** showing what it reads from (upstream), hands off to (downstream), and is validated by;
- **sub-agent** notes wired into each domain's internal pipeline (e.g. `flow-planner → route-creator → …`);
- **per-task session notes** the orchestrator writes in real time as work runs.

Open Obsidian's Graph View to see the agents and their contract flow as a live map.

---

## Requirements

- [Claude Code](https://claude.ai/code) — CLI or IDE extension
- [Node.js](https://nodejs.org) 18 or later
- [Git](https://git-scm.com)
- [Obsidian](https://obsidian.md) *(optional — for browsing agent knowledge bases)*

---

## How it works internally

You install the plugin once (see above). Everything else is handled automatically:

1. First `/software-engineer` invocation → skill clones this repo to `~/.agents/`
2. `npm install` fetches `better-sqlite3`, `uuid`, `chalk`, `ajv`, `@modelcontextprotocol/sdk`
3. `node init/bootstrap.js` creates all SQLite databases and contract schemas
4. `node init/seed-vaults.js` writes the initial Obsidian vault notes
5. All future runs go straight to the orchestration workflow

### How the agents talk to each other

There are two separate layers — runtime coordination and persistent knowledge — and they never mix:

```mermaid
flowchart LR
    subgraph RT["⚡ Coordination (per task, runtime)"]
        direction TB
        W1["⚙️ Agent A"] -- "📄 typed JSON contract<br/><i>validated against JSON Schema</i>" --> W2["🎨 Agent B"]
        W1 & W2 --> LOG[("🗂️ orchestrator.db<br/>session log")]
    end

    subgraph KN["📚 Knowledge (persistent, grows every session)"]
        direction TB
        V["🪨 Obsidian vault per agent<br/><i>[[wikilinked]] into one graph</i>"]
        K[("💾 knowledge.db per agent<br/>decisions · patterns")]
        ACL{{"🔒 ACL<br/>write own only ·<br/>read own + upstream"}}
        ACL --- V
        ACL --- K
    end

    RT -.->|"lessons learned are saved as decisions"| KN
    KN -.->|"each agent loads its context at start"| RT
```

- **Coordination:** each workflow returns a typed JSON contract (`shared/contracts/*.schema.json`) that the next agent consumes — e.g. frontend binds only to routes the backend actually declared. The bridge agent blocks the git commit if any frontend↔backend or backend↔database contract is inconsistent.
- **Knowledge:** each agent owns an Obsidian vault + SQLite `knowledge.db`. Access is scoped — an agent writes only its own knowledge and reads only its own plus its upstream dependencies (the SRE and validation agents read everything). Database queries from agents are read-only and result-capped so they can't balloon context.

---

## Updating

```
/software-engineer update
```

Or manually:
```bash
cd ~/.agents && git pull origin master && npm install && node init/bootstrap.js && node init/verify.js
```
