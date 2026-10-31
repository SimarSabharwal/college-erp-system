from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "College ERP System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = "erp_super_secret_jwt_key_change_in_production_2026_xyz"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Defaults to local SQLite for immediate zero-config execution; seamlessly accepts PostgreSQL connection string
    DATABASE_URL: str = "sqlite:///./erp_system.db"

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
