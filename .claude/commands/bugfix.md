# /bugfix — Create a Bug-Fix Package for Ralph

Use this command to turn a bug report into a Ralph-ready bugfix package. Ralph will then investigate, reproduce, localize, fix, and validate the bug using a phased pipeline.

## Usage

`/bugfix <bug-name> "<what's broken>"`

Example: `/bugfix login-redirect "After login, user is redirected to / instead of /interviews"`

## What to do

### 1. Parse the command

Extract `<bug-name>` and `<description>` from the user's input. The bug name becomes the directory name.

### 2. Investigate the bug area

Before writing the PRD, do a quick investigation:
- Grep the codebase for code related to the bug description
- Read the most likely affected files (2-3 files max)
- Identify the affected area (e.g., "auth middleware", "interview detail page", "API route")

### 3. Create the feature directory

Create `features/bugfix-<bug-name>/` with two files:

#### `PRD.md`

```markdown
# Bugfix: <bug-name>

## Bug Report

- **What happens:** <actual behavior from user description>
- **Expected:** <correct behavior — infer from context>
- **Steps to reproduce:** <concrete steps — infer from code investigation>
- **Affected area:** <files/components identified during investigation>

## Context

<2-3 sentences of technical context from your investigation — what the code currently does, why it might be wrong>

## Tasks

- [ ] **Understand** — Read bug report, grep affected area, list 5+ hypotheses in progress.md
- [ ] **Reproduce** — Write minimal failing test or repro script confirming the bug
- [ ] **Localize** — Narrow to root cause, document in progress.md: file, line, WHY
- [ ] **Test** — Write failing test encoding correct behavior
  ROOT_CAUSE_REQUIRED: progress.md must have ## Root Cause before starting
- [ ] **Fix** — Smallest change making the failing test pass (prefer single file)
- [ ] **Validate** — Run: new test + full suite + lint + tsc + build
  VERIFY: <browser verification steps if this is a UI bug>
- [ ] **Reflect** — Self-review diff for band-aid patterns, commit with root cause in message
```

#### `progress.md`

```markdown
# Progress

## Hypotheses

(Ralph will fill this during Phase 1)

## Root Cause

(Ralph will fill this during Phase 3)

## Fix Summary

(Ralph will fill this during Phase 7)

## Blockers

(None yet)
```

### 4. Update PROMPT_bugfix.md

Update the `## Active Feature` section in `PROMPT_bugfix.md` to point to the new directory:

```markdown
## Active Feature

**`features/bugfix-<bug-name>/`**
```

### 5. Report

Tell the user:
- What was created
- What your quick investigation found (affected area, likely files)
- How to run it: `./ralph.sh --mode=bugfix`
- Ralph will run max 3 iterations with strict root-cause gating

## Rules

- `/bugfix` is a planning command — it does NOT run Ralph.
- Do a quick investigation (grep + read 2-3 files) to write a useful PRD, but don't try to fix the bug.
- The PRD tasks are always the same 7 phases — don't customize the task list.
- If the bug description is vague, ask the user for clarification before creating the PRD.
- Add `VERIFY:` steps to the Validate task only if the bug is UI-visible.
