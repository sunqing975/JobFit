from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel


class BaseResumeCreate(BaseModel):
    content: Dict[str, Any]
    change_log: Optional[str] = None


class BaseResumeResponse(BaseModel):
    id: int
    version: int
    change_log: Optional[str] = None
    content: Dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class JobResumeCreate(BaseModel):
    base_resume_version_id: int
    raw_jd_text: str


class JobResumeResponse(BaseModel):
    id: int
    base_resume_version_id: int
    raw_jd_text: str
    model_used: str
    generated_content: Dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class LLMConfigCreate(BaseModel):
    provider_name: str = "Custom OpenAI"
    api_base: str = "https://api.openai.com/v1"
    api_key: str = ""
    model_name: str = "gpt-4o-mini"
    temperature: float = 0.3


class LLMConfigUpdate(BaseModel):
    provider_name: Optional[str] = None
    api_base: Optional[str] = None
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    temperature: Optional[float] = None
    is_active: Optional[bool] = None


class LLMConfigResponse(BaseModel):
    id: int
    provider_name: str
    api_base: str
    api_key: str
    model_name: str
    temperature: float
    is_active: bool
    updated_at: datetime

    model_config = {"from_attributes": True}


class ParsedResume(BaseModel):
    """PDF/文本导入的 LLM 结构化输出（仅草稿，不入库），字段与基础简历 content 对齐"""

    name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    summary: Optional[str] = None
    skillCategories: list[dict] = []
    experience: list[dict] = []
    projects: list[dict] = []
    education: list[dict] = []
    certifications: list[dict] = []
    languages: list[dict] = []
    awards: list[dict] = []
    publications: list[dict] = []

    model_config = {"extra": "ignore"}


class ResumeImportTextRequest(BaseModel):
    text: str
