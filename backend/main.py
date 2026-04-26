import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine
from models import Student, Subject, Teacher, User
from routers.auth import get_password_hash
from routers.admin import router as admin_router
from routers.auth import router as auth_router
from routers.student import router as student_router
from routers.teacher import router as teacher_router

app = FastAPI(title="Pharaohs School API", version="1.0.0")

# CORS: allow all origins so the Netlify frontend can reach this API.
# To lock it down later, set ALLOWED_ORIGINS env var to your Netlify URL.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
_origins = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_initial_data() -> None:
    """Seed minimal demo data so role-based login works immediately."""
    db = Session(bind=engine)
    try:
        admin_user = db.query(User).filter(User.email == "admin@pharaohs.school").first()
        if not admin_user:
            admin_user = User(
                name="System Admin",
                email="admin@pharaohs.school",
                password=get_password_hash("admin123"),
                role="admin",
            )
            db.add(admin_user)

        teacher_user = db.query(User).filter(User.email == "teacher@pharaohs.school").first()
        if not teacher_user:
            teacher_user = User(
                name="Teacher One",
                email="teacher@pharaohs.school",
                password=get_password_hash("teacher123"),
                role="teacher",
            )
            db.add(teacher_user)
            db.flush()
            db.add(Teacher(user_id=teacher_user.id, subject="Mathematics"))

        student_user = db.query(User).filter(User.email == "student@pharaohs.school").first()
        if not student_user:
            student_user = User(
                name="Student One",
                email="student@pharaohs.school",
                password=get_password_hash("student123"),
                role="student",
            )
            db.add(student_user)
            db.flush()
            db.add(Student(user_id=student_user.id, class_name="Grade 10", age=16))

        if not db.query(Subject).first():
            db.add_all([Subject(name="Mathematics"), Subject(name="Science"), Subject(name="English")])

        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup() -> None:
    # Ensure all tables are created when the app starts.
    Base.metadata.create_all(bind=engine)
    seed_initial_data()


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Pharaohs School backend is running"}


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(teacher_router)
app.include_router(student_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
