from sqlmodel import Session, select
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from .models import LLMConfig


def get_active_llm_client(db: Session) -> ChatOpenAI:
    config = db.exec(select(LLMConfig).where(LLMConfig.is_active == True)).first()
    if not config:
        raise ValueError("未找到激活的 LLM 配置，请在设置中先添加并激活一个模型配置")

    return ChatOpenAI(
        model=config.model_name,
        api_key=config.api_key,
        base_url=config.api_base,
        temperature=config.temperature,
    )


RESUME_GENERATION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "你是一个专业的 HR 专家和简历优化顾问。"
            "请根据用户的【主履历】和目标【岗位 JD】，重构一份高匹配度的简历 JSON。\n\n"
            "要求：\n"
            "1. 严格基于用户的主履历内容，不要虚构经历\n"
            "2. 突出与 JD 高匹配的关键词和技能\n"
            "3. 按照 STAR 原则（情境、任务、行动、结果）重写工作经历和项目经历的描述\n"
            "4. 优化个人总结/自我介绍部分，使其更贴合目标岗位\n"
            "5. 保持 JSON 结构与主履历一致\n"
            "6. 只输出 JSON，不要包含任何额外解释",
        ),
        (
            "human",
            "【主履历】：\n{master_json}\n\n【岗位 JD】：\n{jd_text}\n\n请输出针对该岗位的结构化简历 JSON。",
        ),
    ]
)
