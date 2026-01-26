# Agent Instructions

## Stack
- **Framework:** Next.js 16 (App Router)
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
│   ├── tasks/          # Task-related components
│   ├── calendar/       # Calendar views and components
│   └── dashboard/      # Analytics charts
├── lib/                # Utilities
│   └── supabase/       # Supabase clients
├── actions/            # Server actions
└── types/              # TypeScript types
```

## Database
- Migration: `supabase/migrations/001_initial_schema.sql`
- Tables: profiles, projects, tasks, activity_logs, focus_sessions
- All tables have RLS policies for per-user data scoping

## Key Constraints
- **Propose→Approve**: AI assistants never silently edit tasks (V3+)
- **Activity Log**: All task mutations must be logged
- **RLS**: All data is user-scoped at the database level
- **Mobile-first**: Design for phone screens, enhance for desktop

## Code Conventions

### Date Handling (IMPORTANT)
Always handle date-only strings carefully to avoid timezone bugs:
```typescript
// BAD - causes timezone shift (Jan 20 becomes Jan 19 in US timezones)
const date = new Date('2026-01-20')

// GOOD - for display/formatting
const date = new Date(dateString + 'T12:00:00')

// GOOD - for grouping by date key
const dateKey = dateString.slice(0, 10)
```

### Task Card
- Click task content → opens edit modal
- Circle checkbox → toggle complete
- Focus timer → start/stop tracking
- No expand/collapse - all editing via modal

### Calendar Tabs
1. Due - group by `due_date`, drag updates `due_date`
2. Starting - group by `start_date`, drag updates `start_date`
3. In Progress - spanning bars, drag updates `start_date`
4. Completed - group by `completed_at`, read-only

## Version Progression
See `progression.md` for the full roadmap (V1→V7).
See `progression_report.md` for detailed implementation notes.

Current: **V1.5** - Tasks, Projects, Calendar, Focus Timer, Friction Alerts (ready for V2)

## Development Workflow

### Progression Report Maintenance (REQUIRED)
When making changes to the codebase, you MUST update `progression_report.md`:

1. **Before starting work:**
   - Read the current `progression_report.md` to understand context
   - Note the last session number and date

2. **During implementation:**
   - Document each significant change as you complete it
   - Include file names and line numbers when relevant
   - Note any bugs discovered and fixed

3. **After completing work:**
   - Add a new session section with date
   - Summarize all changes made
   - Update the "What's Ready" section if applicable
   - Include technical context for the next agent

### Report Format
```markdown
## Session [N] - [Date]

### [Task Number]. [Task Title]
**Issue:** Brief description of the problem
**Root cause:** Technical explanation (if a bug fix)
**Files modified:** List of files changed
**Changes:** What was done
**Testing:** How it was verified
```

### Required Sections in progression_report.md
- Overview with start date and current version status
- Tasks Summary table (task, status, notes)
- Completed Work details
- Technical Context for Next Agent
- What's Ready / Next Steps
