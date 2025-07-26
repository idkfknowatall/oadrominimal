# 🚀 OADRO Radio - Production Deployment Guide

This guide will help you deploy your OADRO Radio application to your dedicated server.

## 📋 Prerequisites

- Dedicated server with Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access to the server
- Domain name pointing to your server's IP address
- Basic knowledge of Linux command line

## 🎯 Quick Deployment (Recommended)

### Step 1: Prepare Your Local Environment

1. **Build the production version locally:**
   ```bash
   chmod +x scripts/build-production.sh
   ./scripts/build-production.sh
   ```

2. **Update production environment variables:**
   - Edit `.env.production` file
   - Replace `your-domain.com` with your actual domain
   - Update Discord OAuth callback URL in Discord Developer Portal

### Step 2: Upload to Your Server

1. **Create a deployment package:**
   ```bash
   # Create a clean deployment package
   tar -czf oadro-radio-production.tar.gz \
     --exclude=node_modules \
     --exclude=.git \
     --exclude=.next \
     --exclude=logs \
     .
   ```

2. **Upload to your server:**
   ```bash
   scp oadro-radio-production.tar.gz user@your-server-ip:/home/user/
   ```

### Step 3: Deploy on Server

1. **SSH into your server:**
   ```bash
   ssh user@your-server-ip
   ```

2. **Extract and deploy:**
   ```bash
   # Extract the files
   tar -xzf oadro-radio-production.tar.gz
   cd oadro-radio-production/
   
   # Copy production environment
   cp .env.production .env.local
   
   # Make deployment script executable and run
   chmod +x scripts/deploy-server.sh
   sudo ./scripts/deploy-server.sh
   ```

## 🐳 Alternative: Docker Deployment

If you prefer Docker, you can use the included Docker configuration:

### Step 1: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 2: Deploy with Docker

```bash
# Copy production environment
cp .env.production .env.local

# Build and start containers
docker-compose up -d --build

# Check status
docker-compose ps
```

## 🔧 Post-Deployment Configuration

### 1. Update Discord OAuth Settings

In your Discord Developer Portal:
1. Go to your application settings
2. Navigate to OAuth2 → General
3. Update the redirect URI to: `https://your-domain.com/api/auth/callback/discord`

### 2. Configure Domain in Nginx

```bash
# Edit nginx configuration
sudo nano /etc/nginx/sites-available/oadro-radio

# Replace server_name _; with:
# server_name your-domain.com www.your-domain.com;

# Restart nginx
sudo systemctl restart nginx
```

### 3. Install SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 📊 Monitoring and Management

### Application Management (PM2)

```bash
# Check application status
pm2 status

# View logs
pm2 logs oadro-radio

# Restart application
pm2 restart oadro-radio

# Stop application
pm2 stop oadro-radio

# Monitor in real-time
pm2 monit
```

### System Monitoring

```bash
# Check nginx status
sudo systemctl status nginx

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
free -h
```

## 🔄 Updates and Maintenance

### Updating the Application

1. **On your local machine:**
   ```bash
   # Pull latest changes
   git pull origin main
   
   # Build production version
   ./scripts/build-production.sh
   
   # Create deployment package
   tar -czf oadro-radio-update.tar.gz \
     --exclude=node_modules \
     --exclude=.git \
     --exclude=logs \
     .
   ```

2. **On your server:**
   ```bash
   # Upload new version
   scp oadro-radio-update.tar.gz user@your-server-ip:/tmp/
   
   # SSH and update
   ssh user@your-server-ip
   cd /var/www/oadro-radio
   
   # Backup current version
   sudo cp -r . /var/backups/oadro-radio-$(date +%Y%m%d)
   
   # Extract new version
   sudo tar -xzf /tmp/oadro-radio-update.tar.gz
   
   # Install dependencies and rebuild
   sudo -u www-data npm ci --only=production
   sudo -u www-data npm run build
   
   # Restart application
   pm2 restart oadro-radio
   ```

## 🆘 Troubleshooting

### Common Issues

1. **Application won't start:**
   ```bash
   # Check logs
   pm2 logs oadro-radio
   
   # Check if port 3000 is in use
   sudo netstat -tlnp | grep :3000
   
   # Restart with fresh environment
   pm2 delete oadro-radio
   pm2 start ecosystem.config.js
   ```

2. **Nginx errors:**
   ```bash
   # Test nginx configuration
   sudo nginx -t
   
   # Check nginx status
   sudo systemctl status nginx
   
   # Restart nginx
   sudo systemctl restart nginx
   ```

3. **SSL certificate issues:**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificate
   sudo certbot renew
   
   # Test SSL configuration
   curl -I https://your-domain.com
   ```

4. **High memory usage:**
   ```bash
   # Check memory usage
   free -h
   
   # Restart application to clear memory
   pm2 restart oadro-radio
   
   # Adjust PM2 memory limit in ecosystem.config.js
   ```

### Performance Optimization

1. **Enable Gzip compression** (already configured in nginx)
2. **Set up CDN** for static assets if needed
3. **Monitor application performance:**
   ```bash
   # Install monitoring tools
   sudo apt install htop iotop
   
   # Monitor in real-time
   htop
   pm2 monit
   ```

## 🎵 Features Available After Deployment

- ✅ Live radio streaming with real-time metadata
- ✅ Song voting system with Discord authentication
- ✅ Real-time listener count
- ✅ Song history and upcoming tracks
- ✅ Social media integration
- ✅ Mobile-responsive design
- ✅ PWA capabilities
- ✅ SSL encryption
- ✅ Automatic restarts and monitoring

## 📞 Support

If you encounter issues:

1. Check the application logs: `pm2 logs oadro-radio`
2. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify your environment variables in `.env.local`
4. Ensure your domain DNS is properly configured
5. Check Discord OAuth settings match your production URL

---

**🎧 Your OADRO Radio is ready to broadcast to the world!**

Visit your domain to see your radio station live!