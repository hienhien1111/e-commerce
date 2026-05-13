---
title: Preserve Expensive Subtrees During Show/Hide
impact: MEDIUM
impactDescription: preserves state/DOM
tags: rendering, visibility, state-preservation, css
---

## Preserve Expensive Subtrees During Show/Hide

When expensive content frequently toggles visibility, keep it mounted and hide it with attributes or CSS. This preserves state with patterns that fit the current React version in this repo.

**Usage:**

```tsx
function Dropdown({ isOpen }: Props) {
  return (
    <div
      hidden={!isOpen}
      aria-hidden={!isOpen}
      className={isOpen ? 'block' : 'hidden'}
    >
      <ExpensiveMenu />
    </div>
  )
}
```

Keep this for components where preserving local state is more important than unmounting hidden content. If the subtree is large and should genuinely disappear from the DOM, conditional rendering is still the better choice.
