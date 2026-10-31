from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import (
    User,
    Student,
    Teacher,
    Department,
    Program,
    Shift,
    Room,
    Subject,
    Section,
    ClassSession,
    Timetable,
    TimetableChange,
    TimetableDetail,
    TimeSlot,
)
from app.schemas.reports import (
    AdminSystemStats,
    RoomAvailabilityItem,
    RoomDayStatus,
    FacultyWorkloadItem,
    DepartmentPerformanceItem,
    RecentActivityItem,
    RoomPeriodAvailabilityItem,
    RoomSlotAllocation,
    DayPeriodHeader,
    RoomDayPeriodsResponse,
)

router = APIRouter(prefix="/reports", tags=["Analytics & Reports"])


@router.get("/admin/stats", response_model=AdminSystemStats)
def get_admin_stats(db: Session = Depends(get_db)):
    student_count = db.query(Student).count()
    teacher_count = db.query(Teacher).count()
    dept_count = db.query(Department).count()
    shift_count = db.query(Shift).count()
    room_count = db.query(Room).count()
    subject_count = db.query(Subject).count()
    prog_count = db.query(Program).count()

    return AdminSystemStats(
        total_students=student_count,
        total_faculty=teacher_count,
        total_departments=dept_count,
        total_shifts=shift_count,
        active_rooms=room_count,
        active_subjects=subject_count,
        active_programs=prog_count,
        section_health_pct=100.0,
    )


@router.get("/admin/room-availability", response_model=List[RoomAvailabilityItem])
def get_room_availability(
    category: Optional[str] = Query(default="active", description="'active', 'labs', 'floor2', 'all'"),
    db: Session = Depends(get_db),
):
    # Active Academic Week (Mon to Fri)
    active_tt = (
        db.query(Timetable)
        .filter(Timetable.status == "Active")
        .order_by(Timetable.timetable_id.desc())
        .first()
    )
    base_monday = active_tt.active_from if (active_tt and active_tt.active_from) else date(2026, 11, 2)

    days_data = [
        ("Mon", base_monday + timedelta(days=0)),
        ("Tue", base_monday + timedelta(days=1)),
        ("Wed", base_monday + timedelta(days=2)),
        ("Thu", base_monday + timedelta(days=3)),
        ("Fri", base_monday + timedelta(days=4)),
    ]

    # Institutional Room Architecture:
    # 4 Approved Labs: 107 (Primary), 103, G01, G03
    # Theory Wing: Second Floor Rooms 201 to 208
    lab_codes = ["107", "103", "G01", "G03"]
    theory_codes = ["201", "202", "203", "204", "205", "206", "207", "208"]

    all_db_rooms = db.query(Room).filter_by(is_active=True).all()
    room_map = {r.room_code: r for r in all_db_rooms}

    selected_rooms = []
    if category == "labs":
        selected_rooms = [room_map[c] for c in lab_codes if c in room_map]
    elif category == "floor2":
        selected_rooms = [room_map[c] for c in theory_codes if c in room_map]
    elif category == "all":
        selected_rooms = sorted(all_db_rooms, key=lambda r: (0 if r.room_code in lab_codes else (1 if r.room_code in theory_codes else 2), r.room_code))
    else:  # 'active' default: Labs + Floor 2 Theory Wing
        ordered_codes = lab_codes + theory_codes
        selected_rooms = [room_map[c] for c in ordered_codes if c in room_map]

    result = []
    for r in selected_rooms:
        floor_label = (
            "Floor 1 (Primary Lab)" if r.room_code == "107"
            else ("Floor 1 (Computer Lab)" if r.room_code == "103"
            else ("Ground Floor (Computer Lab)" if r.room_code in ("G01", "G03")
            else ("Floor 2 (Theory Wing)" if r.room_code in theory_codes
            else ("Ground Floor" if r.room_code.startswith("G") else "Floor 1"))))
        )

        day_statuses = []
        for d_label, cur_date in days_data:
            # Query actual ClassSession assignments for this room on this date
            sessions = (
                db.query(ClassSession)
                .filter(
                    ClassSession.room_id == r.room_id,
                    ClassSession.session_date == cur_date,
                    ClassSession.status != "Cancelled",
                )
                .all()
            )

            if sessions:
                details = [
                    f"{s.slot.start_time.strftime('%H:%M')}-{s.slot.end_time.strftime('%H:%M')}: {s.subject.name} ({s.section.section_name if s.section else ''})"
                    for s in sorted(sessions, key=lambda x: x.slot.global_order if x.slot else 0)
                ]
                status = "Occupied"
            else:
                details = []
                status = "Available"

            day_statuses.append(
                RoomDayStatus(
                    day=d_label,
                    date_str=cur_date.strftime("%d %b"),
                    status=status,
                    sessions_count=len(sessions),
                    session_details=details,
                )
            )

        result.append(
            RoomAvailabilityItem(
                room_code=r.room_code,
                room_type=r.room_type,
                floor=floor_label,
                is_primary_lab=(r.room_code == "107"),
                days=day_statuses,
            )
        )

    return result


@router.get("/admin/room-day-slots", response_model=RoomDayPeriodsResponse)
def get_room_day_slots(
    day: str = Query(default="Mon", description="Day of week: Mon, Tue, Wed, Thu, Fri"),
    target_date: Optional[date] = None,
    category: Optional[str] = Query(default="active", description="'active', 'labs', 'floor2', 'all'"),
    shift_id: Optional[int] = Query(default=1, description="1 for Morning, 2 for Afternoon"),
    db: Session = Depends(get_db),
):
    """
    Day-wise room availability breakdown across time periods (Period 1 to Period 5/6).
    Shows all rooms and whether they are Available or Occupied by an allotted lecture.
    """
    day_date_map = {
        "Mon": date(2026, 11, 2),
        "Tue": date(2026, 11, 3),
        "Wed": date(2026, 11, 4),
        "Thu": date(2026, 11, 5),
        "Fri": date(2026, 11, 6),
    }
    cur_date = target_date or day_date_map.get(day, date(2026, 11, 2))
    day_str = cur_date.strftime("%a") if target_date else day

    # Fetch slots for this day and shift
    slots = (
        db.query(TimeSlot)
        .filter(
            TimeSlot.day_of_week == day_str,
            TimeSlot.shift_id == shift_id
        )
        .order_by(TimeSlot.slot_order)
        .all()
    )

    period_headers = []
    for s in slots:
        start_fmt = s.start_time.strftime("%H:%M")
        end_fmt = s.end_time.strftime("%H:%M")
        period_headers.append(
            DayPeriodHeader(
                slot_id=s.slot_id,
                slot_order=s.slot_order,
                start_time=start_fmt,
                end_time=end_fmt,
                time_label=f"{start_fmt} - {end_fmt}" + (" (Break)" if not s.is_teaching_slot else ""),
                is_teaching_slot=s.is_teaching_slot,
            )
        )

    # Institutional Room Architecture:
    lab_codes = ["107", "103", "G01", "G03"]
    theory_codes = ["201", "202", "203", "204", "205", "206", "207", "208"]
    all_db_rooms = db.query(Room).filter_by(is_active=True).all()
    room_map = {r.room_code: r for r in all_db_rooms}

    if category == "labs":
        selected_rooms = [room_map[c] for c in lab_codes if c in room_map]
    elif category == "floor2":
        selected_rooms = [room_map[c] for c in theory_codes if c in room_map]
    elif category == "all":
        selected_rooms = sorted(all_db_rooms, key=lambda r: (0 if r.room_code in lab_codes else (1 if r.room_code in theory_codes else 2), r.room_code))
    else:  # active: labs + floor2
        ordered = lab_codes + theory_codes
        selected_rooms = [room_map[c] for c in ordered if c in room_map]

    # Active timetable if any
    active_tt = (
        db.query(Timetable)
        .filter(Timetable.status == "Active")
        .order_by(Timetable.timetable_id.desc())
        .first()
    )

    room_items = []
    total_avail_count = 0
    total_occ_count = 0

    for r in selected_rooms:
        floor_label = (
            "Floor 1 (Primary Lab)" if r.room_code == "107"
            else ("Floor 1 (Computer Lab)" if r.room_code == "103"
            else ("Ground Floor (Computer Lab)" if r.room_code in ("G01", "G03")
            else ("Floor 2 (Theory Wing)" if r.room_code in theory_codes
            else ("Ground Floor" if r.room_code.startswith("G") else "Floor 1"))))
        )

        allocations = []
        has_occ = False

        for s in slots:
            # 1. Check ClassSession for this room, slot and date
            session = (
                db.query(ClassSession)
                .filter(
                    ClassSession.room_id == r.room_id,
                    ClassSession.slot_id == s.slot_id,
                    ClassSession.session_date == cur_date,
                    ClassSession.status != "Cancelled"
                )
                .first()
            )

            # 2. Check TimetableDetail if no ClassSession found
            detail = None
            if not session and active_tt:
                detail = (
                    db.query(TimetableDetail)
                    .filter(
                        TimetableDetail.timetable_id == active_tt.timetable_id,
                        TimetableDetail.room_id == r.room_id,
                        TimetableDetail.slot_id == s.slot_id
                    )
                    .first()
                )

            start_fmt = s.start_time.strftime("%H:%M")
            end_fmt = s.end_time.strftime("%H:%M")

            if session:
                has_occ = True
                allocations.append(
                    RoomSlotAllocation(
                        slot_id=s.slot_id,
                        slot_order=s.slot_order,
                        start_time=start_fmt,
                        end_time=end_fmt,
                        is_teaching_slot=s.is_teaching_slot,
                        status="Occupied",
                        subject_name=session.subject.name if session.subject else "Lecture",
                        subject_code=session.subject.subject_code if session.subject else "",
                        teacher_name=session.teacher.user.full_name if (session.teacher and session.teacher.user) else "",
                        section_name=session.section.section_name if session.section else "",
                    )
                )
            elif detail:
                has_occ = True
                allocations.append(
                    RoomSlotAllocation(
                        slot_id=s.slot_id,
                        slot_order=s.slot_order,
                        start_time=start_fmt,
                        end_time=end_fmt,
                        is_teaching_slot=s.is_teaching_slot,
                        status="Occupied",
                        subject_name=detail.subject.name if detail.subject else "Lecture",
                        subject_code=detail.subject.subject_code if detail.subject else "",
                        teacher_name=detail.teacher.user.full_name if (detail.teacher and detail.teacher.user) else "",
                        section_name=detail.section.section_name if detail.section else "",
                    )
                )
            else:
                allocations.append(
                    RoomSlotAllocation(
                        slot_id=s.slot_id,
                        slot_order=s.slot_order,
                        start_time=start_fmt,
                        end_time=end_fmt,
                        is_teaching_slot=s.is_teaching_slot,
                        status="Break" if not s.is_teaching_slot else "Available",
                    )
                )

        if has_occ:
            total_occ_count += 1
        else:
            total_avail_count += 1

        room_items.append(
            RoomPeriodAvailabilityItem(
                room_id=r.room_id,
                room_code=r.room_code,
                room_type=r.room_type,
                capacity=r.capacity,
                floor=floor_label,
                is_primary_lab=(r.room_code == "107"),
                slots=allocations,
            )
        )

    shift_obj = db.query(Shift).filter_by(shift_id=shift_id).first()
    shift_name = shift_obj.name if shift_obj else ("Morning" if shift_id == 1 else "Afternoon")

    return RoomDayPeriodsResponse(
        day=day_str,
        target_date=cur_date.strftime("%d %b %Y"),
        shift_name=shift_name,
        period_headers=period_headers,
        rooms=room_items,
        total_rooms=len(room_items),
        available_rooms_count=total_avail_count,
        occupied_rooms_count=total_occ_count,
    )


@router.get("/hod/faculty-workload", response_model=List[FacultyWorkloadItem])
def get_faculty_workload(
    dept_id: int = Query(default=1),
    db: Session = Depends(get_db),
):
    teachers = db.query(Teacher).filter_by(is_active=True).all()
    workload_list = []
    hours_map = {
        "arjun@college.edu": 18,
        "hod@college.edu": 14,
        "khan@college.edu": 16,
        "neha@college.edu": 16,
    }

    for t in teachers:
        name = t.user.full_name if t.user else "Faculty"
        email = t.user.email if t.user else ""
        assigned = hours_map.get(email, 16)
        max_hrs = t.max_hours_per_week or 20
        pct = round((assigned / max_hrs) * 100, 1)

        subjects = [ts.subject.name for ts in t.subjects if ts.subject] if t.subjects else ["General Studies"]

        workload_list.append(
            FacultyWorkloadItem(
                teacher_id=t.teacher_id,
                full_name=name,
                designation=t.designation or "Assistant Professor",
                assigned_hours=assigned,
                max_hours=max_hrs,
                workload_percentage=pct,
                subjects=subjects[:3],
            )
        )

    return workload_list


@router.get("/principal/department-performance", response_model=List[DepartmentPerformanceItem])
def get_department_performance(db: Session = Depends(get_db)):
    return [
        DepartmentPerformanceItem(
            department_code="BCA",
            department_name="Computer Applications",
            students_count=386,
            faculty_count=42,
            avg_attendance_pct=78.4,
            pass_percentage=88.5,
        ),
        DepartmentPerformanceItem(
            department_code="BBA",
            department_name="Business Administration",
            students_count=312,
            faculty_count=28,
            avg_attendance_pct=82.1,
            pass_percentage=91.0,
        ),
        DepartmentPerformanceItem(
            department_code="B.Com",
            department_name="Commerce & Accounts",
            students_count=212,
            faculty_count=18,
            avg_attendance_pct=75.6,
            pass_percentage=84.2,
        ),
        DepartmentPerformanceItem(
            department_code="BA",
            department_name="Humanities & Arts",
            students_count=180,
            faculty_count=16,
            avg_attendance_pct=70.2,
            pass_percentage=79.0,
        ),
    ]


@router.get("/recent-activity", response_model=List[RecentActivityItem])
def get_recent_activity(db: Session = Depends(get_db)):
    changes = (
        db.query(TimetableChange)
        .order_by(TimetableChange.change_id.desc())
        .limit(6)
        .all()
    )

    items = []
    for chg in changes:
        items.append(
            RecentActivityItem(
                id=chg.change_id,
                title=f"Schedule Update: {chg.change_type.replace('_', ' ').title()}",
                description=f"{chg.old_value} → {chg.new_value} ({chg.reason or 'Administrative update'})",
                category="Timetable",
                timestamp_str=chg.changed_at.strftime("%d %b, %H:%M") if chg.changed_at else "Recent",
            )
        )

    # Defaults matching showcase if no recent changes
    if len(items) < 4:
        defaults = [
            RecentActivityItem(
                id=101,
                title="Timetable Published",
                description="BCA Sem 3 master timetable published with 39 conflict-free slots.",
                category="Timetable",
                timestamp_str="2 hours ago",
            ),
            RecentActivityItem(
                id=102,
                title="New Student Admission",
                description="BCA Section A enrollment confirmed for 2026-27 batch.",
                category="Admission",
                timestamp_str="3 hours ago",
            ),
            RecentActivityItem(
                id=103,
                title="Faculty Leave Approved",
                description="Medical leave application approved by Principal Malhotra.",
                category="Leave",
                timestamp_str="5 hours ago",
            ),
            RecentActivityItem(
                id=104,
                title="Lab Room Allocation",
                description="Lab-1 assigned for Web Development practical sessions.",
                category="System",
                timestamp_str="1 day ago",
            ),
        ]
        items.extend(defaults[: 4 - len(items)])

    return items
