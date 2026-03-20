"""
Student API endpoints — rewritten for Firebase.
"""
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from app.crud.firebase_crud import (
    create_student, list_students, get_student, update_student, 
    delete_student, verify_student_password, change_student_password,
    get_student_by_email
)
from app.schemas.campus import StudentCreate, StudentLogin, ChangePassword
from app.core.firebase import get_firestore_db
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import csv, io, logging, json, datetime

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------- Personality Profile Models ----------

class PersonalityProfile(BaseModel):
    academic_interest: str = ""           # e.g. "high", "moderate", "low"
    favorite_subjects: List[str] = []
    career_goal: str = ""
    sports_interest: str = ""             # e.g. "very_active", "moderate", "not_interested"
    sports_played: List[str] = []
    clubs_interested: List[str] = []
    hobbies: List[str] = []
    learning_style: str = ""              # e.g. "visual", "reading", "hands_on"
    extracurricular_preference: str = ""  # e.g. "leadership", "creative", "technical"
    social_preference: str = ""           # e.g. "introvert", "ambivert", "extrovert"
    stress_management: str = ""
    goals_this_semester: str = ""

    class Config:
        extra = "allow"


@router.get("/")
def get_students(
    department: Optional[str] = None,
    semester: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
):
    students = list_students(department=department, semester=semester, skip=skip, limit=limit)
    for s in students:
        s.pop("password_hash", None)
    return students


@router.post("/")
def create_new_student(student: StudentCreate):
    data = student.model_dump()
    
    # Auto-generate institutional_email if not provided
    if not data.get("institutional_email"):
        first = data.get("first_name", "student").lower().replace(" ", "")
        last = data.get("last_name", "").lower().replace(" ", "")
        dept = data.get("department", "Computer Science Engineering")
        dept_codes = {
            "Computer Science Engineering": "cse",
            "Information Technology": "it",
            "Electronics and Communication Engineering": "ece",
            "Electrical Engineering": "ee",
            "Mechanical Engineering": "me",
            "Civil Engineering": "ce",
        }
        dept_code = dept_codes.get(dept, "cse")
        data["institutional_email"] = f"{first}.{last}@{dept_code}.scoe.edu.in"
    
    result = create_student(data)
    result.pop("password_hash", None)
    return result


@router.get("/next-roll-number")
def get_next_roll_number(
    department: str = Query(...),
    start_range: int = Query(1000)
):
    """Get the next available roll number for a department."""
    try:
        students = list_students(department=department, limit=1000)
        max_number = start_range
        
        for s in students:
            roll = s.get("roll_number", "")
            if roll and roll.startswith("SCOE"):
                try:
                    num = int(roll[4:])
                    if num >= start_range and num < start_range + 1000 and num > max_number:
                        max_number = num
                except ValueError:
                    pass
        
        return {"roll_number": max_number + 1}
    except Exception:
        return {"roll_number": start_range + 1}


# ============ PERSONALITY PROFILE ENDPOINTS ============
# Must be before /{student_id} to avoid path conflicts

@router.get("/personality/{student_id}")
def get_personality_profile(student_id: str):
    """Get a student's personality/onboarding profile."""
    try:
        db = get_firestore_db()
        doc = db.collection("student_profiles").document(student_id).get()
        if doc.exists:
            data = doc.to_dict()
            data["id"] = doc.id
            data["has_completed_onboarding"] = True
            return data
        return {"has_completed_onboarding": False}
    except Exception as e:
        logger.error(f"Error getting personality: {e}")
        return {"has_completed_onboarding": False}


@router.post("/personality/{student_id}")
def save_personality_profile(student_id: str, profile: PersonalityProfile):
    """Save a student's personality/onboarding profile."""
    try:
        db = get_firestore_db()
        data = profile.model_dump()
        data["student_id"] = student_id
        data["completed_at"] = datetime.datetime.utcnow().isoformat()
        data["has_completed_onboarding"] = True
        
        db.collection("student_profiles").document(student_id).set(data, merge=True)
        
        return {"message": "Personality profile saved", "has_completed_onboarding": True}
    except Exception as e:
        logger.error(f"Error saving personality: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ BULK IMPORT ENDPOINTS ============
# These must be placed BEFORE /{student_id} to avoid path conflicts

def _parse_file_to_rows(content: bytes, filename: str) -> list:
    """Parse CSV or Excel file content into list of dicts."""
    rows = []
    
    # Try Excel first if filename suggests it, or if CSV decode fails
    is_excel = filename.endswith('.xlsx') or filename.endswith('.xls')
    
    if is_excel:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True)
            ws = wb.active
            data = list(ws.iter_rows(values_only=True))
            if len(data) < 2:
                return []
            headers = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(data[0])]
            for row_vals in data[1:]:
                row_dict = {}
                for j, val in enumerate(row_vals):
                    if j < len(headers):
                        row_dict[headers[j]] = str(val).strip() if val is not None else ""
                rows.append(row_dict)
            wb.close()
            return rows
        except ImportError:
            logger.warning("openpyxl not installed, trying CSV fallback")
        except Exception as e:
            logger.warning(f"Excel parse failed: {e}, trying CSV fallback")
    
    # Try CSV
    try:
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            cleaned = {k.strip(): v.strip() if v else "" for k, v in row.items() if k}
            rows.append(cleaned)
    except UnicodeDecodeError:
        # Binary file but openpyxl not available — try latin-1
        try:
            text = content.decode("latin-1")
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                cleaned = {k.strip(): v.strip() if v else "" for k, v in row.items() if k}
                rows.append(cleaned)
        except Exception:
            raise HTTPException(status_code=400, detail="Could not parse file. Use CSV or install openpyxl for Excel support.")
    
    return rows


@router.post("/import/preview")
async def preview_import(file: UploadFile = File(...)):
    """Parse uploaded CSV/Excel and return preview data."""
    try:
        content = await file.read()
        rows = _parse_file_to_rows(content, file.filename or "upload.csv")
        
        preview = []
        for i, row in enumerate(rows):
            validation_errors = []
            if not row.get("first_name"):
                validation_errors.append("Missing first_name")
            if not row.get("last_name"):
                validation_errors.append("Missing last_name")
            
            preview.append({
                "row": i + 1,
                "data": row,
                "valid": len(validation_errors) == 0,
                "errors": validation_errors
            })
        
        return {
            "total": len(preview),
            "valid": sum(1 for p in preview if p["valid"]),
            "invalid": sum(1 for p in preview if not p["valid"]),
            "preview": preview
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")


@router.post("/import/save")
async def save_import(file: UploadFile = File(...)):
    """Import students from uploaded CSV/Excel file."""
    try:
        content = await file.read()
        rows = _parse_file_to_rows(content, file.filename or "upload.csv")
        
        if not rows:
            raise HTTPException(status_code=400, detail="No data found in file")
        
        successful = 0
        failed = 0
        errors = []
        
        # Department code mapping for email generation
        dept_codes = {
            "Computer Science Engineering": "cse",
            "Information Technology": "it",
            "Electronics and Communication Engineering": "ece",
            "Electrical Engineering": "ee",
            "Mechanical Engineering": "me",
            "Civil Engineering": "ce",
        }
        
        # Department starting ranges for roll numbers
        dept_ranges = {
            "Computer Science Engineering": 1000,
            "Information Technology": 3000,
            "Electronics and Communication Engineering": 5000,
            "Electrical Engineering": 7000,
            "Mechanical Engineering": 8000,
            "Civil Engineering": 9000,
        }
        
        for i, row in enumerate(rows):
            try:
                first_name = row.get("first_name", "").strip()
                last_name = row.get("last_name", "").strip()
                department = row.get("department", "Computer Science Engineering").strip()
                
                if not first_name or not last_name:
                    errors.append(f"Row {i+1}: Missing first_name or last_name")
                    failed += 1
                    continue
                
                # Generate roll number
                start_range = dept_ranges.get(department, 1000)
                existing = list_students(department=department, limit=1000)
                max_num = start_range
                for s in existing:
                    roll = s.get("roll_number", "")
                    if roll and roll.startswith("SCOE"):
                        try:
                            num = int(roll[4:])
                            if num >= start_range and num < start_range + 1000 and num > max_num:
                                max_num = num
                        except ValueError:
                            pass
                roll_number = f"SCOE{max_num + 1}"
                
                # Generate institutional email
                dept_code = dept_codes.get(department, "cse")
                inst_email = f"{first_name.lower()}.{last_name.lower()}@{dept_code}.scoe.edu.in"
                
                # Build student data
                student_data = {
                    "first_name": first_name,
                    "middle_name": row.get("middle_name", ""),
                    "last_name": last_name,
                    "email": row.get("email", ""),
                    "phone": row.get("phone", ""),
                    "date_of_birth": row.get("date_of_birth", ""),
                    "gender": row.get("gender", "").lower(),
                    "address": row.get("address", ""),
                    "category": row.get("category", "General"),
                    "department": department,
                    "branch": department,
                    "mother_name": row.get("mother_name", ""),
                    "current_semester": int(row.get("current_semester", 1) or 1),
                    "admission_year": int(row.get("admission_year", 2024) or 2024),
                    "roll_number": roll_number,
                    "admission_number": roll_number,
                    "institutional_email": inst_email,
                    "password": "Student@123",
                }
                
                create_student(student_data)
                successful += 1
                
            except Exception as e:
                errors.append(f"Row {i+1}: {str(e)}")
                failed += 1
        
        return {
            "total": len(rows),
            "successful": successful,
            "failed": failed,
            "errors": errors
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


# ============ INDIVIDUAL STUDENT ENDPOINTS ============
# These MUST come after all /specific-path routes

@router.get("/{student_id}")
def get_student_by_id(student_id: str):
    student = get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.pop("password_hash", None)
    return student


@router.put("/{student_id}")
def update_student_by_id(student_id: str, data: dict):
    data.pop("password_hash", None)
    data.pop("password", None)
    result = update_student(student_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Student not found")
    result.pop("password_hash", None)
    return result


@router.delete("/{student_id}")
def delete_student_by_id(student_id: str):
    success = delete_student(student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student deleted successfully"}


@router.post("/auth/login")
def student_login(login: StudentLogin):
    student = verify_student_password(login.institutional_email, login.password)
    if not student:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    student.pop("password_hash", None)
    return {"student": student, "message": "Login successful"}


@router.post("/auth/change-password")
def student_change_password(
    passwords: ChangePassword,
    student_id: str = Query(...)
):
    success = change_student_password(student_id, passwords.old_password, passwords.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Incorrect current password")
    return {"message": "Password changed successfully"}
