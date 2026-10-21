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
  $binRoot = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin'
  if (Test-Path $binRoot) {
    $candidates = @(Get-ChildItem $binRoot -Recurse -Filter 'codex.exe' -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending | Select-Object -ExpandProperty FullName)
    if ($candidates.Count -gt 0) { return $candidates[0] }
  }
  throw 'No app-provided codex.exe found. Set CODEX_CLI_PATH explicitly.'
}

function Invoke-Canary([string]$cli, [string]$profile) {
  $env:JT_CANARY_ROOT = $CanaryRoot
  $env:JT_CANARY_FIXTURE = $FixtureRoot
  $env:JT_SANDBOX_PROFILE = $profile
  $raw = Invoke-Capture $cli @('sandbox', '--permission-profile', $profile, '-C', $Repo, '--', 'node', (Join-Path $Repo 'tools/sandbox/canary.mjs'), $Repo)
  $parsed = Convert-JsonBlock $raw
  if ($null -eq $parsed) { return [pscustomobject]@{ profile = $profile; parseError = 'canary produced no JSON'; raw = $raw.Trim() } }
  $parsed | Add-Member -NotePropertyName profile -NotePropertyValue $profile -Force
  return $parsed
}

$cli = Resolve-CodexCli $CodexCliPath
$FixtureRoot = Join-Path $CanaryRoot 'fixture'

Write-Stage "ENVIRONMENT"
Write-Host "repository        : $Repo"
Write-Host "canary root       : $CanaryRoot"
Write-Host "canary fixture    : $FixtureRoot"
Write-Host "codex cli         : $cli"
Write-Host "codex version     : $((Invoke-Capture $cli @('--version')).Trim())"

Write-Stage "CANARY FIXTURES (fake data only, never the real credential files)"
New-Item -ItemType Directory -Force -Path (Join-Path $CanaryRoot 'outside') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $FixtureRoot 'host-repo') | Out-Null
Set-Content -Path (Join-Path $CanaryRoot 'outside\read-probe.txt') -Value 'jobtrack-sandbox-canary-fake-marker-do-not-use' -NoNewline
Set-Content -Path (Join-Path $FixtureRoot 'host-repo\.env') -Value 'CANARY_FAKE_SECRET=not-a-real-secret' -NoNewline
Set-Content -Path (Join-Path $FixtureRoot 'host-repo\accounts.txt') -Value 'canary@example.test|fake-password' -NoNewline
Write-Host "created fake marker, fake .env and fake accounts.txt under $FixtureRoot"

Write-Stage "DOCTOR (controller probe with selected CLI)"
$env:CODEX_CLI_PATH = $cli
$doctorRaw = Invoke-Capture 'node' @((Join-Path $Repo 'tools/agent-control/cli.mjs'), 'doctor')
$doctor = Convert-JsonBlock $doctorRaw
$doctor | ConvertTo-Json -Depth 6 | Write-Host

Write-Stage "CANARY :read-only (worker profile)"
$readOnly = Invoke-Canary $cli ':read-only'
$readOnly | ConvertTo-Json -Depth 6 | Write-Host

Write-Stage "CANARY :workspace (check runner profile)"
$workspaceProfile = Invoke-Canary $cli ':workspace'
$workspaceProfile | ConvertTo-Json -Depth 6 | Write-Host

Write-Stage "HOST BASELINE (no sandbox, for comparison)"
$env:JT_CANARY_ROOT = $CanaryRoot
$env:JT_CANARY_FIXTURE = $FixtureRoot
$env:JT_SANDBOX_PROFILE = 'host-direct'
$hostRaw = Invoke-Capture 'node' @((Join-Path $Repo 'tools/sandbox/canary.mjs'), $Repo)
$hostBaseline = Convert-JsonBlock $hostRaw

Write-Stage "VERDICT"
$inputPath = Join-Path $CanaryRoot 'canary-input.json'
$evidencePath = Join-Path $Repo 'planning\jobtrack-agent-autonomy\CANARY-EVIDENCE.json'
$inputJson = [ordered]@{
  capturedAt = (Get-Date).ToUniversalTime().ToString('o')
  host = [ordered]@{
    user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    isElevated = (New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    os = [Environment]::OSVersion.VersionString
    node = (& node --version)
  }
  repo = $Repo
  canaryRoot = $CanaryRoot
  canaryFixture = $FixtureRoot
  codex = [ordered]@{
    appCli = $cli
    appVersion = (Invoke-Capture $cli @('--version')).Trim()
  }
  note = 'Fake canary data only. The real dotenv and account files of the repository are never opened; the credential checks use a fake fixture tree. Git metadata, sibling worktree and control state checks record only existence and size, never content.'
  doctor = $doctor
  canaries = @($readOnly, $workspaceProfile, $hostBaseline)
} | ConvertTo-Json -Depth 14
[System.IO.File]::WriteAllText($inputPath, $inputJson, (New-Object System.Text.UTF8Encoding($false)))

$verdictRaw = Invoke-Capture 'node' @((Join-Path $Repo 'tools/sandbox/verdict.mjs'), $inputPath, $evidencePath)
$verdictRaw | Write-Host
$verdict = Convert-JsonBlock $verdictRaw
Write-Host ""
Write-Host "wrote $evidencePath"
if ($null -eq $verdict) {
  Write-Host "verdict could not be computed; treating the gate as failed" -ForegroundColor Red
  exit 2
}
exit ($(if ($verdict.gateA) { 0 } else { 2 }))
