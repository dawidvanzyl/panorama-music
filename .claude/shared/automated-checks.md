# Shared automated checks

Referenced by the `review-issue` and `verify-implementation` skills. Both read
this file at the point their procedure says to. Edit it here — never inline a
copy back into a skill, or the two will drift.

Run **all** checks applicable to the scopes detected in the diff (`src/` →
backend, `frontend/` → frontend). Record pass/fail per check and capture the
output for the report.

Do not install dependencies or tooling. If a command is unavailable, skip
gracefully and note it in the report rather than working around it.

## Backend checks

Run when `src/` is changed:

```bash
dotnet build src/PanoramaMusic.slnx
dotnet format src/PanoramaMusic.slnx --verify-no-changes
dotnet test src/PanoramaMusic.slnx
```

> These are the same three commands `.github/workflows/ci.yml` runs, so a local
> pass means the same thing CI will mean.

Run them as three separate commands. Do not wrap the test run in a shell loop over
discovered `.csproj` files: `dotnet test` on the solution already reports per-project
results, and a piped compound command matches no permission rule — so under an agent
it stops the run on a prompt that a plain command would never raise.

Do not add `2>&1`. Standard error is already captured, and redirecting a native
command's stderr inside PowerShell wraps each line in an error record and reports
failure even on a zero exit code.

> If the solution contains no test projects, `dotnet test` reports that it ran
> nothing — note "No backend test projects found" in the report instead of a
> pass/fail line.

## Frontend checks

Run when `frontend/` is changed:

- Read `frontend/package.json` to discover available scripts.
- Run each of these that exists:
  - `npm run lint`
  - `npm run format:check`
  - `npm run typecheck`
  - `npm run build`
- If a `test` script exists, run:

```bash
npm run test
```

- Otherwise attempt:

```bash
npx vitest run --reporter=verbose 2>&1
```

- If Vitest is not configured, not installed, or the command is unavailable,
  skip gracefully and note it in the report.

If none of the frontend checks produce meaningful output (e.g. no scripts
defined), note:

> No frontend checks configured

in the report.

## Report summary lines

Emit under **Automated checks:** in the report. Omit lines for checks that did
not apply to the detected scopes.

```markdown
**Automated checks:**
- dotnet build: {passed/failed}
- dotnet format: {passed/failed}
- dotnet test: {overall pass/fail, with the per-project counts dotnet reports, e.g. "PanoramaMusic.Domain.Tests: 12/12, PanoramaMusic.Application.Tests: 30/30", or "No backend test projects found"}
- npm run lint: {passed/failed}
- npm run format:check: {passed/failed}
- npm run typecheck: {passed/failed}
- npm run build: {passed/failed}
- npm run test / vitest: {passed/failed}
```

A failing check is a ❌ Blocker. Include its raw output (last ~50 lines) in the
report; omit raw output entirely for checks that passed.
