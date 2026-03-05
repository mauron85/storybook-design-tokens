import { useRef } from 'react';

type State<T> =
  | { status: 'pending'; promise: Promise<void> }
  | { status: 'success'; data: T }
  | { status: 'error'; error: unknown };

// Cache lives outside the component so it survives Suspense unmount/remount cycles.
const cache = new Map<string, State<unknown>>();

function buildCacheKey(deps: unknown[]): string {
  return JSON.stringify(deps);
}

/**
 * Suspense-compatible async data hook.
 *
 * Caches results by `deps` in a module-level map so that
 * the resolved data survives the unmount/remount that React
 * performs on a suspended subtree.
 *
 * When deps change, the previous cache entry is evicted so only
 * the current entry per call site is retained.
 *
 * The deps tuple type is inferred from the async function's parameters,
 * ensuring type safety between the function signature and the provided deps.
 */
export function useSuspense<T, D extends unknown[]>(asyncFn: (...deps: D) => Promise<T>, deps: D): T {
  const prevKeyRef = useRef<string | null>(null);
  const key = buildCacheKey(deps);

  // Evict the previous entry when deps change
  if (prevKeyRef.current !== null && prevKeyRef.current !== key) {
    cache.delete(prevKeyRef.current);
  }
  prevKeyRef.current = key;

  let entry = cache.get(key) as State<T> | undefined;

  if (!entry) {
    const state: State<T> = {
      status: 'pending',
      promise: asyncFn(...deps)
        .then((data) => {
          cache.set(key, { status: 'success', data });
        })
        .catch((error) => {
          cache.set(key, { status: 'error', error });
        }),
    };

    cache.set(key, state as State<unknown>);
    entry = state;
  }

  if (entry.status === 'pending') {
    throw entry.promise;
  }

  if (entry.status === 'error') {
    throw entry.error;
  }

  return entry.data;
}
