import os
import sys
from pathlib import Path

from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import text


def _appdata_db_url() -> str:
    base = Path(os.environ.get("APPDATA", str(Path.home()))) / "JobFit"
    base.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{(base / 'jobfit.db').as_posix()}"


if getattr(sys, "frozen", False):
    DATABASE_URL = os.environ.get("DATABASE_URL") or _appdata_db_url()
else:
    DATABASE_URL = os.environ.get("DATABASE_URL") or "sqlite:///./jobfit.db"

engine = create_engine(DATABASE_URL, echo=False)


def _migrate():
    with engine.begin() as conn:
        tables = {
            row[0]
            for row in conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
        }

        if "master_resume_versions" in tables and "base_resume_versions" in tables:
            conn.execute(text(
                "INSERT OR IGNORE INTO base_resume_versions "
                "(id, version, change_log, content, created_at, deleted_at) "
                "SELECT id, version, change_log, content, created_at, deleted_at "
                "FROM master_resume_versions"
            ))

        if "tailored_resumes" in tables and "job_resumes" in tables:
            conn.execute(text(
                "INSERT OR IGNORE INTO job_resumes "
                "(id, base_resume_version_id, raw_jd_text, model_used, generated_content, created_at, deleted_at) "
                "SELECT id, master_resume_version_id, raw_jd_text, model_used, generated_content, created_at, deleted_at "
                "FROM tailored_resumes"
            ))

        for old_table in ("master_resume_versions", "tailored_resumes"):
            if old_table in tables:
                conn.execute(text(f"DROP TABLE {old_table}"))


def init_db():
    SQLModel.metadata.create_all(engine)
    _migrate()


def get_db():
    with Session(engine) as session:
        yield session
