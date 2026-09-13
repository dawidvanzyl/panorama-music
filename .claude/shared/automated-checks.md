# Shared automated checks

Used by `review-pull-request` and `verify-implementation`. Edit it here and never
inline a copy into either skill, or the two will drift.

Run every check for the scopes in the diff: anything under `src/` is backend, anything
under `frontend/` is frontend. Record pass or fail for each check. Don't install
dependencies or tooling; if a command is unavailable, skip it and note that in the
report.

Run each command on its own, with no shell loops, pipes or `2>&1`. A compound command
matches no permission rule, so under an agent it stops on a prompt. In PowerShell,
redirecting a native command's stderr turns every line into an error record and
reports failure even when the exit code is 0. Standard error is already captured.

## Backend

These are the same three commands `ci.yml` runs, so a local pass means what a CI pass
means:

```bash
dotnet build src/PanoramaMusic.slnx
dotnet format src/PanoramaMusic.slnx --verify-no-changes
dotnet test src/PanoramaMusic.slnx
```

`dotnet test` on the solution already reports results per project. If it ran nothing,
report "No backend test projects found" instead of pass or fail.

## Frontend

Check `frontend/package.json` and run each of these scripts that exists: `lint`,
`format:check`, `typecheck`, `build` and `test`. If there's no `test` script, try
`npx vitest run --reporter=verbose` instead. If nothing at all is configured, report
"No frontend checks configured".

## Report

List the results under **Automated checks:**, omitting lines for checks that didn't
apply:

```markdown
**Automated checks:**
- dotnet build: {passed/failed}
- dotnet format: {passed/failed}
- dotnet test: {overall pass/fail, with the per-project counts dotnet reports, e.g. "PanoramaMusic.Domain.Tests: 12/12", or "No backend test projects found"}
- npm run lint: {passed/failed}
- npm run format:check: {passed/failed}
- npm run typecheck: {passed/failed}
- npm run build: {passed/failed}
- npm run test / vitest: {passed/failed}
```

A failing check is a ❌ Blocker. Include the last ~50 lines of its output, and none for
checks that passed.
