#!/bin/bash

# Server Deployment Script for OADRO Radio
# Run this script on your dedicated server

set -e

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

# Configuration
APP_NAME="oadro-radio"
APP_DIR="/var/www/$APP_NAME"
SERVICE_NAME="$APP_NAME"
NGINX_SITE="$APP_NAME"
USER="www-data"

echo "🚀 Deploying OADRO Radio to production server..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Update system packages
print_status "Updating system packages..."
apt-get update -y

# Install Node.js 18.x if not installed
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 18 ]; then
    print_status "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

print_success "Node.js version: $(node -v)"

# Install nginx if not installed
if ! command -v nginx &> /dev/null; then
    print_status "Installing nginx..."
    apt-get install -y nginx
fi

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    npm install -g pm2
fi

# Create application directory
print_status "Setting up application directory..."
mkdir -p $APP_DIR
chown -R $USER:$USER $APP_DIR

# Copy application files (assuming they're in current directory)
print_status "Copying application files..."
cp -r . $APP_DIR/
chown -R $USER:$USER $APP_DIR

# Install dependencies and build
print_status "Installing dependencies and building application..."
cd $APP_DIR
sudo -u $USER npm ci --only=production
sudo -u $USER npm run build

# Create PM2 ecosystem file
print_status "Creating PM2 configuration..."
cat > $APP_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
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
chown -R $USER:$USER $APP_DIR/logs

# Create nginx configuration
print_status "Configuring nginx..."
cat > /etc/nginx/sites-available/$NGINX_SITE << EOF
server {
    listen 80;
    server_name _;  # Replace with your domain

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

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/$NGINX_SITE /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Start services
print_status "Starting services..."
systemctl enable nginx
systemctl restart nginx

# Start application with PM2
cd $APP_DIR
sudo -u $USER pm2 start ecosystem.config.js
sudo -u $USER pm2 save
sudo -u $USER pm2 startup

print_success "🎉 Deployment completed successfully!"

echo ""
echo "📋 Deployment Summary:"
echo "  - Application directory: $APP_DIR"
echo "  - Service name: $SERVICE_NAME"
echo "  - Port: 3000 (proxied through nginx on port 80)"
echo "  - Logs: $APP_DIR/logs/"
echo ""
echo "🔧 Management Commands:"
echo "  - Check status: pm2 status"
echo "  - View logs: pm2 logs $SERVICE_NAME"
echo "  - Restart app: pm2 restart $SERVICE_NAME"
echo "  - Stop app: pm2 stop $SERVICE_NAME"
echo ""
echo "🌐 Next Steps:"
echo "1. Update your domain's A record to point to this server's IP"
echo "2. Update nginx config with your domain name:"
echo "   sudo nano /etc/nginx/sites-available/$NGINX_SITE"
echo "3. Install SSL certificate:"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d yourdomain.com"
echo ""
echo "🎵 Your OADRO Radio is now live!"

exit 0