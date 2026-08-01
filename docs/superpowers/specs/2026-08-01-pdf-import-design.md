# JobFit 主履历导入方案（PDF / 文本）

> 状态：已讨论确认，待实现
> 流程遵循 AGENTS.md 约定：先讨论方案 → 形成设计文档 → 再实现

## 1. 目标

主履历仍需手工逐字段填写，成本高。本方案支持通过两种方式自动导入主履历内容，减少手工录入：

1. **上传 PDF 简历**：后端提取文本 → LLM 结构化为主履历 JSON
2. **粘贴 Markdown/纯文本**：走同一 LLM 结构化链路（文本比 PDF 更可靠，作为补充入口）

导入结果一律先以**可编辑预览**展示，用户确认后才保存为**新版本**，不直接覆盖任何已有数据。

## 2. 整体流程

```
┌───────────────────── 前端 ─────────────────────┐
│  主履历页 → 「导入」按钮 → 导入弹窗              │
│  ┌──────────────┬────────────────────────────┐ │
│  │ Tab1: 上传PDF │ Tab2: 粘贴文本             │ │
│  └──────────────┴────────────────────────────┘ │
│  解析中(loading) → 可编辑表单预览(14模块全字段)   │
│  用户修改 → 确认 → 调用 POST /versions 存新版本  │
└──────────────────────────┬────────────────────┘
                           │
┌──────────────────────────▼────────────────────┐
│                 后端（新增）                    │
│  POST /api/master-resume/import-pdf           │
│    → 校验文件(≤10MB) → pdfplumber 提取文本     │
│  POST /api/master-resume/import-text          │
│    → 直接接收文本                              │
│  ── 共用链路 ──                                │
│    → get_active_llm_client(db)                │
│    → PARSE_RESUME_PROMPT → 输出主履历 JSON     │
│    → JSON 解析(失败重试≤2次) → Pydantic 校验   │
│    → 返回 ParsedResume(仅草稿，不入库)          │
└───────────────────────────────────────────────┘
```

**关键原则：LLM 输出只是草稿，任何情况下都不直接写库，必须经用户人工确认。**

## 3. 后端设计

### 3.1 新增依赖（`requirements.txt`）

| 依赖 | 用途 |
| --- | --- |
| `pdfplumber` | PDF 文本提取（双栏/表格排版效果好） |
| `python-multipart` | FastAPI 文件上传 |

### 3.2 新增端点

#### `POST /api/master-resume/import-pdf`

- 请求：`multipart/form-data`，字段 `file`
- 校验：文件类型 `application/pdf`，大小 ≤ 10MB（超限返回 413）
- 处理：`pdfplumber` 按页提取文本，页间用空行/分页标记拼接
- 若提取文本过短（< 100 字符）判定为扫描件，返回明确错误：暂不支持扫描版 PDF（OCR 二期）
- 无激活 LLM 配置时返回 400，文案复用 `llm_engine` 现有提示

#### `POST /api/master-resume/import-text`

- 请求：JSON，字段 `text`（上限 100KB）
- 处理：直接进入 LLM 结构化链路

两者共用 `parse_resume_text(text, db) -> ParsedResume` 内部函数。

### 3.3 新增 Pydantic Schema（`schemas.py`）

```python
class ParsedResume(BaseModel):
    """LLM 结构化输出校验（仅草稿，字段与主履历 content 对齐）"""
    name: str = ""
    title: str = ""
    email: str = ""
    phone: str = ""
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

class ResumeImportTextRequest(BaseModel):
    text: str
```

- 响应直接返回 `ParsedResume`（不入库）
- `avatar` 不参与解析，导入结果中固定留空

### 3.4 新增 Prompt（`llm_engine.py`）

新增 `PARSE_RESUME_PROMPT`（与 `RESUME_GENERATION_PROMPT` 并列）：

- system：要求"你是简历解析助手，从用户提供的简历文本中提取结构化 JSON，字段结构严格对齐主履历 schema；只输出 JSON 不解释；**不得虚构原文不存在的内容**，原文缺失的字段留空"
- human：提供简历文本
- 输出解析沿用 `StrOutputParser`（不依赖 function calling，兼容第三方 OpenAI 协议）
- 解析失败（JSONDecodeError / Pydantic 校验失败）自动重试 1-2 次，重试时附带上一次原始输出供修正

### 3.5 防幻觉兜底

| 手段 | 说明 |
| --- | --- |
| Prompt 显式禁止虚构 | 缺失字段留空而非编造 |
| Pydantic 校验 | 字段类型/结构不合法时重试 |
| 前端人工确认 | 最终防线，用户可修改任何字段后保存 |
| 后端响应带 `hasMissing` 提示 | 必填字段（name/email 等）缺失时提示用户补填 |

## 4. 前端设计

### 4.1 入口

- 主履历页（`app/master-resume/page.tsx`）顶部新增「导入」按钮，打开导入弹窗

### 4.2 导入弹窗（新组件 `components/ResumeImportModal.tsx`）

- 两个 Tab：**上传 PDF** / **粘贴文本**
  - PDF Tab：拖拽/点击选择文件，显示文件名与大小校验错误
  - 文本 Tab：多行 textarea，限制 100KB
- 点击「解析」→ loading 状态 → 调用 `lib/api.ts` 新增的 `importPdf(file)` / `importText(text)`
- 成功 → 切换到**可编辑表单预览**（复用主履历 14 模块的表单控件，含动态增删）
- 解析失败 → 展示错误信息（扫描件不支持 / 无 LLM 配置 / 解析失败）

### 4.3 确认保存

- 用户核对/修改后点击「保存为主履历新版本」
- 调用现有 `POST /api/master-resume/versions`，`change_log` 填入 `从PDF导入` / `从文本导入`（含时间戳）
- 保存后关闭弹窗、刷新版本列表与表单
- 未确认即关闭弹窗 = 丢弃草稿，不入库

### 4.4 交互约定

- 弹窗内字段结构与 `MasterResumeForm.tsx` 保持一致（可抽取公共字段控件，本期先直接复用表单组件的最小集，不做大规模重构）
- 解析结果中 `avatar` 固定为空

## 5. 影响范围

| 文件 | 变更 |
| --- | --- |
| `backend/requirements.txt` | 新增 `pdfplumber`、`python-multipart` |
| `backend/app/llm_engine.py` | 新增 `PARSE_RESUME_PROMPT` + `parse_resume_text()` |
| `backend/app/schemas.py` | 新增 `ParsedResume`、`ResumeImportTextRequest` |
| `backend/app/routes/resume_import.py` | 新增：两个导入端点 |
| `backend/app/main.py` | 挂载新路由 |
| `frontend/lib/api.ts` | 新增 `importPdf` / `importText` |
| `frontend/components/ResumeImportModal.tsx` | 新增：导入弹窗（含可编辑预览） |
| `frontend/app/master-resume/page.tsx` | 新增「导入」按钮与弹窗接入 |

## 6. 明确不做（本期）

- **OCR**：扫描版/图片型 PDF 不支持（返回明确错误提示），二期可集成 PaddleOCR/Tesseract
- **PDF 头像提取**：解析结果 `avatar` 留空
- **导入模板字段匹配**：不按固定模板解析，完全依赖 LLM 自由结构提取

## 7. 风险与兜底

| 风险 | 兜底 |
| --- | --- |
| 双栏/复杂排版文本乱序 | `pdfplumber` 提取 + LLM 重组；预览确认环节人工修正 |
| LLM 输出 JSON 格式错误 | 重试 1-2 次 + Pydantic 校验 |
| LLM 幻觉虚构经历 | Prompt 禁止虚构 + 人工确认兜底 |
| 超大文件拖慢接口 | 10MB 上限 + 前端 loading 提示 |
| 文本提取为空（扫描件） | 长度校验并返回明确错误 |
