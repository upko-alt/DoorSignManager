# E-Paper Door Sign Dashboard

## Overview

This is a real-time door sign management system that allows department members to update their availability status, which syncs to physical e-paper displays mounted outside their offices. The application provides a dashboard where users can set predefined statuses (Available, In Meeting, Out, Do Not Disturb, Be Right Back) or create custom status messages. The system integrates with external e-paper hardware via HTTP APIs to push status updates to physical displays.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Members Table**:
  - `id`: UUID primary key (auto-generated)
  - `name`: Member's full name
  - `email`: Email address (used for e-paper API routing)
  - `avatarUrl`: Optional profile image URL
  - `currentStatus`: Current availability status
  - `customStatusText`: Optional custom message (max 50 chars)
  - `lastUpdated`: Timestamp of last status change

**Key Design Decision**: Email is used as the identifier for e-paper device mapping. The external API expects sanitized email addresses (replacing @ and . with _) as parameter keys.

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