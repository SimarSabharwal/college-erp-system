from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.academic import Department, Program, Shift, Section, Subject, Teacher, TimeSlot, Room

router = APIRouter(prefix="/academic", tags=["Academic Structure"])


@router.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    return db.query(Department).filter(Department.is_active == True).all()


@router.get("/programs")
def get_programs(db: Session = Depends(get_db)):
    return db.query(Program).filter(Program.is_active == True).all()


@router.get("/shifts")
def get_shifts(db: Session = Depends(get_db)):
    return db.query(Shift).filter(Shift.is_active == True).all()


@router.get("/sections")
def get_sections(db: Session = Depends(get_db)):
    sections = db.query(Section).filter(Section.is_active == True).all()
    return [
        {
            "section_id": s.section_id,
            "section_name": s.section_name,
            "program_id": s.program_id,
            "shift_id": s.shift_id,
            "shift_name": s.shift.name if s.shift else None,
            "max_strength": s.max_strength,
        }
        for s in sections
    ]


@router.get("/subjects")
def get_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).filter(Subject.is_active == True).all()


@router.get("/teachers")
def get_teachers(db: Session = Depends(get_db)):
    teachers = db.query(Teacher).filter(Teacher.is_active == True).all()
    return [
        {
            "teacher_id": t.teacher_id,
            "user_id": t.user_id,
            "full_name": t.user.full_name if t.user else "",
            "employee_no": t.employee_no,
            "designation": t.designation,
            "department_id": t.department_id,
            "max_hours_per_week": t.max_hours_per_week,
            "max_consecutive_slots": t.max_consecutive_slots,
        }
        for t in teachers
    ]


@router.get("/time-slots")
def get_time_slots(db: Session = Depends(get_db)):
    slots = db.query(TimeSlot).filter(TimeSlot.is_active == True).order_by(TimeSlot.global_order).all()
    return [
        {
            "slot_id": s.slot_id,
            "shift_id": s.shift_id,
            "shift_name": s.shift.name if s.shift else None,
            "day_of_week": s.day_of_week,
            "start_time": s.start_time.strftime("%H:%M"),
            "end_time": s.end_time.strftime("%H:%M"),
            "slot_label": s.slot_label,
            "slot_order": s.slot_order,
            "global_order": s.global_order,
            "is_teaching_slot": s.is_teaching_slot,
        }
        for s in slots
    ]


@router.get("/rooms")
def get_rooms(db: Session = Depends(get_db)):
    return db.query(Room).filter(Room.is_active == True).all()
