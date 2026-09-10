import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiClientError, setUnauthorizedCallback } from "../services/api";
import type { LoginCredentials, LoginResponse, Usuario } from "../services/api";
import { AuthContext } from "./AuthContext";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(() => api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<Usuario | null> => {
    try {
      if (!api.isAuthenticated()) {
        setUser(null);
        setToken(null);
        return null;
      }
      const res = await api.getCurrentUser();
      if (res && res.user) {
        setUser(res.user);
        setToken(api.getToken());
        return res.user;
      }
      return null;
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        logout();
      }
      return null;
    }
  }, [logout]);

  // Manejador centralizado de sesión expirada (401)
  useEffect(() => {
    setUnauthorizedCallback(() => {
      logout();
      setAuthError("Tu sesión ha expirado o no es válida. Por favor inicia sesión nuevamente.");
    });
    return () => {
      setUnauthorizedCallback(null);
    };
  }, [logout]);

  // Validación de sesión inicial al cargar la aplicación
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        if (api.isAuthenticated()) {
          const res = await api.getCurrentUser();
          if (isMounted && res && res.user) {
            setUser(res.user);
            setToken(api.getToken());
          }
        }
      } catch (err) {
        console.warn("[Auth] No se pudo restaurar la sesión previa:", err);
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initSession();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResponse> => {
    setAuthError(null);
    try {
      const response = await api.login(credentials);
      if (response && response.token && response.user) {
        setToken(response.token);
        setUser(response.user);
      }
      return response;
    } catch (err) {
      if (err instanceof ApiClientError) {
        setAuthError(err.message || "Error al iniciar sesión.");
      } else if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError("Error desconocido al autenticar.");
      }
      throw err;
    }
  }, []);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (user.rol === 1) return true;
    const roleName = (user.nombre_rol || "").toLowerCase();
    return roleName.includes("admin") || roleName.includes("administrador");
  }, [user]);

  const isAuthenticated = Boolean(user && token);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated,
      isAdmin,
      login,
      logout,
      refreshUser,
      authError,
      clearAuthError,
    }),
    [user, token, isLoading, isAuthenticated, isAdmin, login, logout, refreshUser, authError, clearAuthError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
