# /test — TDD Loop For This Repo

Use this command to drive implementation from tests instead of treating tests as a final verification step.

## Usage

```bash
/test [file-or-pattern]
```

## Repo conventions

- Keep tests next to the code they exercise when possible:
  - `src/**/*.test.ts`
  - `src/**/*.test.tsx`
- Default to test-first for logic, behavior, and reproducible bug fixes
- For visual-only work, define acceptance criteria first and verify with browser tooling after the behavior is covered
- Prefer focused unit/integration tests over broad UI smoke checks for the first red/green loop

## Recommended TDD loop

1. Write the smallest failing test that proves the missing behavior
2. Run the narrowest possible test target first
3. Implement the smallest code change that makes the test pass
4. Re-run the narrow target
5. Refactor while keeping the target green
6. If the change is visual, run browser verification against the acceptance criteria
7. Finish by running the full repo checks before handing off

## Commands

```bash
# Full suite
bun run test:run

# Coverage snapshot
bun run test:coverage

# Type safety
bunx tsc --noEmit
```

## Best-practice guidance for hrkit

- For React hooks/components:
  - start with a focused Vitest file beside the component or hook
  - mock Supabase or TanStack Query boundaries, not unrelated internals
- For data and mapping logic:
  - test contract behavior directly with representative rows and edge cases
  - include `null` and missing-field scenarios
- For Supabase Edge Functions:
  - use integration-style unit tests with mocked external services
  - cover timeout, malformed response, auth failure, and silent-failure cases
- For migrations:
  - test the application behavior that depends on the schema change, not just the SQL text
- For UI polish and redesign work:
  - do not force meaningless unit tests
  - write acceptance criteria first, then use Playwright/manual browser verification for the visual layer

## Testing tool guide

**Use Vitest when**
- the change has clear logic or behavior
- fixing a reproducible bug
- touching hooks, utilities, mappers, selectors, validation, auth state, or Supabase data mapping
- testing Edge Functions with mocked external services

**Use Playwright when**
- the change is primarily visual or responsive
- you need to confirm layout, overflow, scroll, redirects, or navigation in a real browser
- you need desktop/mobile smoke checks or accessibility-tree verification

**Use both when**
- a feature has both logic and browser behavior
- working on auth flows, forms, search/filter UI, or multi-step interactions

**Rule of thumb**
- logic first -> Vitest first
- visual first -> acceptance criteria first
- browser verify after -> Playwright confirms the real UI and flow

## Definition of done

Before considering the work complete, run:

```bash
bun run test:run
bun run lint
bunx tsc --noEmit
bun run build
```
