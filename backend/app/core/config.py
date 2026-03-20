from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "SCOEFLOW CONNECT - Smart Campus AI"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Firebase
    FIREBASE_KEY_PATH: str = "firebase_key.json"
    FIREBASE_PROJECT_ID: str = "scoeflow"
    
    # Gemini API
    GEMINI_API_KEY: str = "YOUR_GEMINI_API_KEY_HERE"
    
    # Hindsight
    HINDSIGHT_MODE: str = "cloud"
    HINDSIGHT_CLOUD_URL: Optional[str] = "https://hindsight.vectorize.io"
    HINDSIGHT_API_KEY: Optional[str] = None
    
    # Admin credentials
    ADMIN_EMAIL: str = "Praut1086@gmail.com"
    ADMIN_PASSWORD: str = "admin123"
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
