$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

& "$root\scripts\setup-cert.ps1"

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$node = @(
  $(if ($nodeCmd) { $nodeCmd.Source }),
  "$env:ProgramFiles\cursor\resources\app\resources\helpers\node.exe",
  "D:\cursor\resources\app\resources\helpers\node.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $node) {
  Write-Host "Установите Node.js: https://nodejs.org"
  exit 1
}

& $node "$root\scripts\server.mjs"
