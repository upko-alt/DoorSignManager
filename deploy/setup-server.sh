#!/bin/bash

# E-Paper Dashboard - DigitalOcean Droplet Setup Script
# This script automates the server setup process

set -e  # Exit on any error

echo "🚀 Starting E-Paper Dashboard Server Setup..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Running with appropriate permissions"

# Update system
echo ""
echo "📦 Updating system packages..."
apt update && apt upgrade -y
echo -e "${GREEN}✓${NC} System updated"

# Install Node.js 20
echo ""
echo "📦 Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}✓${NC} Node.js installed: $(node --version)"
else
    echo -e "${YELLOW}!${NC} Node.js already installed: $(node --version)"
fi

# Install PostgreSQL
echo ""
echo "📦 Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    echo -e "${GREEN}✓${NC} PostgreSQL installed"
else
    echo -e "${YELLOW}!${NC} PostgreSQL already installed"
fi

# Install Nginx
echo ""
echo "📦 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo -e "${GREEN}✓${NC} Nginx installed"
else
    echo -e "${YELLOW}!${NC} Nginx already installed"
fi

# Install PM2
echo ""
echo "📦 Installing PM2 process manager..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo -e "${GREEN}✓${NC} PM2 installed"
else
    echo -e "${YELLOW}!${NC} PM2 already installed"
fi

# Install Git
echo ""
echo "📦 Installing Git..."
if ! command -v git &> /dev/null; then
    apt install -y git
    echo -e "${GREEN}✓${NC} Git installed"
else
    echo -e "${YELLOW}!${NC} Git already installed"
fi

# Configure UFW Firewall
echo ""
echo "🔒 Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    echo -e "${GREEN}✓${NC} Firewall configured"
else
    apt install -y ufw
    ufw --force enable
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    echo -e "${GREEN}✓${NC} Firewall installed and configured"
fi

# Install Certbot for SSL
echo ""
echo "🔐 Installing Certbot for SSL certificates..."
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓${NC} Certbot installed"
else
    echo -e "${YELLOW}!${NC} Certbot already installed"
fi

# Setup complete
echo ""
echo "================================================"
echo -e "${GREEN}✅ Server setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Create PostgreSQL database and user (see DEPLOYMENT.md)"
echo "2. Clone or upload your application code"
echo "3. Copy .env.example to .env and configure"
echo "4. Run: npm install"
echo "5. Run: npm run build"
echo "6. Run: npm run db:push"
echo "7. Start with PM2: pm2 start ecosystem.config.js"
echo "8. Configure Nginx (use deploy/nginx.conf template)"
echo "9. Set up SSL: sudo certbot --nginx -d your_domain.com"
echo ""
echo "📚 See DEPLOYMENT.md for detailed instructions"
echo ""
