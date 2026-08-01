import json
import logging
import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from langchain_core.output_parsers import StrOutputParser

from ..database import get_db
from ..models import BaseResumeVersion, JobResume
from ..schemas import JobResumeCreate, JobResumeResponse
from ..llm_engine import (
    _extract_json,
    get_active_llm_client,
    RESUME_GENERATION_PROMPT,
    REPORT_PROMPT,
)

logger = logging.getLogger("jobfit")

router = APIRouter(prefix="/api/job-resume", tags=["Job Resume"])

SEPARATOR = "===JSON==="
SEPARATOR_TAIL = 16


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


@router.post("/{resume_id}/report")
def generate_match_report(resume_id: int, db: Session = Depends(get_db)):
    record = db.get(JobResume, resume_id)
    if not record or record.deleted_at is not None:
        raise HTTPException(status_code=404, detail="记录不存在")

    resume_json = json.dumps(
        {k: v for k, v in record.generated_content.items() if k != "avatar"},
        ensure_ascii=False,
        indent=2,
    )

    async def event_stream():
        try:
            llm = get_active_llm_client(db)
        except ValueError as e:
            yield _sse({"type": "error", "message": str(e)})
            return

        chain = REPORT_PROMPT | llm | StrOutputParser()
        parts = []
        try:
            async for chunk in chain.astream({
                "resume_json": resume_json,
                "jd_text": record.raw_jd_text,
            }):
                if chunk:
                    parts.append(chunk)
                    yield _sse({"type": "delta", "content": chunk})
            report = "".join(parts).strip()
            if not report:
                yield _sse({"type": "error", "message": "评估报告生成结果为空，请重试"})
                return
            record.match_report = report[:2000]
            db.add(record)
            db.commit()
            yield _sse({"type": "done"})
        except Exception as e:
            logger.error("评估报告生成异常：%s", e, exc_info=True)
            yield _sse({"type": "error", "message": f"评估报告生成失败: {e}"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.delete("/{resume_id}")
def delete_job_resume(resume_id: int, db: Session = Depends(get_db)):
    record = db.get(JobResume, resume_id)
    if not record or record.deleted_at is not None:
        raise HTTPException(status_code=404, detail="记录不存在")

    record.deleted_at = datetime.utcnow()
    db.add(record)
    db.commit()
    return {"status": "ok"}


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.post("/generate")
def generate_job_resume(data: JobResumeCreate, db: Session = Depends(get_db)):
    base_resume = db.get(BaseResumeVersion, data.base_resume_version_id)
    if not base_resume or base_resume.deleted_at is not None:
        raise HTTPException(status_code=404, detail="基础简历版本不存在")

    prompt_content = {k: v for k, v in base_resume.content.items() if k != "avatar"}
    inputs = {
        "master_json": json.dumps(prompt_content, ensure_ascii=False, indent=2),
        "jd_text": data.raw_jd_text,
    }

    async def event_stream():
        try:
            llm = get_active_llm_client(db)
        except ValueError as e:
            yield _sse({"type": "error", "message": str(e)})
            return

        chain = RESUME_GENERATION_PROMPT | llm | StrOutputParser()

        started = time.monotonic()
        full_buffer = ""
        flushed = 0
        json_parts: list[str] = []
        in_json = False
        try:
            async for chunk in chain.astream(inputs):
                if not chunk:
                    continue
                if in_json:
                    json_parts.append(chunk)
                    continue
                full_buffer += chunk
                marker = full_buffer.find(SEPARATOR)
                if marker != -1:
                    tail = full_buffer[flushed:marker]
                    if tail:
                        yield _sse({"type": "analysis", "content": tail})
                    json_parts.append(full_buffer[marker + len(SEPARATOR):])
                    in_json = True
                else:
                    safe_end = max(flushed, len(full_buffer) - SEPARATOR_TAIL)
                    if safe_end > flushed:
                        yield _sse({"type": "analysis", "content": full_buffer[flushed:safe_end]})
                        flushed = safe_end

            if not in_json:
                json_parts.append(full_buffer[flushed:])

            raw = "".join(json_parts)
            logger.info(
                "岗位简历生成：LLM 用时 %.1fs，输出 %d 字符（分析 %d 字符）（输入主简历 %d 字段）",
                time.monotonic() - started,
                len(raw),
                flushed,
                len(prompt_content),
            )

            try:
                generated_content = _extract_json(raw)
                logger.info("岗位简历生成：解析成功，共 %d 个字段", len(generated_content))
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(
                    "岗位简历生成：LLM 输出解析失败（%s），输出长度 %d，输出前缀：%r",
                    e,
                    len(raw),
                    raw[:200],
                )
                yield _sse({"type": "error", "message": "生成结果解析失败，请重试"})
                return

            avatar = base_resume.content.get("avatar")
            if avatar:
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
            resume = JobResumeResponse.model_validate(record).model_dump(mode="json")
            yield _sse({"type": "done", "resume": resume})
        except Exception as e:
            logger.error("岗位简历生成异常：%s", e, exc_info=True)
            yield _sse({"type": "error", "message": f"AI 生成失败: {e}"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
