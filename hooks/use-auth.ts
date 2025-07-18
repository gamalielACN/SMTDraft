'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { User } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          apiClient.setToken(token);
          const profile = await apiClient.getProfile();
          setUser(profile.user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Token is invalid, clear it
        localStorage.removeItem('auth_token');
        apiClient.clearToken();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData: User, token: string) => {
    localStorage.setItem('auth_token', token);
    apiClient.setToken(token);
    console.log('login userData', userData);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    apiClient.clearToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout
  };
}