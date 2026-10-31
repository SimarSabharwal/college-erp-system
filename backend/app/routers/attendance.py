from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
import math

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models import (
    User,
    Student,
    Teacher,
    ClassSession,
    Attendance,
    Enrollment,
    Subject,
    Section,
)
from app.schemas.attendance import (
    SessionAttendanceSubmitRequest,
    StudentRosterItemResponse,
    SessionRosterResponse,
    SubjectAttendanceCardResponse,
    StudentAttendanceDashboardResponse,
)

router = APIRouter(prefix="/attendance", tags=["Student Attendance"])


@router.get("/session/{session_id}/roster", response_model=SessionRosterResponse)
def get_session_roster(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(ClassSession).filter_by(session_id=session_id).first()
    if not session:
        # Graceful fallback: check if session_id corresponds to a TimetableDetail
        from app.models.scheduling import TimetableDetail
        detail = db.query(TimetableDetail).filter_by(detail_id=session_id).first()
        if detail:
            session = ClassSession(
                timetable_id=detail.timetable_id,
                section_id=detail.section_id,
                subject_id=detail.subject_id,
                teacher_id=detail.teacher_id,
                room_id=detail.room_id,
                slot_id=detail.slot_id,
                session_date=date.today(),
                status="Scheduled",
            )
            db.add(session)
            db.commit()
            db.refresh(session)
        else:
            raise HTTPException(status_code=404, detail="Class session not found")

    # Get all students enrolled in this section
    students = (
        db.query(Student)
        .filter_by(section_id=session.section_id, status="Active")
        .order_by(Student.roll_no.asc())
        .all()
    )

    # Get existing attendance records for this session
    existing_attendance = {
        att.student_id: att
        for att in db.query(Attendance).filter_by(session_id=session.session_id).all()
    }

    student_roster = []
    present_cnt = 0
    absent_cnt = 0
    late_cnt = 0

    for st in students:
        rec = existing_attendance.get(st.student_id)
        st_status = rec.status if rec else None
        st_remarks = rec.remarks if rec else None

        if st_status == "Present":
            present_cnt += 1
        elif st_status == "Absent":
            absent_cnt += 1
        elif st_status == "Late":
            late_cnt += 1

        student_roster.append(
            StudentRosterItemResponse(
                student_id=st.student_id,
                user_id=st.user_id,
                full_name=st.user.full_name if st.user else "Student",
                roll_no=st.roll_no,
                status=st_status,
                remarks=st_remarks,
            )
        )

    is_marked = len(existing_attendance) > 0

    return SessionRosterResponse(
        session_id=session.session_id,
        session_date=session.session_date,
        subject_id=session.subject_id,
        subject_name=session.subject.name if session.subject else "",
        subject_code=session.subject.subject_code if session.subject else "",
        section_name=session.section.section_name if session.section else "",
        room_code=session.room.room_code if session.room else "",
        start_time=session.slot.start_time.strftime("%H:%M") if session.slot else "",
        end_time=session.slot.end_time.strftime("%H:%M") if session.slot else "",
        is_marked=is_marked,
        total_students=len(students),
        present_count=present_cnt,
        absent_count=absent_cnt,
        late_count=late_cnt,
        students=student_roster,
    )


@router.post("/session/{session_id}")
def submit_session_attendance(
    session_id: int,
    payload: SessionAttendanceSubmitRequest,
    current_user: User = Depends(require_roles("Teacher", "HOD", "Admin", "Principal")),
    db: Session = Depends(get_db),
):
    session = db.query(ClassSession).filter_by(session_id=session_id).first()
    if not session:
        # Graceful fallback: check if session_id corresponds to a TimetableDetail
        from app.models.scheduling import TimetableDetail
        detail = db.query(TimetableDetail).filter_by(detail_id=session_id).first()
        if detail:
            session = ClassSession(
                timetable_id=detail.timetable_id,
                section_id=detail.section_id,
                subject_id=detail.subject_id,
                teacher_id=detail.teacher_id,
                room_id=detail.room_id,
                slot_id=detail.slot_id,
                session_date=date.today(),
                status="Scheduled",
            )
            db.add(session)
            db.commit()
            db.refresh(session)
        else:
            raise HTTPException(status_code=404, detail="Class session not found")

    # If user is Teacher, verify they are teacher_id or substitute_teacher_id
    if current_user.role and current_user.role.role_name == "Teacher":
        teacher = current_user.teacher_profile
        if not teacher:
            raise HTTPException(status_code=403, detail="Teacher profile not found")
        assigned_id = session.substitute_teacher_id or session.teacher_id
        if assigned_id != teacher.teacher_id:
            raise HTTPException(status_code=403, detail="You can only mark attendance for your assigned class sessions")

    now = datetime.now(timezone.utc)
    present_cnt = 0
    absent_cnt = 0
    late_cnt = 0

    for rec in payload.records:
        att = (
            db.query(Attendance)
            .filter_by(session_id=session.session_id, student_id=rec.student_id)
            .first()
        )
        if not att:
            att = Attendance(
                session_id=session.session_id,
                student_id=rec.student_id,
                marked_by=current_user.user_id,
                status=rec.status,
                remarks=rec.remarks,
                marked_at=now,
            )
            db.add(att)
        else:
            att.status = rec.status
            att.remarks = rec.remarks
            att.marked_by = current_user.user_id
            att.marked_at = now

        if rec.status == "Present":
            present_cnt += 1
        elif rec.status == "Absent":
            absent_cnt += 1
        elif rec.status == "Late":
            late_cnt += 1

    # Mark session as completed
    session.status = "Completed"
    db.commit()

    return {
        "session_id": session.session_id,
        "message": "Attendance recorded successfully",
        "total_marked": len(payload.records),
        "present": present_cnt,
        "absent": absent_cnt,
        "late": late_cnt,
    }


def build_student_attendance_dashboard(student: Student, db: Session) -> StudentAttendanceDashboardResponse:
    # 1. Fetch all attendance records for this student
    records = db.query(Attendance).join(ClassSession).filter(Attendance.student_id == student.student_id).all()

    total_held = len(records)
    total_attended = 0
    total_absent = 0
    total_late = 0

    # Group by subject
    subject_stats = {}
    for att in records:
        subj_id = att.session.subject_id
        if subj_id not in subject_stats:
            subject_stats[subj_id] = {
                "held": 0,
                "attended": 0,
                "absent": 0,
                "late": 0,
            }

        subject_stats[subj_id]["held"] += 1
        if att.status in ("Present", "Late"):
            total_attended += 1
            subject_stats[subj_id]["attended"] += 1
            if att.status == "Late":
                total_late += 1
                subject_stats[subj_id]["late"] += 1
        elif att.status == "Absent":
            total_absent += 1
            subject_stats[subj_id]["absent"] += 1

    overall_pct = round((total_attended / total_held * 100), 1) if total_held > 0 else 0.0

    if overall_pct < 60.0:
        overall_status = "Critical"
    elif overall_pct < 75.0:
        overall_status = "At Risk"
    else:
        overall_status = "Safe"

    # 2. Enrolled subjects
    enrollments = db.query(Enrollment).filter_by(student_id=student.student_id).all()
    subject_cards: List[SubjectAttendanceCardResponse] = []

    for enr in enrollments:
        subj = enr.subject
        if not subj:
            continue

        stat = subject_stats.get(subj.subject_id, {"held": 0, "attended": 0, "absent": 0, "late": 0})
        held = stat["held"]
        att = stat["attended"]
        abs_cnt = stat["absent"]
        late_cnt = stat["late"]

        pct = round((att / held * 100), 1) if held > 0 else 0.0

        if held == 0:
            card_status = "Safe"
            card_color = "slate"
            margin = "No lectures conducted yet"
            sort_weight = 3
        elif pct < 60.0:
            card_status = "Critical"
            card_color = "rose"
            needed = math.ceil((0.75 * held - att) / 0.25)
            margin = f"Needs {max(needed, 1)} classes to reach 75%"
            sort_weight = 0
        elif pct < 75.0:
            card_status = "At Risk"
            card_color = "amber"
            needed = math.ceil((0.75 * held - att) / 0.25)
            margin = f"Needs {max(needed, 1)} classes to reach 75%"
            sort_weight = 1
        else:
            card_status = "Safe"
            card_color = "emerald"
            buffer = math.floor((att - 0.75 * held) / 0.75)
            margin = f"Can miss {max(buffer, 0)} classes" if buffer > 0 else "Attendance on target"
            sort_weight = 2

        subject_cards.append({
            "data": SubjectAttendanceCardResponse(
                subject_id=subj.subject_id,
                subject_name=subj.name,
                subject_code=subj.subject_code,
                subject_type=subj.subject_type,
                is_lab=subj.has_lab,
                total_classes_held=held,
                attended_classes=att,
                absent_classes=abs_cnt,
                late_classes=late_cnt,
                percentage=pct,
                status=card_status,
                status_color=card_color,
                margin_note=margin,
            ),
            "sort_weight": sort_weight,
            "pct": pct,
        })

    # Sort Critical first, then At Risk, then Safe (and within same status, lower % first)
    subject_cards.sort(key=lambda x: (x["sort_weight"], x["pct"]))

    return StudentAttendanceDashboardResponse(
        student_id=student.student_id,
        roll_no=student.roll_no,
        full_name=student.user.full_name if student.user else "Student",
        semester_no=student.section.program.semesters[0].semester_no if (student.section and student.section.program and student.section.program.semesters) else 3,
        total_held=total_held,
        total_attended=total_attended,
        total_absent=total_absent,
        total_late=total_late,
        overall_percentage=overall_pct,
        overall_status=overall_status,
        subject_cards=[item["data"] for item in subject_cards],
    )


@router.get("/me/dashboard", response_model=StudentAttendanceDashboardResponse)
def get_my_attendance_dashboard(
    current_user: User = Depends(require_roles("Student")),
    db: Session = Depends(get_db),
):
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return build_student_attendance_dashboard(student, db)


@router.get("/student/{student_id}/dashboard", response_model=StudentAttendanceDashboardResponse)
def get_student_attendance_dashboard(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter_by(student_id=student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return build_student_attendance_dashboard(student, db)
