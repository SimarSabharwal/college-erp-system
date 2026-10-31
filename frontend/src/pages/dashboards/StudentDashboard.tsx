import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import {
  Calendar,
  Clock,
  BookOpen,
  FileCheck,
  CheckCircle2,
  ChevronRight,
  X,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface ClassSessionItem {
  session_id: number;
  section_name: string;
  subject_code: string;
  subject_name: string;
  teacher_name: string;
  room_code: string;
  start_time: string;
  end_time: string;
  status: string;
  is_lab: boolean;
  can_mark_attendance?: boolean;
  my_attendance_status?: "Present" | "Absent" | "Late" | null;
  my_remarks?: string | null;
}

interface TimetableSlotItem {
  detail_id: number;
  subject_code: string;
  subject_name: string;
  teacher_name: string;
  room_code: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_order: number;
  global_order: number;
  is_lab: boolean;
}

interface SubjectAttendanceCard {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  subject_type: string;
  is_lab: boolean;
  total_classes_held: number;
  attended_classes: number;
  absent_classes: number;
  late_classes: number;
  percentage: number;
  status: "Critical" | "At Risk" | "Safe";
  status_color: string;
  margin_note: string;
}

interface AttendanceDashboardData {
  student_id: number;
  roll_no: string;
  full_name: string;
  semester_no: number;
  total_held: number;
  total_attended: number;
  total_absent: number;
  total_late: number;
  overall_percentage: number;
  overall_status: string;
  subject_cards: SubjectAttendanceCard[];
}

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassSessionItem[]>([]);
  const [weekGrid, setWeekGrid] = useState<TimetableSlotItem[]>([]);
  const [showFullTimetable, setShowFullTimetable] = useState(false);
  const [loading, setLoading] = useState(true);

  // Live Real-Time Date & Clock
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setNow(new Date());
    }, 1000); // 1-second live ticking clock
    return () => clearInterval(clockTimer);
  }, []);

  const todayStr = now.toLocaleDateString("en-CA"); // e.g. "2026-10-31"
  const currentTimeStr = now.toTimeString().slice(0, 5); // e.g. "17:05"

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Attendance State
  const [attendance, setAttendance] = useState<AttendanceDashboardData | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const isSelectedToday = selectedDate === todayStr;
      const timeParam = isSelectedToday ? currentTimeStr : (selectedDate === "2026-11-02" ? "10:15" : "18:00");
      const [todayRes, weekRes] = await Promise.all([
        api.get(`/timetable/student/today?target_date=${selectedDate}&simulated_time=${timeParam}`),
        api.get(`/timetable/section/${user?.section_id || 1}/week`),
      ]);
      setClasses(todayRes.data);
      setWeekGrid(weekRes.data);
    } catch (err) {
      console.error("Error loading timetable", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await api.get("/attendance/me/dashboard");
      setAttendance(res.data);
    } catch (err) {
      console.error("Error loading attendance dashboard", err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    fetchAttendance();
  }, [user, selectedDate]);

  // Poll attendance every 4 seconds to reflect teacher updates in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAttendance();
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const ongoingClass = classes.find((c) => c.status === "Ongoing");

  // Dynamic day selector tabs including live today and current academic week
  const getDynamicScheduleDays = () => {
    const tabs = [
      {
        label: `Today (${now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}) · Live`,
        value: todayStr,
        isLive: true,
      },
      { label: "Mon, 2 Nov", value: "2026-11-02", isLive: false },
      { label: "Tue, 3 Nov", value: "2026-11-03", isLive: false },
      { label: "Wed, 4 Nov", value: "2026-11-04", isLive: false },
      { label: "Thu, 5 Nov", value: "2026-11-05", isLive: false },
      { label: "Fri, 6 Nov", value: "2026-11-06", isLive: false },
    ];
    return tabs;
  };

  const scheduleDays = getDynamicScheduleDays();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="space-y-6">
      {/* Greeting Banner with Live Campus Real-Time Clock */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Good {now.getHours() < 12 ? "Morning" : now.getHours() < 17 ? "Afternoon" : "Evening"}, {user?.full_name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            BCA · Sem 3 · Roll No: {attendance?.roll_no || "0251BCA022"} · Section III (Morning Batch)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Real-Time Campus Clock */}
          <div className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-emerald-300">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-200">
              {now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Viewing: {selectedDate === todayStr ? "Today (Live)" : selectedDate}</span>
          </div>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base ${
              (attendance?.overall_percentage ?? 75) >= 75
                ? "bg-emerald-50 text-emerald-600"
                : (attendance?.overall_percentage ?? 75) >= 60
                ? "bg-amber-50 text-amber-600"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            {attendance ? `${Math.round(attendance.overall_percentage)}%` : "—"}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance</p>
            <p className="text-lg font-bold text-slate-800">
              {attendance ? `${attendance.overall_percentage}%` : "Loading..."}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subjects</p>
            <p className="text-lg font-bold text-slate-800">5 Enrolled</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assignments</p>
            <p className="text-lg font-bold text-slate-800">2 Pending</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fee Due</p>
            <p className="text-lg font-bold text-slate-800">₹0 Due</p>
          </div>
        </div>
      </div>

      {/* TWO-TIER ATTENDANCE WIDGET */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Academic Attendance · Semester 3</span>
            </h2>
            <p className="text-xs text-slate-500">
              Sorted by risk priority · Minimum mandatory criteria: 75% overall
            </p>
          </div>
          {attendance && (
            <span
              className={`text-xs font-bold px-3 py-1 rounded-xl border self-start sm:self-auto ${
                attendance.overall_status === "Safe"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : attendance.overall_status === "At Risk"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              Overall Status: {attendance.overall_status}
            </span>
          )}
        </div>

        {/* TIER 1: SEMESTER SUMMARY BANNER */}
        {loadingAttendance ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Loading attendance metrics...</div>
        ) : attendance ? (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50/60 border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Radial Score Pill */}
              <div
                className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-bold shadow-sm ${
                  attendance.overall_percentage >= 75
                    ? "bg-emerald-600 text-white"
                    : attendance.overall_percentage >= 60
                    ? "bg-amber-500 text-white"
                    : "bg-rose-600 text-white"
                }`}
              >
                <span className="text-2xl tracking-tight">{attendance.overall_percentage}%</span>
                <span className="text-[10px] uppercase font-semibold opacity-90">Overall</span>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-sm">Semester 3 Attendance Standing</h3>
                <p className="text-xs text-slate-600">
                  {attendance.overall_percentage >= 75
                    ? "🌟 Congratulations! You are comfortably above the 75% university eligibility requirement."
                    : attendance.overall_percentage >= 60
                    ? "⚠️ Caution: Your attendance is between 60% and 75%. Please attend upcoming classes to clear criteria."
                    : "🚨 Critical Alert: Your attendance is below 60%. You are at risk of exam debarment without immediate recovery."}
                </p>
                <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                  Roll No: <strong>{attendance.roll_no}</strong> · Student: <strong>{attendance.full_name}</strong>
                </p>
              </div>
            </div>

            {/* Attendance Counts */}
            <div className="grid grid-cols-3 gap-4 text-center border-t md:border-t-0 md:border-l border-slate-200/80 pt-4 md:pt-0 md:pl-6 shrink-0">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Held</p>
                <p className="text-lg font-bold text-slate-800">{attendance.total_held}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Attended</p>
                <p className="text-lg font-bold text-emerald-600">{attendance.total_attended}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Absent</p>
                <p className="text-lg font-bold text-rose-600">{attendance.total_absent}</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* TIER 2: SUBJECT RISK CARDS (Critical First) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Subject Attendance Breakdown (Critical Priority First)
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Thresholds: 🔴 &lt;60% Critical · ⚠️ 60–74% At Risk · ✅ ≥75% Safe
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {attendance?.subject_cards.map((card) => {
              const isCritical = card.status === "Critical";
              const isAtRisk = card.status === "At Risk";

              return (
                <div
                  key={card.subject_id}
                  className={`p-4 rounded-2xl border transition hover:shadow-xs flex flex-col justify-between space-y-3 ${
                    isCritical
                      ? "bg-rose-50/30 border-rose-200/80"
                      : isAtRisk
                      ? "bg-amber-50/30 border-amber-200/80"
                      : "bg-slate-50/50 border-slate-200/80"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {card.subject_code}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm leading-snug">
                          {card.subject_name}
                        </h4>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                          isCritical
                            ? "bg-rose-100 text-rose-800"
                            : isAtRisk
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isCritical ? (
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                        ) : isAtRisk ? (
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                        ) : (
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                        )}
                        <span>{card.status}</span>
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs pt-1">
                      <span className="font-bold text-slate-700 text-base">
                        {card.total_classes_held > 0 ? `${card.percentage}%` : "—"}
                      </span>
                      <span className="text-slate-500 text-[11px] font-medium">
                        {card.attended_classes} / {card.total_classes_held} Lectures
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCritical
                            ? "bg-rose-500"
                            : isAtRisk
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(card.percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Margin Guidance Note */}
                  <div
                    className={`p-2 rounded-xl text-[11px] font-medium border ${
                      isCritical
                        ? "bg-rose-50 text-rose-900 border-rose-100"
                        : isAtRisk
                        ? "bg-amber-50 text-amber-900 border-amber-100"
                        : "bg-emerald-50 text-emerald-900 border-emerald-100"
                    }`}
                  >
                    {card.margin_note}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Classes & Mini Timetable Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Class Schedule</h2>
              <p className="text-xs text-slate-500">
                Official BCA Semester III Timetable · Real-time attendance link
              </p>
            </div>
            <button
              onClick={() => setShowFullTimetable(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition self-start sm:self-auto"
            >
              <span>View Full Week</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Day Selector Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
            {scheduleDays.map((d) => (
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

          {/* DEDICATED CURRENTLY GOING ON HERO CARD */}
          {ongoingClass && (
            <div className="p-4.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/15 border-2 border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="relative flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute" />
                  <div className="w-3 h-3 rounded-full bg-emerald-600 relative" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Currently Going On
                    </span>
                    <span className="text-xs font-bold text-emerald-800">
                      {ongoingClass.start_time} - {ongoingClass.end_time}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    {ongoingClass.subject_name} ({ongoingClass.subject_code})
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Faculty: <span className="font-bold text-slate-800">{ongoingClass.teacher_name}</span> · Room: <span className="font-bold text-slate-800">{ongoingClass.room_code}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {ongoingClass.my_attendance_status ? (
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-xs ${
                      ongoingClass.my_attendance_status === "Present"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : ongoingClass.my_attendance_status === "Absent"
                        ? "bg-rose-100 text-rose-900 border-rose-300"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    {ongoingClass.my_attendance_status === "Present" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>Marked: {ongoingClass.my_attendance_status}</span>
                  </span>
                ) : (
                  <div className="text-xs font-bold text-emerald-900 bg-emerald-100/90 px-3.5 py-2 rounded-xl border border-emerald-300 shadow-xs">
                    Active Lecture In Session
                  </div>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading classes...</div>
          ) : classes.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No lectures scheduled for this date.</div>
          ) : (
            <div className="space-y-3">
              {classes.map((cls, idx) => {
                return (
                  <div
                    key={cls.session_id || idx}
                    className={`p-4 rounded-xl border transition flex items-center justify-between ${
                      cls.my_attendance_status === "Present"
                        ? "border-emerald-200/80 bg-emerald-50/20"
                        : cls.my_attendance_status === "Absent"
                        ? "border-rose-200/80 bg-rose-50/20"
                        : cls.status === "Ongoing"
                        ? "border-emerald-200 bg-emerald-50/30"
                        : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-semibold text-slate-600 w-28 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
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
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          <span>Room {cls.room_code} · {cls.teacher_name}</span>
                          {cls.my_remarks && (
                            <span className="text-[11px] text-slate-400 italic">· "{cls.my_remarks}"</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* ATTENDANCE STATUS PILL (What student was marked) */}
                    <div>
                      {cls.my_attendance_status === "Present" ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1.5 shadow-xs">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Present</span>
                        </span>
                      ) : cls.my_attendance_status === "Absent" ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full border bg-rose-100 text-rose-800 border-rose-300 flex items-center gap-1.5 shadow-xs">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Absent</span>
                        </span>
                      ) : cls.my_attendance_status === "Late" ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full border bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1.5 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Late</span>
                        </span>
                      ) : cls.status === "Ongoing" ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1.5 animate-pulse shadow-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>In Session</span>
                        </span>
                      ) : cls.status === "Completed" ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-slate-100 text-slate-500 border-slate-200">
                          <span>Not Marked</span>
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
                          <span>Upcoming</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side: Quick Actions & Campus Life */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-800">Student Portal Shortcuts</h2>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                onClick={() => setShowFullTimetable(true)}
                className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 border border-slate-200/70 transition cursor-pointer"
              >
                My Timetable
              </button>
              <button
                onClick={() => window.scrollTo({ top: 180, behavior: "smooth" })}
                className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 border border-slate-200/70 transition cursor-pointer"
              >
                Attendance Stats
              </button>
              <button className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 border border-slate-200/70 transition">
                Submit Task
              </button>
              <button className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 border border-slate-200/70 transition">
                Campus Notices
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Week Timetable Modal */}
      {showFullTimetable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Weekly Timetable Grid</h3>
                <p className="text-xs text-slate-500">BCA Sem 3 · Conflict-free master schedule</p>
              </div>
              <button
                onClick={() => setShowFullTimetable(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Slot / Time</th>
                    {days.map((d) => (
                      <th key={d} className="py-2.5 px-3">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[1, 2, 3, 4].map((slotOrder) => (
                    <tr key={slotOrder}>
                      <td className="py-3 px-3 font-semibold text-slate-500 whitespace-nowrap">
                        {slotOrder === 1 && "Slot 1 (09:05 - 10:10)"}
                        {slotOrder === 2 && "Slot 2 (10:15 - 11:20)"}
                        {slotOrder === 3 && "Slot 3 (11:35 - 12:40)"}
                        {slotOrder === 4 && "Slot 4 (12:45 - 13:50)"}
                      </td>
                      {days.map((d) => {
                        const item = weekGrid.find(
                          (w) => w.day_of_week === d && w.slot_order === slotOrder
                        );
                        return (
                          <td key={d} className="py-3 px-3">
                            {item ? (
                              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 space-y-1">
                                <p className="font-bold text-blue-900">{item.subject_code}</p>
                                <p className="text-[10px] text-slate-600 truncate">{item.subject_name}</p>
                                <p className="text-[10px] text-slate-400">{item.room_code} · {item.teacher_name}</p>
                              </div>
                            ) : (
                              <span className="text-slate-300 italic">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
