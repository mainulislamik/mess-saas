"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  avatar?: string | null;
  is_superuser?: boolean;
}

export interface Mess {
  id: string;
  name: string;
  slug: string;
  district: string;
  thana: string;
  area: string;
  invite_code: string;
  my_role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  currentMess: Mess | null;
  userMesses: Mess[];
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<User>;
  register: (name: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
  setCurrentMess: (mess: Mess) => void;
  refreshMesses: () => Promise<Mess[]>;
  impersonateMess: (messId: string) => Promise<void>;
  revertImpersonation: () => Promise<void>;
  isImpersonating: boolean;
  portalMode: "manager" | "member";
  setPortalMode: (mode: "manager" | "member") => void;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentMess, setCurrentMess] = useState<Mess | null>(null);
  const [userMesses, setUserMesses] = useState<Mess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [portalMode, setPortalModeState] = useState<"manager" | "member">("manager");

  const isManager =
    currentMess?.my_role?.toLowerCase() === "owner" ||
    currentMess?.my_role?.toLowerCase() === "manager";

  useEffect(() => {
    if (currentMess) {
      const role = currentMess.my_role?.toLowerCase();
      if (role === "member") {
        setPortalModeState("member");
        if (typeof window !== "undefined") {
          localStorage.setItem("portal_mode", "member");
        }
      } else {
        const saved = (typeof window !== "undefined" ? localStorage.getItem("portal_mode") : null) as "manager" | "member" | null;
        setPortalModeState(saved || "manager");
      }
    }
  }, [currentMess]);

  const setPortalMode = (mode: "manager" | "member") => {
    if (!isManager && mode === "manager") {
      return;
    }
    setPortalModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("portal_mode", mode);
    }
  };

  const refreshMesses = async (): Promise<Mess[]> => {
    try {
      const res = await api.get("/messes");
      const messes: Mess[] = res.data;
      setUserMesses(messes);
      if (messes.length > 0) {
        const savedId = localStorage.getItem("current_mess_id");
        const found = messes.find((m) => m.id === savedId) || messes[0];
        setCurrentMess(found);
        localStorage.setItem("current_mess_id", found.id);
      } else {
        setCurrentMess(null);
      }
      return messes;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("mess_token");
    const savedUser = localStorage.getItem("mess_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
        api.get("/auth/me")
          .then((res) => {
            setUser(res.data);
            localStorage.setItem("mess_user", JSON.stringify(res.data));
            return refreshMesses();
          })
          .catch(() => {
            logout();
          })
          .finally(() => {
            setIsLoading(false);
          });
      } catch {
        logout();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (phone: string, password: string): Promise<User> => {
    localStorage.removeItem("portal_mode");
    localStorage.removeItem("current_mess_id");
    const res = await api.post("/auth/login", { phone, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem("mess_token", access_token);
    localStorage.setItem("mess_user", JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    await refreshMesses();
    return userData;
  };

  const register = async (name: string, phone: string, password: string) => {
    const res = await api.post("/auth/register", { name, phone, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem("mess_token", access_token);
    localStorage.setItem("mess_user", JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    await refreshMesses();
  };

  const logout = () => {
    localStorage.removeItem("mess_token");
    localStorage.removeItem("mess_user");
    localStorage.removeItem("current_mess_id");
    localStorage.removeItem("portal_mode");
    setToken(null);
    setUser(null);
    setCurrentMess(null);
    setUserMesses([]);
  };

  const handleSetCurrentMess = (mess: Mess) => {
    setCurrentMess(mess);
    localStorage.setItem("current_mess_id", mess.id);
  };

  const isImpersonating = typeof window !== "undefined" && !!localStorage.getItem("original_admin_token");

  const impersonateMess = async (messId: string) => {
    const res = await api.post(`/platform/messes/${messId}/login-as`);
    const { access_token } = res.data;
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("original_admin_token")) {
        localStorage.setItem("original_admin_token", token || "");
        localStorage.setItem("original_admin_user", JSON.stringify(user));
      }
      localStorage.setItem("mess_token", access_token);
    }
    setToken(access_token);
    const meRes = await api.get("/auth/me");
    setUser(meRes.data);
    if (typeof window !== "undefined") {
      localStorage.setItem("mess_user", JSON.stringify(meRes.data));
    }
    await refreshMesses();
  };

  const revertImpersonation = async () => {
    if (typeof window !== "undefined") {
      const origToken = localStorage.getItem("original_admin_token");
      const origUser = localStorage.getItem("original_admin_user");
      if (origToken) {
        localStorage.setItem("mess_token", origToken);
        localStorage.removeItem("original_admin_token");
        setToken(origToken);
        if (origUser) {
          const parsedUser = JSON.parse(origUser);
          setUser(parsedUser);
          localStorage.setItem("mess_user", origUser);
        }
        localStorage.removeItem("original_admin_user");
        await refreshMesses();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentMess,
        userMesses,
        isLoading,
        login,
        register,
        logout,
        setCurrentMess: handleSetCurrentMess,
        refreshMesses,
        impersonateMess,
        revertImpersonation,
        isImpersonating,
        portalMode,
        setPortalMode,
        isManager,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
