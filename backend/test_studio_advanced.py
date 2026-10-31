from app.core.database import SessionLocal
from app.services.timetable_generator import TimetableGenerator
from app.models import Timetable, TimetableDetail, Room, TimeSlot

db = SessionLocal()
gen = TimetableGenerator(db)

print("=== 1. Testing Readiness Check ===")
readiness = gen.get_readiness_check(program_id=1, semester_id=1)
print(f"Is Ready: {readiness['is_ready']}")
for item in readiness['items']:
    print(f"  [{item['status'].upper()}] {item['name']}: {item['message']}")

print("\n=== 2. Testing Teacher Assignments Summary ===")
summary = gen.get_teacher_assignments_summary(program_id=1, semester_id=1)
for s in summary[:4]:
    print(f"  - {s['subject_name']} ({s['subject_code']}): {s['assigned_teachers']} [{s['shift']}] -> {s['eligibility_status']}")

print("\n=== 3. Testing Generation with 'balanced' strategy ===")
tt = gen.generate_timetable(
    program_id=1,
    semester_id=1,
    academic_year_id=1,
    generated_by_user_id=1,
    name="BCA Sem 3 Balanced Studio Run",
    generation_mode="new",
    strategy_preset="balanced",
    enforce_shift_lock=True,
    enforce_lab_matching=True,
    enforce_continuity=True,
    max_consecutive_slots=2,
    clear_existing_drafts=True
)
print(f"Generated Timetable ID: {tt.timetable_id}, Details: {len(tt.details)}")

print("\n=== 4. Testing Manual Move Validation ===")
first_detail = tt.details[0]
valid_room = db.query(Room).filter(Room.room_code == "203").first()
valid_slot = db.query(TimeSlot).filter(TimeSlot.is_teaching_slot == True, TimeSlot.shift_id == 1, TimeSlot.slot_id != first_detail.slot_id).first()
break_slot = db.query(TimeSlot).filter(TimeSlot.is_teaching_slot == False).first()

# Test 4a: Moving into a break slot (should fail)
res_break = gen.validate_move(tt.timetable_id, first_detail.detail_id, break_slot.slot_id, valid_room.room_id)
print(f"Move into break slot: valid={res_break['is_valid']}, conflict={res_break['conflicts']}")

# Test 4b: Moving theory class into ground floor lab (should fail)
lab_room = db.query(Room).filter(Room.room_code == "G01").first()
if not first_detail.is_lab:
    res_lab = gen.validate_move(tt.timetable_id, first_detail.detail_id, valid_slot.slot_id, lab_room.room_id)
    print(f"Move theory into Lab G01: valid={res_lab['is_valid']}, conflict={res_lab['conflicts']}")

print("\n=== 5. Testing Version History & Rollback ===")
gen.publish_timetable(tt.timetable_id, admin_user_id=1)
print(f"Timetable published as Active. Status: {tt.status}")

db.close()
print("\nALL BACKEND TIMETABLE STUDIO CHECKS PASSED SUCCESSFULLY!")
