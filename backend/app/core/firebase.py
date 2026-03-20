"""
Firebase Admin SDK initialization.
Supports both service-account key file AND project-ID-only mode.
"""
import os, logging
import firebase_admin
from firebase_admin import credentials, firestore
from app.core.config import settings

logger = logging.getLogger(__name__)
_db = None


def _init_firebase():
    """Initialize Firebase Admin SDK (once). Thread-safe."""
    # Check if already initialized
    try:
        firebase_admin.get_app()
        return  # already initialized
    except ValueError:
        pass  # not yet initialized

    key_path = settings.FIREBASE_KEY_PATH
    project_id = getattr(settings, "FIREBASE_PROJECT_ID", None)

    # Option 1: full service-account key file
    if key_path and os.path.isfile(key_path):
        try:
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized with service-account key")
            return
        except ValueError:
            # Already initialized by another thread
            return

    # Option 2: project ID only
    if project_id:
        try:
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {"projectId": project_id})
            logger.info("Firebase initialized with ADC for project %s", project_id)
            return
        except Exception:
            pass

        try:
            firebase_admin.initialize_app(options={"projectId": project_id})
            logger.info("Firebase initialized with project ID only: %s", project_id)
            return
        except ValueError:
            return

    raise FileNotFoundError(
        f"Firebase key file not found at {key_path} and no FIREBASE_PROJECT_ID set.\n"
        "Please either:\n"
        "  1. Download your service-account key from Firebase Console\n"
        "  OR\n"
        "  2. Set FIREBASE_PROJECT_ID in your .env file"
    )


def get_firestore_db():
    """Get a Firestore client, initializing if needed."""
    global _db
    if _db is None:
        _init_firebase()
        _db = firestore.client()
    return _db
