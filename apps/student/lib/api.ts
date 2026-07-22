import { createApi, HttpClient } from '@arduino-lab/contracts';

import { tokenStore } from './token-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** Signals a dead session so the auth provider can route to /login. */
const sessionExpiredListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

const http = new HttpClient({
  baseUrl: API_URL,
  tokenStore,
  onSessionExpired: () => {
    for (const listener of sessionExpiredListeners) listener();
  },
});

export const api = createApi(http);

/**
 * Client used by Server Components for public data.
 *
 * It carries no token store: server renders are shared across users and must
 * never pick up someone else's session.
 */
export const publicApi = createApi(new HttpClient({ baseUrl: API_URL }));

export { API_URL };
