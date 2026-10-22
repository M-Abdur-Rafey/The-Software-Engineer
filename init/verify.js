'use strict';
/**
 * Health check: verifies all databases, tables, vault INDEX.md files, and contract schemas exist.
 * Exits with code 1 if any check fails.
 * Run after seed: node init/verify.js
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const AGENTS_DIR = path.resolve(__dirname, '..');
const { createLogger } = require(path.join(AGENTS_DIR, 'shared', 'lib', 'logger'));
const log = createLogger('verify');

let pass = 0;
let fail = 0;

function check(label, fn) {
  try {
    fn();
    log.ok(label);
    pass++;
  } catch (err) {
    log.error(`FAIL: ${label} — ${err.message}`);
    fail++;
  }
}

// ─── Agent knowledge.db files ─────────────────────────────────────────────────
const AGENT_NAMES = ['backend', 'frontend', 'database', 'testing', 'gitdevops', 'mcpbridge', 'calls', 'ponytail', 'requirements', 'sre', 'orchestrator'];
const COMMON_TABLES = ['decisions', 'patterns', 'session_log', 'contracts'];

AGENT_NAMES.forEach(name => {
  const dbPath = path.join(AGENTS_DIR, 'agents', name, 'knowledge.db');
  check(`agents/${name}/knowledge.db exists`, () => {
    if (!fs.existsSync(dbPath)) throw new Error('file missing');
  });
  check(`agents/${name}/knowledge.db has correct tables`, () => {
    const db = new Database(dbPath, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    db.close();
    const expected = name === 'database' ? [...COMMON_TABLES, 'migrations'] : COMMON_TABLES;
    expected.forEach(t => {
      if (!tables.includes(t)) throw new Error(`missing table: ${t}`);
    });
  });
});

// ─── orchestrator.db ─────────────────────────────────────────────────────────
const orchPath = path.join(AGENTS_DIR, 'shared', 'orchestrator.db');
check('shared/orchestrator.db exists', () => {
  if (!fs.existsSync(orchPath)) throw new Error('file missing');
});
check('shared/orchestrator.db has correct tables', () => {
  const db = new Database(orchPath, { readonly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  db.close();
  ['sessions', 'agent_runs', 'contracts_registry', 'observations', 'domain_runs'].forEach(t => {
    if (!tables.includes(t)) throw new Error(`missing table: ${t}`);
  });
});

// ─── Vault INDEX.md files ─────────────────────────────────────────────────────
AGENT_NAMES.forEach(name => {
  const indexPath = path.join(AGENTS_DIR, 'agents', name, 'vault', 'INDEX.md');
  check(`agents/${name}/vault/INDEX.md exists and non-empty`, () => {
    if (!fs.existsSync(indexPath)) throw new Error('file missing');
    const content = fs.readFileSync(indexPath, 'utf8');
    if (content.trim().length < 10) throw new Error('file is empty');
  });
});

// ─── Contract schema files ────────────────────────────────────────────────────
const CONTRACT_NAMES = ['task', 'backend', 'frontend', 'database', 'testing', 'gitdevops', 'mcpbridge', 'calls', 'ponytail', 'requirements', 'sre'];
CONTRACT_NAMES.forEach(name => {
  const schemaPath = path.join(AGENTS_DIR, 'shared', 'contracts', `${name}.schema.json`);
  check(`shared/contracts/${name}.schema.json is valid JSON`, () => {
    if (!fs.existsSync(schemaPath)) throw new Error('file missing');
    JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  });
});

// ─── Shared standards ─────────────────────────────────────────────────────────
['commit-format.md', 'security-rules.md', 'code-standards.md'].forEach(f => {
  check(`shared/standards/${f} exists`, () => {
    const p = path.join(AGENTS_DIR, 'shared', 'standards', f);
    if (!fs.existsSync(p)) throw new Error('file missing');
  });
});

// ─── Shared lib ───────────────────────────────────────────────────────────────
['db.js', 'db-cli.js', 'vault.js', 'logger.js', 'contracts.js', 'acl.js', 'truncate.js', 'sysdocs.js', 'uitest.js', 'persist.js', 'scan.js', 'projectmap.js', 'lessons.js', 'verify.js'].forEach(f => {
  check(`shared/lib/${f} exists`, () => {
    const p = path.join(AGENTS_DIR, 'shared', 'lib', f);
    if (!fs.existsSync(p)) throw new Error('file missing');
  });
});

// ─── System Docs templates (copied into target projects by sysdocs.js) ───────
['module-README.md', 'module-questions.md', 'flow.md', 'team.md', 'layers.md'].forEach(f => {
  check(`shared/templates/system-docs/${f} exists`, () => {
    const p = path.join(AGENTS_DIR, 'shared', 'templates', 'system-docs', f);
    if (!fs.existsSync(p)) throw new Error('file missing');
  });
});

// ─── Workflow scripts are free of hidden/format characters ────────────────────
// The Workflow tool inlines a script into the approval dialog and rejects any
// invisible control/format characters (e.g. the U+FE0F variation selector that
// rides along with emoji like ⚠️). Such a character makes the whole workflow
// un-launchable, so guard every workflow here.
const workflowsDir = path.join(AGENTS_DIR, '.claude', 'workflows');
function hiddenCharCode(code) {
  return (
    (code < 32 && code !== 9 && code !== 10) ||                  // C0 control incl. CR (allow tab/LF): CRLF scripts are rejected too
    code === 127 || (code >= 128 && code < 160) ||             // DEL + C1 control
    (code >= 0xfe00 && code <= 0xfe0f) ||                      // variation selectors
    code === 0x200b || code === 0x200c || code === 0x200d ||   // zero-width
    code === 0x200e || code === 0x200f ||                      // bidi marks
    (code >= 0x202a && code <= 0x202e) ||                      // bidi embedding/override
    (code >= 0x2066 && code <= 0x2069) ||                      // bidi isolates
    code === 0xfeff || code === 0x00ad ||                      // BOM/ZWNBSP, soft hyphen
    code === 0x2028 || code === 0x2029                         // line/paragraph separators
  );
}
// Every Workflow script, including the maintainer-only tuning proposer in tests/ab/.
const workflowScripts = [
  ...(fs.existsSync(workflowsDir) ? fs.readdirSync(workflowsDir).filter(f => f.endsWith('.js')).map(f => `.claude/workflows/${f}`) : []),
  ...['tests/ab/tune-propose.js'].filter(f => fs.existsSync(path.join(AGENTS_DIR, f))),
];
if (workflowScripts.length) {
  workflowScripts.forEach(f => {
    check(`${f} has no hidden/control characters`, () => {
      const s = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      for (let i = 0, line = 1; i < s.length; i++) {
        if (s[i] === '\n') line++;
        if (hiddenCharCode(s.charCodeAt(i))) {
          throw new Error(`hidden char U+${s.charCodeAt(i).toString(16).padStart(4, '0')} at line ${line} — breaks the Workflow approval dialog`);
        }
      }
    });
  });
}

// ─── The skill and orchestrate.js agree on the args shape ─────────────────────
// The skill passes session, onboarding, classification and map data into orchestrate.js
// (design/agent-consolidation.md); a key the workflow never reads is silently lost.
const skillFile = path.join(AGENTS_DIR, 'skills', 'software-engineer', 'SKILL.md');
const orchestrateFile = path.join(workflowsDir, 'orchestrate.js');
if (fs.existsSync(skillFile) && fs.existsSync(orchestrateFile)) {
  check('skill and orchestrate.js agree on the args shape', () => {
    const skill = fs.readFileSync(skillFile, 'utf8').replace(/\r\n/g, '\n');
    const workflow = fs.readFileSync(orchestrateFile, 'utf8');
    const start = skill.indexOf('scriptPath: `<install-path>/.claude/workflows/orchestrate.js`');
    if (start < 0) throw new Error('no orchestrate.js Workflow example in SKILL.md');
    const block = skill.slice(start, skill.indexOf('\n```', start));
    const keys = [...block.matchAll(/^ {4}(\w+):/gm)].map(m => m[1]);
    const classMatch = block.match(/classification: \{([^}]*)\}/);
    const classKeys = classMatch ? classMatch[1].split(',').map(k => k.trim()).filter(Boolean) : [];
    const missing = [
      ...keys.filter(k => !new RegExp(`args\\.${k}\\b`).test(workflow)).map(k => `args.${k}`),
      ...classKeys.filter(k => !new RegExp(`classification\\.${k}\\b|'${k}'`).test(workflow)).map(k => `classification.${k}`),
    ];
    if (!keys.length) throw new Error('could not read the args keys from SKILL.md');
    if (missing.length) throw new Error(`SKILL.md passes ${missing.join(', ')} but orchestrate.js never reads it`);
  });
}

// ─── Reviewer rule lists match the checklist notes ───────────────────────────
// Lessons are counted per checklist rule (design/lesson-library.md), so each workflow's RULES must
// name checklist notes that the seed graph writes for that domain ("spec" is the one extra).
if (fs.existsSync(workflowsDir)) {
  fs.readdirSync(workflowsDir).filter(f => f.endsWith('.js')).forEach(f => {
    const m = fs.readFileSync(path.join(workflowsDir, f), 'utf8').match(/^const RULES = \[([^\]]*)\]/m);
    if (!m) return;
    const domain = f.replace(/\.js$/, '');
    check(`.claude/workflows/${f} RULES match ${domain}'s checklist notes`, () => {
      const rules = m[1].split(',').map(r => r.trim().replace(/^'|'$/g, '')).filter(Boolean);
      const missing = rules.filter(r => r !== 'spec').filter(r => {
        const note = path.join(AGENTS_DIR, 'agents', domain, 'vault', 'sub-agents', `${r}.md`);
        return !fs.existsSync(note) || !fs.readFileSync(note, 'utf8').includes('Checklist of');
      });
      if (missing.length) throw new Error(`no checklist note for: ${missing.join(', ')}`);
    });
  });
}

// ─── No unscoped decision reads ───────────────────────────────────────────────
// `decisions` rows carry no project, so get-decisions shows every project's facts. Agents get project
// context from the project map and the lesson library instead; SRE feedback goes through get-feedback.
check('no workflow or domain CLAUDE.md reads decisions across projects (get-decisions)', () => {
  const files = [
    ...(fs.existsSync(workflowsDir) ? fs.readdirSync(workflowsDir).filter(f => f.endsWith('.js')).map(f => path.join(workflowsDir, f)) : []),
    ...AGENT_NAMES.map(n => path.join(AGENTS_DIR, 'agents', n, 'CLAUDE.md')).filter(f => fs.existsSync(f)),
  ];
  const hits = files.filter(f => /get-decisions\s+\w/.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(AGENTS_DIR, f));
  if (hits.length) throw new Error(`unscoped get-decisions in: ${hits.join(', ')}`);
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('');
log.table([
  ['Passed', String(pass), 'green'],
  ['Failed', String(fail), fail > 0 ? 'red' : 'green'],
]);

if (fail > 0) {
  console.error('\nVerification FAILED. Fix the errors above then re-run.\n');
  process.exit(1);
} else {
  console.log('\nAll checks passed. The orchestration system is ready.\n');
}
