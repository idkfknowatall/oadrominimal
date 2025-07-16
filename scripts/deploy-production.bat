@echo off
setlocal enabledelayedexpansion

REM OADRO Radio - Production Deployment Script (Windows)
REM This script sets up the application on a Windows server

echo.
echo 🎵 OADRO Radio - Production Deployment Script (Windows)
echo =======================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo [SUCCESS] Node.js is installed: 
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

echo [SUCCESS] npm is installed: 
npm --version

echo.
echo [INFO] Starting production deployment...
echo.

REM Clean up development/test files
echo [INFO] Cleaning up development and test files...

if exist "scripts\seed-local-data.js" del /f "scripts\seed-local-data.js"
if exist "scripts\setup-local-dev.js" del /f "scripts\setup-local-dev.js"
if exist "scripts\test-local-setup.js" del /f "scripts\test-local-setup.js"
if exist "LOCAL_DEVELOPMENT.md" del /f "LOCAL_DEVELOPMENT.md"
if exist "CLAUDE.md" del /f "CLAUDE.md"
if exist "GEMINI.md" del /f "GEMINI.md"
if exist ".modified" del /f ".modified"
if exist "cypress" rmdir /s /q "cypress"
if exist "cypress.config.ts" del /f "cypress.config.ts"
if exist "jest.config.js" del /f "jest.config.js"
if exist "jest.setup.js" del /f "jest.setup.js"
if exist "__mocks__" rmdir /s /q "__mocks__"
if exist "start-dev.bat" del /f "start-dev.bat"

REM Remove environment files
if exist ".env.local" del /f ".env.local"
if exist ".env.development" del /f ".env.development"
if exist ".env.test" del /f ".env.test"

REM Remove logs
if exist "firebase-debug.log" del /f "firebase-debug.log"
if exist "firestore-debug.log" del /f "firestore-debug.log"

REM Remove backup files
for /r %%i in (*.bak) do del /f "%%i"
for /r %%i in (*.tmp) do del /f "%%i"

echo [SUCCESS] Development files cleaned up
echo.

REM Clean npm cache and dependencies
echo [INFO] Cleaning npm cache and dependencies...

if exist "node_modules" (
    echo [INFO] Removing node_modules directory...
    rmdir /s /q "node_modules"
    if errorlevel 1 (
        echo [ERROR] Failed to remove node_modules directory
        echo [RECOVERY] Try running as administrator or manually delete the folder
        pause
        exit /b 1
    )
)

if exist "package-lock.json" del /f "package-lock.json"

npm cache clean --force
if errorlevel 1 (
    echo [WARNING] Failed to clean npm cache, continuing...
)

echo [SUCCESS] Dependencies cleaned
echo.

REM Install production dependencies
echo [INFO] Installing production dependencies...

npm install --production --no-optional
npm audit fix --force

echo [SUCCESS] Production dependencies installed
echo.

REM Environment setup
echo [INFO] Setting up production environment...

if not exist ".env.production" (
    echo [WARNING] .env.production not found. Creating template...
    (
        echo # OADRO Radio - Production Environment
        echo NODE_ENV=production
        echo.
        echo # Radio Stream Configuration
        echo NEXT_PUBLIC_RADIO_STREAM_URL=https://radio.oadro.com/radio/8000/radio.mp3
        echo NEXT_PUBLIC_RADIO_API_URL=https://radio.oadro.com/api
        echo.
        echo # Application URLs
        echo NEXT_PUBLIC_APP_URL=https://your-domain.com
        echo.
        echo # Firebase Configuration ^(if using Firebase^)
        echo # NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
        echo # NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
        echo # NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
        echo.
        echo # Analytics ^(optional^)
        echo # NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
    ) > .env.production
    echo [WARNING] Please edit .env.production with your actual configuration
)

REM Copy production env to .env for build
copy ".env.production" ".env" >nul

echo [SUCCESS] Environment configured
echo.

REM Build the application
echo [INFO] Building application for production...

npm run build

if errorlevel 1 (
    echo [ERROR] Build failed. Please check the errors above.
    pause
    exit /b 1
)

echo [SUCCESS] Application built successfully
echo.

REM Create PM2 ecosystem file
echo [INFO] Creating PM2 configuration...

(
    echo module.exports = {
    echo   apps: [{
    echo     name: 'oadro-radio',
    echo     script: 'npm',
    echo     args: 'start',
    echo     cwd: '%CD%',
    echo     instances: 1,
    echo     autorestart: true,
    echo     watch: false,
    echo     max_memory_restart: '1G',
    echo     env: {
    echo       NODE_ENV: 'production',
    echo       PORT: 3000
    echo     },
    echo     error_file: './logs/err.log',
    echo     out_file: './logs/out.log',
    echo     log_file: './logs/combined.log',
    echo     time: true
    echo   }]
    echo };
) > ecosystem.config.js

REM Create logs directory
if not exist "logs" mkdir "logs"

echo [SUCCESS] PM2 configuration created
echo.

REM Create Windows service batch file
echo [INFO] Creating Windows service helper...

(
    echo @echo off
    echo REM OADRO Radio Service Helper
    echo.
    echo if "%%1"=="start" ^(
    echo     echo Starting OADRO Radio...
    echo     npm start
    echo ^) else if "%%1"=="stop" ^(
    echo     echo Stopping OADRO Radio...
    echo     taskkill /f /im node.exe
    echo ^) else if "%%1"=="restart" ^(
    echo     echo Restarting OADRO Radio...
    echo     taskkill /f /im node.exe
    echo     timeout /t 2 /nobreak ^>nul
    echo     npm start
    echo ^) else ^(
    echo     echo Usage: service.bat [start^|stop^|restart]
    echo ^)
) > service.bat

echo [SUCCESS] Service helper created
echo.

REM Final checks
echo [INFO] Running final checks...

if not exist ".next" (
    echo [ERROR] Build directory not found. Build may have failed.
    pause
    exit /b 1
)

findstr /c:"\"start\"" package.json >nul
if errorlevel 1 (
    echo [ERROR] No start script found in package.json
    pause
    exit /b 1
)

echo [SUCCESS] All checks passed
echo.

REM Display completion message
echo.
echo 🎉 OADRO Radio deployment completed successfully!
echo =======================================================
echo.
echo Next steps:
echo 1. Edit .env.production with your actual configuration
echo 2. Set up IIS or another reverse proxy if needed
echo 3. Consider setting up SSL certificate
echo.
echo To start the application:
echo • With PM2: pm2 start ecosystem.config.js
echo • With service helper: service.bat start
echo • Manually: npm start
echo.
echo Application will be available at: http://localhost:3000
echo Configure your reverse proxy to point to this port.
echo.
echo [SUCCESS] Deployment script completed!
echo.
pause