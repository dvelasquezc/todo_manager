# Implementation Progression Plan (V1 → V4)

## V1 — Solid Cloud Todo + Projects + Done Archive (no AI yet)
Goal: cross-device task manager that you trust.

Must-have:
- Auth (email login)
- Projects (Teaching/Home/Other + custom Research projects)
- Tasks with:
  - title, notes
  - due date (best-case) + worst-case due date
  - estimate hours
  - status lanes: inbox / today / next / waiting / blocked / someday / done
  - priority
  - completed timestamp
- Done archive view with filters (week/month)
- Activity log for all task changes (create/update/move/complete)
- Mobile-first UI + PWA installable

Nice-to-have (if easy):
- Completion prompt: actual time spent + outcome note

Deliverable: “I can run my life on it without AI.”

---

## V2 — Info Dashboard + Calendar Views
Goal: show the story of your work.

Add:
- Info Dashboard cards:
  - hours completed by project (weekly/monthly)
  - tasks completed by project
  - WIP count by project
  - aging tasks list (untouched N days)
  - slippage (best-case vs worst-case)
  - planned vs actual (if actual collected)
- Calendar views:
  - Due calendar (best + worst)
- Polished filters and search

Deliverable: “I can understand how I spend time and what’s coming.”

---

## V3 — Project Chat (per-project threads + memory) + Task proposals
Goal: conversational planning per project, grounded in tasks.

Add:
- Project Chat Dashboard:
  - threads per project
  - persistent history
  - thread “Context Summary” (manual first or periodic)
- Chat can read project tasks and propose actions:
  - create/update/move/complete/split
- UI shows proposed actions with Apply/Reject
- Link chat messages to tasks created/edited from that chat

Deliverable: “Each project has its own assistant with memory + safe task editing.”

---

## V4 — Manager Assistant (Today + Radar + Weekly Review + Modes)
Goal: the “boss” that coordinates everything.

Add Manager dashboard with:
1) Today:
   - Top 3 plan + optional time blocks
   - tradeoff explanations
   - actionable proposals
2) Radar:
   - Risk radar alerts (deadline/cluster/capacity/dependency/scope)
   - Stuck detector (aging + repeated deferrals + big tasks)
   - resolution proposals
3) Weekly Review:
   - one-click weekly memo + suggested actions
4) Modes:
   - Deep Work mode
   - Admin Sprint mode
   - Low Energy mode
   - optional: Deadline mode, Recovery mode

Deliverable: “The app actively manages my time, but I stay in control.”

---

## V5 (Optional) — LLM Auto-Tagging + Learning from corrections
Goal: smarter categorization + personalization.

Add:
- On task creation, suggest tags/category/energy/deep-work
- Learn from user edits to tags (store corrections)
- Manager uses learned patterns to improve recommendations

Deliverable: “It adapts to my style and gets better over weeks.”

---

## V6 (Optional) — Planning Calendar + Reminders
Goal: closer to a real personal assistant.

Add:
- Plan calendar view (time blocks)
- Lightweight reminders:
  - daily plan ping
  - weekly review ping
  - high-risk alerts

Deliverable: “I get nudges and realistic schedules.”

---

## V7 (Optional) — Advanced analytics & prediction
Goal: accuracy and long-horizon planning.

Add:
- Predict time-to-complete from history
- “risk forecast” for next 2–4 weeks
- cross-project optimization suggestions

Deliverable: “It predicts slippage and prevents overload.”
