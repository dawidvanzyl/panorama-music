<#
.SYNOPSIS
  Agent-scoped PreToolUse guard: denies file writes outside a role's remit.

.DESCRIPTION
  Registered from an agent definition's `hooks` frontmatter, never from
  .claude/settings.json. That distinction is the whole point: permissions.deny is
  session-global, so a global rule blocking e2e writes would also block qa-implement
  from writing the specs it exists to produce. Scoping the hook to one agent lets
  each role have a different forbidden set.

  Denies outright rather than asking. Unlike destructive git - which you do perform
  interactively - a role writing outside its remit is never correct, and the denial
  message tells the agent to escalate, which is the designed path.

.PARAMETER Role
  Name of the agent, used in the denial message so an escalation says who was stopped.

.PARAMETER Deny
  Semicolon-separated repo-relative globs, e.g. "src/*;frontend/*". PowerShell -like
  wildcards, where * spans directory separators, so "src/*" covers src/a/b/c.cs.

.NOTES
  Covers Edit, Write and NotebookEdit by inspecting the path in tool_input. A shell
  redirect could still write the file; that is a known gap, accepted because the
  failure mode being guarded is an agent taking the easy path, not one evading a
  control deliberately.
#>

param(
    [Parameter(Mandatory = $true)] [string] $Role,
    [Parameter(Mandatory = $true)] [string] $Deny
)

$ErrorActionPreference = 'Stop'

try {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }
    $payload = $raw | ConvertFrom-Json
} catch {
    exit 0
}

$target = $payload.tool_input.file_path
if ([string]::IsNullOrWhiteSpace($target)) { $target = $payload.tool_input.notebook_path }
if ([string]::IsNullOrWhiteSpace($target)) { exit 0 }

# Normalise to a repo-relative, forward-slash path so the globs stay readable.
$root = $payload.cwd
if ([string]::IsNullOrWhiteSpace($root)) { $root = (Get-Location).Path }

$full = $target -replace '\\', '/'
$root = ($root -replace '\\', '/').TrimEnd('/')

if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    $rel = $full.Substring($root.Length).TrimStart('/')
} else {
    # Outside the project entirely - the run journal lives there. Always allowed.
    exit 0
}

$patterns = $Deny.Split(';') | Where-Object { $_ -ne '' }

foreach ($pattern in $patterns) {
    if ($rel -like $pattern) {
        $out = [ordered]@{
            hookSpecificOutput = [ordered]@{
                hookEventName            = 'PreToolUse'
                permissionDecision       = 'deny'
                permissionDecisionReason =
                    "The '$Role' role may not write to '$rel' (matches '$pattern'). " +
                    "This is a role boundary, not a permission gap - do not retry, " +
                    "and do not work around it with a shell command. If the change is " +
                    "genuinely required, escalate to the tech lead and explain why."
            }
        }

        $out | ConvertTo-Json -Depth 5 -Compress
        exit 0
    }
}

exit 0
