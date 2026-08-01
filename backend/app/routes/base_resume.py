from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_db
from ..models import BaseResumeVersion, JobResume
from ..schemas import BaseResumeCreate, BaseResumeResponse

router = APIRouter(prefix="/api/base-resume", tags=["Base Resume"])


@router.get("/versions", response_model=list[BaseResumeResponse])
def list_versions(db: Session = Depends(get_db)):
    versions = db.exec(
        select(BaseResumeVersion)
        .where(BaseResumeVersion.deleted_at.is_(None))
        .order_by(BaseResumeVersion.version.desc())
    ).all()
    return versions


@router.get("/versions/{version_id}", response_model=BaseResumeResponse)
def get_version(version_id: int, db: Session = Depends(get_db)):
    version = db.get(BaseResumeVersion, version_id)
    if not version or version.deleted_at is not None:
        raise HTTPException(status_code=404, detail="版本不存在")
    return version


@router.get("/latest", response_model=BaseResumeResponse)
def get_latest_version(db: Session = Depends(get_db)):
    version = db.exec(
        select(BaseResumeVersion)
        .where(BaseResumeVersion.deleted_at.is_(None))
        .order_by(BaseResumeVersion.version.desc())
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="暂无基础简历版本")
    return version


@router.post("/versions", response_model=BaseResumeResponse)
def create_version(data: BaseResumeCreate, db: Session = Depends(get_db)):
    latest = db.exec(
        select(BaseResumeVersion).order_by(BaseResumeVersion.version.desc())
    ).first()
    next_version = (latest.version + 1) if latest else 1

    version = BaseResumeVersion(
        version=next_version,
        change_log=data.change_log,
        content=data.content,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.put("/versions/{version_id}", response_model=BaseResumeResponse)
def update_version(version_id: int, data: BaseResumeCreate, db: Session = Depends(get_db)):
    version = db.get(BaseResumeVersion, version_id)
    if not version or version.deleted_at is not None:
        raise HTTPException(status_code=404, detail="版本不存在")

    version.content = data.content
    version.change_log = data.change_log
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.delete("/versions/{version_id}")
def delete_version(version_id: int, db: Session = Depends(get_db)):
    version = db.get(BaseResumeVersion, version_id)
    if not version or version.deleted_at is not None:
        raise HTTPException(status_code=404, detail="版本不存在")

    now = datetime.utcnow()
    version.deleted_at = now
    job_resumes = db.exec(
        select(JobResume).where(
            JobResume.base_resume_version_id == version_id,
            JobResume.deleted_at.is_(None),
        )
    ).all()
    for record in job_resumes:
        record.deleted_at = now
    db.add(version)
    db.commit()
    return {"status": "ok", "deleted_job_resume_count": len(job_resumes)}
