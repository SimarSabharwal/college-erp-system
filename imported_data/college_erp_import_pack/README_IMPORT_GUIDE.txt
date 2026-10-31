COLLEGE ERP IMPORT PACK — BCA III MORNING + AFTERNOON
Prepared from:
1) BCA 3( M& AF).pdf — two timetable pages dated 21.10.2026, Morning and Afternoon.
2) Internal marks Lab on Java BCA Sem 3 (1st Shift) .pdf — 59 student records and Java Lab internal marks.
3) Pasted markdown.md — College ERP TRD v1.3 (30 Oct 2026).

IMPORTANT: This is a review-ready staging import, not a blind production import.
The schedule was transcribed from a scanned timetable image. Verify entries before setting timetable status to Active.

FILES AND PURPOSE
- roles.csv: role lookup seed values from TRD.
- programs.csv: BCA program. Duration/semester count are provisional common defaults and should be confirmed.
- academic_years.csv: 2026-27 label inferred from timetable date; dates intentionally blank.
- semesters.csv: BCA Semester III; start/end dates intentionally blank.
- shifts.csv: Morning and Afternoon shift definitions based on the timetable.
- sections.csv: section III per shift. "III" is a schema-compatible short label; source labels are preserved separately in other files.
- students.csv: 59 student identities with ERP ID, PRN, name, program/semester/section/shift. Email/password_hash intentionally blank because source does not provide them.
- teachers.csv: faculty names and timetable abbreviations. Abbreviations are provisional import keys, not verified official employee numbers. Email/password_hash blank.
- subjects.csv: subject catalogue and credits/type.
- teacher_subjects.csv: faculty-to-subject teaching eligibility, derived from faculty legend and schedule.
- time_slots.csv: weekday slot definitions using the timetable's printed times, including break columns marked non-teaching. slot_key is a staging key; resolve it to time_slots.slot_id on import.
- rooms.csv: corrected room catalogue per user clarification: G01-G08 (Ground), 101-108 (Floor 1), and 201-208 (Floor 2). Capacity/equipment are unknown.
- timetable_entries.csv: room_code is intentionally blank pending reliable remapping to the approved room catalogue. Any previously transcribed room string is preserved in source_room_label; do not treat labels such as "DSB 109" as valid room IDs.
- timetable_entries.csv: current timetable assignments by shift/day/slot/subject/teacher/room. These are staging records; map teacher_code/subject_code/room_code/slot_key/section_name to actual DB IDs before inserting timetable_details.
- student_internal_marks.csv: marks sheet data for Lab on Java internal exam (max 40), including absent status.

KEY VALUES
Student roster: 59 records, 1st Shift / Morning only.
Java Lab internal marks: 58 present, 1 absent (YATHARTH KADAM, ERP 0251BCA041), maximum 40.
Timetable page date: 21.10.2026.
Subjects: Operating Systems (OS), Software Engineering (SE), Java Programming (JP), Statistics (ST / STATS in afternoon legend), Start-up Management (SUM), Lab on Oracle, Lab on Java, Yoga & Meditation (Y&M / YOGA).
Faculty abbreviations: MAG Dr. Mansi Agnihotri; DSB Dr. Daljeet S Bawa; MGS Dr. Megha Sehgal; UG Dr. Usha Gupta; MKC Dr. Mahesh Chaubey; AK Dr. Ajay Kumar; AKR Mr. Amit Kumar; NPN Mr. Nripesh Kumar Nrip; YK Mr. Yashwant Kumar.

TRD MISMATCHES / REQUIRED REVIEW
1. TRD shifts.name CHECK only permits Morning and Evening; uploaded timetable uses Morning and Afternoon. Update constraint to include Afternoon or consistently map Afternoon to Evening before import. Prefer update schema to Afternoon.
2. TRD time_slots canonical seed uses 65-minute slots (09:05–10:10 etc.), but PDF timetable uses different printed times (Morning: 09:10–10:05, 10:10–11:05, 11:05–11:20 break, 11:20–12:15, 12:20–13:15, 13:20–14:15; Afternoon: 12:20–13:15, 13:20–14:15, 14:15–15:10, 15:10–15:35 break, 15:35–16:30, 16:30–17:25). Do not load both sets as if identical. Decide whether to update TRD slots to match the official timetable.
3. TRD sections.section_name is VARCHAR(5); use "III" in this pack. Source does not identify a lettered section such as A/B.
4. Room catalogue was corrected to G01-G08, 101-108, and 201-208 based on the user clarification. Previously extracted timetable room labels are preserved in source_room_label but do not conform to this catalogue; room_code is blank until each assignment is mapped against the original timetable/official room list. Do not infer a mapping.
5. TRD users requires email and password_hash. Neither appears in source. Provision credentials separately; do not use fake passwords or guessed emails.
6. TRD teachers.employee_no is NOT NULL UNIQUE. The faculty abbreviations are used as provisional employee_no values only to support joins. Replace with official employee numbers if available.
7. TRD subjects.subject_code is UNIQUE. Codes OS, SE, JP, ST, SUM, ORACLE_LAB, JAVA_LAB, YOGA are stable staging codes; they are not all explicitly printed as formal institutional codes.
8. The afternoon timetable is not an afternoon student roster. Only the morning/1st Shift student list is present in the supplied marks sheet.
9. Timetable includes cells containing B/R/E/A/K in the mid-day/break column; these are treated as non-teaching placeholders and excluded from timetable_entries. Confirm institutional meaning if needed.
10. Some faculty legends list Yoga & Meditation against AKR while timetable cells show AK. Both are retained as eligible mappings; confirm responsibility.
11. Database IDs (user_id, teacher_id, subject_id, section_id, room_id, slot_id, semester_id) are generated by PostgreSQL. These CSVs use natural/staging keys and require a mapping step. Do not assume row number equals database ID.
12. The TRD has overlapping/differing definitions for leave_requests and leave_session_assignments; unrelated to these source files but fix before schema migration.

RECOMMENDED IMPORT ORDER
1 roles.csv, programs.csv, academic_years.csv
2 semesters.csv, shifts.csv
3 sections.csv, subjects.csv, rooms.csv, time_slots.csv
4 create users only after emails/password hashes and roles are assigned
5 teachers.csv after user rows exist (requires user_id)
6 teacher_subjects.csv after teacher/subject IDs are mapped
7 timetables parent record (not provided as CSV because status/IDs/active dates need confirmation)
8 timetable_entries.csv -> timetable_details after resolving all foreign keys
9 students.csv -> users + student profile/link table. The TRD currently has no dedicated student profile table, so add one for student_erp, PRN, section membership, or extend users with those columns.
10 student_internal_marks.csv -> marks/assessment tables; these tables are not defined in the current TRD and must be added before import.

CSV EMPTY FIELDS
Blank values mean source information was absent or needs provisioning. Do not turn blank fields into literal "NULL" strings. Treat ERP IDs and PRNs as strings to preserve leading zeros and exact identifiers.
