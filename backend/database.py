import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Allow DATABASE_URL env var override (useful for managed DBs); default to SQLite.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pharaohs_school.db")

# SQLite needs check_same_thread=False for FastAPI's threading model.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
