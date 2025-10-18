# Creating an Admin User

This document explains how to create an admin user for your E-Paper Door Sign Dashboard.

## Quick Start

On your server, run one of the following commands:

### Option 1: Using npx tsx (Recommended)
```bash
npx tsx server/create-admin.ts
```

This creates an admin user with default credentials:
- Username: `admin`
- Password: `admin123`
- Email: `admin@department.edu`

### Option 2: Custom Username & Password
```bash
npx tsx server/create-admin.ts myusername mypassword
```

### Option 3: Custom Username, Password & Email
```bash
npx tsx server/create-admin.ts myusername mypassword admin@example.com
```

## Examples

**Create admin with default credentials:**
```bash
npx tsx server/create-admin.ts
```

**Create admin with custom credentials:**
```bash
npx tsx server/create-admin.ts john secretpass123
```

**Create admin with all custom details:**
```bash
npx tsx server/create-admin.ts jane.smith securePass456 jane@company.com
```

## Requirements

- Node.js must be installed on your server
- Your `DATABASE_URL` environment variable must be configured
- The database schema must already exist (run `npm run db:push` first if needed)

## Troubleshooting

### "User already exists" error
If you see this message, the username is already taken. Either:
1. Use a different username
2. Delete the existing user from the database first

### "DATABASE_URL not found" error
Make sure your `.env` file or environment variables include `DATABASE_URL` with your PostgreSQL connection string.

### "Module not found" error
Run `npm install` first to install all dependencies.

## What This Script Does

1. ✅ Connects to your PostgreSQL database
2. ✅ Checks if the username already exists
3. ✅ Hashes the password securely using bcrypt
4. ✅ Creates the admin user with the 'admin' role
5. ✅ Displays the login credentials

## Security Note

The password is hashed using bcrypt (10 rounds) before being stored in the database. Never store plain-text passwords!
