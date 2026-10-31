from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date, datetime


class GenerateTimetableRequest(BaseModel):
    program_id: int = 1
    semester_id: int = 1
    academic_year_id: int = 1
    name: Optional[str] = "BCA Sem 3 Auto Timetable"
    week_start: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    generation_mode: str = "new"  # 'new', 'repair', 'alternatives', 'draft'
    strategy_preset: str = "balanced"  # 'balanced', 'student_first', 'faculty_first', 'room_efficient', 'minimum_changes', 'custom'
    enforce_shift_lock: bool = True
    enforce_lab_matching: bool = True
    enforce_continuity: bool = True
    max_consecutive_slots: int = 2
    clear_existing_drafts: bool = True
    search_effort: str = "standard"  # 'quick', 'standard', 'thorough', 'advanced'
    weights: Optional[Dict[str, int]] = None


class TimetableDetailResponse(BaseModel):
    detail_id: int
    timetable_id: int
    section_id: int
    section_name: str
    subject_id: int
    subject_code: str
    subject_name: str
    teacher_id: int
    teacher_name: str
    room_id: int
    room_code: str
    slot_id: int
    day_of_week: str
    session_date: Optional[date] = None
    date_str: Optional[str] = None
    start_time: str
    end_time: str
    slot_order: int
    global_order: int
    class_type: str
    is_lab: bool


class TimetableResponse(BaseModel):
    timetable_id: int
    program_id: Optional[int] = None
    academic_year_id: Optional[int] = None
    semester_id: Optional[int] = None
    name: Optional[str] = None
    version_no: int
    status: str
    generated_at: Optional[datetime] = None
    active_from: Optional[date] = None
    active_to: Optional[date] = None
    is_locked: bool
    total_slots_scheduled: int
    conflicts_count: int = 0
    details: Optional[List[TimetableDetailResponse]] = None


class ClassSessionResponse(BaseModel):
    session_id: int
    section_id: int
    section_name: str
    subject_id: int
    subject_code: str
    subject_name: str
    teacher_id: int
    teacher_name: str
    substitute_teacher_id: Optional[int] = None
    substitute_teacher_name: Optional[str] = None
    room_id: int
    room_code: str
    slot_id: int
    start_time: str
    end_time: str
    session_date: date
    status: str
    is_lab: bool
    can_mark_attendance: bool = True
    my_attendance_status: Optional[str] = None
    my_remarks: Optional[str] = None


class ReadinessCheckItem(BaseModel):
    id: str
    name: str
    status: str  # 'passed', 'warning', 'blocked', 'info'
    message: str
    action_suggestion: Optional[str] = None
    category: str


class ReadinessCheckResponse(BaseModel):
    is_ready: bool
    items: List[ReadinessCheckItem]
    stats: Dict[str, Any]


class TeacherAssignmentSummaryItem(BaseModel):
    subject_id: int
    subject_code: str
    subject_name: str
    is_lab: bool
    assigned_teachers: List[str]
    shift: str
    eligibility_status: str  # 'Valid' or 'Needs attention'
    weekly_sessions_required: int
    session_duration_minutes: int = 55


class ValidateMoveRequest(BaseModel):
    timetable_id: int
    detail_id: int
    target_slot_id: int
    target_room_id: int


class ValidateMoveResponse(BaseModel):
    is_valid: bool
    conflicts: List[str]
    warnings: List[str]
    message: str


class ApplyMoveRequest(BaseModel):
    timetable_id: int
    detail_id: int
    target_slot_id: int
    target_room_id: int


class TimetableVersionItem(BaseModel):
    timetable_id: int
    name: Optional[str] = None
    version_no: int
    status: str
    generated_at: Optional[datetime] = None
    active_from: Optional[date] = None
    active_to: Optional[date] = None
    total_slots_scheduled: int
