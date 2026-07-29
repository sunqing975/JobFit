from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_db
from ..models import MasterResumeVersion
from ..schemas import MasterResumeCreate, MasterResumeResponse

router = APIRouter(prefix="/api/master-resume", tags=["Master Resume"])


@router.get("/versions", response_model=list[MasterResumeResponse])
def list_versions(db: Session = Depends(get_db)):
    versions = db.exec(
        select(MasterResumeVersion).order_by(MasterResumeVersion.version.desc())
    ).all()
    return versions


@router.get("/versions/{version_id}", response_model=MasterResumeResponse)
def get_version(version_id: int, db: Session = Depends(get_db)):
    version = db.get(MasterResumeVersion, version_id)
    if not version:
        raise HTTPException(status_code=404, detail="版本不存在")
    return version


@router.get("/latest", response_model=MasterResumeResponse)
def get_latest_version(db: Session = Depends(get_db)):
    version = db.exec(
        select(MasterResumeVersion).order_by(MasterResumeVersion.version.desc())
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="暂无主履历版本")
    return version


@router.post("/versions", response_model=MasterResumeResponse)
def create_version(data: MasterResumeCreate, db: Session = Depends(get_db)):
    latest = db.exec(
        select(MasterResumeVersion).order_by(MasterResumeVersion.version.desc())
    ).first()
    next_version = (latest.version + 1) if latest else 1

    version = MasterResumeVersion(
        version=next_version,
        change_log=data.change_log,
        content=data.content,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version
