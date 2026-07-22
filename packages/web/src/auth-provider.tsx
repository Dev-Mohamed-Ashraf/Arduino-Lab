'use client';

import { ApiError, type CurrentUser, type LoginInput, type TokenStore } from '@arduino-lab/contracts';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import type { AppApi } from './create-app-api';

interface AuthContextValue {
  user: CurrentUser | null;
  /** True until the stored session has been checked on first paint. */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  appApi: AppApi;
  tokenStore: TokenStore & { hasStoredSession: () => boolean };
  /** Where to send the user when their session ends. */
  loginPath: string;
  /** Where to send the user after an explicit logout. */
  logoutPath: string;
}

export function AuthProvider({
  children,
  appApi,
  tokenStore,
  loginPath,
  logoutPath,
}: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = React.useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadUser = React.useCallback(async () => {
    try {
      setUser(await appApi.api.auth.me());
    } catch {
      tokenStore.clear();
      setUser(null);
    }
  }, [appApi, tokenStore]);

  // On first paint the access token is always missing — it lives in memory and
  // the page has just loaded. A stored refresh token means the session may be
  // recoverable, and the HTTP client rotates it on this first 401.
  React.useEffect(() => {
    if (!tokenStore.hasStoredSession()) {
      setIsLoading(false);
      return;
    }

    void loadUser().finally(() => setIsLoading(false));
  }, [loadUser, tokenStore]);

  React.useEffect(
    () =>
      appApi.onSessionExpired(() => {
        setUser(null);
        router.push(loginPath);
      }),
    [appApi, router, loginPath],
  );

  const login = React.useCallback(
    async (input: LoginInput) => {
      tokenStore.setTokens(await appApi.api.auth.login(input));
      const profile = await appApi.api.auth.me();
      setUser(profile);
      return profile;
    },
    [appApi, tokenStore],
  );

  const logout = React.useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();

    if (refreshToken) {
      // A failed revoke must not trap the user in a session they asked to end.
      await appApi.api.auth.logout(refreshToken).catch(() => undefined);
    }

    tokenStore.clear();
    setUser(null);
    router.push(logoutPath);
  }, [appApi, tokenStore, router, logoutPath]);

  const value = React.useMemo(
    () => ({ user, isLoading, login, logout, refreshUser: loadUser }),
    [user, isLoading, login, logout, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}

/** Maps any thrown value to the Arabic message a form should display. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}
