'use client';

import { ApiError, type CurrentUser, type LoginInput } from '@arduino-lab/contracts';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { api, onSessionExpired } from './api';
import { hasStoredSession, tokenStore } from './token-store';

interface AuthContextValue {
  user: CurrentUser | null;
  /** True until the stored session has been checked on first paint. */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadUser = React.useCallback(async () => {
    try {
      setUser(await api.auth.me());
    } catch {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  // On first paint the access token is always missing — it lives in memory and
  // the page has just reloaded. A stored refresh token means the session may be
  // recoverable, and the HTTP client will rotate it on this first 401.
  React.useEffect(() => {
    if (!hasStoredSession()) {
      setIsLoading(false);
      return;
    }

    void loadUser().finally(() => setIsLoading(false));
  }, [loadUser]);

  React.useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null);
        router.push('/login');
      }),
    [router],
  );

  const login = React.useCallback(async (input: LoginInput) => {
    const tokens = await api.auth.login(input);
    tokenStore.setTokens(tokens);

    const profile = await api.auth.me();
    setUser(profile);
    return profile;
  }, []);

  const logout = React.useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();

    if (refreshToken) {
      // A failed revoke must not trap the user in a session they asked to end.
      await api.auth.logout(refreshToken).catch(() => undefined);
    }

    tokenStore.clear();
    setUser(null);
    router.push('/');
  }, [router]);

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

/** Maps any thrown value to the Arabic message the form should display. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}
