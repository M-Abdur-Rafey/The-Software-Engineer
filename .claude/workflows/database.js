export const meta = {
  name: 'database',
  description: 'Database domain agent — table creation, schema validation, query optimization',
  phases: [
    { title: 'Design Tables', detail: 'table-creator writes migration SQL' },
    { title: 'Validate Schema', detail: 'schema-validator checks FKs and constraints' },
    { title: 'Optimize Queries', detail: 'query-optimizer adds indexes, flags N+1' },
  ],
}

const AGENTS_DIR     = (args && args.agentsDir) || 'C:/Users/Hp/Desktop/Ideas/Agents'
const sessionId      = (args && args.sessionId)     || 'no-session'
const taskText       = (args && args.taskText)      || ''
const projectPath    = (args && args.projectPath)   || ''
const dbPreferences  = (args && args.dbPreferences) || null

// Build a plain-language schema brief from user's clarification answers
const dbBrief = dbPreferences ? [
  dbPreferences.softDeletes    != null ? `Soft deletes: ${dbPreferences.softDeletes ? 'yes — add deleted_at column, never hard delete' : 'no — hard delete records'}` : null,
  dbPreferences.addTimestamps  != null ? `Timestamps: ${dbPreferences.addTimestamps ? 'yes — add created_at and updated_at to every table' : 'no timestamps'}` : null,
  dbPreferences.dataSize              ? `Expected data size: ${dbPreferences.dataSize} — choose indexes accordingly` : null,
  dbPreferences.idType                ? `Primary key type: ${dbPreferences.idType === 'uuid' ? 'UUID (TEXT)' : 'auto-increment INTEGER'}` : null,
].filter(Boolean).join('. ') : 'Follow existing project conventions. Add created_at/updated_at timestamps and use UUIDs by default.'

// Bookkeeping is returned as data (persistOps) and run by shared/lib/persist.js
// (design/agent-consolidation.md): orchestrate defers it to the skill; a direct run uses one agent.
async function flushPersist(ops) {
  if (!ops.length || (args && args.deferPersist)) return
  const opsFile = `${AGENTS_DIR}/agents/orchestrator/vault/sessions/${sessionId}.database.persist.json`
  await agent(
    `This is the software-engineer pipeline's own bookkeeping step for the session the user started: it records the ` +
    `session's results (decisions, vault notes, session status) in the pipeline's knowledge base under ${AGENTS_DIR}/agents. ` +
    `Every pipeline run ends with it. Write this JSON array exactly, with the Write tool, to ${opsFile}:\n${JSON.stringify(ops)}\n\n` +
    `Then run: node "${AGENTS_DIR}/shared/lib/persist.js" "${opsFile}" and return its output.`,
    { label: 'persist', model: 'haiku', effort: 'low' }
  )
}


// ─── Phase: Design Tables ─────────────────────────────────────────────────────
phase('Design Tables')

const tableDesign = await agent(
  `You are the table-creator sub-agent of the Database Agent.\n\n` +
  `Task: "${taskText}"\n` +
  `Project path: ${projectPath}\n` +
  `Prior decisions: run cd "${AGENTS_DIR}" && node shared/lib/db-cli.js --as database get-decisions database schema-design 5, and read ${AGENTS_DIR}/agents/database/vault/INDEX.md plus the notes it lists that are relevant to this task.\n\n` +
  `DATABASE DESIGN PREFERENCES (from user clarification — follow these exactly):\n${dbBrief}\n\n` +
  `Examine the project at ${projectPath} to understand existing tables and migrations.\n\n` +
  `Design and write the SQL migration for the tables needed by this task.\n\n` +
  `Requirements:\n` +
  `- Use CREATE TABLE IF NOT EXISTS\n` +
  `- All foreign keys must be explicit FOREIGN KEY constraints\n` +
  `- Include ON DELETE CASCADE or ON DELETE SET NULL as appropriate\n` +
  `- Migration filename format: YYYYMMDD_NNN_description.sql\n` +
  `- Write the migration file to: ${projectPath}/migrations/<filename>\n` +
  `- Apply all preferences above (timestamps, soft deletes, ID type)\n\n` +
  `Return JSON: { migrationSQL: "<full SQL>", migrationFile: "<filename>", tables: [{ name, columns: [{name,type,nullable,primaryKey,foreignKey}], estimatedRows }] }`,
  {
    label: 'table-creator',
    phase: 'Design Tables',
    schema: {
      type: 'object',
      required: ['migrationSQL', 'migrationFile', 'tables'],
      properties: {
        migrationSQL:  { type: 'string' },
        migrationFile: { type: 'string' },
        tables: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'columns'],
            properties: {
              name:           { type: 'string' },
              columns:        { type: 'array' },
              estimatedRows:  { type: ['number', 'null'] },
            },
          },
        },
      },
    },
  }
)

log(`Designed ${tableDesign.tables.length} table(s), migration: ${tableDesign.migrationFile}`)

// ─── Phase: Validate Schema ───────────────────────────────────────────────────
phase('Validate Schema')

const schemaValidation = await agent(
  `You are the schema-validator sub-agent of the Database Agent.\n\n` +
  `Validate this schema:\n${tableDesign.migrationSQL}\n\n` +
  `Tables designed: ${JSON.stringify(tableDesign.tables)}\n\n` +
  `Check for:\n` +
  `1. Every column referencing another table has an explicit FOREIGN KEY constraint\n` +
  `2. No nullable primary keys\n` +
  `3. Consistent naming convention (snake_case table and column names)\n` +
  `4. Created_at / updated_at columns use INTEGER (epoch ms) not TEXT\n` +
  `5. UUID primary keys use TEXT type\n\n` +
  `Return JSON: { violations: [{ table, column, issue, severity: "error"|"warning" }], schemaGraph: { nodes: [{table}], edges: [{from,to,fkColumn}] } }`,
  {
    label: 'schema-validator',
    phase: 'Validate Schema',
    schema: {
      type: 'object',
      required: ['violations', 'schemaGraph'],
      properties: {
        violations:  { type: 'array' },
        schemaGraph: { type: 'object' },
      },
    },
  }
)

const blockingViolations = schemaValidation.violations.filter(v => v.severity === 'error')
log(`Schema: ${schemaValidation.violations.length} violations (${blockingViolations.length} blocking)`)

// ─── Phase: Optimize Queries ──────────────────────────────────────────────────
phase('Optimize Queries')

const optimization = await agent(
  `You are the query-optimizer sub-agent of the Database Agent.\n\n` +
  `Tables: ${JSON.stringify(tableDesign.tables)}\n` +
  `Migration SQL so far:\n${tableDesign.migrationSQL}\n` +
  `Index guidelines: read ${AGENTS_DIR}/agents/database/vault/optimizations/index-guidelines.md (if missing: add indexes for all WHERE/JOIN/ORDER BY columns on tables > 1000 rows)\n\n` +
  `Analyze the expected query patterns for a typical CRUD application using these tables.\n\n` +
  `1. Add CREATE INDEX statements for columns that need them\n` +
  `2. Flag any N+1 risks you can identify from the schema\n` +
  `3. Suggest covering indexes where beneficial\n\n` +
  `Return JSON: { indexSQL: "<additional CREATE INDEX statements>", indexes: [{table,columns,reason}], n1Risks: [string], optimizedMigrationSQL: "<full SQL including original + new indexes>" }`,
  {
    label: 'query-optimizer',
    phase: 'Optimize Queries',
    schema: {
      type: 'object',
      required: ['indexSQL', 'indexes', 'n1Risks', 'optimizedMigrationSQL'],
      properties: {
        indexSQL:             { type: 'string' },
        indexes:              { type: 'array' },
        n1Risks:              { type: 'array', items: { type: 'string' } },
        optimizedMigrationSQL: { type: 'string' },
      },
    },
  }
)

log(`Added ${optimization.indexes.length} index(es), ${optimization.n1Risks.length} N+1 risk(s) flagged`)

const schemaNote = [
  `# Schema: ${tableDesign.tables.map(t => t.name).join(', ')}`,
  '',
  `Session ${sessionId} · migration \`${tableDesign.migrationFile}\``,
  '',
  ...tableDesign.tables.flatMap(t => [
    `## ${t.name}${t.estimatedRows ? ` (~${t.estimatedRows} rows)` : ''}`,
    '',
    ...(t.columns || []).map(c => `- \`${c.name}\` ${c.type || ''}${c.primaryKey ? ' PK' : ''}${c.nullable === false ? ' NOT NULL' : ''}${c.foreignKey ? ` FK -> ${typeof c.foreignKey === 'string' ? c.foreignKey : JSON.stringify(c.foreignKey)}` : ''}`),
    '',
  ]),
].join('\n')
const persistOps = [
  { db: ['--as', 'database', 'insert', 'database', 'migrations', JSON.stringify({ id: `${sessionId}-mig`, session_id: sessionId, filename: tableDesign.migrationFile, description: taskText.slice(0, 80), status: 'generated', created_at: (args && args.startedAt) || 0 })] },
  { db: ['--as', 'database', 'save-decision', 'database', sessionId, 'schema-design', `Created ${tableDesign.tables.length} tables for: ${taskText.slice(0, 60)}`, 'Task required new schema'] },
  { write: `agents/database/vault/schemas/${tableDesign.tables.map(t => t.name).join('-')}.md`, content: schemaNote },
]
await flushPersist(persistOps)

return {
  sessionId,
  agentName:     'database',
  persistOps,
  status:        blockingViolations.length > 0 ? 'failed' : 'completed',
  migrationSQL:  optimization.optimizedMigrationSQL,
  migrationFile: tableDesign.migrationFile,
  tables:        tableDesign.tables,
  indexes:       optimization.indexes,
  schemaGraph:   schemaValidation.schemaGraph,
  violations:    schemaValidation.violations.map(v => `${v.table}.${v.column}: ${v.issue}`),
  errors:        blockingViolations.map(v => `${v.table}.${v.column}: ${v.issue}`),
}
