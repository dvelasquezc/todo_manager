# Todo List Manager

A cloud-synced, cross-device PWA for managing tasks across projects.

## Features (V1)
- Email authentication
- Projects (Teaching, Home, Other + custom research projects)
- Tasks with status lanes (inbox, today, next, waiting, blocked, someday, done)
- Due dates (best-case and worst-case)
- Time estimates
- Priority levels
- Done archive with filters
- Activity logging for all task changes
- Mobile-first responsive design
- PWA installable

## Tech Stack
- Next.js 15 (App Router)
- Supabase (Auth, Postgres, Realtime)
- Tailwind CSS
- TypeScript

## Setup

### Prerequisites
- Node.js 20+
- Supabase account

### 1. Clone and install
```bash
npm install
```

### 2. Create Supabase project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Settings → API and copy your project URL and anon key

### 3. Configure environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run database migration
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Run the SQL

### 5. Start development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Commands
```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm run typecheck  # Type checking
npm run test       # Run tests
```

## Deployment (Vercel)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## Project Structure
```
src/
├── app/                # Pages and layouts
│   ├── (auth)/         # Login, signup
│   └── (app)/          # Protected pages (inbox, today, projects, archive)
├── components/         # React components
├── actions/            # Server actions (CRUD with activity logging)
├── lib/                # Utilities and Supabase clients
└── types/              # TypeScript types
```

## License
MIT
