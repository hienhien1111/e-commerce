# React Best Practices

Documentation-first skill content for React performance and maintainability guidance, tuned to the `hrkit` frontend stack.

## Structure

- `rules/` - Individual rule files (one per rule)
  - `_sections.md` - Section metadata (titles, impacts, descriptions)
  - `_template.md` - Template for creating new rules
  - `area-description.md` - Individual rule files
- `metadata.json` - Document metadata (version, organization, abstract)
- __`AGENTS.md`__ - Agent-facing longform guide
- `references/` - Shorter supporting reference material and example rules

## Scope

This skill is aligned to the current app architecture:

- React 18 + TypeScript
- Vite 5 with SSR and prerender output
- React Router DOM
- TanStack Query
- Supabase client and edge-function workflows
- Tailwind + shadcn/ui

Examples should stay compatible with the current dependency set in the repo. Do not introduce guidance that assumes newer React APIs or libraries we do not install.

## Creating a New Rule

1. Copy `rules/_template.md` to `rules/area-description.md`
2. Choose the appropriate area prefix:
   - `async-` for Eliminating Waterfalls (Section 1)
   - `bundle-` for Bundle Size Optimization (Section 2)
   - `client-` for Client-Side Data Fetching (Section 3)
   - `rerender-` for Re-render Optimization (Section 4)
   - `rendering-` for Rendering Performance (Section 5)
   - `js-` for JavaScript Performance (Section 6)
   - `advanced-` for Advanced Patterns (Section 7)
3. Fill in the frontmatter and content
4. Ensure you have clear examples with explanations
5. Update `AGENTS.md` and any related files in `references/` if the new rule changes the top-level guidance

## Rule File Structure

Each rule file should follow this structure:

```markdown
---
title: Rule Title Here
impact: MEDIUM
impactDescription: Optional description
tags: tag1, tag2, tag3
---

## Rule Title Here

Brief explanation of the rule and why it matters.

**Incorrect (description of what's wrong):**

```typescript
// Bad code example
```

**Correct (description of what's right):**

```typescript
// Good code example
```

Optional explanatory text after examples.

Reference: [Link](https://example.com)

## File Naming Convention

- Files starting with `_` are special (excluded from build)
- Rule files: `area-description.md` (e.g., `async-parallel.md`)
- Section is automatically inferred from filename prefix
- Rules are sorted alphabetically by title within each section
- IDs (e.g., 1.1, 1.2) are auto-generated during build

## Impact Levels

- `CRITICAL` - Highest priority, major performance gains
- `HIGH` - Significant performance improvements
- `MEDIUM-HIGH` - Moderate-high gains
- `MEDIUM` - Moderate performance improvements
- `LOW-MEDIUM` - Low-medium gains
- `LOW` - Incremental improvements

## Contributing

When adding or modifying rules:

1. Use the correct filename prefix for your section
2. Follow the `_template.md` structure
3. Include clear bad/good examples with explanations
4. Add appropriate tags
5. Keep `AGENTS.md`, `references/`, and the filenames in sync with the rule summaries in `SKILL.md`
6. Prefer examples that reflect this repo's actual stack: React Router, TanStack Query, Supabase, and Vite SSR/prerender

## Acknowledgments

Originally created by [@shuding](https://x.com/shuding) at [Vercel](https://vercel.com).
