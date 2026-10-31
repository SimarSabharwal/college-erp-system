import csv
import os
from datetime import date, time, datetime, timezone
from sqlalchemy import text
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import (
    Role,
    User,
    Department,
    Program,
    Shift,
    AcademicYear,
    Semester,
    Section,
    Subject,
    Teacher,
    TeacherSubject,
    Building,
    Room,
    Student,
    Enrollment,
    TimeSlot,
    Timetable,
    TimetableDetail,
    ClassSession,
    TeacherSubjectShiftLock,
    Attendance,
    SystemSetting,
)

CSV_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../imported_data/college_erp_import_pack"))

def parse_time(t_str: str) -> time:
    parts = t_str.strip().split(":")
    return time(int(parts[0]), int(parts[1]))

def import_all():
    print(f"Reading CSV data from: {CSV_DIR}")
    db = SessionLocal()
    try:
        # 1. Clean old operational and academic records for clean reload
        with engine.connect() as conn:
            conn.execute(text("PRAGMA foreign_keys = OFF;"))
            conn.commit()

        db.query(Attendance).delete()
        db.query(ClassSession).delete()
        db.query(TimetableDetail).delete()
        db.query(Timetable).delete()
        db.query(TeacherSubjectShiftLock).delete()
        db.query(TeacherSubject).delete()
        db.query(Enrollment).delete()
        db.query(Student).delete()
        db.query(Teacher).delete()
        db.query(TimeSlot).delete()
        db.query(Subject).delete()
        db.query(Room).delete()
        db.query(Section).delete()
        db.query(Semester).delete()
        db.query(Program).delete()
        db.query(Department).delete()
        db.query(User).delete()
        db.commit()

        # 2. System Settings
        settings_data = [
            ("college_name", "Department of Computer Applications", "string", "College Name"),
            ("academic_year", "2026-27", "string", "Academic Year"),
            ("attendance_threshold", "75.0", "float", "Attendance Threshold"),
            ("attendance_min_safe", "75", "float", "Minimum % for Safe status"),
            ("attendance_min_at_risk", "60", "float", "Minimum % for At Risk status"),
            ("late_counts_as_present", "true", "boolean", "Late counts as Present"),
            ("max_consecutive_slots_default", "2", "integer", "Default max consecutive teaching slots"),
        ]
        for k, v, t, d in settings_data:
            s = db.query(SystemSetting).filter_by(setting_key=k).first()
            if not s:
                db.add(SystemSetting(setting_key=k, setting_value=v, value_type=t, description=d))
            else:
                s.setting_value = v
        db.commit()

        # 3. Roles
        roles_map = {}
        for r_name in ["Admin", "Principal", "HOD", "Teacher", "Student"]:
            role = db.query(Role).filter_by(role_name=r_name).first()
            if not role:
                role = Role(role_name=r_name)
                db.add(role)
                db.flush()
            roles_map[r_name] = role.role_id
        db.commit()

        # 4. Shifts (Printed Timetable Hours: Morning 09:10-14:15, Afternoon 12:20-17:25)
        shift_morning = db.query(Shift).filter_by(name="Morning").first()
        if not shift_morning:
            shift_morning = Shift(name="Morning", start_time=time(9, 10), end_time=time(14, 15))
            db.add(shift_morning)
        else:
            shift_morning.start_time = time(9, 10)
            shift_morning.end_time = time(14, 15)

        shift_afternoon = db.query(Shift).filter_by(name="Afternoon").first()
        if not shift_afternoon:
            shift_afternoon = Shift(name="Afternoon", start_time=time(12, 20), end_time=time(17, 25))
            db.add(shift_afternoon)
        else:
            shift_afternoon.start_time = time(12, 20)
            shift_afternoon.end_time = time(17, 25)

        db.commit()
        db.refresh(shift_morning)
        db.refresh(shift_afternoon)

        # 5. Academic Year
        acad_year = db.query(AcademicYear).filter_by(name="2026-27").first()
        if not acad_year:
            acad_year = AcademicYear(name="2026-27", start_date=date(2026, 8, 1), end_date=date(2027, 5, 31))
            db.add(acad_year)
            db.commit()
            db.refresh(acad_year)

        # 6. Helper to create or get user
        def get_or_make_user(email, name, role_name, password):
            u = db.query(User).filter_by(email=email).first()
            if not u:
                u = User(
                    email=email,
                    password_hash=get_password_hash(password),
                    full_name=name,
                    role_id=roles_map[role_name],
                    status="Active",
                )
                db.add(u)
                db.commit()
                db.refresh(u)
            else:
                u.full_name = name
                u.role_id = roles_map[role_name]
                u.status = "Active"
                db.commit()
            return u

        admin_user = get_or_make_user("admin@college.edu", "System Administrator", "Admin", "Admin123!")
        director_user = get_or_make_user("director@college.edu", "College Director", "Principal", "Director123!")
        principal_user = get_or_make_user("principal@college.edu", "Dr. S. K. Sharma (Principal)", "Principal", "Director123!")
        hod_user = get_or_make_user("hod@college.edu", "Dr. Mahesh Chaubey (HOD, BCA)", "HOD", "Hod123!")

        # 7. Department & Program
        dept = Department(name="BCA", hod_id=hod_user.user_id, description="Department of Computer Applications")
        db.add(dept)
        db.commit()
        db.refresh(dept)

        prog = Program(program_code="BCA", name="Bachelor of Computer Applications", department_id=dept.department_id, duration_years=3, total_semesters=6)
        db.add(prog)
        db.commit()
        db.refresh(prog)

        sem3 = Semester(program_id=prog.program_id, academic_year_id=acad_year.academic_year_id, semester_no=3, start_date=date(2026, 8, 1), end_date=date(2026, 12, 15))
        db.add(sem3)
        db.commit()
        db.refresh(sem3)

        # 8. Sections
        sec_morning = Section(program_id=prog.program_id, section_name="III", shift_id=shift_morning.shift_id, academic_year_id=acad_year.academic_year_id, max_strength=60)
        sec_afternoon = Section(program_id=prog.program_id, section_name="III-AF", shift_id=shift_afternoon.shift_id, academic_year_id=acad_year.academic_year_id, max_strength=60)
        db.add(sec_morning)
        db.add(sec_afternoon)
        db.commit()
        db.refresh(sec_morning)
        db.refresh(sec_afternoon)

        # 9. Buildings & Rooms
        bldg = db.query(Building).first()
        if not bldg:
            bldg = Building(name="Main Academic Block", description="Central Academic Building")
            db.add(bldg)
            db.commit()
            db.refresh(bldg)

        rooms_cache = {}
        with open(os.path.join(CSV_DIR, "rooms.csv"), mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                code = row["room_code"].strip()
                # Designated laboratories: 107 (Primary), 103, G01, G03
                is_lab = code in ("107", "103", "G01", "G03")
                r = Room(
                    building_id=bldg.building_id,
                    room_code=code,
                    room_type="Lab" if is_lab else "Classroom",
                    capacity=60,
                    has_projector=True,
                    has_computer=is_lab,
                )
                db.add(r)
                db.commit()
                db.refresh(r)
                rooms_cache[code] = r

        # 10. Time Slots (exact printed timetable timings from time_slots.csv)
        slot_cache = {}  # slot_key -> TimeSlot
        with open(os.path.join(CSV_DIR, "time_slots.csv"), mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                s_key = row["slot_key"].strip()
                shift_id = shift_morning.shift_id if row["shift_name"].strip() == "Morning" else shift_afternoon.shift_id
                is_teach = row["is_teaching_slot"].strip().lower() == "true"
                slot = TimeSlot(
                    shift_id=shift_id,
                    day_of_week=row["day_of_week"].strip(),
                    start_time=parse_time(row["start_time"]),
                    end_time=parse_time(row["end_time"]),
                    slot_label=row["slot_label"].strip(),
                    slot_order=int(row["slot_order"]),
                    global_order=int(row["global_order"]),
                    is_teaching_slot=is_teach,
                    is_active=True,
                )
                db.add(slot)
                db.commit()
                db.refresh(slot)
                slot_cache[s_key] = slot

        print(f"Imported {len(slot_cache)} Time Slots.")

        # 11. Teachers (All 9 official faculty from teachers.csv + Arjun)
        teacher_cache = {}  # code -> Teacher
        teacher_emails = {
            "MAG": ("mag@college.edu", "Dr. Mansi Agnihotri"),
            "DSB": ("dsb@college.edu", "Dr. Daljeet S Bawa"),
            "MGS": ("mgs@college.edu", "Dr. Megha Sehgal"),
            "UG": ("ug@college.edu", "Dr. Usha Gupta"),
            "MKC": ("mkc@college.edu", "Dr. Mahesh Chaubey"),
            "AK": ("ak@college.edu", "Dr. Ajay Kumar"),
            "AKR": ("akr@college.edu", "Mr. Amit Kumar"),
            "NPN": ("npn@college.edu", "Mr. Nripesh Kumar Nrip"),
            "YK": ("yk@college.edu", "Mr. Yashwant Kumar"),
        }

        with open(os.path.join(CSV_DIR, "teachers.csv"), mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                t_code = row["teacher_code"].strip()
                full_name = row["full_name"].strip()
                email, name = teacher_emails.get(t_code, (f"{t_code.lower()}@college.edu", full_name))
                user = get_or_make_user(email, name, "Teacher", "Teacher123!")

                t = Teacher(
                    user_id=user.user_id,
                    employee_no=t_code,
                    department_id=dept.department_id,
                    designation=row["designation"] or "Assistant Professor",
                    max_hours_per_week=int(row["max_hours_per_week"] or 20),
                    max_consecutive_slots=int(row["max_consecutive_slots"] or 2),
                )
                db.add(t)
                db.commit()
                db.refresh(t)
                teacher_cache[t_code] = t

        # 12. Subjects (from subjects.csv)
        subject_cache = {}  # code -> Subject
        with open(os.path.join(CSV_DIR, "subjects.csv"), mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                code = row["subject_code"].strip()
                name = row["name"].strip()
                s_type = row["subject_type"].strip()
                has_lab = row["has_lab"].strip().lower() == "true"
                credits = int(row["credits"] or 3)

                subj = Subject(
                    subject_code=code,
                    name=name,
                    program_id=prog.program_id,
                    semester_id=sem3.semester_id,
                    credits=credits,
                    subject_type=s_type,
                    has_lab=has_lab,
                    theory_hours_per_week=4 if not has_lab else 2,
                    lab_hours_per_week=2 if has_lab else 0,
                )
                db.add(subj)
                db.commit()
                db.refresh(subj)
                subject_cache[code] = subj

        # 13. Teacher-Subjects
        seen_ts = set()
        with open(os.path.join(CSV_DIR, "teacher_subjects.csv"), mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                t_code = row["teacher_code"].strip()
                s_code = row["subject_code"].strip()
                if t_code in teacher_cache and s_code in subject_cache:
                    t_id = teacher_cache[t_code].teacher_id
                    s_id = subject_cache[s_code].subject_id
                    if (t_id, s_id) not in seen_ts:
                        seen_ts.add((t_id, s_id))
                        ts = TeacherSubject(
                            teacher_id=t_id,
                            subject_id=s_id,
                            can_teach=True,
                            priority=int(row.get("priority", 1)),
                        )
                        db.add(ts)
        db.commit()

        # 14. Teacher-Subject-Shift Locks (Hard Constraint C-09)
        locks_to_create = [
            ("MGS", "JP", shift_morning.shift_id),
            ("MGS", "JAVA_LAB", shift_morning.shift_id),
            ("NPN", "JP", shift_afternoon.shift_id),
            ("NPN", "JAVA_LAB", shift_afternoon.shift_id),
            ("MAG", "OS", shift_morning.shift_id),
            ("MAG", "SE", shift_afternoon.shift_id),
            ("DSB", "SE", shift_morning.shift_id),
            ("DSB", "OS", shift_afternoon.shift_id),
            ("UG", "ST", shift_morning.shift_id),
            ("YK", "ST", shift_afternoon.shift_id),
        ]
        for t_code, s_code, sh_id in locks_to_create:
            if t_code in teacher_cache and s_code in subject_cache:
                t_id = teacher_cache[t_code].teacher_id
                s_id = subject_cache[s_code].subject_id
                lock = TeacherSubjectShiftLock(
                    teacher_id=t_id,
                    subject_id=s_id,
                    shift_id=sh_id,
                    semester_id=sem3.semester_id,
                    academic_year_id=acad_year.academic_year_id,
                    locked_by=admin_user.user_id,
                )
                db.add(lock)
        db.commit()

        # 15. Students (All 59 students from students.csv)
        students_cache = {}  # erp -> Student
        with open(os.path.join(CSV_DIR, "students.csv"), mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                erp = row["student_erp"].strip()
                prn = row["prn"].strip()
                name = row["full_name"].strip()
                email = "simar@college.edu" if "simar" in name.lower() else f"{erp.lower()}@college.edu"
                user = get_or_make_user(email, name, "Student", "Student123!")

                st = Student(
                    user_id=user.user_id,
                    roll_no=erp,
                    student_erp=erp,
                    prn=prn,
                    program_id=prog.program_id,
                    section_id=sec_morning.section_id,
                    admission_year=2026,
                    status="Active",
                )
                db.add(st)
                db.commit()
                db.refresh(st)
                students_cache[erp] = st

                # Enroll in all subjects
                for subj in subject_cache.values():
                    enr = Enrollment(
                        student_id=st.student_id,
                        subject_id=subj.subject_id,
                        academic_year_id=acad_year.academic_year_id,
                        semester_id=sem3.semester_id,
                        section_id=sec_morning.section_id,
                        status="Active",
                    )
                    db.add(enr)
        db.commit()
        print(f"Imported {len(students_cache)} Students from CSV.")

        # 16. Create PREVIOUS WEEK Timetable (Mon 26 Oct 2026 - Fri 30 Oct 2026)
        tt_past = Timetable(
            program_id=prog.program_id,
            academic_year_id=acad_year.academic_year_id,
            semester_id=sem3.semester_id,
            shift_id=shift_morning.shift_id,
            name="BCA III Timetable (26 Oct - 30 Oct 2026)",
            version_no=1,
            status="Active",
            generated_by=admin_user.user_id,
            active_from=date(2026, 10, 26),
            active_to=date(2026, 10, 30),
            is_locked=True,
            remarks="Official BCA Semester III Timetable for Week 26 Oct - 30 Oct 2026",
        )
        db.add(tt_past)
        db.commit()
        db.refresh(tt_past)

        room_map = {
            "MAG 201": "201",
            "AK 104": "104",
            "DSB 202": "202",
            "MAG 104": "104",
            "DSB": "101",
            "DSB 108": "108",
            "MAG 108": "108",
            "AK 202": "202",
            "YK 205": "205",
            "AK 205": "205",
            "DSB 109": "107",
            "DSB 309": "207",
        }

        past_week_dates = {
            "Mon": date(2026, 10, 26),
            "Tue": date(2026, 10, 27),
            "Wed": date(2026, 10, 28),
            "Thu": date(2026, 10, 29),
            "Fri": date(2026, 10, 30),
        }

        past_details = []
        with open(os.path.join(CSV_DIR, "timetable_entries.csv"), mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                shift_name = row["shift_name"].strip()
                day = row["day_of_week"].strip()
                s_key = row["slot_key"].strip()
                subj_code = row["subject_code"].strip()
                t_code = row["teacher_code"].strip()
                src_room = row["source_room_label"].strip()
                is_lab = row["is_lab"].strip().lower() == "true"

                sec = sec_morning if shift_name == "Morning" else sec_afternoon
                slot = slot_cache.get(s_key)
                subj = subject_cache.get(subj_code)
                teacher = teacher_cache.get(t_code)

                if is_lab:
                    r_code = "G01" if subj_code == "JAVA_LAB" else "G02"
                elif src_room in room_map:
                    r_code = room_map[src_room]
                else:
                    r_code = "101" if shift_name == "Morning" else "105"

                room = rooms_cache.get(r_code, rooms_cache["101"])

                if slot and subj and teacher:
                    d = TimetableDetail(
                        timetable_id=tt_past.timetable_id,
                        section_id=sec.section_id,
                        subject_id=subj.subject_id,
                        teacher_id=teacher.teacher_id,
                        room_id=room.room_id,
                        slot_id=slot.slot_id,
                        class_type="Lab" if is_lab else "Theory",
                        is_lab=is_lab,
                        is_locked=True,
                    )
                    db.add(d)
                    past_details.append((d, day, slot, subj, teacher, room, sec, is_lab))

        db.commit()
        print(f"Inserted {len(past_details)} Timetable Details for past week.")

        # Create past ClassSessions (26 Oct - 30 Oct 2026)
        past_sessions = []
        for (d, day, slot, subj, teacher, room, sec, is_lab) in past_details:
            s_date = past_week_dates.get(day)
            if s_date:
                cs = ClassSession(
                    timetable_id=tt_past.timetable_id,
                    detail_id=d.detail_id,
                    section_id=sec.section_id,
                    subject_id=subj.subject_id,
                    teacher_id=teacher.teacher_id,
                    room_id=room.room_id,
                    slot_id=slot.slot_id,
                    is_lab=is_lab,
                    session_date=s_date,
                    week_type="Regular",
                    status="Completed",
                )
                db.add(cs)
                past_sessions.append(cs)

        db.commit()
        print(f"Created {len(past_sessions)} Completed Class Sessions for past week.")

        # Seed attendance for past sessions
        all_morning_students = db.query(Student).filter_by(section_id=sec_morning.section_id).all()
        java_lab_absent = {"0251BCA041"}  # YATHARTH KADAM was absent in internal marks
        total_att = 0

        for cs in past_sessions:
            if cs.section_id != sec_morning.section_id:
                continue

            for st in all_morning_students:
                if cs.is_lab and cs.subject.subject_code == "JAVA_LAB":
                    status = "Absent" if st.student_erp in java_lab_absent else "Present"
                elif st.student_erp == "0251BCA022":  # Simar Sabharwal
                    # High attendance: 19 of 20 attended (95%)
                    status = "Present" if (cs.session_date != date(2026, 10, 27) or cs.slot.slot_order != 4) else "Absent"
                else:
                    status = "Present" if (hash(st.student_erp) + cs.session_id) % 6 != 0 else "Absent"

                att = Attendance(
                    session_id=cs.session_id,
                    student_id=st.student_id,
                    marked_by=cs.teacher.user_id,
                    status=status,
                    marked_at=datetime.combine(cs.session_date, cs.slot.end_time, tzinfo=timezone.utc),
                )
                db.add(att)
                total_att += 1

        db.commit()
        print(f"Seeded {total_att} historical Attendance records for past week.")

        # 17. Create UPCOMING WEEK Timetable (Mon 2 Nov 2026 - Fri 6 Nov 2026)
        tt_upcoming = Timetable(
            program_id=prog.program_id,
            academic_year_id=acad_year.academic_year_id,
            semester_id=sem3.semester_id,
            shift_id=shift_morning.shift_id,
            name="BCA III Timetable (2 Nov - 6 Nov 2026)",
            version_no=1,
            status="Active",
            generated_by=admin_user.user_id,
            active_from=date(2026, 11, 2),
            active_to=date(2026, 11, 6),
            is_locked=True,
            remarks="Published BCA Semester III Timetable for Upcoming Week",
        )
        db.add(tt_upcoming)
        db.commit()
        db.refresh(tt_upcoming)

        upcoming_week_dates = {
            "Mon": date(2026, 11, 2),
            "Tue": date(2026, 11, 3),
            "Wed": date(2026, 11, 4),
            "Thu": date(2026, 11, 5),
            "Fri": date(2026, 11, 6),
        }

        upcoming_sessions = []
        for (d, day, slot, subj, teacher, room, sec, is_lab) in past_details:
            up_d = TimetableDetail(
                timetable_id=tt_upcoming.timetable_id,
                section_id=sec.section_id,
                subject_id=subj.subject_id,
                teacher_id=teacher.teacher_id,
                room_id=room.room_id,
                slot_id=slot.slot_id,
                class_type="Lab" if is_lab else "Theory",
                is_lab=is_lab,
                is_locked=True,
            )
            db.add(up_d)

            s_date = upcoming_week_dates.get(day)
            if s_date:
                cs = ClassSession(
                    timetable_id=tt_upcoming.timetable_id,
                    detail_id=None,
                    section_id=sec.section_id,
                    subject_id=subj.subject_id,
                    teacher_id=teacher.teacher_id,
                    room_id=room.room_id,
                    slot_id=slot.slot_id,
                    is_lab=is_lab,
                    session_date=s_date,
                    week_type="Regular",
                    status="Scheduled",
                )
                db.add(cs)
                upcoming_sessions.append(cs)

        db.commit()
        print(f"Created {len(upcoming_sessions)} Scheduled Class Sessions for upcoming week (2 Nov - 6 Nov).")

        print("==================================================")
        print(" CSV DATA INGESTION AND SETUP COMPLETED 100%! ")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    import_all()
