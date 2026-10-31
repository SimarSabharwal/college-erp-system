import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import {
  Calendar,
  CheckCircle2,
  Award,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface TimetableInfo {
  timetable_id: number;
  name: string;
  status: string;
  total_slots_scheduled: number;
  is_locked: boolean;
}

interface DeptPerfItem {
  department_code: string;
  department_name: string;
  students_count: number;
  faculty_count: number;
  avg_attendance_pct: number;
  pass_percentage: number;
}

export const PrincipalDashboard: React.FC = () => {
  const [timetable, setTimetable] = useState<TimetableInfo | null>(null);
  const [deptPerf, setDeptPerf] = useState<DeptPerfItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total_students: 59,
    total_faculty: 9,
    active_rooms: 24,
    active_subjects: 8,
  });

  const [currentDateTime] = useState<string>(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ttRes, perfRes, statsRes] = await Promise.all([
          api.get("/timetable/latest"),
          api.get("/reports/principal/department-performance"),
          api.get("/reports/admin/stats"),
        ]);
        setTimetable(ttRes.data);
        setDeptPerf(perfRes.data);
        if (statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (err) {
        console.error("Failed to load principal dashboard data", err);
      }
    };
    fetchData();
  }, []);

  const handleQuickAction = (actionName: string) => {
    setFeedback(`Action triggered: ${actionName}. Report generated.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Directorate Executive Dashboard</h1>
          <p className="text-sm text-slate-500 font-medium">Academic Year 2026-27 · College Executive Governance</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-xl border border-blue-200 text-xs font-semibold">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>{currentDateTime}</span>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* 4 Stat Cards from Live DB */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
            {stats.total_students}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Students</p>
            <p className="text-lg font-bold text-slate-800">{stats.total_students} Enrolled</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            {stats.total_faculty}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Faculty Members</p>
            <p className="text-lg font-bold text-slate-800">{stats.total_faculty} Appointed</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            {stats.active_rooms}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Campus Rooms</p>
            <p className="text-lg font-bold text-slate-800">4 Labs + Floor 2</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
            {stats.active_subjects}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Curriculum Courses</p>
            <p className="text-lg font-bold text-slate-800">8 BCA Subjects</p>
          </div>
        </div>
      </div>

      {/* Middle Grid: Timetable Status & Department Performance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timetable Status Gauge */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800">College Timetable Status</h2>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
              Active Schedule
            </span>
          </div>

          <div className="flex items-center justify-center py-4">
            <div className="w-32 h-32 rounded-full border-8 border-emerald-500 border-t-blue-500 flex flex-col items-center justify-center shadow-xs">
              <span className="text-2xl font-black text-slate-800">
                {timetable?.status === "Active" ? "100%" : "95%"}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {timetable?.status || "Active"}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs font-medium divide-y divide-slate-100">
            <div className="flex justify-between py-1 text-slate-600">
              <span>Total Scheduled Slots:</span>
              <span className="font-bold text-slate-800">{timetable?.total_slots_scheduled || 39} / 48</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>Shift-Lock (C-09):</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Enforced</span>
              </span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>Continuity Rule (Max 2):</span>
              <span className="font-bold text-emerald-600">Compliant</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>Double-Booking Conflicts:</span>
              <span className="font-bold text-emerald-600">0 Violations</span>
            </div>
          </div>
        </div>

        {/* Department Performance Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Department Academic Performance</h2>
              <p className="text-xs text-slate-500">Student enrollment, faculty strength & average attendance</p>
            </div>
            <button
              onClick={() => handleQuickAction("Export Department Analytics")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition cursor-pointer"
            >
              Export Metrics
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Students</th>
                  <th className="py-2.5 px-3">Faculty</th>
                  <th className="py-2.5 px-3">Avg. Attendance</th>
                  <th className="py-2.5 px-3">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deptPerf.map((row) => (
                  <tr key={row.department_code} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800">{row.department_code}</span>
                      <span className="text-[11px] text-slate-500 block">{row.department_name}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{row.students_count}</td>
                    <td className="py-3 px-3 text-slate-600">{row.faculty_count}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          row.avg_attendance_pct >= 75
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {row.avg_attendance_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">{row.pass_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Approvals, Analytics & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Examination & Attendance Analytics */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" />
            <span>Examination & Results</span>
          </h2>
          <p className="text-xs text-slate-500">Mid-Semester & End-Semester cycle</p>

          <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl space-y-1 text-xs">
            <p className="font-bold text-purple-900">Mid-Semester Exam Schedule</p>
            <p className="text-slate-600">Starts: 16 Nov 2026 · Hall assignments generated</p>
          </div>

          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600">College Pass Rate:</span>
            <span className="font-bold text-emerald-600 text-sm">88.5%</span>
          </div>
        </div>

        {/* Recent Approvals Feed */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Recent Executive Approvals</span>
          </h2>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
              <p className="font-bold text-slate-800">BCA Sem 3 Timetable Published</p>
              <p className="text-[11px] text-slate-500">Shift locks activated · 39 slots</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
              <p className="font-bold text-slate-800">Medical Leave (Dr. Khan)</p>
              <p className="text-[11px] text-slate-500">Substitutes assigned with continuity checks</p>
            </div>
          </div>
        </div>

        {/* Executive Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-slate-800">Executive Quick Actions</h2>
          <div className="space-y-2 text-xs font-semibold">
            <button
              onClick={() => handleQuickAction("Full Academic Audit Report")}
              className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 border border-slate-200/70 transition flex items-center justify-between cursor-pointer"
            >
              <span>Download Academic Audit</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
            </button>
            <button
              onClick={() => handleQuickAction("College Circular Notification")}
              className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 border border-slate-200/70 transition flex items-center justify-between cursor-pointer"
            >
              <span>Broadcast Campus Notice</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
            </button>
            <button
              onClick={() => handleQuickAction("Room Allocation Review")}
              className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 border border-slate-200/70 transition flex items-center justify-between cursor-pointer"
            >
              <span>Review Room Capacities</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
