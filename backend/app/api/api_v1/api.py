from fastapi import APIRouter
from app.api.v1.endpoints import students, admin, campus, assistant, subjects, exams, enrollment_applications, results, chat

api_router = APIRouter()

api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(campus.router, prefix="/campus", tags=["campus"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["assistant"])
api_router.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
api_router.include_router(exams.router, prefix="/exams", tags=["exams"])
api_router.include_router(enrollment_applications.router, prefix="/enrollment-applications", tags=["enrollment-applications"])
api_router.include_router(results.router, prefix="/results", tags=["results"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

