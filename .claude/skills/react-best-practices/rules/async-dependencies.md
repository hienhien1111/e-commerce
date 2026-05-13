---
title: Dependency-Based Parallelization
impact: CRITICAL
impactDescription: 2-10× improvement
tags: async, parallelization, dependencies, promise-all
---

## Dependency-Based Parallelization

For operations with partial dependencies, start each promise at the earliest safe moment. Prefer plain promises and `Promise.all()` so the guidance stays compatible with this repo's current dependency set.

**Incorrect (profile waits for config unnecessarily):**

```typescript
const [user, config] = await Promise.all([
  fetchUser(),
  fetchConfig()
])
const profile = await fetchProfile(user.id)
```

**Correct (config and profile run in parallel):**

```typescript
const userPromise = fetchUser()
const profilePromise = userPromise.then(user => fetchProfile(user.id))
const configPromise = fetchConfig()

const [user, config, profile] = await Promise.all([
  userPromise,
  configPromise,
  profilePromise
])
```

This pattern works well in React Router loaders, Supabase edge-function handlers, and any async utility where one task depends on the result of another but not on every sibling task.
