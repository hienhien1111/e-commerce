---
title: Prevent Waterfall Chains in Async Route Handlers
impact: CRITICAL
impactDescription: 2-10× improvement
tags: route-handlers, loaders, edge-functions, waterfalls, parallelization
---

## Prevent Waterfall Chains in Async Route Handlers

In route handlers, loaders, Supabase edge functions, or other async server code, start independent operations immediately, even if you don't await them yet.

**Incorrect (config waits for auth, data waits for both):**

```typescript
export async function GET(request: Request) {
  const session = await auth()
  const config = await fetchConfig()
  const data = await fetchData(session.user.id)
  return Response.json({ data, config })
}
```

**Correct (auth and config start immediately):**

```typescript
export async function GET(request: Request) {
  const sessionPromise = auth()
  const configPromise = fetchConfig()
  const session = await sessionPromise
  const [config, data] = await Promise.all([
    configPromise,
    fetchData(session.user.id)
  ])
  return Response.json({ data, config })
}
```

For more complex dependency chains, build the dependent promises early and join them with `Promise.all()` once their prerequisites resolve.
