---
title: Use TanStack Query for Automatic Deduplication
impact: MEDIUM-HIGH
impactDescription: automatic deduplication and caching
tags: client, tanstack-query, deduplication, data-fetching
---

## Use TanStack Query for Automatic Deduplication

TanStack Query enables request deduplication, caching, stale-while-revalidate behavior, and automatic refetching across component instances.

**Incorrect (no deduplication, each instance fetches):**

```tsx
function UserList() {
    const [users, setUsers] = useState([]);
    useEffect(() => {
        fetch("/api/users")
            .then((r) => r.json())
            .then(setUsers);
    }, []);
}
```

**Correct (multiple instances share one request):**

```tsx
import { useQuery } from "@tanstack/react-query";

function UserList() {
    const { data: users } = useQuery({
        queryKey: ["users"],
        queryFn: () => fetch("/api/users").then((r) => r.json()),
    });
}
```

**For mutations with cache invalidation:**

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

function CreateUserButton() {
    const queryClient = useQueryClient();
    const { mutate } = useMutation({
        mutationFn: (data) =>
            fetch("/api/users", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });
    return <button onClick={() => mutate({ name: "New User" })}>Create</button>;
}
```

Reference: [https://tanstack.com/query](https://tanstack.com/query)
