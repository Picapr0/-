$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$setup = Join-Path $root "scripts\setup-cert.ps1"
$server = Join-Path $root "scripts\https-server.mjs"

& $setup

$nodeCandidates = @()
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) { $nodeCandidates += $nodeCmd.Source }
$nodeCandidates += @(
  "$env:ProgramFiles\cursor\resources\app\resources\helpers\node.exe",
  "D:\cursor\resources\app\resources\helpers\node.exe",
  "$env:LOCALAPPDATA\Programs\cursor\resources\app\resources\helpers\node.exe"
)
$nodeCandidates = $nodeCandidates | Where-Object { $_ -and (Test-Path $_) }

$node = $nodeCandidates | Select-Object -First 1

if (-not $node) {
  Write-Host ""
  Write-Host "Node.js не найден. Установите с https://nodejs.org" -ForegroundColor Yellow
  Write-Host "или откройте сайт через публичный HTTPS (см. README.md)."
  Write-Host ""
  exit 1
}

Write-Host "Используется Node: $node"
$env:USE_LOCAL_HTTPS = "1"
& $node $server
