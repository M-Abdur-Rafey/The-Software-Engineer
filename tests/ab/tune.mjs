// Offline tuning of the skill's checklists (design/lesson-library.md, phase C). Maintainers only, never
// part of a user's task. One round: run the A/B task with the current skill (ref), let one proposer agent
// draft two edits (an invariant one and a domain one), run each edit on its own copy of the skill, score
// every arm with the hidden suite, and keep only edits that hold the score without costing more tokens.
// Propose -> Probe -> Compose follows Harness2 (arXiv 2610.14224, Apache-2.0; see NOTICE.md), with the
// hidden suite as a real check where Harness2 had none. Runbook: tests/ab/TUNING.md.
//
//   node tests/ab/tune.mjs prepare  <runDir> [--budget 7000000]      worktrees + empty projects per arm
//   node tests/ab/tune.mjs evidence <runDir> <refOutputFile> <refTranscriptDir>   the proposer's only input
//   node tests/ab/tune.mjs load-edits <runDir> <proposerOutputFile>  validate, apply each edit to its arm
//   node tests/ab/tune.mjs score    <runDir> <arm> --tokens N [--agents N] [--suite base|change] [--skip-web]
//   node tests/ab/tune.mjs status   <runDir>
//   node tests/ab/tune.mjs select   <runDir> [--tolerance 0.05]      compose: accepted-edits.json + RESULT.md
//   node tests/ab/tune.mjs adopt    <runDir> <repoPath>              apply accepted edits for a pull request
//   node tests/ab/tune.mjs clean    <runDir>                         remove the worktrees
//
// Answer-key guard: no arm's skill copy contains tests/ab; the hidden suite's per-check results are moved out
// of the run folder (to the OS temp dir) and only pass counts are kept; the proposer reads evidence.json only.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
export const ARMS = ['ref', 'inv', 'dom'];
const KIND_ARM = { invariant: 'inv', domain: 'dom' };
const DOMAINS = 'backend|database|frontend|calls|requirements|testing|ponytail|mcpbridge|gitdevops|sre';
const EDITABLE = [new RegExp(`^agents/(${DOMAINS})/CLAUDE\\.md$`), new RegExp(`^\\.claude/workflows/(${DOMAINS})\\.js$`)];
// An edit may move or reword these rules but never drop them (the security scan and token rules are not tunable).
const PROTECTED = ['blocking', 'bearer', 'localStorage', 'sessionStorage', 'CSP', 'secret', 'credential', 'signature', 'consent', 'DNC'];
const HIDDEN = /[\r­᠎​-‏‪-‮⁠-⁤︀-️﻿]/;

const sh = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: false });
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const statePath = (runDir) => path.join(runDir, 'state.json');
const loadState = (runDir) => readJson(statePath(runDir));
const saveState = (runDir, s) => fs.writeFileSync(statePath(runDir), JSON.stringify(s, null, 2));

// ── edits ───────────────────────────────────────────────────────────────────

/** Checks one proposed edit against a skill checkout; returns an error string or null. */
export function validateEdit(edit, root) {
  if (!edit || typeof edit !== 'object') return 'not an object';
  if (!['invariant', 'domain'].includes(edit.kind)) return `kind must be invariant or domain, got ${edit.kind}`;
  const file = String(edit.file || '').replace(/\\/g, '/');
  if (!EDITABLE.some((re) => re.test(file))) return `file not editable: ${file} (only agents/<domain>/CLAUDE.md and that domain's workflow)`;
  if (typeof edit.find !== 'string' || !edit.find.trim()) return 'find is empty';
  if (typeof edit.replace !== 'string') return 'replace missing';
  if (edit.find === edit.replace) return 'find and replace are identical';
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return `no such file: ${file}`;
  const text = fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
  const hits = text.split(edit.find.replace(/\r\n/g, '\n')).length - 1;
  if (hits !== 1) return `find must match exactly once in ${file}, matched ${hits} times`;
  if (HIDDEN.test(edit.replace)) return 'replace contains hidden or control characters';
  const dropped = PROTECTED.filter((w) => edit.find.toLowerCase().includes(w.toLowerCase()) && !edit.replace.toLowerCase().includes(w.toLowerCase()));
  if (dropped.length) return `edit removes protected rule wording: ${dropped.join(', ')}`;
  return null;
}

/** Applies a validated edit; for a workflow, the result must still parse. Returns an error string or null. */
export function applyEdit(edit, root) {
  const abs = path.join(root, edit.file.replace(/\\/g, '/'));
  const before = fs.readFileSync(abs, 'utf8');
  const crlf = before.includes('\r\n');
  const after = before.replace(/\r\n/g, '\n').replace(edit.find.replace(/\r\n/g, '\n'), () => edit.replace);
  if (abs.endsWith('.js')) {
    const tmp = path.join(os.tmpdir(), `tune-check-${process.pid}.js`);
    fs.writeFileSync(tmp, `(async()=>{\n${after.replace(/^export const meta/m, 'const meta')}\n})()`);
    const r = sh(process.execPath, ['--check', tmp]);
    fs.rmSync(tmp, { force: true });
    if (r.status !== 0) return `edited workflow no longer parses: ${(r.stderr || '').split('\n').slice(0, 4).join(' ')}`;
  }
  fs.writeFileSync(abs, crlf && !abs.endsWith('.js') ? after.replace(/\n/g, '\r\n') : after);
  return null;
}

// ── selection ───────────────────────────────────────────────────────────────

/** Keeps an edit only if its arm scored at least the reference and cost no more than ref * (1 + tolerance). */
export function decide(state, tolerance = 0.05) {
  const ref = state.arms.ref;
  if (!ref || ref.passed == null || ref.tokens == null) throw new Error('the ref arm must be scored first');
  const rows = [];
  for (const arm of ['inv', 'dom']) {
    const a = state.arms[arm];
    if (!a || !a.edit) { rows.push({ arm, accepted: false, reason: 'no edit' }); continue; }
    if (a.passed == null || a.tokens == null) { rows.push({ arm, accepted: false, reason: 'not scored' }); continue; }
    const reasons = [];
    if (a.passed < ref.passed) reasons.push(`hidden suite ${a.passed}/${a.total} < ref ${ref.passed}/${ref.total}`);
    if (a.tokens > ref.tokens * (1 + tolerance)) reasons.push(`tokens ${a.tokens} > ref ${ref.tokens} + ${Math.round(tolerance * 100)}%`);
    rows.push({ arm, accepted: !reasons.length, reason: reasons.join('; ') || 'holds the score at no extra cost', edit: a.edit, passed: a.passed, total: a.total, tokens: a.tokens });
  }
  // Two accepted edits to the same text cannot both apply: keep the cheaper one.
  const acc = rows.filter((r) => r.accepted);
  if (acc.length === 2 && acc[0].edit.file === acc[1].edit.file && (acc[0].edit.find.includes(acc[1].edit.find) || acc[1].edit.find.includes(acc[0].edit.find))) {
    const loser = acc[0].tokens <= acc[1].tokens ? acc[1] : acc[0];
    loser.accepted = false;
    loser.reason = 'overlaps the other accepted edit, which cost fewer tokens';
  }
  return rows;
}

// ── answer-key guard ────────────────────────────────────────────────────────

/** Moves the hidden suite's per-check results out of the run folder; returns { passed, total, sealedAt }. */
export function sealResults(resultsFile, sealedDir, name = path.basename(resultsFile)) {
  const r = readJson(resultsFile);
  fs.mkdirSync(sealedDir, { recursive: true });
  const sealedAt = path.join(sealedDir, name);
  fs.copyFileSync(resultsFile, sealedAt);
  fs.rmSync(resultsFile, { force: true });
  return { passed: r.passed, total: r.total, sealedAt };
}

// ── commands ────────────────────────────────────────────────────────────────

function argOf(argv, name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
}

function prepare(runDir, argv) {
  const abs = path.resolve(runDir);
  if (abs.toLowerCase().startsWith(REPO.toLowerCase() + path.sep)) throw new Error('runDir must be outside the skill repo');
  if (fs.existsSync(statePath(abs))) throw new Error(`${abs} already has a tuning run`);
  fs.mkdirSync(path.join(abs, 'projects'), { recursive: true });
  const head = sh('git', ['rev-parse', '--short', 'HEAD'], REPO).stdout.trim();
  const state = { created: new Date().toISOString(), skillCommit: head, budget: Number(argOf(argv, '--budget', 7000000)), spent: 0, arms: {} };
  for (const arm of ARMS) {
    const skill = path.join(abs, `skill-${arm}`);
    const r = sh('git', ['worktree', 'add', '--detach', skill, 'HEAD'], REPO);
    if (r.status !== 0) throw new Error(`git worktree add failed: ${r.stderr}`);
    fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(skill, 'node_modules'), 'junction');
    fs.rmSync(path.join(skill, 'tests', 'ab'), { recursive: true, force: true }); // the hidden suite never sits in an arm's skill
    for (const step of ['init/bootstrap.js', 'init/seed-vaults.js']) {
      const s = sh(process.execPath, [step], skill);
      if (s.status !== 0) throw new Error(`${step} failed in ${arm}: ${s.stderr}`);
    }
    // Agents use the folder above a project as scratch space (round 1), so each project gets its own enclosing
    // folder: nothing of the run (state, evidence, other arms) sits directly above it.
    const project = path.join(abs, 'projects', arm, 'app');
    fs.mkdirSync(project, { recursive: true });
    for (const a of [['init', '-q', '-b', 'main'], ['config', 'user.name', 'ab-test'], ['config', 'user.email', 'ab-test@example.test'], ['commit', '-q', '--allow-empty', '-m', 'Empty project']]) sh('git', a, project);
    state.arms[arm] = { skill, project, edit: null, passed: null, total: null, tokens: null, agents: null };
  }
  saveState(abs, state);
  const task = fs.readFileSync(path.join(HERE, 'TASK.md'), 'utf8').replace(/\r\n/g, '\n');
  for (const arm of ARMS) {
    // Like the skill: the session is created here, in the arm's own skill copy, not by an agent.
    const init = sh(process.execPath, ['shared/lib/db-cli.js', 'init-session', task.slice(0, 200), state.arms[arm].project], state.arms[arm].skill);
    const session = init.status === 0 ? JSON.parse(init.stdout) : {};
    fs.writeFileSync(path.join(abs, `args-${arm}.json`), JSON.stringify({
      task, projectPath: state.arms[arm].project.replace(/\\/g, '/'), agentsDir: state.arms[arm].skill.replace(/\\/g, '/'),
      ...(session.sessionId ? { sessionId: session.sessionId, startedAt: session.startedAt } : {}),
      onboarded: true, systemDocs: false, deferBookkeeping: true,
      classification: { requiresDatabase: true, requiresBackend: true, requiresFrontend: true, requiresCalls: false, taskType: 'feat', taskSlug: 'task-tracker' },
      clarifications: {
        archPreferences: { authMethod: 'jwt', useRateLimiting: false, apiVersioning: 'none' },
        dbPreferences: { softDeletes: false, addTimestamps: true, dataSize: 'small', idType: 'integer' },
        designPreferences: { colors: 'default', navigation: 'top-bar', mobile: true, displayStyle: 'list', use3D: false, usePhysics: false, useScrollAnimation: false },
        callPreferences: null,
      },
    }, null, 2));
  }
  console.log(`prepared ${abs} at ${head}: arms ${ARMS.join(', ')}; budget ${state.budget} tokens. Next: run args-ref.json (TUNING.md step 2).`);
}

function evidence(runDir, outputFile, transcriptDir) {
  const out = readJson(outputFile);
  const result = typeof out.result === 'string' ? JSON.parse(out.result) : (out.result || out);
  const ops = result.persistOps || [];
  const observed = ops.filter((o) => o.observe).flatMap((o) => o.items || []);
  const tok = path.join(os.tmpdir(), `tune-tok-${process.pid}.json`);
  const t = sh(process.execPath, [path.join(HERE, 'tokreport.mjs'), 'ref', transcriptDir, '--json', tok]);
  const tokens = t.status === 0 && fs.existsSync(tok) ? readJson(tok) : null;
  fs.rmSync(tok, { force: true });
  const ev = {
    note: 'The reference run of the A/B task with the current skill. Evidence only: no test results or scores are included.',
    status: result.status,
    completedAgents: result.completedAgents || [],
    reviewerCatches: observed,
    sreFeedback: result.sreFeedback || [],
    outcomeMetrics: result.outcomeMetrics || null,
    openQuestions: result.openQuestions || [],
    tokensByAgent: tokens ? tokens.agents.map((a) => ({ label: a.label, phase: a.phase, billable: a.billable, weighted: a.weighted })) : 'unavailable',
    tokensByPhase: tokens ? tokens.byPhase : 'unavailable',
  };
  fs.writeFileSync(path.join(runDir, 'evidence.json'), JSON.stringify(ev, null, 2));
  console.log(`evidence.json: ${observed.length} reviewer/bridge/scan catches, ${ev.sreFeedback.length} SRE notes, ${tokens ? tokens.agents.length : 0} agents with token counts`);
}

function loadEdits(runDir, outputFile) {
  const state = loadState(runDir);
  const out = readJson(outputFile);
  const result = typeof out.result === 'string' ? JSON.parse(out.result) : (out.result || out);
  const edits = result.edits || [];
  for (const kind of ['invariant', 'domain']) {
    const edit = edits.find((e) => e && e.kind === kind);
    const arm = KIND_ARM[kind];
    if (!edit) { console.log(`${arm}: no ${kind} edit proposed`); continue; }
    const root = state.arms[arm].skill;
    const err = validateEdit(edit, root) || applyEdit(edit, root);
    if (err) { console.log(`${arm}: REJECTED ${kind} edit: ${err}`); continue; }
    const v = sh(process.execPath, ['init/verify.js'], root);
    if (v.status !== 0) { console.log(`${arm}: REJECTED ${kind} edit: verify failed in the arm's skill copy`); continue; }
    state.arms[arm].edit = edit;
    console.log(`${arm}: applied ${kind} edit to ${edit.file} (${edit.rationale ? edit.rationale.slice(0, 120) : 'no rationale'})`);
  }
  saveState(runDir, state);
}

function score(runDir, arm, argv) {
  const state = loadState(runDir);
  const a = state.arms[arm];
  if (!a) throw new Error(`unknown arm: ${arm}`);
  const tokens = Number(argOf(argv, '--tokens', NaN));
  if (!Number.isFinite(tokens)) throw new Error('--tokens <workflow reported total> is required');
  const suite = argOf(argv, '--suite', 'base');
  const r = sh(process.execPath, [path.join(HERE, 'acceptance.mjs'), a.project, suite, ...(argv.includes('--skip-web') ? ['--skip-web'] : [])]);
  const resultsFile = path.join(path.dirname(a.project), `results-${path.basename(a.project)}-${suite}.json`);
  if (!fs.existsSync(resultsFile)) throw new Error(`hidden suite produced no results (exit ${r.status})`);
  const sealed = sealResults(resultsFile, path.join(os.tmpdir(), 'se-tune-sealed', path.basename(path.resolve(runDir))), `results-${arm}-${suite}.json`);
  Object.assign(a, { passed: sealed.passed, total: sealed.total, tokens, agents: Number(argOf(argv, '--agents', NaN)) || null, suite });
  state.spent += tokens;
  saveState(runDir, state);
  console.log(`${arm}: hidden suite ${sealed.passed}/${sealed.total}; ${tokens} tokens. Budget: ${state.spent}/${state.budget} spent.`);
  console.log(`(per-check results sealed outside the run folder for maintainers: ${sealed.sealedAt})`);
  if (state.spent > state.budget) console.log('WARNING: budget exceeded. Stop this round.');
}

function status(runDir) {
  const s = loadState(runDir);
  console.log(`run at skill ${s.skillCommit}; budget ${s.spent}/${s.budget}`);
  for (const arm of ARMS) {
    const a = s.arms[arm];
    console.log(`  ${arm}: ${a.edit ? `${a.edit.kind} edit to ${a.edit.file}` : arm === 'ref' ? 'current skill' : 'no edit'}; ` +
      `${a.passed == null ? 'not scored' : `${a.passed}/${a.total}, ${a.tokens} tokens${a.agents ? `, ${a.agents} agents` : ''}`}`);
  }
}

function select(runDir, argv) {
  const s = loadState(runDir);
  const rows = decide(s, Number(argOf(argv, '--tolerance', 0.05)));
  const accepted = rows.filter((r) => r.accepted).map((r) => r.edit);
  fs.writeFileSync(path.join(runDir, 'accepted-edits.json'), JSON.stringify(accepted, null, 2));
  const ref = s.arms.ref;
  fs.writeFileSync(path.join(runDir, 'RESULT.md'), [
    `# Tuning round: skill ${s.skillCommit}`, '',
    `Reference: hidden suite ${ref.passed}/${ref.total}, ${ref.tokens} tokens${ref.agents ? `, ${ref.agents} agents` : ''}.`, '',
    '| Arm | Edit | Hidden suite | Tokens | Kept | Why |', '|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.arm} | ${r.edit ? `${r.edit.kind}: \`${r.edit.file}\`` : '-'} | ${r.passed == null ? '-' : `${r.passed}/${r.total}`} | ${r.tokens ?? '-'} | ${r.accepted ? 'yes' : 'no'} | ${r.reason} |`),
    '', accepted.length ? `Adopt with: node tests/ab/tune.mjs adopt "${runDir}" <repo checkout>, then open a pull request.` : 'No edit kept: the skill stays as it is.', '',
    'One run per arm is noisy. Before adopting, consider a confirm run of the composed skill.', '',
  ].join('\n'));
  for (const r of rows) console.log(`${r.arm}: ${r.accepted ? 'KEEP' : 'drop'} (${r.reason})`);
}

function adopt(runDir, repoPath) {
  const edits = readJson(path.join(runDir, 'accepted-edits.json'));
  if (!edits.length) { console.log('nothing to adopt'); return; }
  for (const e of edits) {
    const err = validateEdit(e, repoPath) || applyEdit(e, repoPath);
    console.log(err ? `NOT applied (${e.file}): ${err}` : `applied ${e.kind} edit to ${e.file}`);
  }
  console.log('Next: npm run init && npm test in that checkout, review the diff, commit on a branch and open a pull request.');
}

function clean(runDir) {
  const s = loadState(runDir);
  for (const arm of ARMS) {
    const skill = s.arms[arm].skill;
    if (fs.existsSync(path.join(skill, 'node_modules'))) fs.unlinkSync(path.join(skill, 'node_modules')); // the junction, not the real folder
    // Long paths: the worktrees sit deep in temp folders, past Windows' default path limit (round 1).
    const r = sh('git', ['-c', 'core.longpaths=true', 'worktree', 'remove', '--force', skill], REPO);
    console.log(`${arm}: ${r.status === 0 ? 'worktree removed' : `could not remove: ${r.stderr.trim()}`}`);
  }
  console.log(`The run folder (${runDir}) is kept: projects, evidence and RESULT.md. Delete it yourself when done.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [cmd, runDir, ...rest] = process.argv.slice(2);
  try {
    if (!cmd || !runDir) throw new Error('usage: tune.mjs prepare|evidence|load-edits|score|status|select|adopt|clean <runDir> ...');
    const dir = path.resolve(runDir);
    if (cmd === 'prepare') prepare(dir, rest);
    else if (cmd === 'evidence') evidence(dir, rest[0], rest[1]);
    else if (cmd === 'load-edits') loadEdits(dir, rest[0]);
    else if (cmd === 'score') score(dir, rest[0], rest.slice(1));
    else if (cmd === 'status') status(dir);
    else if (cmd === 'select') select(dir, rest);
    else if (cmd === 'adopt') adopt(dir, path.resolve(rest[0]));
    else if (cmd === 'clean') clean(dir);
    else throw new Error(`unknown command: ${cmd}`);
  } catch (err) {
    console.error(`tune: ${err.message}`);
    process.exit(1);
  }
}
