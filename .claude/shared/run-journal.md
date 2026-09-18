# Run journal

The durable state of one milestone, from planning to the merge into `master`.
`plan-milestone` writes it first, then the tech lead and its workers. The agent
definitions and every skill that writes to `journal_dir` refer to this file, so edit
it here and never inline a copy.

**The journal records intent. GitHub records fact.** GitHub is authoritative for
anything it can represent: issue state, PRs, gate labels and open bug sub-issues. The
journal holds what GitHub can't: which verify cycle is running, how each finding was
dispositioned and why, what a failed attempt tried, and which questions have already
been answered. Assume a session can die at any moment; on a Pro plan, running out of
quota mid-story is the ordinary case. Anything held only in an agent's context is
already lost.

## Location

```
{HOME}/.claude/runs/panorama-music/m{milestone_number}/
```

Resolve `{HOME}` once, at `plan-milestone` step 0, and record the absolute path in the
manifest as `journal_root`; everyone uses that value verbatim afterwards. `~` and
`/tmp` resolve differently per tool (Write/Edit vs Bash), and a git worktree resolves
repo-relative paths to an empty directory. Keeping the journal outside the repo and
resolving the path once avoids both problems. It's keyed by milestone rather than
epic, because every downstream consumer thinks in milestones.

## Layout

```
m8/
├── manifest.json              lead-only; the whole routing picture
├── rulings.md                 answered escalations, milestone-wide
├── retrospective.md           Good/Improve/Stop, milestone end     (lead)
├── process-improvements.md    proposed MD changes, owner-gated      (lead)
├── 00-skeleton.md             decomposition + dependency graph  (planning)
├── it-codes.json              IT codes → criterion → story       (planning)
└── issues/
    └── 03-enrol-student/      one directory per story
        ├── test-intents.json  UC codes + covers_acs              (planning)
        ├── ui.md              .design/ refs + Page Arch, frontend (planning)
        ├── draft-v1.md        versioned snapshots                (planning)
        ├── final.md           approved issue body                (planning)
        ├── plan-dev.md        frozen development plan            (planner)
        ├── plan-qa.md         frozen QA plan                     (planner)
        ├── plan-open-issues.md critique objections, owner-gated  (plan-critique)
        ├── implement-1.md     what was built, and why            (developer)
        ├── verify-1.md        gauntlet cycle report              (developer, inline)
        ├── qa-run-1.md        spec run + triage decisions        (qa-implement)
        ├── review-1.md        review findings                    (reviewer)
        ├── resolve-1.md       comment classifications            (developer)
        └── close-269.md       final AC verification              (close-issue)
```

Story directories are named `{seq}-{slug}` at planning time, before any issue number
exists, and are never renamed. The manifest maps each issue number to its directory.
Workers receive `journal_dir` as an absolute path and never compute it themselves.

## manifest.json

One read gives the lead the whole routing picture. It holds no prose; prose lives in
the per-story files, so it doesn't land in the lead's context on every read.

```json
{
  "milestone_number": 8,
  "milestone_title": "M{n} — {name}",
  "epic_issue_number": 280,
  "journal_root": "C:/Users/dawid/.claude/runs/panorama-music/m8",
  "milestone_branch": "milestone/m8",
  "planning_complete": true,
  "stories": [
    {
      "dir": "03-enrol-student",
      "issue_number": 269,
      "title": "[Feature] Enrol a student in a course",
      "depends_on": [268],
      "it_codes": ["280IT4", "280IT5"],
      "stage": "reviewing",
      "plans_approved": true,
      "plan_auto_approved": false,
      "branch": "feature/269-enrol-student-in-course",
      "pr_number": 271,
      "attempts": { "critique": 2, "implement": 2, "verify": 3, "qa": 1, "review": 1 },
      "bugs": [272],
      "last_verdict": "FINDINGS (2)"
    }
  ]
}
```

`stage` is one of `pending`, `planning`, `critiquing`, `awaiting-plan-approval`,
`implementing`, `testing`, `reviewing`, `merged` or `closed`. It records what the lead
last **did**; it is not a claim about the world. `plans_approved` gates implementing;
`plan_auto_approved` records whether the owner was consulted (false = owner approved,
true = auto-approved on no open Blockers in `plan-open-issues.md`) for post-hoc
spot-check.
`attempts` supplies each worker's `cycle` number: the reviewer's `cycle` is
`attempts.review`, and `attempts.critique` counts the plan-critique turns (max 2).

## rulings.md

Every answered escalation is appended here and never edited:

```markdown
## R{n} — {one-line summary}
Asked by: {role}, story #{issue}
Question: {as asked}
Ruling: {the decision}
Ruled by: {tech lead | developer (owner)}
Applies to: {this story, or any story touching X}
```

It's milestone-wide because questions recur across stories. The lead checks it before
escalating or answering anything, which is what makes the lead cheaper as a milestone
goes on.

## Write rules

- **Only the lead writes `manifest.json` and `rulings.md`.** Workers write only
  inside their own `journal_dir`. Agent lifetimes overlap, and two writers on one
  file corrupt it.
- **Write as you go.** No agent can see a turn or quota limit coming. A report
  composed in the final turn leaves nothing behind, and the work is redone from zero.
- **Never delete anything.** A restart renames the directory to
  `m{n}.superseded-{k}`, because a discarded plan still answered questions the next
  attempt will ask.
- **Keep stories light.** Planning earns its ceremony because it runs once. A story
  needs only a manifest entry, its frozen design, and one report per worker
  invocation.

## Resume: replay, then reconcile

1. **Replay.** Read `manifest.json` and `rulings.md` to see what was intended.
2. **Reconcile.** For the in-flight story, re-read GitHub and repair the manifest.
   GitHub wins every disagreement: a PR merged or a label applied by hand is a fact
   the journal had no way to learn.

   | Check | Command |
   | --- | --- |
   | Issue state | `gh issue view {n} --json state` |
   | PR state, head SHA, base | `gh pr view {pr} --json state,headRefOid,baseRefName` |
   | Gate labels | `gh pr view {pr} --json labels` |
   | Open bug sub-issues | `gh issue view {n} --json body` → linked sub-issues |
   | CI on the head commit | `gh pr checks {pr}` |
3. **Resume at the last committed step.** Never re-run a stage that GitHub shows as
   complete.

Two states call for suspicion rather than trust:

- **`stage` past `awaiting-plan-approval` but `plans_approved` not `true`.** The plan
  gate was skipped — a story must not reach `implementing` without it. Re-run the gate
  (step 3a) before trusting the stage.
- **A dirty working tree.** It may hold the previous run's unfinished work. Read the
  story's latest `implement-{n}.md` to see how far it got, and if that doesn't settle
  it, ask before keeping or discarding anything.
