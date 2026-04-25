from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models import Grade, Student, Subject, User
from routers.auth import get_db, require_role

router = APIRouter(prefix="/teacher", tags=["Teacher"])


class GradeCreate(BaseModel):
    student_id: int
    subject_id: int
    grade: str


class GradeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    subject_id: int
    grade: str


class StudentListOut(BaseModel):
    id: int
    name: str
    class_name: str


class SubjectListOut(BaseModel):
    id: int
    name: str


@router.get("/students", response_model=list[StudentListOut])
def get_students_for_teacher(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher", "admin")),
) -> list[StudentListOut]:
    students = db.query(Student).all()
    result: list[StudentListOut] = []
    for student in students:
        user = db.query(User).filter(User.id == student.user_id).first()
        if user:
            result.append(
                StudentListOut(id=student.id, name=user.name, class_name=student.class_name)
            )
    return result


@router.get("/subjects", response_model=list[SubjectListOut])
def get_subjects_for_teacher(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher", "admin")),
) -> list[Subject]:
    return db.query(Subject).all()


@router.post("/grades", response_model=GradeOut, status_code=status.HTTP_201_CREATED)
def add_grade(
    payload: GradeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("teacher", "admin")),
) -> Grade:
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    grade = Grade(
        student_id=payload.student_id,
        subject_id=payload.subject_id,
        grade=payload.grade,
    )
    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade
