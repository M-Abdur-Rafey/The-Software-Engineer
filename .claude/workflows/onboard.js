export const meta = {
  name: 'onboard',
  description: 'Deep project scan — reads the entire codebase once and loads all knowledge into every agent database and vault so future sessions start with full context',
  phases: [
    { title: 'Discover', detail: 'Tech stack, folder structure, dependencies' },
    { title: 'Backend Scan', detail: 'Extract all routes, controllers, services, middleware patterns' },
    { title: 'Frontend Scan', detail: 'Extract components, API calls, state management, styling' },
    { title: 'Database Scan', detail: 'Extract tables, schemas, migrations, ORM patterns' },
    { title: 'Conventions', detail: 'Commit style, naming, error handling, import style' },
    { title: 'Populate Knowledge', detail: 'Write everything to agent databases and vaults' },
    { title: 'Mark Complete', detail: 'Record project as onboarded' },
  ],
}

// args: { sessionId, projectPath, agentsDir }
const AGENTS_DIR  = (args && args.agentsDir)    || 'C:/Users/Hp/Desktop/Agents'
const projectPath = (args && args.projectPath)  || ''
const sessionId   = (args && args.sessionId)    || 'onboard'

log(`Onboarding project: ${projectPath}`)

// ─── Phase 1: Discover ────────────────────────────────────────────────────────
phase('Discover')

const discovery = await agent(
  `You are onboarding an existing software project into the Software Engineer agent system.

  Project path: ${projectPath}

  Read and analyse the project to understand it completely. Start with these files (if they exist):
  - package.json (root + any workspace packages)
  - package-lock.json or yarn.lock (for exact dependency versions)
  - tsconfig.json
  - .env.example or .env.sample
  - Any config files: vite.config.*, webpack.config.*, next.config.*, tailwind.config.*
  - The top-level README.md if present

  Then list all top-level directories and describe what each contains.

  Determine:
  1. **Runtime:** Node.js / Python / other?
  2. **Backend framework:** Express / Fastify / NestJS / Next.js API routes / none?
  3. **Frontend framework:** React / Vue / Svelte / Next.js / Vanilla / none?
  4. **Database:** PostgreSQL / MySQL / SQLite / MongoDB / Supabase / Prisma / Sequelize / none?
  5. **State management:** Redux / Zustand / Jotai / MobX / React Query / Context / none?
  6. **Styling:** Tailwind / styled-components / CSS modules / SASS / plain CSS?
  7. **Testing:** Jest / Vitest / Mocha / none? Postman collections exist?
  8. **Authentication:** JWT / sessions / Passport / Supabase Auth / none?
  9. **Monorepo:** yes (Turborepo/nx/workspaces) / no?
  10. **Deployment:** Vercel / Railway / Docker / bare Node / other?

  Also describe the top-level folder structure (one line per folder: what it contains).

  Return JSON:
  {
    "techStack": {
      "runtime": string,
      "backendFramework": string | null,
      "frontendFramework": string | null,
      "database": string | null,
      "orm": string | null,
      "stateManagement": string | null,
      "styling": string | null,
      "testing": string | null,
      "auth": string | null,
      "monorepo": boolean,
      "deployment": string | null
    },
    "topLevelFolders": [{ "name": string, "purpose": string }],
    "projectSummary": string,
    "entryPoints": [string]
  }`,
  {
    label: 'discover-stack',
    phase: 'Discover',
    schema: {
      type: 'object',
      required: ['techStack', 'topLevelFolders', 'projectSummary', 'entryPoints'],
      properties: {
        techStack:        { type: 'object' },
        topLevelFolders:  { type: 'array' },
        projectSummary:   { type: 'string' },
        entryPoints:      { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

log(`Stack: ${JSON.stringify(discovery.techStack)}`)

// ─── Phase 2: Backend Scan ────────────────────────────────────────────────────
phase('Backend Scan')

const backendScan = await agent(
  `You are scanning the backend of an existing project for the Backend Agent knowledge base.

  Project: ${projectPath}
  Backend framework: ${discovery.techStack.backendFramework || 'unknown'}
  Top-level folders: ${JSON.stringify(discovery.topLevelFolders)}

  Thoroughly scan the entire backend source code. Find:

  1. **All routes** — search for every route definition:
     - Express: app.get/post/put/delete/patch, router.get/post/etc, app.use with paths
     - NestJS: @Controller, @Get, @Post, etc.
     - Next.js: files in pages/api/ or app/api/
     - Any other pattern
     For each route: method, path, file location, middleware used, auth required (yes/no), description

  2. **Folder structure** — how is the backend organised?
     - features/modules pattern? (src/features/users/, src/features/orders/)
     - controller/service/route split?
     - monolithic single file?
     - MVC pattern?

  3. **Error handling pattern** — what does an error response look like?
     e.g. { success: false, code: "ERR_X", message: "..." } or { error: "message" } or something else?

  4. **Auth pattern** — how is auth enforced?
     - JWT middleware? Where is it defined?
     - Session-based? Cookie-based?
     - What does the auth middleware look like?

  5. **Middleware stack** — what global middleware is applied? (cors, helmet, body-parser, etc.)

  6. **Validation** — is Joi, Zod, class-validator, or manual validation used?

  7. **Naming conventions**:
     - File naming: camelCase / kebab-case / PascalCase?
     - Function naming style?
     - Route naming pattern (RESTful? custom?)

  Return JSON:
  {
    "routes": [{ "method": string, "path": string, "file": string, "authRequired": boolean, "middleware": [string], "description": string }],
    "folderPattern": string,
    "errorFormat": string,
    "authPattern": string,
    "authMiddlewareFile": string | null,
    "globalMiddleware": [string],
    "validationLibrary": string | null,
    "namingConventions": { "files": string, "functions": string, "routes": string },
    "totalRouteCount": number,
    "featureNames": [string]
  }`,
  {
    label: 'scan-backend',
    phase: 'Backend Scan',
    schema: {
      type: 'object',
      required: ['routes', 'folderPattern', 'errorFormat', 'totalRouteCount'],
      properties: {
        routes:             { type: 'array' },
        folderPattern:      { type: 'string' },
        errorFormat:        { type: 'string' },
        authPattern:        { type: 'string' },
        authMiddlewareFile: { type: ['string', 'null'] },
        globalMiddleware:   { type: 'array', items: { type: 'string' } },
        validationLibrary:  { type: ['string', 'null'] },
        namingConventions:  { type: 'object' },
        totalRouteCount:    { type: 'number' },
        featureNames:       { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

log(`Found ${backendScan.totalRouteCount} routes across ${backendScan.featureNames.length} feature(s)`)

// ─── Phase 3: Frontend Scan ───────────────────────────────────────────────────
phase('Frontend Scan')

const frontendScan = await agent(
  `You are scanning the frontend of an existing project for the Frontend Agent knowledge base.

  Project: ${projectPath}
  Frontend framework: ${discovery.techStack.frontendFramework || 'unknown'}
  State management: ${discovery.techStack.stateManagement || 'unknown'}
  Styling: ${discovery.techStack.styling || 'unknown'}

  Thoroughly scan the frontend source code. Find:

  1. **Component inventory** — list all components (pages, layouts, widgets, forms):
     - File path
     - Type: page / layout / widget / form
     - Does it fetch API data? Which endpoints?

  2. **API call patterns** — how are API calls made?
     - Fetch / Axios / SWR / React Query / custom hook?
     - Are calls centralised in api/ files or scattered in components?
     - How is the auth token passed? (Authorization header? localStorage? cookie?)

  3. **State management patterns**:
     - Where is global state defined?
     - How is auth state stored? (JWT in localStorage? in-memory? Redux?)
     - Which data goes in local state vs global store?

  4. **Styling patterns**:
     - Is a design system or component library used? (shadcn, MUI, Ant Design, custom)
     - Are CSS variables used for theming?
     - Responsive breakpoints defined where?

  5. **Routing**:
     - React Router / Next.js router / TanStack Router / other?
     - Public vs protected routes pattern?

  6. **Naming conventions**:
     - Component file naming: PascalCase / kebab-case?
     - Are props typed? (TypeScript / PropTypes / none)

  7. **Folder structure**:
     - pages/, components/, hooks/, stores/, api/, utils/?
     - Feature-based or type-based?

  Return JSON:
  {
    "components": [{ "name": string, "filePath": string, "type": string, "usesAPI": [string] }],
    "apiCallPattern": string,
    "apiFilesLocation": string | null,
    "tokenStorageMethod": string,
    "stateManagementPattern": string,
    "routingLibrary": string,
    "designSystem": string | null,
    "componentNaming": string,
    "folderStructure": string,
    "totalComponentCount": number,
    "hasTypeScript": boolean
  }`,
  {
    label: 'scan-frontend',
    phase: 'Frontend Scan',
    schema: {
      type: 'object',
      required: ['components', 'totalComponentCount', 'tokenStorageMethod'],
      properties: {
        components:             { type: 'array' },
        apiCallPattern:         { type: 'string' },
        apiFilesLocation:       { type: ['string', 'null'] },
        tokenStorageMethod:     { type: 'string' },
        stateManagementPattern: { type: 'string' },
        routingLibrary:         { type: 'string' },
        designSystem:           { type: ['string', 'null'] },
        componentNaming:        { type: 'string' },
        folderStructure:        { type: 'string' },
        totalComponentCount:    { type: 'number' },
        hasTypeScript:          { type: 'boolean' },
      },
    },
  }
)

log(`Found ${frontendScan.totalComponentCount} component(s). Token storage: ${frontendScan.tokenStorageMethod}`)

// ─── Phase 4: Database Scan ───────────────────────────────────────────────────
phase('Database Scan')

const dbScan = await agent(
  `You are scanning the database layer of an existing project for the Database Agent knowledge base.

  Project: ${projectPath}
  Database: ${discovery.techStack.database || 'unknown'}
  ORM/query tool: ${discovery.techStack.orm || 'unknown'}

  Find and read:

  1. **Schema files**:
     - Prisma: prisma/schema.prisma
     - Sequelize: models/ directory
     - TypeORM: entities/ directory
     - Drizzle: schema.ts files
     - Raw SQL: migrations/ or db/schema/ or sql/ directories
     - Supabase: supabase/migrations/

  2. **All tables/models** — for each:
     - Table name
     - Columns (name, type, nullable, primary key)
     - Foreign keys / relationships
     - Indexes defined

  3. **Migration history** — list existing migration files (names only, not full content)

  4. **Query patterns**:
     - How are queries written? (raw SQL, ORM methods, query builder like Knex?)
     - Is connection pooling configured?
     - Are transactions used?

  5. **Seeds or fixtures** — does the project have seed data files?

  Return JSON:
  {
    "tables": [{ "name": string, "columns": [{ "name": string, "type": string, "nullable": boolean, "primaryKey": boolean, "foreignKey": string | null }], "indexes": [string] }],
    "relationships": [{ "from": string, "to": string, "type": "one-to-many" | "many-to-many" | "one-to-one", "via": string }],
    "migrationFiles": [string],
    "queryPattern": string,
    "hasSeeds": boolean,
    "schemaFilePath": string | null,
    "totalTableCount": number
  }`,
  {
    label: 'scan-database',
    phase: 'Database Scan',
    schema: {
      type: 'object',
      required: ['tables', 'totalTableCount', 'queryPattern'],
      properties: {
        tables:          { type: 'array' },
        relationships:   { type: 'array' },
        migrationFiles:  { type: 'array', items: { type: 'string' } },
        queryPattern:    { type: 'string' },
        hasSeeds:        { type: 'boolean' },
        schemaFilePath:  { type: ['string', 'null'] },
        totalTableCount: { type: 'number' },
      },
    },
  }
)

log(`Found ${dbScan.totalTableCount} table(s), ${dbScan.migrationFiles.length} migration(s)`)

// ─── Phase 5: Conventions ─────────────────────────────────────────────────────
phase('Conventions')

const conventions = await agent(
  `You are extracting code conventions from an existing project.

  Project: ${projectPath}

  1. **Git commit style** — run: git -C "${projectPath}" log --oneline -20
     Analyse the last 20 commits: do they follow Conventional Commits? What types are used?
     What is the typical subject line style?

  2. **Import style** — read a few source files:
     - CommonJS (require/module.exports) or ES Modules (import/export)?
     - Are barrel files (index.js) used?
     - How are relative imports structured?

  3. **Code style**:
     - Semicolons or no semicolons?
     - Single quotes or double quotes?
     - 2-space or 4-space indent?
     - Trailing commas?
     - Is there an ESLint or Prettier config? Read it.

  4. **Environment variables**:
     - Read .env.example or .env.sample if it exists
     - List all env var names (not values) used in the project

  5. **Security posture** (read existing code):
     - Is input validated? With what library?
     - Are SQL queries parameterised?
     - Is CORS configured? How?
     - Any CSP headers set?

  Return JSON:
  {
    "commitStyle": string,
    "usesConventionalCommits": boolean,
    "importStyle": "commonjs" | "esm" | "mixed",
    "usesBarrelFiles": boolean,
    "codingStyle": { "semicolons": boolean, "quotes": "single" | "double", "indent": number, "trailingCommas": boolean },
    "linterConfig": string | null,
    "envVarNames": [string],
    "inputValidation": string | null,
    "corsConfigured": boolean,
    "cspConfigured": boolean
  }`,
  {
    label: 'extract-conventions',
    phase: 'Conventions',
    schema: {
      type: 'object',
      required: ['commitStyle', 'importStyle', 'codingStyle', 'envVarNames'],
      properties: {
        commitStyle:             { type: 'string' },
        usesConventionalCommits: { type: 'boolean' },
        importStyle:             { type: 'string' },
        usesBarrelFiles:         { type: 'boolean' },
        codingStyle:             { type: 'object' },
        linterConfig:            { type: ['string', 'null'] },
        envVarNames:             { type: 'array', items: { type: 'string' } },
        inputValidation:         { type: ['string', 'null'] },
        corsConfigured:          { type: 'boolean' },
        cspConfigured:           { type: 'boolean' },
      },
    },
  }
)

log(`Import style: ${conventions.importStyle}. Conventional commits: ${conventions.usesConventionalCommits}`)

// ─── Phase 6: Populate Knowledge ─────────────────────────────────────────────
phase('Populate Knowledge')

const techStackStr = JSON.stringify(discovery.techStack)
const projectName = projectPath.split(/[/\\]/).pop()

await agent(
  `Populate the agent knowledge bases with everything learned about this project.

  Project: ${projectPath}
  Project name: ${projectName}
  Agents dir: ${AGENTS_DIR}

  Write the following files — overwrite if they already exist:

  ---

  FILE 1: ${AGENTS_DIR}/agents/backend/vault/projects/${projectName}.md
  Content:
  # Project: ${projectName}

  **Path:** ${projectPath}
  **Framework:** ${discovery.techStack.backendFramework || 'none'}
  **Auth:** ${discovery.techStack.auth || 'unknown'}
  **Validation:** ${backendScan.validationLibrary || 'none'}
  **Error format:** ${backendScan.errorFormat}
  **Folder pattern:** ${backendScan.folderPattern}
  **Auth middleware:** ${backendScan.authMiddlewareFile || 'not found'}
  **Global middleware:** ${(backendScan.globalMiddleware || []).join(', ')}
  **Naming:** ${JSON.stringify(backendScan.namingConventions || {})}
  **Import style:** ${conventions.importStyle}
  **Code style:** ${JSON.stringify(conventions.codingStyle)}

  ## Existing routes (${backendScan.totalRouteCount} total)

  ${(backendScan.routes || []).slice(0, 50).map(r => `- ${r.method} ${r.path} (${r.authRequired ? 'auth required' : 'public'}) — ${r.file}`).join('\n')}

  ## Features
  ${(backendScan.featureNames || []).map(f => `- ${f}`).join('\n')}

  ---

  FILE 2: ${AGENTS_DIR}/agents/frontend/vault/projects/${projectName}.md
  Content:
  # Project: ${projectName} — Frontend

  **Framework:** ${discovery.techStack.frontendFramework || 'none'}
  **State management:** ${discovery.techStack.stateManagement || 'none'} (pattern: ${frontendScan.stateManagementPattern})
  **Styling:** ${discovery.techStack.styling || 'none'} (design system: ${frontendScan.designSystem || 'none'})
  **TypeScript:** ${frontendScan.hasTypeScript}
  **Routing:** ${frontendScan.routingLibrary}
  **API calls:** ${frontendScan.apiCallPattern}
  **API files location:** ${frontendScan.apiFilesLocation || 'scattered in components'}
  **Token storage:** ${frontendScan.tokenStorageMethod}
  **Component naming:** ${frontendScan.componentNaming}
  **Folder structure:** ${frontendScan.folderStructure}

  ## CRITICAL — token storage for this project
  This project stores auth tokens via: **${frontendScan.tokenStorageMethod}**
  ${frontendScan.tokenStorageMethod.toLowerCase().includes('localstorage') ? '⚠️ WARNING: current project uses localStorage for tokens — flag this as a security concern in future sessions.' : ''}

  ## Components (${frontendScan.totalComponentCount} total)
  ${(frontendScan.components || []).slice(0, 30).map(c => `- ${c.name} (${c.type}) — ${c.filePath}${c.usesAPI && c.usesAPI.length ? ' — calls: ' + c.usesAPI.join(', ') : ''}`).join('\n')}

  ---

  FILE 3: ${AGENTS_DIR}/agents/database/vault/projects/${projectName}.md
  Content:
  # Project: ${projectName} — Database

  **Database:** ${discovery.techStack.database || 'none'}
  **ORM:** ${discovery.techStack.orm || 'none'}
  **Query pattern:** ${dbScan.queryPattern}
  **Schema file:** ${dbScan.schemaFilePath || 'not found'}
  **Has seeds:** ${dbScan.hasSeeds}
  **Migrations:** ${dbScan.migrationFiles.length} files

  ## Tables (${dbScan.totalTableCount} total)
  ${(dbScan.tables || []).map(t => `### ${t.name}\n${(t.columns || []).map(c => `- ${c.name}: ${c.type}${c.primaryKey ? ' (PK)' : ''}${c.nullable ? '' : ' NOT NULL'}${c.foreignKey ? ' → ' + c.foreignKey : ''}`).join('\n')}`).join('\n\n')}

  ## Relationships
  ${(dbScan.relationships || []).map(r => `- ${r.from} ${r.type} ${r.to} (via ${r.via})`).join('\n')}

  ## Migration files
  ${(dbScan.migrationFiles || []).map(f => `- ${f}`).join('\n')}

  ---

  FILE 4: ${AGENTS_DIR}/agents/gitdevops/vault/projects/${projectName}.md
  Content:
  # Project: ${projectName} — Git & DevOps

  **Commit style:** ${conventions.commitStyle}
  **Conventional commits:** ${conventions.usesConventionalCommits}
  **Environment variables needed:** ${(conventions.envVarNames || []).join(', ')}
  **CORS configured:** ${conventions.corsConfigured}
  **CSP configured:** ${conventions.cspConfigured}
  **Input validation:** ${conventions.inputValidation || 'none found'}
  **Linter:** ${conventions.linterConfig || 'none'}

  ${!conventions.cspConfigured ? '⚠️ CSP headers not configured — flag this as a security issue.' : ''}
  ${!conventions.corsConfigured ? '⚠️ CORS not configured — flag this as a security issue.' : ''}

  ---

  After writing all 4 files, run this command to save a decision to the backend knowledge.db:
  cd "${AGENTS_DIR}" && node shared/lib/db-cli.js save-decision backend "onboard-${sessionId}" "project-conventions" "Project ${projectName}: ${discovery.techStack.backendFramework || 'no backend'} + ${discovery.techStack.frontendFramework || 'no frontend'} + ${discovery.techStack.database || 'no db'}. Error format: ${backendScan.errorFormat}. Folder: ${backendScan.folderPattern}" "Onboarded from ${projectPath}"

  Then run to save a frontend decision:
  cd "${AGENTS_DIR}" && node shared/lib/db-cli.js save-decision frontend "onboard-${sessionId}" "storage-rules" "Project ${projectName} uses ${frontendScan.tokenStorageMethod} for tokens. API calls via ${frontendScan.apiCallPattern}. State: ${discovery.techStack.stateManagement || 'none'}" "Onboarded from ${projectPath}"

  Then run to save a database decision:
  cd "${AGENTS_DIR}" && node shared/lib/db-cli.js save-decision database "onboard-${sessionId}" "schema-design" "Project ${projectName}: ${dbScan.totalTableCount} tables. ORM: ${discovery.techStack.orm || 'none'}. Pattern: ${dbScan.queryPattern}" "Onboarded from ${projectPath}"

  Return JSON: { filesWritten: [string], decisionsaved: number }`,
  {
    label: 'populate-knowledge',
    phase: 'Populate Knowledge',
    schema: {
      type: 'object',
      required: ['filesWritten'],
      properties: {
        filesWritten:    { type: 'array', items: { type: 'string' } },
        decisionsSaved:  { type: 'number' },
      },
    },
  }
)

log(`Knowledge bases populated`)

// Also update all vault INDEX.md files
await agent(
  `Update the vault INDEX.md files for all agents. For each agent, the INDEX.md is at ${AGENTS_DIR}/agents/<name>/vault/INDEX.md.

  For each of these agents: backend, frontend, database, gitdevops

  Add a row to the INDEX.md table for the new project file:
  | projects/${projectPath.split(/[/\\]/).pop()}.md | project-conventions | today |

  If the file doesn't exist yet, that's fine — just add the row to the existing INDEX.md table.

  Return "done".`,
  { label: 'update-indexes' }
)

// ─── Phase 7: Mark Complete ───────────────────────────────────────────────────
phase('Mark Complete')

const techStackSummary = [
  discovery.techStack.backendFramework,
  discovery.techStack.frontendFramework,
  discovery.techStack.database,
].filter(Boolean).join(' + ')

await agent(
  `Mark this project as onboarded. Run:

  cd "${AGENTS_DIR}" && node shared/lib/db-cli.js mark-onboarded "${projectPath}" "${techStackSummary}" "${discovery.projectSummary.slice(0, 200).replace(/"/g, '')}"

  Return "done".`,
  { label: 'mark-onboarded' }
)

log(`Project ${projectPath.split(/[/\\]/).pop()} marked as onboarded`)

return {
  status: 'completed',
  projectPath,
  projectName,
  techStack:       discovery.techStack,
  routesFound:     backendScan.totalRouteCount,
  componentsFound: frontendScan.totalComponentCount,
  tablesFound:     dbScan.totalTableCount,
  projectSummary:  discovery.projectSummary,
  securityNotes: [
    frontendScan.tokenStorageMethod.toLowerCase().includes('localstorage') ? 'Token stored in localStorage — security risk' : null,
    !conventions.cspConfigured ? 'CSP headers not configured' : null,
    !conventions.corsConfigured ? 'CORS not configured' : null,
  ].filter(Boolean),
}
