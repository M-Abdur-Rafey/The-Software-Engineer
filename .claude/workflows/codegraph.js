export const meta = {
  name: 'codegraph',
  description: 'Build a filtered Obsidian knowledge graph of a project — only the routes, components, tables and relationships that actually exist in the code. Lean by design: no theoretical or unused nodes.',
  phases: [
    { title: 'Extract', detail: 'Parse the codebase into real nodes (routes/components/tables/features) + edges' },
    { title: 'Render', detail: 'Write connected Obsidian notes with metadata + a machine-readable graph.json' },
  ],
}

// args: { sessionId?, projectPath, agentsDir, maxNodesPerType? }
const AGENTS_DIR   = (args && args.agentsDir)   || 'C:/Users/Hp/Desktop/Ideas/Agents'
const projectPath  = (args && args.projectPath) || ''
const sessionId    = (args && args.sessionId)   || 'codegraph'
const CAP          = (args && args.maxNodesPerType) || 60  // keep the graph lean; log anything dropped

const projectName  = projectPath.split(/[/\\]/).pop() || 'project'
const graphDir     = `${AGENTS_DIR}/agents/orchestrator/vault/projects/${projectName}/graph`

log(`Building code knowledge graph for: ${projectName}`)

// ─── Phase: Extract ───────────────────────────────────────────────────────────
phase('Extract')

const graph = await agent(
  `You are the Code-Graph Extractor. Parse an existing software project into a LEAN knowledge graph.\n\n` +
  `Project path: ${projectPath}\n` +
  `Project name: ${projectName}\n\n` +
  `GROUNDING — read these first if they exist (they are prior scan output, faster than re-reading everything):\n` +
  `- ${AGENTS_DIR}/agents/backend/vault/projects/${projectName}.md\n` +
  `- ${AGENTS_DIR}/agents/frontend/vault/projects/${projectName}.md\n` +
  `- ${AGENTS_DIR}/agents/database/vault/projects/${projectName}.md\n` +
  `If those do not exist, scan the project source directly.\n\n` +
  `HARD FILTERING RULE (this is the whole point):\n` +
  `- Include ONLY entities that literally exist in this project's source code.\n` +
  `- NEVER invent "typical" or "theoretical" routes/tables/components. If you cannot point to a real file, exclude it.\n` +
  `- Exclude dead/commented-out/unused code. When unsure whether something exists, leave it out.\n\n` +
  `Build these node types (cap each at ${CAP}; if there are more, keep the most central and report the count dropped):\n` +
  `- feature  : a cohesive module/domain folder (e.g. src/features/users). meta: { path }\n` +
  `- route    : a real HTTP route. meta: { method, path, file, auth: "required"|"public" }\n` +
  `- component: a real UI component/page. meta: { file, kind: "page"|"layout"|"widget"|"form" }\n` +
  `- table    : a real DB table/model. meta: { file, columns: [string], primaryKey: string|null }\n` +
  `- integration (optional): a real external service the code calls. meta: { file }\n\n` +
  `Build edges only where the relationship is evidenced in code:\n` +
  `- "belongs-to"   : route/component/table -> the feature it lives in\n` +
  `- "calls"        : component -> route (from an actual fetch/axios/api call)\n` +
  `- "reads-writes" : route -> table (handler touches that table)\n` +
  `- "fk"           : table -> table (a real foreign key)\n\n` +
  `Node id convention (unique, kebab, used as the Obsidian note name):\n` +
  `  feature: "feat-<name>" · route: "route-<method>-<path-slug>" · component: "cmp-<name>" · table: "tbl-<name>" · integration: "int-<name>"\n\n` +
  `Return JSON:\n` +
  `{ "project": "${projectName}", "root": "${projectPath}",\n` +
  `  "nodes": [{ "id": string, "label": string, "type": "feature"|"route"|"component"|"table"|"integration", "meta": object }],\n` +
  `  "edges": [{ "from": string, "to": string, "rel": "belongs-to"|"calls"|"reads-writes"|"fk" }],\n` +
  `  "dropped": { "routes": number, "components": number, "tables": number },\n` +
  `  "summary": string }`,
  {
    label: 'extract-graph',
    phase: 'Extract',
    schema: {
      type: 'object',
      required: ['project', 'nodes', 'edges', 'summary'],
      properties: {
        project: { type: 'string' },
        root:    { type: 'string' },
        nodes: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'label', 'type'],
            properties: {
              id:    { type: 'string' },
              label: { type: 'string' },
              type:  { type: 'string', enum: ['feature', 'route', 'component', 'table', 'integration'] },
              meta:  { type: 'object' },
            },
          },
        },
        edges: {
          type: 'array',
          items: {
            type: 'object',
            required: ['from', 'to', 'rel'],
            properties: {
              from: { type: 'string' },
              to:   { type: 'string' },
              rel:  { type: 'string', enum: ['belongs-to', 'calls', 'reads-writes', 'fk'] },
            },
          },
        },
        dropped: { type: 'object' },
        summary: { type: 'string' },
      },
    },
  }
)

const counts = graph.nodes.reduce((a, n) => (a[n.type] = (a[n.type] || 0) + 1, a), {})
log(`Graph: ${graph.nodes.length} nodes (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}), ${graph.edges.length} edges`)
const dropped = graph.dropped || {}
const totalDropped = (dropped.routes || 0) + (dropped.components || 0) + (dropped.tables || 0)
if (totalDropped) log(`NOTE: ${totalDropped} entit(ies) dropped to keep the graph lean (routes:${dropped.routes || 0} components:${dropped.components || 0} tables:${dropped.tables || 0})`)

if (graph.nodes.length === 0) {
  return {
    status: 'completed',
    projectName,
    graphDir,
    nodeCount: 0,
    edgeCount: 0,
    note: 'No real code entities found — nothing to graph. Run `/software-engineer onboard` first, or check the project path.',
  }
}

// ─── Phase: Render ────────────────────────────────────────────────────────────
phase('Render')

await agent(
  `You are the Code-Graph Renderer. Write a connected Obsidian knowledge graph from this JSON.\n\n` +
  `GRAPH JSON:\n${JSON.stringify(graph)}\n\n` +
  `Write every file below into: ${graphDir}/  (create the folder). Use the Write tool. ASCII only — no emoji.\n\n` +
  `1. ONE note per node at ${graphDir}/<node.id>.md . Each note:\n` +
  `   - Starts with YAML frontmatter holding the node's type and every key in meta, e.g.:\n` +
  `     ---\n     type: route\n     method: GET\n     path: /api/users\n     file: src/features/users/routes.js\n     auth: required\n     ---\n` +
  `   - Then a "# <label>" heading.\n` +
  `   - Then an "## Links" section listing every edge that touches this node as an Obsidian wikilink,\n` +
  `     labelled by relationship, pointing at the OTHER node's id. Examples:\n` +
  `       - belongs-to -> [[feat-users]]\n` +
  `       - calls -> [[route-get-api-users]]\n` +
  `       - reads-writes -> [[tbl-users]]\n` +
  `     Render the edge from both endpoints so the graph is bidirectionally navigable.\n\n` +
  `2. A hub note at ${graphDir}/_index.md :\n` +
  `   - Frontmatter: type: code-graph, project, generated-from (root), node-count, edge-count.\n` +
  `   - "# ${projectName} — Code Knowledge Graph" heading + the summary.\n` +
  `   - A section per node type listing each node as a [[wikilink]].\n` +
  `   - If any entities were dropped for leanness, a "## Not shown (capped)" line stating the counts: ` +
  `routes ${dropped.routes || 0}, components ${dropped.components || 0}, tables ${dropped.tables || 0}.\n\n` +
  `3. A machine-readable ${graphDir}/graph.json containing the exact GRAPH JSON above (for tooling/agents).\n\n` +
  `Only write nodes present in the JSON — do not add anything. Return JSON: { filesWritten: number }`,
  {
    label: 'render-graph',
    phase: 'Render',
    schema: {
      type: 'object',
      required: ['filesWritten'],
      properties: { filesWritten: { type: 'number' } },
    },
  }
)

// Log the run into the session log (orchestrator vault) via the data CLI.
await agent(
  `Record the code-graph run. Run exactly:\n\n` +
  `cd "${AGENTS_DIR}"; node shared/lib/db-cli.js --as orchestrator log-session-event orchestrator "${sessionId}" "codegraph" "completed" "${projectName}: ${graph.nodes.length} nodes, ${graph.edges.length} edges"\n\n` +
  `Return "done".`,
  { label: 'log-codegraph', model: 'haiku' }
)

log(`Code knowledge graph written to ${graphDir}`)

return {
  status: 'completed',
  projectName,
  graphDir,
  nodeCount: graph.nodes.length,
  edgeCount: graph.edges.length,
  byType: counts,
  dropped,
  summary: graph.summary,
  openHint: `Open ${AGENTS_DIR}/agents/orchestrator/vault as an Obsidian vault, then open projects/${projectName}/graph/_index.md and switch to Graph View.`,
}
