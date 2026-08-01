# AGENTS.md

## 项目简介

JobFit 是一个基于大模型的智能简历定制平台：用户一次性维护一份全量的「基础简历库（Base Resume）」，申请新岗位时粘贴岗位 JD，系统自动按 STAR 原则重构出针对该岗位的高匹配岗位简历，支持在线预览与一键导出 PDF。

## 需求开发流程（强制，必须严格遵守）

所有新增需求、功能改动、重构，**必须先讨论方案、形成设计文档，确认后再实现**：

1. **先讨论方案**：与用户讨论技术选型、影响范围、取舍，不直接动手写代码
2. **形成设计文档**：方案确认后，写入 `docs/superpowers/specs/` 目录，命名 `YYYY-MM-DD-<主题>-design.md`（参考现有文档风格：目标 / 流程 / 设计 / 影响范围 / 风险）
3. **确认后再实现**：文档经用户确认后方可开始编码，实现必须与文档一致；实现过程中若方案有变，先更新文档再改代码
4. **明确不做**：文档中需列出本期明确不做的事项，避免范围蔓延

违反此流程的变更视为不合规，应先补文档再继续。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Next.js 15 (App Router, `app/`) + React 19 + Tailwind CSS 3，PDF 导出走浏览器打印（`window.print()` + `@media print` 样式，与预览完全一致） |
| 后端 | Python + FastAPI + LangChain (`ChatOpenAI`) + SQLModel/SQLAlchemy |
| 数据库 | SQLite 单文件（`backend/jobfit.db`），ORM 抽象后可切换 PostgreSQL/MySQL |
| LLM | OpenAI 兼容协议，UI 内动态配置 api_base / api_key / model / temperature |

## 项目结构

```
JobFit/
├── backend/                  # FastAPI 后端
│   ├── app/
│   │   ├── main.py           # 应用入口，CORS(仅 localhost:3000)，挂载路由 + 前端静态文件托管
│   │   ├── database.py       # SQLite 引擎 + get_db 依赖（打包模式自动切 %APPDATA%\JobFit\jobfit.db）
│   │   ├── models.py         # SQLModel 表：base_resume_versions / job_resumes / llm_configs
│   │   ├── schemas.py        # Pydantic 请求/响应模型
│   │   ├── llm_engine.py     # 获取激活 LLM 客户端 + 简历生成 Prompt
│   │   └── routes/           # base_resume.py / job_resume.py / optimize.py / llm_config.py / resume_import.py / ocr.py
│   ├── run.py                # 打包版入口：探测空闲端口 + 自动开浏览器
│   ├── jobfit.spec           # PyInstaller onefile 配置（datas: 前端静态产物 + rapidocr 模型）
│   ├── requirements.txt
│   ├── .env.example          # DATABASE_URL=sqlite:///./jobfit.db
│   └── venv/                 # 虚拟环境（勿提交）
├── build.ps1                 # 一键打包（根目录）：前端构建 → 拷入 app/static → PyInstaller
├── dist/                     # 打包产物（JobFit.exe），与 backend 平级
├── frontend/                 # Next.js 前端
│   ├── app/                  # page.tsx(首页) / base-resume / job-resume / settings
│   ├── components/           # BaseResumeForm / JobResumeForm / ResumePreview / PDFExporter / VersionHistory / LLMConfigForm / Navigation
│   ├── lib/api.ts            # 全部后端 API 封装（前端唯一请求入口）
│   └── .env.local.example    # NEXT_PUBLIC_API_URL=http://localhost:8000
├── docs/superpowers/specs/   # 设计文档（需求开发流程的产物，见上方"需求开发流程"）
├── start.ps1 / start.sh      # 一键启动脚本
└── README.md                 # 详细方案设计
```

## 启动方式

```powershell
.\start.ps1              # 同时启动前后端（自动检测/创建 venv、装依赖）
.\start.ps1 -Install     # 安装依赖后启动
.\start.ps1 -BackendOnly -Port 9000
.\start.ps1 -FrontendOnly -FrontendPort 8080
```

- 后端：`http://localhost:8000`，API 文档 `http://localhost:8000/docs`
- 前端：`http://localhost:3000`
- Linux/macOS 使用 `./start.sh`
- 后端手动启动：`backend/venv/Scripts/uvicorn app.main:app --reload`（工作目录 `backend/`）
- 前端手动启动：`npm run dev`（工作目录 `frontend/`）
- 桌面打包：`.\build.ps1` → `dist\JobFit.exe`（前端静态导出由后端同端口托管，打包版数据库在 `%APPDATA%\JobFit\jobfit.db`）

## 数据模型

基础简历内容以 JSON 存储于 `base_resume_versions.content`，包含 14 个模块字段（字段结构见 `docs/superpowers/specs/2026-07-29-resume-enhancement-design.md`）：

- 基本信息：`avatar`(Base64 data URL, <2MB)、`name`、`title`、`email`、`phone`、`location`、`website`、`linkedin`、`github`
- `summary` 个人总结
- `skillCategories`（分类技能）、`experience`（工作经历，含 techStack）、`projects`（项目经历）、`education`（教育背景）
- 折叠面板：`certifications`、`languages`、`awards`、`publications`（均为 Markdown 文本字符串，预览用 react-markdown 渲染）

版本控制：每次保存基础简历自动生成新版本号（递增），全量 JSON 存储，不覆盖旧数据。

## API 概览

| 模块 | 端点 |
| --- | --- |
| Base Resume | `GET/POST /api/base-resume/versions`，`GET/PUT/DELETE /api/base-resume/versions/{id}`（PUT 保存当前版本，DELETE 软删除该版本并级联软删其岗位简历），`GET /api/base-resume/latest`，`POST /api/base-resume/import-pdf`（文本型快速通道，扫描版自动 PyMuPDF 渲染 + RapidOCR，最多 20 页），`POST /api/base-resume/import-text`，`POST /api/base-resume/import-image`（导入解析详见 `docs/superpowers/specs/2026-08-01-pdf-import-design.md`、`2026-08-01-screenshot-ocr-design.md` 与 `2026-08-01-scanned-pdf-ocr-design.md`） |
| Job Resume | `GET /api/job-resume/?base_version_id=X`（可选版本过滤），`GET /api/job-resume/{id}`，`POST /api/job-resume/generate`，`DELETE /api/job-resume/{id}`（软删除） |
| Optimize | `POST /api/optimize/content`（type: summary / experience / project，单文本 AI 润色） |
| OCR | `POST /api/ocr/extract`（多图截图 → 纯文本，不调 LLM，用于岗位 JD 输入） |
| LLM Config | `GET/POST /api/llm-config/`，`GET /api/llm-config/active`，`PUT/DELETE /api/llm-config/{id}` |

## 开发约定

- 后端新增 LLM 调用时：复用 `llm_engine.get_active_llm_client(db)`，Prompt 编排用 `ChatPromptTemplate`，输出解析用 `StrOutputParser`
- 前端请求统一走 `lib/api.ts` 的 `api` 对象，不直接 `fetch`
- 基础简历 JSON 结构变更需同步更新：`BaseResumeForm.tsx`、`ResumePreview.tsx`、`PDFExporter.tsx`、`llm_engine.py` 中的 Prompt
- 数据库表由 SQLModel 模型定义，`init_db()` 在应用启动时自动建表；修改模型不自动迁移
- 环境变量：后端 `.env`（DATABASE_URL），前端 `.env.local`（NEXT_PUBLIC_API_URL），示例见 `.example` 文件
- 组件为 `"use client"` 客户端组件（交互型页面）
- 无测试框架，无 lint 脚本（前端 `npm run lint` 为 next lint）；改动后建议手动验证构建：`npm run build`

## 注意事项

- `backend/jobfit.db`、`venv/`、`node_modules/`、`.next/` 均被 .gitignore 忽略
- LLM API Key 存在 `llm_configs` 表的 `api_key` 字段（明文存储），提交代码时注意不要将真实 key 写入示例文件或 README
- CORS 目前仅允许 `http://localhost:3000`，改动前端端口需同步修改 `main.py`
