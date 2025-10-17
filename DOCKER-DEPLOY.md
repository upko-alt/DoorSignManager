# 🐳 Docker Compose Deployment Guide

Deploy the E-Paper Dashboard to your DigitalOcean Droplet using Docker Compose - the easiest way!

## Why Docker Compose?

- ✅ **One-command deployment** - Everything starts with `docker-compose up`
- ✅ **Isolated environment** - No conflicts with other apps
- ✅ **Easy updates** - Just rebuild and restart
- ✅ **Portable** - Works the same everywhere
- ✅ **Built-in database** - PostgreSQL included
- ✅ **Nginx included** - Reverse proxy ready

## Prerequisites

- DigitalOcean Droplet (Ubuntu 22.04, 2GB RAM minimum)
- SSH access to your Droplet
- Your app code (downloaded from Replit)
- E-paper API credentials (optional)

## Step 1: Create DigitalOcean Droplet

1. **Create Droplet:**
   - Ubuntu 22.04 LTS
   - Basic plan, Regular CPU
   - 2GB RAM ($12/month) minimum
   - Choose datacenter near you

2. **Note your IP address** (shown after creation)

## Step 2: Install Docker on Droplet

SSH into your Droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

Install Docker and Docker Compose:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

## Step 3: Upload Your Application

### Option A: Using Git (Recommended)

```bash
# Clone your repository
git clone <your-repo-url> epaper-dashboard
cd epaper-dashboard
```

### Option B: Upload via SCP

From your local computer:

```bash
# Upload files
scp -r /path/to/your/app/* root@YOUR_DROPLET_IP:~/epaper-dashboard/

# Then SSH in
ssh root@YOUR_DROPLET_IP
cd epaper-dashboard
```

## Step 4: Configure Environment

```bash
# Copy environment template
cp .env.docker .env

# Edit with your credentials
nano .env
```

**Fill in these required values:**

```env
# Database password - Choose a strong password
POSTGRES_PASSWORD=your_secure_password_here

# Session secret - Generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your_generated_secret_here

# E-Paper API (optional - leave empty if not ready)
EPAPER_IMPORT_URL=
EPAPER_IMPORT_KEY=
EPAPER_EXPORT_URL=
EPAPER_EXPORT_KEY=
```

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save and exit (Ctrl+X, Y, Enter)

## Step 5: Start Everything with Docker Compose

```bash
# Build and start all services
docker compose up -d

# This will:
# ✅ Build your application
# ✅ Start PostgreSQL database
# ✅ Run database migrations
# ✅ Start the app server
# ✅ Start Nginx reverse proxy
```

**First time?** Building may take 2-5 minutes.

## Step 6: Verify Deployment

Check that everything is running:

```bash
# View running containers
docker compose ps

# Should show:
# epaper-app     (healthy)
# epaper-db      (healthy)
# epaper-nginx   (running)
```

View logs:

```bash
# All logs
docker compose logs

# Just app logs
docker compose logs app

# Follow logs live
docker compose logs -f app
```

## Step 7: Access Your Dashboard

Visit in your browser:
- `http://YOUR_DROPLET_IP`

**Default Login:**
- Username: `admin`
- Password: `admin123`

**⚠️ Change this password immediately!**

## Step 8: Set Up SSL/HTTPS (Optional)

If you have a domain name:

### Update Nginx Configuration

```bash
# Edit Nginx config
nano deploy/nginx-docker.conf
```

Replace `server_name _;` with `server_name your_domain.com;`

### Get SSL Certificate with Certbot

```bash
# Install Certbot
sudo apt install certbot

# Stop nginx temporarily
docker compose stop nginx

# Get certificate
sudo certbot certonly --standalone -d your_domain.com -d www.your_domain.com

# Copy certificates to ssl directory
sudo mkdir -p ssl
sudo cp /etc/letsencrypt/live/your_domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your_domain.com/privkey.pem ssl/

# Update nginx config to enable HTTPS (uncomment the HTTPS server block)
nano deploy/nginx-docker.conf

# Restart nginx
docker compose up -d nginx
```

Now visit: `https://your_domain.com` 🔒

## Essential Docker Commands

### Managing Services

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart all services
docker compose restart

# View status
docker compose ps

# View logs
docker compose logs -f
```

### Updating Your Application

When you have new code:

```bash
# Pull latest code (if using Git)
git pull

# Rebuild and restart
docker compose up -d --build

# Database migration will run automatically
```

### Database Management

```bash
# Access database
docker compose exec db psql -U epaper_user -d epaper_dashboard

# Backup database
docker compose exec db pg_dump -U epaper_user epaper_dashboard > backup.sql

# Restore database
docker compose exec -T db psql -U epaper_user -d epaper_dashboard < backup.sql

# View database logs
docker compose logs db
```

### Application Management

```bash
# View app logs
docker compose logs app -f

# Restart just the app
docker compose restart app

# Execute command in app container
docker compose exec app sh

# View app environment
docker compose exec app env
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs app
docker compose logs db
```

### Database Connection Errors

```bash
# Verify database is healthy
docker compose ps

# Check database logs
docker compose logs db

# Restart database
docker compose restart db
```

### Application Errors

```bash
# View detailed logs
docker compose logs app --tail=100

# Check environment variables
docker compose exec app env | grep DATABASE

# Restart app
docker compose restart app
```

### Port Already in Use

```bash
# Check what's using port 80
sudo lsof -i :80

# Change ports in docker-compose.yml if needed
# Edit the ports section under nginx:
#   ports:
#     - "8080:80"  # Use port 8080 instead
```

### Clear Everything and Start Fresh

```bash
# Stop and remove everything (keeps volumes)
docker compose down

# Stop and remove everything including data
docker compose down -v

# Rebuild from scratch
docker compose up -d --build
```

## Monitoring & Maintenance

### View Resource Usage

```bash
# Container stats (CPU, memory)
docker stats

# Disk usage
docker system df
```

### Clean Up Old Images

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

### Automatic Backups

Create a backup script:

```bash
# Create backup script
cat > ~/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker compose exec -T db pg_dump -U epaper_user epaper_dashboard > $BACKUP_DIR/db_$DATE.sql

# Keep only last 7 backups
ls -t $BACKUP_DIR/db_*.sql | tail -n +8 | xargs -r rm

echo "Backup completed: $DATE"
EOF

chmod +x ~/backup.sh

# Schedule daily backup at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * cd ~/epaper-dashboard && ~/backup.sh >> ~/backup.log 2>&1") | crontab -
```

## Docker Compose File Structure

Your setup includes:

```yaml
services:
  db:          # PostgreSQL database
  app:         # Node.js application
  nginx:       # Reverse proxy
  
volumes:
  postgres_data:   # Database persistence
  nginx_cache:     # Nginx cache
  
networks:
  epaper-network:  # Internal network
```

## Environment Variables Reference

All variables in `.env`:

```env
# Database
POSTGRES_DB=epaper_dashboard          # Database name
POSTGRES_USER=epaper_user             # Database user
POSTGRES_PASSWORD=***                 # Database password (required)

# Application
SESSION_SECRET=***                    # Session encryption (required)
NODE_ENV=production                   # Environment
PORT=5000                             # App port

# E-Paper (optional)
EPAPER_IMPORT_URL=                    # Import API URL
EPAPER_IMPORT_KEY=                    # Import API key
EPAPER_EXPORT_URL=                    # Export API URL
EPAPER_EXPORT_KEY=                    # Export API key
```

## Security Best Practices

1. **Strong Passwords:**
   - Use complex database password
   - Change default admin password immediately

2. **Firewall:**
   ```bash
   # Set up UFW
   sudo ufw allow OpenSSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **Regular Updates:**
   ```bash
   # Update Docker images
   docker compose pull
   docker compose up -d
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   ```

4. **SSL/HTTPS:**
   - Always use HTTPS in production
   - Renew SSL certificates before expiry

5. **Backups:**
   - Automate database backups
   - Store backups off-server

## Performance Optimization

### Scale Application (Multiple Instances)

Edit `docker-compose.yml`:

```yaml
app:
  # ... other config ...
  deploy:
    replicas: 2  # Run 2 instances
```

### Increase Memory Limits

```yaml
app:
  # ... other config ...
  deploy:
    resources:
      limits:
        memory: 1G
```

## Uninstall / Remove

To completely remove everything:

```bash
# Stop and remove containers, networks, volumes
docker compose down -v

# Remove Docker (if needed)
sudo apt remove docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo rm -rf /var/lib/docker
```

## Success Checklist

- ✅ Docker and Docker Compose installed
- ✅ `.env` file configured with secrets
- ✅ `docker compose up -d` runs without errors
- ✅ All containers healthy: `docker compose ps`
- ✅ Can access dashboard at `http://YOUR_IP`
- ✅ Can log in with admin credentials
- ✅ SSL configured (if using domain)
- ✅ Backups scheduled

## What's Next?

1. **Change admin password**
2. **Create user accounts** for your team
3. **Add department members**
4. **Configure e-paper API** (when ready)
5. **Set up domain and SSL** (recommended)
6. **Schedule automatic backups**

---

**Your e-paper dashboard is now running in Docker! 🐳**

Need help? Check `docker compose logs` for detailed error messages.
