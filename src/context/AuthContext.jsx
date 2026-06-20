import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, setAccessToken } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [actor, setActor] = useState(null);
  const [status, setStatus] = useState("loading");

  const refresh = useCallback(async () => {
    try {
      const payload = await apiRequest("/api/auth/refresh", {
        method: "POST",
        auth: false,
        retry: false,
      });
      setAccessToken(payload.accessToken);
      setActor(payload.actor);
      setStatus("authenticated");
      return payload.actor;
    } catch (error) {
      setAccessToken("");
      setActor(null);
      setStatus("anonymous");
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async ({ login: loginName, password }) => {
    const payload = await apiRequest("/api/auth/login", {
      method: "POST",
      auth: false,
      body: {
        login: loginName,
        password,
      },
    });
    setAccessToken(payload.accessToken);
    setActor(payload.actor);
    setStatus("authenticated");
    return payload.actor;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        retry: false,
      });
    } finally {
      setAccessToken("");
      setActor(null);
      setStatus("anonymous");
    }
  }, []);

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }) => {
      await apiRequest("/api/auth/change-password", {
        method: "PATCH",
        body: {
          currentPassword,
          newPassword,
        },
      });
      return refresh();
    },
    [refresh]
  );

  const hasPermission = useCallback(
    (resource, action) => {
      return Boolean(
        actor?.grants?.some((grant) => {
          const resourceMatches = grant.resource_cd === "*" || grant.resource_cd === resource;
          const actionMatches = grant.action_cd === "*" || grant.action_cd === action;
          return resourceMatches && actionMatches;
        })
      );
    },
    [actor]
  );

  const value = useMemo(
    () => ({
      actor,
      status,
      isAuthenticated: status === "authenticated",
      requiresPasswordChange: Boolean(actor?.password_reset_required_bool),
      changePassword,
      hasPermission,
      login,
      logout,
      refresh,
    }),
    [actor, changePassword, hasPermission, login, logout, refresh, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return value;
}
