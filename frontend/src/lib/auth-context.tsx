'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getStoredUser, setStoredUser, setToken } from './api';

export interface AuthedUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'owner' | 'admin' | 'front_desk' | 'housekeeping' | 'accountant';
  // Null only for super_admin, which isn't scoped to any property.
  propertyId: string | null;
}

interface AuthContextValue {
  user: AuthedUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (propertyName: string, ownerName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
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

  async function login(email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthedUser }>('/auth/login', { email, password });
    setToken(res.accessToken);
    setStoredUser(res.user);
    setUser(res.user);
    router.push(res.user.role === 'super_admin' ? '/platform' : '/calendar');
  }

  async function signup(propertyName: string, ownerName: string, email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthedUser }>('/auth/signup', {
      propertyName,
      ownerName,
      email,
      password,
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

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export const ADMIN_ROLES = ['owner', 'admin'];
