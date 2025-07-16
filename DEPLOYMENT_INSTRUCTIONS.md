# OADRO Radio - Production Deployment Instructions

## 📦 Package Contents

This zip file contains all the production-ready files for your OADRO Radio application:

### 🗂️ Included Files:
- **`src/`** - Application source code (clean, production-only)
- **`public/`** - Static assets (icons, images)
- **`scripts/`** - Deployment scripts with error recovery
- **`package.json`** - Minimal production dependencies only
- **Configuration files** - Next.js, TypeScript, Tailwind CSS configs
- **Environment template** - `.env.example`

### 🧹 Cleaned Up:
- ❌ All Firebase files removed
- ❌ All test files removed  
- ❌ All development dependencies removed
- ❌ All unnecessary scripts removed
- ✅ Only essential production files included

### 🚀 Quick Deployment Steps

1. **Upload and Extract**
   ```bash
   # Upload the zip file to your server
   scp oadro-radio-production.zip user@your-server:/home/user/
   
   # SSH into your server
   ssh user@your-server
   
   # Extract the files
   unzip oadro-radio-production.zip
   cd oadro-radio-production/
   ```

2. **Run Deployment Script**
   ```bash
   # Make script executable
   chmod +x scripts/deploy-production.sh
   
   # Run full deployment
   ./scripts/deploy-production.sh
   ```

3. **Point Your DNS**
   - The script will show your server IP (e.g., `123.45.67.89`)
   - Point your domain's A record to that IP
   - Wait 5-30 minutes for DNS propagation

4. **Add SSL Certificate** (after DNS propagation)
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

## 🛠️ Advanced Deployment Options

### Recovery Options
```bash
# Check dependencies only
./scripts/deploy-production.sh --check-deps

# Recovery mode (skip completed steps)
./scripts/deploy-production.sh --recovery

# Continue from specific step
./scripts/deploy-production.sh --continue-from=nginx

# Clean up failed deployment
./scripts/deploy-production.sh --cleanup
```

### Manual Steps (if script fails)

1. **Install Node.js 18+**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # CentOS/RHEL
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs
   ```

2. **Install Dependencies**
   ```bash
   npm install --production
   npm run build
   ```

3. **Install Nginx**
   ```bash
   # Ubuntu/Debian
   sudo apt-get update && sudo apt-get install -y nginx
   
   # CentOS/RHEL
   sudo yum install -y nginx
   ```

4. **Create Systemd Service**
   ```bash
   sudo cp scripts/oadro-radio.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable oadro-radio
   sudo systemctl start oadro-radio
   ```

## 🔧 Configuration

### Environment Variables
Edit `.env.production` with your settings:
```env
NODE_ENV=production
NEXT_PUBLIC_RADIO_STREAM_URL=https://radio.oadro.com/radio/8000/radio.mp3
NEXT_PUBLIC_RADIO_API_URL=https://radio.oadro.com/api
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Service Management
```bash
# Check status
sudo systemctl status oadro-radio

# View logs
sudo journalctl -u oadro-radio -f

# Restart service
sudo systemctl restart oadro-radio
```

## 🌐 What You Get

After successful deployment:

- **HTTP Access**: `http://your-domain.com`
- **HTTPS Access**: `https://your-domain.com` (after SSL setup)
- **Health Check**: `http://your-domain.com/health`
- **Automatic startup** on server reboot
- **Nginx reverse proxy** with security headers
- **Gzip compression** enabled
- **SSL auto-renewal** configured

## 🎵 Features Included

- **Live Radio Stream** with real-time metadata
- **Song History** and upcoming tracks
- **Audio Controls** (play/pause, volume)
- **Fake Listener Count** (9-18 listeners, updates hourly)
- **Social Media Buttons**:
  - Request a Song (Google Form)
  - Support (Ko-fi)
  - Discord
  - Twitter
  - Instagram
  - TikTok
- **Responsive Design** for all devices
- **Real-time Updates** via Server-Sent Events

## 🆘 Troubleshooting

### Common Issues

1. **Build Fails**
   - Check Node.js version: `node -v` (need 18+)
   - Clear cache: `npm cache clean --force`
   - Delete node_modules: `rm -rf node_modules && npm install`

2. **Service Won't Start**
   - Check logs: `sudo journalctl -u oadro-radio -f`
   - Verify port 3000 is free: `sudo netstat -tlnp | grep :3000`
   - Check file permissions: `ls -la`

3. **Nginx Issues**
   - Test config: `sudo nginx -t`
   - Check status: `sudo systemctl status nginx`
   - View error logs: `sudo tail -f /var/log/nginx/error.log`

4. **SSL Certificate Issues**
   - Ensure DNS is pointing to server
   - Check domain accessibility: `curl -I http://yourdomain.com`
   - Retry certbot: `sudo certbot --nginx -d yourdomain.com`

### Recovery Commands
```bash
# View deployment log
cat /tmp/oadro-deploy.log

# Clean up and retry
./scripts/deploy-production.sh --cleanup
./scripts/deploy-production.sh

# Manual service restart
sudo systemctl restart oadro-radio nginx
```

## 📞 Support

If you encounter issues:

1. Check the deployment log: `/tmp/oadro-deploy.log`
2. Use recovery mode: `./scripts/deploy-production.sh --recovery`
3. Review this documentation
4. Check service logs: `sudo journalctl -u oadro-radio -f`

---

**🎧 Your OADRO Radio is ready to broadcast to the world!**