import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput, SafeUser } from '@market/contracts';
import { api, setAuthTokenProvider } from '../api/client';
import { clearStoredSession, loadStoredSession, saveStoredSession } from './session-store';

type AuthState = {
  user: SafeUser | null;
  token: string | null;
  loading: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  clearLocalSession: () => Promise<void>;
  updateUser: (user: SafeUser) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  const applySession = async (session: { token: string; expiresAt: string; user: SafeUser }) => {
    tokenRef.current = session.token;
    setToken(session.token);
    setUser(session.user);
    await saveStoredSession(session);
  };

  useEffect(() => { setAuthTokenProvider(() => tokenRef.current); }, []);
  useEffect(() => {
    let mounted = true;
    void loadStoredSession().then(async session => {
      if (!mounted) return;
      if (!session || new Date(session.expiresAt) <= new Date()) {
        await clearStoredSession();
        setLoading(false);
        return;
      }
      tokenRef.current = session.token;
      setToken(session.token);
      try {
        const current = await api.me();
        if (!mounted) return;
        setUser(current.user);
      } catch {
        tokenRef.current = null;
        setToken(null);
        setUser(null);
        await clearStoredSession();
      } finally {
        if (mounted) setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const value = useMemo<AuthState>(() => ({
    user, token, loading,
    signIn: async input => { const session = await api.login(input); await applySession(session); },
    register: async input => { const session = await api.register(input); await applySession(session); },
    updateUser: nextUser => { setUser(nextUser); },
    clearLocalSession: async () => {
      tokenRef.current = null;
      setToken(null);
      setUser(null);
      await clearStoredSession();
      queryClient.clear();
    },
    signOut: async () => {
      try { if (tokenRef.current) await api.logout(); } catch { /* local sign-out should still complete */ }
      tokenRef.current = null;
      setToken(null);
      setUser(null);
      await clearStoredSession();
      queryClient.clear();
    },
  }), [loading, queryClient, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
