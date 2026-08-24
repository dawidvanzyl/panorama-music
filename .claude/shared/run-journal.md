# Run journal

The durable state of one milestone, from planning through to the merge into
`master`. Written by `plan-milestone`, then by the tech lead and the workers it
delegates to.

Referenced by the agent definitions in `.claude/agents/` and by every skill that
writes to `journal_dir`. Edit it here — never inline a copy back into a skill.

## What it is for

**The journal records intent. GitHub records fact.**

GitHub is authoritative for anything it can represent: whether an issue is closed,
a PR is open, a gate label is present, a bug sub-issue is still outstanding. Never
trust the journal over GitHub on those.

But GitHub cannot represent the state that actually gets lost when a session dies:
which verify cycle is running, which findings were dispositioned and why, what the
first attempt tried before it failed, which question you already answered. That is
what this holds.

Assume the session dies at any moment. On a Pro plan, quota exhaustion mid-story is
the ordinary case, not an edge one — so anything held only in an agent's context is
already lost.

## Location

```
{HOME}/.claude/runs/panorama-music/m{milestone_number}/
```

Resolve `{HOME}` **once**, at `plan-milestone` Step 0, and record the absolute
result in the manifest as `journal_root`. Every later step and every worker uses
that recorded value verbatim.

Two reasons this is not fussiness. `~` and `/tmp` resolve to different places
depending on which tool asks — Write and Edit see one path, Bash another. And a git
worktree resolves any repo-relative path to a different, empty directory. The
journal lives outside the repository so neither applies, and resolving once removes
the remaining ambiguity.

Keyed by **milestone number**, not epic number, because every downstream consumer —
the milestone branch, `close-milestone`, the run loop — thinks in milestones.

## Layout

```
m8/
├── manifest.json              lead-only; the whole routing picture
├── rulings.md                 answered escalations, milestone-wide
├── 00-skeleton.md             decomposition + dependency graph  (planning)
├── it-codes.json              IT codes → criterion → story       (planning)
└── issues/
    └── 03-enrol-student/      one directory per story
        ├── test-intents.json  UC codes + covers_acs              (planning)
        ├── ui.md              Stitch output, frontend only       (planning)
        ├── draft-v1.md        versioned snapshots                (planning)
        ├── final.md           approved issue body                (planning)
        ├── e2e-design.md      frozen scenario design             (qa-design)
        ├── implement-1.md     what was built, and why            (developer)
        ├── verify-1.md        gauntlet cycle report              (verify)
        ├── qa-run-1.md        spec run + triage decisions        (qa-implement)
        ├── review-1.md        review findings                    (reviewer)
        ├── resolve-1.md       comment classifications            (developer)
        └── close-269.md       final AC verification              (close-issue)
```

Story directories are named `{seq}-{slug}` at planning time, when no issue number
exists yet, and are **never renamed**. The manifest maps issue number to directory.
Workers receive `journal_dir` as an absolute path in their brief and never compute
it, so the naming is invisible to everyone but the lead.

## manifest.json

One read gives the lead the entire routing picture. It carries no prose — the prose
lives in the per-story files, and pulling it into the manifest would put it in the
lead's context on every read.

```json
{
  "milestone_number": 8,
  "milestone_title": "M8 — Lessons",
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
      "stage": "review",
      "branch": "feature/269-enrol-student-in-course",
      "pr_number": 271,
      "attempts": { "implement": 2, "verify": 3, "qa": 1, "review": 1 },
      "bugs": [272],
      "last_verdict": "FINDINGS (2)"
    }
  ]
}
```

`stage` is one of: `pending`, `designing`, `implementing`, `testing`, `reviewing`,
`awaiting-owner`, `merged`, `closed`.

It is a record of what the lead last **did**, not a claim about the world. The
world is checked at resume.

## rulings.md

Every escalation the lead or the developer answered, appended, never edited.

```markdown
## R4 — Withdrawal keeps the enrolment row
Asked by: developer, story #269
Question: issue says withdrawal preserves history; API contract implies deletion.
Ruling: keep the row, set `withdrawnAt`. The contract is wrong.
Ruled by: developer (owner)
Applies to: any story touching enrolment lifecycle
```

Milestone-wide, not per-story, because the questions recur across stories — that is
the point of the file. Before escalating anything, the lead reads this; before
answering anything, it checks whether it already has.

This is the file that makes the lead cheaper as a milestone progresses. A ruling
that has to be asked twice cost a round trip through you, and you answered it the
same way both times.

## Write rules

**Only the lead writes `manifest.json` and `rulings.md`.** Workers write inside
their own `journal_dir` and nowhere else. Even with stories running one at a time,
agent lifetimes overlap; two writers on one file is how it gets corrupted.

**Write as you go.** An agent cannot tell when a turn limit or a quota exhaustion is
about to end the session. A report composed in a final turn leaves nothing behind
when that happens, and the work has to be redone from zero — which is the exact
failure this whole arrangement exists to prevent.

**Never delete anything.** `plan-milestone`'s restart renames the directory to
`m{n}.superseded-{k}` rather than removing it. A discarded plan still answered
questions the next attempt will ask.

**Keep it light per story.** Planning earns its seven phases and versioned snapshots
because it runs once. The story loop runs N times per milestone, and the same
ceremony repeated per story is overhead the lead pays for in context. A story needs
a manifest entry, its frozen design, one report per worker invocation, and nothing
else. Adopt planning's discipline, not its volume.

## Resume: replay, then reconcile

On starting or resuming a run, the lead rebuilds its picture in that order.

**1. Replay.** Read `manifest.json` and `rulings.md`. This is what was intended.

**2. Reconcile.** For the story the manifest says is in flight, re-read GitHub and
repair the manifest wherever they disagree:

| Check | Command |
| --- | --- |
| Issue open or closed | `gh issue view {n} --json state` |
| PR exists, state, head SHA | `gh pr view {pr} --json state,headRefOid,baseRefName` |
| Gate labels present | `gh pr view {pr} --json labels` |
| Bug sub-issues still open | `gh issue view {n} --json body` → linked sub-issues |
| CI against the head commit | `gh pr checks {pr}` |

GitHub wins every disagreement. A PR you merged by hand in the browser, an issue you
closed, a label you applied — all of them are facts the journal simply had no way to
learn.

**3. Resume at the last committed step.** Never re-run a stage GitHub shows as
complete. A second `qa-implement` pass on a branch already carrying
`gate: qa-complete` costs a full worker invocation to rediscover what the label
already said.

**Two states deserve suspicion rather than trust:**

- **A gate label older than the head commit.** `gate: owner-approved` is not stripped
  automatically, so an approval given before three rounds of rework no longer
  describes the branch. Compare timestamps before treating it as current.
- **A dirty working tree.** It may hold the previous run's uncommitted work. Read
  the story's `implement-{n}.md` to see how far it got before deciding whether to
  keep or discard — and if that is not conclusive, ask.
