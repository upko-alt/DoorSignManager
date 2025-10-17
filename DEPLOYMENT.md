# DigitalOcean Droplet Deployment Guide

This guide walks you through deploying the E-Paper Door Sign Dashboard to a DigitalOcean Droplet.

## Prerequisites

Before starting, you'll need:
- A DigitalOcean account
- A domain name (optional, but recommended for SSL)
- Your e-paper API credentials

## Step 1: Create a Droplet

1. **Log into DigitalOcean** and click "Create" → "Droplets"

2. **Choose an image:**
   - Select **Ubuntu 22.04 LTS** (recommended)

3. **Choose a plan:**
   - **Basic** plan is fine
   - **Regular CPU** with at least **2GB RAM** ($12/month recommended)
   - 1GB can work but may be tight

4. **Choose a datacenter region:**
   - Select one closest to your users

5. **Authentication:**
   - Add your SSH key (recommended) OR
   - Use password authentication

6. **Finalize:**
   - Give your droplet a name (e.g., "epaper-dashboard")
   - Click "Create Droplet"

7. **Note your Droplet's IP address** (shown after creation)

## Step 2: Initial Server Setup

### Connect via SSH

```bash
# If using SSH key:
ssh root@your_droplet_ip

# If using password:
ssh root@your_droplet_ip
# Enter password when prompted
```

### Create a Non-Root User (Recommended)

```bash
# Create a new user
adduser deploy

# Add to sudo group
usermod -aG sudo deploy

# Switch to new user
su - deploy
```

## Step 3: Install Dependencies

### Run the Automated Setup Script

The easiest way is to use our setup script:

```bash
# Download and run the setup script
curl -o setup.sh https://raw.githubusercontent.com/yourusername/yourrepo/main/deploy/setup-server.sh
chmod +x setup.sh
sudo ./setup.sh
```

**OR** follow manual steps below:

### Manual Installation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

## Step 4: Set Up PostgreSQL Database

```bash
# Switch to postgres user
sudo -i -u postgres

# Create database and user
createdb epaper_dashboard
createuser --interactive --pwprompt epaper_user
# Enter a secure password when prompted
# Answer 'n' to all superuser questions

# Grant privileges
psql
GRANT ALL PRIVILEGES ON DATABASE epaper_dashboard TO epaper_user;
\q

# Exit postgres user
exit
```

**Save your database credentials - you'll need them for the .env file!**

## Step 5: Deploy Your Application

### Clone Your Repository

```bash
# Create app directory
cd ~
git clone https://github.com/yourusername/yourrepo.git epaper-dashboard
cd epaper-dashboard
```

**OR** upload via SCP:

```bash
# From your local machine (where you downloaded the zip):
scp -r /path/to/your/app/* deploy@your_droplet_ip:~/epaper-dashboard/
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

**Required environment variables:**

```env
# Database
DATABASE_URL=postgresql://epaper_user:your_db_password@localhost:5432/epaper_dashboard

# Session
SESSION_SECRET=your_very_long_random_string_here

# E-Paper API (get these from your e-paper provider)
EPAPER_IMPORT_URL=https://your-epaper-api.com/import
EPAPER_IMPORT_KEY=your_import_api_key
EPAPER_EXPORT_URL=https://your-epaper-api.com/export
EPAPER_EXPORT_KEY=your_export_api_key

# Environment
NODE_ENV=production
```

**Generate a secure SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Build and Migrate Database

```bash
# Build the application
npm run build

# Push database schema
npm run db:push
```

## Step 6: Configure PM2 Process Manager

```bash
# Copy PM2 config
cp ecosystem.config.js ~/epaper-dashboard/

# Start the application with PM2
pm2 start ecosystem.config.js

# Configure PM2 to start on boot
pm2 startup
# Copy and run the command it outputs

pm2 save
```

**Useful PM2 commands:**
```bash
pm2 status          # Check app status
pm2 logs            # View logs
pm2 restart all     # Restart app
pm2 stop all        # Stop app
```

## Step 7: Configure Nginx

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/epaper-dashboard
```

**Paste this configuration** (see `deploy/nginx.conf` for the template):

```nginx
server {
    listen 80;
    server_name your_domain.com;  # Replace with your domain or IP

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable the Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/epaper-dashboard /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Step 8: Configure Firewall

```bash
# Allow SSH
sudo ufw allow OpenSSH

# Allow Nginx
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 9: Set Up SSL/HTTPS (Recommended)

If you have a domain name:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your_domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

Certbot will automatically update your Nginx config for HTTPS!

## Step 10: Verify Deployment

1. **Visit your site:**
   - `http://your_domain.com` OR
   - `http://your_droplet_ip`

2. **Test login:**
   - Default admin: username `admin`, password `admin123`
   - **IMPORTANT: Change this password immediately!**

3. **Check logs if issues:**
   ```bash
   pm2 logs
   sudo tail -f /var/log/nginx/error.log
   ```

## Updating Your Application

When you need to deploy updates:

```bash
# Pull latest code
cd ~/epaper-dashboard
git pull

# Install any new dependencies
npm install

# Rebuild
npm run build

# Run database migrations if needed
npm run db:push

# Restart app
pm2 restart all
```

## Troubleshooting

### App won't start
```bash
# Check PM2 logs
pm2 logs

# Check environment variables
cat .env

# Restart PM2
pm2 restart all
```

### Database connection errors
```bash
# Test PostgreSQL connection
psql -U epaper_user -d epaper_dashboard

# Check DATABASE_URL in .env
```

### Nginx errors
```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Can't access from browser
```bash
# Check firewall
sudo ufw status

# Make sure app is running
pm2 status

# Check if port 5000 is in use
sudo netstat -tlnp | grep :5000
```

## Security Recommendations

1. **Change default admin password immediately**
2. **Keep your system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
3. **Use SSH keys instead of passwords**
4. **Enable automatic security updates:**
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```
5. **Monitor your logs regularly:**
   ```bash
   pm2 logs
   ```

## Backup Strategy

### Database Backup
```bash
# Create backup script
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
pg_dump -U epaper_user epaper_dashboard > $BACKUP_DIR/epaper_$(date +%Y%m%d_%H%M%S).sql
# Keep only last 7 backups
ls -t $BACKUP_DIR/epaper_*.sql | tail -n +8 | xargs -r rm
EOF

chmod +x ~/backup-db.sh

# Run daily via cron
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-db.sh") | crontab -
```

## Support

If you run into issues:
1. Check the logs: `pm2 logs`
2. Review this guide's troubleshooting section
3. Verify all environment variables are set correctly
4. Ensure PostgreSQL is running: `sudo systemctl status postgresql`

---

**Your e-paper dashboard should now be live! 🎉**
