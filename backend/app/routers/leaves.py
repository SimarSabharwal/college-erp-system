from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models import (
    User,
    Teacher,
    ClassSession,
    LeaveRequest,
    LeaveSessionAssignment,
    TimetableChange,
)
from app.schemas.workflows import (
    ApplyLeaveRequest,
    LeaveResponse,
    LeaveDetailResponse,
    AffectedSessionResponse,
    HODActionRequest,
    AdminApproveRequest,
    AdminDenyRequest,
    CandidateSubstituteResponse,
)
from app.services.substitute_finder import SubstituteFinder
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/leaves", tags=["Leave Management"])


def map_leave_to_response(lr: LeaveRequest, db: Session) -> LeaveResponse:
    affected_count = (
        db.query(ClassSession)
        .filter(
            ClassSession.teacher_id == lr.teacher_id,
            ClassSession.session_date >= lr.start_date,
            ClassSession.session_date <= lr.end_date,
            ClassSession.status != "Cancelled",
        )
        .count()
    )

    hod_user = db.query(User).filter_by(user_id=lr.hod_reviewed_by).first() if lr.hod_reviewed_by else None
    admin_user = db.query(User).filter_by(user_id=lr.admin_reviewed_by).first() if lr.admin_reviewed_by else None
    sub = db.query(Teacher).filter_by(teacher_id=lr.suggested_sub_id).first() if lr.suggested_sub_id else None

    return LeaveResponse(
        leave_request_id=lr.leave_request_id,
        teacher_id=lr.teacher_id,
        teacher_name=lr.teacher.user.full_name if (lr.teacher and lr.teacher.user) else "",
        department_name=lr.teacher.department.name if (lr.teacher and lr.teacher.department) else "",
        leave_type=lr.leave_type,
        start_date=lr.start_date,
        end_date=lr.end_date,
        reason=lr.reason,
        status=lr.status,
        suggested_sub_id=lr.suggested_sub_id,
        suggested_sub_name=sub.user.full_name if (sub and sub.user) else None,
        hod_reviewed_by_name=hod_user.full_name if hod_user else None,
        hod_reviewed_at=lr.hod_reviewed_at,
        hod_note=lr.hod_note,
        admin_reviewed_by_name=admin_user.full_name if admin_user else None,
        admin_reviewed_at=lr.admin_reviewed_at,
        admin_note=lr.admin_note,
        created_at=lr.created_at,
        affected_sessions_count=affected_count,
    )


@router.post("/", response_model=LeaveResponse)
def apply_leave(
    payload: ApplyLeaveRequest,
    current_user: User = Depends(require_roles("Teacher", "HOD")),
    db: Session = Depends(get_db),
):
    teacher = current_user.teacher_profile
    if not teacher:
        raise HTTPException(status_code=400, detail="Teacher profile not found")

    if payload.start_date > payload.end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date")

    leave = LeaveRequest(
        teacher_id=teacher.teacher_id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        status="Pending_HOD",
        suggested_sub_id=payload.suggested_sub_id,
    )
    db.add(leave)
    db.flush()

    # Notify HOD of teacher's department
    NotificationService.notify_hod(
        db=db,
        department_id=teacher.department_id,
        type="LEAVE_REQUEST",
        title="New Faculty Leave Request",
        body=f"{current_user.full_name} has applied for {payload.leave_type} leave from {payload.start_date.strftime('%d %b')} to {payload.end_date.strftime('%d %b %Y')}.",
        related_id=leave.leave_request_id,
        related_type="leave_requests",
    )

    db.commit()
    db.refresh(leave)
    return map_leave_to_response(leave, db)


@router.get("/", response_model=List[LeaveResponse])
def get_leaves(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role_name = current_user.role.role_name if current_user.role else ""
    query = db.query(LeaveRequest).order_by(LeaveRequest.leave_request_id.desc())

    if role_name == "Teacher":
        teacher = current_user.teacher_profile
        if not teacher:
            return []
        query = query.filter(LeaveRequest.teacher_id == teacher.teacher_id)
    elif role_name == "HOD":
        if current_user.department_id:
            query = query.join(Teacher, LeaveRequest.teacher_id == Teacher.teacher_id).filter(
                Teacher.department_id == current_user.department_id
            )

    leaves = query.all()
    return [map_leave_to_response(lr, db) for lr in leaves]


@router.get("/{leave_id}", response_model=LeaveDetailResponse)
def get_leave_details(
    leave_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leave = db.query(LeaveRequest).filter_by(leave_request_id=leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    sessions = (
        db.query(ClassSession)
        .filter(
            ClassSession.teacher_id == leave.teacher_id,
            ClassSession.session_date >= leave.start_date,
            ClassSession.session_date <= leave.end_date,
            ClassSession.status != "Cancelled",
        )
        .order_by(ClassSession.session_date, ClassSession.slot_id)
        .all()
    )

    affected = []
    for s in sessions:
        sub_name = (
            s.substitute_teacher.user.full_name
            if (s.substitute_teacher and s.substitute_teacher.user)
            else None
        )
        affected.append(
            AffectedSessionResponse(
                session_id=s.session_id,
                session_date=s.session_date,
                subject_id=s.subject_id,
                subject_code=s.subject.subject_code if s.subject else "",
                subject_name=s.subject.name if s.subject else "",
                section_name=s.section.section_name if s.section else "",
                room_code=s.room.room_code if s.room else "",
                slot_id=s.slot_id,
                start_time=s.slot.start_time.strftime("%H:%M") if s.slot else "",
                end_time=s.slot.end_time.strftime("%H:%M") if s.slot else "",
                slot_order=s.slot.slot_order if s.slot else 1,
                substitute_teacher_id=s.substitute_teacher_id,
                substitute_teacher_name=sub_name,
                status=s.status,
            )
        )

    return LeaveDetailResponse(
        leave=map_leave_to_response(leave, db),
        affected_sessions=affected,
    )


@router.post("/{leave_id}/hod-forward", response_model=LeaveResponse)
def hod_forward_leave(
    leave_id: int,
    payload: HODActionRequest,
    current_user: User = Depends(require_roles("HOD")),
    db: Session = Depends(get_db),
):
    leave = db.query(LeaveRequest).filter_by(leave_request_id=leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave.status != "Pending_HOD":
        raise HTTPException(status_code=400, detail=f"Cannot forward leave with status: {leave.status}")

    leave.status = "Pending_Admin"
    leave.hod_reviewed_by = current_user.user_id
    leave.hod_reviewed_at = datetime.now(timezone.utc)
    leave.hod_note = payload.note

    # Notify Admin(s)
    teacher_name = leave.teacher.user.full_name if (leave.teacher and leave.teacher.user) else "Faculty"
    NotificationService.notify_admins(
        db=db,
        type="LEAVE_FORWARDED",
        title="Leave Request Forwarded by HOD",
        body=f"HOD {current_user.full_name} forwarded a {leave.leave_type} leave request for {teacher_name} ({leave.start_date.strftime('%d %b')} - {leave.end_date.strftime('%d %b %Y')}). Reassignment needed.",
        related_id=leave.leave_request_id,
        related_type="leave_requests",
    )

    db.commit()
    db.refresh(leave)
    return map_leave_to_response(leave, db)


@router.post("/{leave_id}/hod-deny", response_model=LeaveResponse)
def hod_deny_leave(
    leave_id: int,
    payload: HODActionRequest,
    current_user: User = Depends(require_roles("HOD")),
    db: Session = Depends(get_db),
):
    leave = db.query(LeaveRequest).filter_by(leave_request_id=leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave.status != "Pending_HOD":
        raise HTTPException(status_code=400, detail=f"Cannot deny leave with status: {leave.status}")

    leave.status = "Denied_HOD"
    leave.hod_reviewed_by = current_user.user_id
    leave.hod_reviewed_at = datetime.now(timezone.utc)
    leave.hod_note = payload.note

    # Notify applicant teacher
    if leave.teacher and leave.teacher.user_id:
        NotificationService.create_notification(
            db=db,
            user_id=leave.teacher.user_id,
            type="LEAVE_DENIED",
            title="Leave Request Denied by HOD",
            body=f"Your {leave.leave_type} leave request ({leave.start_date.strftime('%d %b')} - {leave.end_date.strftime('%d %b %Y')}) was denied by HOD: {payload.note or 'No reason provided.'}",
            related_id=leave.leave_request_id,
            related_type="leave_requests",
        )

    db.commit()
    db.refresh(leave)
    return map_leave_to_response(leave, db)


@router.get("/{leave_id}/substitutes")
def get_leave_substitutes(
    leave_id: int,
    current_user: User = Depends(require_roles("Admin", "Principal", "HOD")),
    db: Session = Depends(get_db),
):
    leave = db.query(LeaveRequest).filter_by(leave_request_id=leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    sessions = (
        db.query(ClassSession)
        .filter(
            ClassSession.teacher_id == leave.teacher_id,
            ClassSession.session_date >= leave.start_date,
            ClassSession.session_date <= leave.end_date,
            ClassSession.status != "Cancelled",
        )
        .order_by(ClassSession.session_date, ClassSession.slot_id)
        .all()
    )

    finder = SubstituteFinder(db)
    result = []
    for s in sessions:
        candidates = finder.find_substitutes_for_session(s.session_id)
        sub_name = s.substitute_teacher.user.full_name if (s.substitute_teacher and s.substitute_teacher.user) else None
        session_info = AffectedSessionResponse(
            session_id=s.session_id,
            session_date=s.session_date,
            subject_id=s.subject_id,
            subject_code=s.subject.subject_code if s.subject else "",
            subject_name=s.subject.name if s.subject else "",
            section_name=s.section.section_name if s.section else "",
            room_code=s.room.room_code if s.room else "",
            slot_id=s.slot_id,
            start_time=s.slot.start_time.strftime("%H:%M") if s.slot else "",
            end_time=s.slot.end_time.strftime("%H:%M") if s.slot else "",
            slot_order=s.slot.slot_order if s.slot else 1,
            substitute_teacher_id=s.substitute_teacher_id,
            substitute_teacher_name=sub_name,
            status=s.status,
        )
        result.append({
            "session": session_info,
            "candidates": [CandidateSubstituteResponse(**c) for c in candidates],
        })

    return result


@router.post("/{leave_id}/admin-approve", response_model=LeaveResponse)
def admin_approve_leave(
    leave_id: int,
    payload: AdminApproveRequest,
    current_user: User = Depends(require_roles("Admin", "Principal")),
    db: Session = Depends(get_db),
):
    leave = db.query(LeaveRequest).filter_by(leave_request_id=leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave.status not in ("Pending_Admin", "Pending_HOD"):
        raise HTTPException(status_code=400, detail=f"Cannot approve leave with status: {leave.status}")

    # Process substitute assignments
    teacher_name = leave.teacher.user.full_name if (leave.teacher and leave.teacher.user) else "Faculty"

    for assign in payload.assignments:
        session = db.query(ClassSession).filter_by(session_id=assign.session_id).first()
        sub = db.query(Teacher).filter_by(teacher_id=assign.substitute_teacher_id).first()
        if not session or not sub:
            continue

        # Create leave session assignment record
        lsa = LeaveSessionAssignment(
            leave_request_id=leave.leave_request_id,
            session_id=session.session_id,
            substitute_teacher_id=sub.teacher_id,
            assigned_by=current_user.user_id,
            continuity_override=assign.continuity_override,
            override_reason=assign.override_reason,
        )
        db.add(lsa)

        # Update session
        session.substitute_teacher_id = sub.teacher_id
        session.status = "Reassigned"
        session.leave_request_id = leave.leave_request_id

        # Notify assigned substitute teacher
        slot_label = f"{session.slot.start_time.strftime('%H:%M')}-{session.slot.end_time.strftime('%H:%M')}" if session.slot else ""
        sub_subject = session.subject.name if session.subject else "Class"
        sub_room = session.room.room_code if session.room else ""
        NotificationService.create_notification(
            db=db,
            user_id=sub.user_id,
            type="CLASS_ASSIGNED",
            title="Class Reassignment (Faculty Leave Coverage)",
            body=f"You have been assigned {sub_subject} ({sub_room}) on {session.session_date.strftime('%d %b %Y')} ({slot_label}) covering for Prof. {teacher_name}.",
            related_id=leave.leave_request_id,
            related_type="leave_requests",
        )

    leave.status = "Approved"
    leave.admin_reviewed_by = current_user.user_id
    leave.admin_reviewed_at = datetime.now(timezone.utc)
    leave.admin_note = payload.note

    # Notify applicant teacher
    if leave.teacher and leave.teacher.user_id:
        NotificationService.create_notification(
            db=db,
            user_id=leave.teacher.user_id,
            type="LEAVE_APPROVED",
            title="Leave Request Approved",
            body=f"Your {leave.leave_type} leave request ({leave.start_date.strftime('%d %b')} - {leave.end_date.strftime('%d %b %Y')}) has been approved. Substitutes have been assigned.",
            related_id=leave.leave_request_id,
            related_type="leave_requests",
        )

    db.commit()
    db.refresh(leave)
    return map_leave_to_response(leave, db)


@router.post("/{leave_id}/admin-deny", response_model=LeaveResponse)
def admin_deny_leave(
    leave_id: int,
    payload: AdminDenyRequest,
    current_user: User = Depends(require_roles("Admin", "Principal")),
    db: Session = Depends(get_db),
):
    leave = db.query(LeaveRequest).filter_by(leave_request_id=leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leave.status = "Denied_Admin"
    leave.admin_reviewed_by = current_user.user_id
    leave.admin_reviewed_at = datetime.now(timezone.utc)
    leave.admin_note = payload.note

    # Notify applicant teacher
    if leave.teacher and leave.teacher.user_id:
        NotificationService.create_notification(
            db=db,
            user_id=leave.teacher.user_id,
            type="LEAVE_DENIED",
            title="Leave Request Denied by Admin",
            body=f"Your {leave.leave_type} leave request ({leave.start_date.strftime('%d %b')} - {leave.end_date.strftime('%d %b %Y')}) was denied by Admin: {payload.note or 'No reason provided.'}",
            related_id=leave.leave_request_id,
            related_type="leave_requests",
        )

    db.commit()
    db.refresh(leave)
    return map_leave_to_response(leave, db)


@router.post("/{leave_id}/cancel", response_model=LeaveResponse)
def cancel_leave(
    leave_id: int,
    current_user: User = Depends(require_roles("Teacher", "HOD")),
    db: Session = Depends(get_db),
):
    teacher = current_user.teacher_profile
    leave = db.query(LeaveRequest).filter_by(leave_request_id=leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if leave.teacher_id != teacher.teacher_id:
        raise HTTPException(status_code=403, detail="You can only cancel your own leave requests")

    if leave.status not in ("Pending_HOD", "Pending_Admin"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel leave request in status: {leave.status}")

    leave.status = "Cancelled"
    db.commit()
    db.refresh(leave)
    return map_leave_to_response(leave, db)
