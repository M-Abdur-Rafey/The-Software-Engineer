# Verify phase: design

Status: **approved design** · 2026-10-22

## Problem

The `/software-engineer <task>` pipeline never runs the code it writes.

- **No workflow runs a command.** None of `orchestrate.js`, database, backend, frontend, testing, calls, ponytail, mcpbridge or gitdevops runs the project's tests, build, type-check or linter. Every check is an AI reading code.
- **Testing never executes its own collection.** It writes a Postman collection, but nothing runs it (there is no Newman).
- **The bridge only reads.** It validates contracts by reading the frontend, backend and schema files.
- **SRE health checks are judgement calls.** They are AI-judged ("no obvious broken imports in changed files") and run after the commit.

So a run can commit code that does not compile, fails existing tests, or breaks an endpoint, and every gate still passes.

Checking the code found three more gaps the fix has to cover:

- **The generated collections cannot run as written.** `testing.js` sets `bearerToken` to `""` and nothing logs in, so every authenticated request would get a 401 under Newman.
- **The commands are not stored anywhere usable.** Onboarding already detects `install`, `dev`, `test`, `build` and `migrate`, but only as text in the project map. It does not detect type-check, lint, or how to start the app against a throwaway database.
- **`shared/lib/uitest.js` covers less than a full test run needs.** It provides free ports (`env`) and the local-host check (`hostAllowed`). Its throwaway database is set up by an agent, not by code.

## Principles

1. **Exit codes decide.** Every pass or fail comes from a process exit code or a test runner's report, never from an AI reading output.
2. **Commands are confirmed by a person before they first run.** They execute the project's own code, so onboarding proposes them and the user confirms or corrects them once per project.
3. **Never blame the session for what was already broken.** A baseline taken before any change separates new failures from old ones.
4. **Fixes may not weaken the checks.** A fixer that edits or deletes tests that existed before the session fails the gate.
5. **One small agent per run, no more.** The Workflow sandbox cannot run commands, so one `haiku` agent runs a deterministic script and returns its JSON unchanged (as `gitdevops` does with `scan.js`). The baseline runs in the skill's main session, so it costs no agent.

## Changes

### 1. Project commands, recorded once

`shared/lib/verify.js` owns one file per project: `agents/orchestrator/vault/projects/<name>/verify.json`, which is private and git-ignored, next to `map.md`.

```json
{
  "confirmed": true,
  "steps": [
    { "kind": "install",   "cwd": ".",   "run": "npm ci",            "when": "deps-changed" },
    { "kind": "build",     "cwd": "web", "run": "npm run build" },
    { "kind": "typecheck", "cwd": ".",   "run": "npx tsc --noEmit" },
    { "kind": "lint",      "cwd": ".",   "run": "npm run lint" },
    { "kind": "test",      "cwd": ".",   "run": "npm test", "report": "jest" }
  ],
  "serve": { "cwd": ".", "run": "npm start", "env": { "PORT": "{port}", "DB_PATH": "{tmpdb}", "JWT_SECRET": "{random}" }, "ready": "/api/health", "timeoutSec": 60 }
}
```

- **Each kind can appear more than once**, for example an API build and a `web/` build.
- **The `report` field** names the test runner's machine-readable format, when there is one (`jest`, `vitest`, `mocha`, `node-test`, `pytest`). That lets results be compared test by test.
- **`serve` starts the app** for the API tests:
  - `{port}` is a free port, taken from the same logic as `uitest.js env`.
  - `{tmpdb}` is a temp SQLite file, or a `<db>_verify` database name.
  - `{random}` is a throwaway secret.

**Detection.** The `discover` agent in `onboard.js` already returns `commands`. Its schema grows to the step list above, plus type-check, lint and `serve`, with a confidence for each.

**Confirmation.** The draft is saved with `confirmed: false`. Before the first task on the project, the skill shows the steps in plain language and asks once:
- whether they are right
- what is missing
- how to start the app against a throwaway database

The answer is saved with `verify.js set`. Projects onboarded before this change get the same question at their next task. A step the user does not know is left out and reported as "not configured". It is never guessed.

### 2. `shared/lib/verify.js`: the deterministic runner

```
node shared/lib/verify.js show     <project>
node shared/lib/verify.js set      <project> <json|@file>
node shared/lib/verify.js run      <project> [--baseline <file>] [--collection <path>] [--changed <files...>] [--out <file>]
node shared/lib/verify.js classify <project> <runResult> <changedFiles...>    owner domain per failure (used by the fix loop)
```

`run` executes the confirmed steps in order:
- **Install** runs only when the session changed `package.json` or a lockfile, or when `node_modules` is missing.
- **Each step** has a timeout and records its exit code, duration and the last 4000 characters of output.
- **Tests** also record each failing test's name when `report` gives a parseable format.

**API tests.** When `--collection` is given and `serve` is configured:
- start the app on a free `127.0.0.1` port with a throwaway database
- wait for `ready`
- run `newman run <collection> --env-var baseUrl=http://127.0.0.1:<port>` with its JSON reporter
- stop only the process it started, and delete the temp database

The base URL is always a local host, checked with `uitest.hostAllowed`.

**Output** is JSON:

```json
{ "passed": false,
  "steps": [{ "kind": "test", "ok": false, "exitCode": 1, "newFailures": ["projects > PATCH 403 for non-owner"],
              "alreadyFailing": ["legacy > flaky date test"], "tail": "..." }] }
```

A step passes when it has no new failures. Without per-test detail, a step counts as already failing when it also failed at baseline.

### 3. Self-contained API collections

`testing.js` must produce a collection that Newman can run against an empty database:
- **A setup folder runs first.** It registers or logs in the users the tests need and stores tokens and ids in collection variables.
- **Tests chain those variables.** They never depend on data that already exists.
- **`needsSetup` keeps its meaning.** Tests marked `needsSetup` are excluded from the Newman run (`--folder` selection) and reported as not run.

The collection keeps `{{baseUrl}}`, and the runner overrides it.

### 4. Baseline

Before the workflow starts, the skill runs `verify.js run <project> --out <baseline>`, in its own session, with no agent. It passes the file path to `orchestrate.js` as `verifyBaseline`.

- **Greenfield projects** have nothing to run, so the baseline is empty.
- **Direct workflow calls**, without the skill, get one `haiku` agent for the baseline.

### 5. The Verify phase and the fix loop

Order:

```
frontend + testing + calls → ponytail → VERIFY (+ fix loop) → bridge → gitdevops → sre
```

The proposal placed Verify before ponytail. This design places it after, because ponytail edits code. Verifying first would let a simplification break the build after the gate had passed. Verify then also checks ponytail's work.

1. **Run.** One `haiku` agent runs `verify.js run` with the baseline, the session's collection and the changed files, and returns the JSON unchanged.
2. **Pass?** Continue to the bridge.
3. **Attribute.** `verify.js classify` maps each new failure to the domain that owns the files named in its output. Each domain's `filesChanged` gives ownership, and a Newman failure goes to backend. A failure with no owner goes to the domain with the most changed files.
4. **Fix.** One fixer agent per failing domain gets:
   - the trimmed failing output
   - that domain's changed files
   - the spec brief
   - its `agents/<domain>/CLAUDE.md`

   The fixer may change source files. It may not edit or delete tests that existed before the session, may not skip tests, and may not lower a check. Then Verify runs again.
5. **Cap.** At most **2** fix rounds, so at most 3 Verify runs.
6. **Gate.** If new failures remain:
   - orchestrate stops before the bridge and the commit, with `status: "blocked"` and `reason: "verify_failed"`, like a bridge violation
   - it reports each failing command, its trimmed output, and what each fix round changed
   - the working tree keeps the changes so the user can look

**Tests-weakened guard.** After each fix round, `verify.js` diffs the changed files against `HEAD`. A modified or deleted pre-existing test file is a blocking finding, named in the report. It uses the same test-path rule as `scan.js`.

### 6. Everything else that uses it

- **Short pipeline:** Verify always runs, like the bridge and the scan.
- **Lesson library:** new failures are recorded as observations (`source: "verify"`, rule `verify:build`, `verify:test`, `verify:typecheck`, `verify:lint` or `verify:api`), so repeat misses become lessons for that domain's author.
- **SRE:** its health checks use the Verify result instead of AI judgement, and the "no obvious broken imports" check is removed.
- **Results:** the run result gains `verify: { passed, steps, attempts }`, and the skill reports it.
- **MCP server path:** out of scope for v1. It has no workflow sandbox and could run `verify.js` directly later.

## Cost

| | Agents | Notes |
|---|---|---|
| Baseline | 0 (skill) / 1 haiku (direct call) | the project's own runtime: tests, builds |
| Verify run | 1 haiku | about 65–70k tokens (the per-agent floor), cheap model |
| Each fix round | 1 fixer per failing domain + 1 haiku re-run | only when something fails |

A passing session adds one cheap agent plus the project's own test and build time. The time can be minutes on a real project, so the skill tells the user when Verify is running.

## Risks

| Risk | Mitigation |
|---|---|
| Running project commands executes arbitrary code | Only commands the user confirmed; the API server binds to `127.0.0.1` only; the throwaway database is never the dev one; only processes the runner started are stopped |
| Fixers "fix" by weakening tests | Deterministic guard on pre-existing test files; prompt rule; reported by name |
| Flaky tests block sessions | The baseline marks tests already failing; a test that fails, then passes on re-run with no code change, is reported as flaky and not blocking (one automatic re-run of a failed step before attributing it) |
| Long or hanging commands | A per-step timeout (default 10 minutes, configurable per step); the server's ready timeout |
| Wrong attribution sends a fix to the wrong domain | Output file paths decide ownership; a wrong fix is still caught by the next Verify run and by the cap |
| A new runtime dependency for the skill | Newman is pinned in `package.json`, never downloaded with `npx` at run time |

## Phases

- **A. Runner (no pipeline change):**
  - `verify.js` with `show`, `set` and `run` for build, type-check, lint and test
  - the baseline comparison
  - parsing the test reporters
  - tests on fixture projects (pass, new failure, already failing, timeout)
- **B. Commands and confirmation:**
  - the `onboard.js` discover schema
  - the skill's one-time question, and asking existing projects at their next task
- **C. Verify phase:**
  - the orchestrate phase, with the gate and the result field
  - the baseline in the skill
  - lesson observations
  - SRE using the result
- **D. API tests:**
  - Newman as a dependency
  - `serve` with a throwaway database
  - self-contained collections in `testing.js`
- **E. Fix loop:** `classify`, the fixer agents, the cap, and the tests-weakened guard.

**Smoke tests:**
- **Phase C:** a task on the smoke API with a planted type error must be blocked.
- **Phase E:** the same task must be fixed within the cap.
- **Phase D:** the A/B task's collection must run under Newman against a throwaway database.

## Decisions

| Topic | Decision |
|---|---|
| Order | Verify runs **after ponytail** and before the bridge, so the gate checks the final code |
| Fix rounds | At most **2**, so at most 3 Verify runs |
| Newman | A **pinned dependency** of the skill; nothing is downloaded during a run |
| Tests-weakened guard | **Blocking**: editing or deleting a pre-existing test fails the gate |

## Open questions

None.
