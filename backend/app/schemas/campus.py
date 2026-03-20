from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ===== Student Schemas =====
class StudentCreate(BaseModel):
    first_name: str
    middle_name: Optional[str] = ""
    last_name: str
    mother_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    date_of_birth: Optional[str] = ""
    gender: Optional[str] = ""
    category: Optional[str] = ""
    address: Optional[str] = ""
    state: Optional[str] = ""
    country: Optional[str] = "India"
    postal_code: Optional[str] = ""
    department: str = "Computer Science Engineering"
    branch: Optional[str] = ""
    year: Optional[str] = ""
    current_semester: Optional[int] = 1
    roll_number: str = ""
    admission_number: Optional[str] = ""
    admission_year: Optional[int] = 2024
    institutional_email: Optional[str] = ""
    photo: Optional[str] = ""
    password: Optional[str] = "Student@123"

    class Config:
        extra = "allow"


class StudentResponse(BaseModel):
    id: str
    first_name: str
    middle_name: Optional[str] = ""
    last_name: str
    mother_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    date_of_birth: Optional[str] = ""
    gender: Optional[str] = ""
    category: Optional[str] = ""
    address: Optional[str] = ""
    state: Optional[str] = ""
    department: Optional[str] = ""
    current_semester: Optional[int] = 1
    roll_number: Optional[str] = ""
    admission_number: Optional[str] = ""
    admission_year: Optional[int] = 2024
    institutional_email: Optional[str] = ""
    photo: Optional[str] = ""


class StudentLogin(BaseModel):
    institutional_email: str
    password: str


class ChangePassword(BaseModel):
    old_password: str
    new_password: str


# ===== Club Schemas =====
class ClubCreate(BaseModel):
    name: str
    description: str
    category: str  # e.g., "Technology", "Sports", "Arts", "Science"
    image_url: Optional[str] = ""


class ClubResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    image_url: Optional[str] = ""
    member_count: Optional[int] = 0
    created_at: Optional[str] = ""


# ===== Event Schemas =====
class EventCreate(BaseModel):
    title: str
    description: str
    category: str  # e.g., "Workshop", "Seminar", "Hackathon", "Cultural"
    date: str  # ISO date string
    time: Optional[str] = ""
    location: str
    club_id: Optional[str] = ""
    image_url: Optional[str] = ""


class EventResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    date: str
    time: Optional[str] = ""
    location: str
    club_id: Optional[str] = ""
    club_name: Optional[str] = ""
    image_url: Optional[str] = ""
    attendee_count: Optional[int] = 0
    created_at: Optional[str] = ""


# ===== Campus Location Schemas =====
class CampusLocationCreate(BaseModel):
    name: str
    building: str
    floor: str
    description: str
    category: str  # e.g., "Lab", "Classroom", "Office", "Facility"


class CampusLocationResponse(BaseModel):
    id: str
    name: str
    building: str
    floor: str
    description: str
    category: str


# ===== Student Interest Schemas =====
class InterestSave(BaseModel):
    student_id: str
    interests: List[str]  # e.g., ["AI", "Robotics", "Web Dev"]


# ===== Student Club Schemas =====
class JoinClub(BaseModel):
    student_id: str
    club_id: str


# ===== Event Attendance Schemas =====
class AttendEvent(BaseModel):
    student_id: str
    event_id: str


# ===== Chat Schemas =====
class ChatMessage(BaseModel):
    student_id: str
    message: str


class ChatResponse(BaseModel):
    response: str
    memories_used: Optional[int] = 0
