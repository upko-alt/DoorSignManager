# Docker Deployment Guide

This guide explains how to deploy the E-Paper Door Sign Dashboard using Docker Compose on your own server.

## What You'll Get

- ✅ PostgreSQL database (automatically configured)
- ✅ E-Paper Dashboard application
- ✅ Nginx reverse proxy (optional, for HTTPS)
- ✅ **Admin user automatically created** on first run
- ✅ All credentials managed through environment variables

## Quick Start (5 Minutes)

### Step 1: Copy files to your server

```bash
# Upload the entire project to your server
scp -r /path/to/project user@your-server:/home/user/epaper-dashboard
```

### Step 2: Create environment file

```bash
cd epaper-dashboard
cp .env.example .env
```

### Step 3: Edit the .env file

Open `.env` and set these **REQUIRED** values:

```bash
# Database password (REQUIRED - use a strong password)
POSTGRES_PASSWORD=your_secure_database_password_here

# Session secret (REQUIRED - generate using command below)
SESSION_SECRET=your_very_long_random_secret_at_least_32_characters

# Admin credentials (REQUIRED - these will be auto-created on first run)
ADMIN_USERNAME=youradminname
ADMIN_PASSWORD=your_secure_admin_password
```

**Generate a secure session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ IMPORTANT**: All of these values are **REQUIRED**. Docker Compose will refuse to start if any are missing. This ensures you don't accidentally deploy with default credentials.

### Step 4: Start the application

```bash
docker-compose up -d
```

That's it! The system will:
1. ✅ Create the PostgreSQL database
2. ✅ Run database migrations
3. ✅ Auto-create the admin user
4. ✅ Start the application

### Step 5: Access your dashboard

**HTTP Access (for testing):**
```
http://your-server-ip:5000
```

**Login with:**
- Username: `admin` (or what you set in .env)
- Password: `admin123` (or what you set in .env)

## Configuration Options

### Environment Variables

Edit `.env` file with these options:

#### Database Settings
```bash
POSTGRES_DB=epaper_dashboard          # Database name
POSTGRES_USER=epaper_user             # Database username
POSTGRES_PASSWORD=your_password       # Database password (REQUIRED)
```

#### Admin User (Auto-created on first run)
```bash
ADMIN_USERNAME=admin                  # Admin username
ADMIN_PASSWORD=admin123               # Admin password
ADMIN_EMAIL=admin@department.edu      # Admin email
```

#### Security Settings
```bash
SESSION_SECRET=random_string_here     # Session encryption key (REQUIRED)
COOKIE_SECURE=false                   # false for HTTP, true for HTTPS
```

#### E-Paper API (Optional)
```bash
EPAPER_IMPORT_URL=                    # E-paper import API URL
EPAPER_IMPORT_KEY=                    # E-paper import API key
EPAPER_EXPORT_URL=                    # E-paper export API URL
EPAPER_EXPORT_KEY=                    # E-paper export API key
```

## Deployment Scenarios

### Scenario 1: Simple HTTP Access (Default)

Access via IP address without SSL:

```bash
# .env configuration
COOKIE_SECURE=false

# Access
http://your-server-ip:5000
```

### Scenario 2: With Nginx Reverse Proxy

Includes Nginx for better performance and SSL support:

```bash
# Start with nginx
docker-compose up -d

# Access via nginx
http://your-server-ip:80
```

To add SSL:
1. Place SSL certificates in `./ssl/` directory
2. Update `deploy/nginx-docker.conf` with your domain
3. Set `COOKIE_SECURE=true` in `.env`
4. Restart: `docker-compose restart`

### Scenario 3: Production with Domain Name

1. **Point your domain to server IP**
2. **Update nginx config** (`deploy/nginx-docker.conf`):
   ```nginx
   server_name yourdomain.com www.yourdomain.com;
   ```
3. **Get SSL certificate** (Let's Encrypt):
   ```bash
   docker run -it --rm \
     -v ./ssl:/etc/letsencrypt \
     certbot/certbot certonly --standalone \
     -d yourdomain.com
   ```
4. **Update .env**:
   ```bash
   COOKIE_SECURE=true
   ```
5. **Restart**:
   ```bash
   docker-compose restart
   ```

## Useful Commands

### View logs
```bash
# All services
docker-compose logs -f

# Just the app
docker-compose logs -f app

# Just the database
docker-compose logs -f db
```

### Restart services
```bash
# Restart all
docker-compose restart

# Restart just the app
docker-compose restart app
```

### Stop everything
```bash
docker-compose down
```

### Stop and remove all data
```bash
docker-compose down -v
```

### Create another admin user
```bash
# Enter the app container
docker exec -it epaper-app sh

# Run the create-admin script
npx tsx server/create-admin.ts newadmin newpassword

# Exit
exit
```

### Database backup
```bash
docker exec epaper-db pg_dump -U epaper_user epaper_dashboard > backup.sql
```

### Database restore
```bash
cat backup.sql | docker exec -i epaper-db psql -U epaper_user epaper_dashboard
```

## Troubleshooting

### "Please set POSTGRES_PASSWORD in .env"
You forgot to set the password. Edit `.env` and add:
```bash
POSTGRES_PASSWORD=your_secure_password
```

### "Please set SESSION_SECRET in .env"
Generate and add a session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output to SESSION_SECRET in `.env`

### Can't login / Cookies not working
If using HTTP (not HTTPS), make sure:
```bash
COOKIE_SECURE=false
```

### Admin user not created
Check the logs:
```bash
docker-compose logs app
```

Look for "✅ Database initialized successfully!"

### Port already in use
Change the port in `docker-compose.yml`:
```yaml
ports:
  - "8080:5000"  # Access on port 8080 instead
```

### Database connection failed
Check if database is healthy:
```bash
docker-compose ps
```

Both `db` and `app` should show "Up" status.

## Architecture

```
┌─────────────┐
│   Nginx     │  (Port 80/443 - Optional)
│  (Reverse   │
│   Proxy)    │
└──────┬──────┘
       │
┌──────▼──────┐
│     App     │  (Port 5000)
│  Node.js    │
│  Express    │
└──────┬──────┘
       │
┌──────▼──────┐
│ PostgreSQL  │  (Port 5432)
│  Database   │
└─────────────┘
```

## Data Persistence

Your data is stored in Docker volumes:
- `postgres_data` - Database files
- `./logs` - Application logs

These persist even when containers are stopped/restarted.

## Security Checklist

Before going to production:

- [ ] Change `POSTGRES_PASSWORD` from default
- [ ] Change `ADMIN_PASSWORD` from default
- [ ] Set strong `SESSION_SECRET` (32+ random characters)
- [ ] Set `COOKIE_SECURE=true` if using HTTPS
- [ ] Configure firewall to only allow ports 80/443
- [ ] Set up SSL certificates
- [ ] Regular database backups
- [ ] Keep Docker images updated

## Updates

To update the application:

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build
```

## Support

For issues or questions, check the logs first:
```bash
docker-compose logs -f
```

Most issues are related to:
1. Missing environment variables
2. Wrong COOKIE_SECURE setting
3. Firewall blocking ports
