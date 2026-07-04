@echo off
echo ===================================================
echo Ensuring .env files are not tracked by Git...
echo ===================================================
git rm --cached .env 2>nul
git rm --cached .env.* 2>nul

echo.
echo Adding files to Git...
git add .

echo.
set /p commit_msg="Enter commit message (or press enter for default): "
if "%commit_msg%"=="" set commit_msg=Update project

git commit -m "%commit_msg%"

echo.
echo Pushing to GitHub...
git push

echo.
echo ===================================================
echo Done! Your .env files are safe and were not uploaded.
echo ===================================================
pause
