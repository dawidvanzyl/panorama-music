---
name: Tech Debt
about: Standalone remediation brief for identified tech debt (no epic parent)
title: '[Tech Debt] Short descriptive title'
labels: 'type: tech-debt'
assignees: dawidvanzyl
---

## Overview

One paragraph. What is wrong today, and what this issue changes it to. Written for someone who
has never seen the offending code.

---

## Origin

> Tech debt tickets rarely hang off a milestone epic. This section replaces "Epic Reference" —
> it records where the debt was spotted instead of which epic it delivers.

- Milestone: N/A — tech debt (surfaced during #issue / M?.? work)
- Work Areas:
  - [ ] Concrete remediation step
  - [ ] Concrete remediation step
- Discovered in: #issue or PR link — one line on how it was found (review comment, incident, audit)

---

## Motivation & Risk

> Tech debt competes with feature work for priority — make the cost of *not* doing this explicit.

- **Why it exists:** e.g. shipped as a shortcut under M1 deadline pressure; pre-dates the pattern established in #issue
- **Cost of leaving it:** e.g. blocks X follow-on work; silent correctness risk under Y condition; N+1 query pattern that will degrade at Z scale
- **Why now:** e.g. next milestone builds directly on this code; low-risk isolated change available now

---

## Context & Constraints

> What the agent needs to know before writing a single line — prior decisions, patterns already
> established, things that must not change.

- **Current implementation:** e.g. `SmtpEmailService` builds AND sends; only consumer is `RequestPasswordResetHandler`
- **Existing patterns to follow:** e.g. all service classes use X pattern; auth is handled via Y middleware
- **Known constraints:** e.g. public method signatures/behaviour must not change; must remain backwards-compatible with M1 contract
- **Related issues:** Depends on #issue / Supersedes decision from #issue

---

## Functional Requirements

What must be true after this change, written as observable behaviours — not file names or
function signatures. Behaviour visible to callers/users must be unchanged unless stated otherwise.

- The system must…
- `X` must continue to behave identically from the caller's perspective…

---

## API / Interface Contract

> Only include if the change touches a boundary (interface, endpoint, event contract). Omit
> entirely for internal-only refactors.

**Component boundaries:**
- `IInterface.Method(...)` — unchanged signature / new signature and why

---

## Acceptance Criteria (G/W/T)

> Codes are issue-scoped: `{issue_number}UC{n}` for unit tests, `{issue_number}IT{n}` for E2E
> (e.g. issue #48 → `48UC1`, `48IT1`). Not derived from any milestone.

### Backend

- [ ] `[UC_CODE]` GIVEN … WHEN … THEN …

### Frontend

- [ ] `[UC_CODE]` GIVEN … WHEN … THEN …

### E2E

> Only for criteria that don't decompose into backend-only or frontend-only behaviour. Codes here
> are IT codes (not UC codes) — one IT code per spec file/`test.describe` block, repeated across
> every G/W/T line that spec covers — verified via the Playwright E2E suite instead of the unit-test
> runners.

- [ ] `[IT_CODE]` GIVEN … WHEN … THEN …

---

## Out of Scope

Explicitly what this remediation does **not** cover, to prevent scope creep during implementation.

- Deferred to: #issue or future milestone
