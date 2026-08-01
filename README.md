# JobFit - 智能简历定制平台 MVP 方案

## 1. 项目概述

* **项目名称**：JobFit
* **核心定位**：基于大模型的“基础简历 - 岗位 JD”精准匹配重构工具。
* **核心价值**：用户仅需一次性维护一份全量的“基础简历库（Base Resume）”，后续每次申请新岗位时，只需粘贴岗位 JD 或链接，系统即可自动抽取匹配点，按 STAR 原则动态重构履历并快速生成针对该岗位的专属岗位简历。

---

## 2. 极简技术选型 (Tech Stack)

为了确保 MVP 阶段**开发成本最低、部署最轻量、未来扩展性最好**，技术选型如下：

| 层级 | 选用技术 | 选型理由 |
| --- | --- | --- |
| **前端 (Frontend)** | **Next.js (React) + Tailwind CSS** | 现代 UI 开发，PDF 导出走浏览器打印（`window.print()` + `@media print` 样式），与页面预览渲染结果完全一致。 |
| **后端 (Backend)** | **Python + FastAPI + LangChain** | 极简、高效的 API 开发框架，搭配 LangChain 可以极其方便地实现 Prompt 编排、流式输出以及与各类 LLM 的对接。 |
| **数据库 (Database)** | **SQLite + SQLModel / SQLAlchemy** | 单文件零配置，开发阶段开箱即用；基于 ORM 抽象，后续可无缝切换至 PostgreSQL 或 MySQL。 |
| **模型对接 (LLM)** | **OpenAI 兼容协议 (`ChatOpenAI`)** | 支持任何提供 OpenAI 标准格式的 API（如 OpenAI, DeepSeek, Moonshot, OneAPI 中转服务等）。 |

---

## 3. 核心功能与流程设计

```
┌─────────────────┐       ┌─────────────────┐
│  Base Resume    │       │   岗位 JD 描述   │
│ (基础简历 JSON) │       │  (文本或 URL)   │
└────────┬────────┘       └────────┬────────┘
         │                         │
         └───────────┬─────────────┘
                     ▼
      [ Python + LangChain 核心引擎 ]
     (读取页面配置的 OpenAI 兼容 API)
                     │
                     ▼
         ┌───────────────────────┐
         │   Job Resume JSON     │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
   [ 在线预览/微调 ]      [ 一键导出 PDF ]

```

### 1. 基础简历版本管理（Base Resume）

* **表单录入**：支持录入个人基本信息、工作经历（多条）、项目经历（多条）、技能树、教育背景等。
* **版本留存**：每次保存修改时，系统会自动增加 `version` 编号并插入一条新记录（全量 JSON 存储），保留完整修改历史，不直接覆盖旧数据。

### 2. 针对岗位的简历生成（Job Resume）

* **岗位输入**：支持输入 Job Title、公司名称、JD 纯文本或 JD 网页链接。
* **AI 智能重构**：调用 LangChain 引擎，对比基础简历与 JD 需求，输出结构化的针对性简历 JSON（突出高匹配关键词，按照 STAR 原则重写 Bullets，限制不虚构履历）。
* **独立保存**：生成的针对性简历单独入库，记录所用的模型名称、JD 原文及匹配后的数据，随时可回顾历史生成结果。

### 3. 一键 PDF 导出

* 前端拿到生成的针对性 JSON 后，在页面右侧提供实时预览。
* 点击“导出 PDF”按钮，通过浏览器打印（`window.print()` + `@media print` 样式）导出，与页面预览渲染完全一致，不增加服务端开销。

### 4. 动态 LLM 模型配置（Model Configs）

* 允许用户在页面 UI 端动态修改 LLM API 设置：
* **API Base URL**（如 `[https://api.deepseek.com/v1](https://api.deepseek.com/v1)`）
* **API Key**
* **Model Name**（如 `deepseek-chat`）
* **Temperature**


* 后端每次发起 AI 任务时，动态从数据库提取当前激活的配置信息并实例化 LangChain 的 `ChatOpenAI` 客户端。

---

## 4. 数据库表结构设计 (Database Schema)

数据库使用 3 张核心表来满足存储、版本控制和动态配置需求：

```
                    ┌─────────────────────────┐
                    │ base_resume_versions    │
                    ├─────────────────────────┤
                    │ id (PK)                 │
                    │ version (INT)           │
                    │ content (JSON)          │
                    │ created_at              │
                    │ deleted_at              │
                    └────────────┬────────────┘
                                 │ 1
                                 │
                                 │ N
┌─────────────────────────┐      │      ┌─────────────────────────┐
│       llm_configs       │      └─────>│       job_resumes       │
├─────────────────────────┤             ├─────────────────────────┤
│ id (PK)                 │             │ id (PK)                 │
│ api_base                │             │ base_resume_version_id  │
│ api_key                 │             │ raw_jd_text             │
│ model_name              │             │ generated_content (JSON)│
│ is_active               │             │ created_at              │
└─────────────────────────┘             │ deleted_at              │
                                        └─────────────────────────┘

```

### 数据库定义示例 (Python / SQLModel)

```python
from datetime import datetime
from typing import Any, Dict, Optional
from sqlmodel import JSON, Column, Field, SQLModel


# 1. 基础简历历史版本表
class BaseResumeVersion(SQLModel, table=True):
    __tablename__ = "base_resume_versions"

    id: Optional[int] = Field(default=None, primary_key=True)
    version: int = Field(default=1, index=True)
    change_log: Optional[str] = Field(default=None, description="版本变更说明")
    content: Dict[str, Any] = Field(
        default_factory=dict, sa_column=Column(JSON)
    )  # 保存全量结构化 JSON
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None)


# 2. 特定岗位生成记录表
class JobResume(SQLModel, table=True):
    __tablename__ = "job_resumes"

    id: Optional[int] = Field(default=None, primary_key=True)
    base_resume_version_id: int = Field(
        foreign_key="base_resume_versions.id"
    )
    raw_jd_text: str  # 原始 JD 内容
    model_used: str  # 生成时使用的模型名称
    generated_content: Dict[str, Any] = Field(
        default_factory=dict, sa_column=Column(JSON)
    )  # 生成的岗位简历 JSON
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None)


# 3. 动态 LLM 配置表
class LLMConfig(SQLModel, table=True):
    __tablename__ = "llm_configs"

    id: Optional[int] = Field(default=None, primary_key=True)
    provider_name: str = Field(default="Custom OpenAI")
    api_base: str = Field(default="https://api.openai.com/v1")
    api_key: str
    model_name: str = Field(default="gpt-4o-mini")
    temperature: float = Field(default=0.3)
    is_active: bool = Field(default=True, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

```

---

## 5. 后端 LangChain 接入示例

在 FastAPI 中，每次接收到生成请求时，直接读取配置并调用 LangChain：

```python
from fastapi import FastAPI
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

app = FastAPI()


def get_active_llm_client(db_session) -> ChatOpenAI:
    # 查找当前激活的模型配置
    config = db_session.query(LLMConfig).filter_by(is_active=True).first()
    if not config:
        raise ValueError("未找到激活的 LLM 配置")

    return ChatOpenAI(
        model=config.model_name,
        api_key=config.api_key,
        base_url=config.api_base,
        temperature=config.temperature,
    )


@app.post("/api/generate-resume")
async def generate_resume(
    base_version_id: int, jd_text: str, db=Depends(get_db)
):
    # 1. 查出指定版本 Base Resume
    base_resume = db.get(BaseResumeVersion, base_version_id)

    # 2. 动态获取 LLM
    llm = get_active_llm_client(db)

    # 3. 构建 LangChain 提示词与执行链
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "你是一个专业的 HR 专家。请根据用户的基础简历和目标【岗位 JD】，重构一份高匹配度的简历 JSON。",
            ),
            (
                "human",
                "【基础简历】：\n{master_json}\n\n【岗位 JD】：\n{jd_text}\n\n请输出针对性的结构化 JSON。",
            ),
        ]
    )

    chain = prompt | llm
    result = await chain.ainvoke(
        {"master_json": base_resume.content, "jd_text": jd_text}
    )

    # 4. 存入 job_resumes 表并返回结果
    ...

```

## 6. 桌面单文件打包（Windows）

将 Web 版打包为单文件 exe：双击启动，自动拉起浏览器访问，无需安装依赖。

```powershell
.\build.ps1                # 一键打包（构建前端 + PyInstaller），位于项目根目录
.\dist\JobFit.exe          # 打包产物（与 backend 平级）
```

- 前端静态导出（`next build`）由 FastAPI 同端口托管，页面与 API 天然同源，无 CORS 问题
- 端口自动探测：8000 起被占用则顺延，浏览器自动打开实际端口
- **打包版数据库位于 `%APPDATA%\JobFit\jobfit.db`**（onefile 解压目录重启会丢失，故不放在 exe 内）
- **数据迁移**：如需保留现有数据，手动把 `backend\jobfit.db` 复制到 `%APPDATA%\JobFit\` 后启动即可
- 打包必须在 Windows 机器执行（PyInstaller 不支持跨平台编译），Mac/Linux 包需对应平台或 CI
- 首次启动需解压（数秒-十几秒），exe 体积约 400MB（含 RapidOCR 模型与 onnxruntime）；杀毒软件可能误报，属常见现象

开发模式（`start.ps1`）不受影响：仍使用 `backend/jobfit.db`，前端走 3000/8000 分离链路。
