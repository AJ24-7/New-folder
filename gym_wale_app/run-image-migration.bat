@echo off
echo.
echo ====================================
echo  Diet Plan Image Enrichment Script
echo ====================================
echo.
echo This will add images to all diet plans and their meals
echo.
pause

cd backend
echo.
echo Running migration script...
echo.
node scripts/enrichDietPlansWithImages.js

echo.
echo ====================================
echo Done! Press any key to exit
echo ====================================
pause
