# E-Paper Door Sign Dashboard

## Overview
This project is a real-time E-Paper Door Sign Dashboard designed to manage and display departmental availability statuses on physical e-paper displays. Users can update their status (e.g., Available, In Meeting, Out) or set custom messages via a web dashboard. The system pushes these updates to external e-paper hardware, streamlining communication and enhancing office efficiency. The business vision is to provide a clear, immediate, and easily manageable presence indicator for department members, reducing interruptions and improving internal coordination.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with TypeScript, Vite, and Wouter for routing. UI components are built with Radix UI primitives and shadcn/ui, styled using Tailwind CSS, following a Material Design-inspired aesthetic prioritizing clarity and efficiency. It features a custom color palette supporting dark and light modes, Inter and Roboto typography, and a responsive grid layout. TanStack Query manages server state for responsive data fetching, and React Hook Form with Zod handles form validation.

### Technical Implementations
The backend is an Express.js application with TypeScript, providing RESTful API endpoints. It uses Drizzle ORM for PostgreSQL database interaction, following a schema-first approach with Zod validation. Development utilizes Vite middleware for HMR, and custom middleware logs API requests and responses. The application supports an in-memory storage option for development and PostgreSQL for production.

### Feature Specifications
- **User Management & Authentication**: Username/password authentication with Passport-local, bcrypt hashing. Only admins can create users; the first user is an admin. Session-based authentication is used.
- **Role-Based Access Control**: Regular users manage only their own status; admins can manage all users and settings.
- **Dynamic Status Options**: Admins can define, edit, and reorder custom status options (name, color, sort order) via an interface, which are then dynamically displayed throughout the application.
- **Activity Logging**: All status changes are logged with timestamps and user information.

### System Design Choices
- **Data Model**: A unified `users` table handles both authentication and door sign profile information, including e-paper specific configurations. A separate `status_history` table tracks changes.
- **E-Paper Integration**: One-way communication from dashboard to e-paper displays. E-paper credentials are per-user and configured by admins. A verification table displays current e-paper system status (read-only) for administrative oversight without syncing back to the dashboard.
- **Database**: PostgreSQL is used for persistence via Drizzle ORM.
- **Security**: Password hashes are never exposed in API responses. E-paper credentials are only visible to administrators.

## External Dependencies

### E-Paper Hardware Integration
- **Custom E-Paper API**: Uses a simple GET-based API for one-way status updates to physical e-paper displays. Supports per-user configuration for `epaperImportUrl`, `epaperExportUrl`, and `epaperApiKey`.
    - **Import API**: Sends status updates (e.g., `https://in.zivyobraz.eu/?import_key={apiKey}&status_{username}={statusValue}`).
    - **Export API**: Fetches current status for verification purposes (e.g., `https://out.zivyobraz.eu/?export_key={apiKey}&my_values=json`).

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives.
- **shadcn/ui**: Styled components built on Radix UI.
- **Lucide React**: Icon system.

### Build & Development Tools
- **Vite**: Frontend build tool.
- **tsx**: TypeScript execution for Node.js.
- **esbuild**: Production bundling.
- **Tailwind CSS**: Utility-first CSS.

### Data Management
- **@tanstack/react-query**: Server state management with automatic refetching.
- **Drizzle ORM**: Type-safe PostgreSQL ORM.
- **@neondatabase/serverless**: PostgreSQL driver.
- **Zod**: Schema validation.

### Additional Dependencies
- **date-fns**: Date formatting.
- **class-variance-authority**: Type-safe component variant management.
- **nanoid**: Unique ID generation.