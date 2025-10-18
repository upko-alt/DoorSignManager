# SSL/HTTPS Setup Guide
## Automatic SSL Certificates with Let's Encrypt

This guide explains how to enable HTTPS on your E-Paper Dashboard using automatic SSL certificates from Let's Encrypt.

---

## Overview

The dashboard uses the `jonasal/nginx-certbot` Docker image which:
- ✅ Automatically generates SSL certificates from Let's Encrypt
- ✅ Auto-renews certificates every 12 hours (before they expire)
- ✅ Handles ACME challenges automatically
- ✅ Reloads Nginx after certificate renewal (zero downtime)
- ✅ Redirects HTTP → HTTPS automatically

**No manual certificate management required!**

---

## Prerequisites

Before starting, ensure:

1. **Domain Name Configured**
   - You own a domain (e.g., `dashboard.example.com`)
   - DNS A record points to your server's IP address (`159.89.105.201`)
   - Allow 5-10 minutes for DNS propagation after adding the record

2. **Ports Open**
   - Port 80 (HTTP) - Required for Let's Encrypt ACME challenges
   - Port 443 (HTTPS) - For secure traffic
   
   Check firewall:
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **Server Access**
   - SSH access to your production server
   - Docker and docker-compose installed
   - Project code deployed

---

## Step 1: Update Environment Variables

Edit your `.env` file on the production server:

```bash
cd /path/to/epaper-dashboard
nano .env
```

Add or update these variables:

```bash
# SSL/HTTPS Configuration
DOMAIN=dashboard.yourdomain.com
CERTBOT_EMAIL=admin@yourdomain.com

# Enable secure cookies for HTTPS
COOKIE_SECURE=true
```

**Replace with your actual domain and email!**

**Note:** For multiple domains (e.g., with and without www), use space-separated values:
```bash
DOMAIN="example.com www.example.com"
```

### What Each Variable Does:

- `DOMAIN` - Your fully qualified domain name (FQDN). For multiple domains, use space-separated list
- `CERTBOT_EMAIL` - Email for Let's Encrypt notifications (certificate expiry warnings, though auto-renewal handles this)
- `COOKIE_SECURE` - Enables secure cookie flag (required for HTTPS)

---

## Step 2: Verify DNS Configuration

Before proceeding, verify your domain points to the correct server:

```bash
# Check DNS A record
dig +short dashboard.yourdomain.com

# Should return your server IP: 159.89.105.201
```

Or use online tools:
- https://dnschecker.org
- https://mxtoolbox.com/DNSLookup.aspx

**Important:** Wait for DNS propagation (5-10 minutes) if you just added the A record.

---

## Step 3: Deploy with SSL

### Option A: First-Time Deployment

If this is your first time setting up:

```bash
# Pull latest code
git pull

# Build images
docker-compose build

# Start services (certificates will be generated automatically)
docker-compose up -d

# Watch logs to see certificate generation
docker-compose logs -f nginx
```

### Option B: Updating Existing Deployment

If you're already running without SSL:

```bash
# Pull latest code with SSL changes
git pull

# Rebuild images
docker-compose build

# Stop existing services
docker-compose down

# Start with new SSL configuration
docker-compose up -d

# Monitor certificate generation
docker-compose logs -f nginx
```

---

## Step 4: Verify SSL Certificate

### Check Certificate Generation

Watch the nginx logs for certificate generation:

```bash
docker-compose logs -f nginx
```

You should see messages like:
```
Requesting initial certificate for dashboard.yourdomain.com
Certificate successfully obtained!
```

### Test HTTPS Access

1. **Open your browser** and navigate to:
   ```
   https://dashboard.yourdomain.com
   ```

2. **Check the lock icon** in the browser address bar - it should show:
   - ✅ Connection is secure
   - ✅ Certificate issued by Let's Encrypt
   - ✅ Valid for 90 days

3. **Test HTTP redirect** - Navigate to `http://dashboard.yourdomain.com`
   - Should automatically redirect to `https://`

### Command-Line Test

```bash
# Test SSL certificate
curl -I https://dashboard.yourdomain.com

# Should return: HTTP/2 200
# Look for: strict-transport-security header
```

---

## Step 5: Monitor Auto-Renewal

Certificates auto-renew every 12 hours (if expiring within 30 days).

### View Renewal Logs

```bash
# Follow nginx logs
docker-compose logs -f nginx

# Check certificate expiry date
docker-compose exec nginx openssl x509 -in /etc/letsencrypt/live/dashboard.yourdomain.com/fullchain.pem -noout -enddate
```

### Test Renewal Process

```bash
# Dry-run renewal (doesn't actually renew, just tests)
docker-compose exec nginx certbot renew --dry-run
```

---

## Troubleshooting

### Problem: "Failed to obtain certificate"

**Possible Causes:**

1. **DNS not configured**
   ```bash
   # Verify DNS points to your server
   dig +short yourdomain.com
   ```

2. **Port 80 blocked**
   ```bash
   # Check if port 80 is accessible
   sudo ufw status
   sudo ufw allow 80/tcp
   ```

3. **Domain not accessible**
   ```bash
   # Test from another machine
   curl http://yourdomain.com/.well-known/acme-challenge/test
   ```

**Solution:**
- Ensure DNS A record exists and propagated
- Verify firewall allows ports 80 and 443
- Check docker-compose logs for specific errors

---

### Problem: "Certificate expired" warning

**This shouldn't happen with auto-renewal, but if it does:**

```bash
# Force certificate renewal
docker-compose exec nginx certbot renew --force-renewal

# Reload nginx
docker-compose restart nginx
```

---

### Problem: "Connection refused" or "502 Bad Gateway"

**Check if app container is running:**

```bash
# View all container status
docker-compose ps

# Check app logs
docker-compose logs -f app

# Restart app if needed
docker-compose restart app
```

---

### Problem: Certificate for wrong domain

**If you changed your domain:**

```bash
# Stop services
docker-compose down

# Remove old certificates
docker volume rm epaper-dashboard_nginx_secrets

# Update .env with new domain
nano .env

# Restart with new domain
docker-compose up -d
```

---

## Testing with Staging Certificates (Optional)

**For testing without hitting Let's Encrypt rate limits:**

Edit `docker-compose.yml`:

```yaml
  nginx:
    environment:
      CERTBOT_EMAIL: ${CERTBOT_EMAIL}
      DOMAIN: ${DOMAIN}
      STAGING: 1  # <-- Uncomment this line
```

This uses Let's Encrypt staging server (certificates won't be trusted by browsers, but good for testing).

**Remove `STAGING: 1` for production!**

---

## Rate Limits

Let's Encrypt has rate limits:
- **50 certificates per domain per week**
- **5 failed validation attempts per hour**

**Don't repeatedly restart if certificate generation fails!**
- Debug the issue first
- Use staging mode for testing
- Check logs: `docker-compose logs nginx`

---

## Certificate Files Location

Certificates are stored in a Docker volume:

```bash
# Volume name: nginx_secrets
# Container path: /etc/letsencrypt/

# View certificate details
docker-compose exec nginx ls -la /etc/letsencrypt/live/
```

**Note:** Certificates are automatically managed - no manual file handling needed!

---

## Manual Certificate Renewal (Emergency Only)

**Normally auto-renewal handles this, but if needed:**

```bash
# Force renewal (even if not expiring soon)
docker-compose exec nginx certbot renew --force-renewal

# Reload nginx to use new certificate
docker-compose exec nginx nginx -s reload
```

---

## Security Best Practices

The SSL configuration includes:

✅ **TLS 1.2 and 1.3 only** (TLS 1.0/1.1 disabled)
✅ **Strong cipher suites**
✅ **HSTS header** (forces HTTPS for 1 year)
✅ **OCSP stapling** (faster certificate validation)
✅ **Security headers** (XSS protection, frame options, etc.)

---

## Quick Reference

### Common Commands

```bash
# View logs
docker-compose logs -f nginx

# Check certificate expiry
docker-compose exec nginx certbot certificates

# Test renewal (dry-run)
docker-compose exec nginx certbot renew --dry-run

# Force renewal
docker-compose exec nginx certbot renew --force-renewal

# Restart nginx
docker-compose restart nginx

# View all containers
docker-compose ps
```

### Environment Variables

| Variable | Example | Required |
|----------|---------|----------|
| `DOMAIN` | `dashboard.example.com` or `"example.com www.example.com"` | ✅ Yes |
| `CERTBOT_EMAIL` | `admin@example.com` | ✅ Yes |
| `COOKIE_SECURE` | `true` | ✅ Yes (for HTTPS) |

---

## Summary

1. ✅ Add `DOMAIN` and `CERTBOT_EMAIL` to `.env`
2. ✅ Ensure DNS points to your server
3. ✅ Open ports 80 and 443
4. ✅ Run `docker-compose up -d`
5. ✅ Certificates generate automatically
6. ✅ Auto-renewal every 12 hours (zero intervention needed)

**You're done!** SSL is now active and will renew automatically. 🎉

---

## Support

If you encounter issues:

1. Check logs: `docker-compose logs nginx`
2. Verify DNS: `dig +short yourdomain.com`
3. Test ports: `nc -zv yourdomain.com 80 443`
4. Review this troubleshooting guide
5. Check Let's Encrypt status: https://letsencrypt.status.io/

**Certificate issues?** Visit: https://community.letsencrypt.org/
