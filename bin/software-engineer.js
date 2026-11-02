#!/usr/bin/env node
'use strict';
/**
 * software-engineer: installs the /software-engineer skill for every project (no plugin needed), and the engine behind it.
 * No dependencies: only Node and git.
 *
 *   software-engineer install     put the skill in ~/.claude/skills/software-engineer and set up the engine in ~/.agents
 *   software-engineer update      pull the engine, re-run its setup, refresh the installed skill
 *   software-engineer status      what is installed, and whether the engine passes its health check
 *   software-engineer uninstall   remove the installed skill (--purge --yes also removes the engine and its knowledge bases)
 *
 * Options: --dir <engine dir> (default ~/.agents) · --project (the skill goes in ./.claude/skills instead of the global folder)
 *          --repo <git url> · --link (use this checkout as the engine) · --skip-engine · --force · --dry-run · --json · --yes
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SELF = path.resolve(__dirname, '..');
const PKG = JSON.parse(fs.readFileSync(path.join(SELF, 'package.json'), 'utf8'));
const DEFAULT_REPO = 'https://github.com/MARafey/The-Software-Engineer';
const SKILL = 'software-engineer';
const MARKER = '.installed-by-software-engineer.json';

class UsageError extends Error {}

// ── arguments ───────────────────────────────────────────────────────────────
const VALUE_FLAGS = ['dir', 'repo'];
const BOOL_FLAGS = ['project', 'link', 'skip-engine', 'force', 'dry-run', 'json', 'yes', 'purge', 'reseed'];

function parse(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { opts._.push(a); continue; }
    const [name, inline] = a.slice(2).split('=');
    if (VALUE_FLAGS.includes(name)) {
      const v = inline !== undefined ? inline : argv[++i];
      if (!v || v.startsWith('--')) throw new UsageError(`--${name} needs a value`);
      opts[name] = v;
    } else if (BOOL_FLAGS.includes(name)) {
      opts[name] = true;
    } else {
      throw new UsageError(`unknown option --${name}`);
    }
  }
  return opts;
}

// ── helpers ─────────────────────────────────────────────────────────────────
const say = (m = '') => console.log(m);
const engineDir = (o) => path.resolve(o.dir || path.join(os.homedir(), '.agents'));
const initialized = (dir) => fs.existsSync(path.join(dir, 'shared', 'orchestrator.db'));
const skillDest = (o) => (o.project ? path.join(process.cwd(), '.claude', 'skills', SKILL) : path.join(os.homedir(), '.claude', 'skills', SKILL));
const norm = (s) => String(s).split(String.fromCharCode(13)).join('');
const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

function run(cmd, args, { cwd, quiet = true } = {}) {
  // npm is a .cmd file on Windows, which needs a shell; every argument here is fixed text, never user input.
  const useShell = cmd === 'npm' && process.platform === 'win32';
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: useShell, stdio: quiet ? 'pipe' : 'inherit' });
  if (r.error) throw new Error(`${cmd} could not run: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (exit ${r.status})\n${String(r.stdout || '') + String(r.stderr || '')}`.trim());
  return String(r.stdout || '').trim();
}

function need(cmd, hint) {
  const r = spawnSync(cmd, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' && cmd === 'npm' });
  if (r.error || r.status !== 0) throw new Error(`${cmd} is required. ${hint}`);
}

function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 18) throw new Error(`Node.js 18 or newer is required (this is ${process.versions.node}). https://nodejs.org`);
}

/** The setup the skill runs on first use: dependencies, databases, vault notes, health check. */
function setUp(dir, { reseed = true } = {}) {
  say('  installing dependencies (npm install)...');
  run('npm', ['install', '--silent'], { cwd: dir });
  say('  creating the knowledge bases...');
  run(process.execPath, ['init/bootstrap.js'], { cwd: dir });
  if (reseed) run(process.execPath, ['init/seed-vaults.js'], { cwd: dir });
  say('  running the health check...');
  run(process.execPath, ['init/verify.js'], { cwd: dir });
}

// ── the engine ──────────────────────────────────────────────────────────────
function ensureEngine(o) {
  const dir = engineDir(o);
  if (initialized(dir)) { say(`Engine: already set up at ${dir}`); return dir; }
  if (o['dry-run']) {
    say(dir === SELF ? `Engine: would set up this checkout (${dir})` : o.link ? `Engine: would link ${dir} to this checkout (${SELF}) and set it up` : `Engine: would clone ${o.repo || DEFAULT_REPO} to ${dir} and set it up`);
    return dir;
  }
  if (dir === SELF) {
    say(`Engine: setting up this checkout (${dir})`);
  } else if (o.link) {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length) throw new Error(`${dir} already exists and is not empty; remove it or choose --dir`);
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    fs.rmSync(dir, { recursive: true, force: true });
    fs.symlinkSync(SELF, dir, 'junction');   // a junction on Windows needs no administrator rights
    say(`Engine: ${dir} now points at ${SELF}`);
    if (initialized(SELF)) return dir;
    return setUpAndReturn(SELF, dir);
  } else {
    need('git', 'Download it from https://git-scm.com and run this again.');
    if (fs.existsSync(dir) && fs.readdirSync(dir).length) throw new Error(`${dir} already exists and is not an installed engine; move it away or choose --dir`);
    say(`Engine: cloning ${o.repo || DEFAULT_REPO} to ${dir}`);
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    run('git', ['clone', '--depth', '1', o.repo || DEFAULT_REPO, dir]);
  }
  return setUpAndReturn(dir, dir);
}

function setUpAndReturn(workDir, dir) {
  setUp(workDir);
  say('Engine: ready');
  return dir;
}

// ── the skill ───────────────────────────────────────────────────────────────
function skillSource(dir) {
  for (const base of [dir, SELF]) {
    const s = path.join(base, 'skills', SKILL);
    if (fs.existsSync(path.join(s, 'SKILL.md'))) return s;
  }
  throw new Error('the skill files (skills/software-engineer/SKILL.md) were not found in the engine or in this checkout');
}

function installSkill(o, dir) {
  const src = skillSource(dir);
  const dest = skillDest(o);
  const where = o.project ? 'this project' : 'every project (global)';
  const existing = read(path.join(dest, 'SKILL.md'));
  const marker = readJson(path.join(dest, MARKER));
  const upToDate = existing !== null && norm(existing) === norm(read(path.join(src, 'SKILL.md')));

  if (existing !== null && !marker && !o.force) {
    throw new Error(`${dest} already has a skill that this tool did not install; use --force to replace it, or remove it first`);
  }
  if (upToDate && marker && !o.force) { say(`Skill: already up to date in ${dest}`); return dest; }
  if (o['dry-run']) { say(`Skill: would ${existing !== null ? 'replace' : 'install'} ${dest} (available in ${where})`); return dest; }

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  fs.writeFileSync(path.join(dest, MARKER), JSON.stringify({ engine: dir, version: PKG.version, installedAt: new Date().toISOString() }, null, 2) + '\n');
  say(`Skill: installed in ${dest} (available in ${where})`);
  return dest;
}

// ── commands ────────────────────────────────────────────────────────────────
function install(o) {
  checkNode();
  const dir = o['skip-engine'] ? engineDir(o) : ensureEngine(o);
  if (o['skip-engine']) say(`Engine: skipped (the skill sets it up at ${dir} on first use)`);
  installSkill(o, dir);
  if (!o['dry-run']) {
    say();
    say('Done. Restart Claude Code (or open a new session), then in a project run:');
    say('  /software-engineer start');
    say('If the plugin is also installed, remove one of the two so the command is not registered twice.');
  }
}

function update(o) {
  checkNode();
  const dir = engineDir(o);
  if (!initialized(dir)) throw new Error(`no engine at ${dir}; run: software-engineer install`);
  if (o['dry-run']) { say(`would pull ${dir}, re-run its setup and refresh the skill`); return; }
  if (fs.existsSync(path.join(dir, '.git')) && !fs.lstatSync(dir).isSymbolicLink()) {
    need('git', 'Download it from https://git-scm.com and run this again.');
    say(`Engine: pulling the latest version into ${dir}`);
    run('git', ['-C', dir, 'pull', '--ff-only']);
  } else {
    say('Engine: not a plain git clone (linked checkout?); skipping the pull');
  }
  setUp(dir, { reseed: !!o.reseed });
  installSkill({ ...o, force: true }, dir);
  say('Updated.');
}

function uninstall(o) {
  const dest = skillDest(o);
  const marker = readJson(path.join(dest, MARKER));
  if (fs.existsSync(dest)) {
    if (!marker && !o.force) throw new Error(`${dest} was not installed by this tool; use --force to remove it anyway`);
    if (o['dry-run']) say(`Skill: would remove ${dest}`);
    else { fs.rmSync(dest, { recursive: true, force: true }); say(`Skill: removed ${dest}`); }
  } else {
    say(`Skill: nothing installed at ${dest}`);
  }
  if (o.purge) {
    const dir = engineDir(o);
    if (!o.yes) throw new Error(`--purge deletes ${dir} with every knowledge base in it and cannot be undone: add --yes to confirm`);
    if (!fs.existsSync(dir)) { say(`Engine: nothing at ${dir}`); return; }
    if (o['dry-run']) { say(`Engine: would delete ${dir}`); return; }
    if (fs.lstatSync(dir).isSymbolicLink()) { fs.unlinkSync(dir); say(`Engine: removed the link ${dir} (the checkout it pointed to is untouched)`); }
    else { fs.rmSync(dir, { recursive: true, force: true }); say(`Engine: deleted ${dir}`); }
  } else {
    say(`The engine (${engineDir(o)}) and its knowledge bases were kept. Add --purge --yes to remove them too.`);
  }
}

function status(o) {
  const dir = engineDir(o);
  const info = { version: PKG.version, node: process.versions.node, engine: { dir, installed: initialized(dir), healthy: null, passed: null }, skills: {} };
  if (info.engine.installed) {
    const r = spawnSync(process.execPath, ['init/verify.js'], { cwd: dir, encoding: 'utf8' });
    info.engine.healthy = r.status === 0;
    const m = /Passed\s+(\d+)/.exec(String(r.stdout));
    info.engine.passed = m ? Number(m[1]) : null;
  }
  for (const [label, project] of [['global', false], ['project', true]]) {
    const dest = skillDest({ project });
    const marker = readJson(path.join(dest, MARKER));
    const have = read(path.join(dest, 'SKILL.md'));
    let current = null;
    try { current = have === null ? null : norm(have) === norm(read(path.join(skillSource(dir), 'SKILL.md'))); } catch { current = null; }
    info.skills[label] = { path: dest, installed: have !== null, byThisTool: !!marker, upToDate: current };
  }
  if (o.json) { say(JSON.stringify(info, null, 2)); return; }
  say(`software-engineer ${info.version} (node ${info.node})`);
  say(`Engine  ${dir}: ${info.engine.installed ? (info.engine.healthy ? `ready, health check passed${info.engine.passed ? ` (${info.engine.passed} checks)` : ''}` : 'installed, but the health check FAILED (run: software-engineer update)') : 'not installed (run: software-engineer install)'}`);
  for (const [label, s] of Object.entries(info.skills)) {
    say(`Skill   ${label}: ${s.installed ? `${s.path}${s.upToDate === false ? ' (out of date: run software-engineer update)' : ''}${s.byThisTool ? '' : ' (not installed by this tool)'}` : 'not installed'}`);
  }
}

function help() {
  say(`software-engineer ${PKG.version}

Usage: software-engineer <command> [options]

Commands
  install     Install the /software-engineer skill for every project, and set up the engine (~/.agents)
  update      Pull the latest engine, re-run its setup, refresh the installed skill
  status      Show what is installed and whether the engine passes its health check
  uninstall   Remove the installed skill (add --purge --yes to also delete the engine and its knowledge bases)

Options
  --dir <path>     Engine folder (default: ~/.agents, where the skill looks for it)
  --project        Use ./.claude/skills in the current folder instead of the global ~/.claude/skills
  --repo <url>     Clone from this git URL instead of ${DEFAULT_REPO}
  --link           Use this checkout as the engine (a link at --dir) instead of cloning
  --skip-engine    Only install the skill; the engine is set up on first use
  --force          Replace a skill this tool did not install
  --dry-run        Show what would happen, change nothing
  --json           status: print JSON
  --reseed         update: also rewrite the baseline vault notes`);
}

function main(argv) {
  const o = parse(argv);
  const cmd = o._[0];
  if (!cmd || cmd === 'help' || cmd === '--help') return help();
  if (cmd === 'version') return say(PKG.version);
  const table = { install, update, status, uninstall };
  if (!table[cmd]) throw new UsageError(`unknown command "${cmd}"`);
  return table[cmd](o);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`error: ${err.message}`);
    if (err instanceof UsageError) console.error('run: software-engineer help');
    process.exit(err instanceof UsageError ? 2 : 1);
  }
}

module.exports = { main, parse };
