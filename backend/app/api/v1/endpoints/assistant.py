"""
AI Assistant endpoints — chat, interests, club joins, event attendance, memory viewing.
All interactions are stored in Hindsight memory for personalization.
"""
from fastapi import APIRouter, HTTPException
from app.schemas.campus import ChatMessage, InterestSave, JoinClub, AttendEvent
from app.services.ai_agent import campus_agent
from app.services.memory_service import store_memory, list_memories, recall_memory
from app.crud.firebase_crud import (
    save_student_interests, get_student_interests,
    join_club as db_join_club, get_student_clubs, leave_club,
    attend_event as db_attend_event, get_student_attended_events,
    get_student, get_club, get_event
)

router = APIRouter()


@router.post("/chat")
async def chat(msg: ChatMessage):
    """AI chat with Hindsight memory."""
    student = get_student(msg.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    result = await campus_agent(msg.student_id, msg.message)
    return {
        "response": result["response"],
        "memories_used": result.get("memories_used", 0),
        "source": result.get("source", "unknown")
    }


@router.post("/interests")
def save_interests(data: InterestSave):
    """Save student interests and store in Hindsight memory."""
    student = get_student(data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Save to Firebase
    save_student_interests(data.student_id, data.interests)
    
    # Store in Hindsight memory
    interest_text = ", ".join(data.interests)
    student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}"
    store_memory(
        data.student_id,
        f"Student {student_name} is interested in: {interest_text}",
        context="interest_selection"
    )
    
    return {
        "message": "Interests saved successfully",
        "interests": data.interests
    }


@router.get("/interests/{student_id}")
def get_interests(student_id: str):
    """Get student interests."""
    return {"interests": get_student_interests(student_id)}


@router.post("/join-club")
def join_club(data: JoinClub):
    """Join a club and store in Hindsight memory."""
    student = get_student(data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    club = get_club(data.club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    result = db_join_club(data.student_id, data.club_id)
    
    if not result.get("already_joined"):
        # Store in Hindsight memory
        student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}"
        store_memory(
            data.student_id,
            f"Student {student_name} joined the {club.get('name', '')} club (category: {club.get('category', '')})",
            context="club_join"
        )
    
    return {
        "message": "Joined club successfully" if not result.get("already_joined") else "Already a member",
        "club": club
    }


@router.get("/clubs/{student_id}")
def get_my_clubs(student_id: str):
    """Get clubs a student has joined."""
    return get_student_clubs(student_id)


@router.delete("/leave-club/{student_id}/{club_id}")
def leave_club_endpoint(student_id: str, club_id: str):
    """Leave a club."""
    success = leave_club(student_id, club_id)
    if not success:
        raise HTTPException(status_code=404, detail="Membership not found")
    return {"message": "Left club successfully"}


@router.post("/attend-event")
def attend_event(data: AttendEvent):
    """Mark event attendance and store in Hindsight memory."""
    student = get_student(data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    event = get_event(data.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    result = db_attend_event(data.student_id, data.event_id)
    
    if not result.get("already_attended"):
        # Store in Hindsight memory
        student_name = f"{student.get('first_name', '')} {student.get('last_name', '')}"
        store_memory(
            data.student_id,
            f"Student {student_name} attended the event: {event.get('title', '')} (category: {event.get('category', '')})",
            context="event_attendance"
        )
    
    return {
        "message": "Attendance recorded" if not result.get("already_attended") else "Already attended",
        "event": event
    }


@router.get("/attended-events/{student_id}")
def get_attended_events(student_id: str):
    """Get events a student has attended."""
    return get_student_attended_events(student_id)


@router.get("/memories/{student_id}")
def get_memories(student_id: str):
    """View stored Hindsight memories for a student (for demo/debug)."""
    memories = list_memories(student_id)
    return {
        "student_id": student_id,
        "memory_count": len(memories),
        "memories": memories
    }


@router.get("/recall/{student_id}")
def recall(student_id: str, query: str = ""):
    """Search student memories with a query (for demo)."""
    if not query:
        return {"results": []}
    memories = recall_memory(student_id, query)
    return {"results": memories}
