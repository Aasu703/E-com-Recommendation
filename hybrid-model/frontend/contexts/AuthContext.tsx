import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  fetchMe,
  loginUser,
  registerUser,
  setAuthToken,
  type RegisterPayload,
  type UserProfile,
} from '../lib/rec-api';

const TOKEN_KEY = 'nepkart_auth_token';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<UserProfile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {
    throw new Error('AuthProvider not mounted');
  },
  register: async () => {
    throw new Error('AuthProvider not mounted');
  },
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    setAuthToken(stored);
    fetchMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const applySession = (accessToken: string, profile: UserProfile) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    setAuthToken(accessToken);
    setUser(profile);
  };

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const res = await loginUser(email, password);
    applySession(res.access_token, res.user);
    return res.user;
  };

  const register = async (payload: RegisterPayload): Promise<UserProfile> => {
    const res = await registerUser(payload);
    applySession(res.access_token, res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
