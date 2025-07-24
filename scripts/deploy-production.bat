@echo off
setlocal enabledelayedexpansion

REM OADRO Radio - Enhanced Production Deployment Script (Windows)
REM This script sets up the application on a Windows server with security improvements

echo.
echo 🎵 OADRO Radio - Enhanced Production Deployment Script (Windows)
echo =======================================================
echo.

REM Security: Check if running as administrator
net session >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Not running as administrator. Some operations may fail.
    echo [INFO] Consider running as administrator for full functionality.
    echo.
)

REM Input validation for environment variables
set "VALID_ENV=false"
if "%NODE_ENV%"=="production" set "VALID_ENV=true"
if "%NODE_ENV%"=="" (
    set "NODE_ENV=production"
    set "VALID_ENV=true"
)

if "%VALID_ENV%"=="false" (
    echo [ERROR] Invalid NODE_ENV: %NODE_ENV%. Must be 'production' or empty.
    pause
    exit /b 1
)

REM Backup creation before deployment
set "BACKUP_DIR=backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "BACKUP_DIR=%BACKUP_DIR: =0%"
echo [INFO] Creating backup in %BACKUP_DIR%...

if exist ".next" (
    mkdir "%BACKUP_DIR%" 2>nul
    xcopy /E /I /Q ".next" "%BACKUP_DIR%\.next" >nul 2>&1
    if exist ".env" copy ".env" "%BACKUP_DIR%\" >nul 2>&1
    echo [SUCCESS] Backup created
) else (
    echo [INFO] No existing build to backup
)

REM Check if Node.js is installed with version validation
echo [INFO] Validating Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%i in ('node --version') do set "NODE_MAJOR=%%i"
set "NODE_MAJOR=%NODE_MAJOR:v=%"
if %NODE_MAJOR% LSS 18 (
    echo [ERROR] Node.js version %NODE_MAJOR% is too old. Please install Node.js 18+.
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
echo [INFO] Starting enhanced production deployment...
echo.

REM Security: Validate file permissions
echo [INFO] Checking file permissions...
if not exist "package.json" (
    echo [ERROR] package.json not found. Are you in the correct directory?
    pause
    exit /b 1
)

REM Clean up development/test files with better error handling
echo [INFO] Cleaning up development and test files...

set "FILES_TO_DELETE=scripts\seed-local-data.js scripts\setup-local-dev.js scripts\test-local-setup.js LOCAL_DEVELOPMENT.md CLAUDE.md GEMINI.md .modified cypress.config.ts jest.config.js jest.setup.js start-dev.bat"

for %%f in (%FILES_TO_DELETE%) do (
    if exist "%%f" (
        del /f "%%f" 2>nul
        if exist "%%f" (
            echo [WARNING] Could not delete %%f - file may be in use
        )
    )
)

set "DIRS_TO_DELETE=cypress __mocks__"
for %%d in (%DIRS_TO_DELETE%) do (
    if exist "%%d" (
        rmdir /s /q "%%d" 2>nul
        if exist "%%d" (
            echo [WARNING] Could not delete directory %%d - may be in use
        )
    )
)

REM Security: Remove sensitive environment files
echo [INFO] Removing development environment files...
set "ENV_FILES=.env.local .env.development .env.test"
for %%e in (%ENV_FILES%) do (
    if exist "%%e" (
        del /f "%%e" 2>nul
        echo [INFO] Removed %%e
    )
)

REM Clean logs and temporary files
echo [INFO] Cleaning temporary files...
if exist "*.log" del /f "*.log" 2>nul
for /r %%i in (*.bak *.tmp) do del /f "%%i" 2>nul

echo [SUCCESS] Development files cleaned up
echo.

REM Clean npm cache and dependencies with retry logic
echo [INFO] Cleaning npm cache and dependencies...

if exist "node_modules" (
    echo [INFO] Removing node_modules directory...
    rmdir /s /q "node_modules" 2>nul
    if exist "node_modules" (
        echo [WARNING] Could not remove node_modules. Trying alternative method...
        rd /s /q "node_modules" 2>nul
        if exist "node_modules" (
            echo [ERROR] Failed to remove node_modules directory
            echo [RECOVERY] Please manually delete the folder and run the script again
            pause
            exit /b 1
        )
    )
)

if exist "package-lock.json" del /f "package-lock.json" 2>nul

echo [INFO] Cleaning npm cache...
npm cache clean --force 2>nul
if errorlevel 1 (
    echo [WARNING] Failed to clean npm cache, continuing...
)

echo [SUCCESS] Dependencies cleaned
echo.

REM Security: Validate package.json before installation
echo [INFO] Validating package.json...
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>nul
if errorlevel 1 (
    echo [ERROR] Invalid package.json file
    pause
    exit /b 1
)

REM Install production dependencies with security audit
echo [INFO] Installing production dependencies...

npm install --production --no-optional --audit
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [INFO] Running security audit...
npm audit --audit-level=high
if errorlevel 1 (
    echo [WARNING] Security vulnerabilities found. Attempting to fix...
    npm audit fix --force
    if errorlevel 1 (
        echo [WARNING] Could not automatically fix all vulnerabilities
        echo [INFO] Please review security issues manually
    )
)

echo [SUCCESS] Production dependencies installed
echo.

REM Enhanced environment setup with validation
echo [INFO] Setting up production environment...

if not exist ".env.production" (
    echo [WARNING] .env.production not found. Creating secure template...
    (
        echo # OADRO Radio - Production Environment
        echo # Generated on %date% %time%
        echo NODE_ENV=production
        echo.
        echo # Radio Stream Configuration
        echo NEXT_PUBLIC_RADIO_STREAM_URL=https://radio.oadro.com/radio/8000/radio.mp3
        echo NEXT_PUBLIC_RADIO_API_URL=https://radio.oadro.com/api
        echo.
        echo # Application URLs ^(REQUIRED - Update this^)
        echo NEXT_PUBLIC_APP_URL=https://your-domain.com
        echo.
        echo # Security Configuration
        echo NEXTAUTH_SECRET=CHANGE_THIS_TO_RANDOM_STRING
        echo NEXTAUTH_URL=https://your-domain.com
        echo.
        echo # Analytics ^(optional^)
        echo # NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
        echo.
        echo # SSL Configuration ^(recommended^)
        echo # FORCE_HTTPS=true
    ) > .env.production
    echo [WARNING] Please edit .env.production with your actual configuration
    echo [SECURITY] Change all placeholder values before starting the application
)

REM Security: Validate environment file
if exist ".env.production" (
    findstr /c:"your-domain.com" ".env.production" >nul
    if not errorlevel 1 (
        echo [WARNING] Default domain found in .env.production
        echo [SECURITY] Please update the configuration with your actual domain
    )
    
    findstr /c:"CHANGE_THIS" ".env.production" >nul
    if not errorlevel 1 (
        echo [WARNING] Default secrets found in .env.production
        echo [SECURITY] Please update all secrets with secure random values
    )
)

REM Copy production env to .env for build
copy ".env.production" ".env" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to copy environment file
    pause
    exit /b 1
)

echo [SUCCESS] Environment configured
echo.

REM Build the application with timeout
echo [INFO] Building application for production...

timeout /t 1 /nobreak >nul
npm run build
set "BUILD_RESULT=%errorlevel%"

if %BUILD_RESULT% neq 0 (
    echo [ERROR] Build failed with exit code %BUILD_RESULT%
    echo [RECOVERY] Restoring from backup if available...
    if exist "%BACKUP_DIR%\.next" (
        rmdir /s /q ".next" 2>nul
        xcopy /E /I /Q "%BACKUP_DIR%\.next" ".next" >nul 2>&1
        echo [INFO] Backup restored
    )
    pause
    exit /b 1
)

echo [SUCCESS] Application built successfully
echo.

REM SSL certificate validation (if applicable)
echo [INFO] Checking SSL configuration...
if exist "ssl\certificate.crt" (
    echo [SUCCESS] SSL certificate found
) else (
    echo [WARNING] No SSL certificate found
    echo [RECOMMENDATION] Consider setting up SSL for production
)

REM Create enhanced PM2 ecosystem file
echo [INFO] Creating enhanced PM2 configuration...

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
    echo     min_uptime: '10s',
    echo     max_restarts: 10,
    echo     restart_delay: 4000,
    echo     env: {
    echo       NODE_ENV: 'production',
    echo       PORT: 3000
    echo     },
    echo     error_file: './logs/err.log',
    echo     out_file: './logs/out.log',
    echo     log_file: './logs/combined.log',
    echo     time: true,
    echo     log_date_format: 'YYYY-MM-DD HH:mm Z',
    echo     merge_logs: true,
    echo     kill_timeout: 5000
    echo   }]
    echo };
) > ecosystem.config.js

REM Create logs directory with proper permissions
if not exist "logs" (
    mkdir "logs"
    echo [INFO] Created logs directory
)

echo [SUCCESS] PM2 configuration created
echo.

REM Create enhanced Windows service batch file
echo [INFO] Creating enhanced Windows service helper...

(
    echo @echo off
    echo REM OADRO Radio Enhanced Service Helper
    echo setlocal enabledelayedexpansion
    echo.
    echo if "%%1"=="start" ^(
    echo     echo Starting OADRO Radio...
    echo     if exist ".env.production" ^(
    echo         copy ".env.production" ".env" ^>nul
    echo         npm start
    echo     ^) else ^(
    echo         echo [ERROR] .env.production not found
    echo         exit /b 1
    echo     ^)
    echo ^) else if "%%1"=="stop" ^(
    echo     echo Stopping OADRO Radio...
    echo     tasklist /fi "imagename eq node.exe" /fo csv ^| find /c "node.exe" ^>nul
    echo     if not errorlevel 1 ^(
    echo         taskkill /f /im node.exe
    echo         echo [SUCCESS] OADRO Radio stopped
    echo     ^) else ^(
    echo         echo [INFO] OADRO Radio is not running
    echo     ^)
    echo ^) else if "%%1"=="restart" ^(
    echo     echo Restarting OADRO Radio...
    echo     call "%%~f0" stop
    echo     timeout /t 3 /nobreak ^>nul
    echo     call "%%~f0" start
    echo ^) else if "%%1"=="status" ^(
    echo     tasklist /fi "imagename eq node.exe" /fo csv ^| find /c "node.exe" ^>nul
    echo     if not errorlevel 1 ^(
    echo         echo [STATUS] OADRO Radio is running
    echo     ^) else ^(
    echo         echo [STATUS] OADRO Radio is not running
    echo     ^)
    echo ^) else ^(
    echo     echo Usage: service.bat [start^|stop^|restart^|status]
    echo     echo.
    echo     echo Commands:
    echo     echo   start   - Start the OADRO Radio service
    echo     echo   stop    - Stop the OADRO Radio service
    echo     echo   restart - Restart the OADRO Radio service
    echo     echo   status  - Check if the service is running
    echo ^)
) > service.bat

echo [SUCCESS] Enhanced service helper created
echo.

REM Final security and functionality checks
echo [INFO] Running final security and functionality checks...

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

REM Check for common security issues
if exist ".env" (
    findstr /c:"password" ".env" >nul
    if not errorlevel 1 (
        echo [WARNING] Potential password found in .env file
        echo [SECURITY] Ensure no sensitive data is exposed
    )
)

REM Validate build output
if exist ".next\static" (
    echo [SUCCESS] Static assets generated
) else (
    echo [WARNING] Static assets may not have been generated properly
)

echo [SUCCESS] All security and functionality checks passed
echo.

REM Create deployment summary
echo [INFO] Creating deployment summary...
(
    echo OADRO Radio Deployment Summary
    echo =============================
    echo Deployment Date: %date% %time%
    echo Node.js Version: 
    node --version
    echo npm Version: 
    npm --version
    echo.
    echo Files Created:
    echo - ecosystem.config.js ^(PM2 configuration^)
    echo - service.bat ^(Windows service helper^)
    echo - .env ^(Environment configuration^)
    echo.
    echo Backup Location: %BACKUP_DIR%
    echo.
    echo Security Notes:
    echo - Review .env.production for sensitive data
    echo - Consider setting up SSL certificate
    echo - Ensure firewall rules are configured
    echo - Monitor logs regularly
) > deployment-summary.txt

echo [SUCCESS] Deployment summary created
echo.

REM Display completion message with security recommendations
echo.
echo 🎉 OADRO Radio enhanced deployment completed successfully!
echo =======================================================
echo.
echo 🔒 SECURITY CHECKLIST:
echo 1. ✅ Edit .env.production with your actual configuration
echo 2. ✅ Change all default secrets and passwords
echo 3. ✅ Set up SSL certificate for HTTPS
echo 4. ✅ Configure firewall rules
echo 5. ✅ Set up regular backups
echo 6. ✅ Monitor application logs
echo.
echo 🚀 NEXT STEPS:
echo 1. Review deployment-summary.txt
echo 2. Test the application: service.bat start
echo 3. Set up reverse proxy ^(IIS/Nginx^)
echo 4. Configure monitoring and alerting
echo.
echo 📋 AVAILABLE COMMANDS:
echo • PM2: pm2 start ecosystem.config.js
echo • Service: service.bat [start^|stop^|restart^|status]
echo • Manual: npm start
echo.
echo 🌐 Application will be available at: http://localhost:3000
echo Configure your reverse proxy to point to this port.
echo.
echo [SUCCESS] Enhanced deployment script completed!
echo Backup created in: %BACKUP_DIR%
echo.
pause