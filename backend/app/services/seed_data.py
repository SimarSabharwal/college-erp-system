"""
Seed database using official college CSV files only.
Replaces legacy sample seed data with authentic institutional data.
"""
from sqlalchemy.orm import Session
from app.models import User
from app.services.import_csv_data import import_all

def seed_database(db: Session):
    # Only seed initial baseline if database is completely empty
    if db.query(User).count() == 0:
        import_all()
