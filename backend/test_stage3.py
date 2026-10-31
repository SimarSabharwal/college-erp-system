import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_stage3_workflow():
    print("--- 1. Login as Teacher A ---")
    res = client.post("/api/v1/auth/login", json={"email": "arjun@college.edu", "password": "Teacher123!"})
    assert res.status_code == 200, f"Teacher login failed: {res.text}"
    teacher_token = res.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    print("Teacher A logged in successfully.")

    print("\n--- 2. Fetch Teacher Today's Classes ---")
    res = client.get("/api/v1/timetable/teacher/today", headers=teacher_headers)
    assert res.status_code == 200, f"Teacher classes failed: {res.text}"
    classes = res.json()
    assert len(classes) > 0, "No classes found for Teacher A"
    # Find a session owned by Teacher A that is Scheduled
    from app.core.database import SessionLocal
    from app.models import ClassSession, Teacher, User
    db = SessionLocal()
    teacher_record = db.query(Teacher).join(User).filter(User.email == "arjun@college.edu").first()
    print(f"Teacher Arjun ID: {teacher_record.teacher_id}")
    owned_session = db.query(ClassSession).filter(
        ClassSession.teacher_id == teacher_record.teacher_id,
        ClassSession.substitute_teacher_id == None,
        ClassSession.status == "Scheduled"
    ).first()
    if not owned_session:
        # Reset one session for testing
        owned_session = db.query(ClassSession).filter(ClassSession.teacher_id == teacher_record.teacher_id).first()
        owned_session.status = "Scheduled"
        owned_session.substitute_teacher_id = None
        db.commit()
    db.close()

    session_id = owned_session.session_id
    print(f"Target session selected: ID {session_id}")

    print("\n--- 3. Check Eligible Substitutes for Transfer ---")
    res = client.get(f"/api/v1/transfers/eligible-substitutes?session_id={session_id}", headers=teacher_headers)
    assert res.status_code == 200, f"Eligible substitutes failed: {res.text}"
    subs = res.json()
    print(f"Found {len(subs)} eligible substitutes.")
    assert len(subs) > 0, "Expected at least 1 eligible substitute"
    chosen_sub = subs[0]
    print(f"Selected substitute: {chosen_sub['full_name']} (ID: {chosen_sub['teacher_id']})")

    print("\n--- 4. Execute Instant Peer-to-Peer Transfer ---")
    transfer_payload = {
        "session_id": session_id,
        "substitute_teacher_id": chosen_sub["teacher_id"],
        "reason": "Attending university curriculum meeting"
    }
    res = client.post("/api/v1/transfers/", json=transfer_payload, headers=teacher_headers)
    assert res.status_code == 200, f"Transfer failed: {res.text}"
    transfer_data = res.json()
    assert transfer_data["status"] in ("Completed", "Transferred")
    print("Transfer confirmed instantly without requiring admin approval!")

    print("\n--- 5. Submit Leave Request (Chain Step 1) ---")
    leave_payload = {
        "leave_type": "Casual",
        "start_date": "2026-11-04",
        "end_date": "2026-11-05",
        "reason": "Family function"
    }
    res = client.post("/api/v1/leaves/", json=leave_payload, headers=teacher_headers)
    assert res.status_code == 200, f"Leave application failed: {res.text}"
    leave = res.json()
    leave_id = leave["leave_request_id"]
    assert leave["status"] == "Pending_HOD"
    print(f"Leave request created with ID: {leave_id}, Status: {leave['status']}")

    print("\n--- 6. HOD Login & Forward to Admin (Chain Step 2) ---")
    res = client.post("/api/v1/auth/login", json={"email": "hod@college.edu", "password": "Hod123!"})
    assert res.status_code == 200, f"HOD login failed: {res.text}"
    hod_token = res.json()["access_token"]
    hod_headers = {"Authorization": f"Bearer {hod_token}"}

    res = client.post(f"/api/v1/leaves/{leave_id}/hod-forward", json={"note": "Recommended by HOD"}, headers=hod_headers)
    assert res.status_code == 200, f"HOD forward failed: {res.text}"
    forwarded_leave = res.json()
    assert forwarded_leave["status"] == "Pending_Admin"
    print(f"Leave {leave_id} forwarded by HOD to Admin. Status: {forwarded_leave['status']}")

    print("\n--- 7. Admin Login, Candidate Review & Final Approval (Chain Step 3) ---")
    res = client.post("/api/v1/auth/login", json={"email": "admin@college.edu", "password": "Admin123!"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch substitute candidates for affected sessions
    res = client.get(f"/api/v1/leaves/{leave_id}/substitutes", headers=admin_headers)
    assert res.status_code == 200, f"Fetch leave substitutes failed: {res.text}"
    affected_sessions = res.json()
    print(f"Leave affects {len(affected_sessions)} sessions.")

    assignments = []
    for item in affected_sessions:
        s_id = item["session"]["session_id"]
        cands = item["candidates"]
        sub_id = cands[0]["teacher_id"] if cands else chosen_sub["teacher_id"]
        assignments.append({
            "session_id": s_id,
            "substitute_teacher_id": sub_id,
            "continuity_override": False
        })

    approve_payload = {
        "assignments": assignments,
        "note": "Approved by College Admin Office"
    }
    res = client.post(f"/api/v1/leaves/{leave_id}/admin-approve", json=approve_payload, headers=admin_headers)
    assert res.status_code == 200, f"Admin approve failed: {res.text}"
    approved_leave = res.json()
    assert approved_leave["status"] == "Approved"
    print(f"Leave {leave_id} approved by Admin and all sessions reassigned! Status: {approved_leave['status']}")

    print("\n--- 8. Verify Real-time Notifications ---")
    res = client.get("/api/v1/notifications/", headers=teacher_headers)
    assert res.status_code == 200
    notifs = res.json()
    print(f"Teacher received {len(notifs)} notifications.")
    assert len(notifs) > 0, "Teacher should have notifications"

    print("\n==========================================")
    print(" ALL STAGE 3 WORKFLOWS VERIFIED 100%! ")
    print("==========================================")

if __name__ == "__main__":
    test_full_stage3_workflow()
