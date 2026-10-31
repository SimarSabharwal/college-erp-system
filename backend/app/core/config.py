import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional

BASE_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_PATH = BASE_BACKEND_DIR / "erp_system.db"


class Settings(BaseSettings):
    PROJECT_NAME: str = "College ERP System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = "erp_super_secret_jwt_key_change_in_production_2026_xyz"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Canonical database path: always resolves to backend/erp_system.db regardless of process cwd
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
