import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppShell } from "./components/layout/AppShell";
import { Login } from "./pages/Login";
import { StudentDashboard } from "./pages/dashboards/StudentDashboard";
import { TeacherDashboard } from "./pages/dashboards/TeacherDashboard";
import { HODDashboard } from "./pages/dashboards/HODDashboard";
import { AdminDashboard } from "./pages/dashboards/AdminDashboard";
import { PrincipalDashboard } from "./pages/dashboards/PrincipalDashboard";

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected App Shell */}
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/login" replace />} />
            
            {/* Student Portal */}
            <Route path="student" element={<StudentDashboard />} />
            <Route path="student/*" element={<StudentDashboard />} />

            {/* Teacher Portal */}
            <Route path="teacher" element={<TeacherDashboard />} />
            <Route path="teacher/*" element={<TeacherDashboard />} />

            {/* HOD Portal */}
            <Route path="hod" element={<HODDashboard />} />
            <Route path="hod/*" element={<HODDashboard />} />

            {/* Admin Portal */}
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/*" element={<AdminDashboard />} />

            {/* Principal Portal */}
            <Route path="principal" element={<PrincipalDashboard />} />
            <Route path="principal/*" element={<PrincipalDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
