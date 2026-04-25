from pydantic import BaseModel, ConfigDict, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models import Student, Subject, Teacher, User
from routers.auth import get_db, get_password_hash, require_role

router = APIRouter(prefix="/admin", tags=["Admin"])


class StudentCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    class_name: str
    age: int


class StudentUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    class_name: str | None = None
    age: int | None = None


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    email: str
    class_name: str
    age: int


class TeacherCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    subject: str


class TeacherOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    email: str
    subject: str


class SubjectCreate(BaseModel):
    name: str


class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


@router.post("/students", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> StudentOut:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        name=payload.name,
        email=payload.email,
        password=get_password_hash(payload.password),
        role="student",
    )
    db.add(user)
    db.flush()

    student = Student(user_id=user.id, class_name=payload.class_name, age=payload.age)
    db.add(student)
    db.commit()
    db.refresh(student)
    return StudentOut(
        id=student.id,
        user_id=student.user_id,
        name=user.name,
        email=user.email,
        class_name=student.class_name,
        age=student.age,
    )


@router.get("/students", response_model=list[StudentOut])
def get_students(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> list[StudentOut]:
    students = db.query(Student).all()
    results: list[StudentOut] = []
    for student in students:
        user = db.query(User).filter(User.id == student.user_id).first()
        if user:
            results.append(
                StudentOut(
                    id=student.id,
                    user_id=student.user_id,
                    name=user.name,
                    email=user.email,
                    class_name=student.class_name,
                    age=student.age,
                )
            )
    return results


@router.put("/students/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> StudentOut:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = db.query(User).filter(User.id == student.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student user not found")

    if payload.email and payload.email != user.email:
        email_taken = db.query(User).filter(User.email == payload.email).first()
        if email_taken:
            raise HTTPException(status_code=400, detail="Email already exists")
        user.email = payload.email

    if payload.name:
        user.name = payload.name
    if payload.password:
        user.password = get_password_hash(payload.password)
    if payload.class_name:
        student.class_name = payload.class_name
    if payload.age is not None:
        student.age = payload.age

    db.commit()
    db.refresh(student)
    return StudentOut(
        id=student.id,
        user_id=student.user_id,
        name=user.name,
        email=user.email,
        class_name=student.class_name,
        age=student.age,
    )


@router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> None:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = db.query(User).filter(User.id == student.user_id).first()
    db.delete(student)
    if user:
        db.delete(user)
    db.commit()


@router.post("/teachers", response_model=TeacherOut, status_code=status.HTTP_201_CREATED)
def create_teacher(
    payload: TeacherCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> TeacherOut:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        name=payload.name,
        email=payload.email,
        password=get_password_hash(payload.password),
        role="teacher",
    )
    db.add(user)
    db.flush()

    teacher = Teacher(user_id=user.id, subject=payload.subject)
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return TeacherOut(
        id=teacher.id,
        user_id=teacher.user_id,
        name=user.name,
        email=user.email,
        subject=teacher.subject,
    )


@router.get("/teachers", response_model=list[TeacherOut])
def get_teachers(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> list[TeacherOut]:
    teachers = db.query(Teacher).all()
    results: list[TeacherOut] = []
    for teacher in teachers:
        user = db.query(User).filter(User.id == teacher.user_id).first()
        if user:
            results.append(
                TeacherOut(
                    id=teacher.id,
                    user_id=teacher.user_id,
                    name=user.name,
                    email=user.email,
                    subject=teacher.subject,
                )
            )
    return results


@router.post("/subjects", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> Subject:
    subject = db.query(Subject).filter(Subject.name == payload.name).first()
    if subject:
        raise HTTPException(status_code=400, detail="Subject already exists")

    subject = Subject(name=payload.name)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.get("/subjects", response_model=list[SubjectOut])
def get_subjects(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
) -> list[Subject]:
    return db.query(Subject).all()
