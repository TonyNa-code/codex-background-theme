param(
  [switch]$Force,
  [string]$AppRoot = $env:CODEX_APP_ROOT
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ((Test-Path (Join-Path $ScriptDir "patch-codex-background.js")) -and (Test-Path (Join-Path $ScriptDir "asar-tools.js"))) {
  $ToolDir = $ScriptDir
} else {
  $ToolDir = Join-Path $HOME ".codex\codex-background-theme"
}

$PatchScript = Join-Path $ToolDir "patch-codex-background.js"
$Log = Join-Path $ToolDir "reapply.log"
$LockDir = Join-Path $ToolDir ".reapply.lock"

New-Item -ItemType Directory -Force -Path $ToolDir | Out-Null

function Write-Log {
  param([string]$Message)
  Add-Content -Path $Log -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
}

function Find-Node {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe"
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) { return $candidate }
  }
  throw "Node.js was not found. Install Node.js or add node.exe to PATH."
}

function Invoke-PatchScript {
  param([string[]]$ExtraArgs = @())
  $node = Find-Node
  $args = @($PatchScript)
  if ($AppRoot) { $args += @("--app-root", $AppRoot) }
  $args += $ExtraArgs
  & $node @args 2>&1 | Tee-Object -FilePath $Log -Append
}

function Get-AppAsarPath {
  if ($AppRoot) {
    if ((Split-Path -Leaf $AppRoot).ToLowerInvariant() -eq "app.asar") { return $AppRoot }
    if ((Split-Path -Leaf $AppRoot).ToLowerInvariant() -eq "resources") { return Join-Path $AppRoot "app.asar" }
    if ($AppRoot.ToLowerInvariant().EndsWith(".exe")) { return Join-Path (Split-Path -Parent $AppRoot) "resources\app.asar" }
    return Join-Path $AppRoot "resources\app.asar"
  }
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\Codex\resources\app.asar",
    "$env:LOCALAPPDATA\Programs\codex\resources\app.asar",
    "$env:LOCALAPPDATA\Codex\resources\app.asar",
    "$env:ProgramFiles\Codex\resources\app.asar",
    "${env:ProgramFiles(x86)}\Codex\resources\app.asar"
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) { return $candidate }
  }
  return $null
}

function Wait-AppIsStable {
  $asar = Get-AppAsarPath
  if (-not $asar) {
    Write-Log "Codex app.asar not found, skipping"
    return $false
  }
  $last = ""
  for ($i = 0; $i -lt 12; $i++) {
    $item = Get-Item $asar -ErrorAction SilentlyContinue
    if ($item) {
      $current = "$($item.LastWriteTimeUtc.Ticks):$($item.Length)"
      if ($current -eq $last) { return $true }
      $last = $current
    }
    Start-Sleep -Seconds 2
  }
  Write-Log "Codex app.asar did not stabilize, skipping"
  return $false
}

if (Test-Path $LockDir) {
  $lock = Get-Item $LockDir -ErrorAction SilentlyContinue
  if ($lock -and ((Get-Date) - $lock.LastWriteTime).TotalMinutes -gt 10) {
    Remove-Item -Recurse -Force $LockDir
  }
}

try {
  New-Item -ItemType Directory -Path $LockDir -ErrorAction Stop | Out-Null
} catch {
  exit 0
}

try {
  if (-not (Wait-AppIsStable)) { exit 0 }
  if (-not $Force) {
    try {
      Invoke-PatchScript -ExtraArgs @("--check")
      Write-Log "Background patch already current, skipping"
      exit 0
    } catch {
      Write-Log "Background patch check failed, reapplying"
    }
  }
  Write-Log "Reapplying Codex background patch"
  Invoke-PatchScript
  Invoke-PatchScript -ExtraArgs @("--check")
  Write-Log "Reapply complete. Restart Codex to load the refreshed background."
} finally {
  Remove-Item -Recurse -Force $LockDir -ErrorAction SilentlyContinue
}
