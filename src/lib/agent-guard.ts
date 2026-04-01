// Shared safety guards for all agent API routes.
// Routes that use web_search should use WEB_SEARCH_TIMEOUT_MS.

export const AGENT_TIMEOUT_MS = 60_000; // 1 min — plain Claude calls
export const WEB_SEARCH_TIMEOUT_MS = 45_000; // 45s — calls with 1 web_search use

/**
 * Creates an AbortSignal that fires after `ms` milliseconds AND whenever
 * the optional `parent` signal fires. Returns the signal and a `clear()`
 * function to cancel the timeout cleanup (call it on success or in finally).
 *
 * Use this instead of Promise.race([call, timeout]) so the underlying
 * Anthropic SDK call is actually cancelled when the timeout fires — not
 * just abandoned as a floating promise that keeps billing.
 */
export function timedAbort(
  ms: number,
  parent?: AbortSignal
): { signal: AbortSignal; clear: () => void } {
  const ctl = new AbortController();

  if (parent?.aborted) {
    ctl.abort(parent.reason);
    return { signal: ctl.signal, clear: () => {} };
  }

  const id = setTimeout(
    () => ctl.abort(new DOMException(`Agent call timed out after ${ms}ms`, 'TimeoutError')),
    ms
  );

  const onParentAbort = parent ? () => ctl.abort((parent as AbortSignal).reason) : null;
  if (parent && onParentAbort) {
    parent.addEventListener('abort', onParentAbort, { once: true });
  }

  return {
    signal: ctl.signal,
    clear: () => {
      clearTimeout(id);
      if (parent && onParentAbort) {
        parent.removeEventListener('abort', onParentAbort);
      }
    },
  };
}
