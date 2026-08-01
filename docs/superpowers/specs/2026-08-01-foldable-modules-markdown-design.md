# 折叠面板模块改为 Markdown 文本字段设计

日期：2026-08-01
状态：已确认（用户直接执行）

## 背景 / 问题

证书认证（certifications）、语言能力（languages）、获奖荣誉（awards）、出版物（publications）目前为结构化数组（name/issuer/date 等固定字段），表单输入受限、预览展示固定。用户需要自由发挥、自己列项（如混合文本、自定义列表），故改为统一 Markdown 文本。

## 目标

- 4 个折叠模块字段类型由 `array` 改为 `string`（Markdown 文本）
- 表单改为 textarea，预览支持 Markdown 渲染
- 历史版本中的旧数组结构数据仍可正常展示（自动转 Markdown）

## 设计

### 字段定义

- 复用原字段名，类型变化：`certifications` / `languages` / `awards` / `publications` 一律为 Markdown 字符串
- 不做旧数组数据兼容（项目初期，历史数据不迁移、不展示）

### 前端

- `BaseResumeForm.tsx`：4 个折叠面板从「输入框行 + 添加按钮」改为单个 `textarea`（自动撑高，placeholder 提示支持 Markdown）
- `ResumePreview.tsx`：4 个模块改为 `react-markdown` 渲染（新增依赖 `react-markdown`），数组旧数据先转文本
- 保存逻辑：`buildContent()` 中 4 字段直接取 trim 后的字符串（非空才保存）
- `lib/api.ts`：`BaseResumeContent` 中 4 字段类型改为 `string`

### 后端

- `schemas.py`：`ParsedResume` 中 4 字段由 `list[dict]` 改为 `str = ""`（导入解析模型）
- `llm_engine.py`：
  - `RESUME_SCHEMA_DESCRIPTION`：4 字段改为 `certifications(Markdown 文本)` 等描述
  - `RESUME_GENERATION_PROMPT`：第 7 条要求重写为「按 Markdown 输出证书/奖项/出版物/语言文本（`- ` 列表），保留原内容不虚构」

### PDF 导出

- PDF 走浏览器打印（预览 HTML 直接打印），Markdown 由 react-markdown 渲染成 HTML，无需额外改动

## 影响范围

- `frontend/components/BaseResumeForm.tsx`、`ResumePreview.tsx`、`frontend/lib/api.ts`、`frontend/package.json`
- `backend/app/schemas.py`、`backend/app/llm_engine.py`
- 历史版本旧数组数据不做兼容（字段非字符串时前端按空字符串处理）

## 风险

- 新增 `react-markdown` 依赖（构建体积略增）
- 历史版本中数组结构数据将不再展示（初期可接受）
- Markdown 渲染无样式自定义，仅支持标准 Markdown 子集（标题/列表/粗斜体/链接/代码块）

## 明确不做

- 不做富文本编辑器、不做表格/图片等扩展 Markdown 语法
- 不做数据库迁移（JSON 结构兼容处理）
