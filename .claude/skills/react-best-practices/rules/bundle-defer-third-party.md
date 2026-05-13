---
title: Defer Non-Critical Third-Party Libraries
impact: MEDIUM
impactDescription: loads after initial render
tags: bundle, third-party, analytics, defer
---

## Defer Non-Critical Third-Party Libraries

Analytics, logging, and error tracking don't block user interaction. Load them lazily.

**Incorrect (blocks initial bundle):**

```tsx
import { Analytics } from "@vercel/analytics/react";

function App() {
    return (
        <div>
            <MainContent />
            <Analytics />
        </div>
    );
}
```

**Correct (loads on demand):**

```tsx
import { lazy, Suspense } from "react";

const Analytics = lazy(() =>
    import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })),
);

function App() {
    return (
        <div>
            <MainContent />
            <Suspense fallback={null}>
                <Analytics />
            </Suspense>
        </div>
    );
}
```
