'use client';

import { useEffect, useState } from 'react';

export function readUrlFilter(name: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) ?? '';
}

export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debounced;
}

export function useAdminFilterUrl(filters: Record<string, string>): void {
  const serialized = JSON.stringify(
    Object.entries(filters).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    const entries = JSON.parse(serialized) as Array<[string, string]>;
    for (const [name, value] of entries) {
      if (value) url.searchParams.set(name, value);
      else url.searchParams.delete(name);
    }
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [serialized]);
}
