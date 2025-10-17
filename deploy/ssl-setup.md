# SSL/HTTPS Setup Guide with Let's Encrypt

This guide shows you how to add free SSL certificates to your E-Paper Dashboard using Let's Encrypt and Certbot.

## Prerequisites

- Domain name pointing to your Droplet's IP address
- Nginx installed and configured
- Application running on port 5000
- Port 80 and 443 open in firewall

## Why SSL/HTTPS?

- 🔒 Encrypts data between users and your server
- ✅ Required for modern browsers
- 🎯 Better for SEO
- 🛡️ Prevents man-in-the-middle attacks
- Free with Let's Encrypt!

## Step 1: Point Your Domain to Droplet

Before setting up SSL, ensure your domain points to your Droplet:

### In Your Domain Registrar (GoDaddy, Namecheap, etc.):

1. Go to DNS settings
2. Add an **A Record**:
   - **Host/Name:** `@` (or leave blank for root domain)
   - **Points to/Value:** Your Droplet's IP address
   - **TTL:** Automatic or 3600

3. Optional - Add **www** subdomain:
   - **Host/Name:** `www`
   - **Points to/Value:** Your Droplet's IP address
   - **TTL:** Automatic or 3600

### Verify DNS Propagation

```bash
# Check if domain points to your IP (run from any computer)
nslookup your_domain.com
dig your_domain.com

# Or use online tools:
# https://www.whatsmydns.net
```

**Wait 5-60 minutes for DNS to propagate** before continuing.

## Step 2: Update Nginx Configuration

```bash
# Edit your Nginx config
sudo nano /etc/nginx/sites-available/epaper-dashboard
```

Make sure `server_name` has your actual domain:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your_domain.com www.your_domain.com;  # Replace with YOUR domain
    
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

**Replace** `your_domain.com` with your actual domain!

Test and reload:

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 3: Install Certbot

```bash
# Update package list
sudo apt update

# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

## Step 4: Obtain SSL Certificate

### For Single Domain:

```bash
sudo certbot --nginx -d your_domain.com
```

### For Domain + www Subdomain:

```bash
sudo certbot --nginx -d your_domain.com -d www.your_domain.com
```

### Follow the Prompts:

1. **Enter email address** - For renewal notifications
2. **Agree to Terms of Service** - Type 'Y'
3. **Share email with EFF?** - Optional, 'Y' or 'N'
4. **Redirect HTTP to HTTPS?** - Choose option **2** (recommended)

Certbot will automatically:
- ✅ Obtain the certificate
- ✅ Update your Nginx configuration
- ✅ Set up auto-renewal
- ✅ Configure HTTPS redirect

## Step 5: Verify SSL Certificate

```bash
# Check certificate status
sudo certbot certificates

# Visit your site
# https://your_domain.com
```

You should see:
- 🔒 Padlock icon in browser
- "Connection is secure" message
- Valid certificate

### Test SSL Configuration

Use SSL Labs to check your setup:
```
https://www.ssllabs.com/ssltest/analyze.html?d=your_domain.com
```

## Step 6: Test Auto-Renewal

Certbot sets up automatic renewal, but let's test it:

```bash
# Dry run (test renewal without actually renewing)
sudo certbot renew --dry-run
```

If successful, you'll see:
```
Congratulations, all simulated renewals succeeded
```

## Auto-Renewal Details

Certbot automatically:
- Checks for renewal twice daily
- Renews certificates 30 days before expiration
- Reloads Nginx after renewal

Check the renewal timer:

```bash
# Check if timer is active
sudo systemctl status certbot.timer

# View renewal cron job
cat /etc/cron.d/certbot
```

## Final Nginx Configuration

After Certbot, your Nginx config should look like this:

```bash
# View updated config
sudo cat /etc/nginx/sites-available/epaper-dashboard
```

```nginx
server {
    server_name your_domain.com www.your_domain.com;
    
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

    listen [::]:443 ssl ipv6only=on;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.your_domain.com) {
        return 301 https://$host$request_uri;
    }

    if ($host = your_domain.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    listen [::]:80;
    server_name your_domain.com www.your_domain.com;
    return 404;
}
```

## Troubleshooting

### Certificate Issuance Failed

**Check domain DNS:**
```bash
nslookup your_domain.com
```

**Check port 80 is accessible:**
```bash
sudo ufw status
curl http://your_domain.com
```

**Check Nginx is running:**
```bash
sudo systemctl status nginx
```

**View Certbot logs:**
```bash
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Rate Limits

Let's Encrypt has rate limits:
- 5 failed validations per hour
- 50 certificates per domain per week

If you hit limits, wait an hour and try again.

### Renewal Failed

```bash
# Check renewal status
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# Check timer
sudo systemctl status certbot.timer

# Manually trigger
sudo certbot renew
```

### Certificate Expires Soon Warning

Let's Encrypt sends email warnings 30, 14, and 7 days before expiration.

**Solution:**
```bash
# Manually renew
sudo certbot renew

# Check auto-renewal is working
sudo certbot renew --dry-run
```

## Advanced Configuration

### Stronger SSL Configuration

Edit Nginx config for better security:

```nginx
server {
    # ... existing config ...
    
    # SSL protocols
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    
    # HSTS (force HTTPS for 1 year)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/your_domain.com/chain.pem;
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Multiple Domains

For multiple domains on same server:

```bash
sudo certbot --nginx -d domain1.com -d www.domain1.com -d domain2.com -d www.domain2.com
```

### Wildcard Certificates

For `*.your_domain.com`:

```bash
sudo certbot certonly --manual --preferred-challenges dns -d your_domain.com -d *.your_domain.com
```

Follow DNS verification instructions.

## Monitoring Certificate Expiration

### Manual Check

```bash
# List all certificates
sudo certbot certificates

# Check expiration date
echo | openssl s_client -servername your_domain.com -connect your_domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Automated Monitoring

Set up email alerts:

```bash
# Certbot sends emails automatically to the address you provided during setup
# To change email:
sudo certbot update_account --email new_email@example.com
```

## Revoking a Certificate (If Needed)

```bash
# Revoke and delete
sudo certbot revoke --cert-path /etc/letsencrypt/live/your_domain.com/cert.pem --delete-after-revoke
```

## Summary Checklist

- ✅ Domain points to Droplet IP
- ✅ Nginx configured with domain name
- ✅ Certbot installed
- ✅ SSL certificate obtained
- ✅ Auto-renewal tested
- ✅ Site accessible via HTTPS
- ✅ HTTP redirects to HTTPS
- ✅ SSL Labs test passed (A+ rating)

---

**Your E-Paper Dashboard is now secured with HTTPS! 🔒**

Certificate automatically renews every 60 days. No manual intervention needed!
