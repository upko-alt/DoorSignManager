# E-Paper Door Sign Dashboard

A real-time door sign management system that syncs availability status to physical e-paper displays. Department members can update their status through a web dashboard, with changes automatically pushed to e-paper hardware mounted outside offices.

## Features

- 🔐 **Secure Authentication** - Username/password login with role-based access control
- 👥 **User Management** - Admins can create and manage user accounts
- 📊 **Status Dashboard** - Real-time view of all member availability
- 🎨 **Customizable Statuses** - Admin-configurable status options with colors
- 📝 **Custom Messages** - Add personalized status text (max 50 characters)
- 🔄 **Automatic Sync** - Background sync with e-paper hardware every 5 minutes
- 📜 **Activity History** - Track all status changes with timestamps
- 🌐 **API Integration** - RESTful endpoints for external integrations

## Tech Stack

**Frontend:**
- React + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (React Query)
- Wouter (routing)

**Backend:**
- Node.js + Express
- PostgreSQL (via Drizzle ORM)
- Passport.js (authentication)
- Session-based auth

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd epaper-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database and API credentials
   ```

4. **Set up database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:5000
   - Default admin login: `admin` / `admin123`
   - ⚠️ **Change the password immediately!**

## Production Deployment

### Option 1: Replit Deployment (Easiest!)

Simply click **"Publish"** in Replit - automatic deployment with built-in SSL and domain.

**No setup required!**

### Option 2: Docker Compose (For Your Own Server)

**⚠️ Important:** Docker files are for deploying to **your own server** (DigitalOcean, AWS, etc.), **NOT for running on Replit!**

**Complete Docker guide:** **[DOCKER-DEPLOY.md](./DOCKER-DEPLOY.md)**

For self-hosted deployment on your own server:

```bash
# After uploading code to your server:
cp .env.docker .env
# Edit .env with your credentials
docker compose up -d
```

**What you get:**
- ✅ One-command deployment
- ✅ PostgreSQL database included
- ✅ Nginx reverse proxy included
- ✅ Automatic migrations
- ✅ Easy updates and rollbacks
- ✅ Portable across any server

**Quick start:**
1. Create DigitalOcean Droplet (Ubuntu 22.04, 2GB RAM)
2. Run: `./deploy/docker-quick-start.sh` (installs Docker)
3. Upload your code
4. Configure `.env`
5. Run: `docker compose up -d`

### Option 2: Traditional Server Deployment

**Complete guide:** **[DEPLOYMENT.md](./DEPLOYMENT.md)**

Manual setup with PM2 and Nginx:

1. Create Ubuntu 22.04 Droplet (2GB RAM minimum)
2. Run automated setup script
3. Configure PostgreSQL database
4. Deploy application code
5. Set up PM2 process manager
6. Configure Nginx reverse proxy
7. Add SSL certificate with Let's Encrypt

**Quick start for experienced users:** [deploy/quick-start.md](./deploy/quick-start.md)

### Option 3: Other Platforms

Works on any Node.js hosting:
- Railway
- Render
- Heroku
- AWS/GCP/Azure

## Environment Variables

Required variables (see `.env.example` for full template):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/epaper_dashboard

# Session Security
SESSION_SECRET=your_random_32_character_string

# E-Paper API
EPAPER_IMPORT_URL=https://your-api.com/import
EPAPER_IMPORT_KEY=your_import_key
EPAPER_EXPORT_URL=https://your-api.com/export
EPAPER_EXPORT_KEY=your_export_key

# Environment
NODE_ENV=production
```

## Available Scripts

```bash
npm run dev       # Start development server (with hot reload)
npm run build     # Build for production
npm start         # Start production server
npm run db:push   # Push database schema changes
npm run check     # TypeScript type checking
```

## Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities and configs
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Database layer
│   └── sync-service.ts  # E-paper sync service
├── shared/              # Shared types and schemas
│   └── schema.ts        # Drizzle ORM schemas
├── deploy/              # Deployment configs
│   ├── setup-server.sh  # Automated server setup
│   ├── nginx.conf       # Nginx configuration
│   ├── database-setup.md
│   └── ssl-setup.md
├── ecosystem.config.js  # PM2 process manager config
└── .env.example         # Environment template
```

## Default Users

On first run, the system creates a default admin user:
- Username: `admin`
- Password: `admin123`

**IMPORTANT:** Change this password immediately after first login!

## API Documentation

### Authentication Endpoints
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

### Member Endpoints
- `GET /api/members` - List all members
- `GET /api/members/:id` - Get member details
- `PATCH /api/members/:id` - Update member status
- `GET /api/members/:id/history` - Get status history

### Admin Endpoints
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user (admin only)
- `PATCH /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

### Status Options Endpoints
- `GET /api/status-options` - List status options
- `POST /api/status-options` - Create status option (admin only)
- `PATCH /api/status-options/:id` - Update status option (admin only)
- `DELETE /api/status-options/:id` - Delete status option (admin only)

### Sync Endpoints
- `GET /api/sync/status` - Get last sync status
- `POST /api/sync/manual` - Trigger manual sync (admin only)

## E-Paper Integration

The system integrates with e-paper displays using HTTP GET requests:

**Import (Send to E-Paper):**
```
GET {IMPORT_URL}/?import_key={KEY}&{email}_status={status}
```

**Export (Fetch from E-Paper):**
```
GET {EXPORT_URL}/?export_key={KEY}
```

Email addresses are sanitized (@ and . replaced with _) for URL compatibility.

## Security Features

- ✅ Password hashing with bcrypt
- ✅ Session-based authentication
- ✅ Role-based access control
- ✅ Admin-only endpoints protected
- ✅ Self-deletion prevention for admins
- ✅ Secure session cookies
- ✅ SQL injection protection (via Drizzle ORM)

## Troubleshooting

### Database Issues
```bash
# Reset database (WARNING: deletes all data)
npm run db:push --force

# Check database connection
psql $DATABASE_URL
```

### Sync Issues
- Verify `EPAPER_IMPORT_URL` and `EPAPER_EXPORT_URL` are correct
- Check API keys are valid
- View sync status in dashboard header
- Check logs: `pm2 logs` (production) or console (development)

### Build Issues
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run check
```

## Support

For deployment issues, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [deploy/quick-start.md](./deploy/quick-start.md) - Quick start guide
- [deploy/database-setup.md](./deploy/database-setup.md) - Database setup
- [deploy/ssl-setup.md](./deploy/ssl-setup.md) - SSL/HTTPS setup

## License

MIT

## Credits

Built with React, Express, PostgreSQL, and ❤️
