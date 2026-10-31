from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime


class AttendanceRecordCreate(BaseModel):
    student_id: int
    status: str  # 'Present', 'Absent', 'Late'
    remarks: Optional[str] = None


class SessionAttendanceSubmitRequest(BaseModel):
    records: List[AttendanceRecordCreate]


class StudentRosterItemResponse(BaseModel):
    student_id: int
    user_id: int
    full_name: str
    roll_no: str
    status: Optional[str] = None  # 'Present', 'Absent', 'Late'
    remarks: Optional[str] = None


class SessionRosterResponse(BaseModel):
    session_id: int
    session_date: date
    subject_id: int
    subject_name: str
    subject_code: str
    section_name: str
    room_code: str
    start_time: str
    end_time: str
    is_marked: bool
    total_students: int
    present_count: int
    absent_count: int
    late_count: int
    students: List[StudentRosterItemResponse]


class SubjectAttendanceCardResponse(BaseModel):
    subject_id: int
    subject_name: str
    subject_code: str
    subject_type: str  # 'Theory' / 'Lab'
    is_lab: bool
    total_classes_held: int
    attended_classes: int
    absent_classes: int
    late_classes: int
    percentage: float
    status: str  # 'Critical', 'At Risk', 'Safe'
    status_color: str  # 'rose', 'amber', 'emerald'
    margin_note: str  # e.g. 'Needs 3 classes to reach 75%' or 'Can miss 2 classes'


class StudentAttendanceDashboardResponse(BaseModel):
    student_id: int
    roll_no: str
    full_name: str
    semester_no: int
    total_held: int
    total_attended: int
    total_absent: int
    total_late: int
    overall_percentage: float
    overall_status: str  # 'Critical', 'At Risk', 'Safe'
    subject_cards: List[SubjectAttendanceCardResponse]
