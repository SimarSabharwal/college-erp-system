from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models import (
    User,
    Teacher,
    ClassSession,
    LectureTransfer,
    TimetableChange,
)
from app.schemas.workflows import (
    TransferRequest,
    TransferResponse,
    CandidateSubstituteResponse,
)
from app.services.substitute_finder import SubstituteFinder
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/transfers", tags=["Transfer Lecture"])


@router.get("/eligible-substitutes", response_model=List[CandidateSubstituteResponse])
def get_eligible_substitutes(
    session_id: int,
    current_user: User = Depends(require_roles("Teacher", "Admin", "HOD")),
    db: Session = Depends(get_db),
):
    finder = SubstituteFinder(db)
    candidates = finder.find_substitutes_for_session(session_id)
    return [CandidateSubstituteResponse(**c) for c in candidates]


@router.post("/", response_model=TransferResponse)
def execute_transfer(
    payload: TransferRequest,
    current_user: User = Depends(require_roles("Teacher", "HOD")),
    db: Session = Depends(get_db),
):
    teacher = current_user.teacher_profile
    if not teacher:
        raise HTTPException(status_code=400, detail="Teacher profile not found")

    session = db.query(ClassSession).filter_by(session_id=payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Class session not found")

    # Ensure teacher is currently responsible for this session
    current_owner_id = session.substitute_teacher_id or session.teacher_id
    if current_owner_id != teacher.teacher_id:
        raise HTTPException(status_code=403, detail="You can only transfer your own class sessions")

    if session.status in ("Cancelled", "Completed"):
        raise HTTPException(status_code=400, detail=f"Cannot transfer a session that is {session.status}")

    # Check candidate substitute
    sub_teacher = db.query(Teacher).filter_by(teacher_id=payload.substitute_teacher_id).first()
    if not sub_teacher or not sub_teacher.is_active:
        raise HTTPException(status_code=400, detail="Substitute teacher not found or inactive")

    # Run availability and eligibility check on substitute faculty
    finder = SubstituteFinder(db)
    is_free, busy_reason = finder.is_teacher_free_for_session(sub_teacher.teacher_id, session)
    if not is_free:
        sub_name = sub_teacher.user.full_name if sub_teacher.user else "Selected faculty"
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transfer lecture: Prof. {sub_name} is not free at this time ({session.slot.start_time.strftime('%H:%M') if session.slot else ''} - {session.slot.end_time.strftime('%H:%M') if session.slot else ''}). Reason: {busy_reason}."
        )

    candidates = finder.find_substitutes_for_session(session.session_id)
    candidate_match = next((c for c in candidates if c["teacher_id"] == sub_teacher.teacher_id), None)
    continuity_ok = candidate_match["is_continuity_safe"] if candidate_match else True

    # 1. Create transfer record
    transfer = LectureTransfer(
        session_id=session.session_id,
        requesting_teacher_id=teacher.teacher_id,
        substitute_teacher_id=sub_teacher.teacher_id,
        reason=payload.reason,
        status="Completed",
        continuity_checked=True,
        continuity_ok=continuity_ok,
    )
    db.add(transfer)

    # 2. Update ClassSession
    session.substitute_teacher_id = sub_teacher.teacher_id
    session.status = "Transferred"

    # 3. Log timetable change
    chg = TimetableChange(
        timetable_id=session.timetable_id,
        detail_id=session.detail_id,
        change_type="TRANSFER_LECTURE",
        old_value=f"Teacher: {teacher.user.full_name}",
        new_value=f"Substitute: {sub_teacher.user.full_name}",
        changed_by=current_user.user_id,
        reason=payload.reason or "Peer-to-peer transfer",
    )
    db.add(chg)

    # 4. Dispatch Notifications
    slot_label = f"{session.slot.start_time.strftime('%H:%M')}-{session.slot.end_time.strftime('%H:%M')}" if session.slot else ""
    subject_title = session.subject.name if session.subject else "Class"
    room_title = session.room.room_code if session.room else ""

    # Notify substitute teacher
    NotificationService.create_notification(
        db=db,
        user_id=sub_teacher.user_id,
        type="CLASS_ASSIGNED",
        title="New Class Assigned (Lecture Transfer)",
        body=f"You have been assigned {subject_title} ({room_title}) on {session.session_date.strftime('%d %b %Y')} ({slot_label}), transferred from {current_user.full_name}.",
        related_id=transfer.transfer_id,
        related_type="lecture_transfers",
    )

    # Notify Admin for awareness
    NotificationService.notify_admins(
        db=db,
        type="TRANSFER_NOTICE",
        title="Lecture Transfer Notice",
        body=f"{current_user.full_name} transferred {subject_title} ({room_title}) on {session.session_date.strftime('%d %b %Y')} to {sub_teacher.user.full_name}.",
        related_id=transfer.transfer_id,
        related_type="lecture_transfers",
    )

    db.commit()
    db.refresh(transfer)

    return TransferResponse(
        transfer_id=transfer.transfer_id,
        session_id=session.session_id,
        requesting_teacher_id=teacher.teacher_id,
        requesting_teacher_name=current_user.full_name,
        substitute_teacher_id=sub_teacher.teacher_id,
        substitute_teacher_name=sub_teacher.user.full_name if sub_teacher.user else "",
        reason=transfer.reason,
        status=transfer.status,
        transferred_at=transfer.transferred_at,
        session_date=session.session_date,
        subject_code=session.subject.subject_code if session.subject else "",
        subject_name=session.subject.name if session.subject else "",
        section_name=session.section.section_name if session.section else "",
        start_time=session.slot.start_time.strftime("%H:%M") if session.slot else "",
        end_time=session.slot.end_time.strftime("%H:%M") if session.slot else "",
    )


@router.get("/", response_model=List[TransferResponse])
def get_transfers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(LectureTransfer).order_by(LectureTransfer.transfer_id.desc())
    user_role = current_user.role.role_name if current_user.role else ""

    if user_role == "Teacher":
        teacher = current_user.teacher_profile
        if not teacher:
            return []
        query = query.filter(
            (LectureTransfer.requesting_teacher_id == teacher.teacher_id)
            | (LectureTransfer.substitute_teacher_id == teacher.teacher_id)
        )
    elif user_role == "HOD":
        if current_user.department_id:
            query = query.join(
                Teacher, LectureTransfer.requesting_teacher_id == Teacher.teacher_id
            ).filter(Teacher.department_id == current_user.department_id)

    transfers = query.all()
    results = []
    for t in transfers:
        s = t.session
        results.append(
            TransferResponse(
                transfer_id=t.transfer_id,
                session_id=t.session_id,
                requesting_teacher_id=t.requesting_teacher_id,
                requesting_teacher_name=t.requesting_teacher.user.full_name if (t.requesting_teacher and t.requesting_teacher.user) else "",
                substitute_teacher_id=t.substitute_teacher_id,
                substitute_teacher_name=t.substitute_teacher.user.full_name if (t.substitute_teacher and t.substitute_teacher.user) else "",
                reason=t.reason,
                status=t.status,
                transferred_at=t.transferred_at,
                session_date=s.session_date if s else datetime.now().date(),
                subject_code=s.subject.subject_code if (s and s.subject) else "",
                subject_name=s.subject.name if (s and s.subject) else "",
                section_name=s.section.section_name if (s and s.section) else "",
                start_time=s.slot.start_time.strftime("%H:%M") if (s and s.slot) else "",
                end_time=s.slot.end_time.strftime("%H:%M") if (s and s.slot) else "",
            )
        )
    return results
