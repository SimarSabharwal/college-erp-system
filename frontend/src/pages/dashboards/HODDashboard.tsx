import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { TeacherDashboard } from "./TeacherDashboard";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Send,
  XCircle,
  X,
  BookOpen,
  UserCheck,
  GraduationCap,
} from "lucide-react";

interface LeaveItem {
  leave_request_id: number;
  teacher_id: number;
  teacher_name: string;
  department_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  hod_note?: string;
  created_at: string;
  affected_sessions_count: number;
}

interface FacultyWorkload {
  teacher_id: number;
  full_name: string;
  designation: string;
  assigned_hours: number;
  max_hours: number;
  workload_percentage: number;
  subjects: string[];
}

interface TimetableDetailItem {
  detail_id: number;
  timetable_id: number;
  section_id: number;
  section_name: string;
  subject_id: number;
  subject_code: string;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  room_id: number;
  room_code: string;
  slot_id: number;
  day_of_week: string;
  date_str?: string;
  start_time: string;
  end_time: string;
  slot_order: number;
  class_type: string;
  is_lab: boolean;
}

interface AdminStats {
  total_students: number;
  total_faculty: number;
  total_departments: number;
  total_shifts: number;
  active_rooms: number;
  active_subjects: number;
  active_programs: number;
}

export const HODDashboard: React.FC = () => {
  // Dual-Role Interface: HOD Administration vs. Teaching Faculty
  const [viewMode, setViewMode] = useState<"hod" | "teacher">("hod");

  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState<boolean>(true);
  const [actionNotes, setActionNotes] = useState<{ [key: number]: string }>({});
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [workloads, setWorkloads] = useState<FacultyWorkload[]>([]);
  const [timetableDetails, setTimetableDetails] = useState<TimetableDetailItem[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    total_students: 59,
    total_faculty: 9,
    total_departments: 1,
    total_shifts: 2,
    active_rooms: 24,
    active_subjects: 8,
    active_programs: 1,
  });

  const [currentDateTime, setCurrentDateTime] = useState<string>(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(
        new Date().toLocaleDateString("en-US", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      );
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await api.get("/leaves/");
      setLeaves(res.data);
    } catch (err) {
      console.error("Failed to fetch department leaves", err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  const fetchWorkloads = async () => {
    try {
      const res = await api.get("/reports/hod/faculty-workload?dept_id=1");
      setWorkloads(res.data);
    } catch (err) {
      console.error("Failed to fetch workloads", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/reports/admin/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const fetchTimetable = async () => {
    try {
      const res = await api.get("/timetable/latest");
      if (res.data && res.data.details) {
        setTimetableDetails(res.data.details);
      }
    } catch (err) {
      console.error("Failed to fetch timetable", err);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchWorkloads();
    fetchStats();
    fetchTimetable();
  }, []);

  const handleForwardToAdmin = async (leaveId: number) => {
    setProcessingId(leaveId);
    setFeedback(null);
    try {
      const note = actionNotes[leaveId] || "Recommended for approval by HOD.";
      await api.post(`/leaves/${leaveId}/hod-forward`, { note });
      setFeedback({
        type: "success",
        text: "Leave application endorsed and forwarded to Administration for substitute reassignment.",
      });
      fetchLeaves();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.response?.data?.detail || "Failed to forward leave to Admin.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDenyLeave = async (leaveId: number) => {
    const note = actionNotes[leaveId];
    if (!note) {
      alert("Please provide a brief reason for denying this leave request.");
      return;
    }
    setProcessingId(leaveId);
    setFeedback(null);
    try {
      await api.post(`/leaves/${leaveId}/hod-deny`, { note });
      setFeedback({
        type: "success",
        text: "Leave application denied. Faculty notified.",
      });
      fetchLeaves();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.response?.data?.detail || "Failed to deny leave request.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingLeaves = leaves.filter((l) => l.status === "Pending_HOD");
  const processedLeaves = leaves.filter((l) => l.status !== "Pending_HOD");

  // Official Verified Curriculum Subjects (8 subjects only)
  const officialSubjects = [
    { code: "JP", name: "Java Programming", teacher: "Dr. Megha Sehgal", hours: 4, type: "Theory" },
    { code: "JAVA_LAB", name: "Lab on Java", teacher: "Dr. Megha Sehgal", hours: 2, type: "Lab (Room 107)" },
    { code: "OS", name: "Operating Systems", teacher: "Dr. Mansi Agnihotri", hours: 4, type: "Theory (Floor 2)" },
    { code: "SE", name: "Software Engineering", teacher: "Dr. Daljeet S Bawa", hours: 4, type: "Theory (Floor 2)" },
    { code: "ST", name: "Statistics", teacher: "Dr. Usha Gupta", hours: 4, type: "Theory (Floor 2)" },
    { code: "ORACLE_LAB", name: "Lab on Oracle", teacher: "Dr. Mahesh Chaubey", hours: 2, type: "Lab (Room 107)" },
    { code: "SUM", name: "Start-up Management", teacher: "Dr. Ajay Kumar", hours: 2, type: "Theory (Floor 2)" },
    { code: "YOGA", name: "Yoga & Meditation", teacher: "Mr. Nripesh Kumar Nrip", hours: 1, type: "Practice" },
  ];

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const periods = [
    { label: "09:10 - 10:05", order: 1 },
    { label: "10:10 - 11:05", order: 2 },
    { label: "11:05 - 11:20 (Break)", order: -1 },
    { label: "11:20 - 12:15", order: 3 },
    { label: "12:20 - 13:15", order: 4 },
    { label: "13:20 - 14:15", order: 5 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              Department of Computer Applications
            </h1>
            <span className="text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full">
              HOD Oversight
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Academic Head: <strong className="text-slate-800 font-bold">Dr. Mahesh Chaubey</strong> · BCA Semester III Program
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 text-slate-700 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold shadow-2xs">
          <Calendar className="w-4 h-4 text-purple-600" />
          <span>{currentDateTime}</span>
        </div>
      </div>

      {/* Dual Role Selector: HOD Administration vs. Teaching Faculty */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200/90 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Big Box 1: HOD Administration */}
          <button
            type="button"
            onClick={() => setViewMode("hod")}
            className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex items-start gap-4 ${
              viewMode === "hod"
                ? "bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-white border-purple-600 shadow-md shadow-purple-500/10"
                : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 opacity-75 hover:opacity-100"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                viewMode === "hod" ? "bg-purple-600 text-white shadow-xs" : "bg-slate-200 text-slate-600"
              }`}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 tracking-tight">HOD Administration</span>
                {viewMode === "hod" && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white px-2.5 py-0.5 rounded-full">
                    Active Section
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                Department Oversight · Faculty Workloads (9 Professors) · Leave Approvals · Official Curriculum & Department Timetable
              </p>
            </div>
          </button>

          {/* Big Box 2: Teaching Faculty */}
          <button
            type="button"
            onClick={() => setViewMode("teacher")}
            className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex items-start gap-4 ${
              viewMode === "teacher"
                ? "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white border-emerald-600 shadow-md shadow-emerald-500/10"
                : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70 opacity-75 hover:opacity-100"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                viewMode === "teacher" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-200 text-slate-600"
              }`}
            >
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 tracking-tight">Teacher / Faculty</span>
                {viewMode === "teacher" && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                    Active Section
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                My Teaching Lectures · Conduct Class · Student Attendance Marking (Section III) · My Personal Weekly Teaching Timetable
              </p>
            </div>
          </button>
        </div>
      </div>

      {viewMode === "teacher" ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Teaching Faculty Mode Active:</strong> You are viewing Dr. Mahesh Chaubey's personal lecture schedule, class attendance controls, and teaching tools.
              </span>
            </div>
            <button
              onClick={() => setViewMode("hod")}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer shrink-0"
            >
              Switch back to HOD Overview →
            </button>
          </div>
          <TeacherDashboard />
        </div>
      ) : (
        <>
          {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Stat Cards from Live Database */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
            {stats.total_faculty}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Faculty Members</p>
            <p className="text-lg font-bold text-slate-800">{stats.total_faculty} Appointed</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            {stats.total_students}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">BCA Students</p>
            <p className="text-lg font-bold text-slate-800">{stats.total_students} Enrolled</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
            {pendingLeaves.length}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leave Requests</p>
            <p className="text-lg font-bold text-slate-800">{pendingLeaves.length} Pending</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            {stats.active_subjects}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Subjects</p>
            <p className="text-lg font-bold text-slate-800">{stats.active_subjects} Courses</p>
          </div>
        </div>
      </div>

      {/* Leave Approval Inbox */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-purple-600" />
              <span>Department Faculty Leave Requests Inbox</span>
            </h2>
            <p className="text-xs text-slate-500">Review faculty leave requests and forward to Administration with your endorsement</p>
          </div>
          <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl">
            {pendingLeaves.length} Pending Actions
          </span>
        </div>

        {loadingLeaves ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Loading department requests...</div>
        ) : pendingLeaves.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>All faculty leave requests have been reviewed. Department inbox is clear.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingLeaves.map((lr) => (
              <div
                key={lr.leave_request_id}
                className="p-5 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50/40 via-white to-slate-50/40 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span>{lr.teacher_name}</span>
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        {lr.leave_type} Leave
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Duration: <strong>{lr.start_date}</strong> to <strong>{lr.end_date}</strong> ({lr.affected_sessions_count} Lectures affected)
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 self-start sm:self-auto">
                    Awaiting HOD Endorsement
                  </span>
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-slate-200/60 text-xs text-slate-700">
                  <span className="font-bold text-slate-900">Reason:</span> "{lr.reason}"
                </div>

                {/* HOD Remarks & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <input
                    type="text"
                    placeholder="Optional HOD note / recommendation remarks for Admin..."
                    value={actionNotes[lr.leave_request_id] || ""}
                    onChange={(e) =>
                      setActionNotes({ ...actionNotes, [lr.leave_request_id]: e.target.value })
                    }
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-purple-500 bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDenyLeave(lr.leave_request_id)}
                      disabled={processingId === lr.leave_request_id}
                      className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Deny</span>
                    </button>
                    <button
                      onClick={() => handleForwardToAdmin(lr.leave_request_id)}
                      disabled={processingId === lr.leave_request_id}
                      className="px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-purple-500/20 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{processingId === lr.leave_request_id ? "Forwarding..." : "Forward to Admin"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recently Reviewed Leaves */}
        {processedLeaves.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Recently Reviewed Requests ({processedLeaves.length})
            </h3>
            <div className="space-y-2">
              {processedLeaves.slice(0, 3).map((lr) => (
                <div
                  key={lr.leave_request_id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{lr.teacher_name}</span> · {lr.leave_type} Leave ({lr.start_date} to {lr.end_date})
                    {lr.hod_note && <p className="text-[11px] text-slate-500 italic mt-0.5">HOD Note: {lr.hod_note}</p>}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      lr.status === "Approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : lr.status === "Pending_Admin"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {lr.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Middle Row: Live Faculty Workload & Official Subject Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faculty Workload Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Faculty Teaching Workloads</h2>
              <p className="text-xs text-slate-500">Live assigned hours for 9 appointed professors</p>
            </div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              Max 20h / Week
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {workloads.map((fw) => (
              <div key={fw.teacher_id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{fw.full_name}</span>
                    <span className="text-slate-400 text-[11px] block">{fw.designation} · {fw.subjects.join(", ")}</span>
                  </div>
                  <span className="font-bold text-slate-700">
                    {fw.assigned_hours} / {fw.max_hours} hrs ({fw.workload_percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      fw.workload_percentage > 90
                        ? "bg-amber-500"
                        : "bg-purple-600"
                    }`}
                    style={{ width: `${Math.min(fw.workload_percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Official Subject-Wise Allocation */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Curriculum Subject Allocations</h2>
              <p className="text-xs text-slate-500">Official 8 subjects mapped to verified faculty</p>
            </div>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
              Approved Curriculum
            </span>
          </div>

          <div className="space-y-2 text-xs max-h-[380px] overflow-y-auto pr-1">
            {officialSubjects.map((sub) => (
              <div key={sub.code} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">{sub.name}</span>
                    <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded font-bold">
                      {sub.code}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px] block mt-0.5">{sub.type}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-purple-800 text-xs block">{sub.teacher}</span>
                  <span className="text-slate-500 text-[10px]">{sub.hours} hrs/week</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timetable Overview Section (Live Schedule from DB) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Department Active Timetable Grid</h2>
            <p className="text-xs text-slate-500">BCA Semester III · Section III (Morning Batch)</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              Room 107 (Primary Lab) · Floor 2 (Rooms 201–208 Theory)
            </span>
          </div>
        </div>

        {/* Live Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3">Time</th>
                {daysOfWeek.map((day) => (
                  <th key={day} className="py-2.5 px-3">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map((p) => {
                if (p.order === -1) {
                  return (
                    <tr key={p.label} className="bg-amber-50/50 text-amber-900 text-[11px] font-bold">
                      <td className="py-1.5 px-3" colSpan={6}>
                        ☕ 15-Minute Structural Break ({p.label}) — Continuity counter reset (Teaching prohibited)
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={p.label} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-500 whitespace-nowrap">{p.label}</td>
                    {daysOfWeek.map((day) => {
                      const match = timetableDetails.find(
                        (d) => d.day_of_week === day && d.slot_order === p.order && d.section_name.includes("Section III")
                      );
                      if (!match) {
                        return (
                          <td key={day} className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            —
                          </td>
                        );
                      }

                      return (
                        <td key={day} className="py-3 px-3">
                          <div
                            className={`p-2 rounded-xl border text-[11px] space-y-0.5 ${
                              match.is_lab
                                ? "bg-purple-50/80 border-purple-200 text-purple-950"
                                : "bg-blue-50/80 border-blue-200 text-blue-950"
                            }`}
                          >
                            <p className="font-bold truncate">{match.subject_name}</p>
                            <p className="text-[10px] text-slate-500 truncate">
                              Room {match.room_code} · {match.teacher_name}
                            </p>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
