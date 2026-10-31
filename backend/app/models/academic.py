from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Time, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class Department(Base):
    __tablename__ = "departments"

    department_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    hod_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    programs = relationship("Program", back_populates="department")
    teachers = relationship("Teacher", back_populates="department")


class Program(Base):
    __tablename__ = "programs"

    program_id = Column(Integer, primary_key=True, index=True)
    program_code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.department_id"), nullable=False)
    duration_years = Column(Integer, default=3)
    total_semesters = Column(Integer, default=6)
    is_active = Column(Boolean, default=True)

    department = relationship("Department", back_populates="programs")
    sections = relationship("Section", back_populates="program")
    semesters = relationship("Semester", back_populates="program")
    subjects = relationship("Subject", back_populates="program")


class Shift(Base):
    __tablename__ = "shifts"

    shift_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), nullable=False)  # 'Morning', 'Afternoon'
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_active = Column(Boolean, default=True)

    sections = relationship("Section", back_populates="shift")
    time_slots = relationship("TimeSlot", back_populates="shift")


class AcademicYear(Base):
    __tablename__ = "academic_years"

    academic_year_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(20), nullable=False)  # e.g., '2026-27'
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)

    semesters = relationship("Semester", back_populates="academic_year")
    sections = relationship("Section", back_populates="academic_year")


class Semester(Base):
    __tablename__ = "semesters"

    semester_id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("programs.program_id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.academic_year_id"), nullable=False)
    semester_no = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)

    program = relationship("Program", back_populates="semesters")
    academic_year = relationship("AcademicYear", back_populates="semesters")
    subjects = relationship("Subject", back_populates="semester")


class Section(Base):
    __tablename__ = "sections"

    section_id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("programs.program_id"), nullable=False)
    section_name = Column(String(10), nullable=False)  # 'A', 'B'
    shift_id = Column(Integer, ForeignKey("shifts.shift_id"), nullable=False)
    max_strength = Column(Integer, default=60)
    academic_year_id = Column(Integer, ForeignKey("academic_years.academic_year_id"), nullable=True)
    is_active = Column(Boolean, default=True)

    program = relationship("Program", back_populates="sections")
    shift = relationship("Shift", back_populates="sections")
    academic_year = relationship("AcademicYear", back_populates="sections")
    students = relationship("Student", back_populates="section")


class Subject(Base):
    __tablename__ = "subjects"

    subject_id = Column(Integer, primary_key=True, index=True)
    subject_code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    program_id = Column(Integer, ForeignKey("programs.program_id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.semester_id"), nullable=True)
    credits = Column(Integer, default=4)
    subject_type = Column(String(20), default="Theory")  # 'Theory', 'Lab', 'Theory+Lab', 'Elective'
    has_lab = Column(Boolean, default=False)
    theory_hours_per_week = Column(Integer, default=4)
    lab_hours_per_week = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    program = relationship("Program", back_populates="subjects")
    semester = relationship("Semester", back_populates="subjects")
    teachers = relationship("TeacherSubject", back_populates="subject")


class Teacher(Base):
    __tablename__ = "teachers"

    teacher_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True, nullable=False)
    employee_no = Column(String(30), unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.department_id"), nullable=True)
    qualification = Column(String(100), nullable=True)
    designation = Column(String(50), default="Assistant Professor")
    hire_date = Column(Date, nullable=True)
    max_hours_per_week = Column(Integer, default=20)
    max_consecutive_slots = Column(Integer, default=2)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="teacher_profile")
    department = relationship("Department", back_populates="teachers")
    subjects = relationship("TeacherSubject", back_populates="teacher")
    leave_requests = relationship("LeaveRequest", foreign_keys="[LeaveRequest.teacher_id]", back_populates="teacher")


class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"

    teacher_id = Column(Integer, ForeignKey("teachers.teacher_id"), primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"), primary_key=True)
    can_teach = Column(Boolean, default=True)
    priority = Column(Integer, default=1)

    teacher = relationship("Teacher", back_populates="subjects")
    subject = relationship("Subject", back_populates="teachers")


class Building(Base):
    __tablename__ = "buildings"

    building_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    rooms = relationship("Room", back_populates="building")


class Room(Base):
    __tablename__ = "rooms"

    room_id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("buildings.building_id"), nullable=True)
    room_code = Column(String(30), unique=True, nullable=False)
    room_type = Column(String(20), default="Classroom")  # 'Classroom', 'Lab', 'Seminar', 'Other'
    capacity = Column(Integer, default=60)
    has_projector = Column(Boolean, default=True)
    has_computer = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    building = relationship("Building", back_populates="rooms")


class Student(Base):
    __tablename__ = "students"

    student_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True, nullable=False)
    roll_no = Column(String(30), unique=True, nullable=False)
    student_erp = Column(String(30), nullable=True, index=True)
    prn = Column(String(30), nullable=True, index=True)
    program_id = Column(Integer, ForeignKey("programs.program_id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.section_id"), nullable=False)
    admission_year = Column(Integer, default=2026)
    status = Column(String(20), default="Active")

    user = relationship("User", back_populates="student_profile")
    program = relationship("Program")
    section = relationship("Section", back_populates="students")
    enrollments = relationship("Enrollment", back_populates="student")


class Enrollment(Base):
    __tablename__ = "enrollments"

    enrollment_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.academic_year_id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.semester_id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.section_id"), nullable=False)
    status = Column(String(20), default="Active")

    __table_args__ = (
        UniqueConstraint("student_id", "subject_id", "semester_id", name="uq_student_subject_semester"),
    )

    student = relationship("Student", back_populates="enrollments")
    subject = relationship("Subject")


class TimeSlot(Base):
    __tablename__ = "time_slots"

    slot_id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.shift_id"), nullable=False)
    day_of_week = Column(String(10), nullable=False)  # 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    slot_label = Column(String(50), nullable=True)
    slot_order = Column(Integer, nullable=False)  # 1-6 per shift
    global_order = Column(Integer, nullable=False)  # 1-12 across full day
    is_teaching_slot = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

    shift = relationship("Shift", back_populates="time_slots")
