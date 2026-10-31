import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import {
  Users,
  Calendar,
  Clock,
  CheckSquare,
  Repeat,
  FileSpreadsheet,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  UserCheck,
  Send,
  Trash2,
  Save,
} from "lucide-react";

interface ClassSessionItem {
  session_id: number;
  section_name: string;
  subject_code: string;
  subject_name: string;
  room_code: string;
  start_time: string;
  end_time: string;
  status: string;
  is_lab: boolean;
}

interface CandidateSubstitute {
  teacher_id: number;
  user_id: number;
  full_name: string;
  employee_no: string;
  designation: string;
  department_name: string;
  is_same_dept: boolean;
  classes_today: number;
  is_continuity_safe: boolean;
  consecutive_count: number;
  continuity_warning?: string;
  priority: number;
}

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
  suggested_sub_name?: string;
  hod_reviewed_by_name?: string;
  hod_note?: string;
  admin_reviewed_by_name?: string;
  admin_note?: string;
  created_at: string;
  affected_sessions_count: number;
}

interface TransferItem {
  transfer_id: number;
  session_id: number;
  requesting_teacher_name: string;
  substitute_teacher_name: string;
  reason?: string;
  status: string;
  session_date: string;
  subject_name: string;
  section_name: string;
  start_time: string;
  end_time: string;
}

interface RosterStudent {
  student_id: number;
  user_id: number;
  full_name: string;
  roll_no: string;
  status: "Present" | "Absent" | "Late";
  remarks?: string;
}

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-02");
  const [simulatedTime] = useState<string>("10:15");

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ClassSessionItem | null>(null);
  const [candidates, setCandidates] = useState<CandidateSubstitute[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [transferReason, setTransferReason] = useState("");
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Leave Modal State
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("Casual");
  const [startDate, setStartDate] = useState("2026-11-02");
  const [endDate, setEndDate] = useState("2026-11-03");
  const [leaveReason, setLeaveReason] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Attendance Modal State
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceSession, setAttendanceSession] = useState<ClassSessionItem | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // Workflows Lists
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [activeTab, setActiveTab] = useState<"schedule" | "leaves" | "transfers">("schedule");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchTeacherSchedule = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/timetable/teacher/today?target_date=${selectedDate}&simulated_time=${simulatedTime}`);
      setClasses(res.data);
    } catch (err) {
      console.error("Failed to load teacher schedule", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const [leavesRes, transfersRes] = await Promise.all([
        api.get("/leaves/"),
        api.get("/transfers/"),
      ]);
      setLeaves(leavesRes.data);
      setTransfers(transfersRes.data);
    } catch (err) {
      console.error("Failed to load workflow history", err);
    }
  };

  useEffect(() => {
    fetchTeacherSchedule();
    fetchWorkflows();
  }, [selectedDate]);

  // Open transfer modal for a specific session
  const openTransferModal = async (session: ClassSessionItem) => {
    setSelectedSession(session);
    setSelectedCandidateId(null);
    setTransferReason("");
    setTransferModalOpen(true);
    setLoadingCandidates(true);
    try {
      const res = await api.get(`/transfers/eligible-substitutes?session_id=${session.session_id}`);
      setCandidates(res.data);
      if (res.data.length > 0) {
        setSelectedCandidateId(res.data[0].teacher_id);
      }
    } catch (err) {
      console.error("Failed to fetch candidates", err);
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Open Attendance Modal
  const openAttendanceModal = async (session: ClassSessionItem) => {
    setAttendanceSession(session);
    setAttendanceModalOpen(true);
    setLoadingRoster(true);
    try {
      const res = await api.get(`/attendance/session/${session.session_id}/roster`);
      const mappedRoster = res.data.students.map((st: any) => ({
        student_id: st.student_id,
        user_id: st.user_id,
        full_name: st.full_name,
        roll_no: st.roll_no,
        status: (st.status as "Present" | "Absent" | "Late") || "Present",
        remarks: st.remarks || "",
      }));
      setRoster(mappedRoster);
    } catch (err) {
      console.error("Failed to fetch session roster", err);
      setRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  };

  // Toggle student attendance status
  const handleToggleStatus = (studentId: number, status: "Present" | "Absent" | "Late") => {
    setRoster((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  // Bulk mark all
  const handleBulkMark = (status: "Present" | "Absent") => {
    setRoster((prev) => prev.map((s) => ({ ...s, status })));
  };

  // Submit attendance
  const handleSaveAttendance = async () => {
    if (!attendanceSession) return;
    setSubmittingAttendance(true);
    try {
      const payload = {
        records: roster.map((s) => ({
          student_id: s.student_id,
          status: s.status,
          remarks: s.remarks,
        })),
      };
      await api.post(`/attendance/session/${attendanceSession.session_id}`, payload);
      setFeedback({
        type: "success",
        text: `Attendance saved successfully for ${attendanceSession.subject_name} (${roster.filter((r) => r.status === "Present").length} Present, ${roster.filter((r) => r.status === "Absent").length} Absent).`,
      });
      setAttendanceModalOpen(false);
      fetchTeacherSchedule();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.response?.data?.detail || "Failed to record attendance.",
      });
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // Submit transfer
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !selectedCandidateId) return;
    setSubmittingTransfer(true);
    setFeedback(null);
    try {
      await api.post("/transfers/", {
        session_id: selectedSession.session_id,
        substitute_teacher_id: selectedCandidateId,
        reason: transferReason || "Peer-to-peer schedule adjustment",
      });
      setFeedback({
        type: "success",
        text: `Lecture (${selectedSession.subject_name}) successfully transferred! Instant swap confirmed.`,
      });
      setTransferModalOpen(false);
      fetchTeacherSchedule();
      fetchWorkflows();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.response?.data?.detail || "Transfer failed. Please check continuity rules.",
      });
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Submit leave request
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLeave(true);
    setFeedback(null);
    try {
      await api.post("/leaves/", {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: leaveReason || "Personal Leave",
      });
      setFeedback({
        type: "success",
        text: "Leave application submitted to HOD! You will be notified upon HOD review and Admin approval.",
      });
      setLeaveModalOpen(false);
      fetchWorkflows();
      setActiveTab("leaves");
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.response?.data?.detail || "Failed to submit leave request.",
      });
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Cancel leave request
  const handleCancelLeave = async (leaveId: number) => {
    if (!window.confirm("Are you sure you want to cancel this leave application?")) return;
    try {
      await api.post(`/leaves/${leaveId}/cancel`);
      setFeedback({ type: "success", text: "Leave application cancelled." });
      fetchWorkflows();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.response?.data?.detail || "Failed to cancel leave." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Good Morning, {user?.full_name}! 👋
          </h1>
          <p className="text-sm text-slate-500 font-medium">Faculty · Department of Computer Applications</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-xl border border-blue-200 text-xs font-semibold">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Wed, 28 Oct 2026</span>
        </div>
      </div>

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

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            {classes.length}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Classes</p>
            <p className="text-lg font-bold text-slate-800">{classes.length} Scheduled</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Students</p>
            <p className="text-lg font-bold text-slate-800">120 Enrolled</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transfers</p>
            <p className="text-lg font-bold text-slate-800">{transfers.length} Active</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leave Applications</p>
            <p className="text-lg font-bold text-slate-800">{leaves.length} Filed</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("schedule")}
          className={`pb-3 border-b-2 transition cursor-pointer ${
            activeTab === "schedule"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Today's Teaching Schedule
        </button>
        <button
          onClick={() => setActiveTab("leaves")}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === "leaves"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>My Leave Applications</span>
          {leaves.filter((l) => l.status.startsWith("Pending")).length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {leaves.filter((l) => l.status.startsWith("Pending")).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("transfers")}
          className={`pb-3 border-b-2 transition cursor-pointer ${
            activeTab === "transfers"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Lecture Transfers History ({transfers.length})
        </button>
      </div>

      {/* Tab 1: Today's Schedule */}
      {activeTab === "schedule" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Teaching Schedule</h2>
                <p className="text-xs text-slate-500">Official BCA Semester III Timetable · Real-time attendance roster</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                Continuity Safe (Max 2 Consec)
              </span>
            </div>

            {/* Day Selector Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
              {[
                { label: "Mon, 2 Nov (Today)", value: "2026-11-02" },
                { label: "Tue, 3 Nov", value: "2026-11-03" },
                { label: "Wed, 4 Nov", value: "2026-11-04" },
                { label: "Thu, 5 Nov", value: "2026-11-05" },
                { label: "Fri, 6 Nov", value: "2026-11-06" },
                { label: "Past Week (26-30 Oct)", value: "2026-10-26" },
              ].map((d) => (
                <button
                  key={d.value}
                  onClick={() => setSelectedDate(d.value)}
                  className={`px-3 py-1.5 rounded-xl border transition cursor-pointer shrink-0 ${
                    selectedDate === d.value
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/20"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* DEDICATED CURRENTLY CONDUCTING LECTURE HERO BANNER */}
            {classes.find((c) => c.status === "Ongoing") && (() => {
              const ongoing = classes.find((c) => c.status === "Ongoing")!;
              return (
                <div className="p-4.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/15 border-2 border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="relative flex items-center justify-center">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute" />
                      <div className="w-3 h-3 rounded-full bg-emerald-600 relative" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Active Lecture Now
                        </span>
                        <span className="text-xs font-bold text-emerald-800">
                          {ongoing.start_time} - {ongoing.end_time}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mt-1">
                        {ongoing.subject_name} ({ongoing.subject_code})
                      </h3>
                      <p className="text-xs text-slate-600 font-medium">
                        Room: <span className="font-bold text-slate-800">{ongoing.room_code}</span> · Section: <span className="font-bold text-slate-800">{ongoing.section_name}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openAttendanceModal(ongoing)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Mark Class Attendance</span>
                  </button>
                </div>
              );
            })()}

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading schedule...</div>
            ) : classes.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No classes assigned for this date.</div>
            ) : (
              <div className="space-y-3">
                {classes.map((cls) => {
                  const isUpcoming = cls.status === "Upcoming";
                  const isOngoing = cls.status === "Ongoing";
                  const isCompleted = cls.status === "Completed";
                  return (
                    <div
                      key={cls.session_id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                        isOngoing
                          ? "border-emerald-200 bg-emerald-50/30"
                          : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-semibold text-slate-600 w-28 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{cls.start_time} - {cls.end_time}</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <span>{cls.subject_name}</span>
                            {cls.is_lab && (
                              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                LAB
                              </span>
                            )}
                            {isOngoing && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 animate-pulse">
                                Ongoing
                              </span>
                            )}
                            {isCompleted && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                Completed
                              </span>
                            )}
                            {isUpcoming && (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                Upcoming
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Room {cls.room_code} · Section {cls.section_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => openAttendanceModal(cls)}
                          disabled={isUpcoming}
                          title={isUpcoming ? `Attendance opens when class begins at ${cls.start_time}` : undefined}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                            isUpcoming
                              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
                              : isCompleted
                              ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                              : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs shadow-blue-500/20 cursor-pointer animate-pulse"
                          }`}
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>
                            {isUpcoming
                              ? `Upcoming (${cls.start_time})`
                              : isCompleted
                              ? "Update Attendance"
                              : "Mark Attendance"}
                          </span>
                        </button>
                        <button
                          onClick={() => openTransferModal(cls)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Repeat className="w-3.5 h-3.5 text-blue-600" />
                          <span>Transfer</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Faculty Workflows</span>
              </h2>
              <div className="space-y-2.5">
                <button
                  onClick={() => setLeaveModalOpen(true)}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-800 font-semibold text-xs border border-slate-200/70 transition flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <p className="font-bold">Apply for Leave</p>
                    <p className="text-[11px] text-slate-500 font-normal">Multi-step chain: HOD → Admin Reassignment</p>
                  </div>
                  <span className="text-blue-600 font-bold group-hover:translate-x-1 transition">→</span>
                </button>

                <button
                  onClick={() => {
                    if (classes.length > 0) openTransferModal(classes[0]);
                  }}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-800 font-semibold text-xs border border-slate-200/70 transition flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <p className="font-bold">Transfer a Lecture</p>
                    <p className="text-[11px] text-slate-500 font-normal">Peer-to-peer instant swap with continuity check</p>
                  </div>
                  <span className="text-blue-600 font-bold group-hover:translate-x-1 transition">→</span>
                </button>
              </div>
            </div>

            {/* Quick Rules Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl border border-blue-100 p-5 space-y-2.5 text-xs text-slate-600">
              <h3 className="font-bold text-blue-900 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <span>Scheduling Guidelines</span>
              </h3>
              <p>• <strong>Attendance:</strong> Mark during or immediately after lecture. Updates student risk counters in real-time.</p>
              <p>• <strong>Transfer:</strong> Instant peer handoff. No admin approval needed if substitute is continuity-safe.</p>
              <p>• <strong>Leave:</strong> Requires HOD endorsement followed by Admin approval and substitute assignment.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: My Leave Applications */}
      {activeTab === "leaves" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">My Leave Applications</h2>
              <p className="text-xs text-slate-500">Track application status through HOD review and Admin approval</p>
            </div>
            <button
              onClick={() => setLeaveModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ Apply New Leave</span>
            </button>
          </div>

          {leaves.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">You have not submitted any leave applications yet.</div>
          ) : (
            <div className="space-y-3">
              {leaves.map((lr) => (
                <div
                  key={lr.leave_request_id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-slate-800">{lr.leave_type} Leave</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          lr.status === "Approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : lr.status === "Pending_HOD"
                            ? "bg-amber-100 text-amber-800"
                            : lr.status === "Pending_Admin"
                            ? "bg-blue-100 text-blue-800"
                            : lr.status === "Cancelled"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {lr.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {lr.start_date} to {lr.end_date} · {lr.affected_sessions_count} Lectures Affected
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 italic">"{lr.reason}"</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>
                      HOD Status:{" "}
                      <strong>
                        {lr.hod_reviewed_by_name ? `Reviewed by ${lr.hod_reviewed_by_name}` : "Pending Review"}
                      </strong>
                    </span>
                    <span>
                      Admin Status:{" "}
                      <strong>
                        {lr.admin_reviewed_by_name ? `Approved by ${lr.admin_reviewed_by_name}` : "Pending Admin"}
                      </strong>
                    </span>

                    {lr.status.startsWith("Pending") && (
                      <button
                        onClick={() => handleCancelLeave(lr.leave_request_id)}
                        className="ml-auto text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancel Request</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Transfers History */}
      {activeTab === "transfers" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Transferred Lectures History</h2>
              <p className="text-xs text-slate-500">Record of peer-to-peer lecture swaps and handoffs</p>
            </div>
          </div>

          {transfers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No lecture transfers recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {transfers.map((tr) => (
                <div
                  key={tr.transfer_id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-sm">{tr.subject_name} · Section {tr.section_name}</p>
                    <p className="text-slate-500 font-medium">
                      Date: {tr.session_date} ({tr.start_time} - {tr.end_time})
                    </p>
                    {tr.reason && <p className="text-slate-600 italic text-[11px]">Note: {tr.reason}</p>}
                  </div>
                  <div className="text-right sm:text-right">
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                      Transferred to: {tr.substitute_teacher_name}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">Handoff by: {tr.requesting_teacher_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Mark Attendance Modal */}
      {attendanceModalOpen && attendanceSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                  <span>Mark Class Attendance</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {attendanceSession.subject_name} · Section {attendanceSession.section_name} · Room {attendanceSession.room_code} ({attendanceSession.start_time} - {attendanceSession.end_time})
                </p>
              </div>
              <button
                onClick={() => setAttendanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Bulk Action Bar & Counts */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkMark("Present")}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition cursor-pointer"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkMark("Absent")}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300 transition cursor-pointer"
                >
                  Mark All Absent
                </button>
              </div>

              <div className="flex items-center gap-3 font-semibold text-[11px]">
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Present: {roster.filter((r) => r.status === "Present").length}
                </span>
                <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Absent: {roster.filter((r) => r.status === "Absent").length}
                </span>
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Late: {roster.filter((r) => r.status === "Late").length}
                </span>
              </div>
            </div>

            {/* Student Roster Table */}
            {loadingRoster ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading enrolled students...</div>
            ) : roster.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No students enrolled in this section.</div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3 text-right">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roster.map((st) => (
                      <tr key={st.student_id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-600">{st.roll_no}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{st.full_name}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(st.student_id, "Present")}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                                st.status === "Present"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(st.student_id, "Absent")}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                                st.status === "Absent"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(st.student_id, "Late")}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                                st.status === "Late"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Late
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAttendanceModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAttendance || roster.length === 0}
                onClick={handleSaveAttendance}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
              >
                <Save className="w-4 h-4" />
                <span>{submittingAttendance ? "Saving..." : "Save Attendance"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Transfer Lecture Modal */}
      {transferModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-blue-600" />
                  <span>Transfer Lecture (Peer-to-Peer)</span>
                </h3>
                <p className="text-xs text-slate-500">Instant handoff with automatic workload continuity check</p>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lecture Summary Box */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-blue-900 text-sm">{selectedSession.subject_name}</p>
              <p className="text-slate-600">
                Time: <strong>{selectedSession.start_time} - {selectedSession.end_time}</strong> · Room: {selectedSession.room_code} · Section {selectedSession.section_name}
              </p>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  Select Eligible Substitute Faculty:
                </label>
                {loadingCandidates ? (
                  <div className="py-6 text-center text-slate-400 animate-pulse">Checking eligible substitutes...</div>
                ) : candidates.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                    No available faculty match the slot criteria without causing a double-booking.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {candidates.map((cand) => (
                      <label
                        key={cand.teacher_id}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          selectedCandidateId === cand.teacher_id
                            ? "bg-blue-50 border-blue-500 text-blue-950"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="substitute"
                            checked={selectedCandidateId === cand.teacher_id}
                            onChange={() => setSelectedCandidateId(cand.teacher_id)}
                            className="text-blue-600"
                          />
                          <div>
                            <p className="font-bold text-slate-800">{cand.full_name}</p>
                            <p className="text-[11px] text-slate-500">
                              {cand.designation} · {cand.department_name} ({cand.classes_today} classes today)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {cand.is_continuity_safe ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              Safe Continuity
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              Consecutive Warning
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason / Note for Substitute:</label>
                <textarea
                  rows={2}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Attending external seminar / family emergency"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTransfer || !selectedCandidateId}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{submittingTransfer ? "Transferring..." : "Confirm Instant Transfer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Apply for Leave Modal */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  <span>Apply for Leave (HOD → Admin Chain)</span>
                </h3>
                <p className="text-xs text-slate-500">Requires HOD review followed by Admin substitute reassignment</p>
              </div>
              <button
                onClick={() => setLeaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Leave Type:</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Casual">Casual Leave (CL)</option>
                  <option value="Sick">Sick / Medical Leave (ML)</option>
                  <option value="Earned">Earned Leave (EL)</option>
                  <option value="Duty">On-Duty / Academic (OD)</option>
                  <option value="Other">Other Emergency Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date:</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date:</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Leave:</label>
                <textarea
                  required
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Please state the reason clearly for HOD and Administration"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-purple-900 text-[11px] leading-relaxed">
                ℹ️ <strong>Workflow Path:</strong> When submitted, your leave request is dispatched directly to your HOD. Once approved, the Admin assigns continuity-safe substitutes for your scheduled class sessions.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLeaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-purple-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingLeave ? "Submitting..." : "Submit to HOD"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
