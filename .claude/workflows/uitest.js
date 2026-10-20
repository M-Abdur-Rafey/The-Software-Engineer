export const meta = {
  name: 'uitest',
  description: 'Functional UI testing: generated Playwright specs for changed and linked flows, multi-user and UI-vs-DB checks, triage and a report with fix commands',
  phases: [
    { title: 'Environment', detail: 'Templates, installs, app services on free ports with a throwaway test DB, seeded users' },
    { title: 'Plan', detail: 'Flows in scope -> test matrix (steps, roles, input variants, multi-user, DB consistency)' },
    { title: 'Generate', detail: 'One small-model agent per flow whose spec is missing or outdated' },
    { title: 'Run', detail: 'Playwright in parallel (no model tokens)' },
    { title: 'Triage', detail: 'Failures only: repair broken specs once, report real bugs' },
    { title: 'Report', detail: 'docs/system/testing report, run state, teardown' },
  ],
}

// args: { projectPath, agentsDir, confirmed, date (YYYY-MM-DD),
//         scope: <output of shared/lib/uitest.js scope>, env: <output of shared/lib/uitest.js env>, workers? }
// The skill runs scope + env, shows the plan and asks the user; this workflow refuses to
// start without confirmed: true. Mechanical steps run on haiku at low effort.
const AGENTS_DIR  = (args && args.agentsDir)   || 'C:/Users/Hp/Desktop/Ideas/Agents'
const projectPath = (args && args.projectPath) || ''
const scope       = (args && args.scope)       || null
const envInfo     = (args && args.env)         || {}
const runDate     = (args && args.date)        || 'undated'
const workers     = (args && args.workers)     || envInfo.workers || 2
const UI_CLI      = `node "${AGENTS_DIR}/shared/lib/uitest.js"`
const SYSDOCS_CLI = `node "${AGENTS_DIR}/shared/lib/sysdocs.js"`
const TPL         = `${AGENTS_DIR}/shared/templates/uitest`
const DOCS        = `${projectPath}/docs/system`
const UI          = `${projectPath}/tests/ui`
const SMALL       = { model: 'haiku', effort: 'low' }

if (!args || args.confirmed !== true) {
  return { status: 'needs-confirmation', message: 'Show the scope and environment plan to the user and re-run with confirmed: true.' }
}
if (!scope || scope.skip) {
  return { status: 'skipped', reason: (scope && scope.reason) || 'no scope given' }
}

const flows = scope.flows || []
log(`${flows.length} flow(s) in scope (${flows.filter(f => f.regenerate).length} to generate), ${workers} worker(s)`)

// ─── Phase: Environment ──────────────────────────────────────────────────────
phase('Environment')
const ENV_SCHEMA = {
  type: 'object',
  required: ['ready', 'baseUrl', 'apiUrl', 'db', 'dbKind', 'usersFile', 'roles', 'started'],
  properties: {
    ready:   { type: 'boolean' },
    problem: { type: 'string' },
    baseUrl: { type: 'string' },
    apiUrl:  { type: 'string' },
    db:      { type: 'string' },
    dbKind:  { type: 'string' },
    usersFile: { type: 'string' },
    roles:   { type: 'array', items: { type: 'string' } },
    started: { type: 'array', items: { type: 'object', required: ['name', 'port'], properties: { name: { type: 'string' }, port: { type: 'number' } } } },
  },
}
const environment = await agent(
  `Prepare a throwaway test environment for UI tests of the project at ${projectPath}. Do not touch the developer's running services or their data.\n\n` +
  `1. Copy templates into ${UI}/ only where the target file does not exist yet: ${TPL}/playwright.config.ts, ${TPL}/fixtures.ts, ${TPL}/app.ts, ` +
  `and ${TPL}/gitignore as ${UI}/.gitignore.\n` +
  `2. Run these installs if listed (the user already approved them): ${JSON.stringify(envInfo.installs || [])}\n` +
  `3. Read ${DOCS}/modules/foundation/README.md (or the module that owns the server entry and config) and the root package.json to learn ` +
  `how to start the API and the web UI, their env vars and the database type.\n` +
  `4. Database: SQLite -> a new temp file path; a database server (already running on one of ${JSON.stringify(envInfo.runningPorts || [])}) ` +
  `-> a new database named <name>_uitest on that server. Never point at the developer's existing database.\n` +
  `5. Start the API and the web UI in the background on these free ports: ${JSON.stringify(envInfo.freePorts || [])}, with the test DB and any ` +
  `required secrets set to throwaway test values (e.g. a random JWT secret). Record each service's name and port (PIDs differ ` +
  `between shells, so cleanup goes by port). Wait until each answers ` +
  `(health endpoint or HTTP 200 on its root) for up to 60 seconds.\n` +
  `6. Run: ${UI_CLI} check-host <web URL> <API URL>. If it exits non-zero, stop everything you started and return ready=false.\n` +
  `7. Seed one test user per role documented in ${DOCS}/modules/*/README.md (plus a second user of the main member role for multi-user ` +
  `tests) through the app's own registration API. Use emails like uitest-<role>-1@example.test and strong random passwords. Write ` +
  `them as a JSON array [{role, email, password, name}] to ${UI}/.results/users.json (git-ignored; throwaway credentials for this ` +
  `local test app). Do not put passwords in your reply.\n\n` +
  `Return { ready, problem?, baseUrl, apiUrl, db (path or URL), dbKind ("sqlite"|"postgres"|"mysql"|"other"), usersFile, roles, started }.`,
  Object.assign({ label: 'environment', phase: 'Environment', schema: ENV_SCHEMA }, SMALL)
)
const TEARDOWN_SCHEMA = {
  type: 'object',
  required: ['stopped', 'remaining'],
  properties: { stopped: { type: 'array', items: { type: 'number' } }, remaining: { type: 'array', items: { type: 'number' } } },
}
const teardown = () => agent(
  `This is the final cleanup step of the UI test run the user confirmed; it was approved together with starting these test ` +
  `services. Stop the process listening on each of these ports (they were free before this run started, so only this run's ` +
  `services use them): ${JSON.stringify(environment.started || [])}. Then delete the throwaway test database ${environment.db} ` +
  `(${environment.dbKind}: the temp file and its -wal/-shm companions, or drop the *_uitest database) and ${UI}/.results/users.json. ` +
  `Do not stop or delete anything else. Return { stopped: [ports], remaining: [ports still listening] }.`,
  Object.assign({ label: 'teardown', phase: 'Report', schema: TEARDOWN_SCHEMA }, SMALL)
)

if (!environment.ready) {
  const cleanup = await teardown()
  return { status: 'environment-failed', problem: environment.problem || 'environment not ready', cleanup }
}
log(`app at ${environment.baseUrl} (API ${environment.apiUrl}), roles ${environment.roles.join(', ')}, ${environment.dbKind} test DB`)

await agent(
  `Open ${UI}/app.ts. If it still contains "TODO" or "not implemented", implement it for this project:\n` +
  `- loginUi and loginApi from the auth module docs (${DOCS}/modules/*/README.md APIs section and its flows/) and the real login page ` +
  `in the frontend source (find the form fields and the signed-in state to wait for).\n` +
  `- dbQuery for dbKind "${environment.dbKind}" using the matching read-only variant in the file's comment; the DB location comes from ` +
  `process.env.UITEST_DB. Keep the single-SELECT guard.\n` +
  `If it is already implemented, leave it unchanged. Return "done".`,
  Object.assign({ label: 'app-adapter', phase: 'Environment' }, SMALL)
)

// ─── Phase: Plan ─────────────────────────────────────────────────────────────
phase('Plan')
const PLAN_SCHEMA = {
  type: 'object',
  required: ['flows'],
  properties: {
    flows: {
      type: 'array',
      items: {
        type: 'object',
        required: ['module', 'flow', 'spec', 'cases'],
        properties: {
          module: { type: 'string' },
          flow:   { type: 'string' },
          spec:   { type: 'string' },
          cases:  { type: 'array', items: { type: 'string' } },
          multiUser:   { type: 'array', items: { type: 'string' } },
          consistency: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    questionsAdded: { type: 'array', items: { type: 'string' } },
  },
}
const toGenerate = flows.filter(f => f.regenerate)
let plan = { flows: [], questionsAdded: [] }
if (toGenerate.length) {
  plan = await agent(
    `You are the UI test planner. Read ${DOCS}/INDEX.md and ${DOCS}/dependencies.md, then ONLY these flow docs and their modules' README ` +
    `Data/APIs/Decisions sections:\n${toGenerate.map(f => `- ${projectPath}/${f.doc} (spec: ${f.spec})`).join('\n')}\n\n` +
    `Seeded roles: ${JSON.stringify(environment.roles)}. Input variant rules: ${TPL}/payloads/inputs.json.\n\n` +
    `For each flow produce test cases as one-line descriptions:\n` +
    `- the happy path per role that may perform it, and the denied path for roles that may not\n` +
    `- input variants (from inputs.json) for each form field the flow submits, with the expected result taken from the docs\n` +
    `- multiUser: scenarios where two users act at once on shared data (one changes, the other sees it after refresh or live; both edit ` +
    `the same record), only where the flow touches shared data\n` +
    `- consistency: after each step that changes data, the read-only SELECT whose result must match what the UI shows (counts, totals, text)\n` +
    `Expected results come from the docs and answered questions. If an expected result is not documented, make the case "observed only" ` +
    `and add a System Docs question: write a JSON array to a file and run ${SYSDOCS_CLI} ask "${projectPath}" <module> @<file> ` +
    `(each item needs question, chainReaction, technical, plain, data, options, touches).\n\n` +
    `Return { flows: [{ module, flow, spec, cases, multiUser, consistency }], questionsAdded: [ids] }.`,
    { label: 'test-planner', phase: 'Plan', schema: PLAN_SCHEMA, effort: 'low' }
  )
  log(`planned ${plan.flows.reduce((n, f) => n + f.cases.length + (f.multiUser || []).length, 0)} case(s) across ${plan.flows.length} flow(s)`)
} else {
  log('every spec in scope is up to date: skipping planning and generation')
}

// ─── Phase: Generate ─────────────────────────────────────────────────────────
phase('Generate')
await pipeline(plan.flows, f => agent(
  `Write the Playwright spec ${projectPath}/${f.spec} for flow "${f.flow}" of module "${f.module}" (flow doc: ${DOCS}/modules/${f.module}/flows/${f.flow}.md).\n\n` +
  `Import exactly: import { test, expect, call, asUsers, userFor, loginApi, dbQuery, API_URL } from '${'../'.repeat(f.spec.split('/').length - 3)}fixtures'; ` +
  `Use role-based locators (getByRole/getByLabel/getByText) found in the frontend source; never hardcode hosts or credentials.\n\n` +
  `Cases:\n${f.cases.map(c => `- ${c}`).join('\n')}\n` +
  ((f.multiUser || []).length ? `Multi-user cases (use asUsers(browser, [...roles]); each page is a separate user):\n${f.multiUser.map(c => `- ${c}`).join('\n')}\n` : '') +
  ((f.consistency || []).length ? `UI-vs-DB checks (await dbQuery(sql, params) and compare with what the page shows):\n${f.consistency.map(c => `- ${c}`).join('\n')}\n` : '') +
  `\nName each test after its case. Make tests independent (each creates its own data). Assertions are unconditional: never ` +
  `branch an expect on what the app returned and never call test.skip at run time; an unmet precondition fails the test. Return "done".`,
  Object.assign({ label: `spec:${f.module}/${f.flow}`, phase: 'Generate' }, SMALL)
))

// ─── Phase: Run ──────────────────────────────────────────────────────────────
phase('Run')
const RUN_SCHEMA = {
  type: 'object',
  required: ['total', 'passed', 'failures'],
  properties: {
    total:  { type: 'number' },
    passed: { type: 'number' },
    failures: { type: 'array', items: { type: 'object', required: ['spec', 'title', 'error'], properties: { spec: { type: 'string' }, title: { type: 'string' }, error: { type: 'string' } } } },
  },
}
const specs = flows.map(f => f.spec)
const runEnv = `UITEST_BASE_URL=${environment.baseUrl} UITEST_API_URL=${environment.apiUrl} UITEST_DB=${environment.db} ` +
  `UITEST_WORKERS=${workers} UITEST_USERS_FILE=${environment.usersFile}`
const runSpecs = (label, list) => agent(
  `From ${projectPath}, run Playwright with these environment variables set (use your shell's syntax for setting them):\n${runEnv}\n\n` +
  `Command: npx playwright test -c tests/ui/playwright.config.ts ${list.join(' ')}\n\n` +
  `Then read tests/ui/.results/results.json and return { total, passed, failures: [{ spec, title, error (first 400 chars) }] }.`,
  Object.assign({ label, phase: 'Run', schema: RUN_SCHEMA }, SMALL)
)
const firstRun = await runSpecs('playwright', specs)
log(`${firstRun.passed}/${firstRun.total} passed`)

const ENV_ERROR = /Executable doesn't exist|browserType\.launch|playwright install|ECONNREFUSED|ERR_CONNECTION_REFUSED/i
const envFailures = firstRun.failures.filter(x => ENV_ERROR.test(x.error))
if (firstRun.total === 0 || (firstRun.failures.length && envFailures.length === firstRun.failures.length)) {
  const cleanup = await teardown()
  const reason = (envFailures[0] || firstRun.failures[0] || { error: 'no tests were collected' }).error.slice(0, 300)
  log(`environment problem, nothing was tested: ${reason}`)
  return { status: 'environment-failed', problem: reason, total: firstRun.total, specsWritten: plan.flows.length, cleanup }
}

// ─── Phase: Triage ───────────────────────────────────────────────────────────
phase('Triage')
const TRIAGE_CAP = 25
const failures = firstRun.failures.slice(0, TRIAGE_CAP)
if (firstRun.failures.length > TRIAGE_CAP) log(`triaging the first ${TRIAGE_CAP} of ${firstRun.failures.length} failures; the rest are listed untriaged`)
const TRIAGE_SCHEMA = {
  type: 'object',
  required: ['kind'],
  properties: {
    kind:          { type: 'string', enum: ['script-error', 'app-bug', 'flaky'] },
    repaired:      { type: 'boolean' },
    module:        { type: 'string' },
    flow:          { type: 'string' },
    whatWentWrong: { type: 'string' },
    intended:      { type: 'string' },
    got:           { type: 'string' },
    howToFix:      { type: 'string' },
  },
}
const triaged = await pipeline(failures, f => agent(
  `A UI test failed. Spec: ${projectPath}/${f.spec}\nTest: ${f.title}\nError: ${f.error}\n` +
  `Trace and screenshot (if any) are under ${UI}/.results/artifacts/. The flow doc is the source of truth for intended behaviour: ${DOCS}/modules/.\n\n` +
  `Decide:\n- script-error: the test itself is wrong (stale selector, wrong expectation versus the docs, timing). Fix the spec once and set repaired=true.\n` +
  `- flaky: passes on a rerun of just this test with no change.\n` +
  `- app-bug: the app does not do what the docs say. Do not change app code. Fill whatWentWrong (plain language, 1-2 sentences), ` +
  `intended (from the flow doc or recorded decision, with its path), got (actual status/response/UI state and the step that produced it), ` +
  `howToFix (likely file and function, and the change), module, flow.\n` +
  `Return the object.`,
  Object.assign({ label: `triage:${f.title.slice(0, 40)}`, phase: 'Triage', schema: TRIAGE_SCHEMA }, SMALL)
).then(t => Object.assign({}, f, t)))

const repairedSpecs = [...new Set(triaged.filter(t => t && t.kind === 'script-error' && t.repaired).map(t => t.spec))]
let rerun = null
if (repairedSpecs.length) {
  rerun = await runSpecs('playwright-rerun', repairedSpecs)
  log(`rerun of ${repairedSpecs.length} repaired spec(s): ${rerun.passed}/${rerun.total} passed`)
}
const bugs = triaged.filter(t => t && t.kind === 'app-bug').map(b => Object.assign({}, b, {
  fixCommand: `/software-engineer fix: ${b.whatWentWrong} Expected: ${b.intended}. Got: ${b.got}. Module: ${b.module}.`,
}))
const needsUpdating = (rerun ? rerun.failures : []).filter(r => !bugs.some(b => b.title === r.title))

// ─── Phase: Report ───────────────────────────────────────────────────────────
phase('Report')
const reportFile = `${DOCS}/testing/${runDate}-report.md`
await agent(
  `Write the UI test report to ${reportFile} (create the folder if needed). Plain, compact Markdown, ASCII only:\n\n` +
  `# UI test report: ${runDate}\n` +
  `- Scope: ${scope.mode} (${scope.reason}); modules: ${(scope.modules || []).join(', ')}\n` +
  `- Flows: ${flows.length} (${plan.flows.length} specs generated, ${flows.length - plan.flows.length} reused)\n` +
  `- Result: ${firstRun.passed}/${firstRun.total} passed on the first run\n` +
  `- Security suites: not part of this version of the command\n\n` +
  `Then a "Bugs" section with one subsection per item below, each with the fields What went wrong, Intended result, What we got, ` +
  `How to fix, and the Fix command in a code block:\n${JSON.stringify(bugs, null, 2)}\n\n` +
  `Then "Tests that need updating" (not app bugs):\n${JSON.stringify(needsUpdating.map(n => ({ spec: n.spec, title: n.title, error: n.error })), null, 2)}\n` +
  `Then "Flaky": ${JSON.stringify(triaged.filter(t => t && t.kind === 'flaky').map(t => t.title))}\n` +
  (firstRun.failures.length > TRIAGE_CAP ? `Then "Not triaged": ${JSON.stringify(firstRun.failures.slice(TRIAGE_CAP).map(f => f.title))}\n` : '') +
  ((plan.questionsAdded || []).length ? `Then "Open questions" listing ${JSON.stringify(plan.questionsAdded)} (System Docs questions raised where behaviour is undocumented).\n` : '') +
  `\nAfter writing it (tests ran, so the run state may advance), run: ${UI_CLI} record "${projectPath}" '${JSON.stringify({ flows: flows.map(f => f.doc), flowsGenerated: plan.flows.length, summary: `${firstRun.passed}/${firstRun.total} passed, ${bugs.length} bug(s)` })}'\n` +
  `Return "done".`,
  Object.assign({ label: 'report', phase: 'Report' }, SMALL)
)

const cleanup = await teardown()
if ((cleanup.remaining || []).length) log(`still listening after cleanup: ${cleanup.remaining.join(', ')}`)

return {
  status: 'completed',
  report: reportFile,
  total: firstRun.total,
  passed: firstRun.passed,
  bugs: bugs.map(b => ({ module: b.module, flow: b.flow, whatWentWrong: b.whatWentWrong, fixCommand: b.fixCommand })),
  testsNeedingUpdate: needsUpdating.length,
  questionsAdded: plan.questionsAdded || [],
  cleanup,
}
