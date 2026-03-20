"""
AI Agent — combines Hindsight memory + Firebase data + Gemini to create 
a personalized campus assistant that learns from each interaction.
"""
from google import genai
from app.core.config import settings
from app.services.memory_service import store_memory, recall_memory, reflect_memory
from app.crud.firebase_crud import (
    list_events, list_clubs, list_locations,
    get_student, get_student_interests, get_student_clubs,
    get_student_attended_events
)
import logging

logger = logging.getLogger(__name__)

# Configure Gemini (new SDK)
_client = None


def _get_gemini_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


async def campus_agent(student_id: str, question: str) -> dict:
    """
    Main AI agent function. Combines:
    1. Hindsight memory (recall what we know about this student)
    2. Firebase data (campus events, clubs, locations)
    3. AI response generation (Gemini or Hindsight reflect)
    4. Memory storage (remember this interaction)
    """
    
    # 1. Try Hindsight reflect() first — it uses the student's full memory bank
    hindsight_response = reflect_memory(
        student_id=student_id,
        query=question,
        context=_build_campus_context(student_id)
    )
    
    if hindsight_response:
        # Store this question as a new memory
        store_memory(
            student_id=student_id,
            content=f"Student asked: {question}",
            context="chat_question"
        )
        
        return {
            "response": hindsight_response,
            "source": "hindsight_reflect",
            "memories_used": len(recall_memory(student_id, question))
        }
    
    # 2. Fallback: Use Gemini directly with recalled memories as context
    memories = recall_memory(student_id, question)
    memory_text = "\n".join([f"- {m['text']}" for m in memories]) if memories else "No previous memories."
    
    # Get campus data
    campus_context = _build_campus_context(student_id)
    
    prompt = f"""You are an AI campus assistant for SCOEFLOW CONNECT at Saraswati College of Engineering (SCOE).
You help students with personalized event recommendations, club suggestions, campus navigation, and deadline reminders.

**Student Memories (what you know about this student):**
{memory_text}

**Campus Context:**
{campus_context}

**Student Question:**
{question}

Instructions:
- Be friendly and conversational
- Reference the student's interests and past activities when relevant
- If recommending events or clubs, explain WHY based on their interests
- For navigation questions, give specific building and floor info
- Keep responses concise but helpful (3-5 sentences ideal)
- Use emojis sparingly for a friendly tone
"""
    
    try:
        client = _get_gemini_client()
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        ai_response = response.text
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        ai_response = (
            "I'm having trouble connecting to my AI brain right now. "
            "Please try again in a moment! 🤖"
        )
    
    # Store this interaction as memory
    store_memory(
        student_id=student_id,
        content=f"Student asked: {question}",
        context="chat_question"
    )
    
    return {
        "response": ai_response,
        "source": "gemini_with_memory",
        "memories_used": len(memories)
    }


def _build_campus_context(student_id: str) -> str:
    """Build context string from Firebase data."""
    context_parts = []
    
    try:
        # Student info
        student = get_student(student_id)
        if student:
            name = f"{student.get('first_name', '')} {student.get('last_name', '')}"
            dept = student.get('department', 'Unknown')
            sem = student.get('current_semester', '?')
            context_parts.append(f"Student: {name}, Department: {dept}, Semester: {sem}")
        
        # Student interests
        interests = get_student_interests(student_id)
        if interests:
            context_parts.append(f"Student's interests: {', '.join(interests)}")
        
        # Student's clubs
        student_clubs = get_student_clubs(student_id)
        if student_clubs:
            club_names = [c.get('name', '') for c in student_clubs]
            context_parts.append(f"Student's clubs: {', '.join(club_names)}")
        
        # Student's attended events
        attended = get_student_attended_events(student_id)
        if attended:
            event_names = [e.get('title', '') for e in attended[:5]]
            context_parts.append(f"Events attended: {', '.join(event_names)}")
        
        # Upcoming events
        all_events = list_events()
        if all_events:
            event_list = [f"{e.get('title', '')} ({e.get('category', '')}) on {e.get('date', '')} at {e.get('location', '')}" 
                         for e in all_events[:10]]
            context_parts.append(f"Upcoming campus events:\n" + "\n".join([f"  - {e}" for e in event_list]))
        
        # Available clubs
        all_clubs = list_clubs()
        if all_clubs:
            club_list = [f"{c.get('name', '')} ({c.get('category', '')})" for c in all_clubs]
            context_parts.append(f"Available clubs: {', '.join(club_list)}")
        
        # Campus locations
        locations = list_locations()
        if locations:
            loc_list = [f"{l.get('name', '')} - {l.get('building', '')}, Floor {l.get('floor', '')}" 
                       for l in locations[:15]]
            context_parts.append(f"Campus locations:\n" + "\n".join([f"  - {l}" for l in loc_list]))
    except Exception as e:
        logger.warning(f"Error building campus context: {e}")
    
    return "\n\n".join(context_parts) if context_parts else "No campus data available yet."
