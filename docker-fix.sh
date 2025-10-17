#!/bin/bash

echo "🔧 Fixing Docker build - Creating optimized configuration"

# Stop everything
docker compose down -v

# Clean all Docker cache
docker system prune -af
docker builder prune -af

# Check if server has enough memory
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MEM" -lt 1500 ]; then
    echo "⚠️  Low memory detected. Adding swap space..."
    
    # Add swap if not exists
    if [ ! -f /swapfile ]; then
        sudo fallocate -l 2G /swapfile
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo "✅ Swap added"
    fi
fi

echo "🐳 Building with optimized Dockerfile (this will be faster)..."

# Build with progress output
docker compose build --progress=plain

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🚀 Starting services..."
    docker compose up -d
    
    echo ""
    echo "✅ Done! Your app should be running."
    echo "Check status: docker compose ps"
    echo "View logs: docker compose logs -f app"
else
    echo "❌ Build failed. Check the error above."
    exit 1
fi
