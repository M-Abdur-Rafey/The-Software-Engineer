Build a task tracker: a Node.js + Express REST API with SQLite (better-sqlite3), plus a small React (Vite) web UI.

Runtime contract (must hold exactly):
- Root package.json: `npm install` then `npm start` starts the API. It reads PORT (default 3000), DB_PATH (SQLite file path, default ./data.db, created with all tables on start if missing) and JWT_SECRET (required; refuse to start without it). All responses are JSON.
- The web UI lives in web/ (Vite + React). `npm install && npm run build` inside web/ must succeed. It talks to the API via a configurable base URL (env VITE_API_URL), never a hardcoded host.

API:
- GET /api/health -> 200 {"status":"ok"}
- Auth (JWT bearer tokens, passwords hashed with bcrypt):
  - POST /api/auth/register {email, password, name} -> 201 {id, email, name, role}. The FIRST registered user gets role "admin", everyone after gets "member". Duplicate email -> 409. Missing/invalid fields (bad email, password under 8 chars, empty name) -> 400.
  - POST /api/auth/login {email, password} -> 200 {token, user: {id, email, name, role}}. Wrong credentials -> 401.
  - GET /api/auth/me -> 200 {id, email, name, role}. Missing/invalid token -> 401. Every route below also requires a valid token (401 otherwise).
- Projects:
  - POST /api/projects {name, description?} -> 201 {id, name, description, ownerId}. The creator becomes the owner and a member.
  - GET /api/projects -> 200 array of projects the user is a member of (admins see all projects).
  - GET /api/projects/:id -> 200 project. A non-member (who is not admin) -> 403. Unknown id -> 404.
  - PATCH /api/projects/:id {name?, description?} -> 200 updated project. Only the owner or an admin; others -> 403.
  - DELETE /api/projects/:id -> 204, also deletes its tasks and memberships. Only the owner or an admin; others -> 403.
  - POST /api/projects/:id/members {userId} -> 201 {projectId, userId}. Only the owner or an admin. Unknown user -> 404.
  - GET /api/projects/:id/members -> 200 array of {id, email, name, role} (members of the project; non-members -> 403).
- Tasks (inside projects; any project member or an admin may use them, others -> 403):
  - POST /api/projects/:id/tasks {title, status?, assigneeId?, dueDate?} -> 201 {id, projectId, title, status, assigneeId, dueDate}. status is one of todo|doing|done (default todo; anything else -> 400). Empty title -> 400. assigneeId must be a member of the project, otherwise 400. dueDate is an ISO date string or null.
  - GET /api/projects/:id/tasks?status=todo -> 200 array (optional status filter).
  - PATCH /api/tasks/:id {title?, status?, assigneeId?, dueDate?} -> 200 updated task (same validation as create). Unknown id -> 404.
  - DELETE /api/tasks/:id -> 204.

Web UI: login/register page, a projects list with create, a project page with its task list (create task, change status, assign to a member), and an admin-only badge in the header. Keep it simple and clean.
