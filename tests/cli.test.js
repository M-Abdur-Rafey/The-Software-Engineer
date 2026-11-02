'use strict';
/**
 * Tests for bin/software-engineer.js. Every run uses a throwaway HOME and a fake engine folder, so nothing under the real
 * ~/.claude or ~/.agents is touched and nothing is cloned or installed. Run: node tests/cli.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const CLI = path.join(__dirname, '..', 'bin', 'software-engineer.js');
const ROOT = path.join(__dirname, '..');
const tmp = [];
let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const mk = (prefix) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix)); tmp.push(d); return d; };

/** A fake installed engine: the files the CLI looks at, no more. */
function engine(skillText = '---\nname: software-engineer\n---\n# v1\n') {
  const dir = mk('se-engine-');
  fs.mkdirSync(path.join(dir, 'shared'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'shared', 'orchestrator.db'), '');
  fs.mkdirSync(path.join(dir, 'skills', 'software-engineer', 'extra'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'skills', 'software-engineer', 'SKILL.md'), skillText);
  fs.writeFileSync(path.join(dir, 'skills', 'software-engineer', 'extra', 'note.md'), 'extra file');
  return dir;
}

function cli(home, args, cwd = home) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home } });
  return { code: r.status, out: String(r.stdout), err: String(r.stderr) };
}
const skillDir = (home) => path.join(home, '.claude', 'skills', 'software-engineer');

try {
  test('install puts the skill, its extra files and a marker in the global skills folder', () => {
    const home = mk('se-home-');
    const eng = engine();
    const r = cli(home, ['install', '--dir', eng]);
    assert.strictEqual(r.code, 0, r.out + r.err);
    assert.ok(fs.readFileSync(path.join(skillDir(home), 'SKILL.md'), 'utf8').includes('# v1'));
    assert.strictEqual(fs.readFileSync(path.join(skillDir(home), 'extra', 'note.md'), 'utf8'), 'extra file');
    const marker = JSON.parse(fs.readFileSync(path.join(skillDir(home), '.installed-by-software-engineer.json'), 'utf8'));
    assert.strictEqual(marker.engine, eng);
    assert.ok(/Restart Claude Code/.test(r.out) && /software-engineer start/.test(r.out));
  });

  test('a second install changes nothing, and a newer engine skill replaces the old one', () => {
    const home = mk('se-home-');
    const eng = engine();
    cli(home, ['install', '--dir', eng]);
    assert.ok(/already up to date/.test(cli(home, ['install', '--dir', eng]).out));
    fs.writeFileSync(path.join(eng, 'skills', 'software-engineer', 'SKILL.md'), '---\nname: software-engineer\n---\n# v2\n');
    const r = cli(home, ['install', '--dir', eng]);
    assert.strictEqual(r.code, 0, r.out + r.err);
    assert.ok(fs.readFileSync(path.join(skillDir(home), 'SKILL.md'), 'utf8').includes('# v2'));
  });

  test('--dry-run reports the plan and writes nothing', () => {
    const home = mk('se-home-');
    const r = cli(home, ['install', '--dir', engine(), '--dry-run']);
    assert.strictEqual(r.code, 0);
    assert.ok(/would install/.test(r.out), r.out);
    assert.ok(!fs.existsSync(path.join(home, '.claude')));
  });

  test('a skill of the same name that this tool did not install is not overwritten without --force', () => {
    const home = mk('se-home-');
    fs.mkdirSync(skillDir(home), { recursive: true });
    fs.writeFileSync(path.join(skillDir(home), 'SKILL.md'), 'my own skill');
    const eng = engine();
    const no = cli(home, ['install', '--dir', eng]);
    assert.strictEqual(no.code, 1);
    assert.ok(/did not install/.test(no.err), no.err);
    assert.strictEqual(fs.readFileSync(path.join(skillDir(home), 'SKILL.md'), 'utf8'), 'my own skill');
    assert.strictEqual(cli(home, ['install', '--dir', eng, '--force']).code, 0);
    assert.ok(fs.readFileSync(path.join(skillDir(home), 'SKILL.md'), 'utf8').includes('# v1'));
  });

  test('--project installs into ./.claude/skills of the current folder, not the global one', () => {
    const home = mk('se-home-');
    const project = mk('se-project-');
    const r = cli(home, ['install', '--dir', engine(), '--project'], project);
    assert.strictEqual(r.code, 0, r.out + r.err);
    assert.ok(fs.existsSync(path.join(project, '.claude', 'skills', 'software-engineer', 'SKILL.md')));
    assert.ok(!fs.existsSync(path.join(home, '.claude')));
  });

  test('--skip-engine installs only the skill and sets nothing up', () => {
    const home = mk('se-home-');
    const missing = path.join(mk('se-none-'), 'no-engine-here');
    // The skill comes from this checkout when the engine folder has none.
    const r = cli(home, ['install', '--dir', missing, '--skip-engine']);
    assert.strictEqual(r.code, 0, r.out + r.err);
    assert.ok(fs.existsSync(path.join(skillDir(home), 'SKILL.md')));
    assert.ok(!fs.existsSync(missing));
  });

  test('uninstall removes only what the tool installed, and keeps the engine unless --purge --yes', () => {
    const home = mk('se-home-');
    const eng = engine();
    cli(home, ['install', '--dir', eng]);
    const keep = cli(home, ['uninstall', '--dir', eng]);
    assert.strictEqual(keep.code, 0, keep.out + keep.err);
    assert.ok(!fs.existsSync(skillDir(home)));
    assert.ok(fs.existsSync(eng), 'the engine is kept');
    fs.mkdirSync(skillDir(home), { recursive: true });
    fs.writeFileSync(path.join(skillDir(home), 'SKILL.md'), 'my own skill');
    assert.strictEqual(cli(home, ['uninstall', '--dir', eng]).code, 1);
    assert.ok(fs.existsSync(path.join(skillDir(home), 'SKILL.md')), 'a foreign skill is left alone');
    const noYes = cli(home, ['uninstall', '--dir', eng, '--force', '--purge']);
    assert.strictEqual(noYes.code, 1);
    assert.ok(/--yes/.test(noYes.err));
    assert.ok(fs.existsSync(eng), 'nothing is deleted without --yes');
    assert.strictEqual(cli(home, ['uninstall', '--dir', eng, '--force', '--purge', '--yes']).code, 0);
    assert.ok(!fs.existsSync(eng));
  });

  test('status --json reports the engine and both skill locations', () => {
    const home = mk('se-home-');
    const eng = engine();
    cli(home, ['install', '--dir', eng]);
    const r = cli(home, ['status', '--dir', eng, '--json'], mk('se-project-'));
    assert.strictEqual(r.code, 0, r.out + r.err);
    const s = JSON.parse(r.out);
    assert.strictEqual(s.engine.installed, true);
    assert.strictEqual(s.skills.global.installed, true);
    assert.strictEqual(s.skills.global.byThisTool, true);
    assert.strictEqual(s.skills.global.upToDate, true);
    assert.strictEqual(s.skills.project.installed, false);
  });

  test('--link points the engine folder at this checkout, and purging a link never deletes the checkout', () => {
    if (!fs.existsSync(path.join(ROOT, 'shared', 'orchestrator.db'))) { console.log('      (skipped: this checkout has not been set up with npm run init)'); return; }
    const home = mk('se-home-');
    const link = path.join(mk('se-link-'), 'agents-link');
    const r = cli(home, ['install', '--dir', link, '--link']);
    assert.strictEqual(r.code, 0, r.out + r.err);
    assert.ok(fs.lstatSync(link).isSymbolicLink());
    assert.strictEqual(fs.realpathSync(link), fs.realpathSync(ROOT));
    assert.strictEqual(cli(home, ['uninstall', '--dir', link, '--purge', '--yes']).code, 0);
    assert.ok(!fs.existsSync(link));
    assert.ok(fs.existsSync(path.join(ROOT, 'shared', 'orchestrator.db')), 'the checkout is untouched');
  });

  test('bad input: unknown command and unknown option exit 2, an option without its value too', () => {
    const home = mk('se-home-');
    assert.strictEqual(cli(home, ['bogus']).code, 2);
    assert.strictEqual(cli(home, ['install', '--nope']).code, 2);
    assert.strictEqual(cli(home, ['install', '--dir']).code, 2);
    assert.strictEqual(cli(home, ['help']).code, 0);
  });

  console.log(`\ncli: ${passed} passed`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
  process.exitCode = 1;
} finally {
  for (const d of tmp) fs.rmSync(d, { recursive: true, force: true });
}
