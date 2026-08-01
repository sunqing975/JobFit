import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from langchain_core.output_parsers import StrOutputParser

from ..database import get_db
from ..models import BaseResumeVersion, JobResume
from ..schemas import JobResumeCreate, JobResumeResponse
from ..llm_engine import get_active_llm_client, RESUME_GENERATION_PROMPT

router = APIRouter(prefix="/api/job-resume", tags=["Job Resume"])


@router.get("/", response_model=list[JobResumeResponse])
def list_job_resumes(
    base_version_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = select(JobResume).where(JobResume.deleted_at.is_(None))
    if base_version_id is not None:
        query = query.where(JobResume.base_resume_version_id == base_version_id)
    records = db.exec(
        query.order_by(JobResume.created_at.desc())
    ).all()
    return records


@router.get("/{resume_id}", response_model=JobResumeResponse)
def get_job_resume(resume_id: int, db: Session = Depends(get_db)):
    record = db.get(JobResume, resume_id)
    if not record or record.deleted_at is not None:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


@router.delete("/{resume_id}")
def delete_job_resume(resume_id: int, db: Session = Depends(get_db)):
    record = db.get(JobResume, resume_id)
    if not record or record.deleted_at is not None:
        raise HTTPException(status_code=404, detail="记录不存在")

    record.deleted_at = datetime.utcnow()
    db.add(record)
    db.commit()
    return {"status": "ok"}


@router.post("/generate", response_model=JobResumeResponse)
def generate_job_resume(data: JobResumeCreate, db: Session = Depends(get_db)):
    base_resume = db.get(BaseResumeVersion, data.base_resume_version_id)
    if not base_resume or base_resume.deleted_at is not None:
        raise HTTPException(status_code=404, detail="基础简历版本不存在")

    llm = get_active_llm_client(db)

    chain = RESUME_GENERATION_PROMPT | llm | StrOutputParser()

    result = chain.invoke(
        {
            "master_json": json.dumps(base_resume.content, ensure_ascii=False, indent=2),
            "jd_text": data.raw_jd_text,
        }
    )

    try:
        generated_content = json.loads(result)
    except json.JSONDecodeError:
        generated_content = {"raw_output": result}

    avatar = base_resume.content.get("avatar")
    if avatar and not generated_content.get("avatar"):
        generated_content["avatar"] = avatar

    record = JobResume(
        base_resume_version_id=data.base_resume_version_id,
        raw_jd_text=data.raw_jd_text,
        model_used=llm.model_name,
        generated_content=generated_content,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
