import re

with open('backend/app/routers/timetable.py', 'r', encoding='utf-8') as f:
    text = f.read()

for m, p in re.findall(r'@router\.(get|post|put|delete)\(["\']([^"\']+)', text):
    print(f'{m.upper():6} {p}')
