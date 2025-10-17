# Quick Start Deployment Guide

**Fast track guide for experienced developers**

## Prerequisites
- DigitalOcean account
- Domain name (optional but recommended)
- E-paper API credentials

## 1. Create Droplet
```bash
# Ubuntu 22.04 LTS, 2GB RAM minimum
# Note the IP address
```

## 2. Initial Setup
```bash
# SSH into droplet
ssh root@YOUR_IP

# Download and run setup script
curl -o setup.sh https://raw.githubusercontent.com/yourusername/yourrepo/main/deploy/setup-server.sh
chmod +x setup.sh
sudo ./setup.sh
```

## 3. Database Setup
```bash
sudo -i -u postgres
createdb epaper_dashboard
createuser -P epaper_user  # Set password when prompted
psql -c "GRANT ALL PRIVILEGES ON DATABASE epaper_dashboard TO epaper_user;"
exit
```

## 4. Deploy Application
```bash
# Clone repo
git clone YOUR_REPO_URL epaper-dashboard
cd epaper-dashboard

# Configure environment
cp .env.example .env
nano .env  # Update DATABASE_URL and API credentials

# Install and build
npm install
npm run build
npm run db:push
```

## 5. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

## 6. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/epaper-dashboard
# Paste config from deploy/nginx.conf
# Update server_name with your domain

sudo ln -s /etc/nginx/sites-available/epaper-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Set Up SSL (if using domain)
```bash
sudo certbot --nginx -d your_domain.com -d www.your_domain.com
```

## 8. Verify
Visit: `https://your_domain.com` or `http://YOUR_IP`

Default login: `admin` / `admin123` ⚠️ Change immediately!

## Essential Commands

```bash
# App management
pm2 status
pm2 logs
pm2 restart all

# Database backup
pg_dump -U epaper_user epaper_dashboard > backup.sql

# Update app
cd ~/epaper-dashboard
git pull
npm install
npm run build
npm run db:push
pm2 restart all
```

## Troubleshooting

**App won't start:** Check `pm2 logs`  
**Database errors:** Verify DATABASE_URL in `.env`  
**Nginx errors:** `sudo nginx -t` and check `/var/log/nginx/error.log`  
**SSL issues:** Check DNS propagation, run `sudo certbot renew --dry-run`

---

For detailed instructions, see [DEPLOYMENT.md](../DEPLOYMENT.md)
