import os
from typing import List
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "TerraGuard NE"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Environment & Database
    ENV: str = os.getenv("ENV", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./terraguard.db")
    
    # JWT Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "terraguard_super_secret_production_key_dikrong_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Weather Provider
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1/forecast"
    WEATHER_CACHE_TTL_SECONDS: int = 600
    
    # External APIs
    SMS_API_KEY: str = os.getenv("SMS_API_KEY", "")
    SMS_SENDER_ID: str = os.getenv("SMS_SENDER_ID", "TERRAG")
    
    # HEC-RAS Config
    HECRAS_EXE_PATH: str = os.getenv("HECRAS_EXE_PATH", "C:\\Program Files (x86)\\HEC\\HEC-RAS\\6.4.1\\Ras.exe")
    ENABLE_HECRAS_NATIVE: bool = os.getenv("ENABLE_HECRAS_NATIVE", "false").lower() == "true"
    
    # Demonstration defaults
    DEFAULT_CATCHMENT_ID: str = "CATCH-DIKRONG-01"

settings = Settings()
