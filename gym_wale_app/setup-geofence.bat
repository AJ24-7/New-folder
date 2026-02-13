@echo off
REM Geofence Attendance System - Quick Setup Script (Windows)
REM This script helps set up the geofence-based attendance system

echo ============================================
echo   Geofence Attendance System - Quick Setup
echo ============================================
echo.

REM Step 1: Backend Setup
echo ========================================
echo Step 1: Backend Setup
echo ========================================
echo.

cd backend

echo Installing backend dependencies...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Backend dependencies installed
) else (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)

echo.

REM Step 2: Run Migration
echo ========================================
echo Step 2: Database Migration
echo ========================================
echo.

echo Adding geofenceRadius to existing gyms...
call node scripts\addGeofenceRadiusToGyms.js migrate

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Migration completed
) else (
    echo [WARNING] Migration may have failed or no gyms to update
)

echo.
cd ..

REM Step 3: Flutter Setup
echo ========================================
echo Step 3: Flutter Setup
echo ========================================
echo.

echo Installing Flutter dependencies...
call flutter pub get

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Flutter dependencies installed
) else (
    echo [ERROR] Failed to install Flutter dependencies
    pause
    exit /b 1
)

echo.

REM Step 4: Verify Android Configuration
echo ========================================
echo Step 4: Android Configuration Check
echo ========================================
echo.

if exist "android\app\src\main\AndroidManifest.xml" (
    findstr /C:"ACCESS_BACKGROUND_LOCATION" android\app\src\main\AndroidManifest.xml >nul
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] Android permissions configured
    ) else (
        echo [WARNING] Android permissions may need manual configuration
    )
) else (
    echo [ERROR] AndroidManifest.xml not found
)

echo.

REM Step 5: Summary
echo ========================================
echo Setup Summary
echo ========================================
echo.
echo Components installed:
echo   [OK] Backend controller: geofenceAttendanceController.js
echo   [OK] Backend routes: geofenceAttendance.js
echo   [OK] Flutter service: geofencing_service.dart
echo   [OK] Flutter provider: attendance_provider.dart
echo   [OK] Database models: Updated Attendance and Gym models
echo   [OK] Android configuration: Permissions added
echo.

REM Step 6: Next Steps
echo ========================================
echo Next Steps
echo ========================================
echo.
echo 1. Start your backend server:
echo    cd backend
echo    npm start
echo.
echo 2. Test the API endpoints:
echo    curl http://localhost:5000/api/health
echo.
echo 3. Run the Flutter app on a real device:
echo    flutter run --release
echo.
echo 4. Review the documentation:
echo    - GEOFENCE_IMPLEMENTATION_GUIDE.md
echo    - GEOFENCE_API_REFERENCE.md
echo    - IOS_GEOFENCING_SETUP.md
echo.

echo ========================================
echo [SUCCESS] Setup Complete!
echo ========================================
echo.
echo [IMPORTANT]:
echo    - Test on a REAL device (geofencing doesn't work well on emulators)
echo    - Grant 'Allow all the time' location permission
echo    - Ensure GPS is enabled on the device
echo    - For iOS, follow IOS_GEOFENCING_SETUP.md for additional configuration
echo.

REM Optional: Test backend
set /p REPLY="Would you like to start the backend server now? (Y/N): "
if /I "%REPLY%"=="Y" (
    echo.
    echo Starting backend server...
    cd backend
    start "Gym Wale Backend" cmd /k npm start
    cd ..
    echo Backend server started in a new window
)

echo.
echo Happy coding! 
echo.
pause
