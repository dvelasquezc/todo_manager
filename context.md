# Context for Claude Code (Product + Constraints + Style)

## Product constraints
- Cloud-synced, cross-device access (desktop + phone)
- Prefer PWA (installable) and mobile-first design
- Must be safe/trustworthy: assistant never silently edits tasks
- All AI-driven changes are propose→approve and logged
- Preserve all task data after completion (Done archive is first-class)

## UX principles
- Minimal friction to add tasks (fast capture)
- Clean, “good-looking” dashboards (cards, clear typography)
- Manager assistant is the control center:
  - Today / Radar / Weekly Review / Modes
- Always show “why” for Manager suggestions
- Allow user override everywhere

## Data principles
- Activity log is mandatory (audit trail)
- Task status transitions matter; use them for stuck/risk
- Project chat histories are persistent and scoped by project
- Manager has read access to all projects; project chat limited to its project

## Required assistant capabilities (conceptual)
### Project chat assistant
- Context: project tasks + thread history + project summary
- Output: plan text + optional proposed actions (create/update/move/split/complete)

### Manager assistant
- Context: all tasks + activity + project summaries
- Output:
  - daily plan + actions
  - risk radar alerts + resolution actions
  - weekly review memo + actions
  - mode-specific recommendations

## Risk radar heuristics (baseline)
- Deadline risk: worst-case due within threshold and not started
- Cluster risk: multiple deadlines in same week
- Capacity risk: sum(estimates due before date) > capacity
- Dependency risk: blocked tasks with no follow-up in N days
- Scope risk: tasks > big-task threshold without subtasks

## Stuck detector heuristics (baseline)
Flag if:
- untouched for N days AND (big estimate OR repeated deferrals OR unclear next action)
Then:
- ask one crisp question
- propose 1–3 resolutions:
  - create “next action” subtask
  - mark blocked/waiting with a follow-up task
  - split into subtasks
  - defer/downgrade/drop

## Modes (baseline behaviors)
- Deep Work:
  - prefer deep-work tasks, limit to few big items
- Admin Sprint:
  - prefer short tasks, clear inbox, follow-ups
- Low Energy:
  - prefer reading/light edits/planning tasks

Optional:
- Deadline mode: sort by worst-case due, highlight risk
- Recovery mode: minimal commitments

## Non-goals (avoid scope creep early)
- Third-party integrations (Todoist/Notion/etc.) until core is stable
- Auto-editing tasks without explicit approval
- Collaboration/multi-user features in early versions

## Definition of Done per version
- Each version must be shippable and usable on phone + desktop
- Must include basic tests and seed data (where relevant)
- Must maintain backward compatibility with stored user data
- Must keep UI consistent and clean
