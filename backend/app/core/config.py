from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "MessManager BD"
    APP_ENV: str = "development"
    SECRET_KEY: str = "supersecret_jwt_change_in_production_key_bachelor_mess"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "postgresql+asyncpg://mess:messpassword123@db:5432/messdb"
    REDIS_URL: str = "redis://redis:6379/0"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3085",
        "http://localhost:8000",
        "http://localhost:8086",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3085",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8086",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
