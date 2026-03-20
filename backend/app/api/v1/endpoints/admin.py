"""
Admin authentication endpoint — simplified for Firebase.
"""
from fastapi import APIRouter, HTTPException
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter()


class AdminLogin(BaseModel):
    email: str
    password: str


@router.post("/auth/login")
def admin_login(login: AdminLogin):
    if login.email == settings.ADMIN_EMAIL and login.password == settings.ADMIN_PASSWORD:
        return {
            "message": "Login successful",
            "admin": {
                "email": settings.ADMIN_EMAIL,
                "role": "admin"
            }
        }
    raise HTTPException(status_code=401, detail="Invalid admin credentials")
