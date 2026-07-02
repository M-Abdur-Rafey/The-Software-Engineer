export const meta = {
  name: 'testing',
  description: 'Testing agent — generates Postman collections from backend route contracts',
  phases: [
    { title: 'Load Context', detail: 'Read Postman templates and prior collections' },
    { title: 'Generate Collection', detail: 'Build Postman v2.1 collection for each route' },
    { title: 'Write Output', detail: 'Save collection JSON and summary report' },
  ],
}

const AGENTS_DIR    = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'
const sessionId     = (args && args.sessionId)    || 'no-session'
const taskText      = (args && args.taskText)     || ''
const projectPath   = (args && args.projectPath)  || ''
const backendOutput      = (args && args.backendOutput)      || null
const requirementsOutput = (args && args.requirementsOutput) || null

const routes      = (backendOutput && backendOutput.routes) || []
const userStories = (requirementsOutput && requirementsOutput.userStories) || []

// ─── Phase: Load Context ─────────────────────────────────────────────────────
phase('Load Context')

const context = await agent(
  `Load context for the Testing Agent (session: ${sessionId}).\n\n` +
  `Read: ${AGENTS_DIR}/agents/testing/vault/templates/postman-item-template.md\n\n` +
  `Also check if any prior collections exist in: ${AGENTS_DIR}/agents/testing/vault/collections/\n\n` +
  `Return JSON: { template: "<text of postman-item-template.md>", priorCollections: [string] }`,
  {
    label: 'load-context',
    schema: {
      type: 'object',
      required: ['template', 'priorCollections'],
      properties: {
        template:         { type: 'string' },
        priorCollections: { type: 'array', items: { type: 'string' } },
      },
    },
  }
)

log(`Template loaded. ${routes.length} routes to test. Prior collections: ${context.priorCollections.length}`)

if (routes.length === 0) {
  return {
    sessionId,
    agentName:    'testing',
    status:       'completed',
    collectionPath: '',
    routeCount:   0,
    testCases:    [],
    coverage:     { routesCovered: 0, totalRoutes: 0, percentCovered: 100 },
    errors:       ['No routes provided — backend agent may not have run'],
  }
}

// ─── Phase: Generate Collection ───────────────────────────────────────────────
phase('Generate Collection')

const featureName = taskText.split(' ').slice(0, 4).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '')
const collectionPath = `${AGENTS_DIR}/agents/testing/vault/collections/${featureName}.postman.json`

const collection = await agent(
  `You are the Testing Agent. Generate a complete Postman Collection v2.1 JSON.\n\n` +
  `Routes to test (from backend contract):\n${JSON.stringify(routes, null, 2)}\n\n` +
  (userStories.length
    ? `User stories with acceptance criteria (from the requirements spec) — derive realistic ` +
      `test data and edge cases directly from these Given/When/Then criteria, and add one extra ` +
      `test per acceptance criterion that maps to a route:\n${JSON.stringify(userStories, null, 2)}\n\n`
    : '') +
  `Template reference:\n${context.template}\n\n` +
  `Rules:\n` +
  `- Collection name: "${featureName}"\n` +
  `- Use Postman variables: {{baseUrl}} and {{bearerToken}} — never hardcode URLs or tokens\n` +
  `- For EACH route, create exactly:\n` +
  `  a) Positive test (status 200/201): valid payload, asserts status + responseTime < 2000ms + success===true\n` +
  `  b) Negative test (status 400/422): invalid/missing payload, asserts status>=400 + success===false\n` +
  `  c) Auth test (status 401): ONLY if authRequired=true, no Authorization header, asserts status===401\n` +
  `- Group route items into a folder named after the feature\n` +
  `- The collection variable block must include: baseUrl (value: http://localhost:3000) and bearerToken (value: "")\n\n` +
  `Write the collection JSON to: ${collectionPath}\n\n` +
  `Return JSON: { testCases: [{routePath,method,scenarioName,type:"positive"|"negative"|"auth",expectedStatus}], routeCount: ${routes.length}, written: boolean }`,
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

// ─── Phase: Write Output ──────────────────────────────────────────────────────
phase('Write Output')

const routesCovered = new Set(collection.testCases.map(t => t.routePath)).size
const pct = routes.length > 0 ? Math.round((routesCovered / routes.length) * 100) : 100

await agent(
  `Write the testing session report and persist state.\n\n` +
  `1. Write a report to: ${AGENTS_DIR}/agents/testing/vault/reports/${sessionId}.md\n` +
  `Content:\n` +
  `# Test Report — Session ${sessionId}\n\n` +
  `**Task:** ${taskText}\n` +
  `**Routes:** ${routes.length}\n` +
  `**Test cases:** ${collection.testCases.length}\n` +
  `**Coverage:** ${pct}%\n` +
  `**Collection:** ${collectionPath}\n\n` +
  `## Test cases\n` +
  collection.testCases.map(t => `- ${t.method} ${t.routePath} — ${t.scenarioName} (${t.type}, expect ${t.expectedStatus})`).join('\n') +
  `\n\n` +
  `2. Log session event:\n` +
  `cd "${AGENTS_DIR}" && node shared/lib/db-cli.js --as testing log-session-event testing "${sessionId}" "complete" "completed" "${collection.testCases.length} test cases, ${pct}% coverage"\n\n` +
  `Return "done".`,
  { label: 'write-output' }
)

return {
  sessionId,
  agentName:     'testing',
  status:        'completed',
  collectionPath,
  routeCount:    routes.length,
  testCases:     collection.testCases,
  coverage: {
    routesCovered,
    totalRoutes:    routes.length,
    percentCovered: pct,
  },
  errors: [],
}
