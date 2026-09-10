import { createContext, useContext } from "react";
import type { LoginCredentials, LoginResponse, Usuario } from "../services/api";

export interface AuthContextType {
  user: Usuario | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => void;
  refreshUser: () => Promise<Usuario | null>;
  authError: string | null;
  clearAuthError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
}
