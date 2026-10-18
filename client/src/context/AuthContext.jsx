import { createContext, useContext, useMemo, useState } from "react";

import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("medicare_user") || "null");
    } catch {
      return null;
    }
  });

  function saveSession(data) {
    localStorage.setItem("medicare_token", data.token);
    localStorage.setItem("medicare_user", JSON.stringify(data.user));

    setUser(data.user);
  }

  async function register(form) {
    const { data } = await api.post("/auth/register", form);
    saveSession(data);
    return data;
  }

  async function login(form) {
    const { data } = await api.post("/auth/login", form);
    saveSession(data);
    return data;
  }

  async function adminLogin(form) {
    const { data } = await api.post("/auth/admin-login", form);

    if (data.user?.role !== "ADMIN") {
      throw new Error("Administrator access required.");
    }

    saveSession(data);
    return data;
  }

  async function googleLogin(credential) {
    const { data } = await api.post("/auth/google", {
      credential,
    });

    saveSession(data);
    return data;
  }

  function logout() {
    localStorage.removeItem("medicare_token");
    localStorage.removeItem("medicare_user");
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      register,
      login,
      adminLogin,
      googleLogin,
      logout,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}