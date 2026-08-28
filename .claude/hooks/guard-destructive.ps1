<#
.SYNOPSIS
  PreToolUse guard: forces a confirmation prompt for destructive git/gh commands.

.DESCRIPTION
  The project allowlist grants Bash(git:*) and Bash(gh:*) so unattended agents do
  not stall on ordinary version-control work. That grant is deliberately broad, so
  this hook narrows it back: any command matching a destructive pattern is returned
  as `ask`, which re-imposes a human confirmation even though the allowlist would
  otherwise let it through.

  `ask` rather than `deny` on purpose. Interactive workflows legitimately delete
  branches (prepare-base) and a hard deny would break them. Agents get the same
  prompt, which under autonomy surfaces as an escalation.

  Bash permission rules are prefix patterns and cannot catch a flag that appears
  later in the command line, which is why this is a hook and not a deny rule.

.NOTES
  stdin  : PreToolUse JSON payload
  stdout : hookSpecificOutput JSON when a rule matches; nothing otherwise
  exit   : always 0 - the decision travels in the JSON, not the exit code
#>

$ErrorActionPreference = 'Stop'

try {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }
    $payload = $raw | ConvertFrom-Json
} catch {
    # An unparseable payload must not block the session.
    exit 0
}

# Both tools can shell out, so this hook is registered for each.
$command = $payload.tool_input.command
if ([string]::IsNullOrWhiteSpace($command)) { exit 0 }

$c = ($command -replace '\s+', ' ').Trim()

# Patterns are deliberately broad. A false positive costs one prompt; a false
# negative costs a force-pushed branch.
$rules = @(
    @{ Pattern = '(?i)\bgit\b.*\bpush\b.*(\s--force(-with-lease)?\b|\s-f\b)'; Reason = 'force push' }
    @{ Pattern = '(?i)\bgit\b.*\breset\b.*\s--hard\b';                        Reason = 'hard reset' }
    @{ Pattern = '(?i)\bgit\b.*\bbranch\b.*\s-(D|d)\b';                       Reason = 'local branch deletion' }
    @{ Pattern = '(?i)\bgit\b.*\bbranch\b.*\s--delete\b';                     Reason = 'local branch deletion' }
    @{ Pattern = '(?i)\bgit\b.*\bpush\b.*\s--delete\b';                       Reason = 'remote branch deletion' }
    @{ Pattern = '(?i)\bgit\b.*\bpush\b.*\s:\S';                              Reason = 'remote ref deletion' }
    @{ Pattern = '(?i)\bgit\b.*\bclean\b.*\s-\w*f';                           Reason = 'working tree clean' }
    @{ Pattern = '(?i)\bgit\b.*\btag\b.*(\s-d\b|\s--delete\b)';               Reason = 'tag deletion' }
    @{ Pattern = '(?i)\bgit\b.*\bworktree\b.*\bremove\b.*\s--force\b';        Reason = 'forced worktree removal' }
    @{ Pattern = '(?i)\bgh\b.*\brepo\b.*\bdelete\b';                          Reason = 'repository deletion' }
)

foreach ($rule in $rules) {
    if ($c -match $rule.Pattern) {

        # agent_type is present only for subagents. A background worker has nobody
        # watching it, and under auto mode there is no interactive turn for an `ask`
        # to land in - so deny outright and route it through the escalation path the
        # pipeline already has. The main session is a person who can answer, so it
        # gets the prompt instead.
        if ($payload.agent_type) {
            $decision = 'deny'
            $reason =
                "The '$($payload.agent_type)' role attempted a $($rule.Reason), which " +
                "no worker role may perform unattended. Do not retry and do not " +
                "rephrase the command. Escalate to the tech lead, stating what you " +
                "were trying to achieve. Command: $c"
        }
        else {
            $decision = 'ask'
            $reason =
                "This is a $($rule.Reason). Destructive version-control operations " +
                "always require explicit confirmation, even though the allowlist " +
                "permits git/gh generally. Command: $c"
        }

        $out = [ordered]@{
            hookSpecificOutput = [ordered]@{
                hookEventName            = 'PreToolUse'
                permissionDecision       = $decision
                permissionDecisionReason = $reason
            }
        }

        $out | ConvertTo-Json -Depth 5 -Compress
        exit 0
    }
}

exit 0
