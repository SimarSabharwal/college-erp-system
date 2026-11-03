from datetime import date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import (
    Teacher,
    TeacherSubject,
    TimeSlot,
    ClassSession,
    LeaveRequest,
    TeacherSubjectShiftLock,
    Semester,
    Program,
    Section,
)
from app.models.scheduling import Timetable, TimetableDetail

BREAK_AFTER_GLOBAL_ORDERS = {2, 6}


class SubstituteFinder:
    def __init__(self, db: Session):
        self.db = db

    def check_continuity(
        self,
        teacher: Teacher,
        session_date: date,
        candidate_global_order: int,
    ) -> Dict[str, Any]:
        """
        Calculates if adding candidate_global_order on session_date creates a consecutive run
        exceeding teacher.max_consecutive_slots.
        """
        max_consecutive = teacher.max_consecutive_slots or 2

        # Find all active sessions for this teacher on this date
        sessions = (
            self.db.query(ClassSession)
            .join(TimeSlot, ClassSession.slot_id == TimeSlot.slot_id)
            .filter(
                ClassSession.session_date == session_date,
                ClassSession.status.in_(["Scheduled", "Ongoing", "Completed", "Reassigned"]),
            )
            .all()
        )

        occupied_orders = set()
        for s in sessions:
            # If teacher is covering as substitute, or original teacher and not transferred
            is_active_for_teacher = False
            if s.substitute_teacher_id == teacher.teacher_id:
                is_active_for_teacher = True
            elif s.teacher_id == teacher.teacher_id and s.status != "Transferred" and (not s.substitute_teacher_id or s.substitute_teacher_id == teacher.teacher_id):
                is_active_for_teacher = True

            if is_active_for_teacher and s.slot:
                occupied_orders.add(s.slot.global_order)

        candidate_orders = sorted(occupied_orders | {candidate_global_order})

        if not candidate_orders:
            return {"is_safe": True, "consecutive_count": 1, "warning": None}

        runs = []
        current_run = [candidate_orders[0]]
        for i in range(1, len(candidate_orders)):
            prev = candidate_orders[i - 1]
            curr = candidate_orders[i]
            # Consecutive only if adjacent and no structural break after prev
            if curr == prev + 1 and prev not in BREAK_AFTER_GLOBAL_ORDERS:
                current_run.append(curr)
            else:
                runs.append(current_run)
                current_run = [curr]
        runs.append(current_run)

        max_run = max(len(r) for r in runs)
        is_safe = max_run <= max_consecutive
        warning = None
        if not is_safe:
            warning = f"Assigning this class gives {teacher.user.full_name if teacher.user else 'faculty'} {max_run} consecutive lectures with no break."

        return {
            "is_safe": is_safe,
            "consecutive_count": max_run,
            "warning": warning,
            "classes_on_date": len(occupied_orders),
        }

    def is_teacher_free_for_session(self, teacher_id: int, session: ClassSession) -> tuple[bool, Optional[str]]:
        """
        Determines whether a teacher is free to take a lecture at session.session_date and session.slot.
        Returns:
            (is_free: bool, busy_reason: Optional[str])
        """
        teacher = self.db.query(Teacher).filter_by(teacher_id=teacher_id).first()
        if not teacher or not teacher.is_active:
            return (False, "Teacher is inactive or not found")

        # 1. Leave Check
        on_leave = (
            self.db.query(LeaveRequest)
            .filter(
                LeaveRequest.teacher_id == teacher_id,
                LeaveRequest.status == "Approved",
                LeaveRequest.start_date <= session.session_date,
                LeaveRequest.end_date >= session.session_date,
            )
            .first()
        )
        if on_leave:
            return (False, f"On approved {on_leave.leave_type} leave on this date ({session.session_date.strftime('%d %b %Y')})")

        slot = session.slot
        if not slot:
            return (True, None)

        target_start = slot.start_time
        target_end = slot.end_time

        # 2. Check active ClassSessions on session.session_date
        day_sessions = (
            self.db.query(ClassSession)
            .filter(
                ClassSession.session_date == session.session_date,
                ClassSession.session_id != session.session_id,
                ClassSession.status.in_(["Scheduled", "Ongoing", "Completed", "Reassigned"]),
            )
            .all()
        )

        for s in day_sessions:
            is_teaching = False
            if s.substitute_teacher_id == teacher_id:
                is_teaching = True
            elif s.teacher_id == teacher_id and s.status != "Transferred" and (not s.substitute_teacher_id or s.substitute_teacher_id == teacher_id):
                is_teaching = True

            if is_teaching and s.slot:
                # Time window overlap: s.slot.start_time < target_end and s.slot.end_time > target_start
                if s.slot.start_time < target_end and s.slot.end_time > target_start:
                    subj_name = s.subject.name if s.subject else "Class"
                    room_code = s.room.room_code if s.room else "Room"
                    time_str = f"{s.slot.start_time.strftime('%H:%M')}-{s.slot.end_time.strftime('%H:%M')}"
                    role_desc = "covering" if s.substitute_teacher_id == teacher_id else "teaching"
                    return (False, f"Already {role_desc} {subj_name} in Room {room_code} ({time_str})")

        # 3. Check active TimetableDetail for that day of week (in case not all ClassSessions were generated)
        active_tt = (
            self.db.query(Timetable)
            .filter(Timetable.status == "Active")
            .order_by(Timetable.timetable_id.desc())
            .first()
        )
        if active_tt:
            day_name = session.session_date.strftime("%a")  # "Mon", "Tue", etc.
            details = (
                self.db.query(TimetableDetail)
                .join(TimeSlot, TimetableDetail.slot_id == TimeSlot.slot_id)
                .filter(
                    TimetableDetail.timetable_id == active_tt.timetable_id,
                    TimetableDetail.teacher_id == teacher_id,
                    TimeSlot.day_of_week == day_name,
                )
                .all()
            )
            for d in details:
                if d.slot and d.slot.start_time < target_end and d.slot.end_time > target_start:
                    # Check if transferred away for this specific session_date
                    cs = (
                        self.db.query(ClassSession)
                        .filter(
                            ClassSession.detail_id == d.detail_id,
                            ClassSession.session_date == session.session_date,
                        )
                        .first()
                    )
                    if cs and cs.substitute_teacher_id and cs.substitute_teacher_id != teacher_id:
                        # Transferred away, so teacher is free from this slot
                        continue

                    subj_name = d.subject.name if d.subject else "Class"
                    room_code = d.room.room_code if d.room else "Room"
                    time_str = f"{d.slot.start_time.strftime('%H:%M')}-{d.slot.end_time.strftime('%H:%M')}"
                    return (False, f"Scheduled to teach {subj_name} in Room {room_code} ({time_str})")

        return (True, None)

    def find_substitutes_for_session(self, session_id: int) -> List[Dict[str, Any]]:
        session = self.db.query(ClassSession).filter_by(session_id=session_id).first()
        if not session:
            return []

        slot = self.db.query(TimeSlot).filter_by(slot_id=session.slot_id).first()
        if not slot:
            return []

        section = self.db.query(Section).filter_by(section_id=session.section_id).first()
        orig_teacher = self.db.query(Teacher).filter_by(teacher_id=session.teacher_id).first()

        semester_id = 1
        if section and section.program:
            first_sem = self.db.query(Semester).filter_by(program_id=section.program_id).first()
            if first_sem:
                semester_id = first_sem.semester_id

        # Query all active teachers except the teacher currently holding the session
        current_holding_id = session.substitute_teacher_id or session.teacher_id
        all_teachers = (
            self.db.query(Teacher)
            .filter(
                Teacher.is_active == True,
                Teacher.teacher_id != current_holding_id,
            )
            .all()
        )

        candidates = []
        for teacher in all_teachers:
            # 1. Check if teacher is free at this date and time
            is_free, busy_reason = self.is_teacher_free_for_session(teacher.teacher_id, session)

            # 2. Check if qualified for this specific subject
            ts = (
                self.db.query(TeacherSubject)
                .filter_by(
                    teacher_id=teacher.teacher_id,
                    subject_id=session.subject_id,
                    can_teach=True,
                )
                .first()
            )
            is_subject_qualified = bool(ts)
            priority = ts.priority if ts else 3

            # 3. Check Teacher-Subject-Shift Lock (Constraint C-09)
            lock = (
                self.db.query(TeacherSubjectShiftLock)
                .filter_by(
                    teacher_id=teacher.teacher_id,
                    subject_id=session.subject_id,
                    semester_id=semester_id,
                    is_active=True,
                )
                .first()
            )
            is_shift_lock_match = True
            shift_lock_note = None
            if lock and lock.shift_id != slot.shift_id:
                is_shift_lock_match = False
                shift_lock_note = "Shift-Lock notice: Faculty is designated to other shift for this subject."

            # 4. Check Continuity
            continuity_info = self.check_continuity(
                teacher=teacher,
                session_date=session.session_date,
                candidate_global_order=slot.global_order,
            )

            is_same_dept = (
                teacher.department_id == orig_teacher.department_id
                if (orig_teacher and teacher.department_id)
                else False
            )

            warning = continuity_info["warning"]
            if shift_lock_note:
                warning = f"{warning + ' | ' if warning else ''}{shift_lock_note}"
            if not is_free and busy_reason:
                warning = f"Busy: {busy_reason}"

            candidates.append({
                "teacher_id": teacher.teacher_id,
                "user_id": teacher.user_id,
                "full_name": teacher.user.full_name if teacher.user else "",
                "employee_no": teacher.employee_no,
                "designation": teacher.designation,
                "department_id": teacher.department_id,
                "department_name": teacher.department.name if teacher.department else "",
                "is_same_dept": is_same_dept,
                "classes_today": continuity_info["classes_on_date"],
                "is_continuity_safe": continuity_info["is_safe"],
                "consecutive_count": continuity_info["consecutive_count"],
                "continuity_warning": warning,
                "is_shift_lock_match": is_shift_lock_match,
                "priority": priority,
                "is_free": is_free,
                "busy_reason": busy_reason,
                "is_subject_qualified": is_subject_qualified,
            })

        # Rank candidates:
        # 1. Free teachers first! (is_free == True)
        # 2. Subject specialists first! (is_subject_qualified == True)
        # 3. Shift-lock matching first!
        # 4. Continuity safe first!
        # 5. Fewest classes today
        # 6. Same department
        # 7. Priority
        candidates.sort(
            key=lambda c: (
                0 if c["is_free"] else 1,
                0 if c["is_subject_qualified"] else 1,
                0 if c.get("is_shift_lock_match", True) else 1,
                0 if c["is_continuity_safe"] else 1,
                c["classes_today"],
                0 if c["is_same_dept"] else 1,
                c["priority"],
            )
        )

        return candidates
