'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getStoredUser, setStoredUser, setToken } from './api';

export interface AuthedUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: 'super_admin' | 'owner' | 'admin' | 'front_desk' | 'housekeeping' | 'accountant';
  // Null only for super_admin, which isn't scoped to any property.
  propertyId: string | null;
  emailVerified: boolean;
}

interface AuthContextValue {
  user: AuthedUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (
    propertyName: string,
    ownerName: string,
    email: string,
    password: string,
    referralCode: string,
    username?: string,
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setUser(getStoredUser() as AuthedUser | null);
    setLoading(false);
  }, []);

  async function login(identifier: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthedUser }>('/auth/login', { identifier, password });
    setToken(res.accessToken);
    setStoredUser(res.user);
    setUser(res.user);
    router.push(res.user.role === 'super_admin' ? '/platform' : '/calendar');
  }

  async function signup(
    propertyName: string,
    ownerName: string,
    email: string,
    password: string,
    referralCode: string,
    username?: string,
  ) {
    const res = await api.post<{ accessToken: string; user: AuthedUser }>('/auth/signup', {
      propertyName,
      ownerName,
      email,
      password,
      referralCode,
      username: username || undefined,
    });
    setToken(res.accessToken);
    setStoredUser(res.user);
    setUser(res.user);
    router.push('/calendar');
  }

  function logout() {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    router.push('/login');
  }

  // Re-pulls the current user from /me and refreshes both the stored copy
  // (localStorage) and the in-memory context — used after editing your own
  // profile so the header/nav reflect the change immediately.
  async function refreshUser() {
    if (!user) return;
    const me = await api.get<{ id: string; name: string; email: string; username: string | null; role: string; propertyId: string | null; emailVerified: boolean }>(
      '/me',
    );
    const updated = { ...user, name: me.name, email: me.email, username: me.username, emailVerified: me.emailVerified };
    setStoredUser(updated);
    setUser(updated);
  }

  return <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const ADMIN_ROLES = ['owner', 'admin'];
