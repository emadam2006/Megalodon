import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  must_change_credentials?: boolean;
  roles: { id: string; name: string; description?: string }[];
}

interface AuthContextType {
  user: AuthUser | null;
  roles: UserRole[];
  isAdmin: boolean;
  isOperator: boolean;
  isViewer: boolean;
  isLoading: boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  canWrite: boolean; // ADMIN or OPERATOR
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  roles: [],
  isAdmin: false,
  isOperator: false,
  isViewer: false,
  isLoading: true,
  hasRole: () => false,
  hasAnyRole: () => false,
  canWrite: false,
  logout: () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("megalodon_token");
    localStorage.removeItem("megalodon_refresh_token");
    localStorage.removeItem("sentinel_token");
    localStorage.removeItem("sentinel_refresh_token");
    setUser(null);
    window.dispatchEvent(new Event("auth:unauthorized"));
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("megalodon_token") || localStorage.getItem("sentinel_token");
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (res.status === 401 || res.status === 403) {
        // Token is definitively rejected — clear and redirect
        logout();
        return;
      }

      if (!res.ok) {
        // Server error (5xx) or other transient failure — don't logout,
        // just parse a minimal user from the JWT payload so the app renders
        try {
          const parts = token.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            // Build a minimal AuthUser from JWT claims
            setUser({
              id: payload.sub ?? "",
              username: payload.username ?? "User",
              email: "",
              is_active: true,
              is_superuser: payload.is_superuser ?? false,
              roles: (payload.roles ?? []).map((name: string) => ({ id: name, name })),
            });
          }
        } catch {
          // Can't parse JWT — just stop loading without a user
        }
        setIsLoading(false);
        return;
      }

      const data: AuthUser = await res.json();
      setUser(data);
    } catch {
      // Network error — don't logout, just stop loading so app renders
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Re-fetch user profile when token changes (e.g. after login)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "megalodon_token" || e.key === "sentinel_token") {
        refreshUser();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refreshUser]);

  const roles = (user?.roles?.map((r) => r.name as UserRole) ?? []);
  const isAdmin = user?.is_superuser === true || roles.includes("ADMIN");
  const isOperator = roles.includes("OPERATOR") || isAdmin;
  const isViewer = roles.includes("VIEWER") || isOperator;
  const canWrite = isAdmin || roles.includes("OPERATOR");

  const hasRole = (role: UserRole) => roles.includes(role) || (role === "ADMIN" && user?.is_superuser === true);
  const hasAnyRole = (rs: UserRole[]) => rs.some((r) => hasRole(r));

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        isAdmin,
        isOperator,
        isViewer,
        isLoading,
        hasRole,
        hasAnyRole,
        canWrite,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
