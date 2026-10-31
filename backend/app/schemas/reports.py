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
