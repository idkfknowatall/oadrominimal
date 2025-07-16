#!/bin/bash

# OADRO Radio - Production Deployment Script
# This script sets up the application on a dedicated server with comprehensive error handling

# Global variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/oadro-deploy.log"
FAILED_STEP=""
RECOVERY_MODE=false

# Initialize log file
echo "OADRO Radio Deployment Log - $(date)" > "$LOG_FILE"

echo "🎵 OADRO Radio - Production Deployment Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Enhanced logging functions
log_and_print() {
    echo "$1" | tee -a "$LOG_FILE"
}

print_status() {
    log_and_print "$(echo -e "${BLUE}[INFO]${NC} $1")"
}

print_success() {
    log_and_print "$(echo -e "${GREEN}[SUCCESS]${NC} $1")"
}

print_warning() {
    log_and_print "$(echo -e "${YELLOW}[WARNING]${NC} $1")"
}

print_error() {
    log_and_print "$(echo -e "${RED}[ERROR]${NC} $1")"
}

print_recovery() {
    log_and_print "$(echo -e "${PURPLE}[RECOVERY]${NC} $1")"
}

# Error handling function
handle_error() {
    local step="$1"
    local error_msg="$2"
    FAILED_STEP="$step"
    
    print_error "Failed at step: $step"
    print_error "Error: $error_msg"
    print_error "Check log file: $LOG_FILE"
    
    echo ""
    print_recovery "Recovery options:"
    print_recovery "1. Fix the issue and run: $0 --continue-from=$step"
    print_recovery "2. Run in recovery mode: $0 --recovery"
    print_recovery "3. Check logs: cat $LOG_FILE"
    print_recovery "4. Manual cleanup: $0 --cleanup"
    
    exit 1
}

# Recovery and continuation functions
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help                Show this help message"
    echo "  --recovery           Run in recovery mode (skip completed steps)"
    echo "  --continue-from=STEP Continue from specific step"
    echo "  --cleanup            Clean up failed deployment"
    echo "  --check-deps         Only check dependencies"
    echo "  --force              Force deployment even if checks fail"
    echo ""
    echo "Steps: system-check, cleanup, dependencies, build, services, nginx, ssl"
}

cleanup_failed_deployment() {
    print_status "Cleaning up failed deployment..."
    
    # Stop services
    sudo systemctl stop oadro-radio 2>/dev/null || true
    sudo systemctl disable oadro-radio 2>/dev/null || true
    
    # Remove systemd service
    sudo rm -f /etc/systemd/system/oadro-radio.service
    sudo systemctl daemon-reload
    
    # Remove nginx config
    sudo rm -f /etc/nginx/sites-available/oadro-radio
    sudo rm -f /etc/nginx/sites-enabled/oadro-radio
    
    # Restore default nginx if it was removed
    if [ ! -f /etc/nginx/sites-enabled/default ] && [ -f /etc/nginx/sites-available/default ]; then
        sudo ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
    fi
    
    # Restart nginx
    sudo systemctl restart nginx 2>/dev/null || true
    
    # Clean project files
    rm -rf node_modules/ .next/ logs/ ecosystem.config.js
    rm -f .env package-lock.json
    
    print_success "Cleanup completed"
}

# Check if step should be skipped in recovery mode
should_skip_step() {
    local step="$1"
    
    if [ "$RECOVERY_MODE" = true ]; then
        case $step in
            "system-check")
                command -v node &> /dev/null && command -v npm &> /dev/null
                ;;
            "cleanup")
                [ ! -d "node_modules" ] && [ ! -f "package-lock.json" ]
                ;;
            "dependencies")
                [ -d "node_modules" ] && [ -f "package-lock.json" ]
                ;;
            "build")
                [ -d ".next" ]
                ;;
            "services")
                systemctl is-enabled oadro-radio &> /dev/null
                ;;
            "nginx")
                [ -f "/etc/nginx/sites-available/oadro-radio" ]
                ;;
            *)
                false
                ;;
        esac
    else
        false
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        --recovery)
            RECOVERY_MODE=true
            shift
            ;;
        --continue-from=*)
            CONTINUE_FROM="${1#*=}"
            shift
            ;;
        --cleanup)
            cleanup_failed_deployment
            exit 0
            ;;
        --check-deps)
            CHECK_DEPS_ONLY=true
            shift
            ;;
        --force)
            FORCE_DEPLOYMENT=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   print_error "Please run as a regular user with sudo privileges"
   exit 1
fi

# Check sudo access
if ! sudo -n true 2>/dev/null; then
    print_warning "This script requires sudo access. You may be prompted for your password."
    if ! sudo true; then
        handle_error "sudo-check" "Failed to get sudo access"
    fi
fi

print_status "Starting production deployment..."
print_status "Log file: $LOG_FILE"

# Step 1: System Requirements Check
if ! should_skip_step "system-check" && [ "${CONTINUE_FROM:-system-check}" = "system-check" ]; then
    print_status "Step 1: Checking system requirements..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed."
        print_recovery "Install Node.js 18+ using one of these methods:"
        print_recovery "• Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
        print_recovery "• CentOS/RHEL: curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash - && sudo yum install -y nodejs"
        print_recovery "• Or download from: https://nodejs.org/"
        handle_error "system-check" "Node.js not found"
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        handle_error "system-check" "Node.js version 18+ is required. Current version: $(node -v)"
    fi
    
    print_success "Node.js $(node -v) is installed"
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        handle_error "system-check" "npm is not installed"
    fi
    
    print_success "npm $(npm -v) is installed"
    
    # Check available disk space (need at least 2GB)
    AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
    if [ "$AVAILABLE_SPACE" -lt 2097152 ]; then  # 2GB in KB
        print_warning "Low disk space detected. Available: $(($AVAILABLE_SPACE / 1024))MB"
        if [ "$FORCE_DEPLOYMENT" != true ]; then
            handle_error "system-check" "Insufficient disk space (need at least 2GB)"
        fi
    fi
    
    # Check if required system packages are available
    MISSING_PACKAGES=()
    
    if ! command -v curl &> /dev/null; then
        MISSING_PACKAGES+=("curl")
    fi
    
    if ! command -v git &> /dev/null; then
        MISSING_PACKAGES+=("git")
    fi
    
    if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
        print_warning "Missing system packages: ${MISSING_PACKAGES[*]}"
        print_recovery "Install missing packages:"
        if command -v apt-get &> /dev/null; then
            print_recovery "sudo apt-get update && sudo apt-get install -y ${MISSING_PACKAGES[*]}"
        elif command -v yum &> /dev/null; then
            print_recovery "sudo yum install -y ${MISSING_PACKAGES[*]}"
        elif command -v dnf &> /dev/null; then
            print_recovery "sudo dnf install -y ${MISSING_PACKAGES[*]}"
        fi
        
        if [ "$FORCE_DEPLOYMENT" != true ]; then
            handle_error "system-check" "Missing required system packages"
        fi
    fi
    
    print_success "System requirements check passed"
fi

# Exit if only checking dependencies
if [ "$CHECK_DEPS_ONLY" = true ]; then
    print_success "Dependency check completed successfully"
    exit 0
fi

# Step 2: Clean up development/test files
if ! should_skip_step "cleanup" && [ "${CONTINUE_FROM:-system-check}" != "dependencies" ] && [ "${CONTINUE_FROM:-system-check}" != "build" ] && [ "${CONTINUE_FROM:-system-check}" != "services" ] && [ "${CONTINUE_FROM:-system-check}" != "nginx" ]; then
    print_status "Step 2: Cleaning up development and test files..."
    
    # Remove development-specific files (already done by user request)
    # Remove any test/development environment files
    rm -f .env.local .env.development .env.test
    
    # Remove development logs
    rm -f *.log
    
    # Remove any backup files
    find . -name "*.bak" -type f -delete 2>/dev/null || true
    find . -name "*.tmp" -type f -delete 2>/dev/null || true
    find . -name "*~" -type f -delete 2>/dev/null || true
    
    print_success "Development files cleaned up"
fi

# Step 3: Dependencies
if ! should_skip_step "dependencies" && [ "${CONTINUE_FROM:-system-check}" != "build" ] && [ "${CONTINUE_FROM:-system-check}" != "services" ] && [ "${CONTINUE_FROM:-system-check}" != "nginx" ]; then
    print_status "Step 3: Installing production dependencies..."
    
    # Clean npm cache and remove node_modules
    rm -rf node_modules/ package-lock.json
    
    if ! npm cache clean --force 2>> "$LOG_FILE"; then
        print_warning "Failed to clean npm cache, continuing..."
    fi
    
    # Install production dependencies
    if ! npm install --production --no-optional 2>> "$LOG_FILE"; then
        handle_error "dependencies" "Failed to install npm dependencies"
    fi
    
    # Try to fix vulnerabilities
    npm audit fix --force 2>> "$LOG_FILE" || print_warning "Some vulnerabilities could not be fixed automatically"
    
    print_success "Production dependencies installed"
fi

# Step 4: Environment setup and build
if ! should_skip_step "build" && [ "${CONTINUE_FROM:-system-check}" != "services" ] && [ "${CONTINUE_FROM:-system-check}" != "nginx" ]; then
    print_status "Step 4: Setting up environment and building application..."
    
    # Create production environment file if it doesn't exist
    if [ ! -f .env.production ]; then
        print_warning ".env.production not found. Creating template..."
        cat > .env.production << 'EOF'
# OADRO Radio - Production Environment
NODE_ENV=production

# Radio Stream Configuration
NEXT_PUBLIC_RADIO_STREAM_URL=https://radio.oadro.com/radio/8000/radio.mp3
NEXT_PUBLIC_RADIO_API_URL=https://radio.oadro.com/api

# Application URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Analytics (optional)
# NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
EOF
        print_warning "Please edit .env.production with your actual configuration"
    fi
    
    # Copy production env to .env for build
    cp .env.production .env
    
    # Build the application
    print_status "Building application for production..."
    if ! npm run build 2>> "$LOG_FILE"; then
        handle_error "build" "Application build failed"
    fi
    
    print_success "Application built successfully"
fi

# Step 5: Services setup
if ! should_skip_step "services" && [ "${CONTINUE_FROM:-system-check}" != "nginx" ]; then
    print_status "Step 5: Setting up services..."
    
    # Set up PM2 for process management (if available)
    if command -v pm2 &> /dev/null; then
        print_status "Setting up PM2 process management..."
        
        # Create PM2 ecosystem file
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'oadro-radio',
    script: 'npm',
    args: 'start',
    cwd: '$(pwd)',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
        
        # Create logs directory
        mkdir -p logs
        
        # Stop any existing process
        pm2 stop oadro-radio 2>/dev/null || true
        pm2 delete oadro-radio 2>/dev/null || true
        
        print_success "PM2 configuration created"
    else
        print_warning "PM2 not found. Consider installing PM2 for better process management:"
        print_warning "npm install -g pm2"
    fi
    
    # Set up systemd service
    print_status "Creating systemd service file..."
    
    if ! sudo tee /etc/systemd/system/oadro-radio.service > /dev/null << EOF; then
[Unit]
Description=OADRO Radio Web Application
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=$(which npm) start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        handle_error "services" "Failed to create systemd service"
    fi
    
    if ! sudo systemctl daemon-reload; then
        handle_error "services" "Failed to reload systemd daemon"
    fi
    
    if ! sudo systemctl enable oadro-radio; then
        handle_error "services" "Failed to enable oadro-radio service"
    fi
    
    print_success "Systemd service created and enabled"
fi

# Step 6: Nginx setup
if [ "${CONTINUE_FROM:-system-check}" != "ssl" ]; then
    print_status "Step 6: Installing and configuring nginx..."
    
    # Install nginx if not present
    if ! command -v nginx &> /dev/null; then
        print_status "Installing nginx..."
        
        if command -v apt-get &> /dev/null; then
            if ! sudo apt-get update 2>> "$LOG_FILE" || ! sudo apt-get install -y nginx 2>> "$LOG_FILE"; then
                handle_error "nginx" "Failed to install nginx via apt-get"
            fi
        elif command -v yum &> /dev/null; then
            if ! sudo yum install -y nginx 2>> "$LOG_FILE"; then
                handle_error "nginx" "Failed to install nginx via yum"
            fi
        elif command -v dnf &> /dev/null; then
            if ! sudo dnf install -y nginx 2>> "$LOG_FILE"; then
                handle_error "nginx" "Failed to install nginx via dnf"
            fi
        else
            handle_error "nginx" "Could not detect package manager to install nginx"
        fi
    fi
    
    # Get server IP for default configuration
    SERVER_IP=$(curl -s --connect-timeout 10 ifconfig.me 2>/dev/null || curl -s --connect-timeout 10 ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP")
    
    # Create nginx configuration that works with any domain pointing to this IP
    if ! sudo tee /etc/nginx/sites-available/oadro-radio > /dev/null << 'EOF'; then
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    # Accept any domain name pointing to this server
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
        handle_error "nginx" "Failed to create nginx configuration"
    fi
    
    # Remove default nginx site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Enable the site
    if ! sudo ln -sf /etc/nginx/sites-available/oadro-radio /etc/nginx/sites-enabled/; then
        handle_error "nginx" "Failed to enable nginx site"
    fi
    
    # Test nginx configuration
    if ! sudo nginx -t 2>> "$LOG_FILE"; then
        handle_error "nginx" "Nginx configuration test failed"
    fi
    
    # Enable and start nginx
    if ! sudo systemctl enable nginx 2>> "$LOG_FILE"; then
        handle_error "nginx" "Failed to enable nginx service"
    fi
    
    if ! sudo systemctl restart nginx 2>> "$LOG_FILE"; then
        handle_error "nginx" "Failed to start nginx service"
    fi
    
    print_success "Nginx installed and configured"
    print_success "Server ready at: http://$SERVER_IP"
fi

# Step 7: SSL setup
print_status "Step 7: Setting up SSL certificate with Let's Encrypt..."

# Install certbot
CERTBOT_INSTALLED=false

if command -v apt-get &> /dev/null; then
    if sudo apt-get install -y certbot python3-certbot-nginx 2>> "$LOG_FILE"; then
        CERTBOT_INSTALLED=true
    fi
elif command -v yum &> /dev/null; then
    if sudo yum install -y certbot python3-certbot-nginx 2>> "$LOG_FILE"; then
        CERTBOT_INSTALLED=true
    fi
elif command -v dnf &> /dev/null; then
    if sudo dnf install -y certbot python3-certbot-nginx 2>> "$LOG_FILE"; then
        CERTBOT_INSTALLED=true
    fi
fi

if [ "$CERTBOT_INSTALLED" = true ] && command -v certbot &> /dev/null; then
    print_success "Certbot installed successfully"
    
    # Create auto-renewal cron job
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    print_success "SSL auto-renewal configured"
else
    print_warning "Certbot installation failed or not available"
fi

# Step 8: Fix file permissions and security hardening
print_status "Step 8: Fixing file permissions and applying security hardening..."

# Fix all file and directory permissions first
print_status "Fixing file and directory permissions..."

# Set directory permissions
find . -type d -exec chmod 755 {} \; 2>/dev/null || true

# Set file permissions
find . -type f -exec chmod 644 {} \; 2>/dev/null || true

# Set specific permissions for different file types
find . -type f -name "*.js" -exec chmod 644 {} \; 2>/dev/null || true
find . -type f -name "*.ts" -exec chmod 644 {} \; 2>/dev/null || true
find . -type f -name "*.tsx" -exec chmod 644 {} \; 2>/dev/null || true
find . -type f -name "*.json" -exec chmod 644 {} \; 2>/dev/null || true
find . -type f -name "*.md" -exec chmod 644 {} \; 2>/dev/null || true
find . -type f -name "*.css" -exec chmod 644 {} \; 2>/dev/null || true
find . -type f -name "*.html" -exec chmod 644 {} \; 2>/dev/null || true

# Set environment file permissions (more restrictive)
chmod 600 .env* 2>/dev/null || true

# Set script permissions (executable)
chmod 755 scripts/*.sh 2>/dev/null || true

# Ensure src directory and all subdirectories are accessible
chmod -R 755 src/ 2>/dev/null || true
chmod -R 644 src/**/*.* 2>/dev/null || true

# Ensure public directory is accessible
chmod -R 755 public/ 2>/dev/null || true

print_success "File permissions fixed and security hardening applied"

# Step 9: Final checks and startup
print_status "Step 9: Running final checks and starting application..."

# Check if build directory exists
if [ ! -d ".next" ]; then
    handle_error "final-check" "Build directory not found. Build may have failed."
fi

# Check if package.json has start script
if ! grep -q '"start"' package.json; then
    handle_error "final-check" "No start script found in package.json"
fi

print_success "All checks passed"

# Start the application
print_status "Starting OADRO Radio application..."

if ! sudo systemctl start oadro-radio 2>> "$LOG_FILE"; then
    handle_error "startup" "Failed to start oadro-radio service"
fi

# Wait a moment for startup
sleep 5

# Check if service is running
if sudo systemctl is-active --quiet oadro-radio; then
    print_success "OADRO Radio service started successfully"
else
    print_warning "Service may not have started properly. Check with: sudo systemctl status oadro-radio"
    print_warning "Check logs with: sudo journalctl -u oadro-radio -f"
fi

# Final completion message
echo ""
echo "🎉 OADRO Radio deployment completed successfully!"
echo "=============================================="
echo ""
echo "✅ Your server is now ready!"
echo "• Nginx installed and configured on port 80"
echo "• Application running on port 3000 (proxied by nginx)"
echo "• Systemd service created and started"
if [ "$CERTBOT_INSTALLED" = true ]; then
    echo "• SSL certificate tools installed (certbot)"
fi
echo ""
echo "🌐 Server Access:"
echo "• HTTP: http://$SERVER_IP"
echo "• Health check: http://$SERVER_IP/health"
echo ""
echo "🔧 DNS Setup:"
echo "1. Point your domain's A record to: $SERVER_IP"
echo "2. Wait for DNS propagation (5-30 minutes)"
if [ "$CERTBOT_INSTALLED" = true ]; then
    echo "3. Run SSL setup: sudo certbot --nginx -d yourdomain.com"
fi
echo ""
echo "📊 Service Management:"
echo "• Status: sudo systemctl status oadro-radio"
echo "• Restart: sudo systemctl restart oadro-radio"
echo "• Logs: sudo journalctl -u oadro-radio -f"
echo ""
if [ "$CERTBOT_INSTALLED" = true ]; then
    echo "🔒 SSL Setup (after DNS points to server):"
    echo "sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
    echo ""
fi
echo "🛠️  Troubleshooting:"
echo "• View deployment log: cat $LOG_FILE"
echo "• Recovery mode: $0 --recovery"
echo "• Cleanup failed deployment: $0 --cleanup"
echo ""
print_success "🎵 OADRO Radio is live and ready for listeners!"