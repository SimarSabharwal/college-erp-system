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
            elif s.teacher_id == teacher.teacher_id and s.status != "Transferred":
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

    def find_substitutes_for_session(self, session_id: int) -> List[Dict[str, Any]]:
        session = self.db.query(ClassSession).filter_by(session_id=session_id).first()
        if not session:
            return []

        slot = self.db.query(TimeSlot).filter_by(slot_id=session.slot_id).first()
        if not slot:
            return []

        section = self.db.query(Section).filter_by(section_id=session.section_id).first()
        orig_teacher = self.db.query(Teacher).filter_by(teacher_id=session.teacher_id).first()

        # Find semester_id from section or program
        semester_id = 1
        if section and section.program:
            first_sem = self.db.query(Semester).filter_by(program_id=section.program_id).first()
            if first_sem:
                semester_id = first_sem.semester_id

        # 1. Qualified teachers for this subject
        qualified_records = (
            self.db.query(TeacherSubject)
            .join(Teacher, TeacherSubject.teacher_id == Teacher.teacher_id)
            .filter(
                TeacherSubject.subject_id == session.subject_id,
                TeacherSubject.can_teach == True,
                Teacher.is_active == True,
                Teacher.teacher_id != session.teacher_id,
            )
            .all()
        )

        candidates = []
        for ts in qualified_records:
            teacher = ts.teacher

            # 2. Check if on approved leave
            on_leave = (
                self.db.query(LeaveRequest)
                .filter(
                    LeaveRequest.teacher_id == teacher.teacher_id,
                    LeaveRequest.status == "Approved",
                    LeaveRequest.start_date <= session.session_date,
                    LeaveRequest.end_date >= session.session_date,
                )
                .first()
            )
            if on_leave:
                continue

            # 3. Check if already teaching another class at this slot
            existing_session = (
                self.db.query(ClassSession)
                .filter(
                    ClassSession.session_date == session.session_date,
                    ClassSession.slot_id == session.slot_id,
                    ClassSession.status.in_(["Scheduled", "Ongoing", "Completed", "Reassigned"]),
                )
                .all()
            )
            is_busy = False
            for es in existing_session:
                if es.substitute_teacher_id == teacher.teacher_id:
                    is_busy = True
                    break
                if es.teacher_id == teacher.teacher_id and es.status != "Transferred":
                    is_busy = True
                    break
            if is_busy:
                continue

            # 4. Check Teacher-Subject-Shift Lock (Constraint C-09)
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

            # 5. Check Continuity
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
                "priority": ts.priority,
            })

        # Rank candidates:
        # 1. Shift-lock matching first
        # 2. Continuity safe first
        # 3. Fewest classes today
        # 4. Same department
        # 5. Priority (1 = primary)
        candidates.sort(
            key=lambda c: (
                0 if c.get("is_shift_lock_match", True) else 1,
                0 if c["is_continuity_safe"] else 1,
                c["classes_today"],
                0 if c["is_same_dept"] else 1,
                c["priority"],
            )
        )

        return candidates
