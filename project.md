# Spec: Cloud-Synced AI Todo + Project Chat + Manager Assistant (PWA)

## Product summary
A cloud-synced, cross-device (desktop + phone) PWA that manages tasks across projects (research, teaching, home, other), preserves project-specific chat histories, and includes a Manager Assistant that generates daily plans, detects risk/stuck items, runs weekly reviews, and supports modes (Deep Work/Admin Sprint/Low Energy/etc.). The system is propose→approve: the assistant suggests actions; the user explicitly applies them.

---

## Core concepts
### 1) Projects (tabs)
- **System projects (fixed):**
  - Teaching
  - Home
  - Other
- **User-created research projects**
  - Name, optional icon/color, optional short description
  - Optional: “active/archived” state
- **Cross-cutting tags** (orthogonal to projects)
  - e.g., writing, coding, admin, reading, slides, meeting-prep, RA, grant

### 2) Tasks (truth source)
Each task belongs to exactly one project, and may have many tags.

#### Required task fields (user-provided)
- Title
- Notes (optional)
- Due date (best case)
- Due date (worst case)
- Estimated hours (or minutes)
- Completed timestamp (when done)
- Preserve all fields when moved to Done

#### Additional recommended task fields (to power Manager + stats)
- Status: `inbox | next | today | waiting | blocked | someday | done`
- Priority: `1-4` (or `low/med/high/urgent`)
- Importance: `1-4` (separate from priority/urgency)
- Energy: `low | medium | high` (or `unknown`)
- Deep work: boolean
- Dependencies:
  - blocked_by_task_id (optional)
  - blocked_reason (optional text)
- Source: `manual | chat | import`
- Created/updated timestamps

#### Completion prompt (lightweight)
When completing a task, prompt for:
- Actual time spent (optional but encouraged)
- One-line outcome note (optional)

### 3) Activity log (audit trail)
Every create/update/move/complete is logged.
- Who: user / assistant (with model name)
- What changed: field diffs
- When
- Why (optional: “from Manager plan”, “from Project chat”)

### 4) Project chat (memory)
For each project:
- Multiple conversation threads
- Each thread stores full message history
- Thread can have “Context Summary” (periodically refreshed)
- Messages can be linked to tasks created/edited from chat

### 5) Manager Assistant (control center)
A dedicated assistant that reads:
- all tasks across projects
- recent activity log
- project chat summaries
- user preferences (modes, typical capacity)
and produces:
- plans (daily/weekly)
- risk radar alerts
- stuck detection
- suggested actions (structured, apply/reject)

---

## App screens / UX

### A) Todo List Dashboard
- Tabs: projects across top (Teaching/Home/Other + Research projects)
- Each project view:
  - Task lists by status (Inbox / Today / Next / Waiting / Blocked / Someday / Done)
  - Quick add task (default to Inbox)
  - Inline edit fields (due dates, estimates, priority)
- Done view:
  - Filter by week/month
  - Preserve all task info + completed timestamp + actual time + outcome note

### B) Info Dashboard (stats + calendar)
Present “good-looking” cards and charts.

#### Stats (MVP set)
- Hours completed by project (weekly/monthly)
- Tasks completed by project (weekly/monthly)
- Hours by category tag (writing/coding/admin/etc.)
- Planned vs actual time (by week; confidence improves over time)
- Overdue / slippage: best-case → worst-case usage rate
- Work-in-progress count by project
- Aging tasks: tasks untouched for N days

#### Calendar views (two-layer)
- Due calendar: shows best-case and worst-case deadlines
- Plan calendar: shows planned blocks from Manager (if enabled)

### C) Project Chat Dashboard
- Choose a project → see threads
- Create new thread (e.g., “Slides plan”, “Model debug”, “Paper structure”)
- Chat has access to:
  - that project’s tasks
  - thread history
  - project summary
- Chat can propose task actions (create/update/split/move/complete) with approval

### D) Manager Assistant Dashboard
Manager has 4 internal tabs:
1. **Today**
2. **Radar** (Risk + Stuck)
3. **Weekly Review**
4. **Modes**

#### Manager: Today
- Proposes “Top 3” (MITs) + optional time-block suggestions
- Explains tradeoffs (“If you do X, Y shifts to worst-case”)
- Produces structured actions:
  - move tasks to Today
  - split large tasks into subtasks
  - defer low-value tasks
  - mark tasks waiting/blocked

#### Manager: Radar
**Risk radar alerts** (ranked High/Med/Low):
- Deadline risk: worst-case due soon, not started
- Cluster risk: multiple deadlines same week
- Capacity risk: estimated hours > typical capacity
- Dependency risk: blocked tasks with no blocker update
- Scope risk: large tasks not decomposed

**Stuck detector**:
- Uses signals: no movement in N days, repeated deferrals, large estimate, unclear next action, blocked with no follow-up
- For each stuck item:
  - ask one crisp question
  - propose 1–3 resolution actions (clarify next action, create subtask, mark blocked, defer, downgrade, drop)

#### Manager: Weekly Review
One-click weekly memo:
- Wins (done tasks + hours by project)
- Reality check (planned vs actual; slips)
- Stuck items (top 5)
- Next week deliverables (3–5 max)
- Suggested skeleton plan (high-level)
- Includes actionable changes to apply

#### Manager: Modes
Modes affect:
- what tasks are shown
- what Manager recommends
- the plan style (deep work vs admin vs recovery)

Required modes:
- Deep Work Mode
- Admin Sprint Mode
- Low Energy Mode
Optional modes:
- Deadline Mode
- Recovery Mode

---

## LLM categorization / tagging (assistive)
When creating a task, the system may propose:
- category tags (writing/coding/admin/reading/slides/etc.)
- deep-work boolean
- energy level
User can accept or ignore; corrections become a learning signal.

---

## Preferences / Settings (global)
### User preferences
- Typical weekly capacity (hours)
- Typical daily capacity (weekday/weekend)
- Preferred deep-work windows (morning/afternoon/evening)
- Max MITs per day (default 3)
- Default mode (optional)
- Overcommit warnings on/off
- Time estimate units (hours vs minutes)
- Calendar integration on/off (plan calendar export later)

### Notification settings (optional)
- Daily plan reminder time
- Risk radar alert threshold (high only vs all)
- Stuck detector ping frequency (e.g., weekly)
- Weekly review day/time

### Privacy / safety settings
- Propose→approve required (always on)
- Which assistants can access which data:
  - Manager: all projects
  - Project chat: only that project
- Activity log retention (default forever)

---

## Propose→Approve action format (conceptual)
Assistant outputs:
- plan_text (human readable)
- actions[] where each action is one of:
  - create_task
  - update_task
  - complete_task
  - move_task (status change)
  - split_task (create subtasks + update parent)
  - defer_task (move to someday + add note)
User clicks Apply per action or Apply all.

---

## Non-goals for early versions
- Perfect external syncing with third-party apps
- Auto-editing without approval
- Complex multi-user collaboration
