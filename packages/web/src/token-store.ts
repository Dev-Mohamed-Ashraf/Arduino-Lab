import type { AuthTokens, TokenStore } from '@arduino-lab/contracts';

/**
 * Access token in memory, refresh token in localStorage.
 *
 * The API and the front ends sit on different domains (Render and Vercel), so a
 * cross-site cookie is blocked by default in most browsers. Keeping the
 * short-lived access token out of storage limits what an XSS payload can lift,
 * and the refresh token is rotated on every use with reuse detection on the
 * server — see plans/03-api-core-auth.md.
 *
 * Each app passes its own storage key so a shared browser cannot mix an admin
 * session with a student one.
 */
export function createTokenStore(storageKey: string): TokenStore & {
  hasStoredSession: () => boolean;
} {
  let accessToken: string | null = null;

  const readRefreshToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(storageKey);
  };

  return {
    getAccessToken: () => accessToken,
    getRefreshToken: readRefreshToken,

    setTokens: (tokens: AuthTokens) => {
      accessToken = tokens.accessToken;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, tokens.refreshToken);
      }
    },

    clear: () => {
      accessToken = null;
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(storageKey);
      }
    },

    /** True when a session may be recoverable, even with no access token held. */
    hasStoredSession: () => readRefreshToken() !== null,
  };
}
