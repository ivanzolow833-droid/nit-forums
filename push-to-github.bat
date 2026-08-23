@echo off
cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
  echo Install Git first: https://git-scm.com/download/win
  pause
  exit /b 1
)

if not exist package.json (
  echo Run this file inside the forum folder where package.json exists.
  pause
  exit /b 1
)

echo Uploading to github.com/ivanzolow833-droid/nit-forums ...

git init
git config user.name "ivanzolow833-droid"
git config user.email "ivanzolow833-droid@users.noreply.github.com"
git add .
git commit -m "CloudWorld forum"
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/ivanzolow833-droid/nit-forums.git
git push -u origin main --force

echo.
echo Done. Check: https://github.com/ivanzolow833-droid/nit-forums
echo If browser login opened - sign in to GitHub.
pause
