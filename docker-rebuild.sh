#!/bin/bash

# Complete Docker rebuild script - clears all cache

echo "🧹 Cleaning Docker cache..."

# Stop all containers
docker compose down -v 2>/dev/null || true

# Remove build cache
docker builder prune -af

# Remove all unused images
docker image prune -af

# Remove the specific image if it exists
docker rmi epaper-dashboard-app 2>/dev/null || true
docker rmi $(docker images -q 'epaper-dashboard*') 2>/dev/null || true

echo "✅ Cache cleared!"
echo ""
echo "🐳 Building from scratch (this will take a few minutes)..."

# Build without cache
docker compose build --no-cache

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Starting services..."

# Start services
docker compose up -d

echo ""
echo "✅ Done! Check status with: docker compose ps"
echo "📋 View logs with: docker compose logs -f app"
