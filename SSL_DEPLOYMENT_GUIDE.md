# OADRO Radio SSL Deployment Guide

## Overview
This document explains how the OADRO radio application is deployed with SSL/HTTPS using Nginx as a reverse proxy, PM2 for process management, and Let's Encrypt for SSL certificates.

## Architecture

```
Internet → Nginx (Port 80/443) → Node.js App (Port 3000)
```

### Components:
- **Nginx**: Web server handling SSL termination and reverse proxy
- **Let's Encrypt**: Free SSL certificate provider
- **PM2**: Process manager for Node.js application
- **Next.js**: React framework for the radio application

## SSL Setup Process

### 1. Initial Application Setup
```bash
# Application runs on port 3000 (configured in ecosystem.config.js)
PORT=3000
```

### 2. Nginx Installation & Configuration
```bash
# Install Nginx and Certbot
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### 3. Nginx Configuration
File: `/etc/nginx/sites-available/oadro.com`
```nginx
server {
    server_name oadro.com www.oadro.com;

    # Proxy all requests to Node.js app
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
        proxy_read_timeout 86400;
    }

    # Special handling for API routes (SSE support)
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_buffering off;  # Important for SSE
    }

    # SSL configuration (added by Certbot)
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/oadro.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/oadro.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP to HTTPS redirect
server {
    if ($host = oadro.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name oadro.com www.oadro.com;
    return 404;
}
```

### 4. SSL Certificate Installation
```bash
# Automatic SSL setup with Certbot
sudo certbot --nginx -d oadro.com
```

## PM2 Configuration

### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'oadro-radio',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### PM2 Commands
```bash
# Start application
sudo pm2 start ecosystem.config.js

# Restart application
sudo pm2 restart oadro-radio

# View status
sudo pm2 status

# View logs
sudo pm2 logs oadro-radio

# Save PM2 configuration
sudo pm2 save

# Setup auto-startup
sudo pm2 startup
```

## Security Features

### Middleware Security Headers
The application includes middleware that adds:
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- X-XSS-Protection: 1; mode=block

### Rate Limiting
- Global: 200 requests per hour per IP
- API endpoints: Specific limits per endpoint
- Radio stream: 1000 requests per minute (for concurrent connections)

## Troubleshooting

### Common Issues

1. **Port 80 already in use**
   ```bash
   # Check what's using port 80
   sudo ss -tlnp | grep :80
   # Kill the process if needed
   sudo kill -9 <PID>
   ```

2. **SSL certificate renewal**
   ```bash
   # Test renewal
   sudo certbot renew --dry-run
   # Force renewal
   sudo certbot renew --force-renewal
   ```

3. **Nginx configuration test**
   ```bash
   sudo nginx -t
   ```

4. **PM2 application not starting**
   ```bash
   # Check logs
   sudo pm2 logs oadro-radio
   # Restart with environment update
   sudo pm2 restart oadro-radio --update-env
   ```

### Log Locations
- **Nginx logs**: `/var/log/nginx/`
- **PM2 logs**: `/home/ubuntu/logs/`
- **SSL logs**: `/var/log/letsencrypt/`
- **Application logs**: PM2 managed in `/home/ubuntu/logs/`

## Maintenance

### Regular Tasks
1. **Monitor SSL certificate expiration** (auto-renewed by Certbot)
2. **Check PM2 application status** regularly
3. **Monitor server resources** (memory, CPU)
4. **Review application logs** for errors

### Backup Important Files
- `/etc/nginx/sites-available/oadro.com`
- `/home/ubuntu/ecosystem.config.js`
- `/home/ubuntu/.env.local`
- SSL certificates (auto-backed up by Certbot)

## URLs and Access

- **Production URL**: https://oadro.com
- **HTTP redirect**: http://oadro.com → https://oadro.com
- **Local application**: http://localhost:3000 (internal only)
- **Nginx status**: http://localhost:80 (internal only)

## File Structure
```
/home/ubuntu/
├── ecosystem.config.js          # PM2 configuration
├── package.json                 # Node.js dependencies
├── .env.local                   # Environment variables
├── src/                         # Application source code
│   ├── middleware.ts           # Security middleware
│   └── app/                    # Next.js app directory
├── .next/                      # Built application
└── logs/                       # Application logs

/etc/nginx/
├── sites-available/oadro.com   # Nginx configuration
└── sites-enabled/oadro.com     # Symlink to configuration

/etc/letsencrypt/
└── live/oadro.com/             # SSL certificates
```

## Environment Variables
```bash
# Production environment
NODE_ENV=production
PORT=3000

# Add other environment variables as needed in .env.local
```

This setup provides a robust, secure, and scalable deployment for the OADRO radio application with automatic SSL certificate management and process monitoring.