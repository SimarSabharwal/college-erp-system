import urllib.request
import json

# Login as admin
login_data = json.dumps({"email": "admin@college.edu", "password": "Admin123!"}).encode('utf-8')
req = urllib.request.Request("http://127.0.0.1:8000/api/v1/auth/login", data=login_data, headers={"Content-Type": "application/json"})
res = urllib.request.urlopen(req)
token = json.loads(res.read().decode())["access_token"]
print("Admin token obtained.")

# Call readiness-check
req2 = urllib.request.Request("http://127.0.0.1:8000/api/v1/timetable/readiness-check", headers={"Authorization": f"Bearer {token}"})
res2 = urllib.request.urlopen(req2)
readiness = json.loads(res2.read().decode())
print("Readiness response: is_ready =", readiness["is_ready"])
print("Checks count:", len(readiness["items"]))

# Call teacher-assignments-summary
req3 = urllib.request.Request("http://127.0.0.1:8000/api/v1/timetable/teacher-assignments-summary", headers={"Authorization": f"Bearer {token}"})
res3 = urllib.request.urlopen(req3)
summary = json.loads(res3.read().decode())
print("Teacher summary subjects count:", len(summary))

# Call versions
req4 = urllib.request.Request("http://127.0.0.1:8000/api/v1/timetable/versions", headers={"Authorization": f"Bearer {token}"})
res4 = urllib.request.urlopen(req4)
versions = json.loads(res4.read().decode())
print("Timetable versions count:", len(versions))
