# Known Issues & Warnings

Track bugs and console warnings as they appear. Fix them when time permits.

## Active Issues

(Add new issues here as they are discovered)

### Template

```
### [BUG/WARNING] Issue title
- **Status:** Open | In Progress | Blocked
- **Seen in:** Browser console / Page name / Component
- **Description:** What happens
- **Steps to reproduce:** How to trigger it
- **Root cause:** (if known)
```

## Resolved Issues

### [BUG] Race condition in project navigation
- **Status:** Fixed
- **Description:** When clicking Project A then quickly clicking Project B, the page sometimes showed A's data
- **Root cause:** No AbortController to cancel stale fetch requests when navigating between projects
- **Resolution:** Added AbortController to project page useEffect, checks abort signal before setting state
- **Fixed in:** projects/[slug]/page.tsx
