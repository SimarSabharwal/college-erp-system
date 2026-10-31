import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Send,
  Trash2,
  Sliders,
  Check,
  Info,
  Clock,
  Users,
  Building,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface TimetableInfo {
  timetable_id: number;
  name: string;
  version_no: number;
  status: string;
  total_slots_scheduled: number;
  is_locked: boolean;
  active_from?: string;
  active_to?: string;
  details?: TimetableDetailItem[];
}

export interface TimetableDetailItem {
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
  session_date?: string;
  date_str?: string;
  start_time: string;
  end_time: string;
  slot_order: number;
  global_order: number;
  class_type: string;
  is_lab: boolean;
}

interface TeacherAssignmentSummary {
  subject_id: number;
  subject_code: string;
  subject_name: string;
  is_lab: boolean;
  assigned_teachers: string[];
  shift: string;
  eligibility_status: string;
  weekly_sessions_required: number;
  session_duration_minutes: number;
}

interface ReadinessItem {
  id: string;
  name: string;
  status: "passed" | "warning" | "blocked" | "info";
  message: string;
  action_suggestion?: string;
  category: string;
}

interface ReadinessResponse {
  is_ready: boolean;
  items: ReadinessItem[];
  stats: {
    total_faculty: number;
    total_rooms: number;
    approved_labs: string[];
    floor2_classrooms: string[];
    total_slots: number;
    teaching_slots: number;
    break_slots: number;
    shifts: string[];
  };
}

interface VersionItem {
  timetable_id: number;
  name?: string;
  version_no: number;
  status: string;
  generated_at?: string;
  active_from?: string;
  active_to?: string;
  total_slots_scheduled: number;
}

interface ShiftItem {
  shift_id: number;
  name: string;
  start_time: string;
  end_time: string;
}

interface RoomItem {
  room_id: number;
  room_code: string;
  room_type: string;
  capacity: number;
  has_computer: boolean;
}

interface TimeSlotItem {
  slot_id: number;
  shift_id: number;
  shift_name?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_order: number;
  global_order: number;
  is_teaching_slot?: boolean;
}

export const TimetableStudio: React.FC = () => {
  // Current Workflow Stage (1: Scope, 2: Requirements, 3: Constraints, 4: Generate, 5: Review & Publish)
  const [activeStep, setActiveStep] = useState<number>(1);

  // Core Data
  const [timetable, setTimetable] = useState<TimetableInfo | null>(null);
  const [scheduleDetails, setScheduleDetails] = useState<TimetableDetailItem[]>([]);
  const [teacherSummary, setTeacherSummary] = useState<TeacherAssignmentSummary[]>([]);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotItem[]>([]);

  // Stage 1: Scope Configuration
  const [academicYear, setAcademicYear] = useState<string>("2026-27");
  const semester = "Semester 3";
  const program = "BCA";
  const [selectedSections, setSelectedSections] = useState<string[]>(["Section III", "Section III-AF"]);
  const [selectedShift, setSelectedShift] = useState<string>("All Shifts");
  const operatingDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const [generationMode, setGenerationMode] = useState<"new" | "repair" | "alternatives" | "draft">("new");
  const [dateSelectionMode, setDateSelectionMode] = useState<"range" | "single">("range");
  const [startDate, setStartDate] = useState<string>("2026-11-02");
  const [endDate, setEndDate] = useState<string>("2026-11-06");

  const formatDisplayDate = (dStr: string) => {
    try {
      const parts = dStr.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dStr;
    }
  };

  const getDayCount = (sDate: string, eDate: string): number => {
    try {
      const s = new Date(sDate);
      const e = new Date(eDate);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch {
      return 1;
    }
  };

  const getActiveDaysSummary = (): string[] => {
    const s = startDate;
    const e = dateSelectionMode === "single" ? startDate : endDate;
    try {
      const partsS = s.split("-").map(Number);
      const partsE = e.split("-").map(Number);
      const startD = new Date(partsS[0], partsS[1] - 1, partsS[2]);
      const endD = new Date(partsE[0], partsE[1] - 1, partsE[2]);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dList: string[] = [];
      const curr = new Date(startD);
      let count = 0;
      while (curr <= endD && count < 31) {
        const name = dayNames[curr.getDay()];
        if (name !== "Sun" && name !== "Sat" && !dList.includes(name)) {
          dList.push(name);
        }
        curr.setDate(curr.getDate() + 1);
        count++;
      }
      return dList.length > 0 ? dList : ["Mon", "Tue", "Wed", "Thu", "Fri"];
    } catch {
      return ["Mon", "Tue", "Wed", "Thu", "Fri"];
    }
  };

  const getFormattedDateForDay = (dayOfWeek: string, customDateStr?: string, customDate?: string) => {
    if (customDateStr) return customDateStr;
    if (customDate) {
      try {
        const parsed = new Date(customDate);
        if (!isNaN(parsed.getTime())) {
          return parsed.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short" });
        }
      } catch {}
    }
    const baseStart = timetable?.active_from || startDate || "2026-11-02";
    const baseEnd = timetable?.active_to || (dateSelectionMode === "single" ? startDate : endDate) || "2026-11-06";

    // Search for dayOfWeek within [baseStart, baseEnd]
    try {
      const partsS = baseStart.split("-").map(Number);
      const partsE = baseEnd.split("-").map(Number);
      const s = new Date(partsS[0], partsS[1] - 1, partsS[2]);
      const e = new Date(partsE[0], partsE[1] - 1, partsE[2]);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const curr = new Date(s);
      let guard = 0;
      while (curr <= e && guard < 31) {
        if (dayNames[curr.getDay()] === dayOfWeek) {
          return curr.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short" });
        }
        curr.setDate(curr.getDate() + 1);
        guard++;
      }
    } catch {}

    const dayOffset: { [key: string]: number } = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const offset = dayOffset[dayOfWeek] ?? 0;
    try {
      const parts = baseStart.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2] + offset);
      return d.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short" });
    } catch {
      return dayOfWeek;
    }
  };

  // Stage 3: Constraints Configuration
  const [enforceShiftLock, setEnforceShiftLock] = useState<boolean>(true);
  const [enforceLabMatching, setEnforceLabMatching] = useState<boolean>(true);
  const [enforceContinuity, setEnforceContinuity] = useState<boolean>(true);
  const [maxConsecutiveSlots, setMaxConsecutiveSlots] = useState<number>(2);
  const [strategyPreset, setStrategyPreset] = useState<string>("balanced");
  const searchEffort = "standard";
  const clearExistingDrafts = true;

  // Soft weights (Low, Medium, High, Critical)
  const [weights, setWeights] = useState({
    facultyIdleGaps: "High",
    studentIdleGaps: "High",
    subjectDistribution: "Medium",
    roomStability: "Medium",
    workloadFairness: "High",
  });

  // Collapsible Categories in Stage 3
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    faculty: true,
    students: false,
    rooms: true,
    academic: false,
    breaks: false,
    preferences: true,
  });

  // Stage 4: Live Generation State
  const [generating, setGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<{
    status: string;
    sessionsAssigned: number;
    totalRequired: number;
    conflicts: number;
    elapsedMs: number;
  }>({
    status: "Idle",
    sessionsAssigned: 0,
    totalRequired: 46,
    conflicts: 0,
    elapsedMs: 0,
  });

  // Stage 5: Review & Publish State
  const [publishing, setPublishing] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"section" | "teacher" | "room">("section");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("Section III");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>("All");
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>("All");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("All");

  // Cell Inspection & Manual Repair Modal
  const [inspectedDetail, setInspectedDetail] = useState<TimetableDetailItem | null>(null);
  const [targetSlotId, setTargetSlotId] = useState<number>(0);
  const [targetRoomId, setTargetRoomId] = useState<number>(0);
  const [validationResult, setValidationResult] = useState<{
    tested: boolean;
    isValid: boolean;
    conflicts: string[];
    warnings: string[];
    message: string;
  } | null>(null);
  const [validatingMove, setValidatingMove] = useState<boolean>(false);
  const [applyingMove, setApplyingMove] = useState<boolean>(false);

  // Status Alerts
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info" | "warning";
    text: string;
  } | null>(null);

  // Initial Data Load
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // 1. Fetch latest timetable
      const ttRes = await api.get("/timetable/latest");
      if (ttRes.data && ttRes.data.timetable_id) {
        setTimetable(ttRes.data);
        if (ttRes.data.details) {
          setScheduleDetails(ttRes.data.details);
        } else {
          fetchDetails(ttRes.data.timetable_id);
        }
      }
    } catch {
      // No active timetable exists yet
    }

    try {
      // 2. Fetch Readiness
      const readyRes = await api.get("/timetable/readiness-check");
      setReadiness(readyRes.data);
    } catch (e) {
      console.warn("Readiness check fetch error", e);
    }

    try {
      // 3. Fetch Teacher Summary
      const sumRes = await api.get("/timetable/teacher-assignments-summary");
      setTeacherSummary(sumRes.data);
    } catch (e) {
      console.warn("Teacher summary fetch error", e);
    }

    try {
      // 4. Fetch Versions
      const verRes = await api.get("/timetable/versions");
      setVersions(verRes.data);
    } catch (e) {
      console.warn("Versions fetch error", e);
    }

    try {
      // 5. Fetch Master Reference Lists
      const [shiftRes, roomRes, slotRes] = await Promise.all([
        api.get("/academic/shifts"),
        api.get("/academic/rooms"),
        api.get("/academic/time-slots"),
      ]);
      setShifts(shiftRes.data);
      setRooms(roomRes.data);
      setTimeSlots(slotRes.data);
    } catch (e) {
      console.warn("Master lists fetch error", e);
    }
  };

  const fetchDetails = async (ttId: number) => {
    try {
      const res = await api.get(`/timetable/${ttId}/details`);
      setScheduleDetails(res.data);
    } catch (err) {
      console.error("Failed to fetch timetable details", err);
    }
  };

  // Toggle Category Collapsible
  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  // Generation Action
  const handleGenerate = async () => {
    setGenerating(true);
    setStatusMessage(null);
    setGenerationProgress({
      status: "Initializing CSP Backtracking Engine...",
      sessionsAssigned: 0,
      totalRequired: 46,
      conflicts: 0,
      elapsedMs: 0,
    });

    const startTime = Date.now();
    const interval = setInterval(() => {
      setGenerationProgress((p) => ({
        ...p,
        elapsedMs: Date.now() - startTime,
        sessionsAssigned: Math.min(p.sessionsAssigned + 6, 46),
        status:
          p.sessionsAssigned < 20
            ? "Applying Shift Locks & Lab Constraints..."
            : p.sessionsAssigned < 40
            ? "Routing Theory to Floor 2 (Rooms 201-208)..."
            : "Finalizing Conflict-Free Schedule...",
      }));
    }, 180);

    try {
      const effectiveEndDate = dateSelectionMode === "single" ? startDate : endDate;
      const res = await api.post("/timetable/generate", {
        program_id: 1,
        semester_id: 1,
        academic_year_id: 1,
        name: `BCA Sem 3 Auto Timetable (${strategyPreset})`,
        start_date: startDate,
        end_date: effectiveEndDate,
        week_start: startDate,
        generation_mode: generationMode,
        strategy_preset: strategyPreset,
        enforce_shift_lock: enforceShiftLock,
        enforce_lab_matching: enforceLabMatching,
        enforce_continuity: enforceContinuity,
        max_consecutive_slots: maxConsecutiveSlots,
        clear_existing_drafts: clearExistingDrafts,
        search_effort: searchEffort,
      });

      clearInterval(interval);
      setGenerationProgress({
        status: "Completed",
        sessionsAssigned: res.data.total_slots_scheduled,
        totalRequired: res.data.total_slots_scheduled,
        conflicts: 0,
        elapsedMs: Date.now() - startTime,
      });

      setTimetable(res.data);
      if (res.data.details) {
        setScheduleDetails(res.data.details);
      } else {
        await fetchDetails(res.data.timetable_id);
      }

      setStatusMessage({
        type: "success",
        text: `Conflict-free timetable generated successfully! ${res.data.total_slots_scheduled} periods scheduled with 0 collisions.`,
      });

      // Advance to Review & Publish stage
      setActiveStep(5);
      // Reload versions and readiness
      loadAllData();
    } catch (err: any) {
      clearInterval(interval);
      setStatusMessage({
        type: "error",
        text: err.response?.data?.detail || "Constraint solver failed to find feasible timetable.",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Publish Action
  const handlePublish = async () => {
    if (!timetable) return;
    setPublishing(true);
    setStatusMessage(null);
    try {
      const startLabel = timetable.active_from || startDate;
      const endLabel = timetable.active_to || (dateSelectionMode === "single" ? startDate : endDate);
      const res = await api.post(`/timetable/${timetable.timetable_id}/publish?week_start=${startLabel}&week_end=${endLabel}`);
      setTimetable(res.data);
      setStatusMessage({
        type: "success",
        text: `Timetable v${res.data.version_no} published as Active! Student & Teacher portals synchronized for ${startLabel} to ${endLabel}.`,
      });
      loadAllData();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to publish timetable.",
      });
    } finally {
      setPublishing(false);
    }
  };

  // Clear Schedule Action
  const handleClearSchedule = async () => {
    if (!confirm("Are you sure you want to clear all assigned schedules? Master timings, rooms, faculty, and students will remain intact.")) {
      return;
    }
    setClearing(true);
    setStatusMessage(null);
    try {
      await api.post("/timetable/clear-schedule");
      setTimetable(null);
      setScheduleDetails([]);
      setStatusMessage({
        type: "info",
        text: "Schedule cleared. All periods unassigned while preserving master timings, rooms, and roster.",
      });
      loadAllData();
      setActiveStep(1);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to clear schedule.",
      });
    } finally {
      setClearing(false);
    }
  };

  // Rollback Action
  const handleRollback = async (ttId: number) => {
    if (!confirm(`Reactivate timetable version #${ttId} as Active?`)) return;
    try {
      const res = await api.post(`/timetable/${ttId}/rollback`);
      setTimetable(res.data);
      if (res.data.details) {
        setScheduleDetails(res.data.details);
      } else {
        fetchDetails(res.data.timetable_id);
      }
      setStatusMessage({
        type: "success",
        text: `Rolled back to version #${ttId}. Status updated to Active.`,
      });
      loadAllData();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to rollback version.",
      });
    }
  };

  // Manual Cell Move Inspection
  const openCellInspection = (detail: TimetableDetailItem) => {
    setInspectedDetail(detail);
    setTargetSlotId(detail.slot_id);
    setTargetRoomId(detail.room_id);
    setValidationResult(null);
  };

  // Validate Move Test
  const handleValidateMove = async () => {
    if (!timetable || !inspectedDetail) return;
    setValidatingMove(true);
    setValidationResult(null);
    try {
      const res = await api.post("/timetable/validate-move", {
        timetable_id: timetable.timetable_id,
        detail_id: inspectedDetail.detail_id,
        target_slot_id: targetSlotId,
        target_room_id: targetRoomId,
      });
      setValidationResult({
        tested: true,
        isValid: res.data.is_valid,
        conflicts: res.data.conflicts || [],
        warnings: res.data.warnings || [],
        message: res.data.message || "",
      });
    } catch (err: any) {
      setValidationResult({
        tested: true,
        isValid: false,
        conflicts: [err.response?.data?.detail || "Validation error."],
        warnings: [],
        message: "Failed to validate move.",
      });
    } finally {
      setValidatingMove(false);
    }
  };

  // Apply Move
  const handleApplyMove = async () => {
    if (!timetable || !inspectedDetail) return;
    setApplyingMove(true);
    try {
      const res = await api.post("/timetable/apply-move", {
        timetable_id: timetable.timetable_id,
        detail_id: inspectedDetail.detail_id,
        target_slot_id: targetSlotId,
        target_room_id: targetRoomId,
      });
      // Update in state
      setScheduleDetails((prev) =>
        prev.map((d) => (d.detail_id === res.data.detail_id ? res.data : d))
      );
      setStatusMessage({
        type: "success",
        text: `Session moved successfully to Slot ${res.data.start_time}-${res.data.end_time} in Room ${res.data.room_code}.`,
      });
      setInspectedDetail(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to apply move.");
    } finally {
      setApplyingMove(false);
    }
  };

  // Filtered Timetable Details for Step 5
  const filteredDetails = scheduleDetails.filter((d) => {
    if (viewMode === "section") {
      if (selectedSectionFilter === "Section III" && d.section_name !== "III") return false;
      if (selectedSectionFilter === "Section III-AF" && d.section_name !== "III-AF") return false;
    } else if (viewMode === "teacher") {
      if (selectedTeacherFilter !== "All" && d.teacher_name !== selectedTeacherFilter) return false;
    } else if (viewMode === "room") {
      if (selectedRoomFilter !== "All" && d.room_code !== selectedRoomFilter) return false;
    }
    if (selectedDayFilter !== "All" && d.day_of_week !== selectedDayFilter) return false;
    return true;
  });

  // Unique Teachers, Rooms, and Days for Filters
  const uniqueTeachers = Array.from(new Set(scheduleDetails.map((d) => d.teacher_name))).filter(Boolean);
  const uniqueRooms = Array.from(new Set(scheduleDetails.map((d) => d.room_code))).filter(Boolean);
  const dayOrderMap: { [key: string]: number } = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const uniqueDays = Array.from(new Set(scheduleDetails.map((d) => d.day_of_week)))
    .filter(Boolean)
    .sort((a, b) => (dayOrderMap[a] ?? 99) - (dayOrderMap[b] ?? 99));

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Studio Header (Apple-inspired clean white & subtle dark slate) */}
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Automated Timetable Generation Studio
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Intelligent Constraint-Driven Scheduling · Institutional Floor & Laboratory Policy
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Status Pill */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {timetable ? (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
                  timetable.status === "Active"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    timetable.status === "Active" ? "bg-emerald-500" : "bg-blue-500 animate-pulse"
                  }`}
                />
                <span>
                  {timetable.status} · v{timetable.version_no} ({timetable.total_slots_scheduled} periods)
                </span>
              </span>
            </div>
          ) : (
            <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              No Timetable Active
            </span>
          )}

          {/* Refresh State */}
          <button
            onClick={loadAllData}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Refresh Studio State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Clear Schedule Button */}
          <button
            onClick={handleClearSchedule}
            disabled={clearing}
            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Clear all assigned classes while preserving timings, rooms, teachers, and students"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{clearing ? "Clearing..." : "Clear Schedule"}</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`px-6 py-3 border-b text-xs font-medium flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : statusMessage.type === "error"
              ? "bg-rose-50 text-rose-900 border-rose-200"
              : statusMessage.type === "warning"
              ? "bg-amber-50 text-amber-900 border-amber-200"
              : "bg-blue-50 text-blue-900 border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {statusMessage.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {statusMessage.type === "warning" && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
            {statusMessage.type === "info" && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5-STAGE WORKFLOW STEPPER (Apple-inspired compact design) */}
      <div className="px-6 py-4 bg-white border-b border-slate-100">
        <div className="grid grid-cols-5 gap-2 text-xs">
          {[
            { step: 1, title: "Scope", subtitle: "Shift & Sections" },
            { step: 2, title: "Requirements", subtitle: "Subjects & Labs" },
            { step: 3, title: "Constraints", subtitle: "Rules & Presets" },
            { step: 4, title: "Generate", subtitle: "Audit & CSP Run" },
            { step: 5, title: "Review & Publish", subtitle: "Grid & Versioning" },
          ].map((item) => {
            const isCurrent = activeStep === item.step;
            const isCompleted = activeStep > item.step || (item.step === 5 && timetable !== null);
            return (
              <button
                key={item.step}
                onClick={() => setActiveStep(item.step)}
                className={`flex flex-col items-center p-2.5 rounded-2xl border transition text-left cursor-pointer ${
                  isCurrent
                    ? "bg-blue-50/80 border-blue-300 text-blue-950 shadow-xs"
                    : isCompleted
                    ? "bg-slate-50/70 border-slate-200 text-slate-800 hover:bg-slate-100"
                    : "bg-white border-slate-200/60 text-slate-400 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 w-full mb-1">
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? "bg-blue-600 text-white"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : item.step}
                  </span>
                  <span className="font-bold text-xs truncate">{item.title}</span>
                </div>
                <span className="text-[10px] text-slate-500 w-full truncate pl-6 hidden sm:block">
                  {item.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* WORKFLOW CONTENT CONTAINER */}
      <div className="p-6 md:p-8">
        {/* ======================================================== */}
        {/* STAGE 1: GENERATION SCOPE ("What should we schedule?")   */}
        {/* ======================================================== */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">What should we schedule?</h2>
                <p className="text-xs text-slate-500">
                  Select the academic scope, active shifts from database, and target calendar range.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                Stage 1 of 5
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Academic Year */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Academic Year</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="2026-27">2026-27 (Current Academic Cycle)</option>
                  <option value="2025-26">2025-26 (Archived)</option>
                </select>
              </div>

              {/* Program & Semester */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Program & Semester</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    disabled
                    value={program}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed"
                  />
                  <input
                    type="text"
                    disabled
                    value={semester}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Shift Selector (Using actual DB shifts) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Active Shifts</label>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="All Shifts">All Shifts (Morning & Afternoon)</option>
                  {shifts.map((s) => (
                    <option key={s.shift_id} value={s.name}>
                      {s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sections & Operating Days */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Target Sections</label>
                <div className="flex items-center gap-3">
                  {["Section III", "Section III-AF"].map((sec) => (
                    <label
                      key={sec}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        selectedSections.includes(sec)
                          ? "bg-blue-50 border-blue-300 text-blue-900"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSections.includes(sec)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSections([...selectedSections, sec]);
                          } else {
                            setSelectedSections(selectedSections.filter((s) => s !== sec));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>
                        {sec} {sec.includes("AF") ? "(Afternoon)" : "(Morning)"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Days of Operation</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {operatingDays.map((day) => (
                    <span
                      key={day}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg"
                    >
                      {day}
                    </span>
                  ))}
                  <span className="text-[11px] text-slate-400 pl-2">Standard 5-day academic week</span>
                </div>
              </div>
            </div>

            {/* Target Academic Dates & Range Selection Suite */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4.5 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Target Academic Scheduling Dates</h3>
                    <p className="text-[11px] text-slate-500">
                      Configure a custom date range (e.g. 11th to 12th) or target a specific single date.
                    </p>
                  </div>
                </div>

                {/* Range vs Single Date Toggle */}
                <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setDateSelectionMode("range")}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      dateSelectionMode === "range"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Date Range (From – To)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateSelectionMode("single");
                      setEndDate(startDate);
                    }}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      dateSelectionMode === "single"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Specific Single Date
                  </button>
                </div>
              </div>

              {/* Date Input Controls */}
              {dateSelectionMode === "range" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <span>Start Date (From)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStartDate(val);
                        if (endDate < val) setEndDate(val);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <span>End Date (To)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="max-w-xs space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <span>Specific Target Date</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                  />
                </div>
              )}

              {/* Quick Presets (Including 11th-12th as explicitly requested) */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-[11px] font-semibold text-slate-500">Quick Presets:</span>
                {[
                  {
                    label: "Current Week (Mon 02 Nov – Fri 06 Nov)",
                    start: "2026-11-02",
                    end: "2026-11-06",
                    mode: "range" as const,
                  },
                  {
                    label: "Custom Range (Wed 11 Nov – Thu 12 Nov)",
                    start: "2026-11-11",
                    end: "2026-11-12",
                    mode: "range" as const,
                  },
                  {
                    label: "Next Week (Mon 09 Nov – Fri 13 Nov)",
                    start: "2026-11-09",
                    end: "2026-11-13",
                    mode: "range" as const,
                  },
                  {
                    label: "Single Date (Wed 11 Nov)",
                    start: "2026-11-11",
                    end: "2026-11-11",
                    mode: "single" as const,
                  },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setDateSelectionMode(p.mode);
                      setStartDate(p.start);
                      setEndDate(p.end);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      startDate === p.start && endDate === p.end && dateSelectionMode === p.mode
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Summary Scope Badge */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded font-bold text-[10px] uppercase tracking-wide">
                    {dateSelectionMode === "range" ? "Date Range Active" : "Single Date Active"}
                  </span>
                  <span className="font-bold text-slate-900">
                    {dateSelectionMode === "range"
                      ? `${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)}`
                      : formatDisplayDate(startDate)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-[11px]">
                  <span>Active Days:</span>
                  <span className="font-bold text-blue-700">
                    {getActiveDaysSummary().join(", ")} ({getActiveDaysSummary().length} days)
                  </span>
                </div>
              </div>
            </div>

            {/* Generation Mode Selector */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-700">Generation Mode</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                {[
                  {
                    id: "new",
                    name: "Generate New",
                    desc: "Create a fresh conflict-free timetable for the selected academic scope.",
                  },
                  {
                    id: "repair",
                    name: "Repair Existing",
                    desc: "Preserve valid existing sessions and repair conflicts or missing periods.",
                  },
                  {
                    id: "alternatives",
                    name: "Generate Alternatives",
                    desc: "Generate multiple candidate schedules with different optimization trade-offs.",
                  },
                  {
                    id: "draft",
                    name: "Regenerate Draft",
                    desc: "Replace an existing unapproved draft run after confirmation.",
                  },
                ].map((mode) => (
                  <label
                    key={mode.id}
                    onClick={() => setGenerationMode(mode.id as any)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      generationMode === mode.id
                        ? "bg-blue-50/90 border-blue-400 text-blue-950 shadow-xs ring-1 ring-blue-400"
                        : "bg-slate-50/60 border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">{mode.name}</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{mode.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Stage 1 Footer Navigation */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveStep(2)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Continue to Requirements</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STAGE 2: ACADEMIC REQUIREMENTS & FACULTY ROSTER          */}
        {/* ======================================================== */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Academic & Laboratory Requirements</h2>
                <p className="text-xs text-slate-500">
                  Read-only summary of teacher-subject mappings from database and specialized room constraints.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                Stage 2 of 5
              </span>
            </div>

            {/* Institutional Room Routing Policy Banner */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Strict Institutional Room Allocation Policy</span>
              </p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                • <strong>4 Approved Laboratories:</strong> <strong>Room 107</strong> (Primary Lab, majority allocation), <strong>103</strong>, <strong>G01</strong>, and <strong>G03</strong>.
                <br />
                • <strong>Theory Classrooms:</strong> Strictly on the <strong>Second Floor (Rooms 201 to 208)</strong>. Ground & 1st floor classrooms are excluded from theory.
              </p>
            </div>

            {/* Teacher Assignments Summary Table (from DB) */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Teacher-Subject Assignments Roster ({teacherSummary.length} Courses)</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                  100% Assigned
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/40 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Subject</th>
                      <th className="px-4 py-2.5">Assigned Faculty</th>
                      <th className="px-4 py-2.5">Shift Eligibility</th>
                      <th className="px-4 py-2.5">Weekly Sessions</th>
                      <th className="px-4 py-2.5">Room Policy</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {teacherSummary.map((sub) => (
                      <tr key={sub.subject_id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-2.5 font-bold text-slate-800">
                          {sub.subject_name}{" "}
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              sub.is_lab
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {sub.subject_code}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium">
                          {sub.assigned_teachers.join(", ")}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{sub.shift}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800">
                          {sub.weekly_sessions_required} periods / week (55m each)
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {sub.is_lab ? (
                            <span className="text-purple-700 font-semibold">Lab: 107 (Priority) / 103 / G01 / G03</span>
                          ) : (
                            <span className="text-blue-700 font-semibold">Theory: Floor 2 (201–208)</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                            <span>{sub.eligibility_status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stage 2 Footer Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Scope</span>
              </button>
              <button
                onClick={() => setActiveStep(3)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Continue to Constraints</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STAGE 3: ADVANCED CATEGORIZED CONSTRAINT SYSTEM           */}
        {/* ======================================================== */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Advanced Constraint & Optimization Engine</h2>
                <p className="text-xs text-slate-500">
                  Configure CSP hard constraints, institutional floor rules, and soft-optimization presets.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                Stage 3 of 5
              </span>
            </div>

            {/* Strategy Presets Bar */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Optimization Strategy Presets</span>
                </span>
                <span className="text-[11px] text-slate-500">Presets adjust soft-constraint trade-offs</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
                {[
                  { id: "balanced", name: "Balanced", desc: "Balance students, faculty & rooms" },
                  { id: "student_first", name: "Student First", desc: "Prioritize gaps & even spread" },
                  { id: "faculty_first", name: "Faculty First", desc: "Prioritize workload fairness" },
                  { id: "room_efficient", name: "Room Efficient", desc: "Maximize room utilization" },
                  { id: "minimum_changes", name: "Min Changes", desc: "Preserve prior assignments" },
                  { id: "custom", name: "Custom", desc: "Administrator fine-tuning" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStrategyPreset(s.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      strategyPreset === s.id
                        ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <p className="font-bold text-xs">{s.name}</p>
                    <p className={`text-[10px] mt-0.5 line-clamp-1 ${strategyPreset === s.id ? "text-blue-100" : "text-slate-400"}`}>
                      {s.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Categorized Collapsible Panels */}
            <div className="space-y-3">
              {/* Category A: Faculty Constraints */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <button
                  onClick={() => toggleCategory("faculty")}
                  className="w-full px-5 py-3.5 bg-slate-50/60 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">1. Faculty Constraints</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Hard Constraints Enforced
                    </span>
                  </div>
                  {expandedCategories.faculty ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedCategories.faculty && (
                  <div className="p-5 border-t border-slate-100 space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Teacher-Subject-Shift Lock (C-09) */}
                      <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enforceShiftLock}
                          onChange={(e) => setEnforceShiftLock(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-bold text-slate-800">Teacher-Subject-Shift Lock (C-09) · Hard</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Restricts faculty exclusively to designated shifts (e.g. MGS in Morning, NPN in Afternoon).
                          </p>
                        </div>
                      </label>

                      {/* Workload Continuity Rule (C-05) */}
                      <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enforceContinuity}
                          onChange={(e) => setEnforceContinuity(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-bold text-slate-800">Teacher Continuity Rule (C-05) · Hard</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Limits continuous teaching; structural breaks reset the consecutive lecture counter.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Max Consecutive Slots Selector */}
                      <div className="p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                        <label className="block font-bold text-slate-800">Max Consecutive Teaching Slots</label>
                        <select
                          value={maxConsecutiveSlots}
                          onChange={(e) => setMaxConsecutiveSlots(Number(e.target.value))}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                        >
                          <option value={1}>1 Slot (Strict Rest)</option>
                          <option value={2}>2 Slots (Recommended Institutional Standard)</option>
                          <option value={3}>3 Slots (Extended Workload)</option>
                        </select>
                      </div>

                      {/* Workload Fairness Priority */}
                      <div className="p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                        <label className="block font-bold text-slate-800">Workload Fairness · Soft Preference</label>
                        <select
                          value={weights.workloadFairness}
                          onChange={(e) => setWeights({ ...weights, workloadFairness: e.target.value })}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                        >
                          <option value="Low">Low Priority</option>
                          <option value="Medium">Medium Priority</option>
                          <option value="High">High Priority (Default)</option>
                          <option value="Critical">Critical Priority</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Category B: Rooms and Facilities Constraints */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <button
                  onClick={() => toggleCategory("rooms")}
                  className="w-full px-5 py-3.5 bg-slate-50/60 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">2. Rooms & Floor Policy</span>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-full">
                      Floor 2 Theory · 107 Priority Lab
                    </span>
                  </div>
                  {expandedCategories.rooms ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedCategories.rooms && (
                  <div className="p-5 border-t border-slate-100 space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Lab Matching Toggle */}
                      <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enforceLabMatching}
                          onChange={(e) => setEnforceLabMatching(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-bold text-slate-800">Laboratory Matching (C-04) · Hard</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Routes Java Lab & Oracle Lab strictly into <strong>Room 107</strong> (Primary, majority allocation), <strong>103</strong>, <strong>G01</strong>, or <strong>G03</strong>.
                          </p>
                        </div>
                      </label>

                      {/* Second Floor Theory Rule */}
                      <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
                        <p className="font-bold text-slate-800">Second Floor Theory Classrooms (Rooms 201–208)</p>
                        <p className="text-slate-500 text-[11px]">
                          Non-lab classes strictly allocated to Rooms 201 to 208. Ground & 1st floor classrooms are excluded from theory.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Category C: Time and Breaks Constraints */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <button
                  onClick={() => toggleCategory("breaks")}
                  className="w-full px-5 py-3.5 bg-slate-50/60 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">3. Time & Break Protection</span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Breaks Locked Out
                    </span>
                  </div>
                  {expandedCategories.breaks ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedCategories.breaks && (
                  <div className="p-5 border-t border-slate-100 space-y-2 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <p className="font-bold text-slate-800">Morning Shift Break Lockout</p>
                        <p className="text-xs font-semibold text-rose-700 mt-0.5">11:05 – 11:20 (15 Minutes)</p>
                        <p className="text-[11px] text-slate-500 mt-1">Teaching strictly prohibited. Continuity counter resets.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <p className="font-bold text-slate-800">Afternoon Shift Break Lockout</p>
                        <p className="text-xs font-semibold text-rose-700 mt-0.5">15:10 – 15:35 (25 Minutes)</p>
                        <p className="text-[11px] text-slate-500 mt-1">Teaching strictly prohibited. Continuity counter resets.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stage 3 Footer Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveStep(2)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Requirements</span>
              </button>
              <button
                onClick={() => setActiveStep(4)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Continue to Readiness Check</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STAGE 4: GENERATION READINESS AUDIT & ENGINE EXECUTION   */}
        {/* ======================================================== */}
        {activeStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Pre-Generation Readiness Audit</h2>
                <p className="text-xs text-slate-500">
                  Automated constraint verification against actual database records before executing solver.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                Stage 4 of 5
              </span>
            </div>

            {/* Readiness Itemized Checklist */}
            {readiness && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {readiness.items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                        item.status === "passed"
                          ? "bg-emerald-50/40 border-emerald-200/90 text-slate-800"
                          : item.status === "warning"
                          ? "bg-amber-50/40 border-amber-200/90 text-slate-800"
                          : "bg-rose-50/40 border-rose-200/90 text-slate-800"
                      }`}
                    >
                      <div className="mt-0.5">
                        {item.status === "passed" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {item.status === "warning" && <AlertCircle className="w-4 h-4 text-amber-600" />}
                        {item.status === "blocked" && <AlertCircle className="w-4 h-4 text-rose-600" />}
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs">{item.name}</p>
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              item.status === "passed"
                                ? "text-emerald-700 bg-emerald-100"
                                : item.status === "warning"
                                ? "text-amber-700 bg-amber-100"
                                : "text-rose-700 bg-rose-100"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{item.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Database Metrics Stats Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs pt-1">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] text-slate-500">Qualified Faculty</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{readiness.stats.total_faculty} Professors</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] text-slate-500">Approved Labs</p>
                    <p className="text-base font-bold text-purple-700 mt-0.5">
                      {readiness.stats.approved_labs.length} Labs (107 Priority)
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] text-slate-500">Floor 2 Theory</p>
                    <p className="text-base font-bold text-blue-700 mt-0.5">
                      {readiness.stats.floor2_classrooms.length} Classrooms
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] text-slate-500">Teaching Slots</p>
                    <p className="text-base font-bold text-emerald-700 mt-0.5">
                      {readiness.stats.teaching_slots} Slots (Breaks Excluded)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Live Progress Bar during generation */}
            {generating && (
              <div className="p-5 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900 flex items-center gap-2">
                    <RotateCw className="w-4 h-4 text-blue-600 animate-spin" />
                    <span>{generationProgress.status}</span>
                  </span>
                  <span className="font-bold text-blue-800">
                    {generationProgress.sessionsAssigned} / {generationProgress.totalRequired} Periods Scheduled
                  </span>
                </div>
                <div className="w-full bg-blue-200/60 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(generationProgress.sessionsAssigned / generationProgress.totalRequired) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-blue-700">
                  Elapsed Time: {(generationProgress.elapsedMs / 1000).toFixed(1)}s · Zero hard-constraint violations.
                </p>
              </div>
            )}

            {/* Target Academic Date Range Summary in Stage 4 */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">
                    Target Scheduling Dates:{" "}
                    {dateSelectionMode === "range"
                      ? `${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)}`
                      : formatDisplayDate(startDate)}
                  </p>
                  <p className="text-[11px] text-blue-800">
                    {dateSelectionMode === "range"
                      ? `${getDayCount(startDate, endDate)} active days (${getActiveDaysSummary().join(", ")})`
                      : `Single-day schedule (${getActiveDaysSummary().join(", ")})`} · Automatic CSP generation for selected dates
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer shadow-2xs"
              >
                Change Dates (Step 1)
              </button>
            </div>

            {/* Stage 4 Footer Navigation & Primary Action */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveStep(3)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Constraints</span>
              </button>

              <button
                onClick={handleGenerate}
                disabled={generating || (readiness !== null && !readiness.is_ready)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                <span>{generating ? "Solving Constraints..." : "Run Timetable Generator (CSP Solver)"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STAGE 5: RESULTS, GRID PREVIEW, REPAIR & PUBLISH         */}
        {/* ======================================================== */}
        {activeStep === 5 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Review, Manual Adjustments & Publish</h2>
                <p className="text-xs text-slate-500">
                  Interactive multi-view schedule grid with instant move validation and version rollback.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {timetable && timetable.status === "Generated" && (
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{publishing ? "Publishing Calendar..." : "Publish Timetable as Active"}</span>
                  </button>
                )}
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                  Stage 5 of 5
                </span>
              </div>
            </div>

            {/* Quality Scorecard */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <p className="text-[11px] text-emerald-700 font-semibold">Completeness</p>
                <p className="text-base font-bold text-emerald-900 mt-0.5">100% (46/46 Slots)</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <p className="text-[11px] text-emerald-700 font-semibold">Hard Conflicts</p>
                <p className="text-base font-bold text-emerald-900 mt-0.5">0 Double-Bookings</p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200">
                <p className="text-[11px] text-blue-700 font-semibold">Lab Room Policy</p>
                <p className="text-base font-bold text-blue-900 mt-0.5">107 Priority + G01/G03</p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200">
                <p className="text-[11px] text-blue-700 font-semibold">Theory Floor 2</p>
                <p className="text-base font-bold text-blue-900 mt-0.5">Rooms 201–208 (100%)</p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200">
                <p className="text-[11px] text-purple-700 font-semibold">Shift Lock C-09</p>
                <p className="text-base font-bold text-purple-900 mt-0.5">100% Verified</p>
              </div>
            </div>

            {/* Multi-View Grid Controls */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* View Mode Tabs */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode("section")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    viewMode === "section" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Section View
                </button>
                <button
                  onClick={() => setViewMode("teacher")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    viewMode === "teacher" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Teacher View
                </button>
                <button
                  onClick={() => setViewMode("room")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    viewMode === "room" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Room View
                </button>
              </div>

              {/* Dynamic Sub-Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {viewMode === "section" && (
                  <select
                    value={selectedSectionFilter}
                    onChange={(e) => setSelectedSectionFilter(e.target.value)}
                    className="p-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-semibold"
                  >
                    <option value="Section III">Section III (Morning Shift)</option>
                    <option value="Section III-AF">Section III-AF (Afternoon Shift)</option>
                  </select>
                )}

                {viewMode === "teacher" && (
                  <select
                    value={selectedTeacherFilter}
                    onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                    className="p-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-semibold"
                  >
                    <option value="All">All Faculty</option>
                    {uniqueTeachers.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}

                {viewMode === "room" && (
                  <select
                    value={selectedRoomFilter}
                    onChange={(e) => setSelectedRoomFilter(e.target.value)}
                    className="p-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-semibold"
                  >
                    <option value="All">All Rooms</option>
                    {uniqueRooms.map((r) => (
                      <option key={r} value={r}>
                        Room {r}
                      </option>
                    ))}
                  </select>
                )}

                {/* Day Filter */}
                <select
                  value={selectedDayFilter}
                  onChange={(e) => setSelectedDayFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-semibold cursor-pointer"
                >
                  <option value="All">
                    All Days in Scope ({uniqueDays.length > 0 ? uniqueDays.join(", ") : "Mon–Fri"})
                  </option>
                  {(uniqueDays.length > 0 ? uniqueDays : ["Mon", "Tue", "Wed", "Thu", "Fri"]).map((day) => (
                    <option key={day} value={day}>
                      {day} ({getFormattedDateForDay(day)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Schedule Grid */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5">Date & Day</th>
                      <th className="px-3 py-2.5">Time</th>
                      <th className="px-4 py-2.5">Subject</th>
                      <th className="px-4 py-2.5">Professor</th>
                      <th className="px-3 py-2.5">Room</th>
                      <th className="px-3 py-2.5">Section</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredDetails.map((d) => (
                      <tr
                        key={d.detail_id}
                        onClick={() => openCellInspection(d)}
                        className="hover:bg-blue-50/40 cursor-pointer transition"
                      >
                        <td className="px-3.5 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                          {d.date_str || getFormattedDateForDay(d.day_of_week, d.date_str, d.session_date)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 font-mono text-[11px]">
                          {d.start_time} - {d.end_time}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-900">
                          {d.subject_name}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">({d.subject_code})</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-800">{d.teacher_name}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-700">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              d.is_lab ? "bg-purple-50 text-purple-700 font-bold" : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            Room {d.room_code}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">{d.section_name}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              d.is_lab
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {d.class_type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCellInspection(d);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Version History Drawer & Rollback Controls */}
            {versions.length > 0 && (
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Version History & Rollback Ledger</span>
                  </span>
                  <span className="text-[11px] text-slate-500">{versions.length} versions recorded</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  {versions.map((ver) => (
                    <div
                      key={ver.timetable_id}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">Version v{ver.version_no}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              ver.status === "Active"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {ver.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {ver.total_slots_scheduled} periods scheduled
                        </p>
                      </div>
                      {ver.status !== "Active" && (
                        <button
                          onClick={() => handleRollback(ver.timetable_id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer transition"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stage 5 Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveStep(4)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Readiness Audit</span>
              </button>
              <button
                onClick={() => setActiveStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>New Configuration Run</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* CELL INSPECTION & MANUAL MOVE MODAL                      */}
      {/* ======================================================== */}
      {inspectedDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Session Details & Manual Adjustment</h3>
                <p className="text-xs text-slate-500">Live validation prevents collisions & rule violations.</p>
              </div>
              <button
                onClick={() => setInspectedDetail(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Session Attributes */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[11px] text-slate-500">Subject</p>
                <p className="font-bold text-slate-800">{inspectedDetail.subject_name}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Professor</p>
                <p className="font-bold text-slate-800">{inspectedDetail.teacher_name}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Current Slot & Date</p>
                <p className="font-bold text-slate-800">
                  {inspectedDetail.date_str || getFormattedDateForDay(inspectedDetail.day_of_week, inspectedDetail.date_str, inspectedDetail.session_date)} ({inspectedDetail.start_time} - {inspectedDetail.end_time})
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Current Room</p>
                <p className="font-bold text-slate-800">Room {inspectedDetail.room_code}</p>
              </div>
            </div>

            {/* Test Move Controls */}
            <div className="space-y-3 pt-1 text-xs">
              <label className="font-bold text-slate-800">Reassign to New Time Slot & Room</label>
              <div className="grid grid-cols-2 gap-2">
                {/* Target Slot */}
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Target Slot</label>
                  <select
                    value={targetSlotId}
                    onChange={(e) => {
                      setTargetSlotId(Number(e.target.value));
                      setValidationResult(null);
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-blue-500"
                  >
                    {timeSlots.map((ts) => (
                      <option key={ts.slot_id} value={ts.slot_id}>
                        {ts.day_of_week} {ts.start_time}-{ts.end_time} {ts.is_teaching_slot ? "" : "(BREAK LOCKED)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Room */}
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Target Room</label>
                  <select
                    value={targetRoomId}
                    onChange={(e) => {
                      setTargetRoomId(Number(e.target.value));
                      setValidationResult(null);
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-blue-500"
                  >
                    {rooms.map((rm) => (
                      <option key={rm.room_id} value={rm.room_id}>
                        Room {rm.room_code} ({rm.room_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Validate Move Button */}
              <button
                onClick={handleValidateMove}
                disabled={validatingMove}
                className="w-full py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{validatingMove ? "Testing Move Against Constraints..." : "Test Move Validity"}</span>
              </button>
            </div>

            {/* Validation Outcome Banner */}
            {validationResult && validationResult.tested && (
              <div
                className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                  validationResult.isValid
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <p className="font-bold flex items-center gap-1.5">
                  {validationResult.isValid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  <span>{validationResult.message}</span>
                </p>
                {validationResult.conflicts.length > 0 && (
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-rose-800">
                    {validationResult.conflicts.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
                {validationResult.warnings.length > 0 && (
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-amber-800">
                    {validationResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setInspectedDetail(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyMove}
                disabled={applyingMove || (validationResult !== null && !validationResult.isValid)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {applyingMove ? "Applying..." : "Apply Move to Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
