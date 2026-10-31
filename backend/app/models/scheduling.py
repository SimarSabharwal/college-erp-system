from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class Timetable(Base):
    __tablename__ = "timetables"

    timetable_id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("programs.program_id"), nullable=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.academic_year_id"), nullable=True)
    semester_id = Column(Integer, ForeignKey("semesters.semester_id"), nullable=True)
    shift_id = Column(Integer, ForeignKey("shifts.shift_id"), nullable=True)
    name = Column(String(100), nullable=True)
    version_no = Column(Integer, default=1)
    status = Column(String(20), default="Draft")  # 'Draft', 'Generated', 'Validated', 'Active', 'Archived'
    generated_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    active_from = Column(Date, nullable=True)
    active_to = Column(Date, nullable=True)
    is_locked = Column(Boolean, default=False)
    remarks = Column(Text, nullable=True)

    details = relationship("TimetableDetail", back_populates="timetable", cascade="all, delete-orphan")


class TimetableDetail(Base):
    __tablename__ = "timetable_details"

    detail_id = Column(Integer, primary_key=True, index=True)
    timetable_id = Column(Integer, ForeignKey("timetables.timetable_id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.section_id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.teacher_id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("time_slots.slot_id"), nullable=False)
    class_type = Column(String(20), default="Theory")  # 'Theory', 'Lab', 'Tutorial'
    is_lab = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)

    timetable = relationship("Timetable", back_populates="details")
    section = relationship("Section")
    subject = relationship("Subject")
    teacher = relationship("Teacher")
    room = relationship("Room")
    slot = relationship("TimeSlot")


class ClassSession(Base):
    __tablename__ = "class_sessions"

    session_id = Column(Integer, primary_key=True, index=True)
    timetable_id = Column(Integer, ForeignKey("timetables.timetable_id"), nullable=True)
    detail_id = Column(Integer, ForeignKey("timetable_details.detail_id"), nullable=True)
    section_id = Column(Integer, ForeignKey("sections.section_id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.teacher_id"), nullable=False)  # Original teacher
    substitute_teacher_id = Column(Integer, ForeignKey("teachers.teacher_id"), nullable=True)  # Filled on reassignment/transfer
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("time_slots.slot_id"), nullable=False)
    is_lab = Column(Boolean, default=False)
    session_date = Column(Date, nullable=False)
    week_type = Column(String(20), default="Regular")  # 'Regular', 'Makeup'
    status = Column(String(20), default="Scheduled")  # 'Scheduled', 'Ongoing', 'Completed', 'Cancelled', 'Transferred', 'Reassigned'
    leave_request_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    section = relationship("Section")
    subject = relationship("Subject")
    teacher = relationship("Teacher", foreign_keys=[teacher_id])
    substitute_teacher = relationship("Teacher", foreign_keys=[substitute_teacher_id])
    room = relationship("Room")
    slot = relationship("TimeSlot")


class TimetableChange(Base):
    __tablename__ = "timetable_changes"

    change_id = Column(Integer, primary_key=True, index=True)
    timetable_id = Column(Integer, ForeignKey("timetables.timetable_id"), nullable=True)
    detail_id = Column(Integer, ForeignKey("timetable_details.detail_id"), nullable=True)
    change_type = Column(String(50), nullable=False)
    old_value = Column(String(255), nullable=True)
    new_value = Column(String(255), nullable=True)
    changed_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    changed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reason = Column(Text, nullable=True)


class ConstraintViolation(Base):
    __tablename__ = "constraint_violations"

    violation_id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)  # 'Teacher', 'Room', 'Section', 'Student'
    entity_id = Column(Integer, nullable=True)
    slot_id = Column(Integer, ForeignKey("time_slots.slot_id"), nullable=True)
    date = Column(Date, nullable=True)
    conflict_type = Column(String(100), nullable=False)
    related_entity_id = Column(Integer, nullable=True)
    message = Column(Text, nullable=False)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String(20), default="Open")  # 'Open', 'Resolved', 'Ignored'


class RoomAvailability(Base):
    __tablename__ = "room_availability"

    availability_id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("time_slots.slot_id"), nullable=False)
    date = Column(Date, nullable=False)
    is_available = Column(Boolean, default=True)
    reason = Column(String(50), default="Free")  # 'Free', 'Class', 'Exam', 'Maintenance'
    session_id = Column(Integer, ForeignKey("class_sessions.session_id"), nullable=True)
    exam_id = Column(Integer, nullable=True)


class TeacherSubjectShiftLock(Base):
    __tablename__ = "teacher_subject_shift_lock"

    lock_id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.teacher_id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.shift_id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.semester_id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.academic_year_id"), nullable=False)
    locked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    locked_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    is_active = Column(Boolean, default=True)
    reset_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    reset_at = Column(DateTime, nullable=True)
    reset_reason = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("teacher_id", "subject_id", "semester_id", name="uq_teacher_subject_semester_shift_lock"),
    )

    teacher = relationship("Teacher")
    subject = relationship("Subject")
    shift = relationship("Shift")
