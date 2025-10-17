# PostgreSQL Database Setup Guide

This guide covers setting up PostgreSQL for the E-Paper Dashboard on your DigitalOcean Droplet.

## Prerequisites

- PostgreSQL installed on your server (covered in main DEPLOYMENT.md)
- SSH access to your server
- Basic terminal knowledge

## Step 1: Access PostgreSQL

```bash
# Switch to postgres user
sudo -i -u postgres

# Access PostgreSQL prompt
psql
```

## Step 2: Create Database

```sql
-- Create the database
CREATE DATABASE epaper_dashboard;

-- Verify it was created
\l
```

You should see `epaper_dashboard` in the list of databases.

## Step 3: Create User with Password

```sql
-- Create user with password
CREATE USER epaper_user WITH PASSWORD 'your_secure_password_here';

-- Grant all privileges on the database to the user
GRANT ALL PRIVILEGES ON DATABASE epaper_dashboard TO epaper_user;

-- Connect to the new database
\c epaper_dashboard

-- Grant schema privileges (PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO epaper_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO epaper_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO epaper_user;

-- Exit psql
\q
```

## Step 4: Verify Connection

```bash
# Exit postgres user
exit

# Test connection as your app user
psql -U epaper_user -d epaper_dashboard -h localhost
# Enter the password when prompted

# If successful, you'll see the PostgreSQL prompt
# Exit with: \q
```

## Step 5: Configure Your Application

### Update .env File

```bash
cd ~/epaper-dashboard
nano .env
```

Set the DATABASE_URL:

```env
DATABASE_URL=postgresql://epaper_user:your_secure_password@localhost:5432/epaper_dashboard
```

**Important:** Replace `your_secure_password` with the actual password you set!

### Additional Database Variables

These should match your DATABASE_URL:

```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=epaper_dashboard
PGUSER=epaper_user
PGPASSWORD=your_secure_password
```

## Step 6: Run Database Migrations

```bash
# Make sure you're in the app directory
cd ~/epaper-dashboard

# Push schema to database (creates all tables)
npm run db:push
```

This will create all necessary tables:
- `users` - User accounts and authentication
- `members` - Department members
- `status_history` - Status change tracking
- `sync_status` - E-paper sync logs
- `status_options` - Configurable status options

## Step 7: Verify Tables Were Created

```bash
# Connect to database
psql -U epaper_user -d epaper_dashboard -h localhost

# List tables
\dt

# You should see:
# - users
# - members  
# - status_history
# - sync_status
# - status_options

# View table structure
\d users
\d members

# Exit
\q
```

## Default Data

The application automatically seeds:
- **First user becomes admin** (username: admin, password: admin123)
- **Default status options:** Available, In Meeting, Out, Do Not Disturb, Be Right Back

**IMPORTANT:** Change the default admin password immediately after first login!

## Backup Your Database

### Manual Backup

```bash
# Create backup directory
mkdir -p ~/backups

# Create backup
pg_dump -U epaper_user -d epaper_dashboard > ~/backups/epaper_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup (if needed)
psql -U epaper_user -d epaper_dashboard < ~/backups/epaper_20241017_120000.sql
```

### Automated Daily Backups

```bash
# Create backup script
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U epaper_user epaper_dashboard > $BACKUP_DIR/epaper_$(date +%Y%m%d_%H%M%S).sql

# Keep only last 7 backups (delete older)
ls -t $BACKUP_DIR/epaper_*.sql | tail -n +8 | xargs -r rm

echo "Backup completed: $(date)"
EOF

# Make executable
chmod +x ~/backup-db.sh

# Test it
~/backup-db.sh

# Schedule daily at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-db.sh >> ~/backup.log 2>&1") | crontab -

# Verify cron job
crontab -l
```

## PostgreSQL Configuration (Optional)

For better performance, you can tune PostgreSQL:

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Recommended settings for a small app on 2GB Droplet:

```conf
# Memory
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 4MB

# Checkpoints
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Logging (for debugging)
log_min_duration_statement = 1000  # Log queries over 1 second
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## Security Best Practices

1. **Use strong passwords** - At least 16 characters, mix of letters, numbers, symbols

2. **Restrict network access** - PostgreSQL is bound to localhost by default (good!)

3. **Regular backups** - Automate as shown above

4. **Monitor disk space:**
   ```bash
   df -h
   ```

5. **Keep PostgreSQL updated:**
   ```bash
   sudo apt update
   sudo apt upgrade postgresql
   ```

## Troubleshooting

### Can't connect to database

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start if stopped
sudo systemctl start postgresql

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Permission denied errors

```sql
-- As postgres user, grant permissions again
sudo -u postgres psql
\c epaper_dashboard
GRANT ALL PRIVILEGES ON DATABASE epaper_dashboard TO epaper_user;
GRANT ALL ON SCHEMA public TO epaper_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO epaper_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO epaper_user;
\q
```

### Database exists but tables are missing

```bash
# Run migrations again
cd ~/epaper-dashboard
npm run db:push
```

### Reset database (DANGER - deletes all data!)

```bash
# Connect as postgres
sudo -u postgres psql

# Drop and recreate
DROP DATABASE epaper_dashboard;
CREATE DATABASE epaper_dashboard;
GRANT ALL PRIVILEGES ON DATABASE epaper_dashboard TO epaper_user;
\q

# Run migrations
cd ~/epaper-dashboard
npm run db:push
```

## Checking Database Status

### View active connections
```sql
SELECT * FROM pg_stat_activity WHERE datname = 'epaper_dashboard';
```

### Database size
```sql
SELECT pg_size_pretty(pg_database_size('epaper_dashboard'));
```

### Table sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

**Your database is now ready for the E-Paper Dashboard! 🎉**
