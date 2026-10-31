import httpx

base = 'http://127.0.0.1:8000/api/v1'

accounts = [
    ('simar@college.edu', 'Student123!', 'Student'),
    ('mag@college.edu', 'Teacher123!', 'Teacher'),
    ('hod@college.edu', 'Hod123!', 'HOD'),
    ('director@college.edu', 'Director123!', 'Principal'),
    ('admin@college.edu', 'Admin123!', 'Admin'),
]

for email, pwd, expected_role in accounts:
    r = httpx.post(f'{base}/auth/login', json={'email': email, 'password': pwd})
    assert r.status_code == 200, f'Failed {email}: {r.text}'
    data = r.json()
    assert data['role'] == expected_role, f'Role mismatch: {data}'
    print(f"OK: {email} -> {data['role']} ({data['full_name']})")

tok = httpx.post(f'{base}/auth/login', json={'email': 'simar@college.edu', 'password': 'Student123!'}).json()['access_token']
r_me = httpx.get(f'{base}/auth/me', headers={'Authorization': f'Bearer {tok}'})
print("Student /auth/me:", r_me.json())
