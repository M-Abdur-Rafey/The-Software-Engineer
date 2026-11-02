// Tests for the MCP apply path (mcp/lib/orchestrator.mjs) with a fake model: nothing is sent anywhere.
// The security scan decides whether generated files are kept; a blocked change is rolled back completely.
// Run: node tests/mcp-apply.test.mjs
import assert from 'assert'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'
import { createRequire } from 'module'
import { orchestrate } from '../mcp/lib/orchestrator.mjs'

let passed = 0
const test = async (name, fn) => { await fn(); passed++; console.log(`  ok  ${name}`) }
const dirs = []

function repo(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-apply-'))
  dirs.push(dir)
  const git = (...a) => execFileSync('git', ['-C', dir, '-c', 'core.autocrlf=false', '-c', 'user.email=t@example.com', '-c', 'user.name=T', ...a], { stdio: 'ignore' })
  git('init', '-q')
  fs.writeFileSync(path.join(dir, 'README.md'), '# app\n')
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    fs.writeFileSync(path.join(dir, rel), text)
  }
  git('add', '-A')
  git('commit', '-q', '-m', 'base')
  return dir
}

// A model that classifies every task as backend-only and returns the given files.
const modelWith = (files) => ({
  generate: async ({ schema }) => (schema && schema.required && schema.required.includes('taskSlug')
    ? { requiresDatabase: false, requiresBackend: true, requiresFrontend: false, requiresCalls: false, taskType: 'feat', taskSlug: 'x' }
    : { summary: 'test', files }),
  availability: () => ({}),
})

try {
  await test('a clean change is written, and the result says what did not run', async () => {
    const dir = repo()
    const r = await orchestrate({ task: 'add a thing', projectPath: dir, apply: true, model: modelWith([{ path: 'src/a.js', content: '// a\nmodule.exports = 1\n' }]) })
    assert.strictEqual(r.applied, true)
    assert.deepStrictEqual(r.filesWritten, ['src/a.js'])
    assert.strictEqual(r.securityScan.passed, true)
    assert.ok(r.notRun.includes('mcpbridge') && r.notRun.some((x) => /git commit/.test(x)) && r.notRun.some((x) => /^verify/.test(x)))
    assert.ok(fs.existsSync(path.join(dir, 'src', 'a.js')))
  })

  await test('a hardcoded secret blocks the change and nothing stays on disk', async () => {
    const dir = repo({ 'src/keep.js': '// keep\nmodule.exports = 1\n' })
    const files = [
      { path: 'src/keep.js', content: '// keep\nconst API_KEY = "fake-0123456789abcdef";\n' },
      { path: 'src/deep/new.js', content: '// new\nmodule.exports = 2\n' },
    ]
    const r = await orchestrate({ task: 'add a thing', projectPath: dir, apply: true, model: modelWith(files) })
    assert.strictEqual(r.applied, false)
    assert.strictEqual(r.blocked.reason, 'security_scan_failed')
    assert.deepStrictEqual(r.filesWritten, [])
    assert.strictEqual(fs.readFileSync(path.join(dir, 'src', 'keep.js'), 'utf8'), '// keep\nmodule.exports = 1\n')
    assert.ok(!fs.existsSync(path.join(dir, 'src', 'deep')), 'new directories are removed too')
  })

  await test('a folder that is not a git repository is refused', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-apply-plain-'))
    dirs.push(dir)
    await assert.rejects(orchestrate({ task: 'x', projectPath: dir, apply: true, model: modelWith([{ path: 'a.js', content: '// a\n' }]) }), /git repository/)
    assert.deepStrictEqual(fs.readdirSync(dir), [])
  })

  await test('the project\'s own checks (when confirmed) block a change that newly fails them, and it is rolled back', async () => {
    const require = createRequire(import.meta.url)
    const verify = require('../shared/lib/verify.js')
    const projectmap = require('../shared/lib/projectmap.js')
    const dir = repo({ 'check.js': "process.exit(require('fs').existsSync('src/bad.js') ? 1 : 0)\n" })
    try {
      verify.set(dir, { confirmed: true, steps: [{ kind: 'test', run: 'node check.js' }] })
      const bad = await orchestrate({ task: 'x', projectPath: dir, apply: true, model: modelWith([{ path: 'src/bad.js', content: '// bad\n' }]) })
      assert.strictEqual(bad.applied, false)
      assert.strictEqual(bad.blocked.reason, 'verify_failed')
      assert.ok(!fs.existsSync(path.join(dir, 'src', 'bad.js')), 'rolled back')
      const good = await orchestrate({ task: 'x', projectPath: dir, apply: true, model: modelWith([{ path: 'src/good.js', content: '// good\n' }]) })
      assert.strictEqual(good.applied, true)
      assert.strictEqual(good.verify.passed, true)
    } finally {
      fs.rmSync(projectmap.projectDir(dir), { recursive: true, force: true })   // the confirmed commands live in the install's vault
    }
  })

  await test('commit=true commits exactly the written files on a new branch', async () => {
    const dir = repo()
    fs.writeFileSync(path.join(dir, 'unrelated.txt'), 'left alone')
    const r = await orchestrate({ task: 'add a thing', projectPath: dir, apply: true, commit: true, model: modelWith([{ path: 'src/a.js', content: '// a\nmodule.exports = 1\n' }]) })
    assert.ok(r.commit && r.commit.branch && /^feat\//.test(r.commit.branch), JSON.stringify(r.commit))
    const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' }).trim()
    assert.strictEqual(git('rev-parse', '--abbrev-ref', 'HEAD'), r.commit.branch)
    assert.deepStrictEqual(git('show', '--name-only', '--format=', 'HEAD').split('\n'), ['src/a.js'])
    assert.ok(git('status', '--porcelain').includes('unrelated.txt'), 'other files stay uncommitted')
  })

  await test('without apply nothing is written and no scan runs', async () => {
    const dir = repo()
    const r = await orchestrate({ task: 'x', projectPath: dir, model: modelWith([{ path: 'src/a.js', content: '// a\n' }]) })
    assert.strictEqual(r.applied, false)
    assert.strictEqual(r.securityScan, null)
    assert.ok(!fs.existsSync(path.join(dir, 'src')))
  })

  console.log(`\nmcp-apply: ${passed} passed`)
} catch (err) {
  console.error(`\nFAILED after ${passed} passed:\n${err.stack}`)
  process.exitCode = 1
} finally {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true })
}
