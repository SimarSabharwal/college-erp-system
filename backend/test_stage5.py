import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_stage5_dashboards_and_reports():
    print("--- 1. Admin System Stats API ---")
    res = client.get("/api/v1/reports/admin/stats")
    assert res.status_code == 200, f"Admin stats failed: {res.text}"
    stats = res.json()
    print(f"Total Students: {stats['total_students']}, Faculty: {stats['total_faculty']}, Depts: {stats['total_departments']}, Shifts: {stats['total_shifts']}")
    assert stats["total_students"] >= 1000
    assert stats["total_faculty"] >= 40
    assert stats["section_health_pct"] > 90

    print("\n--- 2. Room Availability 7-Day Heatmap API ---")
    res = client.get("/api/v1/reports/admin/room-availability")
    assert res.status_code == 200, f"Room availability failed: {res.text}"
    rooms = res.json()
    print(f"Returned {len(rooms)} monitored rooms.")
    assert len(rooms) >= 4
    for r in rooms:
        assert len(r["days"]) == 6, "Expected 6 day-schedule per room"

    print("\n--- 3. HOD Faculty Workload Distribution API ---")
    res = client.get("/api/v1/reports/hod/faculty-workload?dept_id=1")
    assert res.status_code == 200, f"Workload failed: {res.text}"
    workloads = res.json()
    print(f"Returned {len(workloads)} faculty workload records:")
    for w in workloads:
        print(f" - {w['full_name']} ({w['designation']}): {w['assigned_hours']}/{w['max_hours']} hrs ({w['workload_percentage']}%)")
        assert w["assigned_hours"] <= w["max_hours"]

    print("\n--- 4. Principal Department Performance Breakdown API ---")
    res = client.get("/api/v1/reports/principal/department-performance")
    assert res.status_code == 200, f"Dept performance failed: {res.text}"
    dept_perf = res.json()
    print(f"Returned {len(dept_perf)} departments:")
    for dp in dept_perf:
        print(f" - {dp['department_code']}: {dp['students_count']} students, {dp['faculty_count']} faculty, {dp['avg_attendance_pct']}% avg attendance")
        assert dp["avg_attendance_pct"] > 60

    print("\n--- 5. Recent Activity Feed API ---")
    res = client.get("/api/v1/reports/recent-activity")
    assert res.status_code == 200, f"Recent activity failed: {res.text}"
    acts = res.json()
    print(f"Returned {len(acts)} recent activities:")
    for a in acts:
        print(f" [{a['category']}] {a['title']} - {a['timestamp_str']}")
    assert len(acts) >= 3

    print("\n==========================================")
    print(" ALL STAGE 5 REPORTS & DASHBOARDS PASSED! ")
    print("==========================================")

if __name__ == "__main__":
    test_stage5_dashboards_and_reports()
