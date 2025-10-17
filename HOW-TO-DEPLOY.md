# 🚀 How to Download & Deploy Your E-Paper Dashboard

This guide shows you how to get your app from Replit to your DigitalOcean Droplet.

## Step 1: Download Your App from Replit

You have two options to get your code from Replit:

### Option A: Download as ZIP (Easiest)

1. In your Replit project, look for the **Download** or **Export** option
2. Download the entire project as a ZIP file
3. Extract the ZIP on your local computer
4. You now have all the code!

### Option B: Clone via Git (Recommended)

1. **In Replit**, go to the **Shell** tab and run:
   ```bash
   git remote -v
   ```
   This shows your Git repository URL (if connected to GitHub)

2. **On your local computer**, clone the repo:
   ```bash
   git clone <your-repo-url>
   cd <your-project-name>
   ```

If you haven't connected to GitHub yet:
1. Create a GitHub repository
2. In Replit, use the Git pane to connect and push your code
3. Then clone from GitHub to your computer

## Step 2: Prepare for Deployment

Before deploying, gather this information:

### Required Credentials

✅ **DigitalOcean Account** - Sign up at https://digitalocean.com  
✅ **Domain Name (Optional)** - For SSL/HTTPS (recommended but not required)  
✅ **E-Paper API Credentials:**
   - EPAPER_IMPORT_URL
   - EPAPER_IMPORT_KEY  
   - EPAPER_EXPORT_URL
   - EPAPER_EXPORT_KEY

Contact your e-paper hardware provider for API credentials if you don't have them.

### Database Password

You'll need to create a secure PostgreSQL password. Generate one:

**On Mac/Linux:**
```bash
openssl rand -base64 32
```

**On Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))
```

Save this password - you'll use it during setup!

## Step 3: Create Your DigitalOcean Droplet

1. **Log into DigitalOcean** → Click **"Create"** → **"Droplets"**

2. **Choose Configuration:**
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic
   - **CPU:** Regular
   - **Size:** $12/month (2GB RAM) - Recommended minimum
   - **Datacenter:** Choose closest to your location

3. **Authentication:**
   - Add your SSH key (recommended) OR
   - Use password authentication

4. **Create Droplet**
   - Give it a name: `epaper-dashboard`
   - Click "Create Droplet"

5. **Note Your IP Address**
   - Copy the IP address shown after creation
   - Example: `165.232.123.45`

## Step 4: Upload Your Code to Droplet

### Option A: Using Git (Recommended)

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Clone your repository
git clone <your-repo-url> epaper-dashboard
cd epaper-dashboard
```

### Option B: Upload via SCP

**From your local computer** (where you extracted the ZIP):

```bash
# Upload files to droplet
scp -r /path/to/your/app/* root@YOUR_DROPLET_IP:~/epaper-dashboard/

# Then SSH in
ssh root@YOUR_DROPLET_IP
cd epaper-dashboard
```

## Step 5: Run Automated Setup

Once you're SSH'd into your Droplet with your code uploaded:

```bash
# Make setup script executable
chmod +x deploy/setup-server.sh

# Run setup script (installs Node.js, PostgreSQL, Nginx, PM2)
sudo ./deploy/setup-server.sh
```

This will automatically install:
- ✅ Node.js 20
- ✅ PostgreSQL
- ✅ Nginx
- ✅ PM2 process manager
- ✅ Certbot (for SSL)
- ✅ Firewall configuration

## Step 6: Set Up Database

```bash
# Switch to postgres user
sudo -i -u postgres

# Create database
createdb epaper_dashboard

# Create user (you'll be prompted for password - use the one you generated!)
createuser -P epaper_user

# Grant permissions
psql -c "GRANT ALL PRIVILEGES ON DATABASE epaper_dashboard TO epaper_user;"

# Exit postgres user
exit
```

## Step 7: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

**Fill in these values:**

```env
# Database - Use the password you created above
DATABASE_URL=postgresql://epaper_user:YOUR_DB_PASSWORD@localhost:5432/epaper_dashboard

# Session - Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=paste_generated_secret_here

# E-Paper API (from your provider)
EPAPER_IMPORT_URL=https://your-api.com/import
EPAPER_IMPORT_KEY=your_key
EPAPER_EXPORT_URL=https://your-api.com/export  
EPAPER_EXPORT_KEY=your_key

# Environment
NODE_ENV=production
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 8: Build & Start Application

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Set up database tables
npm run db:push

# Start with PM2
pm2 start ecosystem.config.js

# Configure PM2 to start on boot
pm2 startup
# Copy and run the command it outputs

pm2 save
```

## Step 9: Configure Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/epaper-dashboard
```

**Paste this configuration** (replace YOUR_DOMAIN with your domain or IP):

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;  # Use your domain or droplet IP
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable and start:**

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/epaper-dashboard /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Step 10: Access Your App! 🎉

Visit in your browser:
- `http://YOUR_DROPLET_IP` OR
- `http://your_domain.com` (if you have a domain)

**Default Login:**
- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT:** Change this password immediately after first login!

## Step 11: Add SSL/HTTPS (If You Have a Domain)

```bash
# Install SSL certificate
sudo certbot --nginx -d your_domain.com -d www.your_domain.com

# Follow the prompts:
# 1. Enter your email
# 2. Agree to terms
# 3. Choose option 2 (redirect HTTP to HTTPS)
```

Your site is now secure with HTTPS! 🔒

## Verification Checklist

✅ Can access app in browser  
✅ Can log in with admin credentials  
✅ Dashboard loads and shows members  
✅ Can update member status  
✅ PM2 shows app running: `pm2 status`  
✅ Nginx is running: `sudo systemctl status nginx`  
✅ SSL certificate installed (if using domain)  

## Useful Commands

```bash
# Check app status
pm2 status
pm2 logs

# Restart app
pm2 restart all

# Check Nginx
sudo systemctl status nginx
sudo nginx -t

# View logs
pm2 logs
sudo tail -f /var/log/nginx/error.log

# Database backup
pg_dump -U epaper_user epaper_dashboard > backup.sql
```

## Updating Your App

When you make changes and want to deploy updates:

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP
cd epaper-dashboard

# Pull latest code (if using Git)
git pull

# Install any new dependencies
npm install

# Rebuild
npm run build

# Update database schema
npm run db:push

# Restart app
pm2 restart all
```

## Troubleshooting

### App Won't Start
```bash
pm2 logs  # Check error messages
pm2 restart all
```

### Can't Access from Browser
```bash
# Check firewall
sudo ufw status

# Make sure ports are open
sudo ufw allow 'Nginx Full'
```

### Database Connection Errors
```bash
# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection
psql -U epaper_user -d epaper_dashboard
```

### SSL Issues
```bash
# Make sure DNS is pointed correctly
nslookup your_domain.com

# Try SSL setup again
sudo certbot --nginx -d your_domain.com
```

## Need More Help?

📚 **Detailed Guides:**
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [deploy/quick-start.md](./deploy/quick-start.md) - Quick reference
- [deploy/database-setup.md](./deploy/database-setup.md) - Database details
- [deploy/ssl-setup.md](./deploy/ssl-setup.md) - SSL/HTTPS setup

## Success! 🎊

Your E-Paper Dashboard is now live and ready to use!

**Next Steps:**
1. Change the default admin password
2. Create user accounts for your team
3. Add department members
4. Configure e-paper integration
5. Test status updates

---

**Questions?** Check the troubleshooting guides above or review the detailed documentation.
