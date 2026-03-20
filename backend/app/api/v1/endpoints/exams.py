"""
Examination API endpoints — Firebase Firestore backed.
Supports exam events, schedules, enrollment, marks entry, and results.
"""
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from app.core.firebase import get_firestore_db
from google.cloud.firestore_v1 import FieldFilter
import logging, uuid, datetime

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------- Pydantic models ----------

class ExamEventCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    exam_type: str = "End Semester Examination"
    status: str = "draft"
    department: str = "Computer Science Engineering"
    semester: int = 1
    academic_year: str = "2025-26"
    start_date: str = ""
    end_date: str = ""
    instructions: Optional[str] = ""

    class Config:
        extra = "allow"


class ExamEventResponse(ExamEventCreate):
    id: str
    created_at: str = ""
    updated_at: str = ""


class ExamScheduleCreate(BaseModel):
    exam_event_id: str
    subject_id: Optional[str] = None
    subject_name: str = ""
    subject_code: str = ""
    exam_date: str = ""
    start_time: str = ""
    end_time: str = ""
    venue: str = ""
    room: str = ""
    duration_minutes: int = 180
    max_students: int = 60
    supervisor: str = ""
    total_marks: int = 100
    theory_marks: int = 0
    practical_marks: int = 0
    special_instructions: str = ""
    materials_allowed: str = ""
    is_active: bool = True

    class Config:
        extra = "allow"


class ExamScheduleResponse(BaseModel):
    id: str
    exam_event_id: str = ""
    subject_id: Optional[str] = None
    subject_name: str = ""
    subject_code: str = ""
    exam_date: str = ""
    start_time: str = ""
    end_time: str = ""
    venue: str = ""
    room: str = ""
    duration_minutes: int = 180
    max_students: int = 60
    supervisor: str = ""
    total_marks: int = 100
    theory_marks: int = 0
    practical_marks: int = 0
    special_instructions: str = ""
    materials_allowed: str = ""
    is_active: bool = True

    class Config:
        extra = "allow"


class EnrollmentCreate(BaseModel):
    exam_event_id: str
    student_id: str
    status: str = "pending"

    class Config:
        extra = "allow"


class EnrollmentResponse(EnrollmentCreate):
    id: str
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    created_at: str = ""


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


class MarksEntry(BaseModel):
    enrollment_id: str = ""
    student_id: str = ""
    subject_id: str = ""
    component_type: str = ""
    marks_obtained: float = 0
    out_of: float = 0
    exam_event_id: str = ""

    class Config:
        extra = "allow"


class MarksEntryResponse(MarksEntry):
    id: str


class ResultCreate(BaseModel):
    exam_event_id: str
    student_id: str
    total_marks: float = 0
    percentage: float = 0
    grade: str = ""
    status: str = "pending"


class ResultResponse(ResultCreate):
    id: str
    student_name: Optional[str] = ""
    roll_number: Optional[str] = ""


# ---------- Collection refs ----------

def _events_col():
    return get_firestore_db().collection("exam_events")

def _schedules_col():
    return get_firestore_db().collection("exam_schedules")

def _enrollments_col():
    return get_firestore_db().collection("exam_enrollments")

def _enrollment_apps_col():
    return get_firestore_db().collection("enrollment_applications")

def _marks_col():
    return get_firestore_db().collection("exam_marks")

def _results_col():
    return get_firestore_db().collection("exam_results")


# ============ EXAM EVENTS ============

@router.get("/events/", response_model=List[ExamEventResponse])
def list_exam_events():
    try:
        docs = _events_col().order_by("created_at", direction="DESCENDING").stream()
        return [{"id": d.id, **d.to_dict()} for d in docs]
    except Exception as e:
        logger.error(f"Error listing exam events: {e}")
        return []


@router.post("/events/", response_model=ExamEventResponse)
def create_exam_event(event: ExamEventCreate):
    try:
        doc_id = str(uuid.uuid4())
        data = event.model_dump()
        now = datetime.datetime.utcnow().isoformat()
        data["created_at"] = now
        data["updated_at"] = now
        _events_col().document(doc_id).set(data)
        data["id"] = doc_id
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events/{event_id}", response_model=ExamEventResponse)
def get_exam_event(event_id: str):
    doc = _events_col().document(event_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"id": doc.id, **doc.to_dict()}


@router.put("/events/{event_id}", response_model=ExamEventResponse)
def update_exam_event(event_id: str, event: ExamEventCreate):
    ref = _events_col().document(event_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")
    data = event.model_dump()
    data["updated_at"] = datetime.datetime.utcnow().isoformat()
    ref.update(data)
    return {"id": event_id, **data, "created_at": doc.to_dict().get("created_at", "")}


@router.delete("/events/{event_id}")
def delete_exam_event(event_id: str):
    ref = _events_col().document(event_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Event not found")
    ref.delete()
    return {"message": "Event deleted"}


# ============ EXAM SCHEDULES ============

@router.get("/events/{event_id}/schedules/")
@router.get("/events/{event_id}/schedules")
def list_schedules(event_id: str):
    try:
        docs = _schedules_col().where(filter=FieldFilter("exam_event_id", "==", event_id)).stream()
        schedules = []
        for d in docs:
            data = d.to_dict()
            data["id"] = d.id
            # Enrich with subject info
            subject_id = data.get("subject_id")
            if subject_id:
                try:
                    sub_doc = get_firestore_db().collection("subjects").document(str(subject_id)).get()
                    if sub_doc.exists:
                        sub_data = sub_doc.to_dict()
                        data["subject"] = {
                            "id": sub_doc.id,
                            "name": sub_data.get("subject_name", ""),
                            "code": sub_data.get("subject_code", ""),
                        }
                except Exception:
                    pass
            schedules.append(data)
        return schedules
    except Exception as e:
        logger.error(f"Error: {e}")
        return []


@router.post("/events/{event_id}/schedules/")
@router.post("/events/{event_id}/schedules")
def create_schedule_for_event(event_id: str, s: ExamScheduleCreate):
    doc_id = str(uuid.uuid4())
    data = s.model_dump()
    data["exam_event_id"] = event_id
    # Normalize venue/room
    if data.get("venue") and not data.get("room"):
        data["room"] = data["venue"]
    if data.get("room") and not data.get("venue"):
        data["venue"] = data["room"]
    _schedules_col().document(doc_id).set(data)
    data["id"] = doc_id
    return data


@router.post("/schedules/")
def create_schedule(s: ExamScheduleCreate):
    doc_id = str(uuid.uuid4())
    data = s.model_dump()
    if data.get("venue") and not data.get("room"):
        data["room"] = data["venue"]
    if data.get("room") and not data.get("venue"):
        data["venue"] = data["room"]
    _schedules_col().document(doc_id).set(data)
    data["id"] = doc_id
    return data


@router.put("/schedules/{schedule_id}")
def update_schedule(schedule_id: str, s: ExamScheduleCreate):
    ref = _schedules_col().document(schedule_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Schedule not found")
    data = s.model_dump()
    if data.get("venue") and not data.get("room"):
        data["room"] = data["venue"]
    ref.update(data)
    data["id"] = schedule_id
    return data


@router.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: str):
    ref = _schedules_col().document(schedule_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Schedule not found")
    ref.delete()
    return {"message": "Schedule deleted"}


# ============ ENROLLMENT APPLICATIONS ============

@router.get("/events/{event_id}/enrollments")
def list_enrollments(event_id: str):
    try:
        # Check both enrollment and enrollment_applications collections
        enrollments = []
        
        # From enrollments collection
        docs = _enrollments_col().where(filter=FieldFilter("exam_event_id", "==", event_id)).stream()
        for d in docs:
            data = d.to_dict()
            data["id"] = d.id
            try:
                student_doc = get_firestore_db().collection("students").document(data.get("student_id", "")).get()
                if student_doc.exists:
                    s = student_doc.to_dict()
                    data["student_name"] = f"{s.get('first_name', '')} {s.get('last_name', '')}"
                    data["roll_number"] = s.get("roll_number", "")
            except Exception:
                pass
            enrollments.append(data)
        
        # From enrollment_applications collection
        app_docs = _enrollment_apps_col().where(filter=FieldFilter("exam_event_id", "==", event_id)).stream()
        for d in app_docs:
            data = d.to_dict()
            data["id"] = d.id
            enrollments.append(data)
        
        return enrollments
    except Exception as e:
        logger.error(f"Error: {e}")
        return []


@router.post("/enrollments/")
def create_enrollment(e: EnrollmentCreate):
    doc_id = str(uuid.uuid4())
    data = e.model_dump()
    data["created_at"] = datetime.datetime.utcnow().isoformat()
    _enrollments_col().document(doc_id).set(data)
    data["id"] = doc_id
    return data


@router.put("/enrollments/{enrollment_id}")
def update_enrollment_status(enrollment_id: str, status: str = Query(...)):
    # Try enrollments collection first
    ref = _enrollments_col().document(enrollment_id)
    if ref.get().exists:
        ref.update({"status": status})
        return {"message": "Updated"}
    # Try enrollment_applications collection
    ref2 = _enrollment_apps_col().document(enrollment_id)
    if ref2.get().exists:
        ref2.update({"status": status})
        return {"message": "Updated"}
    raise HTTPException(status_code=404, detail="Enrollment not found")


@router.delete("/enrollments/{enrollment_id}")
def delete_enrollment(enrollment_id: str):
    ref = _enrollments_col().document(enrollment_id)
    if ref.get().exists:
        ref.delete()
        return {"message": "Deleted"}
    ref2 = _enrollment_apps_col().document(enrollment_id)
    if ref2.get().exists:
        ref2.delete()
        return {"message": "Deleted"}
    raise HTTPException(status_code=404, detail="Enrollment not found")


# ============ MARKS ENTRY ============

@router.get("/events/{event_id}/marks")
def list_marks(event_id: str):
    try:
        docs = _marks_col().where(filter=FieldFilter("exam_event_id", "==", event_id)).stream()
        return [{"id": d.id, **d.to_dict()} for d in docs]
    except Exception as e:
        logger.error(f"Error: {e}")
        return []


@router.post("/marks/")
def create_marks(m: MarksEntry):
    doc_id = str(uuid.uuid4())
    data = m.model_dump()
    _marks_col().document(doc_id).set(data)
    data["id"] = doc_id
    return data


@router.put("/marks/{marks_id}")
def update_marks(marks_id: str, m: MarksEntry):
    ref = _marks_col().document(marks_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Marks entry not found")
    ref.update(m.model_dump())
    return {"message": "Updated", "id": marks_id}


# ============ RESULTS ============

@router.get("/results/", response_model=List[ResultResponse])
def list_results(exam_event_id: Optional[str] = None):
    try:
        query = _results_col()
        if exam_event_id:
            query = query.where(filter=FieldFilter("exam_event_id", "==", exam_event_id))
        docs = query.stream()
        results = []
        for d in docs:
            data = d.to_dict()
            data["id"] = d.id
            try:
                student_doc = get_firestore_db().collection("students").document(data.get("student_id", "")).get()
                if student_doc.exists:
                    s = student_doc.to_dict()
                    data["student_name"] = f"{s.get('first_name', '')} {s.get('last_name', '')}"
                    data["roll_number"] = s.get("roll_number", "")
            except Exception:
                pass
            results.append(data)
        return results
    except Exception as e:
        logger.error(f"Error: {e}")
        return []


@router.post("/results/")
def create_result(r: ResultCreate):
    doc_id = str(uuid.uuid4())
    data = r.model_dump()
    _results_col().document(doc_id).set(data)
    data["id"] = doc_id
    return data


@router.get("/results/detailed-result-sheet/{student_id}")
def get_detailed_results(student_id: str):
    """Get all results for a student across all exams."""
    try:
        docs = _results_col().where(filter=FieldFilter("student_id", "==", student_id)).stream()
        results = []
        for d in docs:
            data = d.to_dict()
            data["id"] = d.id
            results.append(data)
        return results
    except Exception as e:
        logger.error(f"Error: {e}")
        return []
