from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from app.core.database import Base


class Exam(Base):
    __tablename__ = "exams"

    exam_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    program_id = Column(Integer, ForeignKey("programs.program_id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.semester_id"), nullable=False)
    exam_type = Column(String(50), default="Mid")  # 'Mid', 'End', 'Practical', 'Other'
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)


class ExamSchedule(Base):
    __tablename__ = "exam_schedule"

    schedule_id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.exam_id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.section_id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("time_slots.slot_id"), nullable=False)
    exam_date = Column(Date, nullable=False)
    status = Column(String(20), default="Scheduled")
