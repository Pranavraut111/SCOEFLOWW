"""
Campus management endpoints — clubs, events, locations (admin CRUD).
"""
from fastapi import APIRouter, HTTPException
from app.crud.firebase_crud import (
    create_club, list_clubs, get_club, update_club, delete_club,
    create_event, list_events, get_event, update_event, delete_event,
    create_location, list_locations, update_location, delete_location
)
from app.schemas.campus import (
    ClubCreate, EventCreate, CampusLocationCreate
)
from typing import Optional

router = APIRouter()


# ===== CLUBS =====

@router.post("/clubs")
def create_new_club(club: ClubCreate):
    return create_club(club.model_dump())


@router.get("/clubs")
def get_all_clubs():
    return list_clubs()


@router.get("/clubs/{club_id}")
def get_club_by_id(club_id: str):
    club = get_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club


@router.put("/clubs/{club_id}")
def update_club_by_id(club_id: str, data: dict):
    result = update_club(club_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Club not found")
    return result


@router.delete("/clubs/{club_id}")
def delete_club_by_id(club_id: str):
    success = delete_club(club_id)
    if not success:
        raise HTTPException(status_code=404, detail="Club not found")
    return {"message": "Club deleted successfully"}


# ===== EVENTS =====

@router.post("/events")
def create_new_event(event: EventCreate):
    return create_event(event.model_dump())


@router.get("/events")
def get_all_events(category: Optional[str] = None):
    return list_events(category=category)


@router.get("/events/{event_id}")
def get_event_by_id(event_id: str):
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.put("/events/{event_id}")
def update_event_by_id(event_id: str, data: dict):
    result = update_event(event_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Event not found")
    return result


@router.delete("/events/{event_id}")
def delete_event_by_id(event_id: str):
    success = delete_event(event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}


# ===== CAMPUS LOCATIONS =====

@router.post("/locations")
def create_new_location(location: CampusLocationCreate):
    return create_location(location.model_dump())


@router.get("/locations")
def get_all_locations(category: Optional[str] = None):
    return list_locations(category=category)


@router.put("/locations/{loc_id}")
def update_location_by_id(loc_id: str, data: dict):
    result = update_location(loc_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")
    return result


@router.delete("/locations/{loc_id}")
def delete_location_by_id(loc_id: str):
    success = delete_location(loc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "Location deleted successfully"}


# ===== STUDENT CLUB/EVENT ACTIONS =====

from app.crud.firebase_crud import (
    join_club as crud_join_club,
    get_student_clubs as crud_get_student_clubs,
    leave_club as crud_leave_club,
    attend_event as crud_attend_event,
    get_student_attended_events as crud_get_student_events,
)


@router.post("/clubs/{club_id}/join")
def student_join_club(club_id: str, data: dict):
    student_id = data.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id is required")
    result = crud_join_club(student_id, club_id)
    return result


@router.post("/clubs/{club_id}/leave")
def student_leave_club(club_id: str, data: dict):
    student_id = data.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id is required")
    success = crud_leave_club(student_id, club_id)
    if not success:
        raise HTTPException(status_code=404, detail="Membership not found")
    return {"message": "Left club successfully"}


@router.get("/student/{student_id}/clubs")
def get_clubs_for_student(student_id: str):
    return crud_get_student_clubs(student_id)


@router.post("/events/{event_id}/attend")
def student_attend_event(event_id: str, data: dict):
    student_id = data.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id is required")
    result = crud_attend_event(student_id, event_id)
    return result


@router.get("/student/{student_id}/events")
def get_events_for_student(student_id: str):
    return crud_get_student_events(student_id)

