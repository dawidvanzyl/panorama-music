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
dotnet build src/PanoramaMusic.slnx 2>&1
dotnet format src/PanoramaMusic.slnx --verify-no-changes 2>&1
find src -iname "*Tests*.csproj" -o -iname "*Test*.csproj" | sort -u | while read -r proj; do
  echo "--- Testing: $proj ---"
  dotnet test "$proj" 2>&1
done
```

> If no test projects are found under `src/`, note "No backend test projects
> found" in the report instead of a pass/fail line.

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
- dotnet test: {per-project pass/fail, e.g. "PanoramaMusic.Domain.Tests: 12/12 passed", or "No backend test projects found"}
- npm run lint: {passed/failed}
- npm run format:check: {passed/failed}
- npm run typecheck: {passed/failed}
- npm run build: {passed/failed}
- npm run test / vitest: {passed/failed}
```

A failing check is a ❌ Blocker. Include its raw output (last ~50 lines) in the
report; omit raw output entirely for checks that passed.
