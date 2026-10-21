# Offline tuning runbook

Phase C of [design/lesson-library.md](../../design/lesson-library.md). This is for maintainers only and never runs inside a user's task.

One round tests two candidate edits to the skill's checklists against the reference, on the A/B task in [TASK.md](TASK.md):
- Each candidate runs on its own copy of the skill.
- Every arm is scored with the hidden suite ([acceptance.mjs](acceptance.mjs)) and its token count.
- An edit is kept only if it holds the reference score and costs no more tokens.

It follows Harness²'s Propose → Probe → Compose loop (see [NOTICE.md](../../NOTICE.md)). The difference is that here the hidden suite is a real pass/fail check.

**Cost:** three full pipeline runs, about 2.5M tokens each, so roughly 5–7M per round. Set the budget in `prepare` and stop when `score` warns that it is exceeded. The reference run doubles as the A/B measurement of the current skill.

## Answer-key guard

- **No hidden suite in any arm.** Each arm's skill copy is a git worktree with `tests/ab/` removed, so no pipeline agent can find the suite.
- **Only counts stay in the run folder.** `score` moves the per-check results out of it (to the OS temp dir, printed for you) and keeps pass counts only.
- **The proposer sees evidence only.** It reads `evidence.json`: the reference run's reviewer, bridge and scan catches, SRE notes, and tokens per agent. No scores, check names or results ever reach it.

## Steps

`R` is a run folder **outside** the repo, for example `C:/tune/2026-10-21`. Commands run from the repo root.

1. **Prepare.**

   ```
   node tests/ab/tune.mjs prepare R --budget 7000000
   ```

   It creates `R/skill-{ref,inv,dom}`, `R/projects/{ref,inv,dom}/app` (empty git repos, each inside its own folder because pipeline agents use the folder above a project as scratch space) and `R/args-{ref,inv,dom}.json`. Each args file already holds the arm's session, so no agent is spent creating one.

2. **Reference run.** First make the run folder part of the session. The Workflow tool, and every `workflow()` call inside a script, only loads scripts from the session's folders.
   - In the desktop app, request access to `R`.
   - Use the path **exactly** as the grant spells it, including letter case, in `scriptPath` and in the args' `agentsDir` and `projectPath`.

   Then run the orchestrator with the reference args, from the reference skill copy:

   ```
   Workflow({ scriptPath: "R/skill-ref/.claude/workflows/orchestrate.js", args: <contents of R/args-ref.json> })
   ```

   When it finishes, record its bookkeeping in that arm's own databases: `node R/skill-ref/shared/lib/persist.js "<output file>"`. Then score it with the workflow's reported total tokens and agent count:

   ```
   node tests/ab/tune.mjs score R ref --tokens <subagent_tokens> --agents <agent_count>
   ```

3. **Evidence.** Build the proposer's only input:

   ```
   node tests/ab/tune.mjs evidence R "<ref output file>" "<ref transcript dir>"
   ```

4. **Propose.** This is one agent. `proposalsDir` is optional: point it at a real install's `agents/orchestrator/vault/proposals` to include curator proposals.

   ```
   Workflow({ scriptPath: "<repo>/tests/ab/tune-propose.js", args: { runDir: "R", skillDir: "R/skill-ref", proposalsDir: "" } })
   ```

   Then load its output:

   ```
   node tests/ab/tune.mjs load-edits R "<proposer output file>"
   ```

   This step validates each edit:
   - The only editable files are `agents/<domain>/CLAUDE.md` and that domain's workflow. Never `orchestrate.js` or `shared/`.
   - The text to replace must occur exactly once.
   - No security, consent or blocking rule wording may be dropped.
   - An edited workflow must still parse, and `verify` must pass in the arm.

   Each edit that passes goes into its own arm (`inv` or `dom`). A rejected edit leaves its arm without a run.

5. **Probe.** Repeat step 2 for `inv` and `dom` (their own args files, skill copies and `persist.js`), and score each arm.

6. **Compose.**

   ```
   node tests/ab/tune.mjs select R
   ```

   It writes `R/RESULT.md` and `R/accepted-edits.json`. The default tolerance is +5% tokens for run-to-run noise; change it with `--tolerance`.

   One run per arm is noisy. Before adopting, consider a confirm run: `adopt` the edits into a fresh `prepare`'s ref arm and run steps 2 and 6 once more.

7. **Adopt** (optional).

   ```
   node tests/ab/tune.mjs adopt R <repo checkout on a new branch>
   ```

   Then run `npm run init && npm test`, review the diff, and open a pull request with `RESULT.md` in its description. Nothing is applied to the skill any other way.

8. **Clean.**

   ```
   node tests/ab/tune.mjs clean R
   ```

   This removes the worktrees. The run folder stays for the record; delete it yourself.

`node tests/ab/tune.mjs status R` shows the arms, their scores and the budget at any point.
