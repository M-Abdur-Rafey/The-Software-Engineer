'use strict';
/**
 * Tests for shared/lib/uitest.js against a throwaway git repo with System Docs.
 * Run: node tests/uitest.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { hostAllowed } = require('../shared/lib/uitest');

const CLI = path.join(__dirname, '..', 'shared', 'lib', 'uitest.js');
const SYSDOCS = path.join(__dirname, '..', 'shared', 'lib', 'sysdocs.js');
const project = fs.mkdtempSync(path.join(os.tmpdir(), 'uitest-test-'));
let passed = 0;

function run(cli, ...args) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  const out = r.stdout.trim() ? JSON.parse(r.stdout) : JSON.parse(r.stderr);
  return Object.assign(out, { exitCode: r.status });
}
const ui = (...a) => run(CLI, ...a);

function git(...args) {
  return execFileSync('git', ['-C', project, '-c', 'core.autocrlf=false', '-c', 'user.email=dev@example.com', '-c', 'user.name=Dev', ...args], { encoding: 'utf8' });
}

function writeFile(rel, text) {
  fs.mkdirSync(path.dirname(path.join(project, rel)), { recursive: true });
  fs.writeFileSync(path.join(project, rel), text);
}

function test(name, fn) {
  return Promise.resolve(fn()).then(() => { passed++; console.log(`  ok  ${name}`); });
}

(async () => {
  try {
    git('init', '-q');
    const plan = path.join(project, 'plan.json');
    fs.writeFileSync(plan, JSON.stringify({
      modules: [
        { name: 'auth', layer: 1, paths: ['src/auth/'], provides: ['api:POST /api/auth/login', 'fn:requireAuth'], dependsOn: [] },
        { name: 'projects', layer: 2, paths: ['src/projects/', 'web/src/projects/'], provides: ['api:GET /api/projects'], dependsOn: [{ module: 'auth', uses: ['fn:requireAuth'] }] },
        { name: 'reports', layer: 3, paths: ['src/reports/'], provides: [], dependsOn: [{ module: 'projects', uses: ['api:GET /api/projects'] }] },
      ],
    }));
    run(SYSDOCS, 'apply-plan', project, `@${plan}`);
    fs.rmSync(plan);
    for (const [m, f] of [['auth', 'login'], ['projects', 'list-projects'], ['reports', 'monthly']]) run(SYSDOCS, 'add-flow', project, m, f);
    writeFile('src/auth/login.js', 'module.exports = 1;\n');
    writeFile('src/projects/list.js', 'module.exports = 2;\n');
    writeFile('web/src/projects/list.css', '.a { color: red; }\n');
    writeFile('src/reports/monthly.js', 'module.exports = 3;\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'init');

    await test('host allowlist accepts only local dev hosts', () => {
      for (const ok of ['http://localhost:3000', 'http://127.0.0.1:4100/api', 'http://[::1]:3000', 'https://app.localhost', 'http://shop.test/x', 'ws://localhost:5173']) {
        assert.strictEqual(hostAllowed(ok), true, ok);
      }
      for (const bad of ['https://example.com', 'http://localhost.evil.com', 'http://10.0.0.5:3000', 'http://192.168.1.2', 'http://test', 'file:///etc/passwd', 'http://127.0.0.2', 'not a url']) {
        assert.strictEqual(hostAllowed(bad), false, bad);
      }
      const r = ui('check-host', 'http://localhost:3000', 'https://example.com');
      assert.strictEqual(r.exitCode, 1);
      assert.strictEqual(r.allowed, false);
      assert.strictEqual(ui('check-host', 'http://localhost:3000').exitCode, 0);
    });

    await test('first run is a full run over every module and flow', () => {
      const s = ui('scope', project);
      assert.strictEqual(s.mode, 'full');
      assert.strictEqual(s.reason, 'no previous UI test run');
      assert.deepStrictEqual(s.modules.sort(), ['auth', 'projects', 'reports']);
      assert.strictEqual(s.flows.length, 3);
      assert.ok(s.flows.every(f => f.regenerate));
      assert.deepStrictEqual(s.endpoints.map(e => e.endpoint).sort(), ['GET /api/projects', 'POST /api/auth/login']);
      assert.ok(s.securitySuites.includes('headers') && s.securitySuites.includes('injection'));
      assert.strictEqual(s.estimate.tokensPerSpecSource, 'default');
    });

    await test('record saves the tested commit and flow hashes', () => {
      for (const f of ['tests/ui/flows/auth/login.spec.ts', 'tests/ui/flows/projects/list-projects.spec.ts', 'tests/ui/flows/reports/monthly.spec.ts', 'tests/ui/security/headers.spec.ts']) writeFile(f, '// spec\n');
      git('add', '-A');
      git('commit', '-q', '-m', 'specs');
      const r = ui('record', project, JSON.stringify({
        flows: ['docs/system/modules/auth/flows/login.md', 'docs/system/modules/projects/flows/list-projects.md', 'docs/system/modules/reports/flows/monthly.md'],
        tokensUsed: 300000, flowsGenerated: 4,
      }));
      assert.ok(/^[0-9a-f]{7,}$/.test(r.lastTestedCommit));
      assert.strictEqual(r.avgTokensPerFlow, 75000);
      assert.strictEqual(Object.keys(r.flows).length, 3);
    });

    await test('no changes since the last run -> skip', () => {
      const s = ui('scope', project);
      assert.strictEqual(s.skip, true);
      assert.strictEqual(s.reason, 'nothing changed since the last UI test');
    });

    await test('style-only changes skip UI testing', () => {
      writeFile('web/src/projects/list.css', '.a { color: blue; }\n');
      writeFile('README.md', '# readme\n');
      writeFile('web/src/locales/en.json', '{"title":"Projects"}\n');
      git('add', '-A');
      git('commit', '-q', '-m', 'restyle');
      const s = ui('scope', project);
      assert.strictEqual(s.skip, true);
      assert.strictEqual(s.reason, 'only style, asset or text files changed');
      assert.strictEqual(ui('scope', project, '--full').skip, false);
    });

    await test('a behavioural change tests that module plus its direct consumers only', () => {
      writeFile('src/projects/list.js', 'module.exports = 22;\n');
      const s = ui('scope', project);
      assert.strictEqual(s.mode, 'changed');
      assert.strictEqual(s.skip, false);
      assert.deepStrictEqual(s.changedModules, ['projects']);
      assert.deepStrictEqual(s.modules.sort(), ['projects', 'reports']);
      assert.deepStrictEqual(s.flows.map(f => f.flow).sort(), ['list-projects', 'monthly']);
      assert.ok(s.flows.every(f => !f.regenerate), 'flow docs unchanged: specs are reused');
      assert.deepStrictEqual(s.endpoints.map(e => e.endpoint), ['GET /api/projects']);
      assert.ok(!s.suitesToGenerate.includes('headers'), 'existing headers spec is reused');
      assert.strictEqual(s.estimate.tokensPerSpecSource, 'measured');
    });

    await test('an edited flow doc marks only that spec for regeneration', () => {
      writeFile('docs/system/modules/reports/flows/monthly.md', '# reports / monthly\n\nnew step\n');
      const s = ui('scope', project);
      const byFlow = Object.fromEntries(s.flows.map(f => [f.flow, f.regenerate]));
      assert.deepStrictEqual(byFlow, { 'list-projects': false, monthly: true });
    });

    await test('changes under docs/system or tests/ui alone do not trigger testing', () => {
      git('add', '-A');
      git('commit', '-q', '-m', 'wip');
      ui('record', project, JSON.stringify({ flows: [] }));
      writeFile('tests/ui/flows/auth/login.spec.ts', '// edited spec\n');
      writeFile('docs/system/modules/auth/README.md', fs.readFileSync(path.join(project, 'docs/system/modules/auth/README.md'), 'utf8') + '\nmore\n');
      assert.strictEqual(ui('scope', project).reason, 'nothing changed since the last UI test');
    });

    await test('--modules adds modules; unknown names fail', () => {
      const s = ui('scope', project, '--modules=auth');
      assert.strictEqual(s.skip, false);
      assert.deepStrictEqual(s.modules, ['auth']);
      assert.strictEqual(ui('scope', project, '--modules=nope').exitCode, 1);
    });

    await test('env reports workers, free ports, installs and target allowlist', async () => {
      const r = ui('env', project, '--ports=1', '--url=http://localhost:4100', '--url=https://example.com');
      assert.ok(r.workers >= 1 && r.workers <= 8);
      assert.strictEqual(r.freePorts.length, 3);
      assert.ok(r.installs.some(i => i.includes('@playwright/test')));
      assert.strictEqual(r.targetsAllowed, false);
      assert.deepStrictEqual(r.targets.map(t => t.allowed), [true, false]);
    });

    console.log(`\nuitest: ${passed} passed`);
  } catch (err) {
    console.error(`\nFAILED after ${passed} passed:\n${err.stack}`);
    process.exitCode = 1;
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
})();
