'use strict';
/**
 * Bootstrap: creates all directories, SQLite databases, and seeds contract schemas.
 * Run once before any agent workflow: node init/bootstrap.js
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const AGENTS_DIR = path.resolve(__dirname, '..');
const { createLogger } = require(path.join(AGENTS_DIR, 'shared', 'lib', 'logger'));
const log = createLogger('bootstrap');

// ─── Directory tree ───────────────────────────────────────────────────────────
const DIRS = [
  'agents/backend/vault/architecture',
  'agents/backend/vault/patterns',
  'agents/backend/vault/security',
  'agents/backend/vault/decisions',
  'agents/frontend/vault/design-system',
  'agents/frontend/vault/components',
  'agents/frontend/vault/state-management',
  'agents/frontend/vault/security',
  'agents/frontend/vault/decisions',
  'agents/database/vault/schemas',
  'agents/database/vault/migrations',
  'agents/database/vault/optimizations',
  'agents/database/vault/decisions',
  'agents/testing/vault/collections',
  'agents/testing/vault/reports',
  'agents/testing/vault/templates',
  'agents/gitdevops/vault/branch-strategy',
  'agents/gitdevops/vault/security-scans/scan-results',
  'agents/gitdevops/vault/commit-format',
  'agents/mcpbridge/vault/integrations',
  'agents/mcpbridge/vault/contracts',
  'shared/lib',
  'shared/contracts',
  'shared/standards',
  'init',
  '.claude/workflows',
];

log.info('Creating directories...');
DIRS.forEach(dir => fs.mkdirSync(path.join(AGENTS_DIR, dir), { recursive: true }));
log.ok(`${DIRS.length} directories ready`);

// ─── SQLite schemas ───────────────────────────────────────────────────────────
const COMMON_SCHEMA = `
CREATE TABLE IF NOT EXISTS decisions (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  topic       TEXT NOT NULL,
  summary     TEXT NOT NULL,
  rationale   TEXT,
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS patterns (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT NOT NULL,
  code_snippet TEXT,
  tags         TEXT NOT NULL DEFAULT '[]',
  use_count    INTEGER DEFAULT 0,
  last_used    INTEGER
);
CREATE TABLE IF NOT EXISTS session_log (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  phase       TEXT NOT NULL,
  status      TEXT NOT NULL,
  message     TEXT,
  duration_ms INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS contracts (
  id             TEXT PRIMARY KEY,
  session_id     TEXT NOT NULL,
  contract_name  TEXT NOT NULL,
  version        TEXT NOT NULL,
  schema_json    TEXT NOT NULL,
  is_current     INTEGER DEFAULT 1,
  created_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_decisions_topic     ON decisions(topic);
CREATE INDEX IF NOT EXISTS idx_decisions_session   ON decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_log_session ON session_log(session_id);
`;

const MIGRATION_TABLE = `
CREATE TABLE IF NOT EXISTS migrations (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  filename    TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  status      TEXT NOT NULL,
  applied_at  INTEGER,
  created_at  INTEGER NOT NULL
);
`;

const ORCHESTRATOR_SCHEMA = `
CREATE TABLE IF NOT EXISTS onboarded_projects (
  id           TEXT PRIMARY KEY,
  project_path TEXT NOT NULL UNIQUE,
  onboarded_at INTEGER NOT NULL,
  tech_stack   TEXT,
  summary      TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  task_text     TEXT NOT NULL,
  project_path  TEXT NOT NULL,
  status        TEXT NOT NULL,
  started_at    INTEGER NOT NULL,
  completed_at  INTEGER,
  summary       TEXT
);
CREATE TABLE IF NOT EXISTS agent_runs (
  id           TEXT PRIMARY KEY,
  session_id   TEXT NOT NULL,
  agent_name   TEXT NOT NULL,
  status       TEXT NOT NULL,
  output_json  TEXT,
  error_text   TEXT,
  started_at   INTEGER,
  completed_at INTEGER
);
CREATE TABLE IF NOT EXISTS contracts_registry (
  id             TEXT PRIMARY KEY,
  agent_name     TEXT NOT NULL,
  contract_name  TEXT NOT NULL,
  version        TEXT NOT NULL,
  schema_path    TEXT NOT NULL,
  created_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_session ON agent_runs(session_id);
`;

// ─── Create agent knowledge.db files ─────────────────────────────────────────
const AGENT_NAMES = ['backend', 'frontend', 'database', 'testing', 'gitdevops', 'mcpbridge'];

log.info('Creating agent knowledge.db files...');
AGENT_NAMES.forEach(name => {
  const dbPath = path.join(AGENTS_DIR, 'agents', name, 'knowledge.db');
  const db = new Database(dbPath);
  db.exec(COMMON_SCHEMA);
  if (name === 'database') db.exec(MIGRATION_TABLE);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r => r.name);
  db.close();
  log.ok(`agents/${name}/knowledge.db — [${tables.join(', ')}]`);
});

// ─── Create orchestrator.db ───────────────────────────────────────────────────
log.info('Creating shared/orchestrator.db...');
const orchDb = new Database(path.join(AGENTS_DIR, 'shared', 'orchestrator.db'));
orchDb.exec(ORCHESTRATOR_SCHEMA);
const orchTables = orchDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r => r.name);
orchDb.close();
log.ok(`shared/orchestrator.db — [${orchTables.join(', ')}]`);

// ─── Write contract schema files ─────────────────────────────────────────────
const CONTRACTS = {
  task: {
    type: 'object',
    required: ['sessionId', 'taskText', 'projectPath', 'domainHints', 'dependencies', 'createdAt'],
    properties: {
      sessionId: { type: 'string' },
      taskText: { type: 'string' },
      projectPath: { type: 'string' },
      domainHints: { type: 'array', items: { type: 'string' } },
      priority: { type: 'string', enum: ['low', 'normal', 'high'] },
      dependencies: {
        type: 'object',
        required: ['requiresDatabase', 'requiresBackend', 'requiresFrontend'],
        properties: {
          requiresDatabase: { type: 'boolean' },
          requiresBackend: { type: 'boolean' },
          requiresFrontend: { type: 'boolean' },
        },
      },
      createdAt: { type: 'number' },
    },
  },

  backend: {
    type: 'object',
    required: ['sessionId', 'agentName', 'status'],
    properties: {
      sessionId: { type: 'string' },
      agentName: { type: 'string', const: 'backend' },
      status: { type: 'string', enum: ['completed', 'failed'] },
      routes: {
        type: 'array',
        items: {
          type: 'object',
          required: ['method', 'path', 'handler', 'middleware', 'description', 'authRequired'],
          properties: {
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
            path: { type: 'string' },
            handler: { type: 'string' },
            middleware: { type: 'array', items: { type: 'string' } },
            description: { type: 'string' },
            authRequired: { type: 'boolean' },
          },
        },
      },
      contractExports: {
        type: 'array',
        items: {
          type: 'object',
          required: ['routeMethod', 'routePath', 'authScheme'],
          properties: {
            routeMethod: { type: 'string' },
            routePath: { type: 'string' },
            requestShape: { type: 'object' },
            responseShape: { type: 'object' },
            authScheme: { type: 'string', enum: ['none', 'bearer', 'apiKey'] },
          },
        },
      },
      filesChanged: { type: 'array', items: { type: 'string' } },
      errors: { type: 'array', items: { type: 'string' } },
    },
  },

  frontend: {
    type: 'object',
    required: ['sessionId', 'agentName', 'status'],
    properties: {
      sessionId: { type: 'string' },
      agentName: { type: 'string', const: 'frontend' },
      status: { type: 'string', enum: ['completed', 'failed'] },
      components: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'filePath', 'type'],
          properties: {
            name: { type: 'string' },
            filePath: { type: 'string' },
            type: { type: 'string', enum: ['page', 'layout', 'widget', 'form'] },
            usesAPI: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      stateSlices: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'storageLayer', 'sensitivity'],
          properties: {
            name: { type: 'string' },
            storageLayer: { type: 'string', enum: ['redux', 'zustand', 'context', 'sessionStorage', 'localStorage', 'memory'] },
            sensitivity: { type: 'string', enum: ['public', 'session', 'private'] },
            fields: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      apiBindings: {
        type: 'array',
        items: {
          type: 'object',
          required: ['component', 'routePath', 'method'],
          properties: {
            component: { type: 'string' },
            routePath: { type: 'string' },
            method: { type: 'string' },
            storageTarget: { type: 'string' },
          },
        },
      },
      securityFlags: {
        type: 'array',
        items: {
          type: 'object',
          required: ['severity', 'rule', 'location', 'message'],
          properties: {
            severity: { type: 'string', enum: ['error', 'warning', 'info'] },
            rule: { type: 'string' },
            location: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
      filesChanged: { type: 'array', items: { type: 'string' } },
      errors: { type: 'array', items: { type: 'string' } },
    },
  },

  database: {
    type: 'object',
    required: ['sessionId', 'agentName', 'status'],
    properties: {
      sessionId: { type: 'string' },
      agentName: { type: 'string', const: 'database' },
      status: { type: 'string', enum: ['completed', 'failed'] },
      migrationSQL: { type: 'string' },
      migrationFile: { type: 'string' },
      tables: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'columns', 'indexes'],
          properties: {
            name: { type: 'string' },
            columns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  nullable: { type: 'boolean' },
                  primaryKey: { type: 'boolean' },
                  foreignKey: { type: ['string', 'null'] },
                },
              },
            },
            indexes: { type: 'array', items: { type: 'string' } },
            estimatedRows: { type: ['number', 'null'] },
          },
        },
      },
      indexes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            table: { type: 'string' },
            columns: { type: 'array', items: { type: 'string' } },
            reason: { type: 'string' },
          },
        },
      },
      schemaGraph: {
        type: 'object',
        properties: {
          nodes: { type: 'array', items: { type: 'object' } },
          edges: { type: 'array', items: { type: 'object' } },
        },
      },
      violations: { type: 'array', items: { type: 'string' } },
      errors: { type: 'array', items: { type: 'string' } },
    },
  },

  testing: {
    type: 'object',
    required: ['sessionId', 'agentName', 'status'],
    properties: {
      sessionId: { type: 'string' },
      agentName: { type: 'string', const: 'testing' },
      status: { type: 'string', enum: ['completed', 'failed'] },
      collectionPath: { type: 'string' },
      routeCount: { type: 'number' },
      testCases: {
        type: 'array',
        items: {
          type: 'object',
          required: ['routePath', 'method', 'scenarioName', 'type', 'expectedStatus'],
          properties: {
            routePath: { type: 'string' },
            method: { type: 'string' },
            scenarioName: { type: 'string' },
            type: { type: 'string', enum: ['positive', 'negative', 'auth'] },
            expectedStatus: { type: 'number' },
          },
        },
      },
      coverage: {
        type: 'object',
        properties: {
          routesCovered: { type: 'number' },
          totalRoutes: { type: 'number' },
          percentCovered: { type: 'number' },
        },
      },
      errors: { type: 'array', items: { type: 'string' } },
    },
  },

  gitdevops: {
    type: 'object',
    required: ['sessionId', 'agentName', 'status'],
    properties: {
      sessionId: { type: 'string' },
      agentName: { type: 'string', const: 'gitdevops' },
      status: { type: 'string', enum: ['completed', 'failed'] },
      branch: { type: 'string' },
      commitHash: { type: ['string', 'null'] },
      commitMessage: { type: 'string' },
      filesCommitted: { type: 'array', items: { type: 'string' } },
      securityFlags: {
        type: 'array',
        items: {
          type: 'object',
          required: ['check', 'passed', 'severity'],
          properties: {
            check: { type: 'string' },
            passed: { type: 'boolean' },
            severity: { type: 'string', enum: ['blocking', 'warning', 'info'] },
            detail: { type: 'string' },
          },
        },
      },
      blockedBy: { type: 'array', items: { type: 'string' } },
      errors: { type: 'array', items: { type: 'string' } },
    },
  },

  mcpbridge: {
    type: 'object',
    required: ['sessionId', 'agentName', 'status'],
    properties: {
      sessionId: { type: 'string' },
      agentName: { type: 'string', const: 'mcpbridge' },
      status: { type: 'string', enum: ['completed', 'failed'] },
      integrations: {
        type: 'array',
        items: {
          type: 'object',
          required: ['serviceName', 'authStrategy'],
          properties: {
            serviceName: { type: 'string' },
            stubFilePath: { type: 'string' },
            authStrategy: { type: 'string', enum: ['apiKey', 'oauth2', 'bearerToken', 'webhook-secret'] },
            endpointsStubbed: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      contractValidation: {
        type: 'object',
        required: ['passed'],
        properties: {
          passed: { type: 'boolean' },
          violations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                frontendBinding: { type: 'string' },
                backendRoute: { type: ['string', 'null'] },
                detail: { type: 'string' },
              },
            },
          },
        },
      },
      errors: { type: 'array', items: { type: 'string' } },
    },
  },
};

log.info('Writing shared/contracts/*.schema.json...');
const contractsDir = path.join(AGENTS_DIR, 'shared', 'contracts');
Object.entries(CONTRACTS).forEach(([name, schema]) => {
  fs.writeFileSync(
    path.join(contractsDir, `${name}.schema.json`),
    JSON.stringify(schema, null, 2),
    'utf8'
  );
  log.ok(`shared/contracts/${name}.schema.json`);
});

console.log('');
log.ok('Bootstrap complete. Run: node init/seed-vaults.js');
