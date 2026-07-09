@echo off
echo =========================================
echo      CampusXpose Code Uploader
echo =========================================

set /p msg="Enter commit message (or press enter for default 'Update'): "
if "%msg%"=="" set msg=Update

echo.
echo [1/3] Staging changes...
git add .

echo.
echo [2/3] Committing changes...
git commit -m "%msg%"

echo.
echo [3/3] Pushing to repository...
git push

echo.
echo =========================================
echo  Done! Your code has been uploaded.
echo =========================================
pause
