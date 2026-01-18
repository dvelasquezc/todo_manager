# Agent Instructions

## Stack
- **Framework:** Next.js 15 (App Router)
- **Backend:** Supabase (Auth, Postgres + RLS, Realtime)
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Deployment:** Vercel
- **PWA:** Manifest-based (service worker optional)

## Command Contract
```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type checking
npm run test       # Run tests with Vitest
```

## Project Structure
```
src/
├── app/                # Next.js App Router
│   ├── (auth)/         # Auth pages (login, signup)
│   └── (app)/          # Protected app pages
├── components/         # React components
│   ├── ui/             # Base UI components
│   ├── layout/         # Layout components
│   └── tasks/          # Task-related components
├── lib/                # Utilities
│   └── supabase/       # Supabase clients
├── actions/            # Server actions
└── types/              # TypeScript types
```

## Database
- Migration: `supabase/migrations/001_initial_schema.sql`
- Tables: profiles, projects, tasks, activity_logs
- All tables have RLS policies for per-user data scoping

## Key Constraints
- **Propose→Approve**: AI assistants never silently edit tasks (V3+)
- **Activity Log**: All task mutations must be logged
- **RLS**: All data is user-scoped at the database level
- **Mobile-first**: Design for phone screens, enhance for desktop

## Version Progression
See `progression.md` for the full roadmap (V1→V7).

Current: **V1** - Tasks, Projects, Done Archive, Activity Logging (no AI)
