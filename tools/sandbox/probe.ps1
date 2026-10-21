param(
  [string]$Repo = 'D:\Project\Job_Application_Tracker',
  [string]$CanaryRoot = "$env:TEMP\jobtrack-sandbox-canary",
  [string]$CodexCliPath = $env:CODEX_CLI_PATH
)

$ErrorActionPreference = 'Stop'

function Write-Stage([string]$text) {
  Write-Host ""
  Write-Host "=== $text ===" -ForegroundColor Cyan
}

function Invoke-Capture([string]$file, [string[]]$argv) {
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    return (& $file @argv 2>&1 | Out-String)
  } finally {
    $ErrorActionPreference = $previous
  }
}

function Convert-JsonBlock([string]$raw) {
  $start = $raw.IndexOf('{')
  $end = $raw.LastIndexOf('}')
  if ($start -lt 0 -or $end -lt 0) { return $null }
  try { return $raw.Substring($start, $end - $start + 1) | ConvertFrom-Json } catch { return $null }
}

function Resolve-CodexCli([string]$explicit) {
  if ($explicit) {
    if (-not (Test-Path $explicit)) { throw "CODEX_CLI_PATH does not exist: $explicit" }
    return (Resolve-Path $explicit).Path
  }
  $candidates = @()
  $binRoot = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin'
  if (Test-Path $binRoot) {
    $candidates += Get-ChildItem $binRoot -Recurse -Filter 'codex.exe' -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending | Select-Object -ExpandProperty FullName
  }
  if ($candidates.Count -eq 0) { throw 'No app-provided codex.exe found. Set CODEX_CLI_PATH explicitly.' }
  return $candidates[0]
}

function Invoke-Canary([string]$cli, [string]$profile) {
  $env:JT_CANARY_ROOT = $CanaryRoot
  $env:JT_SANDBOX_PROFILE = $profile
  $raw = Invoke-Capture $cli @('sandbox', '--permission-profile', $profile, '-C', $Repo, '--', 'node', 'tools/sandbox/canary.mjs', $Repo)
  $parsed = Convert-JsonBlock $raw
  if ($null -eq $parsed) { return [pscustomobject]@{ profile = $profile; parseError = 'canary produced no JSON'; raw = $raw.Trim() } }
  $parsed | Add-Member -NotePropertyName profile -NotePropertyValue $profile -Force
  return $parsed
}

$cli = Resolve-CodexCli $CodexCliPath
Write-Stage "ENVIRONMENT"
Write-Host "repository        : $Repo"
Write-Host "canary root       : $CanaryRoot"
Write-Host "codex cli         : $cli"
Write-Host "codex version     : $((Invoke-Capture $cli @('--version')).Trim())"
Write-Host "elevated          : $((New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))"

Write-Stage "PATH CLI COMPARISON"
$pathCli = (Get-Command codex -ErrorAction SilentlyContinue).Source
$pathVersion = ''
$pathProbe = ''
if ($pathCli) {
  $pathVersion = (Invoke-Capture 'codex' @('--version')).Trim()
  $pathProbe = (Invoke-Capture 'codex' @('sandbox', '--permission-profile', ':read-only', '-C', $Repo, '--', 'node', '--version')).Trim()
}
Write-Host "path cli          : $pathCli ($pathVersion)"
Write-Host "path cli probe    : $pathProbe"

Write-Stage "CANARY FIXTURES (fake data only)"
New-Item -ItemType Directory -Force -Path (Join-Path $CanaryRoot 'outside') | Out-Null
Set-Content -Path (Join-Path $CanaryRoot 'outside\read-probe.txt') -Value 'jobtrack-sandbox-canary-fake-marker-do-not-use' -NoNewline
Write-Host "created $CanaryRoot\outside\read-probe.txt (fake marker)"

Write-Stage "DOCTOR (controller probe with selected CLI)"
$env:CODEX_CLI_PATH = $cli
$doctorRaw = Invoke-Capture 'node' @('tools/agent-control/cli.mjs', 'doctor')
$doctor = Convert-JsonBlock $doctorRaw
$doctor | ConvertTo-Json -Depth 6 | Write-Host
$doctorExit = if ($doctor) { $doctor.sandbox.code } else { 1 }

Write-Stage "CANARY :read-only (worker profile)"
$readOnly = Invoke-Canary $cli ':read-only'
$readOnly | ConvertTo-Json -Depth 6 | Write-Host

Write-Stage "CANARY :workspace (check runner profile)"
$workspaceProfile = Invoke-Canary $cli ':workspace'
$workspaceProfile | ConvertTo-Json -Depth 6 | Write-Host

Write-Stage "HOST BASELINE (no sandbox, for comparison)"
$env:JT_SANDBOX_PROFILE = 'host-direct'
$hostRaw = Invoke-Capture 'node' @('tools/sandbox/canary.mjs', $Repo)
$hostBaseline = Convert-JsonBlock $hostRaw

function Get-Check($report, $name) {
  if ($null -eq $report -or $null -eq $report.checks) { return $null }
  return $report.checks.$name
}

$writeDeniedReadOnly = (Get-Check $readOnly 'writeInsideWorkspace').allowed -eq $false
$writeOutsideDeniedReadOnly = (Get-Check $readOnly 'writeOutsideWorkspace').allowed -eq $false
$gitReadable = (Get-Check $readOnly 'gitCommonDirHead').opened -eq $true
$credentialReadable = (Get-Check $readOnly 'credentialFileOpen').opened -eq $true
$accountsReadable = (Get-Check $readOnly 'accountsFileOpen').opened -eq $true
$siblingReadable = (Get-Check $readOnly 'siblingWorktreeList').listed -eq $true
$homeSshDenied = (Get-Check $readOnly 'homeCredentialList').listed -eq $false
$childCleaned = (Get-Check $readOnly 'childProcessTree').stillAliveAfterKill -eq $false
$egressSandbox = (Get-Check $readOnly 'egressTcp80')
$egressHost = (Get-Check $hostBaseline 'egressTcp80')
$egressDistinguishable = ($egressSandbox.allowed -ne $egressHost.allowed) -or ($egressSandbox.code -ne $egressHost.code)

Write-Stage "VERDICT PER RESTRICTION"
$verdicts = [ordered]@{
  sandboxProbePass = ($doctorExit -eq 0)
  V02_writeInsideCheckoutDenied = $writeDeniedReadOnly
  V02_writeOutsideCheckoutDenied = $writeOutsideDeniedReadOnly
  V15_childProcessTreeCleaned = $childCleaned
  V01_readIsolation = (-not $gitReadable) -and (-not $credentialReadable) -and (-not $accountsReadable) -and (-not $siblingReadable)
  V01_homeSshDenied = $homeSshDenied
  V08_egressDenied = $egressDistinguishable
}
foreach ($key in $verdicts.Keys) { Write-Host ("{0,-32} : {1}" -f $key, $verdicts[$key]) }

$gateA = $verdicts.sandboxProbePass -and $verdicts.V02_writeInsideCheckoutDenied -and $verdicts.V02_writeOutsideCheckoutDenied -and $verdicts.V15_childProcessTreeCleaned -and $verdicts.V01_readIsolation
Write-Host ""
Write-Host "GATE G-A (needs probe + write denial + read isolation + child cleanup) : $gateA"

$evidence = [ordered]@{
  capturedAt = (Get-Date).ToUniversalTime().ToString('o')
  host = [ordered]@{
    user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    isElevated = (New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    os = [Environment]::OSVersion.VersionString
    node = (& node --version)
  }
  repo = $Repo
  canaryRoot = $CanaryRoot
  codex = [ordered]@{
    appCli = $cli
    appVersion = (Invoke-Capture $cli @('--version')).Trim()
    pathCli = $pathCli
    pathVersion = $pathVersion
    pathCliProbe = $pathProbe
  }
  note = 'Fake canary data only. No real secret, credential value, production DB or sibling worktree content was read. Credential files were only opened, never read into the report.'
  doctor = $doctor
  canaries = @($readOnly, $workspaceProfile, $hostBaseline)
  verdicts = $verdicts
  gateA = [ordered]@{
    passed = $gateA
    blockedBy = @(
      if (-not $verdicts.V01_readIsolation) { 'V01 read isolation: worker can open .git common dir, .env, accounts.txt and list sibling worktrees under the read-only profile' }
      if (-not $verdicts.V08_egressDenied) { 'V08 egress: host baseline and sandbox produced the same egress result, so denial is not proven on this host' }
    )
  }
  liveWorkersVerified = $false
}
$evidencePath = Join-Path $Repo 'planning\jobtrack-agent-autonomy\CANARY-EVIDENCE.json'
$evidence | ConvertTo-Json -Depth 14 | Set-Content -Path $evidencePath -Encoding utf8
Write-Host ""
Write-Host "wrote $evidencePath"
exit ($(if ($gateA) { 0 } else { 2 }))
