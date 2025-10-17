# ⚠️ IMPORTANT: Docker Deployment Instructions

## 🚨 READ THIS FIRST!

**You CANNOT run Docker on Replit!**

The Docker files in this project (Dockerfile, docker-compose.yml) are for **deploying to your own server** (DigitalOcean, AWS, etc.), **NOT for running on Replit**.

## On Replit: Use the Normal Workflow

```bash
# On Replit - This is what you use:
npm run dev
```

Then click the webview to access your app.

## For Production Deployment: Two Options

### Option 1: Deploy on Replit (Easiest!)

**Just click the "Publish" button in Replit!**

- ✅ One-click deployment
- ✅ Automatic SSL/HTTPS  
- ✅ Built-in domain (yourapp.replit.app)
- ✅ No server management needed

### Option 2: Deploy to Your Own Server with Docker

**Step 1: Download Your Code from Replit**
- Use Git to export your repository
- Or download as ZIP

**Step 2: Upload to Your Server**
```bash
# From your local computer:
scp -r /path/to/your/app root@YOUR_SERVER_IP:~/epaper-dashboard/
```

**Step 3: Run Docker on Your Server (Not Replit!)**
```bash
# SSH into your server:
ssh root@YOUR_SERVER_IP

# Navigate to your app:
cd epaper-dashboard

# Configure environment:
cp .env.docker .env
nano .env  # Add your credentials

# Start with Docker:
docker compose up -d
```

## Summary

| Where | What to Run | Purpose |
|-------|-------------|---------|
| **On Replit** | `npm run dev` | Development & testing |
| **On Replit** | Click "Publish" button | Easy production deployment |
| **On YOUR Server** | `docker compose up -d` | Self-hosted deployment |

## Common Mistake

❌ **WRONG:**
```bash
# Trying to run this ON REPLIT - This won't work!
docker compose up -d
```

✅ **RIGHT:**
```bash
# On Replit for development:
npm run dev

# OR for production, click "Publish" button

# OR download code and run Docker on YOUR OWN server
```

## Questions?

- **"Can I test Docker on Replit?"** → No, use `npm run dev` instead
- **"How do I deploy on Replit?"** → Click the "Publish" button
- **"When do I use Docker?"** → When deploying to your own DigitalOcean/AWS server
- **"Where do I run docker compose?"** → On your DigitalOcean Droplet, NOT on Replit

---

**Bottom line:** Docker files are for external servers. On Replit, use the normal development workflow or click "Publish" for deployment.
