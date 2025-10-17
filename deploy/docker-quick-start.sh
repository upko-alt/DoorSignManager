#!/bin/bash

# Quick Start Script for Docker Deployment
# This script automates the Docker setup on a fresh Ubuntu server

set -e  # Exit on error

echo "🐳 E-Paper Dashboard - Docker Quick Start"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Update system
echo "📦 Updating system..."
apt update && apt upgrade -y
echo -e "${GREEN}✓${NC} System updated"
echo ""

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}✓${NC} Docker installed: $(docker --version)"
else
    echo -e "${YELLOW}!${NC} Docker already installed: $(docker --version)"
fi
echo ""

# Install Docker Compose
echo "📦 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    apt install -y docker-compose-plugin
    echo -e "${GREEN}✓${NC} Docker Compose installed"
else
    echo -e "${YELLOW}!${NC} Docker Compose already installed"
fi
echo ""

# Set up firewall
echo "🔒 Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow OpenSSH
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo -e "${GREEN}✓${NC} Firewall configured"
else
    apt install -y ufw
    ufw --force enable
    ufw allow OpenSSH
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo -e "${GREEN}✓${NC} Firewall installed and configured"
fi
echo ""

# Install Git
echo "📦 Installing Git..."
if ! command -v git &> /dev/null; then
    apt install -y git
    echo -e "${GREEN}✓${NC} Git installed"
else
    echo -e "${YELLOW}!${NC} Git already installed"
fi
echo ""

# Install Certbot (for SSL)
echo "🔐 Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    apt install -y certbot
    echo -e "${GREEN}✓${NC} Certbot installed"
else
    echo -e "${YELLOW}!${NC} Certbot already installed"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}✅ Server setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Clone/upload your application code"
echo "2. cd into your app directory"
echo "3. Copy .env.docker to .env and configure"
echo "4. Run: docker compose up -d"
echo "5. Visit: http://YOUR_SERVER_IP"
echo ""
echo "📚 See DOCKER-DEPLOY.md for detailed instructions"
echo ""
