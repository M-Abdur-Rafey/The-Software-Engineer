#!/usr/bin/env node
// Software Engineer — cross-IDE MCP server.
//
// Exposes the multi-agent orchestrator over the Model Context Protocol so it
// works in any MCP host (Cursor, Windsurf, VS Code, Claude Code, …). Reasoning
// runs through the host's model via MCP sampling, or via ANTHROPIC_API_KEY /
// OPENAI_API_KEY when sampling isn't available. See mcp/README.md.
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { createModel } from './lib/model.mjs'
import { health, classify, orchestrate } from './lib/orchestrator.mjs'

const server = new Server(
  { name: 'software-engineer', version: '1.2.0' },
  { capabilities: { tools: {}, logging: {} } }
)
const model = createModel({ server })

const TOOLS = [
  {
    name: 'software_engineer_health',
    description:
      'Check the engine: knowledge bases, contracts, and which model backend is available (host sampling / Anthropic key / OpenAI key).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'software_engineer_classify',
    description:
      'Classify a development task into the domains it touches (database/backend/frontend/calls) plus a task type and slug.',
    inputSchema: { type: 'object', required: ['task'], properties: { task: { type: 'string' } } },
  },
  {
    name: 'software_engineer_orchestrate',
    description:
      'Plan (and optionally apply) a development task across the database, backend, frontend and calls domain agents, in that order. ' +
      'Safe by default: returns a plan. Set apply=true to write the generated files into projectPath (a git repository): the files are ' +
      'kept only if the pre-commit security scan passes, otherwise nothing is written. This path does not write a requirements spec, ' +
      'run tests or the contract bridge, or commit; the result lists them under "notRun".',
    inputSchema: {
      type: 'object',
      required: ['task', 'projectPath'],
      properties: {
        task: { type: 'string' },
        projectPath: { type: 'string' },
        apply: { type: 'boolean' },
        clarifications: { type: 'object' },
      },
    },
  },
]

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: a = {} } = req.params
  const log = (data) => {
    server.sendLoggingMessage?.({ level: 'info', data }).catch(() => {})
  }
  try {
    let result
    if (name === 'software_engineer_health') result = await health({ model })
    else if (name === 'software_engineer_classify') result = await classify({ task: a.task, model })
    else if (name === 'software_engineer_orchestrate') result = await orchestrate({ ...a, model, log })
    else throw new Error(`Unknown tool: ${name}`)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  } catch (e) {
    return { isError: true, content: [{ type: 'text', text: `Error: ${e.message}` }] }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
// IMPORTANT: stdout is the protocol channel — only log to stderr.
process.stderr.write('[software-engineer] MCP server ready on stdio\n')
