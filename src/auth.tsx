import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, bindTokens, rawRequest } from './api';
import type { User } from './types';

interface Session {
  accessToken: string;
  user: User;
}

/** After a correct password, accounts with two-step sign-in get a challenge to answer with a code. */
export interface CodeChallenge {
  mfaRequired: true;
  mfaToken: string;
  expiresAt: string;
}

/** Someone whose role requires two-step sign-in and who has not set it up can only do that. */
export const needsTwoStep = (u: User) => u.twoStepRequired && !u.twoStepEnabled;

interface AuthState {
  user: User | null;
  ready: boolean;
  signIn: (identifier: string, password: string) => Promise<User | CodeChallenge>;
  signInWithCode: (mfaToken: string, code: string) => Promise<User>;
  /** Starts using a session returned by another call (switching two-step sign-in on or off). */
  adoptSession: (s: Session) => void;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<User>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const token = useRef<string | null>(null);
  const refreshing = useRef<Promise<boolean> | null>(null);
  const navigate = useNavigate();

  const apply = useCallback((s: Session | null) => {
    token.current = s?.accessToken ?? null;
    setUser(s?.user ?? null);
  }, []);

  /** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
  const refresh = useCallback(() => {
    refreshing.current ??= rawRequest<Session>('/auth/refresh', { method: 'POST' })
      .then((s) => {
        apply(s);
        return true;
      })
      .catch(() => {
        apply(null);
        return false;
      })
      .finally(() => {
        refreshing.current = null;
      });
    return refreshing.current;
  }, [apply]);

  useEffect(() => {
    bindTokens({
      get: () => token.current,
      refresh,
      onPasswordChangeRequired: () => navigate('/change-password', { replace: true }),
      onTwoStepRequired: () => navigate('/two-step', { replace: true }),
    });
    refresh().finally(() => setReady(true));
  }, [refresh, navigate]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      async signIn(identifier, password) {
        const s = await rawRequest<Session | CodeChallenge>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
        if ('mfaRequired' in s) return s;
        apply(s);
        return s.user;
      },
      async signInWithCode(mfaToken, code) {
        const s = await rawRequest<Session>('/auth/login/code', { method: 'POST', body: JSON.stringify({ mfaToken, code }) });
        apply(s);
        return s.user;
      },
      adoptSession: apply,
      async signOut() {
        await rawRequest('/auth/logout', { method: 'POST' }).catch(() => {});
        apply(null);
        navigate('/login', { replace: true });
      },
      async changePassword(currentPassword, newPassword) {
        const s = await api<Session>('/auth/change-password', { method: 'POST', json: { currentPassword, newPassword } });
        apply(s);
        return s.user;
      },
      async reloadUser() {
        setUser(await api<User>('/auth/me'));
      },
    }),
    [user, ready, apply, navigate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
