from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import date, datetime, timedelta
from typing import List, Optional
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models import (
    User,
    Timetable,
    TimetableDetail,
    ClassSession,
    Student,
    Teacher,
    TimeSlot,
    Section,
    Subject,
    Room,
    TeacherSubjectShiftLock,
    Attendance,
)
from app.schemas.timetable import (
    GenerateTimetableRequest,
    TimetableResponse,
    TimetableDetailResponse,
    ClassSessionResponse,
    ReadinessCheckResponse,
    TeacherAssignmentSummaryItem,
    ValidateMoveRequest,
    ValidateMoveResponse,
    ApplyMoveRequest,
    TimetableVersionItem,
)
from app.services.timetable_generator import TimetableGenerator

router = APIRouter(prefix="/timetable", tags=["Timetable Engine"])


def map_detail_to_response(d: TimetableDetail, db: Optional[Session] = None) -> TimetableDetailResponse:
    start_d = d.timetable.active_from if (d.timetable and d.timetable.active_from) else date(2026, 11, 2)
    end_d = d.timetable.active_to if (d.timetable and d.timetable.active_to) else (start_d + timedelta(days=4))
    day_name = d.slot.day_of_week if d.slot else "Mon"

    # Search for matching weekday within the active timetable date range [start_d, end_d]
    curr = start_d
    sess_date = None
    while curr <= end_d:
        if curr.strftime("%a") == day_name:
            sess_date = curr
            break
        curr += timedelta(days=1)

    if not sess_date:
        day_map = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}
        offset = day_map.get(day_name, 0)
        sess_date = start_d + timedelta(days=offset)

    formatted_date_str = sess_date.strftime("%a, %d %b")

    sub_id = None
    sub_name = None
    is_reassigned = False
    orig_teacher_name = d.teacher.user.full_name if (d.teacher and d.teacher.user) else ""
    eff_teacher_name = orig_teacher_name

    if db and sess_date:
        cs = db.query(ClassSession).filter_by(
            timetable_id=d.timetable_id,
            detail_id=d.detail_id,
            session_date=sess_date,
        ).first()
        if cs and cs.substitute_teacher_id:
            sub_id = cs.substitute_teacher_id
            sub_name = cs.substitute_teacher.user.full_name if (cs.substitute_teacher and cs.substitute_teacher.user) else None
            is_reassigned = True
            eff_teacher_name = sub_name or orig_teacher_name

    return TimetableDetailResponse(
        detail_id=d.detail_id,
        timetable_id=d.timetable_id,
        section_id=d.section_id,
        section_name=d.section.section_name if d.section else "",
        subject_id=d.subject_id,
        subject_code=d.subject.subject_code if d.subject else "",
        subject_name=d.subject.name if d.subject else "",
        teacher_id=d.teacher_id,
        teacher_name=orig_teacher_name,
        substitute_teacher_id=sub_id,
        substitute_teacher_name=sub_name,
        is_reassigned=is_reassigned,
        effective_teacher_name=eff_teacher_name,
        room_id=d.room_id,
        room_code=d.room.room_code if d.room else "",
        slot_id=d.slot_id,
        day_of_week=day_name,
        session_date=sess_date,
        date_str=formatted_date_str,
        start_time=d.slot.start_time.strftime("%H:%M") if d.slot else "",
        end_time=d.slot.end_time.strftime("%H:%M") if d.slot else "",
        slot_order=d.slot.slot_order if d.slot else 1,
        global_order=d.slot.global_order if d.slot else 1,
        class_type=d.class_type,
        is_lab=d.is_lab,
    )


@router.get("/readiness-check", response_model=ReadinessCheckResponse)
def get_readiness_check(
    program_id: int = 1,
    semester_id: int = 1,
    current_user: User = Depends(require_roles("Admin", "Principal")),
    db: Session = Depends(get_db),
):
    """
    Comprehensive pre-generation readiness audit.
    """
    generator = TimetableGenerator(db)
    result = generator.get_readiness_check(program_id, semester_id)
    return result


@router.get("/teacher-assignments-summary", response_model=List[TeacherAssignmentSummaryItem])
def get_teacher_assignments_summary(
    program_id: int = 1,
    semester_id: int = 1,
    current_user: User = Depends(require_roles("Admin", "Principal")),
    db: Session = Depends(get_db),
):
    """
    Read-only summary of current teacher-subject mappings, shift assignments, and eligibility.
    """
    generator = TimetableGenerator(db)
    return generator.get_teacher_assignments_summary(program_id, semester_id)


@router.post("/validate-move", response_model=ValidateMoveResponse)
def validate_move(
    payload: ValidateMoveRequest,
    current_user: User = Depends(require_roles("Admin", "Principal")),
    db: Session = Depends(get_db),
):
    """
    Tests if moving an individual timetable session creates conflicts or violations.
    """
    generator = TimetableGenerator(db)
    result = generator.validate_move(
        timetable_id=payload.timetable_id,
        detail_id=payload.detail_id,
        target_slot_id=payload.target_slot_id,
        target_room_id=payload.target_room_id,
    )
    return result


@router.post("/apply-move", response_model=TimetableDetailResponse)
def apply_move(
    payload: ApplyMoveRequest,
    current_user: User = Depends(require_roles("Admin", "Principal")),
    db: Session = Depends(get_db),
):
    """
    Applies validated manual move to timetable detail.
    """
    generator = TimetableGenerator(db)
    try:
        updated_detail = generator.apply_move(
            timetable_id=payload.timetable_id,
            detail_id=payload.detail_id,
            target_slot_id=payload.target_slot_id,
            target_room_id=payload.target_room_id,
            admin_user_id=current_user.user_id,
        )
        return map_detail_to_response(updated_detail)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/versions", response_model=List[TimetableVersionItem])
def get_timetable_versions(
    program_id: int = 1,
    semester_id: int = 1,
    current_user: User = Depends(require_roles("Admin", "Principal")),
    db: Session = Depends(get_db),
):
    """
    Lists historical timetable versions for audit and rollback.
    """
    tts = (
        db.query(Timetable)
        .filter_by(program_id=program_id, semester_id=semester_id)
        .order_by(Timetable.version_no.desc(), Timetable.timetable_id.desc())
        .all()
    )
    return [
        TimetableVersionItem(
            timetable_id=t.timetable_id,
            name=t.name,
            version_no=t.version_no,
            status=t.status,
            generated_at=t.generated_at,
            active_from=t.active_from,
            active_to=t.active_to,
            total_slots_scheduled=len(t.details),
        )
        for t in tts
    ]


@router.post("/{timetable_id}/rollback", response_model=TimetableResponse)
def rollback_timetable(
    timetable_id: int,
    current_user: User = Depends(require_roles("Admin", "Principal")),
    db: Session = Depends(get_db),
):
    """
    Reactivates a prior timetable version.
    """
    generator = TimetableGenerator(db)
    try:
        tt = generator.rollback_timetable(timetable_id, current_user.user_id)
        detail_items = [map_detail_to_response(d) for d in tt.details]
        return TimetableResponse(
            timetable_id=tt.timetable_id,
            program_id=tt.program_id,
            academic_year_id=tt.academic_year_id,
            semester_id=tt.semester_id,
            name=tt.name,
            version_no=tt.version_no,
            status=tt.status,
            generated_at=tt.generated_at,
            active_from=tt.active_from,
            active_to=tt.active_to,
            is_locked=tt.is_locked,
            total_slots_scheduled=len(tt.details),
            conflicts_count=0,
            details=detail_items,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/clear-schedule")
def clear_schedule(
    current_user: User = Depends(require_roles("Admin", "Principal")),
    db: Session = Depends(get_db),
):
    generator = TimetableGenerator(db)
    generator.clear_all_schedules()
    return {
        "message": "All timetables, class sessions, and assigned schedules cleared successfully. Master timings, rooms, faculty, and students preserved.",
        "status": "cleared",
    }


@router.post("/generate", response_model=TimetableResponse)
def generate_timetable(
    payload: GenerateTimetableRequest,
    current_user: User = Depends(require_roles("Admin", "Principal")),
    db: Session = Depends(get_db),
):
    generator = TimetableGenerator(db)
    try:
        tt = generator.generate_timetable(
            program_id=payload.program_id,
            semester_id=payload.semester_id,
            academic_year_id=payload.academic_year_id,
            generated_by_user_id=current_user.user_id,
            name=payload.name or "Auto-Generated Timetable",
            week_start=payload.week_start or payload.start_date,
            start_date=payload.start_date or payload.week_start,
            end_date=payload.end_date,
            generation_mode=payload.generation_mode,
            strategy_preset=payload.strategy_preset,
            enforce_shift_lock=payload.enforce_shift_lock,
            enforce_lab_matching=payload.enforce_lab_matching,
            enforce_continuity=payload.enforce_continuity,
            max_consecutive_slots=payload.max_consecutive_slots,
            enforce_daily_lecture_cap=payload.enforce_daily_lecture_cap,
            max_lectures_per_day=payload.max_lectures_per_day,
            clear_existing_drafts=payload.clear_existing_drafts,
            search_effort=payload.search_effort,
            weights=payload.weights,
        )
        count = len(tt.details)
        detail_items = [map_detail_to_response(d) for d in tt.details]
        return TimetableResponse(
            timetable_id=tt.timetable_id,
            program_id=tt.program_id,
            academic_year_id=tt.academic_year_id,
            semester_id=tt.semester_id,
            name=tt.name,
            version_no=tt.version_no,
            status=tt.status,
            generated_at=tt.generated_at,
            active_from=tt.active_from,
            active_to=tt.active_to,
            is_locked=tt.is_locked,
            total_slots_scheduled=count,
            conflicts_count=0,
            details=detail_items,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{timetable_id}/publish", response_model=TimetableResponse)
def publish_timetable(
    timetable_id: int,
    week_start: Optional[date] = None,
    week_end: Optional[date] = None,
    current_user: User = Depends(require_roles("Admin", "Principal")),
    db: Session = Depends(get_db),
):
    generator = TimetableGenerator(db)
    try:
        tt = generator.publish_timetable(timetable_id, current_user.user_id, week_start=week_start, week_end=week_end)
        count = len(tt.details)
        return TimetableResponse(
            timetable_id=tt.timetable_id,
            program_id=tt.program_id,
            academic_year_id=tt.academic_year_id,
            semester_id=tt.semester_id,
            name=tt.name,
            version_no=tt.version_no,
            status=tt.status,
            generated_at=tt.generated_at,
            active_from=tt.active_from,
            active_to=tt.active_to,
            is_locked=tt.is_locked,
            total_slots_scheduled=count,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/latest", response_model=TimetableResponse)
def get_latest_timetable(db: Session = Depends(get_db)):
    tt = db.query(Timetable).order_by(Timetable.timetable_id.desc()).first()
    if not tt:
        raise HTTPException(status_code=404, detail="No timetables found")
    count = len(tt.details)
    detail_items = [map_detail_to_response(d) for d in tt.details]
    return TimetableResponse(
        timetable_id=tt.timetable_id,
        program_id=tt.program_id,
        academic_year_id=tt.academic_year_id,
        semester_id=tt.semester_id,
        name=tt.name,
        version_no=tt.version_no,
        status=tt.status,
        generated_at=tt.generated_at,
        active_from=tt.active_from,
        active_to=tt.active_to,
        is_locked=tt.is_locked,
        total_slots_scheduled=count,
        conflicts_count=0,
        details=detail_items,
    )


@router.get("/{timetable_id}/details", response_model=List[TimetableDetailResponse])
def get_timetable_details(timetable_id: int, db: Session = Depends(get_db)):
    details = (
        db.query(TimetableDetail)
        .filter_by(timetable_id=timetable_id)
        .join(TimeSlot)
        .order_by(TimeSlot.day_of_week, TimeSlot.global_order)
        .all()
    )
    return [map_detail_to_response(d) for d in details]


@router.get("/section/{section_id}/week", response_model=List[TimetableDetailResponse])
def get_section_week_timetable(section_id: int, db: Session = Depends(get_db)):
    tt = (
        db.query(Timetable)
        .filter(Timetable.status.in_(["Active", "Generated"]))
        .order_by(Timetable.status == "Active", Timetable.timetable_id.desc())
        .first()
    )
    if not tt:
        return []

    details = (
        db.query(TimetableDetail)
        .filter(
            TimetableDetail.timetable_id == tt.timetable_id,
            TimetableDetail.section_id == section_id,
        )
        .all()
    )
    return [map_detail_to_response(d, db=db) for d in details]


@router.get("/teacher/{teacher_id}/week", response_model=List[TimetableDetailResponse])
def get_teacher_week_timetable(teacher_id: int, db: Session = Depends(get_db)):
    tt = (
        db.query(Timetable)
        .filter(Timetable.status.in_(["Active", "Generated"]))
        .order_by(Timetable.status == "Active", Timetable.timetable_id.desc())
        .first()
    )
    if not tt:
        return []

    details = (
        db.query(TimetableDetail)
        .filter(
            TimetableDetail.timetable_id == tt.timetable_id,
            TimetableDetail.teacher_id == teacher_id,
        )
        .all()
    )
    return [map_detail_to_response(d, db=db) for d in details]


def ensure_class_sessions_for_date(db: Session, target_date: date, tt: Timetable) -> List[ClassSession]:
    """
    Guarantees that real, persistent ClassSession records exist for the specified date.
    Syncs missing sessions from the active timetable details for that weekday.
    """
    weekday_str = target_date.strftime("%a")
    details = (
        db.query(TimetableDetail)
        .filter(TimetableDetail.timetable_id == tt.timetable_id)
        .join(TimeSlot)
        .filter(TimeSlot.day_of_week == weekday_str)
        .all()
    )
    created = []
    for d in details:
        existing = db.query(ClassSession).filter_by(
            timetable_id=tt.timetable_id,
            detail_id=d.detail_id,
            session_date=target_date,
        ).first()
        if not existing:
            cs = ClassSession(
                timetable_id=tt.timetable_id,
                detail_id=d.detail_id,
                section_id=d.section_id,
                subject_id=d.subject_id,
                teacher_id=d.teacher_id,
                room_id=d.room_id,
                slot_id=d.slot_id,
                is_lab=d.is_lab,
                session_date=target_date,
                week_type="Regular",
                status="Scheduled",
            )
            db.add(cs)
            created.append(cs)
    if created:
        db.commit()
    return created


def compute_session_status(
    s: ClassSession,
    target_d: date,
    sim_time: str,
    db: Session,
    viewer_teacher_id: Optional[int] = None,
) -> tuple[str, bool, bool, Optional[str], int]:
    """
    Computes strict lifecycle status, attendance locking, and role-based permissions.
    Returns:
      (status_str, can_mark_attendance, is_attendance_locked, lock_reason, att_count)
    """
    att_count = db.query(Attendance).filter_by(session_id=s.session_id).count()
    start_str = s.slot.start_time.strftime("%H:%M") if s.slot else "09:00"
    end_str = s.slot.end_time.strftime("%H:%M") if s.slot else "10:00"

    is_today = (target_d == date.today())
    if not is_today:
        if target_d < date.today():
            lifecycle = "Completed"
        else:
            lifecycle = "Upcoming"
    else:
        if sim_time < start_str:
            lifecycle = "Upcoming"
        elif start_str <= sim_time <= end_str:
            lifecycle = "Ongoing"
        else:
            lifecycle = "Completed"

    # Reassignment checks
    is_reassigned_away = False
    is_substitute_for_viewer = False
    sub_name = (
        s.substitute_teacher.user.full_name
        if (s.substitute_teacher and s.substitute_teacher.user)
        else None
    )

    if s.substitute_teacher_id:
        if viewer_teacher_id:
            if s.teacher_id == viewer_teacher_id and s.substitute_teacher_id != viewer_teacher_id:
                is_reassigned_away = True
            elif s.substitute_teacher_id == viewer_teacher_id:
                is_substitute_for_viewer = True

    # Lock logic
    if is_reassigned_away:
        can_mark = False
        is_locked = True
        lock_reason = f"Reassigned to Prof. {sub_name}. Only the substitute faculty can record attendance."
        stat = "Transferred" if s.status == "Transferred" else "Reassigned"
    elif not is_today:
        can_mark = False
        is_locked = True
        lock_reason = f"Attendance locked: Session is scheduled on {target_d.strftime('%a, %d %b %Y')}. Attendance can only be recorded on that exact date."
        stat = lifecycle
    elif lifecycle == "Upcoming":
        can_mark = False
        is_locked = True
        lock_reason = f"Attendance locked: Session begins at {start_str}. Opens strictly when class starts."
        stat = "Upcoming"
    elif lifecycle == "Ongoing":
        if att_count > 0:
            can_mark = True
            is_locked = False
            lock_reason = f"Attendance recorded ({att_count} marked). You can update it until {end_str}."
            stat = "Ongoing"
        else:
            can_mark = True
            is_locked = False
            lock_reason = None
            stat = "Ongoing"
    else:  # lifecycle == "Completed"
        if att_count > 0:
            can_mark = False
            is_locked = True
            lock_reason = f"Attendance recorded ({att_count} marked). Session window completed."
            stat = "Completed"
        else:
            can_mark = False
            is_locked = True
            lock_reason = f"Attendance window closed at {end_str}. Lectures can only be marked during their scheduled time slot."
            stat = "Completed"

    return (stat, can_mark, is_locked, lock_reason, att_count)


@router.get("/student/today", response_model=List[ClassSessionResponse])
def get_student_today_classes(
    target_date: Optional[date] = None,
    simulated_time: Optional[str] = None,
    current_user: User = Depends(require_roles("Student")),
    db: Session = Depends(get_db),
):
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found")

    today_d = date.today()
    if not target_date:
        target_date = today_d

    if not simulated_time:
        simulated_time = datetime.now().strftime("%H:%M")

    active_tt = (
        db.query(Timetable)
        .filter(Timetable.status == "Active")
        .order_by(Timetable.timetable_id.desc())
        .first()
    )
    if not active_tt:
        active_tt = db.query(Timetable).order_by(Timetable.timetable_id.desc()).first()

    if active_tt:
        ensure_class_sessions_for_date(db, target_date, active_tt)

    query = db.query(ClassSession).filter(
        ClassSession.section_id == student.section_id,
        ClassSession.session_date == target_date,
    )
    if active_tt:
        query = query.filter(ClassSession.timetable_id == active_tt.timetable_id)

    raw_sessions = query.join(TimeSlot).order_by(TimeSlot.global_order).all()

    seen_slots = set()
    sessions = []
    for s in raw_sessions:
        if s.slot_id not in seen_slots:
            seen_slots.add(s.slot_id)
            sessions.append(s)

    res = []
    for s in sessions:
        sub_name = s.substitute_teacher.user.full_name if (s.substitute_teacher and s.substitute_teacher.user) else None
        orig_name = s.teacher.user.full_name if (s.teacher and s.teacher.user) else "Faculty"
        is_reassigned = bool(s.substitute_teacher_id)
        effective_t_id = s.substitute_teacher_id if is_reassigned else s.teacher_id
        effective_t_name = sub_name if is_reassigned else orig_name
        reassign_type = "Faculty Leave Coverage" if s.leave_request_id else ("Peer Transfer" if s.status == "Transferred" else None)

        stat, can_mark, is_locked, lock_reason, att_count = compute_session_status(
            s, target_date, simulated_time, db, viewer_teacher_id=None
        )
        att = db.query(Attendance).filter_by(session_id=s.session_id, student_id=student.student_id).first()
        my_status = att.status if att else None
        my_rem = att.remarks if att else None

        res.append(
            ClassSessionResponse(
                session_id=s.session_id,
                section_id=s.section_id,
                section_name=s.section.section_name if s.section else "",
                subject_id=s.subject_id,
                subject_code=s.subject.subject_code if s.subject else "",
                subject_name=s.subject.name if s.subject else "",
                teacher_id=s.teacher_id,
                teacher_name=orig_name,
                substitute_teacher_id=s.substitute_teacher_id,
                substitute_teacher_name=sub_name,
                is_reassigned=is_reassigned,
                reassignment_type=reassign_type,
                effective_teacher_id=effective_t_id,
                effective_teacher_name=effective_t_name,
                room_id=s.room_id,
                room_code=s.room.room_code if s.room else "",
                slot_id=s.slot_id,
                start_time=s.slot.start_time.strftime("%H:%M") if s.slot else "",
                end_time=s.slot.end_time.strftime("%H:%M") if s.slot else "",
                session_date=s.session_date,
                status=stat,
                is_lab=s.is_lab,
                can_mark_attendance=False,
                is_attendance_locked=True,
                lock_reason=lock_reason,
                attendance_marked=(att_count > 0),
                attendance_count=att_count,
                my_attendance_status=my_status,
                my_remarks=my_rem,
            )
        )
    return res


@router.get("/teacher/today", response_model=List[ClassSessionResponse])
def get_teacher_today_classes(
    target_date: Optional[date] = None,
    simulated_time: Optional[str] = None,
    current_user: User = Depends(require_roles("Teacher", "HOD", "Admin", "Principal")),
    db: Session = Depends(get_db),
):
    teacher = current_user.teacher_profile
    if not teacher:
        raise HTTPException(status_code=400, detail="Teacher profile not found")

    today_d = date.today()
    if not target_date:
        target_date = today_d

    if not simulated_time:
        simulated_time = datetime.now().strftime("%H:%M")

    active_tt = (
        db.query(Timetable)
        .filter(Timetable.status == "Active")
        .order_by(Timetable.timetable_id.desc())
        .first()
    )
    if not active_tt:
        active_tt = db.query(Timetable).order_by(Timetable.timetable_id.desc()).first()

    if active_tt:
        ensure_class_sessions_for_date(db, target_date, active_tt)

    t_query = db.query(ClassSession).filter(
        ClassSession.session_date == target_date,
        or_(
            # 1. Transferred or assigned to this teacher as substitute
            ClassSession.substitute_teacher_id == teacher.teacher_id,
            # 2. Regular faculty whose lecture has NOT been transferred away to another teacher
            and_(
                ClassSession.teacher_id == teacher.teacher_id,
                or_(
                    ClassSession.substitute_teacher_id == None,
                    ClassSession.substitute_teacher_id == teacher.teacher_id,
                ),
                ClassSession.status != "Transferred",
            ),
        ),
    )
    if active_tt:
        t_query = t_query.filter(ClassSession.timetable_id == active_tt.timetable_id)

    raw_t_sessions = t_query.join(TimeSlot).order_by(TimeSlot.global_order).all()

    seen_t_slots = set()
    sessions = []
    for s in raw_t_sessions:
        if s.slot_id not in seen_t_slots:
            seen_t_slots.add(s.slot_id)
            sessions.append(s)

    res = []
    for s in sessions:
        sub_name = s.substitute_teacher.user.full_name if (s.substitute_teacher and s.substitute_teacher.user) else None
        orig_name = s.teacher.user.full_name if (s.teacher and s.teacher.user) else "Faculty"
        is_reassigned = bool(s.substitute_teacher_id)
        effective_t_id = s.substitute_teacher_id if is_reassigned else s.teacher_id
        effective_t_name = sub_name if is_reassigned else orig_name
        reassign_type = "Faculty Leave Coverage" if s.leave_request_id else ("Peer Transfer" if s.status == "Transferred" else None)

        stat, can_mark, is_locked, lock_reason, att_count = compute_session_status(
            s, target_date, simulated_time, db, viewer_teacher_id=teacher.teacher_id
        )

        res.append(
            ClassSessionResponse(
                session_id=s.session_id,
                section_id=s.section_id,
                section_name=s.section.section_name if s.section else "",
                subject_id=s.subject_id,
                subject_code=s.subject.subject_code if s.subject else "",
                subject_name=s.subject.name if s.subject else "",
                teacher_id=s.teacher_id,
                teacher_name=orig_name,
                substitute_teacher_id=s.substitute_teacher_id,
                substitute_teacher_name=sub_name,
                is_reassigned=is_reassigned,
                reassignment_type=reassign_type,
                effective_teacher_id=effective_t_id,
                effective_teacher_name=effective_t_name,
                room_id=s.room_id,
                room_code=s.room.room_code if s.room else "",
                slot_id=s.slot_id,
                start_time=s.slot.start_time.strftime("%H:%M") if s.slot else "",
                end_time=s.slot.end_time.strftime("%H:%M") if s.slot else "",
                session_date=s.session_date,
                status=stat,
                is_lab=s.is_lab,
                can_mark_attendance=can_mark,
                is_attendance_locked=is_locked,
                lock_reason=lock_reason,
                attendance_marked=(att_count > 0),
                attendance_count=att_count,
                my_attendance_status=None,
                my_remarks=None,
            )
        )
    return res
