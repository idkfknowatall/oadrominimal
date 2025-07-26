# PowerShell script to create deployment package for OADRO Radio
# Run this on Windows to prepare files for server deployment

Write-Host "🚀 Creating OADRO Radio deployment package..." -ForegroundColor Blue

# Create deployment directory
$deployDir = "oadro-radio-deployment"
if (Test-Path $deployDir) {
    Remove-Item -Recurse -Force $deployDir
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

Write-Host "📦 Copying application files..." -ForegroundColor Green

# Copy essential files and directories
$filesToCopy = @(
    "src",
    "public", 
    "scripts",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tailwind.config.ts",
    "postcss.config.mjs",
    "tsconfig.json",
    "components.json",
    ".env.production",
    "deploy-to-oadro.sh",
    "ecosystem.config.js",
    "PRODUCTION_DEPLOYMENT.md",
    "DEPLOYMENT_CHECKLIST.md"
)

foreach ($item in $filesToCopy) {
    if (Test-Path $item) {
        if (Test-Path $item -PathType Container) {
            Copy-Item -Recurse $item $deployDir
        } else {
            Copy-Item $item $deployDir
        }
        Write-Host "  ✓ Copied $item" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠ Skipped $item (not found)" -ForegroundColor Yellow
    }
}

# Create a README for the deployment package
$readmeContent = @"
# OADRO Radio - Production Deployment Package

This package contains all files needed to deploy OADRO Radio to your server.

## Quick Deployment Steps:

1. Upload this entire folder to your server
2. SSH into your server and navigate to the uploaded folder
3. Make the deployment script executable:
   chmod +x deploy-to-oadro.sh
4. Run the deployment script as root:
   sudo ./deploy-to-oadro.sh

## What's Included:
- Application source code (src/)
- Static assets (public/)
- Production configuration (.env.production)
- Deployment scripts (scripts/, deploy-to-oadro.sh)
- Documentation (PRODUCTION_DEPLOYMENT.md, DEPLOYMENT_CHECKLIST.md)

## After Deployment:
1. Install SSL certificate: sudo certbot --nginx -d oadro.com -d www.oadro.com
2. Test your site: https://oadro.com
3. Monitor with: pm2 status

Your OADRO Radio will be live at https://oadro.com!
"@

Set-Content -Path "$deployDir/README.md" -Value $readmeContent

# Create a zip file
Write-Host "📦 Creating deployment archive..." -ForegroundColor Green

$zipPath = "oadro-radio-deployment.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath
}

# Use PowerShell 5.0+ compression
Compress-Archive -Path $deployDir -DestinationPath $zipPath -Force

Write-Host "✅ Deployment package created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Blue
Write-Host "1. Upload '$zipPath' to your server" -ForegroundColor White
Write-Host "2. Extract: unzip $zipPath" -ForegroundColor White
Write-Host "3. Deploy: cd $deployDir && chmod +x deploy-to-oadro.sh && sudo ./deploy-to-oadro.sh" -ForegroundColor White
Write-Host ""
Write-Host "🎵 Your OADRO Radio will be live at https://oadro.com!" -ForegroundColor Green

# Clean up temporary directory
Remove-Item -Recurse -Force $deployDir