import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api/client";

export interface UserProfile {
  user_id: number;
  full_name: string;
  email: string;
  role: "Admin" | "Principal" | "HOD" | "Teacher" | "Student" | string;
  department_id?: number | null;
  teacher_id?: number | null;
  student_id?: number | null;
  section_id?: number | null;
  roll_no?: string | null;
  employee_no?: string | null;
  student_erp?: string | null;
  prn?: string | null;
  program_code?: string | null;
  semester_no?: number | null;
  section_name?: string | null;
  shift_name?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  login: (token: string, refreshToken: string, userData: UserProfile) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("erp_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("erp_access_token"));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMe = async () => {
      const savedToken = localStorage.getItem("erp_access_token");
      if (savedToken) {
        try {
          const res = await api.get("/auth/me");
          setUser(res.data);
          localStorage.setItem("erp_user", JSON.stringify(res.data));
        } catch (err) {
          console.error("Failed to load user profile", err);
          logout();
        }
      }
      setLoading(false);
    };
    fetchMe();
  }, []);

  const login = (accessToken: string, refreshToken: string, userData: UserProfile) => {
    localStorage.setItem("erp_access_token", accessToken);
    localStorage.setItem("erp_refresh_token", refreshToken);
    localStorage.setItem("erp_user", JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("erp_access_token");
    localStorage.removeItem("erp_refresh_token");
    localStorage.removeItem("erp_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
