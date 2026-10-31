import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  UserCheck,
  XCircle,
  X,
  Activity,
  Info,
  Building,
} from "lucide-react";
import { TimetableStudio } from "../../components/timetable/TimetableStudio";

interface AdminStats {
  total_students: number;
  total_faculty: number;
  total_departments: number;
  total_shifts: number;
  active_rooms: number;
  active_subjects: number;
  active_programs: number;
  section_health_pct: number;
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
  hod_reviewed_by_name?: string;
  hod_note?: string;
  created_at: string;
  affected_sessions_count: number;
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

interface AffectedSessionWithCandidates {
  session: {
    session_id: number;
    session_date: string;
    subject_id: number;
    subject_code: string;
    subject_name: string;
    section_name: string;
    room_code: string;
    slot_id: number;
    start_time: string;
    end_time: string;
    slot_order: number;
    substitute_teacher_id?: number;
    substitute_teacher_name?: string;
    status: string;
  };
  candidates: CandidateSubstitute[];
}

interface RoomDayStatus {
  day: string;
  date_str: string;
  status: string;
  sessions_count?: number;
  session_details?: string[];
}

interface RoomAvailabilityItem {
  room_code: string;
  room_type: string;
  floor?: string;
  is_primary_lab?: boolean;
  days: RoomDayStatus[];
}

interface ActivityItem {
  id: number;
  title: string;
  description: string;
  category: string;
  timestamp_str: string;
}

export const AdminDashboard: React.FC = () => {
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // System Stats State
  const [stats, setStats] = useState<AdminStats>({
    total_students: 59,
    total_faculty: 9,
    total_departments: 1,
    total_shifts: 2,
    active_rooms: 24,
    active_subjects: 8,
    active_programs: 1,
    section_health_pct: 100,
  });

  // Leave Management State
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveItem | null>(null);
  const [reviewSessions, setReviewSessions] = useState<AffectedSessionWithCandidates[]>([]);
  const [loadingSubstitutes, setLoadingSubstitutes] = useState<boolean>(false);
  const [reassignments, setReassignments] = useState<{ [session_id: number]: number }>({});
  const [adminNote, setAdminNote] = useState<string>("");
  const [submittingDecision, setSubmittingDecision] = useState<boolean>(false);

  // Room Heatmap & Activity State
  const [rooms, setRooms] = useState<RoomAvailabilityItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [roomCategory, setRoomCategory] = useState<"active" | "labs" | "floor2" | "all">("active");

  useEffect(() => {
    fetchStats();
    fetchLeaves();
    fetchReports();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get("/reports/admin/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
    }
  };

  const fetchLeaves = async () => {
    try {
      const res = await api.get("/leaves/");
      setLeaves(res.data);
    } catch (err) {
      console.error("Failed to load leaves", err);
    }
  };

  const fetchReports = async (cat: string = roomCategory) => {
    try {
      const [roomsRes, actRes] = await Promise.all([
        api.get(`/reports/admin/room-availability?category=${cat}`),
        api.get("/reports/recent-activity"),
      ]);
      setRooms(roomsRes.data);
      setActivities(actRes.data);
    } catch (err) {
      console.error("Failed to load reports", err);
    }
  };

  const handleCategoryChange = (cat: "active" | "labs" | "floor2" | "all") => {
    setRoomCategory(cat);
    fetchReports(cat);
  };

  // Leave Management Handlers
  const openReassignmentModal = async (leave: LeaveItem) => {
    setSelectedLeave(leave);
    setLoadingSubstitutes(true);
    setAdminNote(leave.hod_note ? `Endorsed by HOD. Admin approved.` : "");
    try {
      const res = await api.get(`/leaves/${leave.leave_request_id}/substitutes`);
      setReviewSessions(res.data);
      const initialMap: { [key: number]: number } = {};
      res.data.forEach((item: AffectedSessionWithCandidates) => {
        if (item.candidates.length > 0) {
          initialMap[item.session.session_id] = item.candidates[0].teacher_id;
        }
      });
      setReassignments(initialMap);
    } catch (err) {
      console.error("Failed to fetch candidate substitutes", err);
      setReviewSessions([]);
    } finally {
      setLoadingSubstitutes(false);
    }
  };

  const handleApproveLeave = async () => {
    if (!selectedLeave) return;
    setSubmittingDecision(true);
    try {
      const assignmentsPayload = Object.entries(reassignments).map(([sessionId, teacherId]) => ({
        session_id: Number(sessionId),
        substitute_teacher_id: teacherId,
        continuity_override: false,
      }));

      await api.post(`/leaves/${selectedLeave.leave_request_id}/admin-approve`, {
        assignments: assignmentsPayload,
        note: adminNote || "Approved and substitute faculty assigned.",
      });

      setMsg({
        type: "success",
        text: `Leave request for ${selectedLeave.teacher_name} approved! All ${assignmentsPayload.length} affected sessions reassigned.`,
      });
      setSelectedLeave(null);
      fetchLeaves();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err.response?.data?.detail || "Failed to approve leave.",
      });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleDenyLeave = async (leaveId: number) => {
    const note = prompt("Please provide a reason for denying this leave request:");
    if (note === null) return;
    try {
      await api.post(`/leaves/${leaveId}/admin-deny`, { note });
      setMsg({ type: "success", text: "Leave request denied." });
      setSelectedLeave(null);
      fetchLeaves();
    } catch (err: any) {
      setMsg({ type: "error", text: err.response?.data?.detail || "Failed to deny leave." });
    }
  };

  const pendingAdminLeaves = leaves.filter((l) => l.status === "Pending_Admin");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard & Operations</h1>
          <p className="text-sm text-slate-500 font-medium">
            Department of Computer Applications · BCA Semester III Management
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-xl border border-blue-200 text-xs font-semibold">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Active Academic Year: 2026-27</span>
        </div>
      </div>

      {/* Message Alert */}
      {msg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
            msg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : msg.type === "info"
              ? "bg-blue-50 border-blue-200 text-blue-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : msg.type === "info" ? (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* System Stats Cards (Real Database Values) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
            {stats.total_students}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Students</p>
            <p className="text-lg font-bold text-slate-800">{stats.total_students} Enrolled</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            {stats.total_faculty}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Faculty</p>
            <p className="text-lg font-bold text-slate-800">{stats.total_faculty} Members</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            {stats.active_rooms}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Rooms</p>
            <p className="text-lg font-bold text-slate-800">G01-G08, 101-208</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
            {stats.active_subjects}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Subjects</p>
            <p className="text-lg font-bold text-slate-800">Theory & Labs</p>
          </div>
        </div>
      </div>

      {/* TIMETABLE ENGINE & CONSTRAINT STUDIO (Redesigned Apple-Style 5-Stage Studio) */}
      <TimetableStudio />

      {/* Leave Reassignment & Approval Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-purple-600" />
              <span>Leave Approval & Substitute Reassignment Desk</span>
            </h2>
            <p className="text-xs text-slate-500">
              Final approval authority: assign continuity-safe substitutes for scheduled classes
            </p>
          </div>
          <span className="text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1 rounded-xl">
            {pendingAdminLeaves.length} Forwarded by HOD
          </span>
        </div>

        {pendingAdminLeaves.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">
            No pending leave requests awaiting admin substitute reassignment.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingAdminLeaves.map((lr) => (
              <div
                key={lr.leave_request_id}
                className="p-5 rounded-2xl border border-purple-200/70 bg-gradient-to-r from-purple-50/30 via-white to-slate-50/30 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span>{lr.teacher_name}</span>
                      <span className="text-xs text-slate-500 font-normal">({lr.department_name})</span>
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        {lr.leave_type} Leave
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Dates: <strong>{lr.start_date}</strong> to <strong>{lr.end_date}</strong> · {lr.affected_sessions_count} Lectures affected
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 self-start sm:self-auto">
                    Forwarded by HOD: {lr.hod_reviewed_by_name || "Department HOD"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/80 p-3 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-slate-800">Faculty Reason:</span> "{lr.reason}"
                  </div>
                  <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-blue-900">
                    <span className="font-bold">HOD Recommendation:</span> "{lr.hod_note || "Recommended for approval."}"
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleDenyLeave(lr.leave_request_id)}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Deny Leave</span>
                  </button>
                  <button
                    onClick={() => openReassignmentModal(lr)}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-purple-500/20"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Review Sessions & Assign Substitutes</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Row: Room Availability Heatmap & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span>Room Availability & Utilization</span>
              </h2>
              <p className="text-xs text-slate-500">
                Academic Week: Mon 2 Nov – Fri 6 Nov 2026 · Real-time schedule occupancy
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Occupied
              </span>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {[
              { id: "active", label: "Active Wing (Labs + Floor 2)" },
              { id: "labs", label: "Approved Labs (107, 103, G01, G03)" },
              { id: "floor2", label: "Floor 2 Theory (201–208)" },
              { id: "all", label: "All 24 Rooms" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleCategoryChange(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl border font-semibold transition cursor-pointer ${
                  roomCategory === tab.id
                    ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Room & Floor</th>
                  {rooms[0]?.days.map((d) => (
                    <th key={d.day} className="py-2.5 px-3 text-center">
                      {d.day}{" "}
                      <span className="block text-[10px] font-normal text-slate-400">{d.date_str}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((rm) => (
                  <tr key={rm.room_code} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">Room {rm.room_code}</span>
                        {rm.is_primary_lab ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            Primary Lab
                          </span>
                        ) : rm.room_type === "Lab" ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            Lab
                          </span>
                        ) : rm.floor?.includes("Floor 2") ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            Floor 2 Theory
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-normal">
                            {rm.room_type}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{rm.floor}</span>
                    </td>
                    {rm.days.map((d, i) => (
                      <td key={i} className="py-2.5 px-3 text-center">
                        <span
                          title={
                            d.session_details && d.session_details.length > 0
                              ? d.session_details.join("\n")
                              : d.status === "Occupied"
                              ? "Occupied by scheduled lecture"
                              : "No scheduled lectures. Available."
                          }
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg inline-block cursor-help transition ${
                            d.status === "Available"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs"
                          }`}
                        >
                          {d.status === "Occupied"
                            ? `Occupied (${d.sessions_count || 1})`
                            : "Available"}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent System Activity Feed */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Recent Activity Feed</span>
            </h2>
          </div>

          <div className="space-y-3">
            {activities.map((act) => (
              <div key={act.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{act.title}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{act.timestamp_str}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{act.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* REASSIGNMENT MODAL */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                  <span>Assign Substitute Faculty for Leave</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Faculty: <strong>{selectedLeave.teacher_name}</strong> · {selectedLeave.start_date} to {selectedLeave.end_date}
                </p>
              </div>
              <button
                onClick={() => setSelectedLeave(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingSubstitutes ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Analyzing faculty schedules & continuity constraints...
              </div>
            ) : reviewSessions.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                No active class sessions found in this date range. You can approve directly.
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-700">
                  Select a substitute teacher for each affected lecture ({reviewSessions.length} sessions):
                </p>

                <div className="space-y-3">
                  {reviewSessions.map(({ session, candidates }) => (
                    <div
                      key={session.session_id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {session.subject_name} ({session.subject_code})
                        </p>
                        <p className="text-slate-500">
                          Date: <strong>{session.session_date}</strong> · Time: <strong>{session.start_time} - {session.end_time}</strong> · Room: {session.room_code} · Section {session.section_name}
                        </p>
                      </div>

                      <div className="pt-2">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Assigned Substitute Faculty:
                        </label>
                        {candidates.length === 0 ? (
                          <p className="text-rose-600 text-xs italic">
                            No faculty free during this slot. An administrative override is required.
                          </p>
                        ) : (
                          <select
                            value={reassignments[session.session_id] || ""}
                            onChange={(e) =>
                              setReassignments({
                                ...reassignments,
                                [session.session_id]: Number(e.target.value),
                              })
                            }
                            className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-purple-500 font-medium"
                          >
                            {candidates.map((cand) => (
                              <option key={cand.teacher_id} value={cand.teacher_id}>
                                {cand.full_name} ({cand.department_name}) — {cand.classes_today} classes today —{" "}
                                {cand.is_continuity_safe ? "✅ Continuity Safe" : "⚠️ Warning: >2 consecutive"}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1">Admin Approval Remarks:</label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Approved. Substitutes notified."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-purple-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingDecision}
                onClick={handleApproveLeave}
                className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-purple-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submittingDecision ? "Approving..." : "Approve Leave & Reassign Sessions"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
