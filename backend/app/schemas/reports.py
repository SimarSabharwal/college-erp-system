from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date


class AdminSystemStats(BaseModel):
    total_students: int
    total_faculty: int
    total_departments: int
    total_shifts: int
    active_rooms: int
    active_subjects: int
    active_programs: int
    section_health_pct: float


class RoomDayStatus(BaseModel):
    day: str
    date_str: str
    status: str  # 'Available', 'Occupied', 'Maintenance'
    sessions_count: int = 0
    session_details: List[str] = []


class RoomAvailabilityItem(BaseModel):
    room_code: str
    room_type: str
    floor: Optional[str] = None
    is_primary_lab: bool = False
    days: List[RoomDayStatus]


class FacultyWorkloadItem(BaseModel):
    teacher_id: int
    full_name: str
    designation: str
    assigned_hours: int
    max_hours: int
    workload_percentage: float
    subjects: List[str]


class DepartmentPerformanceItem(BaseModel):
    department_code: str
    department_name: str
    students_count: int
    faculty_count: int
    avg_attendance_pct: float
    pass_percentage: float


class RecentActivityItem(BaseModel):
    id: int
    title: str
    description: str
    category: str  # 'Timetable', 'Admission', 'Leave', 'Transfer', 'System'
    timestamp_str: str


class RoomSlotAllocation(BaseModel):
    slot_id: int
    slot_order: int
    start_time: str
    end_time: str
    is_teaching_slot: bool
    status: str  # 'Available' or 'Occupied' or 'Break'
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_name: Optional[str] = None
    section_name: Optional[str] = None


class RoomPeriodAvailabilityItem(BaseModel):
    room_id: int
    room_code: str
    room_type: str
    capacity: int
    floor: Optional[str] = None
    is_primary_lab: bool = False
    slots: List[RoomSlotAllocation]


class DayPeriodHeader(BaseModel):
    slot_id: int
    slot_order: int
    start_time: str
    end_time: str
    time_label: str
    is_teaching_slot: bool


class RoomDayPeriodsResponse(BaseModel):
    day: str
    target_date: str
    shift_name: str
    period_headers: List[DayPeriodHeader]
    rooms: List[RoomPeriodAvailabilityItem]
    total_rooms: int
    available_rooms_count: int
    occupied_rooms_count: int
