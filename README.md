# VizzoCheck

Multi-agency platform for managing, verifying, and reporting field merchandising visits performed by outsourced promoters in supermarkets.

## Tech Stack

- **Backend**: Express + TypeScript
- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT
- **Package Manager**: Bun
- **File Storage**: Local filesystem

## Project Structure

```
vizzo-check/
├── backend/      # Express API server
├── frontend/     # Next.js app (Admin + PWA)
├── shared/       # Shared TypeScript types
└── supabase/     # Database migrations
```

## Development

### Prerequisites

- [Bun](https://bun.sh) installed
- Supabase project set up

### Setup

1. Install dependencies:
```bash
bun install
```

2. Set up environment variables:
- Copy `.env.example` files in `backend/` and `frontend/`
- Fill in Supabase credentials and JWT secret

3. Run database migrations:
```bash
# Set up Supabase CLI and run migrations
cd supabase
supabase db push
```

4. Start development servers:
```bash
bun run dev
```

This will start:
- Backend API on `http://localhost:3001`
- Frontend on `http://localhost:3000`

## User Roles

- **Agency Admin**: Manages all data, reviews visits, generates reports
- **Promoter**: Executes visits, uploads proof, views history and earnings

## Features

- Multi-agency data isolation
- GPS-validated visit creation
- Photo proof of service (camera-only)
- Financial reporting and calculations
- CSV/PDF export
- PWA for mobile promoters
