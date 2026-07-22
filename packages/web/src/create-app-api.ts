import { createApi, HttpClient, type TokenStore } from '@arduino-lab/contracts';

export interface AppApi {
  /** Authenticated client used by every client component. */
  api: ReturnType<typeof createApi>;
  /** Token-free client for Server Components rendering public data. */
  publicApi: ReturnType<typeof createApi>;
  /** Subscribes to "the session died"; returns an unsubscribe function. */
  onSessionExpired: (listener: () => void) => () => void;
}

/**
 * Wires the shared HTTP client to one app's token store.
 *
 * The public client deliberately has no token store: a server render is shared
 * across users and must never pick up someone else's session.
 */
export function createAppApi(baseUrl: string, tokenStore: TokenStore): AppApi {
  const listeners = new Set<() => void>();

  const http = new HttpClient({
    baseUrl,
    tokenStore,
    onSessionExpired: () => {
      for (const listener of listeners) listener();
    },
  });

  return {
    api: createApi(http),
    publicApi: createApi(new HttpClient({ baseUrl })),
    onSessionExpired: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
