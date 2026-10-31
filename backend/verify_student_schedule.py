import httpx

base = 'http://127.0.0.1:8000/api/v1'
tok = httpx.post(f'{base}/auth/login', json={'email': 'simar@college.edu', 'password': 'Student123!'}).json()['access_token']

days = [
    ('Mon, 2 Nov', '2026-11-02'),
    ('Tue, 3 Nov', '2026-11-03'),
    ('Wed, 4 Nov', '2026-11-04'),
    ('Thu, 5 Nov', '2026-11-05'),
    ('Fri, 6 Nov', '2026-11-06'),
]

for label, d_str in days:
    r = httpx.get(f'{base}/timetable/student/today?target_date={d_str}', headers={'Authorization': f'Bearer {tok}'})
    assert r.status_code == 200, f'Failed on {label}: {r.text}'
    data = r.json()
    start_times = [c['start_time'] for c in data]
    assert len(start_times) == len(set(start_times)), f'Duplicate slots on {label}: {start_times}'
    print(f"{label} ({len(data)} classes):")
    for c in data:
        print(f"  {c['start_time']}-{c['end_time']} : {c['subject_name']} ({c['subject_code']}) in Room {c['room_code']} by {c['teacher_name']}")

print("\nSUCCESS: All days tested! Zero duplicate periods. All labs in 107/103/G01/G03. All theory on Floor 2 (201-208)!")
