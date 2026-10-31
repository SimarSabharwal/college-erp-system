import inspect
from app.models import timetable, academic, user, attendance

print("=== Timetable Models ===")
for name, cls in inspect.getmembers(timetable, inspect.isclass):
    if hasattr(cls, '__tablename__'):
        print(f"Table: {cls.__tablename__} -> Model: {name}")

print("\n=== Academic Models ===")
for name, cls in inspect.getmembers(academic, inspect.isclass):
    if hasattr(cls, '__tablename__'):
        print(f"Table: {cls.__tablename__} -> Model: {name}")
