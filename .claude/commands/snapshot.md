# /snapshot — Update the Living Architecture Doc

Use this command to refresh `ARCHITECTURE.md` based on the current repo state.

## Modes

- Full scan when `ARCHITECTURE.md` is missing or still a stub
- Incremental update when the file already exists with real content

## Full Scan

1. Explore the repo across:
   - project structure
   - architecture and layers
   - tech stack
   - routes/pages/components
   - schema/migrations/types
   - external dependencies and config
2. Synthesize findings into `ARCHITECTURE.md`
3. Optionally capture screenshots with Playwright for key pages
4. Return a short summary of what changed

## Incremental Update

1. Read the current `ARCHITECTURE.md`
2. Detect meaningful changes since its `Updated` date:
   - git history
   - new or modified files
   - new migrations
   - feature status changes
3. Update only the affected sections
4. Return a short summary of changed sections

## Rules

- Evidence only; no speculation
- Prefer focused search over full rescans once the doc exists
- `ARCHITECTURE.md` is the only repo-tracked file this command should edit
