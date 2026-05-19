# Запуск после установки Git: https://git-scm.com/download/win
# Правый клик -> "Выполнить с PowerShell" или в терминале: .\push-to-github.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
  Write-Host "Git не найден. Установите: https://git-scm.com/download/win" -ForegroundColor Yellow
  Write-Host "Перезапустите терминал после установки."
  exit 1
}

if (-not (Test-Path .git)) {
  git init
}

git add .
git status

git commit -m "first commit: AI Image Studio Telegram Mini App" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Коммит уже есть или нечего коммитить — продолжаем..."
}

git branch -M main

$remoteUrl = "https://github.com/Picapr0/-.git"
$existing = git remote get-url origin 2>$null
if ($existing) {
  git remote set-url origin $remoteUrl
} else {
  git remote add origin $remoteUrl
}

Write-Host ""
Write-Host "Отправка на GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Готово! Репозиторий: $remoteUrl" -ForegroundColor Green
  Write-Host "Дальше: Netlify -> Import from Git -> добавить F5AI_API_KEY"
} else {
  Write-Host ""
  Write-Host "Ошибка push. Проверьте:" -ForegroundColor Yellow
  Write-Host "  1. Репозиторий https://github.com/Picapr0/- создан на GitHub"
  Write-Host "  2. Вы вошли в GitHub (git login или Personal Access Token)"
}
