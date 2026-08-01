import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from ..database import get_db
from ..llm_engine import get_active_llm_client

router = APIRouter(prefix="/api/optimize", tags=["Optimize"])

PROMPTS = {
    "summary": ChatPromptTemplate.from_messages([
        ("system", "你是一个专业的简历优化顾问。请将用户的个人总结改写得更加专业、有吸引力。\n\n要求：\n1. 保留原文的核心信息和意图\n2. 使用更专业、简洁的语言\n3. 突出核心竞争力和职业亮点\n4. 语气自信但不浮夸\n5. 直接输出优化后的文本，不要任何解释"),
        ("human", "{text}"),
    ]),
    "experience": ChatPromptTemplate.from_messages([
        ("system", "你是一个专业的简历优化顾问。请将用户的工作经历描述按照 STAR 原则（情境、任务、行动、结果）改写得更加专业、有冲击力。\n\n要求：\n1. 保留原文的核心事实和数字\n2. 用量化的成果替代模糊的描述\n3. 突出个人贡献而非团队行为\n4. 每条描述独立一行，精简有力\n5. 直接输出优化后的文本（每行一条描述），不要任何解释"),
        ("human", "{text}"),
    ]),
    "project": ChatPromptTemplate.from_messages([
        ("system", "你是一个专业的简历优化顾问。请将用户的项目经历描述改写得更加专业、有亮点。\n\n要求：\n1. 保留原文的核心事实和数字\n2. 突出技术方案和业务价值\n3. 每条描述独立一行，精简有力\n4. 直接输出优化后的文本（每行一条描述），不要任何解释"),
        ("human", "{text}"),
    ]),
}


class OptimizeRequest(BaseModel):
    text: str
    type: str = "summary"


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.post("/content")
def optimize_content(data: OptimizeRequest, db: Session = Depends(get_db)):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="请输入需要优化的文本")

    prompt = PROMPTS.get(data.type)
    if not prompt:
        raise HTTPException(status_code=400, detail=f"不支持的优化类型: {data.type}")

    async def event_stream():
        try:
            llm = get_active_llm_client(db)
        except ValueError as e:
            yield _sse({"type": "error", "message": str(e)})
            return

        chain = prompt | llm | StrOutputParser()
        parts = []
        try:
            async for chunk in chain.astream({"text": data.text}):
                if chunk:
                    parts.append(chunk)
                    yield _sse({"type": "delta", "content": chunk})
            if not "".join(parts).strip():
                yield _sse({"type": "error", "message": "AI 优化结果为空，请重试"})
            else:
                yield _sse({"type": "done"})
        except Exception as e:
            yield _sse({"type": "error", "message": f"AI 优化失败: {e}"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
