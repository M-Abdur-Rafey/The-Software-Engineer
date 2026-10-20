export const meta = {
  name: 'testing',
  description: 'Testing agent — generates Postman collections for the routes and flows this session changed',
  phases: [
    { title: 'Generate Collection', detail: 'Postman v2.1 tests for new routes, changed behaviour and affected flows only' },
  ],
}

const AGENTS_DIR    = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'

// The shared project map (design/agent-consolidation.md, change 4): read it instead of exploring the repo.
const projectMapBrief = (args && args.projectMap)
  ? `Project map (trust it; open only the files you need):\n${args.projectMap}\n\n`
  : (args && args.projectMapFile)
    ? `Project map: read ${args.projectMapFile} first if it exists, and trust it instead of exploring the repo.\n\n`
    : ''
const sessionId     = (args && args.sessionId)    || 'no-session'
const taskText      = (args && args.taskText)     || ''
const projectPath   = (args && args.projectPath)  || ''
const backendOutput      = (args && args.backendOutput)      || null
const requirementsOutput = (args && args.requirementsOutput) || null

const routes      = (backendOutput && backendOutput.routes) || []
const userStories = (requirementsOutput && requirementsOutput.userStories) || []
// System Docs flow folders of the modules this session targeted (absent without System Docs).
const flowDirs    = (args && args.flowDirs) || []

// Test only what changed: new routes get the full suite, modified routes get their changed
// behaviour plus one smoke check, unchanged routes get nothing. Routes from a backend that
// predates the `change` field are treated as new so nothing goes untested.
const newRoutes      = routes.filter(r => r.change !== 'modified')
const modifiedRoutes = routes.filter(r => r.change === 'modified')
const unlabelled     = routes.filter(r => !r.change).length
if (unlabelled) log(`${unlabelled} route(s) have no change label: treating them as new (full suite)`)

// Bookkeeping is returned as data (persistOps) and run by shared/lib/persist.js
// (design/agent-consolidation.md): orchestrate defers it to the skill; a direct run uses one agent.
async function flushPersist(ops) {
  if (!ops.length || (args && args.deferPersist)) return
  const opsFile = `${AGENTS_DIR}/agents/orchestrator/vault/sessions/${sessionId}.testing.persist.json`
  await agent(
    `This is the software-engineer pipeline's own bookkeeping step for the session the user started: it records the ` +
    `session's results (decisions, vault notes, session status) in the pipeline's knowledge base under ${AGENTS_DIR}/agents. ` +
    `Every pipeline run ends with it. Write this JSON array exactly, with the Write tool, to ${opsFile}:\n${JSON.stringify(ops)}\n\n` +
    `Then run: node "${AGENTS_DIR}/shared/lib/persist.js" "${opsFile}" and return its output.`,
    { label: 'persist', model: 'haiku', effort: 'low' }
  )
}

log(`${newRoutes.length} new + ${modifiedRoutes.length} modified route(s), ${flowDirs.length} flow folder(s)`)

if (routes.length === 0) {
  return {
    sessionId,
    agentName:    'testing',
    status:       'completed',
    collectionPath: '',
    routeCount:   0,
    testCases:    [],
    coverage:     { routesCovered: 0, totalRoutes: 0, percentCovered: 100, needsSetup: 0 },
    errors:       ['No routes provided — backend agent may not have run'],
  }
}

// ─── Phase: Generate Collection ───────────────────────────────────────────────
phase('Generate Collection')

const featureName = taskText.split(' ').slice(0, 4).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'session'
// The session id keeps a re-run of the same task from overwriting an earlier collection.
const collectionPath = `${AGENTS_DIR}/agents/testing/vault/collections/${featureName}-${String(sessionId).slice(0, 8)}.postman.json`

const collection = await agent(
  `You are the Testing Agent. Generate a Postman Collection v2.1 JSON that tests ONLY what this session changed.\n\n` +
  projectMapBrief +
  (newRoutes.length ? `NEW routes (full suite):\n${JSON.stringify(newRoutes, null, 2)}\n\n` : '') +
  (modifiedRoutes.length ? `MODIFIED routes (test the changeSummary only):\n${JSON.stringify(modifiedRoutes, null, 2)}\n\n` : '') +
  (userStories.length
    ? `User stories with acceptance criteria (from the requirements spec). Use them for realistic test data, and add one ` +
      `test per acceptance criterion that exercises a NEW or MODIFIED route above (skip criteria about unchanged behaviour):\n` +
      `${JSON.stringify(userStories, null, 2)}\n\n`
    : '') +
  (flowDirs.length
    ? `Flows: read the flow files in ${flowDirs.join(', ')}. For each flow whose steps call a NEW or MODIFIED route, add ` +
      `ONE end-to-end scenario: a folder of chained requests following the flow's steps, passing ids/tokens between steps ` +
      `with collection variables, asserting the flow's expected outcome. Ignore flows that touch no changed route.\n\n`
    : '') +
  `Template reference: read ${AGENTS_DIR}/agents/testing/vault/templates/postman-item-template.md\n\n` +
  `Rules:\n` +
  `- Collection name: "${featureName}"\n` +
  `- Use Postman variables: {{baseUrl}} and {{bearerToken}} — never hardcode URLs or tokens\n` +
  `- NEW route: a) positive (200/201, valid payload, asserts status + responseTime < 2000ms), b) negative ` +
  `(400/422, invalid/missing payload, asserts status>=400), c) auth (401, ONLY if authRequired=true, no Authorization header)\n` +
  `- MODIFIED route: one test per behaviour named in changeSummary (type "change", asserting the new status/body), ` +
  `plus ONE positive smoke test (type "smoke") proving the route still works. Do NOT regenerate negative/auth tests ` +
  `for behaviour that did not change.\n` +
  `- Do not test any route or flow not listed or referenced above.\n` +
  `- Assertions are unconditional: never wrap an expectation in a check of the response (no if (pm.response.code === ...), ` +
  `no early return, no skipping). Assert the expected status and body every time; a test whose setup or precondition fails must ` +
  `FAIL with a clear message, never pass or skip. Coverage counts only tests with unconditional assertions.\n` +
  `- A test that needs anything the collection cannot set up through its own requests (a server started with a different ` +
  `config or modified file, seeded data, a second service) gets needsSetup: true and a setupNote saying exactly what to prepare. ` +
  `It stays in the collection but does not count as coverage.\n` +
  `- Group items into folders: "${featureName} / new", "${featureName} / changed", "${featureName} / flows"\n` +
  `- The collection variable block must include: baseUrl (value: http://localhost:3000) and bearerToken (value: "")\n\n` +
  `Write the collection JSON to: ${collectionPath}\n\n` +
  `Return JSON: { testCases: [{routePath,method,scenarioName,type:"positive"|"negative"|"auth"|"change"|"smoke"|"flow",expectedStatus,needsSetup,setupNote}], routeCount: ${routes.length}, written: boolean }`,
  {
    label: 'generate-collection',
    phase: 'Generate Collection',
    schema: {
      type: 'object',
      required: ['testCases', 'routeCount', 'written'],
      properties: {
        testCases:  { type: 'array' },
        routeCount: { type: 'number' },
        written:    { type: 'boolean' },
      },
    },
  }
)

log(`Generated ${collection.testCases.length} test case(s) for ${collection.routeCount} route(s)`)

// A route counts as covered only by a test that runs as-is; tests needing extra setup are listed apart.
const needsSetup = collection.testCases.filter(t => t && t.needsSetup)
const routesCovered = new Set(collection.testCases.filter(t => t && !t.needsSetup).map(t => t.routePath)).size
const pct = routes.length > 0 ? Math.round((routesCovered / routes.length) * 100) : 100

const persistOps = [
  { write: `agents/testing/vault/reports/${sessionId}.md`,
    content: `# Test Report — Session ${sessionId}\n\n**Task:** ${taskText}\n` +
      `**Routes:** ${routes.length} changed (${newRoutes.length} new, ${modifiedRoutes.length} modified); unchanged routes are not retested\n` +
      `**Test cases:** ${collection.testCases.length}\n**Coverage:** ${pct}%\n**Collection:** ${collectionPath}\n\n## Test cases\n` +
      collection.testCases.map(t => `- ${t.method} ${t.routePath} — ${t.scenarioName} (${t.type}, expect ${t.expectedStatus})${t.needsSetup ? ' [needs setup]' : ''}`).join('\n') + '\n' +
      (needsSetup.length
        ? `\n## Needs setup before running (not counted as coverage)\n` + needsSetup.map(t => `- ${t.scenarioName}: ${t.setupNote || 'setup not described'}`).join('\n') + '\n'
        : '') },
  { db: ['--as', 'testing', 'log-session-event', 'testing', sessionId, 'complete', 'completed', `${collection.testCases.length} test cases, ${pct}% coverage`] },
]
await flushPersist(persistOps)

return {
  sessionId,
  agentName:     'testing',
  status:        'completed',
  persistOps,
  collectionPath,
  routeCount:    routes.length,
  testCases:     collection.testCases,
  coverage: {
    routesCovered,
    totalRoutes:    routes.length,
    percentCovered: pct,
    needsSetup:     needsSetup.length,
  },
  errors: [],
}
