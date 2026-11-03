from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime


class TransferRequest(BaseModel):
    session_id: int
    substitute_teacher_id: int
    reason: Optional[str] = None


class TransferResponse(BaseModel):
    transfer_id: int
    session_id: int
    requesting_teacher_id: int
    requesting_teacher_name: str
    substitute_teacher_id: int
    substitute_teacher_name: str
    reason: Optional[str]
    status: str
    transferred_at: datetime
    session_date: date
    subject_code: str
    subject_name: str
    section_name: str
    start_time: str
    end_time: str


class CandidateSubstituteResponse(BaseModel):
    teacher_id: int
    user_id: int
    full_name: str
    employee_no: str
    designation: str
    department_id: Optional[int]
    department_name: str
    is_same_dept: bool
    classes_today: int
    is_continuity_safe: bool
    consecutive_count: int
    continuity_warning: Optional[str]
    priority: int
    is_free: bool = True
    busy_reason: Optional[str] = None
    is_subject_qualified: bool = True


class ApplyLeaveRequest(BaseModel):
    leave_type: str  # 'Sick', 'Casual', 'Earned', 'Duty', 'Maternity', 'Other'
    start_date: date
    end_date: date
    reason: Optional[str] = None
    suggested_sub_id: Optional[int] = None


class AffectedSessionResponse(BaseModel):
    session_id: int
    session_date: date
    subject_id: int
    subject_code: str
    subject_name: str
    section_name: str
    room_code: str
    slot_id: int
    start_time: str
    end_time: str
    slot_order: int
    substitute_teacher_id: Optional[int] = None
    substitute_teacher_name: Optional[str] = None
    status: str


class LeaveResponse(BaseModel):
    leave_request_id: int
    teacher_id: int
    teacher_name: str
    department_name: str
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str]
    status: str
    suggested_sub_id: Optional[int] = None
    suggested_sub_name: Optional[str] = None
    hod_reviewed_by_name: Optional[str] = None
    hod_reviewed_at: Optional[datetime] = None
    hod_note: Optional[str] = None
    admin_reviewed_by_name: Optional[str] = None
    admin_reviewed_at: Optional[datetime] = None
    admin_note: Optional[str] = None
    created_at: datetime
    affected_sessions_count: int


class LeaveDetailResponse(BaseModel):
    leave: LeaveResponse
    affected_sessions: List[AffectedSessionResponse]


class HODActionRequest(BaseModel):
    note: Optional[str] = None


class AdminAssignSubItem(BaseModel):
    session_id: int
    substitute_teacher_id: int
    continuity_override: bool = False
    override_reason: Optional[str] = None


class AdminApproveRequest(BaseModel):
    assignments: List[AdminAssignSubItem]
    note: Optional[str] = None


class AdminDenyRequest(BaseModel):
    note: Optional[str] = None


class NotificationResponse(BaseModel):
    notification_id: int
    type: str
    title: str
    body: Optional[str]
    related_id: Optional[int]
    related_type: Optional[str]
    is_read: bool
    created_at: datetime
