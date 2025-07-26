#!/bin/bash

# OADRO.com Production Deployment Script
# This script deploys your radio application to oadro.com

set -e

echo "🚀 Deploying OADRO Radio to oadro.com..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration for oadro.com
DOMAIN="oadro.com"
APP_NAME="oadro-radio"
APP_DIR="/var/www/$APP_NAME"

print_status "Starting deployment for $DOMAIN..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt-get update -y

# Install Node.js 18.x
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 18 ]; then
    print_status "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

print_success "Node.js version: $(node -v)"

# Install nginx
if ! command -v nginx &> /dev/null; then
    print_status "Installing nginx..."
    apt-get install -y nginx
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    npm install -g pm2
fi

# Create application directory
print_status "Setting up application directory..."
mkdir -p $APP_DIR
chown -R www-data:www-data $APP_DIR

# Copy application files
print_status "Installing application..."
cp -r . $APP_DIR/
chown -R www-data:www-data $APP_DIR

# Set up environment
cd $APP_DIR
cp .env.production .env.local

# Install dependencies and build
print_status "Building application..."
sudo -u www-data npm ci --only=production
sudo -u www-data npm run build

# Create PM2 ecosystem
print_status "Configuring PM2..."
cat > $APP_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'npm',
    args: 'start',
    cwd: '$APP_DIR',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '$APP_DIR/logs/err.log',
    out_file: '$APP_DIR/logs/out.log',
    log_file: '$APP_DIR/logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p $APP_DIR/logs
chown -R www-data:www-data $APP_DIR/logs

# Configure nginx for oadro.com
print_status "Configuring nginx for $DOMAIN..."
cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss: ws:;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Start services
print_status "Starting services..."
systemctl enable nginx
systemctl restart nginx

# Start application
cd $APP_DIR
sudo -u www-data pm2 start ecosystem.config.js
sudo -u www-data pm2 save
sudo -u www-data pm2 startup

print_success "🎉 Deployment completed successfully!"

echo ""
echo "📋 Deployment Summary:"
echo "  - Domain: https://$DOMAIN"
echo "  - Application: $APP_DIR"
echo "  - Logs: $APP_DIR/logs/"
echo ""
echo "🔧 Next Steps:"
echo "1. Install SSL certificate:"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "2. Test your site:"
echo "   curl -I http://$DOMAIN"
echo ""
echo "3. Monitor application:"
echo "   pm2 status"
echo "   pm2 logs $APP_NAME"
echo ""
echo "🎵 Your OADRO Radio is now live at http://$DOMAIN!"
echo "   After SSL setup: https://$DOMAIN"

exit 0