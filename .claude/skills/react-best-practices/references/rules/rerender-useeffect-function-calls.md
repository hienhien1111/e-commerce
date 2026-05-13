---
title: useLatest when effects need the latest callback
impact: MEDIUM
impactDescription: unnecessary memoization when not needed
tags: rerender, performance, hooks, useEffect
---

## useLatest when effects need the latest callback

When an effect needs access to the latest callback but should not re-subscribe on every render, a small `useLatest` helper keeps the code React 18-compatible.

**Incorrect (unnecessary memoization with dependency management):**

```tsx
import { useCallback } from 'react';

export function App() {
  // useCallback adds boilerplate and requires managing dependencies
  const onSubmit = useCallback((data: FormData) => {
    // handle submission
  }, []);

  return <Form onSubmit={onSubmit} />;
}
```

**Correct (useLatest helper for stable access):**

```tsx
function useLatest<T>(value: T) {
  const ref = useRef(value)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref
}

export function App() {
  const onSubmitRef = useLatest((data: FormData) => {
    // handle submission
  })

  return <Form onSubmit={(data) => onSubmitRef.current(data)} />;
}
```

Reserve `useCallback` and `useMemo` for expensive computations or cases where child memoization measurably benefits. For effect subscriptions in React 18, a `useLatest` helper is often the simpler fit.
