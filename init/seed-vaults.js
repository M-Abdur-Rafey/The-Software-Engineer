'use strict';
/**
 * Seed: writes initial Markdown knowledge base notes into each agent vault.
 * Run after bootstrap: node init/seed-vaults.js
 */
const path = require('path');
const AGENTS_DIR = path.resolve(__dirname, '..');
const { writeNote, updateIndexMd } = require(path.join(AGENTS_DIR, 'shared', 'lib', 'vault'));
const { createLogger } = require(path.join(AGENTS_DIR, 'shared', 'lib', 'logger'));
const log = createLogger('seed');

// ─── Backend vault ────────────────────────────────────────────────────────────
writeNote('backend', 'architecture/express-patterns.md', `# Express.js Patterns

## Middleware order
1. \`cors()\` — always first
2. \`express.json()\` — body parsing
3. \`helmet()\` — security headers
4. Auth middleware (per-router, not global)
5. Route handlers
6. Global error handler (last)

## Feature folder layout
\`\`\`
src/features/<name>/
  routes.js       # exports array of { method, path, handler, middleware[], description, authRequired }
  controller.js   # thin request/response layer — no business logic
  service.js      # all business logic here
  README.md       # what this feature does, endpoints it exposes
\`\`\`

## Error response format
\`\`\`js
{ success: false, code: 'ERR_CODE', message: 'Human readable', details: {} }
\`\`\`
Never leak stack traces. Use a code string for programmatic handling.

## Route contract export
Every routes.js MUST export an array:
\`\`\`js
module.exports = [
  {
    method: 'POST',
    path: '/api/users',
    handler: require('./controller').createUser,
    middleware: [validateBody(createUserSchema)],
    description: 'Create a new user account',
    requestBodySchema: { email: 'string', password: 'string' },
    responseSchema: { success: true, data: { id: 'string', email: 'string' } },
    authRequired: false,
  },
];
\`\`\`
`);

writeNote('backend', 'patterns/route-template.md', `# Route Template

\`\`\`js
// src/features/<name>/routes.js
'use strict';
const controller = require('./controller');
const { authenticate } = require('../../middleware/auth');
const { validateBody } = require('../../middleware/validate');
const schema = require('./schema');

module.exports = [
  {
    method: 'GET',
    path: '/api/<name>',
    handler: controller.list,
    middleware: [authenticate],
    description: 'List all <name> records',
    authRequired: true,
  },
  {
    method: 'POST',
    path: '/api/<name>',
    handler: controller.create,
    middleware: [authenticate, validateBody(schema.create)],
    description: 'Create a new <name> record',
    authRequired: true,
  },
];
\`\`\`

\`\`\`js
// src/features/<name>/controller.js
'use strict';
const service = require('./service');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function list(req, res) {
  try {
    const data = await service.list(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, code: 'ERR_LIST', message: err.message });
  }
}

module.exports = { list };
\`\`\`
`);

writeNote('backend', 'patterns/jsdoc-template.md', `# JSDoc Template

Every exported function must have complete JSDoc:

\`\`\`js
/**
 * @param {string} userId - The authenticated user's UUID
 * @param {Object} data - Validated request body
 * @param {string} data.email - User email address
 * @returns {Promise<{ id: string, email: string }>} Created user record
 * @throws {Error} If email already exists
 */
async function createUser(userId, data) { ... }
\`\`\`
`);

writeNote('backend', 'security/input-validation.md', `# Input Validation

## Rule: Never trust req.body

Use a schema validation middleware before every POST/PUT/PATCH handler.

Recommended: Joi or Zod.

\`\`\`js
const Joi = require('joi');

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
});
\`\`\`

## Rule: Sanitize before storing
- Trim strings
- Normalize email to lowercase
- Never store plaintext passwords — hash with bcrypt (cost 12+)

## Rule: Parameterized queries only
Never concatenate user input into SQL. Use prepared statements or an ORM.
`);

writeNote('backend', 'security/auth-middleware.md', `# Auth Middleware Pattern

\`\`\`js
// src/middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, code: 'ERR_NO_TOKEN', message: 'Missing bearer token' });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, code: 'ERR_INVALID_TOKEN', message: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
\`\`\`

Token MUST come from Authorization header. NEVER from query params or request body.
`);

// ── Python stack (added alongside the Node/Express notes — multi-stack) ──
writeNote('backend', 'architecture/python-framework-selection.md', `# Python Framework Selection (FastAPI vs Flask)

Applies when the project is a Python backend. For Node projects, follow \`architecture/express-patterns.md\` instead.

## Choose FastAPI when
- **API-first**: the project's main job is serving a REST/GraphQL API (headless backends, microservices).
- **High concurrency / I/O bound**: many simultaneous connections, websockets, real-time data, heavy external-API or DB calls.
- **Complex validation**: strict, typed validation — FastAPI's native Pydantic integration catches errors before controller logic.
- **Green-field project**: new modern microservices benefit from automatic docs + type-safety.

## Choose Flask when
- **Simple/lightweight prototypes**: small scripts, webhooks, MVPs where Pydantic models would be over-engineering.
- **Legacy integration**: needs older synchronous libraries or Flask-only extensions (Flask-Admin, Flask-Login).
- **Synchronous ML serving**: a thin wrapper around a CPU-bound, synchronous model where high concurrency is not required.

## Default
Green-field → **FastAPI** (async, Pydantic, auto OpenAPI docs).
`);

writeNote('backend', 'architecture/python-server-execution.md', `# Python Server Execution & Process Management

Never use a built-in dev server in production. Use Gunicorn as the process manager.

## Production (Gunicorn)
- **Bind**: \`0.0.0.0:<PORT>\` in containers so the app is reachable.
- **Workers**: \`(2 × NUM_CORES) + 1\`.
- **Log level**: \`info\`.
- **Worker class**:
  - FastAPI (ASGI): \`uvicorn.workers.UvicornWorker\`
  - Flask (WSGI): default sync worker (or \`gevent\`/\`eventlet\` for async I/O)

\`\`\`bash
# FastAPI
gunicorn app.main:app --bind 0.0.0.0:8000 --workers 4 --worker-class uvicorn.workers.UvicornWorker --log-level info

# Flask
gunicorn app.wsgi:app --bind 0.0.0.0:8000 --workers 4 --log-level info
\`\`\`

## Local development
Use the native server with \`--reload\` (never in production — perf + security risk).

\`\`\`bash
# FastAPI
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
# Flask
flask run --host 127.0.0.1 --port 8000 --reload
\`\`\`

Programmatic/IDE debug — bind to the local interface only:
\`\`\`python
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
\`\`\`
`);

writeNote('backend', 'architecture/middlewares.md', `# Standardized Middlewares (global)

Every backend application implements these globally.

| Middleware | Rule |
|------------|------|
| CORS | Whitelist trusted frontend domains. **Never** wildcard \`*\` origins in production. |
| Response compression | GZip payloads over a size threshold to cut bandwidth/latency. |
| Host validation | Explicitly allow domains — guards against Host-header attacks and DNS rebinding. |
| Security headers | Inject HSTS, \`X-Content-Type-Options: nosniff\`, \`X-Frame-Options: DENY\`, etc. |
| Observability | APM + metrics (Sentry, Prometheus) to capture unhandled exceptions and latency. |
| Rate limiting | Per-IP request limits to stop abuse, scraping, brute-force. |

## Global authentication middleware
Intercept requests and validate credentials (JWT, API key) before routing.

- **Uniform exceptions**: wrap token validation in try/except; cryptographic/expiry errors return a structured \`401\` JSON — never let token failures cause a \`500\`.
- **State injection**: on success, attach the decoded payload to request state (\`request.state\` / \`g\`) so handlers don't re-parse the token.
- **Route bypass**: whitelist public routes (\`/login\`, \`/health\`, docs endpoints) to skip validation.
`);

writeNote('backend', 'patterns/large-file-uploads.md', `# Large File Uploads

Never load an entire large file into memory — it blocks the server and exhausts RAM.

## Patterns
- **Chunked uploads**: client slices the file; backend appends chunks sequentially at calculated byte offsets to disk or cloud storage.
- **Streaming reads**: for single-request uploads, read the request stream in fixed chunks (~5MB) and stream straight to disk or cloud storage — bypass memory loading.
- **Direct-to-bucket**: prefer uploading large files directly to a cloud bucket (e.g. S3) via a one-time presigned URL for upload/download.
`);

writeNote('backend', 'patterns/background-jobs.md', `# Long-Running Jobs & Queuing

Heavy work (media encoding, large dataset parsing, AI inference) must never run synchronously inside the HTTP request cycle.

- In-memory framework queues are **only** for trivial, non-critical tasks (e.g. a single email) — they lose state on restart.
- For anything heavy/long-running use a distributed task queue (Celery + Redis, or equivalent).

## Architecture roles
- **Broker & result backend (Redis)**: holds the pending-job queue and persists final job state/output.
- **Task workers (Celery)**: processes decoupled from the web server; poll the broker, run the workload, report to the result backend.
`);

writeNote('backend', 'patterns/db-integration-sqlalchemy-alembic.md', `# Database Integration & Migrations (SQLAlchemy + Alembic)

## SQLAlchemy
- **Decoupling**: define models in a dedicated layer, separate from route logic.
- **Sessions**: context-managed; each request opens a session and closes/rolls back on error regardless of outcome.
- **Async/sync**: FastAPI uses \`create_async_engine\` to avoid blocking the event loop; only legacy Flask uses sync engines.

## Alembic (mandatory for schema changes)
Modifying schema via raw SQL or model edits without a migration is prohibited.

Standard workflow:
1. **Modify** the SQLAlchemy models.
2. **Generate**: \`alembic revision --autogenerate -m "description"\`.
3. **Review** the generated script (autogenerate is a starting point, not gospel).
4. **Commit** the migration file in the PR.
5. **Deploy**: run \`alembic upgrade head\` before the service starts.

Use migration scripts for data transformations when a schema change requires modifying existing rows.
`);

writeNote('backend', 'patterns/error-handling-logging.md', `# Error Handling & Logging

## Standardized errors
Catch exceptions and transform them into a consistent JSON contract — never expose raw stack traces or internal messages to clients.

\`\`\`json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "User-friendly error message"
}
\`\`\`

- **Global handlers**: catch unhandled exceptions at the framework level.
- **Custom exceptions**: domain-specific classes (\`UserNotFound\`, \`InsufficientFunds\`) mapped to HTTP status codes.
- **Log every client error** server-side at \`ERROR\` level, including the traceback.

## Logging
- Use the native \`logging\` library with a JSON formatter, or \`structlog\`.
- **Redact secrets**: filter \`password\`, \`secret\`, \`access_token\`, \`authorization\` from logged request/response objects.

> AI features in a Python backend follow \`shared/standards/ai-agent-practices.md\`.
`);

writeNote('backend', 'patterns/ai-agent-prompt-template.md', `# AI Agent Prompt Template

Used by the **prompt-engineer** sub-agent when a backend task involves an AI/LLM feature
(chatbot, classifier, RAG, tool-using agent). Follows \`shared/standards/ai-agent-practices.md\`.

Build **micro-agents**: one responsibility, narrow scope. Every AI agent MUST define all
nine sections below **before** any code is written. The point is that strict rules and
success criteria are explicit, so downstream workflows don't break on free-form output.

## Required structure
1. **Role & scope** — a single responsibility, stated narrowly.
2. **Relevance guardrail** — check the query is in-scope; if not, return a fixed refusal.
3. **Strict rules** — numbered MUST/NEVER directives.
4. **Few-shot examples** — at least 2 pairs of input → exact expected output.
5. **Output schema** — a strict JSON schema; the only allowed response shape.
6. **Validation loop** — parse output against the schema; on mismatch re-invoke (max N) with the error appended; after N failures return a structured error.
7. **Success criteria** — measurable definition of "the agent worked".
8. **Tool-calling workflow** — if tools are used, force tool use; SQL tools are read-only with \`LIMIT\` + time filters.
9. **Model & observability** — model name from an env var (never hardcode); log every action to a debug log.

## Prompt skeleton (fill every placeholder)
\`\`\`text
ROLE
You are <single-responsibility role>. You only <the one job>.

RELEVANCE GUARDRAIL
Before doing anything, decide if the user input is about <domain>.
If it is NOT, respond exactly with: <fixed polite refusal> and stop.

RULES
1. MUST <...>
2. MUST <...>
3. NEVER <...>

OUTPUT FORMAT
Respond with JSON ONLY, matching the schema below. No prose, no markdown, no code fences.

EXAMPLES
Input: <example input 1>
Output: <exact JSON output 1>

Input: <example input 2>
Output: <exact JSON output 2>
\`\`\`

## Output schema (strict — example)
\`\`\`json
{
  "type": "object",
  "required": ["intent", "confidence"],
  "additionalProperties": false,
  "properties": {
    "intent": { "type": "string", "enum": ["billing", "technical", "account", "other"] },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
  }
}
\`\`\`

## Validation loop (reference implementation)
\`\`\`python
import json, jsonschema

def run_agent(client, prompt, user_input, schema, max_retries=3):
    messages = [{"role": "user", "content": user_input}]
    for attempt in range(max_retries):
        raw = client.complete(system=prompt, messages=messages)  # model name comes from env
        try:
            data = json.loads(raw)
            jsonschema.validate(data, schema)
            return data
        except (json.JSONDecodeError, jsonschema.ValidationError) as e:
            messages.append({"role": "assistant", "content": raw})
            messages.append({"role": "user", "content": f"Invalid output: {e}. Reply with valid JSON only."})
    return {"status": "error", "code": "AGENT_OUTPUT_INVALID", "message": "Agent failed schema after retries"}
\`\`\`

## Success criteria (define per agent)
- 100% of returned outputs parse and validate against the schema.
- Out-of-scope inputs hit the guardrail refusal, not the main logic.
- When a tool is required, the tool is actually called (no hallucinated answers).
- Latency/cost within budget (use a lightweight/"mini" model for basic tasks).

## Worked example — support-ticket classifier
\`\`\`text
ROLE
You are a support-ticket classifier. You only assign one intent label and a confidence score.

RELEVANCE GUARDRAIL
If the input is not a customer support message, respond exactly:
{"intent": "other", "confidence": 0.0}

RULES
1. MUST choose exactly one intent from: billing, technical, account, other.
2. MUST return confidence in [0, 1].
3. NEVER add commentary, apologies, or fields outside the schema.

OUTPUT FORMAT
JSON only, matching the schema.

EXAMPLES
Input: "I was charged twice this month"
Output: {"intent": "billing", "confidence": 0.96}

Input: "The app crashes when I upload a file"
Output: {"intent": "technical", "confidence": 0.93}
\`\`\`

Artifacts produced per AI agent (written into the target project):
- \`src/ai/<agent-name>/prompt.md\` — the full prompt + few-shot examples.
- \`src/ai/<agent-name>/schema.json\` — the strict output schema used by the validation loop.
`);

log.ok('backend vault seeded');

// ─── Frontend vault ───────────────────────────────────────────────────────────
writeNote('frontend', 'design-system/tokens.md', `# Design System Tokens

## Colors
Define a CSS custom property palette in :root — never use hardcoded hex values in components.

\`\`\`css
:root {
  --color-primary:    #2563eb;
  --color-secondary:  #7c3aed;
  --color-success:    #16a34a;
  --color-warning:    #d97706;
  --color-error:      #dc2626;
  --color-surface:    #ffffff;
  --color-on-surface: #111827;
  --color-muted:      #6b7280;
  --color-border:     #e5e7eb;
}
\`\`\`

## Typography scale
- xs: 0.75rem / 1rem
- sm: 0.875rem / 1.25rem
- base: 1rem / 1.5rem
- lg: 1.125rem / 1.75rem
- xl: 1.25rem / 1.75rem
- 2xl: 1.5rem / 2rem
- 3xl: 1.875rem / 2.25rem

## Spacing scale (base 4px)
4, 8, 12, 16, 24, 32, 48, 64, 96, 128px
`);

writeNote('frontend', 'state-management/storage-rules.md', `# Storage Sensitivity Rules

| Data type              | Allowed storage                          | Forbidden                  |
|------------------------|------------------------------------------|----------------------------|
| Auth tokens (JWT/session) | Authorization header only (memory)   | localStorage, sessionStorage, URL |
| Session identity       | sessionStorage or in-memory state        | localStorage               |
| User preferences       | localStorage                             | —                          |
| App / UI state         | Redux, Zustand, Context                  | window.*, global vars      |
| Sensitive PII          | Never stored client-side                 | Any client storage         |

## Implementation rules
1. Tokens are stored in a module-level variable after login, cleared on logout/refresh.
2. API calls inject the token from the in-memory store, not from any DOM or storage API.
3. On page reload, the user must re-authenticate (no persistent token in storage).
   Exception: "remember me" flows — store a refresh token in an httpOnly cookie (server-set), never in JS-accessible storage.
`);

writeNote('frontend', 'security/bearer-token-rules.md', `# Bearer Token Rules

## Correct
\`\`\`js
// api/auth.api.js — token lives in memory
let _token = null;

export function setToken(t) { _token = t; }
export function clearToken() { _token = null; }

export function authedFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      Authorization: _token ? \`Bearer \${_token}\` : undefined,
    },
  });
}
\`\`\`

## WRONG — blocks git commit
\`\`\`js
// Never do these:
const token = localStorage.getItem('token');                 // localStorage
fetch('/api/data', { body: JSON.stringify({ token }) });     // token in body
fetch(\`/api/data?token=\${token}\`);                          // token in URL
\`\`\`
`);

writeNote('frontend', 'security/csp-cors.md', `# CSP and CORS

## CSP header (set in backend, not frontend)
\`\`\`
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' <your-api-origin>;
  frame-ancestors 'none';
\`\`\`

## Required security headers
\`\`\`
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
\`\`\`

## CORS (Express)
\`\`\`js
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
\`\`\`
NEVER use \`origin: '*'\` when credentials are sent.
`);

writeNote('frontend', 'design-system/component-checklist.md', `# Component Checklist

Before marking a component done:
- [ ] Keyboard navigable (Tab, Enter, Escape, arrow keys where applicable)
- [ ] ARIA attributes: role, aria-label, aria-describedby as needed
- [ ] Responsive: tested at 320px, 768px, 1024px, 1440px
- [ ] Error state: shows meaningful message, not raw API error
- [ ] Loading state: skeleton or spinner, not blank
- [ ] Empty state: shown when list is empty
- [ ] No inline styles — all via CSS variables or utility classes
`);

// ── Modern React + TypeScript stack (multi-stack, added alongside existing notes) ──
writeNote('frontend', 'architecture/react-ts-vite-stack.md', `# React + TypeScript + Vite Stack

## Framework & environment
- **React (LTS) with strict TypeScript.** Mixing JavaScript or using \`any\` is prohibited.
- **No Next.js.** Build Client-Side Rendered (CSR) SPAs with **Vite**.
- Use a specific, declared **Node.js LTS** version.
- **UI library**: Ant Design or Material-UI, with custom styles and **framer-motion**.

## tsconfig
- \`"strict": true\`, \`"noImplicitAny": true\`. Type every prop, hook, and API response.
`);

writeNote('frontend', 'architecture/structure-and-state.md', `# Structure & State

## Directory structure (standardized)
\`\`\`
src/
  components/   # presentational + container components
  hooks/        # reusable hooks
  services/     # API clients
  store/        # client state (Context / Redux)
\`\`\`

## Rendering
- Component-level rendering, not full-page re-renders.
- Optimize with \`useMemo\` and \`useCallback\`.

## State
- **Server state**: TanStack Query (React Query) for API caching. Do **not** store raw API data in global client state.
- **Client state**: Context API or Redux for UI state (themes, toggles, etc.).
`);

writeNote('frontend', 'security/web-security-and-validation.md', `# Web Security, Validation & Compliance

(Complements \`security/csp-cors.md\` and \`security/bearer-token-rules.md\`.)

## Security headers (injected by the web server)
\`\`\`
Content-Security-Policy: ...
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
\`\`\`

## Dependency & secret checks
- Scan third-party packages (\`npm audit\`, Dependabot) before pushing.
- Check for hardcoded secrets — none in source.

## Config isolation
- All sensitive variables, URLs, endpoints, and ports live strictly in \`.env\` files.

## Validation
- Sanitize special characters and run schema validation (**Zod / Yup + React Hook Form**) on every input that triggers an API.

## Bulk uploads
- Pass CSV/Excel files as **raw payloads** to the backend. Do **not** parse rows on the client — let the backend use SQL \`COPY\`.

## AI & crawlers
- Include \`llms.txt\` and \`robots.txt\` at the project root to manage scrapers.
`);

// ── 3D design knowledge base ──
writeNote('frontend', '3d/three-js-scene-setup.md', `# Three.js Scene Setup

## Minimal scene boilerplate

\`\`\`js
import * as THREE from 'three'

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))  // cap at 2
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 2, 5)

// Standard lighting rig
const ambient = new THREE.AmbientLight(0xffffff, 0.4)
const sun = new THREE.DirectionalLight(0xffffff, 1.2)
sun.position.set(5, 10, 5)
sun.castShadow = true
sun.shadow.mapSize.setScalar(2048)
sun.shadow.camera.near = 0.1
sun.shadow.camera.far = 50
scene.add(ambient, sun)

// Animation loop
const clock = new THREE.Clock()
function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()  // frame-rate independent
  renderer.render(scene, camera)
}
animate()

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
\`\`\`

## React Three Fiber equivalent

\`\`\`jsx
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Environment } from '@react-three/drei'

export function Scene() {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{ position: [0, 2, 5], fov: 75 }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <Environment preset="city" />
      <MyMesh />
    </Canvas>
  )
}
\`\`\`

## Dispose pattern (memory management)

Always clean up on component unmount or route change:

\`\`\`js
function disposeObject(obj) {
  obj.traverse(child => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
      else child.material.dispose()
    }
  })
}
renderer.dispose()
\`\`\`
`);

writeNote('frontend', '3d/physics-engines.md', `# Physics Engine Selection & Setup

## Comparison

| Engine | Size | Accuracy | Best for |
|--------|------|----------|----------|
| cannon-es | ~120KB | Good | Simple rigid bodies, joints, vehicles |
| @dimforge/rapier3d-compat | ~2MB WASM | Excellent | Complex scenes, accurate collisions |
| ammo.js | ~3MB | Excellent | Bullet port — full feature parity |

## cannon-es setup

\`\`\`js
import * as CANNON from 'cannon-es'

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
  broadphase: new CANNON.SAPBroadphase(),  // faster than NaiveBroadphase for many bodies
})
world.solver.iterations = 10

// Create a box body
const boxBody = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
  linearDamping: 0.3,
})
boxBody.position.set(0, 5, 0)
world.addBody(boxBody)

// Sync loop — run before renderer.render()
world.fixedStep()  // or world.step(1/60, delta)
mesh.position.copy(boxBody.position)
mesh.quaternion.copy(boxBody.quaternion)
\`\`\`

## Rapier setup

\`\`\`js
import RAPIER from '@dimforge/rapier3d-compat'
await RAPIER.init()

const world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 })
const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 5, 0)
const rigidBody = world.createRigidBody(rigidBodyDesc)
const colliderDesc = RAPIER.ColliderDesc.ball(0.5)
world.createCollider(colliderDesc, rigidBody)

// In animation loop
world.step()
const pos = rigidBody.translation()
mesh.position.set(pos.x, pos.y, pos.z)
\`\`\`
`);

writeNote('frontend', '3d/scroll-animation.md', `# Scroll-Driven 3D Animation

## Lenis (smooth scroll)

\`\`\`js
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

const lenis = new Lenis()
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => { lenis.raf(time * 1000) })
gsap.ticker.lagSmoothing(0)
\`\`\`

## Camera path along a curve

\`\`\`js
import { CatmullRomCurve3, Vector3, QuaternionKeyframeTrack } from 'three'

const cameraPath = new CatmullRomCurve3([
  new Vector3(0, 2, 10),
  new Vector3(5, 3, 5),
  new Vector3(10, 1, 0),
], false, 'catmullrom', 0.5)  // tension 0.5 = smooth

// In ScrollTrigger scrub
ScrollTrigger.create({
  trigger: '#scroll-container',
  start: 'top top',
  end: 'bottom bottom',
  scrub: 1.5,  // seconds lag for smoothness
  onUpdate: (self) => {
    const t = self.progress
    const point = cameraPath.getPoint(t)
    const tangent = cameraPath.getTangent(t)
    camera.position.copy(point)
    camera.lookAt(point.clone().add(tangent))
  }
})
\`\`\`

## Pinned section with 3D reveal

\`\`\`js
gsap.timeline({
  scrollTrigger: {
    trigger: '#hero-3d',
    start: 'top top',
    end: '+=200%',
    pin: true,
    scrub: true,
  }
})
.from(mesh.position, { y: -10, duration: 1 })
.from(mesh.rotation, { y: Math.PI * 2, duration: 1 }, '<')
\`\`\`

## Object floating animation (idle loop)

\`\`\`js
// In animation loop
mesh.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.15
mesh.rotation.y += delta * 0.3
\`\`\`
`);

writeNote('frontend', '3d/shader-cookbook.md', `# GLSL Shader Cookbook

## Minimal ShaderMaterial

\`\`\`js
const material = new THREE.ShaderMaterial({
  uniforms: {
    u_time:       { value: 0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    u_mouse:      { value: new THREE.Vector2(0, 0) },
  },
  vertexShader:   vertexShaderSource,
  fragmentShader: fragmentShaderSource,
})

// Update in animation loop
material.uniforms.u_time.value = clock.elapsedTime
\`\`\`

## Wave displacement vertex shader

\`\`\`glsl
uniform float u_time;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  pos.y += sin(pos.x * 3.0 + u_time * 2.0) * 0.1;
  pos.y += sin(pos.z * 2.5 + u_time * 1.5) * 0.08;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
\`\`\`

## Rim lighting (Fresnel) fragment shader

\`\`\`glsl
uniform vec3 u_rimColor;
uniform float u_rimStrength;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  float rim = 1.0 - abs(dot(normal, viewDir));
  rim = pow(rim, 3.0);
  vec3 color = mix(vec3(0.1), u_rimColor, rim * u_rimStrength);
  gl_FragColor = vec4(color, 1.0);
}
\`\`\`

## Perlin noise (GLSL, paste inline)

\`\`\`glsl
// Classic Perlin noise — vec3 → float
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - 0.5;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec4 j = p - 49.0 * floor(p * (1.0/49.0));
  vec4 x_ = floor(j * (1.0/7.0));
  vec4 ns = 1.0/7.0 * x_ - 1.0;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m*m, vec4(dot(vec3(x_), vec3(x_)), dot(vec3(x1), vec3(x1)), dot(vec3(x2), vec3(x2)), dot(vec3(x3), vec3(x3))));
}
\`\`\`

## Post-processing (EffectComposer)

\`\`\`js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.3, 0.9))

// Replace renderer.render() in loop with:
composer.render()
\`\`\`
`);

writeNote('frontend', '3d/performance-rules.md', `# 3D Performance Rules

## Draw call budget

Target: < 100 draw calls per frame.

- Merge static geometries: \`BufferGeometryUtils.mergeGeometries([geom1, geom2])\`
- Instance repeated geometry: \`new THREE.InstancedMesh(geometry, material, count)\`
- Avoid per-object materials when possible — shared material = one draw call

## Texture rules

| Target | Max size |
|--------|----------|
| Mobile | 1024×1024 |
| Desktop | 2048×2048 |
| Hero asset (desktop-only) | 4096×4096 |

- Always power-of-two dimensions
- Use KTX2 (Basis Universal) for web delivery: \`ktx2-encoder\` CLI
- Mipmaps: enabled by default — only disable for UI plane textures

## Instancing (InstancedMesh)

\`\`\`js
const count = 1000
const mesh = new THREE.InstancedMesh(geometry, material, count)
const matrix = new THREE.Matrix4()
for (let i = 0; i < count; i++) {
  matrix.setPosition(Math.random() * 20 - 10, 0, Math.random() * 20 - 10)
  mesh.setMatrixAt(i, matrix)
}
mesh.instanceMatrix.needsUpdate = true
scene.add(mesh)
\`\`\`

## Memory disposal checklist

- \`geometry.dispose()\`
- \`material.dispose()\`
- \`texture.dispose()\`
- \`renderer.dispose()\`
- Remove object from scene: \`scene.remove(obj)\`
- Cancel animation: \`cancelAnimationFrame(rafId)\`

## Avoid per-frame allocations

\`\`\`js
// BAD — creates new Vector3 every frame
camera.lookAt(new THREE.Vector3(0, 0, 0))

// GOOD — reuse instance
const _target = new THREE.Vector3(0, 0, 0)
camera.lookAt(_target)
\`\`\`

## Stats.js (dev only)

\`\`\`js
import Stats from 'stats.js'
const stats = new Stats()
stats.showPanel(0)  // 0: fps, 1: ms, 2: mb
document.body.appendChild(stats.dom)
// In loop: stats.begin() ... stats.end()
\`\`\`
`);

writeNote('frontend', '3d/math-reference.md', `# 3D Math Reference

## Easing functions

\`\`\`js
// Ease out cubic
const easeOut = t => 1 - Math.pow(1 - t, 3)

// Ease in-out sine
const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2

// Spring (critically damped) — call each frame
function spring(current, target, velocity, stiffness = 150, damping = 20, dt = 1/60) {
  const force = -stiffness * (current - target) - damping * velocity
  velocity += force * dt
  current  += velocity * dt
  return { current, velocity }
}
\`\`\`

## Quaternion interpolation (smooth camera rotation)

\`\`\`js
const qA = new THREE.Quaternion()
const qB = new THREE.Quaternion()
camera.quaternion.slerp(qB, 0.05)  // 0.05 = smooth factor (lower = smoother)

// Look-at as quaternion
const dummy = new THREE.Object3D()
dummy.position.copy(camera.position)
dummy.lookAt(targetPosition)
camera.quaternion.slerp(dummy.quaternion, lerpFactor)
\`\`\`

## Lerp / Damp (smooth position follow)

\`\`\`js
// Linear lerp — not frame-rate independent
pos.lerp(target, 0.1)

// Frame-rate independent damp (prefer this)
import { damp } from 'maath/easing'
damp(camera.position, 'y', targetY, 0.3, delta)  // 0.3 = smoothing time
\`\`\`

## Raycaster (mouse picking)

\`\`\`js
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth)  * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
})

// In animation loop
raycaster.setFromCamera(mouse, camera)
const hits = raycaster.intersectObjects(scene.children, true)
if (hits.length > 0) {
  const first = hits[0].object
  // highlight first
}
\`\`\`

## CatmullRom camera path

\`\`\`js
const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-10, 2, 10),
  new THREE.Vector3(0, 5, 0),
  new THREE.Vector3(10, 2, -10),
], false, 'catmullrom', 0.5)

// Get point at scroll progress t ∈ [0,1]
const t = scrollProgress
const point = path.getPoint(t)
const tangent = path.getTangent(t)
camera.position.copy(point)
camera.lookAt(point.clone().add(tangent.multiplyScalar(3)))
\`\`\`
`);

writeNote('frontend', '3d/mobile-responsive.md', `# Mobile-Responsive 3D (4 Mandatory Rules)

Translating a 3D desktop experience to mobile is not just CSS media queries.
A heavy 3D scene throttles a phone's GPU. Touch UX on a WebGL canvas is notoriously difficult.
All four rules below are non-negotiable when \`mobile: true\`.

---

## Rule 1 — HTML UI overlays

**Never build user interface elements inside the WebGL canvas.**

The \`<canvas>\` lives in the background. All chat boxes, buttons, navigation, and controls
are HTML/CSS in an overlay layer on top.

\`\`\`css
/* canvas — background layer */
canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
}

/* UI — overlay layer */
.ui-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 10;
  pointer-events: none;  /* let clicks fall through to canvas by default */
}
.ui-overlay button,
.ui-overlay .chat {
  pointer-events: auto;  /* re-enable only for interactive elements */
}
\`\`\`

Why:
- Text rendered as HTML is crisp on retina screens; Three.js text sprites are blurry
- Screen readers can parse HTML; they cannot read WebGL
- Responsive layout via CSS flexbox/grid is trivial; 3D layout is not

---

## Rule 2 — Dynamic pixel ratio clamping

High-end phones have 3× retina screens. Rendering 1-to-1 on a 3× screen pushes 9× the pixels
vs a 1× desktop — drains battery rapidly and throttles the GPU.

\`\`\`js
// Raw Three.js
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
// Desktop-only scenes: cap at 2. Mobile-first scenes: cap at 1.5.
\`\`\`

\`\`\`jsx
// React Three Fiber
<Canvas dpr={[1, 1.5]}>
  {/* NEVER dpr={[1, 2]} for mobile-first scenes */}
\`\`\`

The visual difference at 1.5 vs 3 is imperceptible at normal handheld viewing distance.
The performance difference is dramatic.

---

## Rule 3 — Touch-safe camera controls

Mouse-wheel zoom and click-drag rotation "scroll-jack" a phone — the user's thumb gets
trapped on the canvas and cannot scroll the page.

\`\`\`js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const controls = new OrbitControls(camera, renderer.domElement)
const isMobile = window.innerWidth < 768

if (isMobile) {
  controls.enableZoom = false   // no pinch-zoom (conflicts with page zoom)
  controls.enablePan  = false   // no two-finger pan
  // rotation-only is acceptable if the 3D object is the focus
}
\`\`\`

If the canvas sits inside a scrollable page and the user must scroll past it:

\`\`\`js
// Pass touch events through to the document on mobile
renderer.domElement.style.pointerEvents = isMobile ? 'none' : 'auto'
\`\`\`

Or use a hit-zone approach: only capture touches that intersect the 3D object (raycaster),
pass all others to \`document\`.

---

## Rule 4 — Responsive field of view

A camera FOV that frames a subject correctly on 16:9 widescreen crops the subject
on a 9:16 phone screen.

\`\`\`js
// Resize handler — raw Three.js
const BASE_FOV = 75     // desktop baseline
const BASE_Z   = 5      // desktop camera Z

function onResize() {
  const aspect = window.innerWidth / window.innerHeight
  camera.aspect = aspect
  // Push camera back on narrow viewports so subject stays in frame
  if (aspect < 1) {
    camera.fov = BASE_FOV * (1 / aspect) * 0.85
    camera.position.z = BASE_Z * 1.4
  } else {
    camera.fov = BASE_FOV
    camera.position.z = BASE_Z
  }
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
window.addEventListener('resize', onResize)
onResize()  // run on mount
\`\`\`

\`\`\`jsx
// React Three Fiber hook
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

function useResponsiveFOV(baseFOV = 75, baseZ = 5) {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / size.height
    if (aspect < 1) {
      camera.fov = baseFOV * (1 / aspect) * 0.85
      camera.position.z = baseZ * 1.4
    } else {
      camera.fov = baseFOV
      camera.position.z = baseZ
    }
    camera.updateProjectionMatrix()
  }, [size.width, size.height])
}
\`\`\`

---

## Quick checklist

- [ ] Canvas is \`z-index: 0\`; all UI is \`z-index ≥ 10\` in HTML
- [ ] Pixel ratio capped at 1.5 (mobile-first) or 2 (desktop-first)
- [ ] OrbitControls zoom + pan disabled on \`window.innerWidth < 768\`
- [ ] Resize handler adjusts FOV or camera Z based on aspect ratio
- [ ] Tested on 390×844 (iPhone 14) and 412×915 (Pixel 7) viewports
`);

log.ok('frontend vault seeded (including 3D knowledge base)');

// ─── Database vault ───────────────────────────────────────────────────────────
writeNote('database', 'optimizations/index-guidelines.md', `# Index Guidelines

## When to add an index
- Any column in a WHERE clause on a table with > 1000 estimated rows
- Any column used in a JOIN condition
- Any column in an ORDER BY on a large table
- Foreign key columns (most databases don't auto-index these)

## When NOT to add an index
- Tables with < 500 rows (full scan is faster)
- Columns with very low cardinality (e.g., boolean flags) — bitmap index instead
- Columns rarely queried

## Covering index
If a query only needs columns A and B, an index on (A, B) avoids a table lookup:
\`\`\`sql
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- covers: SELECT status FROM orders WHERE user_id = ?
\`\`\`

## N+1 detection
If you see a query inside a loop, flag it. Propose a batch query:
\`\`\`sql
-- Instead of: SELECT * FROM products WHERE id = ? (in a loop)
-- Use:        SELECT * FROM products WHERE id IN (?, ?, ?)
\`\`\`
`);

writeNote('database', 'optimizations/query-patterns.md', `# Query Patterns

## Batch inserts
\`\`\`sql
INSERT INTO items (id, name, price) VALUES
  ('1', 'Apple', 0.99),
  ('2', 'Banana', 0.49),
  ('3', 'Cherry', 1.99);
\`\`\`

## CTEs for readability
\`\`\`sql
WITH active_users AS (
  SELECT id FROM users WHERE status = 'active'
),
recent_orders AS (
  SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '30 days'
)
SELECT u.id, COUNT(o.id) AS order_count
FROM active_users u
LEFT JOIN recent_orders o ON o.user_id = u.id
GROUP BY u.id;
\`\`\`

## Pagination (offset vs cursor)
- Offset pagination: simple but slow on large tables (\`LIMIT 20 OFFSET 1000\`)
- Cursor pagination: \`WHERE id > :last_id ORDER BY id LIMIT 20\` — preferred for large datasets
`);

// ── SQL management, prod deployment & vector databases ──
writeNote('database', 'schemas/sql-schema-management.md', `# SQL Schema Management

## Schema files
- **Version control**: store all schema definitions as raw \`.sql\` files in the repo (\`/migrations\` or \`/schema\`).
- **Migration tools**: apply changes via automated tooling (ORM migrations, e.g. Alembic).
- **Execution rule**: never run manual \`CREATE\`/\`ALTER\` statements directly on any environment.

## Mixed data (JSONB — PostgreSQL)
- Use \`jsonb\` **only** when data mixes fixed structured fields with highly dynamic / unpredictable / unstructured nested attributes.
- Do **not** use \`jsonb\` for fields that need strict validation, foreign-key constraints, or heavy relational joins — model those as real columns/tables.
`);

writeNote('database', 'optimizations/index-strategy.md', `# Index Strategy

(Complements \`optimizations/index-guidelines.md\`.)

## Target columns
Create indexes on:
- All **foreign keys**.
- Columns frequently used in \`WHERE\` clauses.
- Columns used in \`ORDER BY\`.

## Limit
Cap the total number of indexes per table — excess indexes degrade \`INSERT\`/\`UPDATE\` speed. Index for real query patterns, not "just in case".
`);

writeNote('database', 'deployment/postgres-docker.md', `# PostgreSQL Production Deployment (Docker Compose)

- **Data persistence**: always use named Docker volumes pinned to a secure host directory.
- **Security**: never hardcode credentials — use an external \`.env\` via \`env_file\`/\`environment\`.
- **Restart policy**: \`restart: unless-stopped\`.

\`\`\`yaml
services:
  postgres_prod:
    image: postgres:18-alpine
    container_name: postgres_prod
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${DB_USER}
      POSTGRES_PASSWORD: \${DB_PASSWORD}
      POSTGRES_DB: \${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
    driver: local
\`\`\`
`);

writeNote('database', 'vector-databases/selection-and-storage.md', `# Vector Databases

## Technology selection
| Tech | Use when |
|------|----------|
| **Chroma** | Prototyping, lightweight Python apps, small datasets (< 100k vectors), minimal config. |
| **Faiss** | Raw, high-performance, in-memory similarity ops; metadata filtering handled externally. |
| **OpenSearch / Elasticsearch** | Enterprise scale, hybrid (keyword + vector) search, fast large-scale metadata filtering. |

## Storing embeddings
- **Normalize** all vectors to unit length before storage (efficient cosine similarity).
- **Index**: HNSW for production (speed/accuracy balance); IVF for highly memory-constrained environments.
- **Minimal metadata**: store only the primary SQL DB id alongside vectors; fetch large text/objects from the relational DB via that id.

## Docker production deployment
- **Resource limits**: explicitly set \`mem_limit\` so index loading can't exhaust host RAM.
- **Network isolation**: keep the vector DB on an internal app network; never expose its ports to the public internet.
`);

log.ok('database vault seeded');

// ─── Testing vault ────────────────────────────────────────────────────────────
writeNote('testing', 'templates/postman-item-template.md', `# Postman Item Template (v2.1)

\`\`\`json
{
  "name": "POST /api/users — positive",
  "request": {
    "method": "POST",
    "header": [
      { "key": "Content-Type", "value": "application/json" },
      { "key": "Authorization", "value": "Bearer {{bearerToken}}" }
    ],
    "body": {
      "mode": "raw",
      "raw": "{ \\"email\\": \\"test@example.com\\", \\"password\\": \\"securePass123\\" }",
      "options": { "raw": { "language": "json" } }
    },
    "url": { "raw": "{{baseUrl}}/api/users", "host": ["{{baseUrl}}"], "path": ["api", "users"] }
  },
  "event": [
    {
      "listen": "test",
      "script": {
        "exec": [
          "pm.test('Status is 201', () => pm.response.to.have.status(201));",
          "pm.test('Response time < 2000ms', () => pm.expect(pm.response.responseTime).to.be.below(2000));",
          "pm.test('success is true', () => { const j = pm.response.json(); pm.expect(j.success).to.be.true; });"
        ]
      }
    }
  ]
}
\`\`\`

## Negative test: invalid payload
- Send missing required fields or wrong types
- Assert status >= 400
- Assert json.success === false

## Auth test: missing token
- Remove Authorization header entirely
- Assert status 401
`);

log.ok('testing vault seeded');

// ─── GitDevOps vault ──────────────────────────────────────────────────────────
writeNote('gitdevops', 'branch-strategy/naming-rules.md', `# Branch Naming Rules

## Pattern
\`<type>/<task-slug>-<sessionId[0..7]>\`

## Types
| Type | When |
|------|------|
| feat | New feature |
| fix | Bug fix |
| chore | Tooling, dependencies, config |
| test | Adding or fixing tests |
| docs | Documentation only |
| refactor | Code restructure, no behavior change |
| security | Security fix or hardening |

## Examples
- \`feat/user-auth-system-a7e88f3b\`
- \`fix/broken-login-route-b3cc12d9\`
- \`security/remove-leaked-key-f0e12345\`

## Rules
- Lowercase only
- Hyphens only (no underscores, no slashes except type separator)
- Slug max 30 characters
- NEVER push directly to main or master — always branch + PR
`);

writeNote('gitdevops', 'commit-format/examples.md', `# Commit Message Examples

## Format
\`\`\`
<type>(<scope>): <subject>    ← max 50 chars, imperative mood, no trailing period

[optional body: what changed and why, 72-char wrap]

[optional footer: BREAKING CHANGE: ..., Closes #N]
\`\`\`

## Good examples
\`\`\`
feat(auth): add JWT refresh token endpoint

Implements POST /api/auth/refresh which validates a refresh token
stored in an httpOnly cookie and issues a new access token.

Closes #42
\`\`\`

\`\`\`
fix(orders): correct total calculation on discounted items

Discount was applied before tax instead of after, causing incorrect
totals when both discount and tax rates were non-zero.
\`\`\`

## Bad examples (rejected by git agent)
\`\`\`
updated stuff          ← no type, vague
Added the new feature. ← trailing period, no scope
WIP                    ← not descriptive
\`\`\`
`);

writeNote('gitdevops', 'security-scans/checklist.md', `# Security Scan Checklist

Runs against \`git diff --staged\` before every commit.

| Severity | Check | Pattern |
|----------|-------|---------|
| blocking | No .env files staged | filename: \`.env\`, \`.env.*\` |
| blocking | No hardcoded secrets | \`API_KEY=\`, \`SECRET=\`, \`PASSWORD=\`, \`PRIVATE_KEY=\` |
| blocking | No raw bearer tokens in source | \`Bearer [A-Za-z0-9._-]{20,}\` |
| blocking | No localhost URLs in non-test files | \`localhost\`, \`127\\.0\\.0\\.1\` |
| blocking | No Authorization header from localStorage | \`localStorage.*Authorization\`, \`Authorization.*localStorage\` |
| blocking | No database credentials in .js/.json | \`DB_PASSWORD\`, \`DATABASE_URL.*password\` |
| blocking | CSP headers defined if frontend files changed | Check backend headers middleware |
| warning | No console.log in production paths | \`console\\.log\` outside test files |
| warning | No commented-out credential strings | \`//.*password\`, \`//.*secret\` |
| info | All new files have README or JSDoc | Check for new files missing header |
`);

// ── Deployment guidelines (GitHub flow, Docker, server hardening, docs) ──
writeNote('gitdevops', 'branch-strategy/github-flow.md', `# GitHub Flow (human PR conventions)

> Note: this is the **human-facing** GitHub branching convention. The orchestrator's
> internal agent branches use \`<type>/<slug>-<sessionId>\` (see \`branch-strategy/naming-rules.md\`).
> Use this note when collaborating via GitHub PRs; use \`naming-rules.md\` for automated agent commits.

## Branch naming
- Features: \`feature/<feature-title>\` (e.g. \`feature/user-authentication\`)
- Bug fixes: \`bug/<bug-title>\` or \`fix/<bug-title>\` (e.g. \`bug/login-jwt-expired\`)

## Pull requests
- **Protected branches**: no direct pushes to \`main\` (production).
- **PR required**: all code changes go through a Pull Request.
- **Merge**: use **Squash and merge** to keep a clean history on target branches.
`);

writeNote('gitdevops', 'security-scans/dependency-and-secret-scan.md', `# Pre-Deployment Security Checks

(Extends \`security-scans/checklist.md\`.)

- **Dependency scanning**: run vulnerability checks on third-party packages (\`npm audit\`, Dependabot).
- **Secret detection**: scan the codebase for hardcoded credentials, API keys, or certificates before pushing to remote.
- **AI review**: use AI agents to review the commit for security and performance bugs before merge.
`);

writeNote('gitdevops', 'deployment/docker.md', `# Containerization & Image Optimization

- **Mandatory containerization**: all deployments run in Docker containers — host-level native deployments are forbidden.
- **Multi-stage builds**: separate build dependencies from the final runtime to minimize image size.
- **Numbered tags**: always tag images with explicit version numbers, never \`latest\`.

\`\`\`dockerfile
# Stage 1: Build environment
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production environment (minimizes image size)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production && npm install pm2 -g
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ecosystem.config.js ./
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`
`);

writeNote('gitdevops', 'deployment/server-hardening.md', `# Server Hardening

## Firewall (UFW)
- Enable UFW; block all incoming traffic by default.
- Open only required ports: SSH (22), HTTP (80), HTTPS (443).

## SSH security
- Disable password auth in \`/etc/ssh/sshd_config\` (\`PasswordAuthentication no\`).
- Permit access strictly via pre-authorized SSH public keys.

## Intrusion prevention (Fail2Ban)
- Enable the default SSH jail to ban IPs with repeated failed logins.
- Enable Nginx jails: \`nginx-http-auth\`, \`nginx-badbots\`, \`nginx-noscript\`.

## SSL/TLS
- Provision and auto-renew Let's Encrypt certs with Certbot.
- Enforce global HTTP→HTTPS redirect (port 80 → 443) in Nginx.

## Environment
- No Anaconda/Conda on production VMs. Use system Python + \`venv\`, or Docker isolation.
`);

writeNote('gitdevops', 'deployment/repo-docs.md', `# Repository Documentation

- **Location**: store asset files in a \`/docs\` directory at the repo root.
- **Architecture diagram**: keep an up-to-date system diagram showing microservices, databases, and third-party integrations.
- **Code documentation**: maintain \`.md\` docs for the codebase.
`);

log.ok('gitdevops vault seeded');

// ─── MCP Bridge vault ─────────────────────────────────────────────────────────
writeNote('mcpbridge', 'templates/api-stub-template.md', `# Third-Party API Stub Template

\`\`\`js
// src/integrations/<service-name>.js
'use strict';

/**
 * @module <ServiceName>Integration
 * Auth strategy: apiKey | oauth2 | bearerToken | webhook-secret
 */

const BASE_URL = process.env.<SERVICE>_BASE_URL;
const API_KEY  = process.env.<SERVICE>_API_KEY;

/**
 * @param {string} endpoint - API path (e.g. '/v1/messages')
 * @param {Object} opts - fetch options
 * @returns {Promise<any>}
 */
async function request(endpoint, opts = {}) {
  // TODO: implement
  const res = await fetch(\`\${BASE_URL}\${endpoint}\`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${API_KEY}\`,
      ...opts.headers,
    },
  });
  if (!res.ok) {
    throw new Error(\`<ServiceName> API error \${res.status}: \${await res.text()}\`);
  }
  return res.json();
}

module.exports = { request };
\`\`\`
`);

log.ok('mcpbridge vault seeded');

// ─── Calls vault ──────────────────────────────────────────────────────────────
writeNote('calls', 'providers/twilio-setup.md', `# Twilio Integration

## Install
\`\`\`bash
npm install twilio
\`\`\`

## Client singleton (src/integrations/twilio.client.js)
\`\`\`js
'use strict'
const twilio = require('twilio')
let _client = null
function getClient() {
  if (!_client) _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  return _client
}
module.exports = { getClient }
\`\`\`

## Environment variables required
\`\`\`
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567
BASE_URL=https://your-domain.com
\`\`\`

## Webhook signature validation (MANDATORY on every route)
\`\`\`js
const twilio = require('twilio')

function validateTwilioSignature(req, res, next) {
  const valid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    req.headers['x-twilio-signature'],
    \`\${process.env.BASE_URL}\${req.originalUrl}\`,
    req.body  // must be urlencoded body, not JSON — use express.urlencoded()
  )
  if (!valid) return res.status(403).json({ success: false, code: 'ERR_INVALID_SIGNATURE' })
  next()
}
module.exports = { validateTwilioSignature }
\`\`\`

**Important:** Twilio webhooks send urlencoded POST bodies, not JSON. Use:
\`app.use('/webhooks/twilio', express.urlencoded({ extended: false }))\`

## Make an outbound call
\`\`\`js
const { getClient } = require('../integrations/twilio.client')

async function dial({ to, twimlUrl, statusCallbackUrl }) {
  return getClient().calls.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER,
    url: twimlUrl,                            // TwiML for call flow
    statusCallback: statusCallbackUrl,         // receives call status updates
    statusCallbackMethod: 'POST',
    machineDetection: 'Enable',               // AMD
    asyncAmd: true,
    asyncAmdStatusCallback: statusCallbackUrl,
  })
}
\`\`\`

## Inbound TwiML response (Express handler)
\`\`\`js
const { VoiceResponse } = require('twilio').twiml

function greetCaller(req, res) {
  const response = new VoiceResponse()
  response.say({ voice: 'Polly.Joanna' }, 'Thank you for calling. This call may be recorded.')
  const gather = response.gather({ numDigits: 1, timeout: 5, action: '/webhooks/twilio/menu' })
  gather.say({ voice: 'Polly.Joanna' }, 'Press 1 for support. Press 2 for billing. Press 3 to leave a message.')
  response.redirect('/webhooks/twilio/inbound')  // timeout fallback: repeat
  res.type('text/xml').send(response.toString())
}
\`\`\`
`);

writeNote('calls', 'providers/vonage-setup.md', `# Vonage Voice API Integration

## Install
\`\`\`bash
npm install @vonage/server-sdk
\`\`\`

## Client singleton
\`\`\`js
const { Vonage } = require('@vonage/server-sdk')
const vonage = new Vonage({
  apiKey:    process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
  applicationId: process.env.VONAGE_APP_ID,
  privateKey: process.env.VONAGE_PRIVATE_KEY_PATH,
})
module.exports = { vonage }
\`\`\`

## NCCO (Nexmo Call Control Object) — Vonage equivalent of TwiML
\`\`\`js
// Inbound answer webhook returns NCCO array
function answerWebhook(req, res) {
  const ncco = [
    { action: 'talk', text: 'Thank you for calling. Press 1 for support.', bargeIn: true },
    {
      action: 'input',
      type: ['dtmf'],
      dtmf: { timeOut: 5, maxDigits: 1 },
      eventUrl: [process.env.BASE_URL + '/webhooks/vonage/input']
    }
  ]
  res.json(ncco)
}
\`\`\`

## Webhook signature validation
\`\`\`js
const crypto = require('crypto')

function validateVonageSignature(req, res, next) {
  const sig = req.headers['x-nexmo-signature']
  const expected = crypto
    .createHmac('sha256', process.env.VONAGE_SIGNATURE_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex')
  if (sig !== expected) return res.status(403).json({ success: false, code: 'ERR_INVALID_SIGNATURE' })
  next()
}
\`\`\`
`);

writeNote('calls', 'inbound/ivr-design.md', `# IVR Design Patterns

## Core principles

1. **Maximum 3 levels deep** — callers abandon after 3 menu levels
2. **Every path terminates** — transfer / voicemail / message-and-hangup (no dead ends)
3. **Timeout fallback** — always: no key pressed → repeat once → fallback action
4. **Invalid input** → say "I didn't understand" → repeat menu once → fallback

## Standard IVR state machine

\`\`\`
CALL_IN
  └─ greeting + recording_consent (if recording)
      └─ MAIN_MENU
          ├─ [1] → SUPPORT_SUBMENU
          │     ├─ [1] → transfer_to_agent
          │     ├─ [2] → voicemail
          │     └─ [timeout/invalid] → transfer_to_agent
          ├─ [2] → BILLING_SUBMENU
          │     └─ ...
          ├─ [0] → transfer_to_agent (always offer 0 = human)
          └─ [timeout/invalid] → repeat_menu → transfer_to_agent
\`\`\`

## Business hours check pattern

\`\`\`js
function isBusinessHours(timezone = 'America/New_York') {
  const now = new Date()
  const local = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  const hour = local.getHours()
  const day  = local.getDay()  // 0 = Sunday
  return day >= 1 && day <= 5 && hour >= 8 && hour < 18
}

// In IVR handler
if (!isBusinessHours()) {
  // respond with after-hours TwiML → voicemail
}
\`\`\`

## Call transfer (warm transfer)
\`\`\`js
const response = new VoiceResponse()
response.say({ voice: 'Polly.Joanna' }, 'Please hold while I connect you to an agent.')
const dial = response.dial({ callerId: process.env.TWILIO_PHONE_NUMBER, timeout: 30 })
dial.number(process.env.AGENT_PHONE_NUMBER)
// Add statusCallbackEvent to detect if agent doesn't answer → redirect to voicemail
\`\`\`

## Voicemail
\`\`\`js
const response = new VoiceResponse()
response.say({ voice: 'Polly.Joanna' }, 'No one is available. Please leave a message after the tone.')
response.record({
  maxLength: 120,
  transcribe: true,
  transcribeCallback: '/webhooks/twilio/voicemail-transcription',
  action: '/webhooks/twilio/voicemail-done',
  playBeep: true,
})
\`\`\`
`);

writeNote('calls', 'outbound/campaign-patterns.md', `# Outbound Call Campaign Patterns

## Pre-dial checklist (run before every outbound call)

\`\`\`js
async function preDialCheck(phoneNumber) {
  // 1. Normalize number to E.164 format
  const e164 = normalizeToE164(phoneNumber)
  // 2. Check internal DNC list
  const isDNC = await db.query('SELECT 1 FROM dnc_list WHERE phone = ?', [e164])
  if (isDNC) throw new Error('DNC_BLOCKED')
  // 3. Check calling hours (callee's local timezone)
  const tz = await lookupTimezone(e164)  // use twilio lookup or ip-timezone
  if (!isCallingHours(tz)) throw new Error('OUTSIDE_CALLING_HOURS')
  // 4. Check retry count
  const attempts = await db.query('SELECT count FROM call_attempts WHERE phone = ?', [e164])
  if (attempts >= 3) throw new Error('MAX_RETRIES_REACHED')
  return { e164, tz }
}
\`\`\`

## Answering Machine Detection (AMD)

\`\`\`js
// Initial call with AMD enabled
const call = await client.calls.create({
  to: e164,
  from: process.env.TWILIO_PHONE_NUMBER,
  url: \`\${BASE_URL}/webhooks/twilio/outbound-twiml\`,
  machineDetection: 'Enable',
  asyncAmd: true,
  asyncAmdStatusCallback: \`\${BASE_URL}/webhooks/twilio/amd-result\`,
})

// AMD result webhook handler
function handleAmdResult(req, res) {
  const { AnsweredBy, CallSid } = req.body
  // AnsweredBy: "human" | "machine_start" | "machine_end_beep" | "fax" | "unknown"
  if (AnsweredBy === 'human') {
    // Update call with human-answered TwiML
    client.calls(CallSid).update({ url: \`\${BASE_URL}/webhooks/twilio/human-script\` })
  } else if (AnsweredBy.startsWith('machine')) {
    // Update call with voicemail TwiML
    client.calls(CallSid).update({ url: \`\${BASE_URL}/webhooks/twilio/voicemail-script\` })
  }
  res.sendStatus(200)
}
\`\`\`

## Call result tracking

\`\`\`js
// Status callback handler — records every state transition
async function handleStatusCallback(req, res) {
  const { CallSid, CallStatus, CallDuration, To } = req.body
  // CallStatus: initiated | ringing | in-progress | completed | busy | no-answer | canceled | failed
  await db.query(
    'INSERT OR REPLACE INTO call_logs (id, phone_number, status, duration_ms) VALUES (?, ?, ?, ?)',
    [CallSid, To.slice(-4), CallStatus, (CallDuration || 0) * 1000]  // store last 4 digits only
  )
  res.sendStatus(200)
}
\`\`\`

## Retry schedule

\`\`\`js
async function scheduleRetry(phoneNumber, attemptNumber) {
  if (attemptNumber >= 3) return  // max 3 attempts
  const delayHours = attemptNumber === 1 ? 1 : 4  // 1h after first, 4h after second
  const retryAt = Date.now() + delayHours * 3600 * 1000
  await db.query(
    'INSERT INTO retry_queue (phone, retry_at, attempt) VALUES (?, ?, ?)',
    [phoneNumber, retryAt, attemptNumber + 1]
  )
}
\`\`\`
`);

writeNote('calls', 'compliance/tcpa-gdpr.md', `# Compliance Rules — TCPA & GDPR

## TCPA (US — Telephone Consumer Protection Act)

### Blocking violations (commit blocked if not resolved)

| Rule | Requirement |
|------|------------|
| Prior consent | Automated calls to US mobile numbers require prior written consent |
| Calling hours | 8am–9pm in the CALLEE's local timezone — not the caller's |
| DNC list | Must check federal + state DNC list before EVERY outbound call |
| Caller ID | Present a real working phone number — cannot spoof or hide |
| Abandoned calls | Predictive dialer abandonment rate must stay < 3% per campaign |

### Implementation requirements

\`\`\`js
// Consent must be recorded before dialing mobile numbers
const consent = await db.query(
  'SELECT given_at FROM consents WHERE phone = ? AND type = ?',
  [phone, 'outbound_call']
)
if (!consent) throw new Error('NO_CONSENT_RECORDED')

// Calling hours (CALLEE timezone)
const tz = await client.lookups.v2.phoneNumbers(phone).fetch({ fields: 'line_type_intelligence' })
// Use tz.callerName.callerType + tz to calculate local time
\`\`\`

## GDPR (EU — General Data Protection Regulation)

| Rule | Requirement |
|------|------------|
| Lawful basis | Document why you are calling (consent / legitimate interest / contract) |
| Data minimisation | Store only what is necessary — last 4 digits in logs, not full number |
| Transcript encryption | Transcripts must be encrypted at rest; set retention limit (e.g. 90 days) |
| Right to erasure | Deleting a contact must delete all call logs and recordings |
| Recording consent | Spoken consent at the start of the call if recording (not just a notice) |

## Recording consent script (required in UK, EU, many US states)

> "This call may be recorded for quality and training purposes. By continuing, you consent to this recording. If you do not wish to be recorded, please press 9 now."

## DNC list integration

\`\`\`js
// Minimum: internal DNC list
// Recommended: integrate with National DNC Registry (FTC) via Data.com or Synapse API

async function checkDNC(phone) {
  const internal = await db.query('SELECT 1 FROM dnc_list WHERE phone = ?', [phone])
  if (internal) return { blocked: true, reason: 'internal_dnc' }
  // Add external DNC API check here
  return { blocked: false }
}

// Opt-out handler — any caller pressing 9 or saying "stop" is added to DNC
async function handleOptOut(phone) {
  await db.query(
    'INSERT OR IGNORE INTO dnc_list (phone, added_at, reason) VALUES (?, ?, ?)',
    [phone, Date.now(), 'caller_request']
  )
}
\`\`\`
`);

writeNote('calls', 'scripts/tts-writing-guide.md', `# TTS Voice Script Writing Guide

## Core rules

1. **Short sentences** — max 20 words. TTS rushes long sentences.
2. **Spoken language** — "you'll" not "you will". Natural contractions.
3. **Spell out numbers** — "eight hundred" not "800". "five fifty-five, one two three four" for phone numbers.
4. **No punctuation TTS reads aloud** — no em dashes, no parentheses in speech paths.
5. **Brand names** — add phonetic hints in square brackets if TTS mispronounces: "Aris[trull]"
6. **Timing** — 130 words/minute is average TTS speed. 8-second greeting = ~17 words max.

## Script templates

### Greeting (max 17 words)
✅ "Thank you for calling [Company]. This call may be recorded."
❌ "Thank you for calling [Company], a leading provider of software solutions established in 2020."

### Main menu
✅ "Press 1 for support. Press 2 for billing. Press 0 to speak with someone."
❌ "In order to route your call to the correct department, please listen carefully to the following options..."

### Transfer
✅ "Please hold. I'm connecting you now."
❌ "One moment please while I transfer your call to the next available representative."

### Voicemail prompt
✅ "No one is available right now. Please leave your name and number after the tone."

### After-hours
✅ "Our office is closed. We're open Monday through Friday, nine to five. Please call back then, or leave a message."

### Outbound intro (must identify company in first 5 words)
✅ "Hello, this is [Company] calling for [Name]."
❌ "Hi there, how are you doing today? I'm calling because..."

### Error / didn't understand
✅ "I didn't catch that. Let me repeat the options."

### Goodbye
✅ "Thank you for calling [Company]. Have a great day. Goodbye."

## Accessibility notes
- Offer a "press 0 for a person" option on every menu level
- Keep hold music volume lower than voice prompts
- Repeat menu options after 5-second silence (timeout) before fallback
`);

writeNote('calls', 'security/webhook-validation.md', `# Webhook Security

## Twilio signature validation

Every Twilio webhook MUST validate the X-Twilio-Signature header.
Without this, anyone can POST fake call events to your endpoints.

\`\`\`js
const twilio = require('twilio')

function validateTwilioSignature(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const signature = req.headers['x-twilio-signature']
  const url       = \`\${process.env.BASE_URL}\${req.originalUrl}\`
  const params    = req.body  // must be urlencoded body

  if (!twilio.validateRequest(authToken, signature, url, params)) {
    return res.status(403).json({ success: false, code: 'ERR_INVALID_SIGNATURE', message: 'Invalid Twilio signature' })
  }
  next()
}
\`\`\`

**Critical:** Twilio sends urlencoded bodies, not JSON. The route must use:
\`\`\`js
router.use(express.urlencoded({ extended: false }))
\`\`\`
If you use \`express.json()\` on a Twilio route, the signature validation will fail.

## Vonage signature validation

\`\`\`js
const crypto = require('crypto')

function validateVonageSignature(req, res, next) {
  const received = req.headers['x-nexmo-signature']
  const computed = crypto
    .createHmac('sha256', process.env.VONAGE_SIGNATURE_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex')
  if (received !== computed) {
    return res.status(403).json({ success: false, code: 'ERR_INVALID_SIGNATURE' })
  }
  next()
}
\`\`\`

## General security rules

- Never log full phone numbers — store and log the last 4 digits only
- Never log full transcript text without encryption-at-rest confirmation
- Call recordings must be served via presigned URLs, never public URLs
- Rotate TWILIO_AUTH_TOKEN immediately if leaked (generates a new token in Twilio console)
- Use separate Twilio subaccounts for prod vs staging
`);

log.ok('calls vault seeded');

// ─── Backend: data-access architecture (data-architect sub-agent) ─────────────
writeNote('backend', 'architecture/data-access-and-pooling.md', `# Data Access & Connection Pooling

Goal: never overload the database. One application, one shared pool.

## Single shared pool
- Initialize the DB connection/pool ONCE at startup (a singleton module) and import it everywhere.
- Never call \`new Pool()\` / \`createConnection()\` per request, per route, or inside a loop.
- Node/pg: a single \`Pool\` with \`max\` sized to the DB's connection limit (e.g. 10–20), plus \`idleTimeoutMillis\` and \`connectionTimeoutMillis\`.
- Python/SQLAlchemy: one \`Engine\` (it owns the pool) created once; sessions are short-lived and returned to the pool.
- Serverless / many instances: put a pooler in front (PgBouncer / RDS Proxy / Supabase pooler) — direct pools exhaust fast.

## Avoid exhaustion
- Always release/return connections (try/finally, or a context manager).
- Keep transactions short; never hold a connection open across an external or AI/LLM call.
- Cap concurrency so in-flight queries never exceed the pool size.
`);

writeNote('backend', 'architecture/ai-query-discipline.md', `# AI Query Discipline

When an AI/LLM agent touches the database it must not over-fetch or over-call.

## Rules (enforced by the data-architect)
- **Read-only by default** — AI tools get SELECT-only access; writes go through reviewed services.
- **Always bound results** — \`LIMIT\` + a time/range filter on every query. No unbounded scans.
- **Never \`SELECT *\`** — list only the columns the agent needs.
- **Parameterized queries only** — never build SQL by string-concatenating model output.
- **One purposeful query, not many** — avoid N+1; don't re-query for data already in context.
- **Retrieval (RAG):** fetch top-K with a relevance threshold; never pull whole tables into the prompt.
- **Cache hot lookups** (see [[caching-and-lookup-tables]]) so repeated agent calls don't re-hit the DB.
`);

writeNote('backend', 'architecture/caching-and-lookup-tables.md', `# Caching & Lookup Tables

Reduce database load by not asking the same question twice.

## Caching
- Cache read-heavy, slow-changing data (config, reference lists, computed aggregates).
- Layer: in-memory (per-process) for tiny hot data; Redis for shared/multi-instance state.
- Set TTLs; invalidate on write (write-through, or an explicit bust in the mutating service).
- Cache keys must include all query params; never cache per-user data under a shared key.

## Lookup / reference tables
- Move enums and repeated reference data into lookup tables (or cached maps) to avoid repeated joins.
- Preload small lookups into memory at startup.
- Add covering indexes for the lookup access paths.
`);
log.ok('backend data-access architecture seeded');

// ─── Frontend: complex CSS reference (layout / positioning / contrast) ────────
writeNote('frontend', 'architecture/complex-css.md', `# Complex CSS (parent-child, positioning, contrast)

The hardest, most bug-prone styling. Three specialists own it and run on every frontend task.

## Layout & parent-child ([[layout-architect]])
- Prefer Grid for 2D structure, Flex for 1D rows/columns; avoid deep nesting without reason.
- A child's size/position depends on its parent's display/sizing — make that dependency explicit.
- Add \`min-width: 0\` / \`min-height: 0\` on flex/grid children to stop overflow blowouts.
- Drive responsive behaviour with container queries / breakpoints, not magic numbers.

## Positioning & stacking ([[positioning-specialist]])
- Maintain a documented z-index scale (e.g. base 0, dropdown 1000, modal 2000, toast 3000).
- Know what creates a stacking context (transform, opacity < 1, position + z-index, filter).
- Render overlays/modals in a portal at the body root to escape \`overflow: hidden\` clipping.
- Use \`position: sticky\` carefully — it needs a scroll container and no overflow-hidden ancestor.

## Contrast & accessibility ([[contrast-specialist]])
- Meet WCAG AA: 4.5:1 for normal text, 3:1 for large text and UI/icons.
- Verify ratios in BOTH light and dark themes; check token-on-token colour pairs.
- Always provide a visible \`:focus-visible\` state — never remove outlines without a replacement.
`);
log.ok('frontend complex-css architecture seeded');

// ─── Ponytail vault ───────────────────────────────────────────────────────────
// The "lazy senior dev" minimal-code philosophy. Vendored from the ponytail
// project (https://github.com/DietrichGebert/ponytail, MIT). The ponytail
// workflow reads these three notes before reviewing a session's generated code.
writeNote('ponytail', 'philosophy/decision-ladder.md', `# The Decision Ladder

> Makes the agent think like the laziest senior dev in the room.
> **The best code is the code you never wrote.**

Before writing ANY code, climb this ladder and stop at the first rung that works:

1. **Does this need to exist? (YAGNI)** — If the requirement is speculative, skip it.
   Don't build for an imagined future; build for the request in front of you.
2. **Already in the codebase?** — Reuse an existing function, component, or util.
3. **Standard library?** — Use the language stdlib before writing custom code.
4. **Native platform feature?** — Use a built-in browser/runtime/DB feature before a library.
5. **Installed dependency?** — Use a dependency already in the project before adding a new one.
6. **One-line solution?** — Prefer a clean one-liner over a multi-line block.
7. **Only then: minimal working code.** — Write the least code that fully solves the problem.

## Review heuristics (what over-engineering looks like)
- Unrequested abstractions, wrapper layers, or "framework" code for a single use.
- Hand-rolled code that duplicates the stdlib, a native feature, or an installed dep.
- Dead code, unused exports, needless indirection, premature generalization.
- Multi-line blocks that collapse to a clear one-liner.

## Bias
**Deletion over addition. Boring over clever.** Bug fixes target the root cause, not the symptom.
Mark deliberate simplifications with a \`ponytail:\` comment so future readers know what was
skipped and when to add it back.
`);

writeNote('ponytail', 'philosophy/modes.md', `# Intensity Modes

The agent runs at one of three intensities (passed in as \`mode\`):

| Mode | Behavior |
|------|----------|
| **lite** | Build as asked. Suggest a lazier alternative, but do **not** edit files. |
| **full** (default) | Enforce the decision ladder. Apply behavior-preserving simplifications. Shortest explanation. |
| **ultra** | YAGNI extremist. Challenge the requirement itself — question whether the code should exist at all. |

Whatever the mode, only **explain what was skipped and when to add it back** — keep the
narration short. The output of a review is fewer lines, not more words.
`);

writeNote('ponytail', 'philosophy/never-simplify.md', `# When NOT to Simplify

Laziness is about avoiding *unnecessary* code — never about cutting corners on safety.
**Never** flag, remove, or weaken any of the following, even in \`ultra\` mode:

- **Input validation** at system boundaries.
- **Error handling** — try/catch, structured error responses, graceful degradation.
- **Security** — auth checks, token placement, sanitization, CSP, parameterized queries.
- **Accessibility** — ARIA, keyboard navigation, focus states, contrast.
- **Explicitly requested features** — if the user asked for it, it stays.

Always understand the **full** problem before proposing a shortcut. A simplification must be
behavior-preserving and high-confidence; if it is risky, leave the code as-is and report why.
Anything touching the areas above belongs in \`skippedSuggestions\`, not in the applied set.
`);

log.ok('ponytail vault seeded');

// ─── Connected knowledge graph (Obsidian [[wikilinks]]) ───────────────────────
// A home note per agent + sub-agent stubs, cross-linked along the contract flow,
// plus an orchestrator hub linking to everything. Open the `agents/` folder as
// ONE Obsidian vault to navigate the whole graph.
const link = (a) => `[[${a}]]`;
const links = (arr) => (arr.length ? arr.map(link).join(' · ') : '— none');

const GRAPH = {
  database: {
    title: 'Database Agent',
    role: 'Designs tables and migrations, validates schema, optimizes queries.',
    upstream: [], downstream: ['backend', 'calls'], validators: ['mcpbridge'],
    subAgents: [
      ['table-creator', 'Writes migration SQL for new/changed tables.', 'schema-validator'],
      ['schema-validator', 'Checks foreign keys, constraints, and naming.', 'query-optimizer'],
      ['query-optimizer', 'Adds indexes and flags N+1 / slow patterns.', null],
    ],
  },
  backend: {
    title: 'Backend Agent',
    role: 'Builds routes, controllers, and services; declares the API contract.',
    upstream: ['database'], downstream: ['frontend', 'testing', 'calls'], validators: ['mcpbridge'],
    subAgents: [
      ['flow-planner', 'Maps the business-logic flow before any code.', 'data-architect'],
      ['data-architect', 'Designs lean data access: one shared DB pool, read-only AI queries (LIMIT + time filters, no SELECT *), caching and lookup tables.', 'route-creator'],
      ['route-creator', 'Generates route + controller + service files.', 'prompt-engineer'],
      ['prompt-engineer', 'Designs AI micro-agents when the feature needs an LLM.', 'code-standards'],
      ['code-standards', 'Audits JSDoc, error format, and comments.', 'folder-structure'],
      ['folder-structure', 'Verifies the feature-folder layout and READMEs.', null],
    ],
  },
  frontend: {
    title: 'Frontend Agent',
    role: 'Builds components, wires API calls, enforces client security.',
    upstream: ['backend'], downstream: [], validators: ['mcpbridge'],
    subAgents: [
      ['ui-designer', 'Defines layout and design-system usage.', '3d-designer'],
      ['3d-designer', 'Architects Three.js/WebGL scenes (Opus model).', 'layout-architect'],
      ['layout-architect', 'Owns parent-child CSS: Grid/Flex layout, container relationships, responsive structure.', 'positioning-specialist'],
      ['positioning-specialist', 'Owns positioning, stacking/z-index, overflow and scroll containers.', 'contrast-specialist'],
      ['contrast-specialist', 'Owns colour contrast and visual accessibility (WCAG AA+), focus states.', 'component-creator'],
      ['component-creator', 'Builds the component files.', 'api-request-handler'],
      ['api-request-handler', 'Wires components to backend contracts.', 'security-checker'],
      ['security-checker', 'Audits token placement, CSP, and storage.', null],
    ],
  },
  testing: {
    title: 'Testing Agent',
    role: 'Generates Postman collections from the backend route contract.',
    upstream: ['backend'], downstream: [], validators: [], subAgents: [],
  },
  calls: {
    title: 'Calls Agent',
    role: 'Builds inbound IVR / outbound campaigns, webhooks, voice scripts, compliance.',
    upstream: ['backend', 'database'], downstream: [], validators: ['mcpbridge'],
    subAgents: [
      ['flow-designer', 'Maps the IVR tree (inbound) or campaign flow (outbound).', 'telephony-integrator'],
      ['telephony-integrator', 'Writes webhook handlers and TwiML/NCCO.', 'voice-script-writer'],
      ['voice-script-writer', 'Writes all TTS prompts.', 'compliance-checker'],
      ['compliance-checker', 'Validates TCPA/GDPR/DNC and recording consent.', null],
    ],
  },
  ponytail: {
    title: 'Ponytail Agent',
    role: 'Lazy-senior-dev refinement gate — reviews generated code against the minimal-code decision ladder and applies safe simplifications. The best code is the code you never wrote.',
    upstream: ['backend', 'frontend', 'calls'], downstream: ['mcpbridge'], validators: [], subAgents: [],
  },
  mcpbridge: {
    title: 'MCP Bridge Agent',
    role: 'Validates frontend↔backend↔database↔calls contracts; gates the commit.',
    upstream: ['backend', 'frontend', 'database', 'calls', 'ponytail'], downstream: ['gitdevops'], validators: [], subAgents: [],
  },
  gitdevops: {
    title: 'Git / DevOps Agent',
    role: 'Runs the security scan, creates the branch, writes the commit.',
    upstream: ['mcpbridge'], downstream: [], validators: [], subAgents: [],
  },
};

const DOMAINS = Object.keys(GRAPH);

for (const [name, g] of Object.entries(GRAPH)) {
  const pipeline = g.subAgents.length
    ? g.subAgents.map((s) => link(s[0])).join(' → ')
    : 'Single agent — no sub-agents.';
  writeNote(name, `${name}.md`, [
    `# ${g.title}`,
    '',
    '> Part of the Software Engineer orchestration graph. Open the `agents/` folder as a single Obsidian vault to follow the links below.',
    '',
    `**Role:** ${g.role}`,
    `**Orchestrated by:** ${link('orchestrator')}`,
    '',
    '## Talks to',
    `- **Reads from (upstream):** ${g.upstream.length ? links(g.upstream) : '— (entry point)'}`,
    `- **Hands off to (downstream):** ${g.downstream.length ? links(g.downstream) : '— (leaf)'}`,
    `- **Validated by:** ${links(g.validators)}`,
    '',
    '## Internal pipeline (sub-agents)',
    pipeline,
    '',
    '## Knowledge',
    'Accumulated decisions and patterns live in this vault (see `INDEX.md`) and in `knowledge.db`.',
    '',
  ].join('\n'));

  for (const [sub, role, next] of g.subAgents) {
    writeNote(name, `sub-agents/${sub}.md`, [
      `# ${sub}`,
      '',
      `Sub-agent of ${link(name)}.`,
      '',
      `**Does:** ${role}`,
      `**Hands off to:** ${next ? link(next) : `returns results to ${link(name)}`}`,
      '',
    ].join('\n'));
  }
}

writeNote('orchestrator', 'orchestrator.md', [
  '# Orchestrator',
  '',
  'The top-level coordinator. Routes each task through the domain agents in dependency order and passes typed JSON contracts between them.',
  '',
  '## Dependency order',
  `${link('database')} → ${link('backend')} → ( ${link('frontend')} · ${link('testing')} · ${link('calls')} ) → ${link('ponytail')} → ${link('mcpbridge')} → ${link('gitdevops')}`,
  '',
  '## Domain agents',
  DOMAINS.map(link).join(' · '),
  '',
  '## How they communicate',
  "- **Knowledge (persistent):** each agent's vault + `knowledge.db` — this connected graph.",
  '- **Coordination (live):** typed JSON contracts passed per task + `shared/orchestrator.db` session log.',
  '- **Per-task history:** a session note is written to `sessions/` in real time (git-ignored — personal).',
  '',
].join('\n'));

writeNote('orchestrator', 'routing/dependency-order.md', [
  '# Routing & dependency order',
  '',
  '| Step | Agent | Consumes | Produces |',
  '|------|-------|----------|----------|',
  `| 1 | ${link('database')} | task | DatabaseOutput |`,
  `| 2 | ${link('backend')} | DatabaseOutput | BackendOutput |`,
  `| 3a | ${link('frontend')} | BackendOutput | FrontendOutput |`,
  `| 3b | ${link('testing')} | BackendOutput | Postman collection |`,
  `| 3c | ${link('calls')} | BackendOutput, DatabaseOutput | CallsOutput |`,
  `| 4 | ${link('ponytail')} | code outputs | simplified files + review |`,
  `| 5 | ${link('mcpbridge')} | all outputs | contract validation |`,
  `| 6 | ${link('gitdevops')} | validated outputs | branch + commit |`,
  '',
  'Steps 3a–3c run in parallel. Ponytail (step 4) trims the generated code before the',
  'bridge re-validates contracts. The commit only happens if step 5 passes.',
  '',
].join('\n'));

log.ok('knowledge graph seeded (home notes, sub-agents, orchestrator)');

// ─── Update all INDEX.md files ────────────────────────────────────────────────
const AGENT_NAMES = ['backend', 'frontend', 'database', 'testing', 'gitdevops', 'mcpbridge', 'calls', 'ponytail', 'orchestrator'];
AGENT_NAMES.forEach(name => {
  updateIndexMd(name);
  log.ok(`${name} vault/INDEX.md updated`);
});

console.log('');
log.ok('Seed complete. Run: node init/verify.js');
