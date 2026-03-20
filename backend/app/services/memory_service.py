"""
Hindsight Memory Service — per-student AI memory using Hindsight Cloud API.
Stores student interactions, personality, and provides memory-augmented responses.
"""
import logging
from typing import Optional, List
from app.core.config import settings
import requests

logger = logging.getLogger(__name__)

# Hindsight Cloud base URL
HINDSIGHT_BASE_URL = "https://api.hindsight.vectorize.io/v1"
HINDSIGHT_API_KEY = None


def _get_api_key():
    global HINDSIGHT_API_KEY
    if HINDSIGHT_API_KEY is None:
        HINDSIGHT_API_KEY = getattr(settings, 'HINDSIGHT_API_KEY', None)
    return HINDSIGHT_API_KEY


def _headers():
    key = _get_api_key()
    if not key:
        return None
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }


def _get_bank_id(student_id: str) -> str:
    """Each student gets their own memory bank."""
    return f"student-{student_id}"


def ensure_bank(student_id: str):
    """Create a memory bank for a student if it doesn't exist."""
    headers = _headers()
    if not headers:
        return

    bank_id = _get_bank_id(student_id)
    try:
        resp = requests.post(
            f"{HINDSIGHT_BASE_URL}/banks",
            json={
                "bank_id": bank_id,
                "name": f"Student {student_id} Memory",
                "mission": (
                    "You are an AI campus assistant for SCOEFLOW CONNECT at Saraswati College of Engineering. "
                    "Remember this student's interests, clubs they joined, events they attended, "
                    "questions they asked, and their preferences. Use memories to give "
                    "personalized event recommendations, club suggestions, and campus navigation help."
                ),
            },
            headers=headers,
            timeout=10
        )
        if resp.status_code in (200, 201):
            logger.info(f"Created memory bank for student {student_id}")
        elif resp.status_code == 409:
            logger.debug(f"Bank already exists for {student_id}")
        else:
            logger.warning(f"Bank creation status {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"Could not create bank for {student_id}: {e}")


def store_memory(student_id: str, content: str, context: str = "campus_interaction"):
    """Store a memory for a student using Hindsight retain."""
    headers = _headers()
    if not headers:
        logger.debug("Hindsight API key not set, skipping memory store")
        return

    bank_id = _get_bank_id(student_id)
    ensure_bank(student_id)

    try:
        resp = requests.post(
            f"{HINDSIGHT_BASE_URL}/banks/{bank_id}/retain",
            json={
                "content": content,
                "context": context,
            },
            headers=headers,
            timeout=15
        )
        if resp.status_code in (200, 201):
            logger.info(f"Stored memory for student {student_id}: {content[:50]}...")
        else:
            logger.warning(f"Retain failed ({resp.status_code}): {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"Failed to store memory: {e}")


def recall_memory(student_id: str, query: str, max_results: int = 10) -> List[dict]:
    """Search student memories using Hindsight recall."""
    headers = _headers()
    if not headers:
        return []

    bank_id = _get_bank_id(student_id)
    ensure_bank(student_id)

    try:
        resp = requests.post(
            f"{HINDSIGHT_BASE_URL}/banks/{bank_id}/recall",
            json={
                "query": query,
                "budget": "mid",
            },
            headers=headers,
            timeout=15
        )
        if resp.status_code == 200:
            data = resp.json()
            memories = []
            results = data.get("results", [])
            for r in results[:max_results]:
                memories.append({
                    "text": r.get("text", ""),
                    "type": r.get("type", "unknown"),
                })
            return memories
        else:
            logger.warning(f"Recall failed ({resp.status_code}): {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"Failed to recall memory: {e}")
    return []


def reflect_memory(student_id: str, query: str, context: str = "") -> Optional[str]:
    """Use Hindsight reflect — AI reasoning with student's full memory."""
    headers = _headers()
    if not headers:
        return None

    bank_id = _get_bank_id(student_id)
    ensure_bank(student_id)

    try:
        resp = requests.post(
            f"{HINDSIGHT_BASE_URL}/banks/{bank_id}/reflect",
            json={
                "query": query,
                "budget": "mid",
                "context": context if context else "campus assistant query",
            },
            headers=headers,
            timeout=30
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("text") or data.get("answer") or data.get("response")
        else:
            logger.warning(f"Reflect failed ({resp.status_code}): {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"Failed to reflect: {e}")
    return None


def list_memories(student_id: str, limit: int = 50) -> List[dict]:
    """List all stored memories for a student."""
    headers = _headers()
    if not headers:
        return []

    bank_id = _get_bank_id(student_id)

    try:
        resp = requests.get(
            f"{HINDSIGHT_BASE_URL}/banks/{bank_id}/memories?limit={limit}",
            headers=headers,
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            memories = data if isinstance(data, list) else data.get("memories", [])
            return [
                {
                    "text": m.get("text", str(m)),
                    "type": m.get("type", "unknown"),
                    "created_at": m.get("created_at", ""),
                }
                for m in memories
            ]
        else:
            logger.warning(f"List memories failed ({resp.status_code})")
    except Exception as e:
        logger.warning(f"Failed to list memories: {e}")
    return []


def store_personality_memory(student_id: str, personality_data: dict):
    """Store the student's personality profile as memories for AI personalization."""
    parts = []
    if personality_data.get('academic_interest'):
        parts.append(f"Student's academic interest level is {personality_data['academic_interest']}")
    if personality_data.get('favorite_subjects'):
        parts.append(f"Student enjoys these subjects: {', '.join(personality_data['favorite_subjects'])}")
    if personality_data.get('sports_interest'):
        parts.append(f"Student's sports interest: {personality_data['sports_interest']}")
    if personality_data.get('clubs_interested'):
        parts.append(f"Student is interested in clubs: {', '.join(personality_data['clubs_interested'])}")
    if personality_data.get('learning_style'):
        parts.append(f"Student learns best through {personality_data['learning_style']} methods")
    if personality_data.get('career_goal'):
        parts.append(f"Student's career goal: {personality_data['career_goal']}")
    if personality_data.get('social_preference'):
        parts.append(f"Student's social preference: {personality_data['social_preference']}")

    for part in parts:
        store_memory(student_id, part, "personality_profile")
