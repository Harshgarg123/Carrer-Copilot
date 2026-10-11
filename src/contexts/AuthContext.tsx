import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, tokenStore, UNAUTHORIZED_EVENT, type ApiUser } from '../lib/api';

export type UserProfile = ApiUser;

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  confirmPasswordReset: (token: string, password: string) => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      return;
    }
    const { data, error, status } = await authApi.me();
    if (data?.user) {
      setUser(data.user);
    } else if (status === 401) {
      tokenStore.clear();
      setUser(null);
    } else if (error) {
      // Server unreachable: keep the session token, but there is no user to show yet
      console.error('Error loading session:', error);
      setUser(null);
    }
  }, []);

  // Restore the session on first load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadCurrentUser();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCurrentUser]);

  // Sign out when any API call reports an expired session, and keep tabs in sync
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== tokenStore.key) return;
      if (!e.newValue) setUser(null);
      else loadCurrentUser();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
      window.removeEventListener('storage', onStorage);
    };
  }, [loadCurrentUser]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await authApi.signUp(email, password, fullName);
    if (error || !data) return { error: new Error(error || 'Failed to create account') };
    tokenStore.set(data.token);
    setUser(data.user);
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await authApi.signIn(email, password);
    if (error || !data) return { error: new Error(error || 'Failed to sign in') };
    tokenStore.set(data.token);
    setUser(data.user);
    return { error: null };
  };

  const signOut = async () => {
    tokenStore.clear();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await authApi.forgotPassword(email);
    return { error: error ? new Error(error) : null };
  };

  const confirmPasswordReset = async (token: string, password: string) => {
    const { error } = await authApi.resetPassword(token, password);
    return { error: error ? new Error(error) : null };
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No user logged in') };
    const { data, error } = await authApi.updateProfile({
      full_name: updates.full_name,
      avatar_url: updates.avatar_url,
    });
    if (error || !data) return { error: new Error(error || 'Failed to update profile') };
    setUser(data.user);
    return { error: null };
  };

  const refreshProfile = async () => {
    await loadCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        confirmPasswordReset,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
