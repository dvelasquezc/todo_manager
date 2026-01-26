# Codebase Navigation Guide

Quick reference for finding and editing code in the Todo List Manager.

## Pages (Routes)

| Route | File | Purpose |
|-------|------|---------|
| `/inbox` | `src/app/(app)/inbox/page.tsx` | Task inbox with pagination |
| `/today` | `src/app/(app)/today/page.tsx` | Today's focused tasks |
| `/calendar` | `src/app/(app)/calendar/page.tsx` | Weekly calendar (4 tabs: Due, Starting, In Progress, Completed) |
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | Analytics dashboard with 11 charts |
| `/projects` | `src/app/(app)/projects/page.tsx` | Project list |
| `/projects/new` | `src/app/(app)/projects/new/page.tsx` | Create new project |
| `/projects/[slug]` | `src/app/(app)/projects/[slug]/page.tsx` | Individual project view |
| `/archive` | `src/app/(app)/archive/page.tsx` | Completed tasks archive |
| `/settings` | `src/app/(app)/settings/page.tsx` | User settings |

## Key Components

### Tasks (`src/components/tasks/`)

| Component | File | Purpose |
|-----------|------|---------|
| TaskCard | `task-card.tsx` | Individual task display with checkbox, focus timer |
| TaskEditModal | `task-edit-modal.tsx` | Full task editing form (309 lines) |
| TaskList | `task-list.tsx` | List of tasks with drag-drop |
| QuickAdd | `quick-add.tsx` | New task creation form (343 lines) |
| StatusTabs | `status-tabs.tsx` | Tab navigation for task status lanes |
| FocusTimer | `focus-timer.tsx` | Focus session timer UI |
| FocusSummaryCard | `focus-summary-card.tsx` | Focus session summary display |
| FocusSessionList | `focus-session-list.tsx` | List of focus sessions |
| BrainDumpModal | `brain-dump-modal.tsx` | AI-powered task parser |
| DependencySelector | `dependency-selector.tsx` | Task dependency picker |

### Calendar (`src/components/calendar/`)

| Component | File | Purpose |
|-----------|------|---------|
| WeekView | `week-view.tsx` | Calendar week grid (Due/Starting/Completed tabs) |
| SpanningWeekView | `spanning-week-view.tsx` | In Progress tab with task bars |
| CalendarTaskCard | `calendar-task-card.tsx` | Task card for calendar view |
| FrictionAlerts | `friction-alerts.tsx` | Stuck/overdue task warnings |

### Dashboard (`src/components/dashboard/`)

| Component | File | Purpose |
|-----------|------|---------|
| StatsCard | `stats-card.tsx` | Summary stat card |
| FrictionAlerts | `friction-alerts.tsx` | Problem task detection |
| DailyCompletionChart | `daily-completion-chart.tsx` | Tasks completed per day |
| DayOfWeekChart | `day-of-week-chart.tsx` | Productivity by weekday |
| HoursByProjectChart | `hours-by-project-chart.tsx` | Time spent per project |
| DeepWorkChart | `deep-work-chart.tsx` | Deep work share over time |
| ContextSwitchingChart | `context-switching-chart.tsx` | Project switching metric |
| PlannedVsActualChart | `planned-vs-actual-chart.tsx` | Estimate vs actual |
| EstimateCalibrationChart | `estimate-calibration-chart.tsx` | Estimate accuracy |
| TaskThroughputChart | `task-throughput-chart.tsx` | Tasks completed trend |
| StatusFlowChart | `status-flow-chart.tsx` | Task status changes |
| WipAgingChart | `wip-aging-chart.tsx` | WIP task age distribution |
| CycleTimeChart | `cycle-time-chart.tsx` | Time to complete by project |

### Layout (`src/components/layout/`)

| Component | File | Purpose |
|-----------|------|---------|
| Sidebar | `sidebar.tsx` | Desktop navigation sidebar |
| MobileNav | `mobile-nav.tsx` | Mobile bottom navigation |
| Header | `header.tsx` | Page header |

### Projects (`src/components/projects/`)

| Component | File | Purpose |
|-----------|------|---------|
| ProjectEditModal | `project-edit-modal.tsx` | Project edit form |

### UI (`src/components/ui/`)

Base UI components (shadcn/ui style): button, input, card, badge, textarea, popover, command, select, dialog, energy-selector, help-tooltip.

## Server Actions (`src/actions/`)

| File | Functions | Purpose |
|------|-----------|---------|
| `tasks.ts` | createTask, updateTask, moveTask, completeTask, deleteTask, archiveTask, getTasksForCalendar | Task CRUD |
| `projects.ts` | createProject, updateProject, deleteProject, archiveProject | Project CRUD |
| `analytics.ts` | getWeeklyStats, getTasksByProject, getFrictionAlerts, getDashboardData... | Analytics queries (1084 lines) |
| `focus.ts` | createFocusSession, updateFocusSession, deleteFocusSession, getFocusSessions | Focus tracking |
| `activity.ts` | logActivity, getActivityLog | Activity audit trail |
| `brain-dump.ts` | parseBrainDump | AI task parser |

## Data Flow

```
User Action → Component → Server Action → Supabase → Activity Log → Revalidate Path → UI Update
```

1. User interacts with component (click, submit, drag)
2. Component calls server action
3. Server action validates input with Zod schema
4. Server action queries/mutates Supabase
5. Server action logs to activity_logs table
6. Server action calls `revalidatePath()` for affected routes
7. Component re-renders with fresh data

## Key Patterns

### Date Handling (CRITICAL)

Always add `T12:00:00` to date-only strings to avoid timezone issues:

```typescript
// BAD - causes date shift in some timezones
const date = new Date('2026-01-20')

// GOOD - for display/formatting
const date = new Date(dateString + 'T12:00:00')

// GOOD - for grouping by date key
const dateKey = dateString.slice(0, 10)
```

### Cache Invalidation

Use targeted path revalidation:

```typescript
// Good - targeted
revalidatePath('/inbox')
revalidatePath('/today')
revalidatePath(`/projects/${slug}`)

// Bad - too broad, causes unnecessary refreshes
revalidatePath('/', 'layout')
```

### Activity Logging

All task mutations must log to activity_logs:

```typescript
import { logActivity } from '@/actions/activity'

await logActivity(supabase, userId, taskId, projectId, 'update', {
  field: 'status',
  old_value: 'inbox',
  new_value: 'today'
})
```

### Task Status Lanes

Valid status values: `inbox`, `today`, `next`, `waiting`, `blocked`, `someday`, `done`

### Task Priorities

Values 1-4, where 1 is highest priority.

## Database Schema

Tables: `profiles`, `projects`, `tasks`, `activity_logs`, `focus_sessions`, `brain_dump_sessions`

All tables have RLS (Row Level Security) for per-user data scoping.

See `supabase/migrations/` for full schema.

## Where to Make Changes

| I want to... | Look at... |
|--------------|------------|
| Change task card appearance | `src/components/tasks/task-card.tsx` |
| Add a new task field | `task-edit-modal.tsx`, `quick-add.tsx`, `actions/tasks.ts`, database migration |
| Modify calendar behavior | `src/components/calendar/week-view.tsx` or `spanning-week-view.tsx` |
| Add a dashboard chart | Create in `components/dashboard/`, add to `dashboard/page.tsx` |
| Change navigation items | `src/components/layout/sidebar.tsx`, `mobile-nav.tsx` |
| Add a new page | Create `src/app/(app)/[route]/page.tsx` |
| Modify analytics queries | `src/actions/analytics.ts` |
| Change validation rules | `src/lib/validations.ts` |

## File Size Reference (for splitting)

| File | Lines | Recommendation |
|------|-------|----------------|
| `actions/analytics.ts` | 1084 | Split by domain |
| `tasks/quick-add.tsx` | 343 | Extract collapsed/expanded states |
| `dashboard/page.tsx` | 336 | Extract header, stats, charts |
| `tasks/task-edit-modal.tsx` | 309 | Extract form sections |
