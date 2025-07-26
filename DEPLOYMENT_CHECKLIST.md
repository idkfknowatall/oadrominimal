# 🚀 OADRO Radio - Production Deployment Checklist

## ✅ Pre-Deployment Checklist

### Local Preparation
- [ ] Update `.env.production` with your domain name
- [ ] Replace `your-domain.com` with your actual domain
- [ ] Verify all environment variables are correct
- [ ] Test the application locally with `npm run build && npm start`

### Discord OAuth Setup
- [ ] Go to Discord Developer Portal
- [ ] Update OAuth2 redirect URI to: `https://your-domain.com/api/auth/callback/discord`
- [ ] Save the changes

### Domain & DNS
- [ ] Domain name purchased and configured
- [ ] DNS A record pointing to your server's IP address
- [ ] DNS propagation completed (check with `nslookup your-domain.com`)

## 🖥️ Server Deployment

### Method 1: Direct Deployment (Recommended)

1. **Create deployment package:**
   ```bash
   # On Windows (PowerShell)
   tar -czf oadro-radio-production.tar.gz --exclude=node_modules --exclude=.git --exclude=.next .
   
   # Or create a zip file and upload via FTP/SCP
   ```

2. **Upload to server:**
   ```bash
   scp oadro-radio-production.tar.gz user@your-server-ip:/home/user/
   ```

3. **Deploy on server:**
   ```bash
   ssh user@your-server-ip
   tar -xzf oadro-radio-production.tar.gz
   cd oadro-radio-production/
   cp .env.production .env.local
   chmod +x scripts/deploy-server.sh
   sudo ./scripts/deploy-server.sh
   ```

### Method 2: Git Deployment

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Production ready deployment"
   git push origin main
   ```

2. **Clone on server:**
   ```bash
   ssh user@your-server-ip
   git clone https://github.com/yourusername/your-repo.git oadro-radio
   cd oadro-radio
   cp .env.production .env.local
   chmod +x scripts/deploy-server.sh
   sudo ./scripts/deploy-server.sh
   ```

## 🔧 Post-Deployment Verification

### Application Health
- [ ] Visit `http://your-server-ip` - should show the radio player
- [ ] Check PM2 status: `pm2 status`
- [ ] Check application logs: `pm2 logs oadro-radio`
- [ ] Verify radio stream is playing

### Nginx Configuration
- [ ] Test nginx config: `sudo nginx -t`
- [ ] Check nginx status: `sudo systemctl status nginx`
- [ ] Update server_name in nginx config with your domain

### SSL Certificate
- [ ] Install certbot: `sudo apt install certbot python3-certbot-nginx`
- [ ] Get SSL certificate: `sudo certbot --nginx -d your-domain.com`
- [ ] Test HTTPS: `https://your-domain.com`
- [ ] Verify auto-renewal: `sudo certbot renew --dry-run`

### Discord Authentication
- [ ] Test Discord login functionality
- [ ] Verify voting system works
- [ ] Check that callbacks work with HTTPS

## 🎵 Final Testing

### Functionality Tests
- [ ] Radio stream plays correctly
- [ ] Volume controls work
- [ ] Song metadata updates in real-time
- [ ] Discord login works
- [ ] Song voting works
- [ ] Social media links work
- [ ] Mobile responsiveness
- [ ] PWA installation works

### Performance Tests
- [ ] Page load speed is acceptable
- [ ] No console errors in browser
- [ ] Memory usage is stable
- [ ] CPU usage is reasonable

## 📊 Monitoring Setup

### Application Monitoring
- [ ] PM2 monitoring: `pm2 monit`
- [ ] Log rotation configured
- [ ] Disk space monitoring
- [ ] Memory usage alerts

### Backup Strategy
- [ ] Database backups (if applicable)
- [ ] Application code backups
- [ ] SSL certificate backups
- [ ] Environment variables backup

## 🔄 Maintenance

### Regular Tasks
- [ ] Monitor application logs weekly
- [ ] Check SSL certificate expiration monthly
- [ ] Update dependencies quarterly
- [ ] Security updates as needed

### Update Procedure
- [ ] Test updates in staging environment
- [ ] Backup current production version
- [ ] Deploy updates during low-traffic periods
- [ ] Verify functionality after updates

## 🆘 Emergency Contacts & Procedures

### Rollback Procedure
```bash
# If something goes wrong, rollback to previous version
cd /var/www/oadro-radio
sudo cp -r /var/backups/oadro-radio-YYYYMMDD/* .
pm2 restart oadro-radio
sudo systemctl restart nginx
```

### Emergency Contacts
- Server provider support
- Domain registrar support
- Discord Developer Portal
- Firebase Console access

---

## 🎉 Deployment Complete!

Once all items are checked off:

1. **Your radio station is live at:** `https://your-domain.com`
2. **Admin access via:** PM2 dashboard and server SSH
3. **Monitoring:** Check logs regularly with `pm2 logs oadro-radio`

**🎧 Congratulations! Your OADRO Radio is broadcasting to the world!**