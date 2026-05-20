@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  Text Fix - обновление https://pavlovartem.netlify.app
echo.
echo  1. GitHub: загрузите ВСЕ 5 файлов:
echo     index.html  app.js  styles.css  netlify.toml
echo     netlify\functions\text-fix.mjs
echo.
echo  2. Netlify - Environment variables:
echo     F5AI_API_KEY = токен f5ai.ru
echo     Scopes: Functions + Production (обязательно Functions!)
echo.
echo  3. Deploys - Clear cache and deploy site
echo.

powershell -NoProfile -Command ^
  "$s=$env:TEMP+'\tf-deploy'; if(Test-Path $s){rm $s -Recurse -Force};" ^
  "md $s\netlify\functions -Force | Out-Null;" ^
  "copy index.html,app.js,styles.css,netlify.toml $s;" ^
  "copy netlify\functions\text-fix.mjs $s\netlify\functions\;" ^
  "Compress-Archive -Path $s\* -DestinationPath '%~dp0deploy.zip' -Force;" ^
  "Write-Host 'Архив: deploy.zip'"

start https://github.com/Picapr0/-/upload
start https://app.netlify.com/sites/pavlovartem/configuration/env
start https://app.netlify.com/sites/pavlovartem/deploys
start https://pavlovartem.netlify.app
pause
