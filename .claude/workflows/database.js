export const meta = {
  name: 'database',
  description: 'Database domain agent — table creation, schema validation, query optimization',
  phases: [
    { title: 'Load Context', detail: 'Read vault notes and prior schema decisions' },
    { title: 'Design Tables', detail: 'table-creator writes migration SQL' },
    { title: 'Validate Schema', detail: 'schema-validator checks FKs and constraints' },
    { title: 'Optimize Queries', detail: 'query-optimizer adds indexes, flags N+1' },
    { title: 'Persist', detail: 'Save decision and vault note' },
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

// ─── Phase: Load Context ─────────────────────────────────────────────────────
phase('Load Context')

const context = await agent(
  `Load context for the Database Agent (session: ${sessionId}).\n\n` +
  `Run these commands:\n` +
  `1. cd "${AGENTS_DIR}" && node shared/lib/db-cli.js --as database get-decisions database schema-design 10\n` +
  `2. Read ${AGENTS_DIR}/agents/database/vault/INDEX.md\n` +
  `3. Read ${AGENTS_DIR}/agents/database/vault/optimizations/index-guidelines.md\n\n` +
  `Return JSON: { decisions: <array from command 1>, indexGuidelines: "<text of index-guidelines.md>" }`,
  {
    label: 'load-context',
    schema: {
      type: 'object',
      required: ['decisions'],
      properties: {
        decisions:      { type: 'array' },
        indexGuidelines: { type: 'string' },
      },
    },
  }
)

log(`Loaded ${context.decisions.length} prior schema decisions`)

// ─── Phase: Design Tables ─────────────────────────────────────────────────────
phase('Design Tables')

const tableDesign = await agent(
  `You are the table-creator sub-agent of the Database Agent.\n\n` +
  `Task: "${taskText}"\n` +
  `Project path: ${projectPath}\n` +
  `Prior decisions: ${JSON.stringify(context.decisions.slice(0, 5))}\n\n` +
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
  `Index guidelines: ${context.indexGuidelines || 'Add indexes for all WHERE/JOIN/ORDER BY columns on tables > 1000 rows'}\n\n` +
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

// ─── Phase: Persist ───────────────────────────────────────────────────────────
phase('Persist')

await agent(
  `Persist database agent state for session ${sessionId}.\n\n` +
  `Run these commands in order:\n\n` +
  `1. Save a migration record:\n` +
  `cd "${AGENTS_DIR}" && node shared/lib/db-cli.js --as database insert database migrations '{"id":"${sessionId}-mig","session_id":"${sessionId}","filename":"${tableDesign.migrationFile}","description":"${taskText.slice(0,80).replace(/'/g,'')}","status":"generated","created_at":0}'\n\n` +
  `(Use any timestamp for created_at — the DB will use the insert time)\n\n` +
  `2. Save a decision:\n` +
  `cd "${AGENTS_DIR}" && node shared/lib/db-cli.js --as database save-decision database "${sessionId}" "schema-design" "Created ${tableDesign.tables.length} tables for: ${taskText.slice(0,60).replace(/"/g,'')}" "Task required new schema"\n\n` +
  `3. Write a vault note to: ${AGENTS_DIR}/agents/database/vault/schemas/${tableDesign.tables.map(t=>t.name).join('-')}.md\n` +
  `Content should include: table names, columns, FK relationships, estimated rows.\n\n` +
  `Return "done".`,
  { label: 'persist-state' }
)

return {
  sessionId,
  agentName:     'database',
  status:        blockingViolations.length > 0 ? 'failed' : 'completed',
  migrationSQL:  optimization.optimizedMigrationSQL,
  migrationFile: tableDesign.migrationFile,
  tables:        tableDesign.tables,
  indexes:       optimization.indexes,
  schemaGraph:   schemaValidation.schemaGraph,
  violations:    schemaValidation.violations.map(v => `${v.table}.${v.column}: ${v.issue}`),
  errors:        blockingViolations.map(v => `${v.table}.${v.column}: ${v.issue}`),
}
