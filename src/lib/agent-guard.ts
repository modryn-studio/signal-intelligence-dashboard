// Shared safety guards for all agent API routes.
// Every client.messages.create() call should be wrapped with withTimeout().
// Routes that use web_search should use WEB_SEARCH_TIMEOUT_MS.

export const AGENT_TIMEOUT_MS = 60_000; // 1 min — plain Claude calls
export const WEB_SEARCH_TIMEOUT_MS = 45_000; // 45s — calls with web_search tool

/**
 * Races a promise against a timeout. Throws if the timeout fires first.
 * Use this to wrap every client.messages.create() call so hung Claude API
 * calls don't keep a serverless function alive indefinitely or silently bill.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Agent call timed out after ${ms}ms`)), ms)
    ),
  ]);
}
