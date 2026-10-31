import httpx

base = "http://127.0.0.1:8000/api/v1"

# 1. Login as Admin
admin_resp = httpx.post(f"{base}/auth/login", json={"email": "admin@college.edu", "password": "Admin123!"})
assert admin_resp.status_code == 200, f"Admin login failed: {admin_resp.text}"
admin_token = admin_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {admin_token}"}
print("1. Admin Login Successful!")

# 2. Check Admin Stats (verify ONLY CSV data)
stats_resp = httpx.get(f"{base}/reports/admin/stats", headers=headers)
assert stats_resp.status_code == 200
stats = stats_resp.json()
print("2. Live Admin Stats:", stats)
assert stats["total_students"] == 59, f"Expected 59 students, got {stats['total_students']}"
assert stats["total_faculty"] == 9, f"Expected 9 faculty, got {stats['total_faculty']}"
assert stats["active_rooms"] == 24, f"Expected 24 rooms, got {stats['active_rooms']}"
assert stats["active_subjects"] == 8, f"Expected 8 subjects, got {stats['active_subjects']}"
print("   Verified: ONLY CSV data exists in system!")

# 3. Test Clear Schedule
clear_resp = httpx.post(f"{base}/timetable/clear-schedule", headers=headers)
assert clear_resp.status_code == 200, f"Clear schedule failed: {clear_resp.text}"
print("3. Clear Schedule Successful:", clear_resp.json()["message"])

# Verify schedule is cleared
latest_tt = httpx.get(f"{base}/timetable/latest", headers=headers)
print("   Latest timetable after clear status code:", latest_tt.status_code)
assert latest_tt.status_code == 404

# 4. Test Auto-Generation with Custom Constraints
gen_payload = {
    "program_id": 1,
    "semester_id": 1,
    "academic_year_id": 1,
    "name": "BCA Sem 3 Auto Generated Timetable",
    "enforce_shift_lock": True,
    "enforce_lab_matching": True,
    "enforce_continuity": True,
    "max_consecutive_slots": 2,
    "clear_existing_drafts": True,
}
gen_resp = httpx.post(f"{base}/timetable/generate", json=gen_payload, headers=headers)
assert gen_resp.status_code == 200, f"Generation failed: {gen_resp.text}"
gen_data = gen_resp.json()
tt_id = gen_data["timetable_id"]
print(f"4. Auto-Generation Successful! Timetable ID: {tt_id}")
print(f"   Status: {gen_data['status']}, Total Periods Scheduled: {gen_data['total_slots_scheduled']}, Conflicts: {gen_data['conflicts_count']}")
assert gen_data["total_slots_scheduled"] > 0
assert gen_data["conflicts_count"] == 0

# 5. Test Publish Schedule
pub_resp = httpx.post(f"{base}/timetable/{tt_id}/publish", headers=headers)
assert pub_resp.status_code == 200, f"Publish failed: {pub_resp.text}"
pub_data = pub_resp.json()
print(f"5. Publish Successful! Status: {pub_data['status']}, Locked: {pub_data['is_locked']}")
assert pub_data["status"] == "Active"

# 6. Test Student Portal view after generation & publish
student_resp = httpx.post(f"{base}/auth/login", json={"email": "simar@college.edu", "password": "Student123!"})
assert student_resp.status_code == 200
student_tok = student_resp.json()["access_token"]
st_classes = httpx.get(f"{base}/timetable/student/today?target_date=2026-11-02", headers={"Authorization": f"Bearer {student_tok}"})
assert st_classes.status_code == 200
classes = st_classes.json()
print(f"6. Student Portal Simar Sabharwal has {len(classes)} scheduled classes for Monday Nov 2:")
for c in classes:
    print(f"   - {c['start_time']}-{c['end_time']} | {c['subject_name']} | Room {c['room_code']} | {c['teacher_name']} | Status: {c['status']}")

print("\nALL TEST SUITE CHECKS PASSED 100%!")
