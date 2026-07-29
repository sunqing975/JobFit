import json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from langchain_core.output_parsers import StrOutputParser

from ..database import get_db
from ..models import MasterResumeVersion, TailoredResume
from ..schemas import TailoredResumeCreate, TailoredResumeResponse
from ..llm_engine import get_active_llm_client, RESUME_GENERATION_PROMPT

router = APIRouter(prefix="/api/tailored-resume", tags=["Tailored Resume"])


@router.get("/", response_model=list[TailoredResumeResponse])
def list_tailored_resumes(db: Session = Depends(get_db)):
    records = db.exec(
        select(TailoredResume).order_by(TailoredResume.created_at.desc())
    ).all()
    return records


@router.get("/{resume_id}", response_model=TailoredResumeResponse)
def get_tailored_resume(resume_id: int, db: Session = Depends(get_db)):
    record = db.get(TailoredResume, resume_id)
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


@router.post("/generate", response_model=TailoredResumeResponse)
def generate_tailored_resume(data: TailoredResumeCreate, db: Session = Depends(get_db)):
    master_resume = db.get(MasterResumeVersion, data.master_resume_version_id)
    if not master_resume:
        raise HTTPException(status_code=404, detail="主履历版本不存在")

    llm = get_active_llm_client(db)

    chain = RESUME_GENERATION_PROMPT | llm | StrOutputParser()

    result = chain.invoke(
        {
            "master_json": json.dumps(master_resume.content, ensure_ascii=False, indent=2),
            "jd_text": data.raw_jd_text,
        }
    )

    try:
        generated_content = json.loads(result)
    except json.JSONDecodeError:
        generated_content = {"raw_output": result}

    record = TailoredResume(
        master_resume_version_id=data.master_resume_version_id,
        raw_jd_text=data.raw_jd_text,
        model_used=llm.model_name,
        generated_content=generated_content,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
