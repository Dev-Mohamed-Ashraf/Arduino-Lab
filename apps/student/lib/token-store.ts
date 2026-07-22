import type { AuthTokens, TokenStore } from '@arduino-lab/contracts';

const REFRESH_KEY = 'arduino-lab.refresh';

/**
 * Access token lives in memory only; the refresh token is persisted.
 *
 * The API and the front end are on different domains (Render and Vercel), so a
 * cross-site cookie would be blocked by default in most browsers. Keeping the
 * short-lived access token out of storage limits what an XSS payload can lift,
 * and the refresh token is rotated on every use with reuse detection on the
 * server — see plans/03-api-core-auth.md.
 */
let accessToken: string | null = null;

export const tokenStore: TokenStore = {
  getAccessToken: () => accessToken,

  getRefreshToken: () => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },

  setTokens: (tokens: AuthTokens) => {
    accessToken = tokens.accessToken;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    }
  },

  clear: () => {
    accessToken = null;
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(REFRESH_KEY);
    }
  },
};

/** True when a session may be recoverable, even though no access token is held yet. */
export function hasStoredSession(): boolean {
  return tokenStore.getRefreshToken() !== null;
}
