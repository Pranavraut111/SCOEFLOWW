"""
Enrollment Applications API endpoints — Firebase Firestore backed.
Handles student notifications and enrollment applications for exams.
"""
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from typing import List, Optional
from app.core.firebase import get_firestore_db
from google.cloud.firestore_v1 import FieldFilter
import logging, uuid, datetime

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------- Pydantic models ----------

class EnrollmentApplicationCreate(BaseModel):
    exam_event_id: str
    student_name: str = ""
    roll_number: str = ""
    department: str = ""
    semester: int = 1
    selected_subjects: List[str] = []
    is_backlog_student: bool = False
    special_requirements: Optional[str] = None
    student_remarks: Optional[str] = None

    class Config:
        extra = "allow"


class ReviewRequest(BaseModel):
    application_status: str
    admin_remarks: Optional[str] = None
    rejection_reason: Optional[str] = None

    class Config:
        extra = "allow"


# ---------- Collection ref ----------

def _col():
    return get_firestore_db().collection("enrollment_applications")


def _events_col():
    return get_firestore_db().collection("exam_events")


# ---------- Endpoints ----------

# === Student-facing notifications ===

@router.get("/student/{student_id}/notifications")
def get_student_notifications(student_id: str):
    """Get exam events relevant to a student with their application status."""
    try:
        student_doc = get_firestore_db().collection("students").document(student_id).get()
        if not student_doc.exists:
            return []
        
        student = student_doc.to_dict()
        dept = student.get("department", "")
        sem = student.get("current_semester", 1)
        
        docs = _events_col().stream()
        
        notifications = []
        for d in docs:
            event = d.to_dict()
            event["id"] = d.id
            
            if event.get("department") != dept:
                continue
            if event.get("semester") != sem:
                continue
            
            # Check if student has already applied
            apps = list(_col().where(
                filter=FieldFilter("exam_event_id", "==", d.id)
            ).where(
                filter=FieldFilter("student_id", "==", student_id)
            ).limit(1).stream())
            
            has_applied = len(apps) > 0
            application_status = apps[0].to_dict().get("status", apps[0].to_dict().get("application_status", "pending")) if has_applied else None
            
            event["has_applied"] = has_applied
            event["application_status"] = application_status
            notifications.append(event)
        
        return notifications
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        return []


# === Student application submission ===

@router.post("/apply")
def submit_application(
    application: EnrollmentApplicationCreate,
    student_id: str = Query(...)
):
    """Submit an enrollment application for a student."""
    try:
        doc_id = str(uuid.uuid4())
        data = application.model_dump()
        data["student_id"] = student_id
        data["application_status"] = "PENDING"
        data["status"] = "pending"
        data["applied_at"] = datetime.datetime.utcnow().isoformat()
        data["created_at"] = datetime.datetime.utcnow().isoformat()
        # Store selected_subjects as JSON string for compatibility
        if isinstance(data.get("selected_subjects"), list):
            import json
            data["selected_subjects"] = json.dumps(data["selected_subjects"])
        
        _col().document(doc_id).set(data)
        return {"id": doc_id, **data, "message": "Application submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# === Admin: list all applications ===

@router.get("/")
def list_all_applications(
    exam_event_id: Optional[str] = None,
    status: Optional[str] = None
):
    """List all enrollment applications, optionally filtered."""
    try:
        query = _col()
        if exam_event_id:
            query = query.where(filter=FieldFilter("exam_event_id", "==", exam_event_id))
        if status:
            query = query.where(filter=FieldFilter("application_status", "==", status.upper()))
        
        docs = query.stream()
        return [{"id": d.id, **d.to_dict()} for d in docs]
    except Exception as e:
        logger.error(f"Error: {e}")
        return []


# === Admin: list applications for a specific exam event ===

@router.get("/exam-event/{exam_event_id}/applications")
def list_applications_for_event(
    exam_event_id: str,
    status: Optional[str] = None
):
    """List applications for a specific exam event, optionally filtered by status."""
    try:
        query = _col().where(filter=FieldFilter("exam_event_id", "==", exam_event_id))
        if status:
            query = query.where(filter=FieldFilter("application_status", "==", status.upper()))
        
        docs = query.stream()
        return [{"id": d.id, **d.to_dict()} for d in docs]
    except Exception as e:
        logger.error(f"Error: {e}")
        return []


# === Admin: review (approve/reject) an application ===

@router.put("/application/{application_id}/review")
def review_application(
    application_id: str,
    review: ReviewRequest,
    admin_email: str = Query(...)
):
    """Approve or reject an enrollment application."""
    ref = _col().document(application_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")
    
    update_data = {
        "application_status": review.application_status.upper(),
        "reviewed_by": admin_email,
        "reviewed_at": datetime.datetime.utcnow().isoformat(),
    }
    if review.admin_remarks:
        update_data["admin_remarks"] = review.admin_remarks
    if review.rejection_reason:
        update_data["rejection_reason"] = review.rejection_reason
    
    ref.update(update_data)
    return {"message": f"Application {review.application_status}"}


# === Admin: update application status (simpler) ===

@router.put("/{application_id}/status")
def update_application_status(application_id: str, status: str = Query(...)):
    """Update the status of an enrollment application."""
    ref = _col().document(application_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Application not found")
    
    ref.update({
        "application_status": status.upper(),
        "status": status.lower(),
        "updated_at": datetime.datetime.utcnow().isoformat()
    })
    return {"message": f"Application {status}"}


# === Admin: delete application ===

@router.delete("/application/{application_id}")
@router.delete("/{application_id}")
def delete_application(application_id: str):
    ref = _col().document(application_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Application not found")
    ref.delete()
    return {"message": "Application deleted"}
