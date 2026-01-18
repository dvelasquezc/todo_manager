# Implementation Progression Plan (V1 → V7)

## V1 — Solid Cloud Todo + Projects + Done Archive
Goal: cross-device task manager that you trust.

Must-have:
- Auth (email login)
- Projects (Teaching/Home/Other + custom Research projects)
- Tasks with:
  - title, notes
  - start date + due date
  - estimate hours
  - status lanes: inbox / today / next / waiting / blocked / someday / done
  - priority
  - completed timestamp
- Done archive view with filters (week/month)
- Activity log for all task changes
- Calendar view (weekly) for due dates and start dates
- Mobile-first UI + PWA installable

Nice-to-have:
- Completion prompt: actual time spent + outcome note

Deliverable: "I can run my life on it without AI."

---

## V1.5 — Data Richness + Smart Capture
Goal: capture tasks effortlessly, build data for future AI.

Add:
- **Smart Task Parser (AI):**
  - "Brain dump" text input → LLM structures into tasks
  - Infers project, dates, estimates, priority from natural language
  - Preview/edit before adding
  - One-shot LLM call (not conversational)
- **Focus Timer (low-friction):**
  - Passive tracking: time spent with task open
  - End-of-day summary: "You worked on X tasks, ~Y hours"
  - Optional explicit "Start focus session" mode
- **Energy level field** on tasks (low/medium/high)
- **Task dependencies** (blocked_by field)

Deliverable: "Tasks flow in effortlessly, time is tracked automatically."

---

## V2 — Info Dashboard + Insights
Goal: show the story of your work.

Add:
- Info Dashboard cards:
  - Hours completed by project (weekly/monthly trending)
  - Tasks completed by project
  - WIP count by project
  - **Velocity trend** (tasks/week over time)
  - **Estimate accuracy score** (estimated vs actual)
  - **Project health indicators** (red/yellow/green)
- **Friction Alerts:**
  - Tasks moved 3+ times without completion
  - Tasks stuck in "today" for 3+ days
  - Overdue tasks needing attention
  - Suggestions: break down, delegate, or drop
- Aging tasks list (untouched N days)
- Planned vs actual comparison
- Polished filters and search

Deliverable: "I understand how I spend time and where I'm stuck."

---

## V3 — Project Chat + Task Proposals
Goal: conversational planning per project, grounded in tasks.

Add:
- Project Chat Dashboard:
  - Threads per project
  - Persistent history
  - Thread "Context Summary" (auto-refreshed)
  - **Recent activity auto-injected** (last 5 task changes)
- Chat can read project tasks and propose actions:
  - create/update/move/complete/split
- UI shows proposed actions with Apply/Reject
- **Conversation templates:** "Break this down", "What should I deprioritize?"
- Link chat messages to tasks created/edited from that chat
- Brain dump via chat: "Add these tasks: [list]"

Deliverable: "Each project has its own assistant with memory + safe task editing."

---

## V4 — Manager Assistant (Today + Radar + Weekly Review + Modes)
Goal: the "boss" that coordinates everything.

Add Manager dashboard with:

1) **Today:**
   - Top 3 plan + optional time blocks
   - Tradeoff explanations
   - Actionable proposals
   - **Quick Win Queue** (tasks < 30min, no dependencies)

2) **Radar:**
   - Risk alerts (deadline/cluster/capacity/dependency/scope)
   - Stuck detector (aging + repeated deferrals + big tasks)
   - Resolution proposals
   - **"What If" capacity check** before adding new work

3) **Weekly Review:**
   - One-click weekly memo + suggested actions
   - **Shareable summary** for managers/partners
   - **Reflection prompts**: What went well? What to improve?

4) **Modes:**
   - Deep Work mode
   - Admin Sprint mode
   - Low Energy mode
   - Optional: Deadline mode, Recovery mode

5) **Learning:**
   - **Confidence levels** on AI suggestions
   - **Override learning**: capture why user rejects suggestions

Deliverable: "The app actively manages my time, but I stay in control."

---

## V5 — LLM Auto-Tagging + Learning
Goal: smarter categorization + personalization.

Add:
- On task creation, suggest tags/category/energy/deep-work
- **Task DNA patterns:** "Tasks with 'meeting' average 1.5x estimate"
- Learn from user edits to tags (store corrections)
- Manager uses learned patterns to improve recommendations
- **Auto-adjust estimates** based on historical accuracy

Deliverable: "It adapts to my style and gets better over weeks."

---

## V6 — Integration + Advanced Features
Goal: connect to the real world.

Add:
- **External Calendar Sync (read-only):**
  - Import busy blocks from Google/Outlook
  - Manager sees real available time
- Planning calendar view (time blocks)
- Lightweight reminders:
  - Daily plan ping
  - Weekly review ping
  - High-risk alerts
- **Context Tags:** @home, @office, @phone, @calls
- **Commitment tracking:** tasks promised to others
- **Task Templates:** one-click patterns for recurring work
- **Accountability Partner View:** shareable progress dashboard

Deliverable: "Full integration with my calendar and life."

---

## V7 (Optional) — Advanced Analytics & Prediction
Goal: accuracy and long-horizon planning.

Add:
- Predict time-to-complete from history
- "Risk forecast" for next 2–4 weeks
- Cross-project optimization suggestions
- **Micro-habits with streaks**

Deliverable: "It predicts slippage and prevents overload."
