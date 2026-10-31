from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class LectureTransfer(Base):
    __tablename__ = "lecture_transfers"

    transfer_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("class_sessions.session_id"), nullable=False)
    requesting_teacher_id = Column(Integer, ForeignKey("teachers.teacher_id"), nullable=False)
    substitute_teacher_id = Column(Integer, ForeignKey("teachers.teacher_id"), nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(20), default="Completed")  # 'Completed', 'Cancelled'
    continuity_checked = Column(Boolean, default=True)
    continuity_ok = Column(Boolean, default=True)
    transferred_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("ClassSession")
    requesting_teacher = relationship("Teacher", foreign_keys=[requesting_teacher_id])
    substitute_teacher = relationship("Teacher", foreign_keys=[substitute_teacher_id])


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    leave_request_id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.teacher_id"), nullable=False)
    leave_type = Column(String(30), nullable=False)  # 'Sick', 'Casual', 'Earned', 'Duty', 'Maternity', 'Other'
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(30), default="Pending_HOD")  # 'Draft', 'Pending_HOD', 'Denied_HOD', 'Pending_Admin', 'Denied_Admin', 'Approved', 'Cancelled'
    suggested_sub_id = Column(Integer, ForeignKey("teachers.teacher_id"), nullable=True)
    
    # HOD Review
    hod_reviewed_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    hod_reviewed_at = Column(DateTime, nullable=True)
    hod_note = Column(Text, nullable=True)

    # Admin Review
    admin_reviewed_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    admin_reviewed_at = Column(DateTime, nullable=True)
    admin_note = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    teacher = relationship("Teacher", foreign_keys=[teacher_id], back_populates="leave_requests")
    suggested_substitute = relationship("Teacher", foreign_keys=[suggested_sub_id])
    assignments = relationship("LeaveSessionAssignment", back_populates="leave_request", cascade="all, delete-orphan")


class LeaveSessionAssignment(Base):
    __tablename__ = "leave_session_assignments"

    assignment_id = Column(Integer, primary_key=True, index=True)
    leave_request_id = Column(Integer, ForeignKey("leave_requests.leave_request_id"), nullable=False)
    session_id = Column(Integer, ForeignKey("class_sessions.session_id"), nullable=False)
    substitute_teacher_id = Column(Integer, ForeignKey("teachers.teacher_id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    continuity_override = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    leave_request = relationship("LeaveRequest", back_populates="assignments")
    session = relationship("ClassSession")
    substitute_teacher = relationship("Teacher")


class TeacherAvailability(Base):
    __tablename__ = "teacher_availability"

    availability_id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.teacher_id"), nullable=False)
    day_of_week = Column(String(10), nullable=True)  # 'Mon', 'Tue', etc.
    slot_id = Column(Integer, ForeignKey("time_slots.slot_id"), nullable=True)
    specific_date = Column(Date, nullable=True)
    is_available = Column(Boolean, default=False)
    reason = Column(String(100), nullable=True)

    teacher = relationship("Teacher")


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    type = Column(String(50), nullable=False)  # 'LEAVE_REQUEST', 'LEAVE_FORWARDED', 'LEAVE_APPROVED', 'CLASS_ASSIGNED', 'TRANSFER_NOTICE', etc.
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=True)
    related_id = Column(Integer, nullable=True)
    related_type = Column(String(50), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")
