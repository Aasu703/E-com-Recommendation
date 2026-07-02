import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  token: string | null;
  login: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userId: null,
  token: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('jwt_token');
    const storedUserId = localStorage.getItem('user_id');
    if (storedToken && storedUserId) {
      setIsAuthenticated(true);
      setUserId(storedUserId);
      setToken(storedToken);
    }
  }, []);

  const login = (uid: string) => {
    // Simulate JWT token generation
    const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ uid, exp: Date.now() + 3600000 }))}.simulated_signature`;
    localStorage.setItem('jwt_token', mockJwt);
    localStorage.setItem('user_id', uid);
    setIsAuthenticated(true);
    setUserId(uid);
    setToken(mockJwt);
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_id');
    setIsAuthenticated(false);
    setUserId(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userId, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
