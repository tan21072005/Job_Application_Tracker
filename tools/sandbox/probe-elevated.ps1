param(
  [switch]$Uninstall,
  [string]$Repo = 'D:\Project\Job_Application_Tracker',
  [string]$CanaryRoot = "$env:TEMP\jobtrack-sandbox-canary"
)

$ErrorActionPreference = 'Stop'

function Write-Stage([string]$text) {
  Write-Host ""
  Write-Host "=== $text ===" -ForegroundColor Cyan
}

function Invoke-Capture([string]$file, [string[]]$argv) {
  $out = & $file @argv 2>&1 | Out-String
  return $out
}

function Get-DoctorJson {
  $raw = Invoke-Capture 'node' @('tools/agent-control/cli.mjs', 'doctor')
  $start = $raw.IndexOf('{')
  $end = $raw.LastIndexOf('}')
  if ($start -lt 0 -or $end -lt 0) {
    return [pscustomobject]@{ parseError = 'doctor output was not JSON'; raw = $raw.Trim() }
  }
  try {
    return $raw.Substring($start, $end - $start + 1) | ConvertFrom-Json
  } catch {
    return [pscustomobject]@{ parseError = $_.Exception.Message; raw = $raw.Trim() }
  }
}

function Invoke-Canary([string]$profile) {
  $env:JT_CANARY_ROOT = $CanaryRoot
  $env:JT_SANDBOX_PROFILE = $profile
  $raw = Invoke-Capture 'codex' @('sandbox', '--permission-profile', $profile, '-C', $Repo, '--', 'node', 'tools/sandbox/canary.mjs', $Repo)
  $start = $raw.IndexOf('{')
  $end = $raw.LastIndexOf('}')
  if ($start -lt 0 -or $end -lt 0) {
    return [pscustomobject]@{ profile = $profile; parseError = 'canary produced no JSON'; raw = $raw.Trim() }
  }
  try {
    $parsed = $raw.Substring($start, $end - $start + 1) | ConvertFrom-Json
    $parsed | Add-Member -NotePropertyName profile -NotePropertyValue $profile -Force
    return $parsed
  } catch {
    return [pscustomobject]@{ profile = $profile; parseError = $_.Exception.Message; raw = $raw.Trim() }
  }
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Stage "ELEVATION"
Write-Host "user          : $($identity.Name)"
Write-Host "isAdmin       : $isAdmin"
Write-Host "repository     : $Repo"
Write-Host "canary root    : $CanaryRoot"

if (-not $isAdmin) {
  Write-Host ""
  Write-Host "NOT ELEVATED. This script needs Administrator." -ForegroundColor Red
  Write-Host "Close this window, right-click PowerShell > Run as administrator, then:"
  Write-Host "  cd '$Repo'"
  Write-Host "  .\tools\sandbox\probe-elevated.ps1 -Uninstall"
  exit 1
}

Write-Stage "CANARY FIXTURES (fake data only)"
New-Item -ItemType Directory -Force -Path (Join-Path $CanaryRoot 'outside') | Out-Null
Set-Content -Path (Join-Path $CanaryRoot 'outside\read-probe.txt') -Value 'jobtrack-sandbox-canary-fake-marker-do-not-use' -NoNewline
Write-Host "created $CanaryRoot\outside\read-probe.txt (fake marker)"

Write-Stage "PROBE 1 - doctor (before)"
$before = Get-DoctorJson
$before | ConvertTo-Json -Depth 6 | Write-Host
$beforeExit = $before.sandbox.code
Write-Host "sandbox.code = $beforeExit"

Write-Stage "PROBE 2 - sandbox uninstall"
if ($beforeExit -eq 0) {
  Write-Host "sandbox already healthy; uninstall skipped"
} elseif ($Uninstall) {
  Write-Host "running: codex sandbox uninstall"
  $uninstallOutput = Invoke-Capture 'codex' @('sandbox', 'uninstall')
  Write-Host $uninstallOutput.Trim()
  Write-Host "re-probing after uninstall"
  Start-Sleep -Seconds 3
} else {
  Write-Host "sandbox FAILED and -Uninstall was not supplied." -ForegroundColor Yellow
  Write-Host "re-run with -Uninstall to remove machine-wide sandbox accounts and network rules, then probe again."
}

Write-Stage "PROBE 3 - doctor (after)"
$after = Get-DoctorJson
$after | ConvertTo-Json -Depth 6 | Write-Host
$afterExit = $after.sandbox.code
Write-Host "sandbox.code = $afterExit"

Write-Stage "PROBE 4 - canary :read-only"
$readOnly = Invoke-Canary ':read-only'
$readOnly | ConvertTo-Json -Depth 6 | Write-Host

Write-Stage "PROBE 5 - canary :workspace"
$workspaceProfile = Invoke-Canary ':workspace'
$workspaceProfile | ConvertTo-Json -Depth 6 | Write-Host

Write-Stage "EVIDENCE"
$evidence = [ordered]@{
  capturedAt = (Get-Date).ToUniversalTime().ToString('o')
  host = [ordered]@{
    user = $identity.Name
    isElevated = $isAdmin
    os = [Environment]::OSVersion.VersionString
    node = (& node --version)
    codex = (& codex --version)
  }
  repo = $Repo
  canaryRoot = $CanaryRoot
  note = 'Fake canary data only. No real secret, credential, production DB or sibling worktree was read.'
  before = $before
  after = $after
  canaries = @($readOnly, $workspaceProfile)
  verdict = [ordered]@{
    sandboxProbePass = ($afterExit -eq 0)
    liveWorkersVerified = $false
    readyForLiveDispatch = ($afterExit -eq 0)
  }
}
$evidencePath = Join-Path $Repo 'planning\jobtrack-agent-autonomy\CANARY-EVIDENCE.json'
$evidence | ConvertTo-Json -Depth 12 | Set-Content -Path $evidencePath -Encoding utf8
Write-Host "wrote $evidencePath"

Write-Stage "SUMMARY"
Write-Host "sandbox probe pass : $($afterExit -eq 0)"
Write-Host "ready for dispatch : $($afterExit -eq 0)"
if ($afterExit -ne 0) {
  Write-Host "STILL BLOCKED. Do not enable live dispatch. Keep fail-closed." -ForegroundColor Red
  Write-Host "Next: capture the raw error and review tools/agent-control/README.md sandbox section."
  exit 2
}
Write-Host "Gate G-A still needs per-restriction denial evidence above (write outside / write inside / read outside / egress / child cleanup)."
exit 0
