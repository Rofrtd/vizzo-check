'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';

export type UserRole = 'system_admin' | 'agency' | 'promoter';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  agency_id: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; agency_name: string; admin_name: string }) => Promise<void>;
  logout: () => void;
  /** For system_admin: selected agency context. For agency: always user.agency_id. */
  selectedAgencyId: string | null;
  setSelectedAgencyId: (id: string | null) => void;
  /** Resolved agency scope for API calls: selected agency for system_admin, user.agency_id for agency. */
  effectiveAgencyId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);

  const effectiveAgencyId =
    user?.role === 'system_admin'
      ? selectedAgencyId
      : user?.agency_id ?? null;

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.setToken(token);
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'system_admin') {
      setSelectedAgencyId(null);
    }
  }, [user?.role]);

  async function loadUser() {
    try {
      const { user } = await api.getMe();
      setUser(user);
    } catch (error) {
      api.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { token, user } = await api.login(email, password);
    api.setToken(token);
    setUser(user);
  }

  async function register(data: { email: string; password: string; agency_name: string; admin_name: string }) {
    const { token, user } = await api.register(data);
    api.setToken(token);
    setUser(user);
  }

  function logout() {
    api.setToken(null);
    setUser(null);
    setSelectedAgencyId(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        selectedAgencyId,
        setSelectedAgencyId,
        effectiveAgencyId,
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
