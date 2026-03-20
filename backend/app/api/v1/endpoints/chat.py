"""
AI Chat endpoint for student portal — uses Gemini 2.5 Flash with SCOE campus knowledge,
Hindsight memory for personalization, and Firestore for chat history.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from app.core.config import settings
from app.core.firebase import get_firestore_db
from datetime import datetime
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

_client = None

def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


# ---- Hindsight helpers (graceful fallback) ----
def _store_hindsight(student_id: str, content: str):
    """Store a memory in Hindsight if available."""
    try:
        from app.services.memory_service import store_memory
        store_memory(student_id, content, "chat_interaction")
    except Exception as e:
        logger.debug(f"Hindsight store skipped: {e}")

def _recall_hindsight(student_id: str, query: str) -> str:
    """Recall memories from Hindsight if available."""
    try:
        from app.services.memory_service import recall_memory
        memories = recall_memory(student_id, query)
        if memories:
            return "\n".join([f"- {m.get('text', '')}" for m in memories])
    except Exception as e:
        logger.debug(f"Hindsight recall skipped: {e}")
    return ""

def _reflect_hindsight(student_id: str, query: str, context: str) -> Optional[str]:
    """Try Hindsight reflect for AI-powered memory response."""
    try:
        from app.services.memory_service import reflect_memory
        return reflect_memory(student_id, query, context)
    except Exception as e:
        logger.debug(f"Hindsight reflect skipped: {e}")
    return None


# ---- SCOE Campus Knowledge Base ----
SCOE_KNOWLEDGE = """
## SARASWATI COLLEGE OF ENGINEERING (SCOE) - COMPLETE CAMPUS GUIDE

### About SCOE
Saraswati College of Engineering (SCOE) is the best engineering college in Navi Mumbai, established in 2004.
Our vision is to foster a knowledgeable society through leading-edge research and education.
Located in Kharghar, Navi Mumbai, with spacious facilities including classrooms, laboratories, library, canteen, and sports grounds.

### Programs Offered
- Computer Engineering (CE)
- Computer Science & Engineering (AI & ML)
- Data Science (DS)
- Mechanical Engineering (ME)
- Civil Engineering (CivE)
- Information Technology (IT)
- Automobile Engineering (AE)

### Campus Building Architecture (Floor-wise Layout)

**Ground Floor:**
- Main Entrance & Reception
- Administrative Office
- Accounts Section
- Principal Office
- Canteen / Cafeteria
- Parking Area
- Security Room
- Examination Cell

**First Floor:**
- Mechanical Engineering Department
- Automobile Engineering Department
- ME/AE Labs (Workshop, Thermodynamics Lab, Fluid Mechanics Lab)
- Drawing Hall
- Seminar Hall 1

**Second Floor:**
- Computer Engineering Department (HOD Office, Faculty Rooms)
- CE Computer Labs (Lab 1, Lab 2, Lab 3)
- Information Technology Department
- IT Labs
- Department Library

**Third Floor:**
- Computer Science & Engineering (AI & ML) Department
- Data Science Department
- AI/ML Labs & Research Lab
- Project Lab
- Seminar Hall 2
- Smart Classroom

**Fourth Floor:**
- Civil Engineering Department
- Civil Labs (Surveying Lab, Material Testing Lab, Concrete Lab)
- Environmental Engineering Lab
- Conference Room

**Fifth Floor:**
- Library (Main Library with digital section)
- Reading Room
- Faculty Development Center
- Server Room
- Terrace Garden / Open Study Area

### Clubs & Committees
1. **NSS (National Service Scheme)** - Community service, blood donation drives, village visits, social awareness campaigns
2. **Rotaract Club of Saraswati College** - Leadership development, community projects, professional networking, Rotary events
3. **Student Council** - Student governance, cultural events, annual fest (CRESCENDO), sports events, student representation

### Campus Facilities
- **Library**: 5th floor, digital section, NPTEL access, journal subscriptions
- **Canteen**: Ground floor, affordable meals, snacks, beverages
- **Sports Ground**: Cricket, football, volleyball, basketball courts
- **Gymnasium**: Available for students
- **Wi-Fi**: Campus-wide free Wi-Fi
- **Computer Labs**: Multiple labs with 60+ systems each
- **Seminar Halls**: 2 halls (1st and 3rd floor) for events and presentations
- **Parking**: Ground floor, two-wheeler and four-wheeler sections

### Contact & Location
- Address: Plot No. 46, Sector 5, Kharghar, Navi Mumbai - 410210
- Near Kharghar Railway Station (Central Line)
- Website: www.scoe.edu.in

### Academic Calendar
- Semester system (2 semesters per year)
- Internal Assessment (IA), Oral/Viva, End Semester Exam (ESE)
- University: Mumbai University (MU)

### Important Contacts
- Examination Cell: Ground Floor
- Admission Office: Ground Floor
- TPO (Training & Placement Office): Available for placements and internships
"""


class ChatRequest(BaseModel):
    student_id: str
    message: str

class ChatResponse(BaseModel):
    response: str
    source: str

class ChatHistoryResponse(BaseModel):
    messages: list


def _get_chat_history(student_id: str, limit: int = 20) -> list:
    """Get recent chat history from Firestore."""
    try:
        db = get_firestore_db()
        docs = (db.collection("chat_history")
                .document(student_id)
                .collection("messages")
                .order_by("timestamp")
                .limit(limit)
                .stream())
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        logger.warning(f"Could not fetch chat history: {e}")
        return []


def _save_chat_message(student_id: str, role: str, text: str):
    """Save a chat message to Firestore."""
    try:
        db = get_firestore_db()
        db.collection("chat_history").document(student_id).collection("messages").add({
            "role": role,
            "text": text,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.warning(f"Could not save chat message: {e}")


@router.post("/ask", response_model=ChatResponse)
async def ask_ai(request: ChatRequest):
    """Chat with the SCOE AI assistant — uses Hindsight memory + Gemini 2.5 Flash."""
    try:
        # 1. Try Hindsight reflect first (if available)
        hindsight_answer = _reflect_hindsight(
            request.student_id,
            request.message,
            SCOE_KNOWLEDGE[:2000]
        )
        if hindsight_answer:
            # Store interaction
            _store_hindsight(request.student_id, f"Q: {request.message}\nA: {hindsight_answer}")
            _save_chat_message(request.student_id, "user", request.message)
            _save_chat_message(request.student_id, "bot", hindsight_answer)
            return ChatResponse(response=hindsight_answer, source="hindsight")

        # 2. Recall Hindsight memories for context
        hindsight_memories = _recall_hindsight(request.student_id, request.message)

        # 3. Get student personality for context
        personality_ctx = ""
        try:
            db = get_firestore_db()
            doc = db.collection("student_profiles").document(request.student_id).get()
            if doc.exists:
                profile = doc.to_dict()
                personality_ctx = f"""
Student Personality Profile:
- Academic Interest: {profile.get('academic_interest', 'unknown')}
- Favorite Subjects: {', '.join(profile.get('favorite_subjects', []))}
- Sports Interest: {profile.get('sports_interest', 'unknown')}
- Clubs Interested: {', '.join(profile.get('clubs_interested', []))}
- Learning Style: {profile.get('learning_style', 'unknown')}
- Career Goal: {profile.get('career_goal', 'not specified')}
"""
        except Exception as e:
            logger.warning(f"Could not fetch personality: {e}")

        # 4. Get student info
        student_ctx = ""
        try:
            db = get_firestore_db()
            s_doc = db.collection("students").document(request.student_id).get()
            if s_doc.exists:
                s = s_doc.to_dict()
                student_ctx = f"Student: {s.get('first_name', '')} {s.get('last_name', '')}, Dept: {s.get('department', '')}, Sem: {s.get('current_semester', '')}"
        except Exception as e:
            logger.warning(f"Could not fetch student: {e}")

        # 5. Get recent chat history for context
        recent_history = _get_chat_history(request.student_id, limit=10)
        history_ctx = ""
        if recent_history:
            history_ctx = "Recent conversation history:\n"
            for msg in recent_history[-10:]:
                role_label = "Student" if msg.get("role") == "user" else "Assistant"
                history_ctx += f"{role_label}: {msg.get('text', '')[:200]}\n"

        # 6. Build prompt
        memory_section = f"\nStudent Memories (from Hindsight):\n{hindsight_memories}" if hindsight_memories else ""

        prompt = f"""You are the official AI campus assistant for SCOEFLOW CONNECT at Saraswati College of Engineering (SCOE), Kharghar, Navi Mumbai.

{SCOE_KNOWLEDGE}

{student_ctx}
{personality_ctx}
{memory_section}
{history_ctx}

RULES:
- Be friendly, helpful, and conversational
- For navigation/location questions, give SPECIFIC floor and location info from the campus architecture above
- For club questions, mention our 3 main clubs: NSS, Rotaract, Student Council
- For academic queries, reference the departments and their floor locations
- Personalize responses based on the student profile and conversation history when relevant
- Keep responses concise (3-6 sentences)
- Use emojis sparingly for a friendly tone
- Always be accurate about floor locations
- If you do not know something specific, say so honestly

Student Question: {request.message}

Respond helpfully:"""

        # 7. Call Gemini 2.5 Flash
        client = _get_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        ai_response = response.text

        # 8. Store in Hindsight + Firestore
        _store_hindsight(request.student_id, f"Q: {request.message}\nA: {ai_response}")
        _save_chat_message(request.student_id, "user", request.message)
        _save_chat_message(request.student_id, "bot", ai_response)

        return ChatResponse(response=ai_response, source="gemini")

    except Exception as e:
        logger.error(f"Chat error details: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            return ChatResponse(
                response="The AI service is temporarily busy (quota limit). Please try again in a minute.",
                source="error"
            )
        return ChatResponse(
            response=f"I am having trouble right now. Please try again shortly. (Error: {str(e)})",
            source="error"
        )


@router.get("/history/{student_id}")
async def get_chat_history(student_id: str):
    """Get chat history for a student."""
    messages = _get_chat_history(student_id, limit=50)
    return {"messages": messages}


@router.delete("/history/{student_id}")
async def clear_chat_history(student_id: str):
    """Clear chat history for a student."""
    try:
        db = get_firestore_db()
        docs = db.collection("chat_history").document(student_id).collection("messages").stream()
        for doc in docs:
            doc.reference.delete()
        return {"status": "cleared"}
    except Exception as e:
        logger.error(f"Clear history error: {e}")
        return {"status": "error", "detail": str(e)}


@router.get("/recommendations/{student_id}")
async def get_recommendations(student_id: str):
    """Generate AI recommendations based on student personality profile."""
    try:
        # Get personality profile
        db = get_firestore_db()
        doc = db.collection("student_profiles").document(student_id).get()
        if not doc.exists:
            return {"recommendations": None, "message": "Complete the onboarding quiz first to get personalized recommendations."}

        profile = doc.to_dict()

        # Get student info
        student_ctx = ""
        try:
            s_doc = db.collection("students").document(student_id).get()
            if s_doc.exists:
                s = s_doc.to_dict()
                student_ctx = f"Student: {s.get('first_name', '')} {s.get('last_name', '')}, Dept: {s.get('department', '')}, Sem: {s.get('current_semester', '')}"
        except:
            pass

        # Recall Hindsight memories
        memories_ctx = _recall_hindsight(student_id, "student interests clubs activities goals")

        prompt = f"""Based on the following student profile, generate PERSONALIZED recommendations.
Be specific and actionable. Use the student's actual interests and goals.

{student_ctx}

Student Profile:
- Academic Interest: {profile.get('academic_interest', 'unknown')}
- Favorite Subjects: {', '.join(profile.get('favorite_subjects', []))}
- Sports Interest: {profile.get('sports_interest', 'unknown')}
- Sports Played: {', '.join(profile.get('sports_played', []))}
- Clubs Interested: {', '.join(profile.get('clubs_interested', []))}
- Learning Style: {profile.get('learning_style', 'unknown')}
- Social Preference: {profile.get('social_preference', 'unknown')}
- Career Goal: {profile.get('career_goal', 'not specified')}
- Semester Goal: {profile.get('goals_this_semester', 'not specified')}

{"Student Memories: " + memories_ctx if memories_ctx else ""}

Available SCOE Clubs: NSS (community service), Rotaract (leadership/networking), Student Council (governance/events)

Generate a JSON response with exactly this structure (no markdown, just pure JSON):
{{
    "clubs": [
        {{"name": "Club Name", "reason": "Why this club suits them (1-2 sentences)", "match_score": 85}}
    ],
    "academic_tips": [
        "Specific actionable academic tip based on their learning style and subjects"
    ],
    "improvements": [
        "Specific area they can improve with a concrete suggestion"
    ],
    "career_steps": [
        "Specific next step toward their career goal"
    ],
    "activity_suggestions": [
        "Fun activity or event suggestion based on interests"
    ]
}}

Generate 2-3 items for each category. Be specific, not generic. Reference their actual interests."""

        client = _get_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        # Parse JSON from response
        import json
        text = response.text.strip()
        # Remove markdown code block if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

        try:
            recommendations = json.loads(text)
        except json.JSONDecodeError:
            recommendations = {"raw_response": text}

        # Store that we generated recommendations (in Hindsight)
        _store_hindsight(student_id, f"Generated personalized recommendations for student based on their profile")

        return {"recommendations": recommendations}

    except Exception as e:
        logger.error(f"Recommendations error: {e}")
        return {"recommendations": None, "error": str(e)}

