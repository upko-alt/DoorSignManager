# E-Paper Door Sign Dashboard

## Overview

This is a real-time door sign management system that allows department members to update their availability status, which syncs to physical e-paper displays mounted outside their offices. The application provides a dashboard where users can set predefined statuses (Available, In Meeting, Out, Do Not Disturb, Be Right Back) or create custom status messages. The system integrates with external e-paper hardware via HTTP APIs to push status updates to physical displays.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 17, 2025)

### Authentication System Migration
- **Replaced Replit Auth with username/password authentication**
  - Removed self-registration capability - only admins can create users
  - Implemented passport-local strategy with bcrypt password hashing
  - First user created automatically becomes admin
  - Session-based authentication with secure session management

### User Management & Authorization
- **Admin User Management Interface** (`/admin/users`)
  - Admins can create, edit, and delete user accounts
  - Users assigned specific e-paper IDs (e.g., "user1", "user2") for external system integration
  - Role-based access control: regular users vs. administrators
  - Users can be linked to member profiles for status updates
- **Authorization Rules**:
  - Regular users can only update their own member's status (if assigned)
  - Admins can update all statuses and manage all users
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
- **Users Table** (Authentication):
  - `id`: UUID primary key (auto-generated)
  - `username`: Unique login username
  - `passwordHash`: Bcrypt-hashed password
  - `email`, `firstName`, `lastName`: Optional profile information
  - `role`: User role ("admin" or "regular")
  - `memberId`: Foreign key to members table (optional)
  - `epaperId`: E-paper system identifier (e.g., "user1", "user2")
  - `createdAt`, `updatedAt`: Timestamps

- **Members Table**:
  - `id`: UUID primary key (auto-generated)
  - `name`: Member's full name
  - `email`: Email address (used for e-paper API routing)
  - `avatarUrl`: Optional profile image URL
  - `currentStatus`: Current availability status
  - `customStatusText`: Optional custom message (max 50 chars)
  - `lastUpdated`: Timestamp of last status change

- **Status History Table**:
  - `id`: UUID primary key (auto-generated)
  - `memberId`: Foreign key to members table
  - `status`: Status value at time of change
  - `customStatusText`: Custom message (if any)
  - `changedAt`: Timestamp of status change
  - `changedBy`: User who made the change (optional)

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
- **Import API** (`EPAPER_IMPORT_URL`): Sends status updates to e-paper displays
  - Authentication via `EPAPER_IMPORT_KEY` query parameter
  - GET request with email-based parameter routing (e.g., `?user_email_status=Available`)
  - Email sanitization: converts `@` and `.` to `_` for URL compatibility
- **Export API** (`EPAPER_EXPORT_URL`): Fetches current status from e-paper system
  - Authentication via `EPAPER_EXPORT_KEY` query parameter
  - Used for synchronization and verification

**Key Design Decision**: The e-paper service uses a simple GET-based API with query parameters rather than POST/JSON. This design accommodates legacy hardware constraints while maintaining reliability through explicit error handling and logging.

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