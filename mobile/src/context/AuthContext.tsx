import React, { createContext, useContext, useState, ReactNode } from "react";
import { mobileApi, setMobileAuthToken } from "../api/client";

interface UserProfile {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  department_id?: number;
  section_id?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await mobileApi.post("/auth/login", { email, password });
      const { access_token, user_id, full_name, role, department_id } = res.data;
      setToken(access_token);
      setMobileAuthToken(access_token);
      setUser({
        user_id,
        full_name,
        email,
        role,
        department_id,
        section_id: role === "Student" ? 1 : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setMobileAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useMobileAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useMobileAuth must be used within an AuthProvider");
  }
  return context;
};
