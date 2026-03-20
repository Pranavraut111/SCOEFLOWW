"""
Results & Marks API endpoints — Firebase Firestore backed.
Smart results engine: only calculates for students with actual marks.
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

class MarksEntryItem(BaseModel):
    student_id: str
    marks_obtained: float = 0
    is_absent: bool = False

    class Config:
        extra = "allow"


class BulkMarksCreate(BaseModel):
    subject_id: str
    subject_component_id: Optional[int] = None
    exam_event_id: str
    marks_entries: List[MarksEntryItem]
    marks_entered_by: str = "admin"

    class Config:
        extra = "allow"


# ---------- Collections ----------

def _marks_col():
    return get_firestore_db().collection("component_marks")

def _subject_results_col():
    return get_firestore_db().collection("subject_results")

def _semester_results_col():
    return get_firestore_db().collection("semester_results")

def _published_results_col():
    return get_firestore_db().collection("published_results")


# ---------- Grading helpers ----------

def _grade_from_percentage(pct: float) -> str:
    if pct >= 90: return "O"
    if pct >= 80: return "A+"
    if pct >= 70: return "A"
    if pct >= 60: return "B+"
    if pct >= 55: return "B"
    if pct >= 50: return "C"
    if pct >= 45: return "D"
    if pct >= 40: return "E"
    return "F"

def _grade_points(grade: str) -> float:
    return {"O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "D": 4, "E": 3, "F": 0}.get(grade, 0)

def _result_class(pct: float) -> str:
    if pct >= 75: return "First Class with Distinction"
    if pct >= 60: return "First Class"
    if pct >= 50: return "Second Class"
    if pct >= 40: return "Pass Class"
    return "Fail"

def _semester_roman(sem: int) -> str:
    roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"]
    return roman[sem] if sem < len(roman) else str(sem)


# ============ COMPONENT MARKS ============

@router.post("/marks/component/bulk")
def bulk_save_marks(data: BulkMarksCreate):
    """Save marks for multiple students for a subject component."""
    try:
        saved = 0
        for entry in data.marks_entries:
            doc_id = f"{data.exam_event_id}_{data.subject_id}_{entry.student_id}"
            mark_data = {
                "exam_event_id": data.exam_event_id,
                "subject_id": data.subject_id,
                "subject_component_id": data.subject_component_id,
                "student_id": str(entry.student_id),
                "marks_obtained": entry.marks_obtained,
                "is_absent": entry.is_absent,
                "marks_entered_by": data.marks_entered_by,
                "created_at": datetime.datetime.utcnow().isoformat(),
            }
            _marks_col().document(doc_id).set(mark_data, merge=True)
            saved += 1
        
        return {"message": f"Saved {saved} marks entries", "saved": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/marks/component/all")
def get_all_component_marks(
    department: str = Query(...),
    semester: int = Query(...)
):
    """Get all component marks for a department/semester.
    Only returns marks for students who actually have marks entered."""
    try:
        db = get_firestore_db()
        sem_roman = _semester_roman(semester)
        
        # Get subjects for this dept/semester
        subjects_docs = db.collection("subjects").where(
            filter=FieldFilter("department", "==", department)
        ).where(
            filter=FieldFilter("semester", "==", sem_roman)
        ).stream()
        
        subject_ids = [d.id for d in subjects_docs]
        if not subject_ids:
            return []
        
        all_marks = []
        for sid in subject_ids:
            marks_docs = _marks_col().where(
                filter=FieldFilter("subject_id", "==", sid)
            ).stream()
            for d in marks_docs:
                data = d.to_dict()
                data["id"] = d.id
                all_marks.append(data)
        
        return all_marks
    except Exception as e:
        logger.error(f"Error: {e}")
        return []


# ============ SMART CALCULATION: ONLY STUDENTS WITH MARKS ============

@router.post("/calculate-all")
def calculate_all_results(
    department: str = Query(...),
    semester: int = Query(...),
    academic_year: str = Query("2025-26")
):
    """Smart endpoint: finds all students with marks in this dept/semester,
    calculates subject results AND semester SGPA/CGPA in one go.
    Only processes students who actually have marks entered."""
    try:
        db = get_firestore_db()
        sem_roman = _semester_roman(semester)
        
        # Step 1: Get subjects for this dept/semester
        subjects_docs = list(db.collection("subjects").where(
            filter=FieldFilter("department", "==", department)
        ).where(
            filter=FieldFilter("semester", "==", sem_roman)
        ).stream())
        
        subjects = {}
        for d in subjects_docs:
            data = d.to_dict()
            data["id"] = d.id
            subjects[d.id] = data
        
        if not subjects:
            return {"message": "No subjects found for this semester", "calculated": 0}
        
        # Step 2: Get ALL marks for these subjects
        all_marks = []
        for sid in subjects:
            marks_docs = _marks_col().where(
                filter=FieldFilter("subject_id", "==", sid)
            ).stream()
            for d in marks_docs:
                m = d.to_dict()
                m["id"] = d.id
                all_marks.append(m)
        
        if not all_marks:
            return {"message": "No marks found. Enter marks first.", "calculated": 0}
        
        # Step 3: Group marks by student_id
        student_marks = {}
        for m in all_marks:
            sid = str(m.get("student_id", ""))
            if not sid:
                continue
            if sid not in student_marks:
                student_marks[sid] = {}
            subject_id = m.get("subject_id", "")
            if subject_id not in student_marks[sid]:
                student_marks[sid][subject_id] = []
            student_marks[sid][subject_id].append(m)
        
        # Step 4: For each student with marks, calculate subject results
        subject_results_count = 0
        semester_results_count = 0
        
        for student_id, subj_marks_map in student_marks.items():
            # Get student info
            student_doc = db.collection("students").document(student_id).get()
            student_name = ""
            roll_number = ""
            if student_doc.exists:
                s = student_doc.to_dict()
                student_name = f"{s.get('first_name', '')} {s.get('last_name', '')}".strip()
                roll_number = s.get("roll_number", "")
            
            subject_results = []
            
            for subject_id_key, marks_list in subj_marks_map.items():
                subject = subjects.get(subject_id_key)
                if not subject:
                    continue
                
                components = subject.get("components", [])
                credits = subject.get("credits", 3)
                passing_criteria = subject.get("overall_passing_criteria", 40)
                
                # Build marks by component type
                marks_by_comp = {}
                for m in marks_list:
                    comp_type = m.get("component_type", "ESE")
                    marks_by_comp[comp_type] = m.get("marks_obtained", 0)
                
                # If no component breakdown, treat all marks as ESE
                if not marks_by_comp and marks_list:
                    marks_by_comp["ESE"] = marks_list[0].get("marks_obtained", 0)
                
                # Calculate totals
                total_obtained = 0
                total_max = 0
                component_results = {}
                
                if components:
                    for comp in components:
                        comp_type = comp.get("component_type", "")
                        out_of = comp.get("out_of_marks", 0)
                        passing = comp.get("passing_marks", 0)
                        obtained = marks_by_comp.get(comp_type, 0)
                        
                        total_obtained += obtained
                        total_max += out_of
                        component_results[comp_type] = {
                            "marks_obtained": obtained,
                            "out_of_marks": out_of,
                            "passing_marks": passing,
                            "is_pass": obtained >= passing
                        }
                else:
                    # No components defined, use raw marks
                    total_obtained = sum(marks_by_comp.values())
                    total_max = 100
                
                percentage = (total_obtained / total_max * 100) if total_max > 0 else 0
                grade = _grade_from_percentage(percentage)
                is_pass = percentage >= passing_criteria
                
                # Save subject result
                result_id = f"{student_id}_{subject_id_key}_{academic_year}_{semester}"
                result_data = {
                    "student_id": student_id,
                    "subject_id": subject_id_key,
                    "subject_code": subject.get("subject_code", ""),
                    "subject_name": subject.get("subject_name", ""),
                    "credits": credits,
                    "academic_year": academic_year,
                    "semester": semester,
                    "total_marks_obtained": total_obtained,
                    "total_max_marks": total_max,
                    "percentage": round(percentage, 2),
                    "grade": grade,
                    "grade_points": _grade_points(grade),
                    "is_pass": is_pass,
                    "components": component_results,
                    "calculated_at": datetime.datetime.utcnow().isoformat(),
                }
                
                _subject_results_col().document(result_id).set(result_data, merge=True)
                subject_results.append(result_data)
                subject_results_count += 1
            
            # Step 5: Calculate semester SGPA/CGPA for this student
            if subject_results:
                total_credits_attempted = 0
                total_credits_earned = 0
                total_grade_points = 0
                subjects_passed = 0
                subjects_failed = 0
                total_marks = 0
                total_max_marks = 0
                
                for sr in subject_results:
                    cr = sr.get("credits", 3)
                    total_credits_attempted += cr
                    total_marks += sr.get("total_marks_obtained", 0)
                    total_max_marks += sr.get("total_max_marks", 0)
                    
                    if sr.get("is_pass", False):
                        subjects_passed += 1
                        total_credits_earned += cr
                    else:
                        subjects_failed += 1
                    total_grade_points += cr * sr.get("grade_points", 0)
                
                sgpa = round(total_grade_points / total_credits_attempted, 2) if total_credits_attempted > 0 else 0
                overall_percentage = round(total_marks / total_max_marks * 100, 2) if total_max_marks > 0 else 0
                
                # Simple CGPA (same as SGPA for single semester)
                cgpa = sgpa
                
                has_backlogs = subjects_failed > 0
                result_status = "PASS" if not has_backlogs else "ATKT"
                
                sem_result_id = f"{student_id}_{semester}_{academic_year}"
                sem_result = {
                    "student_id": student_id,
                    "student_name": student_name,
                    "roll_number": roll_number,
                    "semester": semester,
                    "academic_year": academic_year,
                    "department": department,
                    "total_subjects": len(subject_results),
                    "subjects_passed": subjects_passed,
                    "subjects_failed": subjects_failed,
                    "total_credits_attempted": total_credits_attempted,
                    "total_credits_earned": total_credits_earned,
                    "sgpa": sgpa,
                    "cgpa": cgpa,
                    "overall_percentage": overall_percentage,
                    "result_status": result_status,
                    "result_class": _result_class(overall_percentage),
                    "has_backlogs": has_backlogs,
                    "calculated_at": datetime.datetime.utcnow().isoformat(),
                }
                
                _semester_results_col().document(sem_result_id).set(sem_result, merge=True)
                semester_results_count += 1
        
        return {
            "message": f"Calculated {subject_results_count} subject results and {semester_results_count} semester results",
            "subject_results_calculated": subject_results_count,
            "semester_results_calculated": semester_results_count,
            "students_processed": len(student_marks),
        }
    except Exception as e:
        logger.error(f"Error in calculate-all: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ INDIVIDUAL ENDPOINTS (kept for compatibility) ============

@router.post("/subject/calculate")
def calculate_subject_result(
    student_id: str = Query(...),
    subject_id: str = Query(...),
    academic_year: str = Query("2025-26"),
    semester: int = Query(1)
):
    """Calculate subject result for a single student."""
    try:
        db = get_firestore_db()
        sub_doc = db.collection("subjects").document(subject_id).get()
        if not sub_doc.exists:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        subject = sub_doc.to_dict()
        components = subject.get("components", [])
        credits = subject.get("credits", 3)
        passing_criteria = subject.get("overall_passing_criteria", 40)
        
        marks_docs = list(_marks_col().where(
            filter=FieldFilter("student_id", "==", str(student_id))
        ).where(
            filter=FieldFilter("subject_id", "==", subject_id)
        ).stream())
        
        if not marks_docs:
            return {"message": "No marks found for this student-subject", "skipped": True}
        
        marks_by_comp = {}
        for d in marks_docs:
            m = d.to_dict()
            marks_by_comp[m.get("component_type", "ESE")] = m.get("marks_obtained", 0)
        
        total_obtained = 0
        total_max = 0
        component_results = {}
        
        for comp in components:
            comp_type = comp.get("component_type", "")
            out_of = comp.get("out_of_marks", 0)
            passing = comp.get("passing_marks", 0)
            obtained = marks_by_comp.get(comp_type, 0)
            total_obtained += obtained
            total_max += out_of
            component_results[comp_type] = {
                "marks_obtained": obtained,
                "out_of_marks": out_of,
                "is_pass": obtained >= passing
            }
        
        if total_max == 0:
            total_obtained = sum(marks_by_comp.values())
            total_max = 100
        
        percentage = (total_obtained / total_max * 100) if total_max > 0 else 0
        grade = _grade_from_percentage(percentage)
        
        result_id = f"{student_id}_{subject_id}_{academic_year}_{semester}"
        result_data = {
            "student_id": str(student_id),
            "subject_id": subject_id,
            "subject_code": subject.get("subject_code", ""),
            "subject_name": subject.get("subject_name", ""),
            "credits": credits,
            "academic_year": academic_year,
            "semester": semester,
            "total_marks_obtained": total_obtained,
            "total_max_marks": total_max,
            "percentage": round(percentage, 2),
            "grade": grade,
            "grade_points": _grade_points(grade),
            "is_pass": percentage >= passing_criteria,
            "components": component_results,
            "calculated_at": datetime.datetime.utcnow().isoformat(),
        }
        
        _subject_results_col().document(result_id).set(result_data, merge=True)
        result_data["id"] = result_id
        return result_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/semester/calculate")
def calculate_semester_result(
    student_id: str = Query(...),
    semester: int = Query(...),
    academic_year: str = Query("2025-26")
):
    """Calculate SGPA/CGPA for a single student."""
    try:
        results_docs = list(_subject_results_col().where(
            filter=FieldFilter("student_id", "==", str(student_id))
        ).where(
            filter=FieldFilter("semester", "==", semester)
        ).stream())
        
        if not results_docs:
            return {"message": "No subject results found. Calculate subject results first.", "skipped": True}
        
        subject_results = [d.to_dict() for d in results_docs]
        
        db = get_firestore_db()
        student_doc = db.collection("students").document(student_id).get()
        student_name = ""
        roll_number = ""
        dept = ""
        if student_doc.exists:
            s = student_doc.to_dict()
            student_name = f"{s.get('first_name', '')} {s.get('last_name', '')}".strip()
            roll_number = s.get("roll_number", "")
            dept = s.get("department", "")
        
        total_credits_attempted = 0
        total_credits_earned = 0
        total_grade_points = 0
        subjects_passed = 0
        subjects_failed = 0
        total_marks = 0
        total_max_marks = 0
        
        for sr in subject_results:
            cr = sr.get("credits", 3)
            total_credits_attempted += cr
            total_marks += sr.get("total_marks_obtained", 0)
            total_max_marks += sr.get("total_max_marks", 0)
            
            if sr.get("is_pass", False):
                subjects_passed += 1
                total_credits_earned += cr
            else:
                subjects_failed += 1
            total_grade_points += cr * sr.get("grade_points", 0)
        
        sgpa = round(total_grade_points / total_credits_attempted, 2) if total_credits_attempted > 0 else 0
        overall_percentage = round(total_marks / total_max_marks * 100, 2) if total_max_marks > 0 else 0
        
        sem_result_id = f"{student_id}_{semester}_{academic_year}"
        sem_result = {
            "student_id": str(student_id),
            "student_name": student_name,
            "roll_number": roll_number,
            "semester": semester,
            "academic_year": academic_year,
            "department": dept,
            "total_subjects": len(subject_results),
            "subjects_passed": subjects_passed,
            "subjects_failed": subjects_failed,
            "total_credits_attempted": total_credits_attempted,
            "total_credits_earned": total_credits_earned,
            "sgpa": sgpa,
            "cgpa": sgpa,
            "overall_percentage": overall_percentage,
            "result_status": "PASS" if subjects_failed == 0 else "ATKT",
            "result_class": _result_class(overall_percentage),
            "has_backlogs": subjects_failed > 0,
            "calculated_at": datetime.datetime.utcnow().isoformat(),
        }
        
        _semester_results_col().document(sem_result_id).set(sem_result, merge=True)
        sem_result["id"] = sem_result_id
        return sem_result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ LIST SEMESTER RESULTS ============

@router.get("/semester/all")
def get_all_semester_results(
    department: str = Query(...),
    semester: int = Query(...),
    academic_year: str = Query("2025-26")
):
    """Get all semester results for a department/semester/year."""
    try:
        docs = _semester_results_col().where(
            filter=FieldFilter("semester", "==", semester)
        ).where(
            filter=FieldFilter("academic_year", "==", academic_year)
        ).where(
            filter=FieldFilter("department", "==", department)
        ).stream()
        
        results = []
        for d in docs:
            data = d.to_dict()
            data["id"] = d.id
            results.append(data)
        
        return results
    except Exception as e:
        logger.error(f"Error: {e}")
        # Fallback: try without department filter
        try:
            docs = _semester_results_col().where(
                filter=FieldFilter("semester", "==", semester)
            ).where(
                filter=FieldFilter("academic_year", "==", academic_year)
            ).stream()
            
            results = []
            db = get_firestore_db()
            for d in docs:
                data = d.to_dict()
                data["id"] = d.id
                # Check department from student record
                student_doc = db.collection("students").document(data.get("student_id", "")).get()
                if student_doc.exists and student_doc.to_dict().get("department") == department:
                    results.append(data)
            return results
        except Exception:
            return []


# ============ DETAILED RESULT SHEET ============

@router.get("/detailed-result-sheet/{student_id}")
def get_detailed_result_sheet(
    student_id: str,
    academic_year: str = Query("2025-26"),
    semester: int = Query(1)
):
    """Get detailed result sheet for a student."""
    try:
        db = get_firestore_db()
        
        student_doc = db.collection("students").document(student_id).get()
        if not student_doc.exists:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student = student_doc.to_dict()
        student_info = {
            "id": student_id,
            "name": f"{student.get('first_name', '')} {student.get('middle_name', '')} {student.get('last_name', '')}".strip(),
            "roll_number": student.get("roll_number", ""),
            "department": student.get("department", ""),
            "semester": semester,
        }
        
        sr_docs = _subject_results_col().where(
            filter=FieldFilter("student_id", "==", str(student_id))
        ).where(
            filter=FieldFilter("semester", "==", semester)
        ).stream()
        
        subjects = [{"id": d.id, **d.to_dict()} for d in sr_docs]
        
        sem_doc = _semester_results_col().document(f"{student_id}_{semester}_{academic_year}").get()
        semester_summary = sem_doc.to_dict() if sem_doc.exists else {
            "sgpa": 0, "cgpa": 0, "overall_percentage": 0,
            "result_status": "PENDING", "result_class": "N/A"
        }
        
        return {
            "student": student_info,
            "subjects": subjects,
            "semester_summary": semester_summary,
            "academic_year": academic_year,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ PUBLISH RESULTS ============

@router.post("/publish")
def publish_results(
    department: str = Query(...),
    semester: str = Query(...),
    academic_year: str = Query("2025-26"),
    student_ids: List[str] = Query(default=[])
):
    """Publish results to students."""
    try:
        published_count = 0
        sem_int = int(semester)
        
        for sid in student_ids:
            doc_id = f"{sid}_{sem_int}_{academic_year}"
            sem_doc = _semester_results_col().document(doc_id).get()
            
            if sem_doc.exists:
                result = sem_doc.to_dict()
                pub_data = {
                    **result,
                    "published": True,
                    "published_at": datetime.datetime.utcnow().isoformat(),
                    "department": department,
                }
                _published_results_col().document(doc_id).set(pub_data, merge=True)
                published_count += 1
        
        return {"message": f"Published {published_count} results", "published_count": published_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student/{student_id}/published")
def get_student_published_results(student_id: str):
    """Get published results for a student."""
    try:
        docs = _published_results_col().where(
            filter=FieldFilter("student_id", "==", student_id)
        ).stream()
        return [{"id": d.id, **d.to_dict()} for d in docs]
    except Exception as e:
        logger.error(f"Error: {e}")
        return []
