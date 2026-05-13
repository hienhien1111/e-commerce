# /kickoff — Idea to Ralph-Ready

Use this command to take a feature idea and turn it into a ready-to-run Ralph work package.

## Goal

- Prepare the feature directory under `features/<feature-name>/`
- Generate `PRD.md` (requirements + tasks in one file) and `progress.md` (empty, ready for Ralph)
- Point `PROMPT_build.md` at the active feature
- Stop before execution so the human can run `./ralph.sh`

## Workflow

1. Parse `/kickoff <feature-name> "<one-line description>"`
2. Check repo readiness:
   - `features/`
   - `ralph.sh`
   - `ralph-filter.sh`
   - `PROMPT_build.md`
3. Check `ARCHITECTURE.md`
   - if missing or stale, kick off `/snapshot` work in the background
4. Check `features/<feature-name>/`
   - if existing work is already in progress, surface that and ask whether to update or reuse
5. Audit env var drift between `.env.example`/`.env.sample` and local env files
6. Run an orient pass:
   - repo context
   - relevant existing code
   - sibling features and conflicts
7. Draft `PRD.md` (includes ## Tasks section at the bottom)
8. Create empty `progress.md` with template
9. Present one review blob to the user
10. Iterate on feedback until the user says "ship it"
11. Finalize:
   - set `PROMPT_build.md` active feature
   - mark PRD ready
   - tell the user to run `./ralph.sh`

## PRD.md structure

```markdown
# Feature Name

## Overview
One paragraph: what and why.

## Requirements
Concrete WHEN/THEN requirements.

## Design
Technical approach, key decisions, data model.

## Tasks
Ordered checklist. Each task is Ralph-sized (one commit, 5-15 min).

- [ ] **Task name** — file target, what to implement
  VERIFY: (for UI tasks) steps to verify in browser
- [ ] **Task name** — file target, what to implement
```

## progress.md template

```markdown
# Progress

## Completed

## Current

## Blockers

## Notes
```

## Rules

- `/kickoff` plans work, it does not execute Ralph.
- Keep review conversational; do not turn feedback into a form.
- Be opinionated in the summary blob: pick a direction and name alternatives only when they matter.
- Every generated task should be Ralph-sized: one commit, 5-15 minutes, clear file target, and VERIFY blocks for UI work.
- Tasks go inside `PRD.md` (## Tasks section), NOT a separate `tasks.md`.
- `progress.md` starts empty — Ralph fills it as it works.
