import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building,
  ShieldCheck,
  GraduationCap,
  IdCard,
  Mail,
  Award,
  Hash,
  CheckCircle2,
  Sparkles,
  UserCheck,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || "Student";

  // Compute initials for aesthetic avatar
  const nameParts = (user?.full_name || "User").trim().split(" ");
  const initials =
    nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : nameParts[0].slice(0, 2).toUpperCase();

  // Role-specific metadata
  const getRoleMeta = () => {
    switch (role) {
      case "Admin":
        return {
          portalName: "Admin Portal",
          portalBadgeColor: "text-blue-400",
          gradient: "from-blue-600 via-indigo-600 to-sky-500",
          roleTitle: "System Administrator",
          badge: "Super Admin · Full Authority",
          badgeBg: "bg-blue-950/70 border-blue-800/60 text-blue-300",
          dept: "Office of the Dean / Central Admin",
          idLabel: "Administrator ID",
          idValue: "ADM-2026-001",
          scopeLabel: "System Scope",
          scopeValue: "Full Institutional Control",
          desc: "Authorized to manage timetables, rooms, faculty workloads, leave approvals, and student records.",
          dashboardPath: "/admin",
          dashboardLabel: "Admin Command Center",
          icon: ShieldCheck,
        };
      case "HOD":
        return {
          portalName: "HOD Portal",
          portalBadgeColor: "text-purple-400",
          gradient: "from-purple-600 via-indigo-600 to-blue-600",
          roleTitle: "Head of Department",
          badge: "HOD · Computer Applications",
          badgeBg: "bg-purple-950/70 border-purple-800/60 text-purple-300",
          dept: "Dept of Computer Applications",
          idLabel: "Faculty ERP ID",
          idValue: "FAC-BCA-HOD",
          scopeLabel: "Department Scope",
          scopeValue: "BCA Semester 3 & Faculty",
          desc: "Responsible for academic scheduling, subject allocations, leave endorsements, and departmental performance.",
          dashboardPath: "/hod",
          dashboardLabel: "Department Dashboard",
          icon: BookOpen,
        };
      case "Teacher":
        return {
          portalName: "Faculty Portal",
          portalBadgeColor: "text-emerald-400",
          gradient: "from-emerald-600 via-teal-600 to-blue-600",
          roleTitle: "Faculty Professor",
          badge: "Assistant Professor · BCA",
          badgeBg: "bg-emerald-950/70 border-emerald-800/60 text-emerald-300",
          dept: "Dept of Computer Applications",
          idLabel: "Employee Staff ID",
          idValue: `FAC-${user?.user_id ? String(user.user_id).padStart(3, "0") : "005"}`,
          scopeLabel: "Academic Duty",
          scopeValue: "Teaching & Attendance",
          desc: "Authorized to conduct lectures, submit live student attendance, view weekly schedules, and request leaves.",
          dashboardPath: "/teacher",
          dashboardLabel: "Faculty Dashboard",
          icon: UserCheck,
        };
      case "Principal":
        return {
          portalName: "Directorate Portal",
          portalBadgeColor: "text-amber-400",
          gradient: "from-amber-600 via-orange-600 to-indigo-600",
          roleTitle: "Executive Directorate",
          badge: "College Director / Principal",
          badgeBg: "bg-amber-950/70 border-amber-800/60 text-amber-300",
          dept: "Institutional Directorate",
          idLabel: "Executive ID",
          idValue: "DIR-EXE-001",
          scopeLabel: "Governance Scope",
          scopeValue: "Institutional Oversight",
          desc: "Apex executive oversight across all academic departments, faculty workloads, analytics, and timetable approvals.",
          dashboardPath: "/principal",
          dashboardLabel: "Directorate Dashboard",
          icon: Award,
        };
      case "Student":
      default: {
        const studentErp = user?.student_erp || user?.roll_no || "0251BCA022";
        const prn = user?.prn || "2520100185";
        const program = user?.program_code || "BCA";
        const semester = user?.semester_no || 3;
        const section = user?.section_name || "III";
        const shift = user?.shift_name || "Morning";

        return {
          portalName: "Student Portal",
          portalBadgeColor: "text-blue-400",
          gradient: "from-blue-600 via-indigo-600 to-violet-500",
          roleTitle: "Undergraduate Student",
          badge: `${program} · Sem ${semester} (Sec ${section})`,
          badgeBg: "bg-blue-950/70 border-blue-800/60 text-blue-300",
          dept: "Dept of Computer Applications",
          idLabel: "College ERP ID",
          idValue: studentErp,
          scopeLabel: "University PRN",
          scopeValue: prn,
          desc: `Enrolled in ${program} Semester ${semester} (${shift} Batch). Minimum 75% attendance mandatory.`,
          dashboardPath: "/student",
          dashboardLabel: "Student Dashboard",
          icon: GraduationCap,
        };
      }
    }
  };

  const meta = getRoleMeta();
  const IconComponent = meta.icon;

  return (
    <aside className="w-72 bg-[#0F172A] text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800 shadow-xl shadow-black/20">
      {/* Header Branding */}
      <div className="p-4 flex items-center gap-3 border-b border-slate-800/80 bg-[#0B1120]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
          <Building className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-tight leading-tight">College ERP</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <p className={`text-[11px] font-semibold tracking-wider uppercase ${meta.portalBadgeColor}`}>
              {meta.portalName}
            </p>
          </div>
        </div>
      </div>

      {/* Main Clean Profile & Identity Body */}
      <div className="p-5 flex-1 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          {/* Photo & Identity Avatar */}
          <div className="flex flex-col items-center text-center pt-2">
            <div className="relative mb-3 group">
              <div className={`w-24 h-24 rounded-2xl bg-gradient-to-tr ${meta.gradient} p-0.5 shadow-lg ring-4 ring-slate-800/80`}>
                <div className="w-full h-full rounded-[14px] bg-[#0F172A] flex flex-col items-center justify-center overflow-hidden relative">
                  <div className="w-full h-full bg-gradient-to-b from-blue-500/20 to-indigo-600/30 flex items-center justify-center">
                    <span className="text-3xl font-extrabold text-white tracking-wider font-mono">
                      {initials}
                    </span>
                  </div>
                </div>
              </div>
              {/* Verified Badge */}
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-[#0F172A] shadow-sm" title="Active Verified Profile">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
              {user?.full_name || "Simar Sabharwal"}
            </h2>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-center">
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${meta.badgeBg}`}>
                <IconComponent className="w-3 h-3" />
                {meta.badge}
              </span>
            </div>
          </div>

          {/* Primary Simplistic Navigation Action */}
          <div className="pt-1">
            <NavLink
              to={meta.dashboardPath}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all shadow-xs ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400"
                    : "bg-slate-800/70 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-700/60"
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4 text-white shrink-0" />
              <span className="truncate flex-1">{meta.dashboardLabel}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </NavLink>
          </div>

          {/* Academic / Professional Credentials Card */}
          <div className="space-y-2.5 pt-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
              <span>Official Credentials</span>
              <Sparkles className="w-3 h-3 text-blue-400" />
            </div>

            {/* ERP / Employee ID */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 transition flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <IdCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{meta.idLabel}</p>
                  <p className="text-xs font-mono font-bold text-white tracking-wider">{meta.idValue}</p>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded font-medium">Verified</span>
            </div>

            {/* Scope / PRN */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 transition flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Hash className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{meta.scopeLabel}</p>
                  <p className="text-xs font-mono font-bold text-slate-200 tracking-wider truncate max-w-[120px]">
                    {meta.scopeValue}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 px-1.5 py-0.5 rounded font-medium">Active</span>
            </div>

            {/* Department */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 transition">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Department</p>
                  <p className="text-xs font-medium text-slate-200 truncate">{meta.dept}</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                <span>Academic Year</span>
                <span className="font-semibold text-slate-300">2026 – 2027</span>
              </div>
            </div>

            {/* Email */}
            <div className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 transition">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Institutional Email</p>
                  <p className="text-xs text-slate-200 truncate">{user?.email || "user@college.edu"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Standing / Role Summary Card */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-900/40">
            <div className="flex items-center gap-2 text-blue-300 font-semibold text-xs mb-1">
              <Award className="w-4 h-4 text-blue-400" />
              <span>{meta.roleTitle}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {meta.desc}
            </p>
          </div>
        </div>

        {/* Clean ID Footer */}
        <div className="pt-4 border-t border-slate-800/80 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/40 px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Active Session · Verified Officer</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-mono">College ERP System v1.0</p>
        </div>
      </div>
    </aside>
  );
};
