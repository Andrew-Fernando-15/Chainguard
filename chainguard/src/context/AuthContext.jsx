import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, restore session from localStorage (so refreshing the page
  // doesn't log you out)
  useEffect(() => {
    const savedToken = localStorage.getItem('chainguard_token');
    const savedUser = localStorage.getItem('chainguard_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  function login(userData, jwt) {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem('chainguard_token', jwt);
    localStorage.setItem('chainguard_user', JSON.stringify(userData));
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('chainguard_token');
    localStorage.removeItem('chainguard_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
