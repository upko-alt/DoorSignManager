# E-Paper Door Sign Dashboard

## Overview

This is a real-time door sign management system that allows department members to update their availability status, which syncs to physical e-paper displays mounted outside their offices. The application provides a dashboard where users can set predefined statuses (Available, In Meeting, Out, Do Not Disturb, Be Right Back) or create custom status messages. The system integrates with external e-paper hardware via HTTP APIs to push status updates to physical displays.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### October 18, 2025 - Per-User E-Paper Configuration
- **Per-User E-Paper Credentials**
  - Moved e-paper configuration from global environment variables to per-user database fields
  - Each user now has: `epaperImportUrl`, `epaperExportUrl`, `epaperApiKey` stored in users table
  - Admins can configure e-paper endpoints individually for each user through the Add/Edit user dialogs
  - Users without e-paper configuration are automatically skipped during sync operations
- **Refactored E-Paper Services**
  - Updated `syncService.ts` to iterate through users and use each user's own credentials instead of global env vars
  - Updated `EpaperService` in `routes.ts` to accept per-user credentials as method parameters
  - Sync continues operating even if individual user syncs fail (isolated error handling)
- **Security Hardening**
  - Implemented role-based filtering for e-paper credentials in API responses
  - Non-admin users cannot see any user's e-paper API keys, URLs, or endpoints
  - Only admins can view and manage e-paper credentials through `/api/members` endpoints
  - Prevents credential leakage while maintaining admin functionality
- **UI Improvements**
  - Removed broken "available count" display from dashboard header (no longer accurate with custom statuses)
  - Added three new input fields to admin user management forms for e-paper configuration

### October 17, 2025

### Major Architecture Refactor: Merged Members into Users Table
- **Simplified Data Model**
  - Removed separate members table - users now contain status fields directly
  - Each user has: avatarUrl, currentStatus, customStatusText, lastUpdated
  - Eliminates unnecessary joins and reduces data redundancy
  - E-paper sync now uses user.epaperId instead of member.email
- **Database Migration**
  - Dropped members table and member_id foreign key from users
  - Updated status_history to reference users.id instead of members.id
  - All existing data migrated to new schema structure
- **Security Hardening**
  - All API endpoints filter out passwordHash before returning user data
  - Prevents password hash exposure in responses
  - Comprehensive sanitization across all user-returning endpoints

### Authentication System
- **Username/Password Authentication**
  - Passport-local strategy with bcrypt password hashing
  - Only admins can create new users (no self-registration)
  - First user created automatically becomes admin
  - Session-based authentication with secure cookie management

### User Management & Authorization
- **Admin User Management Interface** (`/admin/users`)
  - Admins can create, edit, and delete user accounts
  - Users assigned specific e-paper IDs (e.g., "user1", "user2") for external system integration
  - Role-based access control: regular users vs. administrators
  - Removed member assignment UI (users ARE the members now)
- **Authorization Rules**:
  - Regular users can only update their own status (userId-based authorization)
  - Admins can update any user's status and manage all users
  - Self-deletion prevention for admin accounts

### Activity Logging & History
- **Status History Tracking**
  - All status changes logged to status_history table with timestamps
  - History displayed in member detail view with timeline
  - Tracks who made changes and when

### Automatic E-Paper Sync
- **Background Sync Service**
  - Runs every 5 minutes to fetch statuses from e-paper export endpoint
  - Updates local database with external changes
  - Properly handles and records sync failures
- **Sync Status UI**
  - Dashboard header displays last sync time
  - Shows sync errors if credentials missing or fetch fails
  - Manual sync trigger for admins via refresh button
  - Success/failure indicators with detailed error messages

### Database Migration
- **Migrated from in-memory to PostgreSQL**
  - All data now persisted in production database
  - Added sync_status and status_history tables
  - Schema managed via Drizzle ORM

### Dynamic Status Options Management
- **Admin Status Options Interface** (`/admin/status-options`)
  - Admins can create, edit, delete, and reorder status options
  - Each status has a name, color variant (success/warning/destructive/secondary/outline), and sort order
  - System validates all inputs: name (1-50 chars), color (enum), sortOrder (numeric string)
  - Database seeded with default statuses: Available, In Meeting, Out, Do Not Disturb, Be Right Back
- **Dynamic Status Display**
  - Dashboard and components fetch status options from database instead of using hardcoded values
  - StatusBadge component uses prop-based status options to eliminate redundant queries
  - Status colors dynamically mapped based on database configuration
- **Validation & Stability**
  - Zod validation enforces strict constraints on all CRUD operations
  - NaN-safe numeric sorting ensures deterministic status ordering
  - Empty PATCH body validation prevents malformed update requests

**Test Credentials**: First admin user - username: "admin", password: "admin123"

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui component system
- **Styling**: Tailwind CSS with custom design system based on Material Design principles
- **State Management**: TanStack Query (React Query) for server state and data fetching
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **Design System**: 
  - Custom color palette supporting dark mode (primary) and light mode
  - Typography using Inter for body/UI and Roboto for headers
  - Responsive grid layout (1-2-3 columns based on viewport)
  - Status-specific colors for different availability states

**Key Design Decision**: Material Design was chosen as the foundation because this is a utility-focused internal dashboard prioritizing clarity, efficiency, and real-time information display over marketing aesthetics.

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Pattern**: RESTful endpoints under `/api` namespace
- **Data Layer**: 
  - In-memory storage implementation (`MemStorage`) for development/demo
  - Drizzle ORM configured for PostgreSQL production use
  - Schema-first approach with Zod validation
- **Development Setup**: Vite middleware integration for HMR in development mode
- **Request Logging**: Custom middleware for API request/response logging with duration tracking

**Key Design Decision**: The application uses an in-memory storage adapter during development with sample data, but the schema and ORM setup support PostgreSQL for production deployment. This allows rapid development while maintaining production-ready architecture.

### Database Schema (PostgreSQL via Drizzle ORM)
- **Users Table** (Combined Authentication & Door Sign Profile):
  - `id`: UUID primary key (auto-generated)
  - `username`: Unique login username
  - `passwordHash`: Bcrypt-hashed password (never exposed in API responses)
  - `email`, `firstName`, `lastName`: Profile information
  - `role`: User role ("admin" or "regular")
  - `epaperId`: E-paper system identifier (e.g., "user1", "user2")
  - `epaperImportUrl`: Per-user e-paper import endpoint URL (optional)
  - `epaperExportUrl`: Per-user e-paper export endpoint URL (optional)
  - `epaperApiKey`: Per-user e-paper API authentication key (optional, admin-only visibility)
  - `avatarUrl`: Optional profile image URL
  - `currentStatus`: Current availability status (default: "Available")
  - `customStatusText`: Optional custom message (max 50 chars)
  - `lastUpdated`: Timestamp of last status change
  - `createdAt`, `updatedAt`: Timestamps

- **Status History Table**:
  - `id`: UUID primary key (auto-generated)
  - `userId`: Foreign key to users table (cascade delete)
  - `status`: Status value at time of change
  - `customStatusText`: Custom message (if any)
  - `changedAt`: Timestamp of status change
  - `changedBy`: Username who made the change (optional)

- **Sync Status Table**:
  - `id`: UUID primary key (auto-generated)
  - `syncedAt`: Timestamp of sync operation
  - `success`: "true" or "false" indicating sync result
  - `errorMessage`: Error details (if sync failed)
  - `updatedCount`: Number of members updated

- **Status Options Table**:
  - `id`: UUID primary key (auto-generated)
  - `name`: Status name (e.g., "Available", "In Meeting")
  - `color`: Badge color variant (success, warning, destructive, secondary, outline)
  - `sortOrder`: Numeric string for display ordering (validated with regex, NaN-safe sorting)

**Key Design Decision**: Username/password authentication with role-based access control. First user created automatically becomes admin. E-paper ID field allows matching users to external system identifiers.

### External Dependencies

#### E-Paper Hardware Integration
- **Per-User Configuration**: Each user can have their own e-paper endpoints and API credentials
  - `epaperImportUrl`: User-specific endpoint for sending status updates to e-paper displays
  - `epaperExportUrl`: User-specific endpoint for fetching current status from e-paper system
  - `epaperApiKey`: User-specific API authentication key
  - All fields are optional and configured by admins through the user management interface
- **Import API**: Sends status updates to e-paper displays
  - Authentication via API key in query parameter
  - GET request with epaper ID-based parameter routing (e.g., `?user1_status=Available`)
  - Supports custom status messages
- **Export API**: Fetches current status from e-paper system
  - Authentication via API key in query parameter
  - Used for synchronization and verification
  - Sync service automatically iterates through all users with configured credentials
- **Security**:
  - E-paper credentials are only visible to admin users via API
  - Non-admin users cannot see any e-paper URLs or API keys
  - Credentials stored in database as plain text (scoped per-user, never exposed to unauthorized users)

**Key Design Decision**: The e-paper service uses a simple GET-based API with query parameters rather than POST/JSON. This design accommodates legacy hardware constraints while maintaining reliability through explicit error handling and logging. Per-user configuration allows flexible deployment where different users may have different e-paper systems or no e-paper display at all.

#### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives (Dialog, Dropdown, Popover, Toast, etc.)
- **shadcn/ui**: Pre-styled components built on Radix UI following the "New York" style variant
- **Lucide React**: Icon system for status indicators and UI elements

#### Build & Development Tools
- **Vite**: Frontend build tool with TypeScript support
- **tsx**: TypeScript execution for Node.js server
- **esbuild**: Production bundling for server code
- **Tailwind CSS**: Utility-first CSS with PostCSS processing

#### Data Management
- **@tanstack/react-query**: Server state management with automatic refetching (30-second intervals)
- **Drizzle ORM**: Type-safe PostgreSQL ORM with schema migrations
- **@neondatabase/serverless**: PostgreSQL driver for serverless environments
- **Zod**: Schema validation for API requests and database operations

**Key Design Decision**: TanStack Query provides optimistic updates for instant UI feedback while maintaining data consistency. Status changes appear immediately in the UI, then sync to the server and e-paper displays asynchronously with automatic rollback on failure.

#### Additional Dependencies
- **date-fns**: Date formatting and relative time display
- **class-variance-authority**: Type-safe component variant management
- **nanoid**: Unique ID generation for client-side operations