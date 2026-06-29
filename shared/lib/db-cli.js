'use strict';
/**
 * CLI interface for workflow agents to interact with SQLite databases.
 *
 * Usage:
 *   node shared/lib/db-cli.js [--as <callerAgent>] <command> ...args
 *
 *   init-session <taskText> <projectPath>
 *   query <agentName|orchestrator> <sql>            (read-only SELECT, output capped)
 *   insert <agentName|orchestrator> <table> <jsonData>
 *   update-session-status <sessionId> <status>
 *   log-agent-run <sessionId> <agentName> <status> [outputJson] [errorText]
 *   log-session-event <agentName> <sessionId> <phase> <status> [message] [durationMs]
 *   get-decisions <agentName> <topic> [limit]       (output capped)
 *   save-decision <agentName> <sessionId> <topic> <summary> [rationale]
 *   check-onboarded <projectPath>
 *   mark-onboarded <projectPath> <techStack> <summary>
 *
 * `--as <agent>` declares the calling agent so per-agent knowledge access is
 * checked against shared/lib/acl.js. Omit it for legacy/privileged callers.
 * Orchestrator-DB coordination commands (sessions, runs, onboarding) are not
 * ACL-scoped — they are how the system tracks work, not per-agent knowledge.
 */

const { openDb } = require('./db');
const { v4: uuidv4 } = require('uuid');
const { assertRead, assertWrite } = require('./acl');
const { capRows, truncate } = require('./truncate');

// ── extract the optional `--as <caller>` flag from anywhere in argv ───────────
const rawArgs = process.argv.slice(2);
let caller = null;
const argv = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--as') { caller = rawArgs[++i] || null; continue; }
  if (rawArgs[i].startsWith('--as=')) { caller = rawArgs[i].slice(5) || null; continue; }
  argv.push(rawArgs[i]);
}
const [command, ...cmdArgs] = argv;

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
      assertRead(caller, agentName);
      const db = openDb(agentName);
      const stmt = db.prepare(sql); // throws on multi-statement SQL
      if (!stmt.reader) {
        db.close();
        console.error(JSON.stringify({ error: 'query: only read-only SELECT statements are allowed' }));
        process.exit(1);
      }
      const rows = stmt.all();
      db.close();
      // Cap output so a large result set can't balloon the agent's input tokens.
      console.log(capRows(rows).json);
      break;
    }

    case 'insert': {
      const [agentName, table, jsonData] = cmdArgs;
      assertWrite(caller, agentName);
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
      assertWrite(caller, agentName);
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
      assertRead(caller, agentName);
      const db = openDb(agentName);
      const rows = db.prepare(
        'SELECT topic, summary, rationale, created_at FROM decisions WHERE topic = ? ORDER BY created_at DESC LIMIT ?'
      ).all(topic, parseInt(limit, 10));
      db.close();
      // Trim long free-text fields, then cap the whole set — keeps context lean.
      const trimmed = rows.map(r => ({
        topic: r.topic,
        summary: truncate(r.summary, 500),
        rationale: truncate(r.rationale, 500),
        created_at: r.created_at,
      }));
      console.log(capRows(trimmed).json);
      break;
    }

    case 'save-decision': {
      const [agentName, sessionId, topic, summary, rationale] = cmdArgs;
      assertWrite(caller, agentName);
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
