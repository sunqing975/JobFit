from datetime import datetime
from typing import Any, Dict, Optional
from sqlmodel import JSON, Column, Field, SQLModel


class MasterResumeVersion(SQLModel, table=True):
    __tablename__ = "master_resume_versions"

    id: Optional[int] = Field(default=None, primary_key=True)
    version: int = Field(default=1, index=True)
    change_log: Optional[str] = Field(default=None, description="版本变更说明")
    content: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TailoredResume(SQLModel, table=True):
    __tablename__ = "tailored_resumes"

    id: Optional[int] = Field(default=None, primary_key=True)
    master_resume_version_id: int = Field(foreign_key="master_resume_versions.id")
    job_title: str
    company_name: Optional[str] = None
    raw_jd_text: str
    model_used: str
    generated_content: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LLMConfig(SQLModel, table=True):
    __tablename__ = "llm_configs"

    id: Optional[int] = Field(default=None, primary_key=True)
    provider_name: str = Field(default="Custom OpenAI")
    api_base: str = Field(default="https://api.openai.com/v1")
    api_key: str = Field(default="")
    model_name: str = Field(default="gpt-4o-mini")
    temperature: float = Field(default=0.3)
    is_active: bool = Field(default=True, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
