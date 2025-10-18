#!/bin/sh
# This script runs before nginx starts and substitutes environment variables
# in the nginx configuration template.
#
# The jonasal/nginx-certbot image automatically runs scripts in /docker-entrypoint.d/
# in alphabetical order during container startup.

set -e

echo "[Init] Starting domain substitution..."

# Check if DOMAIN environment variable is set
if [ -z "$DOMAIN" ]; then
    echo "[Error] DOMAIN environment variable is not set!"
    exit 1
fi

echo "[Init] Domain(s): $DOMAIN"

# Extract primary domain (first domain in space-separated list)
# This is used for certificate paths: /etc/letsencrypt/live/{PRIMARY_DOMAIN}/
PRIMARY_DOMAIN=$(echo "$DOMAIN" | awk '{print $1}')

echo "[Init] Primary domain (for certificates): $PRIMARY_DOMAIN"
echo "[Init] All domains (for server_name): $DOMAIN"

# Ensure target directory exists
mkdir -p /etc/nginx/user_conf.d

# Substitute both ${DOMAIN} and ${PRIMARY_DOMAIN} in template
# ${DOMAIN} - All domains for server_name directive (e.g., "example.com www.example.com")
# ${PRIMARY_DOMAIN} - First domain for certificate paths (e.g., "example.com")
# The jonasal/nginx-certbot image will scan user_conf.d for server_name directives
# and automatically request certificates for those domains
export PRIMARY_DOMAIN
envsubst '${DOMAIN} ${PRIMARY_DOMAIN}' < /tmp/nginx.conf.template > /etc/nginx/user_conf.d/app.conf

echo "[Init] Generated nginx config at /etc/nginx/user_conf.d/app.conf"
echo "[Init] Domain substitution complete!"

# Verify the generated config
if [ -f /etc/nginx/user_conf.d/app.conf ]; then
    echo "[Init] Config file created successfully"
    # Show first few lines to verify substitution worked
    echo "[Init] First 30 lines of generated config:"
    head -n 30 /etc/nginx/user_conf.d/app.conf
else
    echo "[Error] Failed to create config file!"
    exit 1
fi
