@echo off
echo =========================================
echo  Uploading code to GitHub...
echo =========================================

echo.
echo [1/5] Configuring Git Identity...
git config user.email "jaishriram5400@gmail.com"
git config user.name "jeetucodes"

echo.
echo [2/5] Setting up GitHub remote...
git remote remove github 2>nul
git remote add github https://github.com/jeetucodes/campusxpose.git

echo.
echo [3/5] Staging all files...
git add .

echo.
echo [4/5] Committing changes...
set /p commit_msg="Enter commit message (or press enter for default): "
if "%commit_msg%"=="" set commit_msg=Update project
git commit -m "%commit_msg%"

echo.
echo [4.5/5] Pulling remote changes to sync with Lovable...
git pull github main --no-edit

echo.
echo [5/5] Pushing to GitHub...
git push -u github main

if errorlevel 1 (
    echo.
    echo Wait, trying 'master' branch instead...
    git push -u github master
)

echo.
echo =========================================
echo Done! Please check your GitHub repository.
echo =========================================
pause
