import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readUrlFilter,
  useAdminFilterUrl,
  useDebouncedValue,
} from './useAdminFilters';

describe('admin filter hooks', () => {
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, '', '/');
  });

  it('debounces search input before applying it', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'old' } },
    );

    rerender({ value: 'new' });
    expect(result.current).toBe('old');
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('new');
  });

  it('reads and synchronizes managed URL filters without dropping other params', () => {
    window.history.replaceState({}, '', '/admin/products?page=2&search=old');
    expect(readUrlFilter('search')).toBe('old');

    const { rerender } = renderHook(
      ({ search, active }) => useAdminFilterUrl({ search, isActive: active }),
      { initialProps: { search: 'áo cam', active: 'true' } },
    );
    expect(window.location.search).toContain('page=2');
    expect(readUrlFilter('search')).toBe('áo cam');
    expect(readUrlFilter('isActive')).toBe('true');

    rerender({ search: '', active: '' });
    expect(readUrlFilter('search')).toBe('');
    expect(readUrlFilter('isActive')).toBe('');
    expect(new URLSearchParams(window.location.search).get('page')).toBe('2');
  });
});
