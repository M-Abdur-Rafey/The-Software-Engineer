'use strict';
/**
 * CLI interface for workflow agents to interact with SQLite databases.
 *
 * Usage:
 *   node shared/lib/db-cli.js init-session <taskText> <projectPath>
 *   node shared/lib/db-cli.js query <agentName|orchestrator> <sql>
 *   node shared/lib/db-cli.js insert <agentName|orchestrator> <table> <jsonData>
 *   node shared/lib/db-cli.js update-session-status <sessionId> <status>
 *   node shared/lib/db-cli.js log-agent-run <sessionId> <agentName> <status> [outputJson] [errorText]
 *   node shared/lib/db-cli.js log-session-event <agentName> <sessionId> <phase> <status> [message] [durationMs]
 *   node shared/lib/db-cli.js get-decisions <agentName> <topic> [limit]
 */

const { openDb } = require('./db');
const { v4: uuidv4 } = require('uuid');

const [, , command, ...cmdArgs] = process.argv;

try {
  switch (command) {
    case 'init-session': {
      const [taskText, projectPath] = cmdArgs;
      const db = openDb('orchestrator');
      const sessionId = uuidv4();
      const startedAt = Date.now();
      db.prepare(
        'INSERT INTO sessions (id, task_text, project_path, status, started_at) VALUES (?, ?, ?, ?, ?)'
      ).run(sessionId, taskText || '', projectPath || '', 'running', startedAt);
      db.close();
      console.log(JSON.stringify({ sessionId, startedAt }));
      break;
    }

    case 'query': {
      const [agentName, sql] = cmdArgs;
      const db = openDb(agentName);
      const rows = db.prepare(sql).all();
      db.close();
      console.log(JSON.stringify(rows));
      break;
    }

    case 'insert': {
      const [agentName, table, jsonData] = cmdArgs;
      const row = JSON.parse(jsonData);
      const db = openDb(agentName);
      const cols = Object.keys(row).join(', ');
      const placeholders = Object.keys(row).map(() => '?').join(', ');
      db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).run(...Object.values(row));
      db.close();
      console.log(JSON.stringify({ success: true }));
      break;
    }

    case 'update-session-status': {
      const [sessionId, status] = cmdArgs;
      const db = openDb('orchestrator');
      const completedAt = (status === 'completed' || status === 'failed') ? Date.now() : null;
      db.prepare('UPDATE sessions SET status = ?, completed_at = ? WHERE id = ?')
        .run(status, completedAt, sessionId);
      db.close();
      console.log(JSON.stringify({ success: true }));
      break;
    }

    case 'log-agent-run': {
      const [sessionId, agentName, runStatus, outputJson, errorText] = cmdArgs;
      const db = openDb('orchestrator');
      const id = uuidv4();
      db.prepare(
        'INSERT INTO agent_runs (id, session_id, agent_name, status, output_json, error_text, started_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, sessionId, agentName, runStatus, outputJson || null, errorText || null, Date.now());
      db.close();
      console.log(JSON.stringify({ success: true, id }));
      break;
    }

    case 'log-session-event': {
      const [agentName, sessionId, phase, status, message, durationMs] = cmdArgs;
      const db = openDb(agentName);
      const id = uuidv4();
      db.prepare(
        'INSERT INTO session_log (id, session_id, phase, status, message, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, sessionId, phase, status, message || null, durationMs ? parseInt(durationMs, 10) : null, Date.now());
      db.close();
      console.log(JSON.stringify({ success: true }));
      break;
    }

    case 'get-decisions': {
      const [agentName, topic, limit = '10'] = cmdArgs;
      const db = openDb(agentName);
      const rows = db.prepare(
        'SELECT * FROM decisions WHERE topic = ? ORDER BY created_at DESC LIMIT ?'
      ).all(topic, parseInt(limit, 10));
      db.close();
      console.log(JSON.stringify(rows));
      break;
    }

    case 'save-decision': {
      const [agentName, sessionId, topic, summary, rationale] = cmdArgs;
      const db = openDb(agentName);
      const id = uuidv4();
      db.prepare(
        'INSERT INTO decisions (id, session_id, topic, summary, rationale, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, sessionId, topic, summary, rationale || null, Date.now());
      db.close();
      console.log(JSON.stringify({ success: true, id }));
      break;
    }

    case 'check-onboarded': {
      const [projectPath] = cmdArgs;
      const db = openDb('orchestrator');
      const row = db.prepare('SELECT * FROM onboarded_projects WHERE project_path = ?').get(projectPath);
      db.close();
      console.log(JSON.stringify({ onboarded: !!row, onboardedAt: row ? row.onboarded_at : null, techStack: row ? row.tech_stack : null }));
      break;
    }

    case 'mark-onboarded': {
      const [projectPath, techStack, summary] = cmdArgs;
      const db = openDb('orchestrator');
      const id = uuidv4();
      db.prepare(
        'INSERT OR REPLACE INTO onboarded_projects (id, project_path, onboarded_at, tech_stack, summary) VALUES (?, ?, ?, ?, ?)'
      ).run(id, projectPath, Date.now(), techStack || null, summary || null);
      db.close();
      console.log(JSON.stringify({ success: true }));
      break;
    }

    default:
      console.error(JSON.stringify({ error: `Unknown command: ${command}. See file header for usage.` }));
      process.exit(1);
  }
} catch (err) {
  console.error(JSON.stringify({ error: err.message, stack: err.stack }));
  process.exit(1);
}
