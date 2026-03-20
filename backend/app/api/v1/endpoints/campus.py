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
