---
title: Use useTransition Over Manual Loading States
impact: LOW
impactDescription: reduces re-renders and improves code clarity
tags: rendering, transitions, useTransition, loading, state
---

## Use useTransition Over Manual Loading States

Use `useTransition` for non-urgent state updates, not as a blanket replacement for every loading flag. In React 18, fetch the data outside the transition and wrap only the state update that can be deferred.

**Incorrect (transition used as a drop-in async loading wrapper):**

```tsx
function SearchResults() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const handleSearch = async (value: string) => {
    setQuery(value)
    const data = await fetchResults(value)
    setResults(data)
  }

  return (
    <>
      <input onChange={(e) => handleSearch(e.target.value)} />
      <ResultsList results={results} />
    </>
  )
}
```

**Correct (defer only the expensive render update):**

```tsx
import { useTransition, useState } from 'react'

function SearchResults() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isPending, startTransition] = useTransition()

  const handleSearch = async (value: string) => {
    setQuery(value)
    const data = await fetchResults(value)

    startTransition(() => {
      setResults(data)
    })
  }

  return (
    <>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </>
  )
}
```

**Benefits:**

- **Automatic pending state**: No need to manually manage `setIsLoading(true/false)`
- **Error resilience**: Pending state correctly resets even if the transition throws
- **Better responsiveness**: Keeps the UI responsive during updates
- **Interrupt handling**: New transitions automatically cancel pending ones

Reference: [useTransition](https://react.dev/reference/react/useTransition)
