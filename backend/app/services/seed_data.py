"""
Seed database using official college CSV files only.
Replaces legacy sample seed data with authentic institutional data.
"""
from sqlalchemy.orm import Session
from app.services.import_csv_data import import_all

def seed_database(db: Session):
    # Delegate to the authoritative CSV importer
    import_all()
