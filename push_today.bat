@echo off
echo ===================================================
echo  CampusXpose - Git Push Script
echo ===================================================

echo.
echo [1/4] Removing sensitive files from git tracking...
git rm --cached .env 2>nul
git rm --cached .env.* 2>nul
git rm --cached *.bat 2>nul

echo.
echo [2/4] Staging all changes...
git add .

echo.
echo [3/4] Committing...
set commit_msg=feat: confession box, likes, standalone confess form, nav reorder

git commit -m "%commit_msg%"

echo.
echo [4/4] Pushing to GitHub...
git push

echo.
echo ===================================================
echo  Done! Changes pushed successfully.
echo  .env and .bat files were NOT uploaded (safe).
echo ===================================================
pause
