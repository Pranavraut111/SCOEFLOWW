"""
Subjects API endpoints — Firebase Firestore backed.
Supports all operations the SubjectMaster frontend component needs.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from app.core.firebase import get_firestore_db
from google.cloud.firestore_v1 import FieldFilter
import logging, uuid, datetime

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------- Pydantic models ----------

class SubjectComponent(BaseModel):
    id: Optional[int] = None
    component_type: str  # ESE, IA, TW, PR, OR, TH
    is_enabled: bool = True
    out_of_marks: int = 100
    passing_marks: int = 40
    resolution: Optional[str] = None


class SubjectCreate(BaseModel):
    year: str
    scheme: str = "2019"
    department: str
    semester: str
    subject_code: str
    subject_name: str
    credits: int = 3
    overall_passing_criteria: float = 40
    components: List[SubjectComponent] = []


class SubjectResponse(SubjectCreate):
    id: str


# ---------- CRUD helpers ----------

def _col():
    return get_firestore_db().collection("subjects")


# ---------- Endpoints ----------

@router.get("/", response_model=List[SubjectResponse])
def list_subjects(
    year: Optional[str] = None,
    department: Optional[str] = None,
    semester: Optional[str] = None,
):
    try:
        query = _col()
        if year:
            query = query.where(filter=FieldFilter("year", "==", year))
        if department:
            query = query.where(filter=FieldFilter("department", "==", department))
        if semester:
            query = query.where(filter=FieldFilter("semester", "==", semester))
        
        docs = query.stream()
        subjects = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            subjects.append(data)
        return subjects
    except Exception as e:
        logger.error(f"Error listing subjects: {e}")
        return []


@router.get("/catalog")
def get_subject_catalog(
    department: str = Query(...),
    semester: Optional[str] = None,
):
    """Return a built-in catalog of standard engineering subjects."""
    catalog = _get_builtin_catalog()
    results = [s for s in catalog if s["department"] == department]
    if semester:
        results = [s for s in results if s["semester"] == semester]
    return results


@router.get("/templates/components")
def get_component_templates():
    """Return default component templates."""
    return {
        "theory": [
            {"component_type": "ESE", "is_enabled": True, "out_of_marks": 80, "passing_marks": 32},
            {"component_type": "IA", "is_enabled": True, "out_of_marks": 20, "passing_marks": 8},
        ],
        "practical": [
            {"component_type": "PR", "is_enabled": True, "out_of_marks": 50, "passing_marks": 20},
            {"component_type": "OR", "is_enabled": True, "out_of_marks": 25, "passing_marks": 10},
            {"component_type": "TW", "is_enabled": True, "out_of_marks": 25, "passing_marks": 10},
        ],
    }


@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject(subject_id: str):
    try:
        doc = _col().document(subject_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Subject not found")
        data = doc.to_dict()
        data["id"] = doc.id
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=SubjectResponse)
def create_subject(subject: SubjectCreate):
    try:
        doc_id = str(uuid.uuid4())
        data = subject.model_dump()
        data["components"] = [c.model_dump() if hasattr(c, 'model_dump') else c for c in (subject.components or [])]
        data["created_at"] = datetime.datetime.utcnow().isoformat()
        _col().document(doc_id).set(data)
        data["id"] = doc_id
        return data
    except Exception as e:
        logger.error(f"Error creating subject: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(subject_id: str, subject: SubjectCreate):
    try:
        ref = _col().document(subject_id)
        doc = ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Subject not found")
        data = subject.model_dump()
        data["components"] = [c.model_dump() if hasattr(c, 'model_dump') else c for c in (subject.components or [])]
        data["updated_at"] = datetime.datetime.utcnow().isoformat()
        ref.update(data)
        data["id"] = subject_id
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{subject_id}")
def delete_subject(subject_id: str):
    try:
        ref = _col().document(subject_id)
        doc = ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Subject not found")
        ref.delete()
        return {"message": "Subject deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Built-in subject catalog ----------

def _get_builtin_catalog():
    """Standard engineering subjects catalog."""
    catalog = []
    _id = 1

    cse_subjects = {
        "I": [("FEC101", "Engineering Mathematics I", 4), ("FEC102", "Engineering Physics", 4), ("FEC103", "Basic Electrical Engineering", 3)],
        "II": [("FEC201", "Engineering Mathematics II", 4), ("FEC202", "Engineering Chemistry", 4), ("FEC203", "Programming and Problem Solving", 3)],
        "III": [("CEC301", "Data Structures", 4), ("CEC302", "Digital Logic Design", 3), ("CEC303", "Discrete Mathematics", 3)],
        "IV": [("CEC401", "Computer Organization", 3), ("CEC402", "Database Management", 4), ("CEC403", "Operating Systems", 4)],
        "V": [("CEC501", "Computer Networks", 4), ("CEC502", "Software Engineering", 3), ("CEC503", "Theory of Computation", 3)],
        "VI": [("CEC601", "Machine Learning", 4), ("CEC602", "Web Technology", 3), ("CEC603", "Compiler Design", 3)],
        "VII": [("CEC701", "Artificial Intelligence", 4), ("CEC702", "Cloud Computing", 3), ("CEC703", "Data Mining", 3)],
        "VIII": [("CEC801", "Deep Learning", 4), ("CEC802", "Blockchain Technology", 3)],
    }

    for sem, subjects in cse_subjects.items():
        for code, name, credits in subjects:
            catalog.append({"id": _id, "department": "Computer Science Engineering", "semester": sem,
                            "subject_code": code, "subject_name": name, "default_credits": credits})
            _id += 1

    return catalog
