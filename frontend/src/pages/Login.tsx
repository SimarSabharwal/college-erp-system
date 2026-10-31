import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Users,
  Award,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth, type UserProfile } from "../context/AuthContext";

type LoginCategory = "students" | "teachers" | "leadership";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<LoginCategory>("students");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (loginEmail?: string, loginPwd?: string) => {
    setError(null);
    setSubmitting(true);
    const e = loginEmail || email;
    const p = loginPwd || password;

    try {
      const res = await api.post("/auth/login", { email: e, password: p });
      const { access_token, refresh_token, ...userData } = res.data;
      login(access_token, refresh_token, userData as UserProfile);

      // Route to correct portal based on role
      switch (userData.role) {
        case "Admin":
          navigate("/admin");
          break;
        case "HOD":
          navigate("/hod");
          break;
        case "Teacher":
          navigate("/teacher");
          break;
        case "Principal":
          navigate("/principal");
          break;
        case "Student":
        default:
          navigate("/student");
          break;
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Five Verified Students from students.csv
  const studentsList = [
    { name: "Simar Sabharwal", erp: "0251BCA022", email: "simar@college.edu", pwd: "Student123!", tag: "Morning Batch" },
    { name: "Aryan Vats", erp: "0251BCA002", email: "0251bca002@college.edu", pwd: "Student123!", tag: "Morning Batch" },
    { name: "Prisha Verma", erp: "0251BCA003", email: "0251bca003@college.edu", pwd: "Student123!", tag: "Morning Batch" },
    { name: "Akanksha Sharma", erp: "0251BCA005", email: "0251bca005@college.edu", pwd: "Student123!", tag: "Morning Batch" },
    { name: "Daksh Jauhari", erp: "0251BCA006", email: "0251bca006@college.edu", pwd: "Student123!", tag: "Morning Batch" },
  ];

  // 2. All 9 Faculty Members from teachers.csv
  const professorsList = [
    { code: "MAG", name: "Dr. Mansi Agnihotri", email: "mag@college.edu", pwd: "Teacher123!", subj: "Operating Systems" },
    { code: "DSB", name: "Dr. Daljeet S Bawa", email: "dsb@college.edu", pwd: "Teacher123!", subj: "Software Engineering" },
    { code: "MGS", name: "Dr. Megha Sehgal", email: "mgs@college.edu", pwd: "Teacher123!", subj: "Java & Java Lab" },
    { code: "UG", name: "Dr. Usha Gupta", email: "ug@college.edu", pwd: "Teacher123!", subj: "Statistics" },
    { code: "MKC", name: "Dr. Mahesh Chaubey", email: "mkc@college.edu", pwd: "Teacher123!", subj: "Oracle Lab" },
    { code: "AK", name: "Dr. Ajay Kumar", email: "ak@college.edu", pwd: "Teacher123!", subj: "Start-up Management" },
    { code: "AKR", name: "Mr. Amit Kumar", email: "akr@college.edu", pwd: "Teacher123!", subj: "Yoga & Meditation" },
    { code: "NPN", name: "Mr. Nripesh Kumar Nrip", email: "npn@college.edu", pwd: "Teacher123!", subj: "Java Programming" },
    { code: "YK", name: "Mr. Yashwant Kumar", email: "yk@college.edu", pwd: "Teacher123!", subj: "Statistics" },
  ];

  // 3. Department & Institute Leadership
  const leadershipList = [
    { role: "HOD", name: "Dr. Mahesh Chaubey", roleLabel: "HOD Computer Applications", email: "hod@college.edu", pwd: "Hod123!" },
    { role: "Director", name: "College Director", roleLabel: "Director / Principal", email: "director@college.edu", pwd: "Director123!" },
    { role: "Admin", name: "System Administrator", roleLabel: "Central ERP Admin", email: "admin@college.edu", pwd: "Admin123!" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 sm:px-6 lg:px-8 bg-radial from-slate-900 via-slate-950 to-black">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/20 mb-3">
          <Building className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">College ERP Portal</h2>
        <p className="mt-1 text-sm text-slate-400">Department of Computer Applications · BCA III</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-7 px-6 shadow-2xl rounded-2xl sm:px-8 border border-slate-100">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Direct Credentials Form */}
          <form
            className="space-y-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              handleLoginSubmit();
            }}
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                College Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? "Signing in..." : "Sign In to ERP"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Institutional Login Panel (Exclusive CSV Data) */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Quick Login Directory</span>
              </p>
              <span className="text-[11px] text-slate-600 font-medium">1-Click Sign-in</span>
            </div>

            {/* Category Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("students")}
                className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "students"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Students (5)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("teachers")}
                className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "teachers"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Professors (9)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("leadership")}
                className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "leadership"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>HOD / Director / Admin</span>
              </button>
            </div>

            {/* Tab 1: Students */}
            {activeTab === "students" && (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {studentsList.map((st) => (
                  <button
                    key={st.erp}
                    type="button"
                    onClick={() => {
                      setEmail(st.email);
                      setPassword(st.pwd);
                      handleLoginSubmit(st.email, st.pwd);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50/80 hover:border-blue-200 border border-slate-200/70 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                        {st.erp}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                          {st.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{st.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 group-hover:text-blue-600 shrink-0">
                      Sign In →
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Tab 2: Professors (All 9) */}
            {activeTab === "teachers" && (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {professorsList.map((prof) => (
                  <button
                    key={prof.code}
                    type="button"
                    onClick={() => {
                      setEmail(prof.email);
                      setPassword(prof.pwd);
                      handleLoginSubmit(prof.email, prof.pwd);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50/80 hover:border-blue-200 border border-slate-200/70 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded">
                        {prof.code}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                          {prof.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{prof.subj} · {prof.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 group-hover:text-blue-600 shrink-0">
                      Sign In →
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Tab 3: Leadership (HOD, Director, Admin) */}
            {activeTab === "leadership" && (
              <div className="space-y-1.5">
                {leadershipList.map((item) => (
                  <button
                    key={item.email}
                    type="button"
                    onClick={() => {
                      setEmail(item.email);
                      setPassword(item.pwd);
                      handleLoginSubmit(item.email, item.pwd);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/80 hover:border-blue-200 border border-slate-200/70 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.role === "HOD"
                          ? "bg-purple-100 text-purple-700"
                          : item.role === "Director"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {item.role}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{item.roleLabel} · {item.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 group-hover:text-blue-600 shrink-0">
                      Sign In →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
