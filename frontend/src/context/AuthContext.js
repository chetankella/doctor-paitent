/**
 * AuthContext — backward-compatible wrapper around Zustand authStore.
 * Legacy components import { useAuth } from this file.
 * This bridges them to the new Zustand store so everything stays in sync.
 */
import React, { createContext } from 'react';
import useAuthStore from '../store/authStore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Just pass through to Zustand — this ensures the old components work
  const store = useAuthStore();

  const value = {
    user: store.user,
    token: store.token,
    loading: false,
    isAuthenticated: store.isAuthenticated,
    login: (token, _userData) => store.login(token),
    logout: store.logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  // Fallback: if not in AuthProvider, use Zustand directly
  if (!context) {
    const store = useAuthStore.getState();
    return {
      user: store.user,
      token: store.token,
      loading: false,
      isAuthenticated: store.isAuthenticated,
      login: store.login,
      logout: store.logout,
    };
  }
  return context;
};
