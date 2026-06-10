---

name: plan-milestone
description: >
Load this skill when the user says "plan milestone", "plan-milestone", or "/plan-milestone".
Derives sub-issues for a milestone epic, persists all artifacts to disk, enforces UI enrichment via Stitch,
and creates GitHub issues only after full approval.
license: MIT
compatibility: opencode
metadata:
audience: maintainers
workflow: github-issues
---

# Announcement

> Loaded skill: **plan-milestone**. Starting milestone planning workflow...

---

# Core Principle

This workflow is:

> filesystem-backed, deterministic, artifact-driven

No step relies on in-memory state.

All durable state is stored under:

```
/tmp/milestone-plan-{epic_issue_number}/
```

---

# Execution Contract (NON-NEGOTIABLE)

This system operates as a strict pipeline.

Each step has:

* explicit file inputs
* explicit file outputs
* no reliance on conversational or in-memory state

At no point may a step:

* use unstored intermediate state
* modify outputs from previous steps unless explicitly allowed
* bypass filesystem artifacts

---

# Phase Gate Contract (STRICT)

## Gate 1 → Plan Complete

Step 3 cannot begin until:

* 00-skeleton.md exists
* all Test Intent Maps exist
* UI gating resolved or explicitly excluded

## Gate 2 → UI Resolution Complete

A sub-issue is excluded from Step 3 if:

* ui_blocked = true AND ui_resolved != true

## Gate 3 → Build Lock

Once Step 3 begins:

* Step 2 outputs are immutable
* Test Intent Maps cannot change
* no new sub-issues may be introduced
* UI state cannot be re-evaluated

## Gate 4 → Approval Complete

GitHub creation only occurs if:

* ALL eligible sub-issues are approved

---

# 0) Resume / Initialize

If manifest exists:

* load `/tmp/milestone-plan-{epic}/manifest.json`
* ask: Resume or restart milestone plan?

If restart:

* delete directory
* reinitialize

---

# 1) Read Context (READ ONLY)

Fetch:

* Epic issue (`#{epic_issue_number}`)
* GitHub milestone metadata
* `.github/ISSUE_TEMPLATE/sub-issue.md`
* backend/frontend coding standards

Extract:

* `milestone_tag`

Store into manifest.

---

# 2) Plan Phase (Deterministic Output Generation)

This phase produces ONLY filesystem artifacts.

---

## 2.1 Sub-issue decomposition

Define:

* backend / frontend / infrastructure breakdown
* dependency ordering
* scope boundaries

Output:

```
/tmp/milestone-plan-{epic}/00-skeleton.md
```

This file is the ONLY source of truth for sub-issue structure.

---

## 2.2 Test Intent Map (SOURCE OF TRUTH)

For each sub-issue, create:

```
/tmp/milestone-plan-{epic}/issues/{id}/test-intents.json
```

This is the ONLY definition of behaviour.

It contains:

* UC codes
* GIVEN / WHEN / THEN

Test Intent Maps are IMMUTABLE after Step 2 completes.

---

## 2.3 UI Audit + Stitch Gate

If a sub-issue requires UI:

Generate Page Architecture:

* Screen description
* Component hierarchy (mermaid)
* User interaction flow (sequence diagram)

Then mark:

* ui_blocked = true

If Stitch output is returned:

* store in `/tmp/milestone-plan-{epic}/issues/{id}/ui.md`
* set ui_resolved = true

---

## 2.4 Step 2 Completion Rule (HARD GATE)

Step 2 is COMPLETE ONLY IF:

* 00-skeleton.md exists
* all test-intents.json files exist
* all UI-required issues are either:

  * ui_resolved OR excluded

---

## 2.5 Step 2 Output Restrictions

Step 2 MUST NOT produce:

* GitHub issues
* draft markdown
* acceptance criteria
* G/W/T formatting

ONLY structured filesystem artifacts.

---

# 3) Build Phase (Strict File-Only Rendering)

---

## 3.0 Step 3 Input Contract (CRITICAL)

Step 3 may ONLY use:

* /tmp/milestone-plan-{epic}/00-skeleton.md
* /tmp/milestone-plan-{epic}/issues/*/test-intents.json
* /tmp/milestone-plan-{epic}/issues/*/ui.md
* .github/ISSUE_TEMPLATE/sub-issue.md

NO OTHER INPUTS ARE ALLOWED.

---

## 3.1 Hard Filter (UI Exclusion Rule)

Exclude from Step 3 any sub-issue where:

* ui_blocked = true
* AND ui_resolved != true

These issues are NOT visible to Step 3.

---

## 3.2 Template Authority Rule

All issues MUST be built from:

```
.github/ISSUE_TEMPLATE/sub-issue.md
```

Template is authoritative over all structure.

---

## 3.3 Versioned Issue Model

Each sub-issue stored at:

```
/tmp/milestone-plan-{epic}/issues/{id}/
```

Versions:

* draft-v1.md
* draft-v2.md
* final.md
* meta.json

Each version is a FULL snapshot.

---

## 3.4 Approval Loop

### APPROVE

* promote to final.md
* mark approved in manifest

### MODIFY

* generate new full snapshot version
* store as draft-vN.md
* re-present full issue

### CLARIFY

* ask one question
* no file changes

---

## 3.5 Step 3 Completion Rule

Step 3 is complete only when:

* all eligible issues have final.md

---

# 4) GitHub Creation Phase

Only after ALL approved:

* create issues via `gh issue create`
* store issue number + URL in manifest

---

# 5) Linking Phase (Robust Mode)

For each issue:

Attempt GraphQL:

* addSubIssue

Fallback:

* comment-based epic linking list

---

# 6) Epic AWA Safe Patch

---

## 6.1 Locate AWA block

```
/<!-- AWA_START -->(.*?)<!-- AWA_END -->/
```

---

## 6.2 Rules

* modify only inside markers
* idempotent inserts
* no reordering
* no deletions

---

## 6.3 Entry format

```
- [ ] [{milestone_tag}] Title (#{number})
```

---

## 6.4 Missing block

Append:

```
## Anticipated Work Areas

<!-- AWA_START -->
<!-- AWA_END -->
```

---

## 6.5 Atomic update

Single:

```
gh issue edit
```

---

# 7) Cleanup (Optional)

If enabled:

* delete `/tmp/milestone-plan-{epic}/`

---

# 8) Final Output

Return:

* total issues created
* issue list (number + URL)
* epic update confirmation
* manifest path