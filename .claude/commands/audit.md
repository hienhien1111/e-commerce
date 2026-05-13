# /audit — Repo Safety Audit

Use this command to audit the repo against the current hrkit delivery model:

- AI-assisted implementation through Ralph
- PR review before merge
- CI on pull requests
- post-merge Supabase migration automation

## What to check

### 1. Release Safety

- Branch protection on `main` matches `.github/BRANCH_PROTECTION.md`
- No bot/app bypass for merge or review
- Required checks include CI and migration signaling
- Production secrets are only available to post-merge workflows

### 2. Database Safety

- Schema changes only land through `supabase/migrations/*.sql`
- No code path expects Claude/Ralph to run `supabase db push`
- Migration files do not contain accidental destructive SQL
- Risky SQL is explicitly reviewed by a human before merge

### 3. AI Tooling

- `.claude/settings.json` exists and matches active hooks
- `.claude/skills/hrkit-workflow/` reflects current project rules
- `CLAUDE.md` does not contradict the repo state
- Ralph planning commands still match the actual workflow

### 4. App Quality

- `bun run lint`
- `bunx tsc --noEmit`
- `bun run test:run`
- `bun run build`

## Output

Return findings in priority order:

1. Release and data-loss risks
2. Broken or missing guardrails
3. Test/build regressions
4. Documentation drift
