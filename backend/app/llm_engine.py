import json

from sqlmodel import Session, select
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from pydantic import ValidationError

from .models import LLMConfig
from .schemas import ParsedResume


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
            "5. 技能部分按分类输出，突出 JD 中要求的技能\n"
            "6. 保持 JSON 结构与主履历一致，输出完整 JSON（包含所有字段分类）\n"
            "7. 只输出 JSON，不要包含任何额外解释",
        ),
        (
            "human",
            "【主履历】：\n{master_json}\n\n【岗位 JD】：\n{jd_text}\n\n请输出针对该岗位的结构化简历 JSON。",
        ),
    ]
)

RESUME_SCHEMA_DESCRIPTION = (
    "name(姓名), title(职位), email, phone, location(所在地), website(个人网站), linkedin, github, "
    "summary(个人总结), "
    "skillCategories[{category, skills[]}], "
    "experience[{company, location, role, period, bullets[], techStack[]}], "
    "projects[{name, role, period, description, bullets[], techStack[], url}], "
    "education[{school, degree, major, period, gpa}], "
    "certifications[{name, issuer, date, url}], "
    "languages[{name, proficiency}], "
    "awards[{name, issuer, date}], "
    "publications[{title, publisher, date, url}]"
)

PARSE_RESUME_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "你是一个专业的简历解析助手。请将用户提供的简历文本提取为结构化 JSON。\n\n"
            "要求：\n"
            "1. 字段结构严格对齐 human 消息中给出的 schema\n"
            "2. 严格基于文本内容，不得虚构原文不存在的信息，原文缺失的字段输出空字符串或空数组\n"
            "3. 技能按分类输出到 skillCategories（category + skills 数组）\n"
            "4. 只输出 JSON，不要包含任何额外解释或 markdown 代码块标记",
        ),
        (
            "human",
            "请从以下简历文本中提取 JSON，schema 如下：\n{schema}\n\n{error_hint}简历文本：\n{resume_text}",
        ),
    ]
)


def _extract_json(raw: str) -> dict:
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("JSON 结构缺失")
    return json.loads(raw[start : end + 1])


def parse_resume_text(resume_text: str, db: Session) -> dict:
    """将简历文本（PDF 提取或直接粘贴）结构化为主履历 JSON，失败自动重试。"""
    llm = get_active_llm_client(db)
    chain = PARSE_RESUME_PROMPT | llm | StrOutputParser()

    last_raw = ""
    for attempt in range(3):
        error_hint = (
            f"注意：上一次输出不是合法 JSON，请只输出符合 schema 的 JSON，不要任何解释。上一次输出：\n{last_raw}\n\n"
            if last_raw
            else ""
        )
        last_raw = chain.invoke(
            {
                "resume_text": resume_text,
                "schema": RESUME_SCHEMA_DESCRIPTION,
                "error_hint": error_hint,
            }
        )
        try:
            data = _extract_json(last_raw)
            return ParsedResume.model_validate(data).model_dump(exclude_none=True)
        except (json.JSONDecodeError, ValidationError, ValueError):
            continue

    raise ValueError("简历解析失败：LLM 输出无法解析为合法 JSON，请重试")
