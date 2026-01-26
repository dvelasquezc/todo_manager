# PowerShell Startup Guide

## Prerequisites

1. **Node.js** (v18.17 or later)
   ```powershell
   node --version
   ```

2. **npm** (comes with Node.js)
   ```powershell
   npm --version
   ```

## Initial Setup (First Time Only)

1. **Navigate to project**
   ```powershell
   cd C:\Users\DVelasquez\Dropbox\apps\todolistmanager
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Configure environment**

   Copy `.env.example` to `.env.local`:
   ```powershell
   Copy-Item .env.example .env.local
   notepad .env.local
   ```

   Required variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ANTHROPIC_API_KEY=your-anthropic-api-key  # For AI features (Brain Dump)
   ```

4. **Run database migrations**

   Go to your Supabase project dashboard > SQL Editor and run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_update_task_dates.sql`
   - `supabase/migrations/003_v1_5_features.sql`

## Daily Startup

1. **Open PowerShell and navigate to project**
   ```powershell
   cd C:\Users\DVelasquez\Dropbox\apps\todolistmanager
   ```

2. **Start development server**
   ```powershell
   npm run dev
   ```

3. **Open in browser**

   Navigate to http://localhost:3000

## All npm Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server (hot reload) |
| `npm run build` | Create production build |
| `npm run start` | Run production build |
| `npm run lint` | Check code style with ESLint |
| `npm run typecheck` | Check TypeScript types |
| `npm run test` | Run tests with Vitest |

## Troubleshooting

### Port 3000 Already in Use

Find and kill the process:
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process by PID (replace 1234 with actual PID)
taskkill /PID 1234 /F
```

Or start on a different port:
```powershell
npm run dev -- --port 3001
```

### Node Modules Issues

Clear and reinstall:
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Next.js Cache Issues

Clear the cache:
```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

### TypeScript Errors After Changes

Run type check to find issues:
```powershell
npm run typecheck
```

## Quick Reference

**Start working:**
```powershell
cd C:\Users\DVelasquez\Dropbox\apps\todolistmanager
npm run dev
```

**Before committing:**
```powershell
npm run lint
npm run typecheck
npm run build
```

**Full clean restart:**
```powershell
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```
