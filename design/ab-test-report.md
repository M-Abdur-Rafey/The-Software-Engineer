# System Docs A/B test: report

Date: 2026-10-12/13 · Repo under test: `feat/system-docs` at `c540d8d` (fixes from this test: `91e28fe`) · Harness: [`tests/ab/`](../tests/ab/)

## Summary

- **Quality was identical.** Both arms built the same task tracker to 41/41 hidden checks and applied the same "archive projects" change to 54/54, including all 5 linked read-only checks. On this small app (about 40 source files), today's pipeline did not break linked features. Its requirements agent read the whole codebase and inferred the full read-only scope itself.
- **System Docs cost more.** The arm's own runs used 9.69M tokens against the baseline's 8.30M (+17%). Those runs were blocked before commit, SRE and doc update; adding those phases back gives about 12.5M (+50%) for the path as designed. The fixes in `91e28fe` should reduce that; they are not yet measured.
- **What System Docs bought.** It asked 13 explicit decisions instead of the pipeline deciding silently. It named every linked effect and risk before any code was written, and left documentation for 11 modules (flows, APIs, data, dependency map) committed in the project. It also caught a layering mistake in its own plan. None of this showed up as a test-score difference here.
- **Bugs found.** The test exposed 2 pre-existing pipeline bugs (both now fixed), 1 System Docs design flaw (fixed), and 3 structural cost issues.

## Method

- Two empty git repos got the same task ([TASK.md](../tests/ab/TASK.md)): an Express + SQLite REST API with a precise contract, plus a Vite/React UI. Both arms used the same clarification defaults.
  - **Baseline** ran `orchestrate.js` with `systemDocs: false`.
  - **System Docs** ran `sysdocs.js` in plan mode, then answered questions and approved modules, then ran `orchestrate.js`.
- Both apps then got the same change request ([CHANGE.md](../tests/ab/CHANGE.md)). It deliberately says only "Archived projects are read-only", so the test shows whether that rule reaches the linked features: tasks, members and project edits.
- A **hidden acceptance suite** ([acceptance.mjs](../tests/ab/acceptance.mjs)) lives outside both projects. It starts each app and checks it over HTTP: 41 base checks, plus 8 archive checks and 5 linked read-only checks after the change. It also checks that `web/` builds.
- I acted as the user. Every answer was the option the agent listed first, as recommended.
- **Tokens:** "Tokens" means each workflow's own reported total (fresh input + cache writes + output including hidden thinking; cache reads excluded). Per-phase splits and cache reads come from agent transcripts ([tokreport.mjs](../tests/ab/tokreport.mjs)). "Cost-weighted" counts input = 1, cache write = 1.25, cache read = 0.1, output = 5.

## Results

| | Baseline | System Docs |
|---|---|---|
| Build: hidden suite | 41/41 | 41/41 |
| Change: hidden suite (incl. 5 linked read-only checks) | **54/54** | **54/54** |
| Questions asked of the user | 0 | 13 (7 plan, 1 fix, 5 change) |
| Decisions made silently by agents | all of them | only those below the level of a question |
| Docs left in the project | none (spec stays in the private vault) | 11 module docs, 42 flow files, dependency map, layer plan |
| Commits by the pipeline | 2 of 2 | 0 of 4 (1 by my bad answer, 3 by pipeline bugs) |

The two arms made different, equally valid choices. For example, the baseline blocks `DELETE` on archived projects, while System Docs allows it. The difference is that the System Docs user chose; the baseline user was never asked.

## Tokens

### Every run

| Run | Arm | Agents | Tokens | Cache reads | Min | Outcome |
|---|---|---|---|---|---|---|
| Build | Baseline | 57 | 4,445,157 | 43.5M | 78 | Committed, 41/41 |
| Change | Baseline | 49 | 3,855,194 | 18.5M | 40 | Committed, 54/54 |
| Plan | System Docs | 15 | 1,166,619 | 7.1M | 5 | 11 modules, 8 layers, 7 questions |
| Build | System Docs | 54 | 4,392,101 | 22.1M | 64 | 41/41; blocked: token in sessionStorage (planner offered a forbidden option) |
| Fix #1 | System Docs | 35 | 2,941,013 | 20.1M | 16 | Wasted: frontend never ran (pipeline bug) |
| Fix #2 | System Docs | 8 | 509,914 | 0.9M | 2 | Gate stopped as designed, 1 question |
| Fix #3 | System Docs | 30 | 2,063,095 | 5.2M | 14 | Fixed (41/41); blocked: bridge false positive (pipeline bug) |
| Change gate | System Docs | 8 | 542,193 | 1.4M | 3 | Gate stopped as designed, 5 questions |
| Change | System Docs | 46 | 3,593,245 | 14.7M | 40 | 54/54; blocked: bridge false positive (pipeline bug) |
| **Total** | | **302** | **23,508,531** | **~133M** | | |

### Like for like

| | Baseline | System Docs |
|---|---|---|
| Intended path (plan + build + change gate + change) | 8.30M | 9.69M (+17%) |
| + phases the blocked runs never reached (estimated: commit and SRE ~0.9M, doc updates ~1.9M) | — | ~12.5M (+50%) |
| Spent on bugs and on correcting the planner's bad option | — | 5.51M |
| Cache reads, build | 43.5M | 22.1M (−49%) |

**Core domain phases** (requirements → bridge), cost-weighted:

| | Baseline | System Docs |
|---|---|---|
| Build | 8.86M | 7.17M (−19%) |
| Change | 6.17M | 6.03M (−2%) |

Most of the build gap is the frontend: 4.97M against 2.67M. With one run per arm, I can't separate that from run-to-run variance.

**Where System Docs' own overhead goes**

| Item | Tokens | Share / note |
|---|---|---|
| Plan | 1.17M | 85% was 11 doc writers |
| Sync, impact analysis and gate | 0.3–0.5M per task | |
| Gate round-trip (stop, then restart) | ~0.5M per stop | The restart repeats init, sync and impact |
| Doc update | ~0.1M per module | |

## Findings

| # | Finding | Kind | Cost in test | Status |
|---|---|---|---|---|
| 1 | Frontend-only tasks never ran the frontend: `orchestrate.js` required `backendOutput` | Pipeline bug | 2.94M wasted | Fixed `91e28fe` |
| 2 | The bridge checked frontend calls only against routes touched this session, so pre-existing routes looked missing | Pipeline bug | Blocked 2 runs | Fixed: now checks `dependencies.md` or the backend source first |
| 3 | The planner offered "sessionStorage" for the auth token, which the frontend bearer-token rule forbids | System Docs design | Blocked the build; 2.57M to correct | Fixed: question generators and the impact analyst read the blocking rules and never offer forbidden options |
| 4 | Doc update re-documented all 11 modules because a blocked session left everything uncommitted | System Docs design | ~1.2M | Fixed: uses the files the domain agents reported |
| 5 | Every agent carries ~60k tokens of fixed context, so one-command steps cost 60–120k each | Structural | Every run | Partly fixed: plan writers batched 3 per agent, cleanup merged; more batching possible |
| 6 | Database, backend, frontend and calls never read `requirementsOutput`; only testing does. The spec reaches them only through task text | Pipeline gap | Unmeasured | **Open**. System Docs works around it with its briefing |
| 7 | Runtime output (requirements specs, database schema notes, ponytail reviews, SRE diagnostics, vault INDEX dates) lands in tracked vault paths | Repo hygiene | n/a | **Open**. Not committed; needs `.gitignore` or relocation |
| 8 | The plan put `tasks-api` and `projects-api` in the same layer, but the built code has `tasks-api` depend on `projects-api`; `index` flagged it after the first doc update | System Docs (working as intended) | n/a | The warning is right; the layer plan should be revised |

## Why the quality was equal, and what would show a difference

The baseline had everything it needed:

- a precise contract
- a small codebase that one agent can read in full
- a strong model
- a change spec whose one-line rule a careful reader can trace through the code

System Docs is aimed at the cases this test didn't cover:

- codebases too large to read per task
- many changes over time, by different people
- manual edits between sessions
- vague requests where the agent would otherwise guess

**Next test:** run a sequence of 5–8 changes on a ~200-file app, mixing in manual edits and two "developers", with vaguer requests. Measure regressions across the whole sequence, rerunning the full hidden suite after every change. Run each arm at least twice to measure variance.

## Recommendations

1. **Rerun the change half** of this test on the fixed version (`91e28fe`). It should now commit end to end, and measure the real doc-update and commit cost instead of the ~12.5M estimate.
2. **Cut gate round-trips.** Ask questions during planning, or batch them so one task stops at most once. Let the restart skip sync and impact when nothing changed: cache the impact result keyed on the task text and the docs commit.
3. **Use cheaper models for doc work.** Doc writers and updaters do transcription-style work, so they could run on a cheaper model; only the architect and the impact analyst need the top model.
4. **Close the pipeline gap (finding 6):** pass the spec and System Docs briefing to every domain workflow as data, not only as task text.
5. **Fix repo hygiene (finding 7)** before teams use the plugin, so runtime output doesn't get committed by accident.
