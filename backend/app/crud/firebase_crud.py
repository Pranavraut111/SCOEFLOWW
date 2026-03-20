"""
Firebase Firestore CRUD operations for all collections.
Replaces the old SQLAlchemy-based CRUD.
"""
from app.core.firebase import get_firestore_db
from passlib.context import CryptContext
from datetime import datetime
from typing import Optional, List
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _generate_id():
    return str(uuid.uuid4())[:8]


# ============================
# STUDENTS
# ============================

def create_student(data: dict) -> dict:
    db = get_firestore_db()
    student_id = _generate_id()
    
    # Hash password
    password = data.pop("password", "Student@123")
    data["password_hash"] = pwd_context.hash(password)
    data["created_at"] = datetime.utcnow().isoformat()
    
    db.collection("students").document(student_id).set(data)
    return {"id": student_id, **data}


def get_student(student_id: str) -> Optional[dict]:
    db = get_firestore_db()
    doc = db.collection("students").document(student_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


def get_student_by_email(email: str) -> Optional[dict]:
    db = get_firestore_db()
    docs = db.collection("students").where(
        "institutional_email", "==", email
    ).limit(1).get()
    for doc in docs:
        return {"id": doc.id, **doc.to_dict()}
    return None


def list_students(department: str = None, semester: int = None, skip: int = 0, limit: int = 100) -> List[dict]:
    db = get_firestore_db()
    query = db.collection("students")
    
    if department:
        query = query.where("department", "==", department)
    if semester:
        query = query.where("current_semester", "==", semester)
    
    docs = query.limit(limit).get()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


def update_student(student_id: str, data: dict) -> Optional[dict]:
    db = get_firestore_db()
    doc_ref = db.collection("students").document(student_id)
    if not doc_ref.get().exists:
        return None
    
    # Remove None values
    data = {k: v for k, v in data.items() if v is not None}
    doc_ref.update(data)
    return get_student(student_id)


def delete_student(student_id: str) -> bool:
    db = get_firestore_db()
    doc_ref = db.collection("students").document(student_id)
    if not doc_ref.get().exists:
        return False
    doc_ref.delete()
    return True


def verify_student_password(email: str, password: str) -> Optional[dict]:
    student = get_student_by_email(email)
    if not student:
        return None
    
    password_hash = student.get("password_hash", "")
    if not password_hash:
        # Default password check
        if password == "Student@123":
            return student
        return None
    
    if pwd_context.verify(password, password_hash):
        return student
    return None


def change_student_password(student_id: str, old_password: str, new_password: str) -> bool:
    student = get_student(student_id)
    if not student:
        return False
    
    password_hash = student.get("password_hash", "")
    if password_hash and not pwd_context.verify(old_password, password_hash):
        return False
    
    db = get_firestore_db()
    db.collection("students").document(student_id).update({
        "password_hash": pwd_context.hash(new_password)
    })
    return True


# ============================
# CLUBS
# ============================

def create_club(data: dict) -> dict:
    db = get_firestore_db()
    club_id = _generate_id()
    data["created_at"] = datetime.utcnow().isoformat()
    data["member_count"] = 0
    db.collection("clubs").document(club_id).set(data)
    return {"id": club_id, **data}


def get_club(club_id: str) -> Optional[dict]:
    db = get_firestore_db()
    doc = db.collection("clubs").document(club_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


def list_clubs() -> List[dict]:
    db = get_firestore_db()
    docs = db.collection("clubs").get()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


def update_club(club_id: str, data: dict) -> Optional[dict]:
    db = get_firestore_db()
    doc_ref = db.collection("clubs").document(club_id)
    if not doc_ref.get().exists:
        return None
    data = {k: v for k, v in data.items() if v is not None}
    doc_ref.update(data)
    return get_club(club_id)


def delete_club(club_id: str) -> bool:
    db = get_firestore_db()
    doc_ref = db.collection("clubs").document(club_id)
    if not doc_ref.get().exists:
        return False
    doc_ref.delete()
    return True


# ============================
# EVENTS
# ============================

def create_event(data: dict) -> dict:
    db = get_firestore_db()
    event_id = _generate_id()
    data["created_at"] = datetime.utcnow().isoformat()
    data["attendee_count"] = 0
    db.collection("events").document(event_id).set(data)
    return {"id": event_id, **data}


def get_event(event_id: str) -> Optional[dict]:
    db = get_firestore_db()
    doc = db.collection("events").document(event_id).get()
    if doc.exists:
        return {"id": doc.id, **doc.to_dict()}
    return None


def list_events(category: str = None) -> List[dict]:
    db = get_firestore_db()
    query = db.collection("events")
    if category:
        query = query.where("category", "==", category)
    docs = query.get()
    events = []
    for doc in docs:
        event = {"id": doc.id, **doc.to_dict()}
        # Enrich with club name
        if event.get("club_id"):
            club = get_club(event["club_id"])
            event["club_name"] = club["name"] if club else ""
        events.append(event)
    return events


def update_event(event_id: str, data: dict) -> Optional[dict]:
    db = get_firestore_db()
    doc_ref = db.collection("events").document(event_id)
    if not doc_ref.get().exists:
        return None
    data = {k: v for k, v in data.items() if v is not None}
    doc_ref.update(data)
    return get_event(event_id)


def delete_event(event_id: str) -> bool:
    db = get_firestore_db()
    doc_ref = db.collection("events").document(event_id)
    if not doc_ref.get().exists:
        return False
    doc_ref.delete()
    return True


# ============================
# CAMPUS LOCATIONS
# ============================

def create_location(data: dict) -> dict:
    db = get_firestore_db()
    loc_id = _generate_id()
    db.collection("campus_locations").document(loc_id).set(data)
    return {"id": loc_id, **data}


def list_locations(category: str = None) -> List[dict]:
    db = get_firestore_db()
    query = db.collection("campus_locations")
    if category:
        query = query.where("category", "==", category)
    docs = query.get()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


def update_location(loc_id: str, data: dict) -> Optional[dict]:
    db = get_firestore_db()
    doc_ref = db.collection("campus_locations").document(loc_id)
    if not doc_ref.get().exists:
        return None
    data = {k: v for k, v in data.items() if v is not None}
    doc_ref.update(data)
    doc = doc_ref.get()
    return {"id": doc.id, **doc.to_dict()}


def delete_location(loc_id: str) -> bool:
    db = get_firestore_db()
    doc_ref = db.collection("campus_locations").document(loc_id)
    if not doc_ref.get().exists:
        return False
    doc_ref.delete()
    return True


# ============================
# STUDENT INTERESTS
# ============================

def save_student_interests(student_id: str, interests: List[str]) -> List[dict]:
    db = get_firestore_db()
    
    # Delete existing interests
    existing = db.collection("student_interests").where(
        "student_id", "==", student_id
    ).get()
    for doc in existing:
        doc.reference.delete()
    
    # Save new interests
    results = []
    for interest in interests:
        doc_id = _generate_id()
        data = {
            "student_id": student_id,
            "interest": interest,
            "created_at": datetime.utcnow().isoformat()
        }
        db.collection("student_interests").document(doc_id).set(data)
        results.append({"id": doc_id, **data})
    
    return results


def get_student_interests(student_id: str) -> List[str]:
    db = get_firestore_db()
    docs = db.collection("student_interests").where(
        "student_id", "==", student_id
    ).get()
    return [doc.to_dict().get("interest", "") for doc in docs]


# ============================
# STUDENT CLUBS
# ============================

def join_club(student_id: str, club_id: str) -> dict:
    db = get_firestore_db()
    
    # Check if already joined
    existing = db.collection("student_clubs").where(
        "student_id", "==", student_id
    ).where(
        "club_id", "==", club_id
    ).limit(1).get()
    
    for doc in existing:
        return {"id": doc.id, **doc.to_dict(), "already_joined": True}
    
    doc_id = _generate_id()
    data = {
        "student_id": student_id,
        "club_id": club_id,
        "joined_at": datetime.utcnow().isoformat()
    }
    db.collection("student_clubs").document(doc_id).set(data)
    
    # Increment club member count
    club_ref = db.collection("clubs").document(club_id)
    club = club_ref.get()
    if club.exists:
        count = club.to_dict().get("member_count", 0)
        club_ref.update({"member_count": count + 1})
    
    return {"id": doc_id, **data}


def get_student_clubs(student_id: str) -> List[dict]:
    db = get_firestore_db()
    docs = db.collection("student_clubs").where(
        "student_id", "==", student_id
    ).get()
    
    clubs = []
    for doc in docs:
        membership = doc.to_dict()
        club = get_club(membership.get("club_id", ""))
        if club:
            clubs.append(club)
    return clubs


def leave_club(student_id: str, club_id: str) -> bool:
    db = get_firestore_db()
    docs = db.collection("student_clubs").where(
        "student_id", "==", student_id
    ).where(
        "club_id", "==", club_id
    ).limit(1).get()
    
    for doc in docs:
        doc.reference.delete()
        # Decrement member count
        club_ref = db.collection("clubs").document(club_id)
        club = club_ref.get()
        if club.exists:
            count = max(0, club.to_dict().get("member_count", 1) - 1)
            club_ref.update({"member_count": count})
        return True
    return False


# ============================
# EVENT ATTENDANCE
# ============================

def attend_event(student_id: str, event_id: str) -> dict:
    db = get_firestore_db()
    
    # Check if already attended
    existing = db.collection("event_attendance").where(
        "student_id", "==", student_id
    ).where(
        "event_id", "==", event_id
    ).limit(1).get()
    
    for doc in existing:
        return {"id": doc.id, **doc.to_dict(), "already_attended": True}
    
    doc_id = _generate_id()
    data = {
        "student_id": student_id,
        "event_id": event_id,
        "attended_at": datetime.utcnow().isoformat()
    }
    db.collection("event_attendance").document(doc_id).set(data)
    
    # Increment attendee count
    event_ref = db.collection("events").document(event_id)
    event = event_ref.get()
    if event.exists:
        count = event.to_dict().get("attendee_count", 0)
        event_ref.update({"attendee_count": count + 1})
    
    return {"id": doc_id, **data}


def get_student_attended_events(student_id: str) -> List[dict]:
    db = get_firestore_db()
    docs = db.collection("event_attendance").where(
        "student_id", "==", student_id
    ).get()
    
    events = []
    for doc in docs:
        attendance = doc.to_dict()
        event = get_event(attendance.get("event_id", ""))
        if event:
            events.append(event)
    return events
