# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks
- `npm run db:setup` - Create Turso database tables
- `npm run db:seed` - Seed sensor data from sensorTable.tsv
- `npm run users:load` - Load default users into Redis/memory storage

## Architecture Overview

This is a Next.js 14 application using the App Router pattern with TypeScript. The project is VERTRIQE Adest, an AI-driven energy saving technology dashboard.

### Authentication System
- JWT-based authentication using `jose` library
- Middleware-protected routes (all pages except `/login`, `/energy`, and auth API routes)
- User authentication stored in Redis (with in-memory fallback)
- Default test user: `abby@abby.md` / `aassddff`

### Key Infrastructure
- **Storage**: Redis Cloud with graceful fallback to in-memory storage
- **Database**: Turso (libSQL) for sensor data storage
- **Middleware**: JWT token verification in `middleware.ts`
- **Context**: `UserProvider` in `contexts/user-context.tsx` for user state management
- **Styling**: Tailwind CSS with shadcn/ui components

### Application Structure
- `/app/energy` - Energy dashboard (public access)
- `/app/login` - Authentication page
- `/app/management` - Management interface
- `/app/performance` - Performance metrics
- `/app/users` - User management
- `/app/api/auth/*` - Authentication endpoints
- `/app/api/dashboard` - Dashboard data
- `/app/api/tsdb` - Time series database integration

### Component Libraries
- shadcn/ui components in `/components/ui/`
- Custom charts: `bar-chart.tsx`, `line-chart.tsx`, `pie-chart.tsx`
- Recharts for data visualization
- Chart.js integration

### State & Data Management
- React Context for user authentication state
- Server-side data fetching in API routes
- Redis for session and data storage

### Environment Variables Required
- `JWT_SECRET` - JWT signing secret
- `REDIS_URL` - Redis Cloud connection URL (optional, fallback to memory)
- `DEFAULT_USERS` - JSON array of default test users with name, email, and password fields
- `TURSO_DATABASE_URL` - Turso database URL (required for sensor data storage)
- `TURSO_AUTH_TOKEN` - Turso authentication token (optional for local development)

### Default Test Users
The application loads test users from the `DEFAULT_USERS` environment variable or falls back to:
1. **Hai Sang** - `abby@abby.md` / `aassddff`
2. **The Hunt** - `hunt@vertriqe.com` / `huntpass123`
3. **Weave Studio** - `weave@vertriqe.com` / `weave-vertriqe-2025!`
4. **About Coffee Jeju** - `coffee@vertriqe.com` / `coffee-jeju-2025!`

## Testing
No specific test framework is configured. When adding tests, examine the codebase to determine the appropriate testing approach.