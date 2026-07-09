@echo off
echo =========================================
echo      CampusXpose Code Uploader
echo =========================================

echo.
echo Configuring Git credentials...
git config user.name "jeetucodes"
git config user.email "jaishriram5400@gmail.com"

echo Configuring remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/jeetucodes/campusxpose.git
git branch -M main

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
git push -u origin main

echo.
echo =========================================
echo  Done! Your code has been uploaded.
echo =========================================
pause
