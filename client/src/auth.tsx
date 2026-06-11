import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { api, setToken, setUnauthorizedHandler } from './api';

interface AuthContextValue {
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setUnauthorizedHandler(() => setEmail(null));
  }, []);

  const login = useCallback(async (em: string, password: string) => {
    const res = await api<{ token: string; email: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: em, password }),
    });
    setToken(res.token);
    setEmail(res.email);
  }, []);

  const register = useCallback(async (em: string, password: string) => {
    const res = await api<{ token: string; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: em, password }),
    });
    setToken(res.token);
    setEmail(res.email);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setEmail(null);
  }, []);

  return (
    <AuthContext.Provider value={{ email, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
