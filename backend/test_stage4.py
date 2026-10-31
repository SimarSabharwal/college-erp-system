import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_stage4_attendance_system():
    print("--- 1. Login as Student (Simar Sabharwal) ---")
    res = client.post("/api/v1/auth/login", json={"email": "simar@college.edu", "password": "Student123!"})
    assert res.status_code == 200, f"Student login failed: {res.text}"
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    print("Student logged in successfully.")

    print("\n--- 2. Fetch Two-Tier Attendance Dashboard ---")
    res = client.get("/api/v1/attendance/me/dashboard", headers=student_headers)
    assert res.status_code == 200, f"Attendance dashboard failed: {res.text}"
    data = res.json()

    print(f"Tier 1 Semester Standing:")
    print(f" - Overall Percentage: {data['overall_percentage']}%")
    print(f" - Overall Status: {data['overall_status']}")
    print(f" - Lectures: {data['total_attended']} Attended / {data['total_held']} Held ({data['total_absent']} Absent)")
    assert data["total_held"] > 0, "Expected held classes"
    assert data["overall_percentage"] > 0, "Expected non-zero overall percentage"

    print(f"\nTier 2 Subject Risk Cards (Critical-first sorting check):")
    cards = data["subject_cards"]
    assert len(cards) > 0, "Expected subject cards"

    priorities = {"Critical": 0, "At Risk": 1, "Safe": 2}
    seen_weights = []
    for c in cards:
        w = priorities.get(c["status"], 3)
        seen_weights.append(w)
        print(f" [{c['status']}] {c['subject_code']} - {c['subject_name']}: {c['percentage']}% ({c['attended_classes']}/{c['total_classes_held']} classes) -> {c['margin_note']}")

    # Verify sorting is non-decreasing in risk priority (Critical 0 <= At Risk 1 <= Safe 2)
    assert seen_weights == sorted(seen_weights), "Subject cards MUST be sorted Critical-first!"
    print("Subject cards verified sorted Critical-first!")

    print("\n--- 3. Login as Teacher (Prof. Arjun Kumar) ---")
    res = client.post("/api/v1/auth/login", json={"email": "arjun@college.edu", "password": "Teacher123!"})
    assert res.status_code == 200, f"Teacher login failed: {res.text}"
    teacher_token = res.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    # Find a session assigned to Teacher Arjun
    from app.core.database import SessionLocal
    from app.models import ClassSession, Teacher, User
    db = SessionLocal()
    teacher_record = db.query(Teacher).join(User).filter(User.email == "arjun@college.edu").first()
    session = db.query(ClassSession).filter(
        ClassSession.teacher_id == teacher_record.teacher_id,
        ClassSession.substitute_teacher_id == None
    ).first()
    assert session is not None, "No session available for teacher"
    session_id = session.session_id
    db.close()
    print(f"Selected class session ID {session_id} for attendance marking.")

    print("\n--- 4. Fetch Session Roster ---")
    res = client.get(f"/api/v1/attendance/session/{session_id}/roster", headers=teacher_headers)
    assert res.status_code == 200, f"Roster failed: {res.text}"
    roster_data = res.json()
    students = roster_data["students"]
    print(f"Roster has {len(students)} enrolled students in {roster_data['section_name']}.")
    assert len(students) > 0, "Expected enrolled students in roster"

    print("\n--- 5. Submit Session Attendance (Bulk Mark Present, 1 Absent, 1 Late) ---")
    records = []
    for idx, st in enumerate(students):
        if idx == 1:
            records.append({"student_id": st["student_id"], "status": "Absent", "remarks": "Uninformed leave"})
        elif idx == 2:
            records.append({"student_id": st["student_id"], "status": "Late", "remarks": "10 mins delay"})
        else:
            records.append({"student_id": st["student_id"], "status": "Present", "remarks": None})

    res = client.post(f"/api/v1/attendance/session/{session_id}", json={"records": records}, headers=teacher_headers)
    assert res.status_code == 200, f"Submit attendance failed: {res.text}"
    submit_res = res.json()
    print(f"Attendance recorded: {submit_res['present']} Present, {submit_res['absent']} Absent, {submit_res['late']} Late.")

    print("\n--- 6. Re-fetch Roster & Confirm Persistence ---")
    res = client.get(f"/api/v1/attendance/session/{session_id}/roster", headers=teacher_headers)
    assert res.status_code == 200
    updated_roster = res.json()
    assert updated_roster["is_marked"] == True
    assert updated_roster["present_count"] >= 1
    print("Roster verified successfully marked and saved in database.")

    print("\n==========================================")
    print(" ALL STAGE 4 ATTENDANCE TESTS PASSED 100%! ")
    print("==========================================")

if __name__ == "__main__":
    test_stage4_attendance_system()
