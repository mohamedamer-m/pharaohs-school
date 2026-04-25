from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models import Grade, Student, Subject, User
from routers.auth import get_db, require_role

router = APIRouter(prefix="/student", tags=["Student"])


class GradeOut(BaseModel):
    id: int
    subject: str
    grade: str


@router.get("/my-grades", response_model=list[GradeOut])
def get_my_grades(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> list[Grade]:
    student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    grade_rows = db.query(Grade).filter(Grade.student_id == student_profile.id).all()
    result: list[GradeOut] = []
    for grade_row in grade_rows:
        subject = db.query(Subject).filter(Subject.id == grade_row.subject_id).first()
        result.append(
            GradeOut(
                id=grade_row.id,
                subject=subject.name if subject else "Unknown Subject",
                grade=grade_row.grade,
            )
        )
    return result
