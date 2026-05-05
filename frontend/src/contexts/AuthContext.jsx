import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const t = localStorage.getItem('auth_token');
      if (t) {
        config.headers.Authorization = `Bearer ${t}`;
      }
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (username, password) => {
    const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { username, password });
    localStorage.setItem('auth_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (username, password, role = 'creator') => {
    const res = await axios.post(`${API_BASE_URL}/api/auth/register`, { username, password, role });
    localStorage.setItem('auth_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
