# 命名重构：基础简历 + 岗位简历（含数据库迁移）与头像带出修复

> 状态：方案已讨论确认（用户选定：主履历→基础简历、定制简历→岗位简历，改动范围含数据库表名/字段），待实现

## 1. 目标

1. 全栈命名重构，消除「主履历 / 定制简历」概念：**基础简历（Base Resume）** + **岗位简历（Job Resume）**
2. 修复岗位简历生成后头像缺失：生成时从基础简历拷贝 `avatar` 到结果 JSON（头像不经过 LLM）

## 2. 命名映射表

| 旧 | 新 |
| --- | --- |
| Master Resume / 主履历 / 主履历库 | Base Resume / 基础简历 |
| Tailored Resume / 定制简历 | Job Resume / 岗位简历 |
| `master_resume_versions` | `base_resume_versions` |
| `tailored_resumes` | `job_resumes` |
| `tailored_resumes.master_resume_version_id` | `job_resumes.base_resume_version_id` |
| `/api/master-resume/*` | `/api/base-resume/*` |
| `/api/tailored-resume/*` | `/api/job-resume/*` |
| `MasterResumeVersion` / `MasterResumeCreate` / `MasterResumeResponse` | `BaseResumeVersion` / `BaseResumeCreate` / `BaseResumeResponse` |
| `TailoredResume` / `TailoredResumeCreate` / `TailoredResumeResponse` | `JobResume` / `JobResumeCreate` / `JobResumeResponse` |
| `routes/master_resume.py` / `routes/tailored_resume.py` | `routes/base_resume.py` / `routes/job_resume.py` |
| `app/master-resume/` / `app/tailored-resume/` | `app/base-resume/` / `app/job-resume/` |
| `MasterResumeForm.tsx` / `TailoredResumeForm.tsx` | `BaseResumeForm.tsx` / `JobResumeForm.tsx` |
| `api.masterResume` / `api.tailoredResume` | `api.baseResume` / `api.jobResume` |
| LLM Prompt 中文概念词「主履历/定制简历」 | 「基础简历/岗位简历」 |

保留：`llm_configs` / LLM Config（与本次命名无关）、`VersionHistory`（通用概念）、`ResumePreview`/`PDFExporter`（通用）

## 3. 数据库迁移策略（`database.py`）

SQLite（Python 3.13 内置 ≥3.40，支持 `ALTER TABLE RENAME COLUMN`），幂等迁移：

1. `create_all()` 建新表（`base_resume_versions` / `job_resumes` / 新字段 `base_resume_version_id`）
2. 若旧表 `master_resume_versions` 存在且新表为空 → 数据拷贝：
   - `INSERT INTO base_resume_versions (id, version, change_log, content, created_at, deleted_at) SELECT ... FROM master_resume_versions`
   - `INSERT INTO job_resumes (id, base_resume_version_id, raw_jd_text, model_used, generated_content, created_at, deleted_at) SELECT id, master_resume_version_id, ... FROM tailored_resumes`
3. 拷贝成功后 `DROP TABLE` 旧表（数据已迁移，非破坏性）
4. 旧表存在时跳过 `deleted_at` ALTER（新表已含）

迁移前必须关闭外键检查（PRAGMA foreign_keys=OFF 仅连接级；表内 FK 定义随 DDL 保留，数据拷贝按 id 对应，安全性由业务保证）

## 4. 后端改动

| 文件 | 变更 |
| --- | --- |
| `models.py` | 类名/表名/字段名按映射表 |
| `schemas.py` | 类名/字段名按映射表 |
| `routes/base_resume.py`（新） | 原 master_resume.py 全部逻辑，路径 `/api/base-resume`，级联软删查 `JobResume` |
| `routes/job_resume.py`（新） | 原 tailored_resume.py 全部逻辑，路径 `/api/job-resume`，query 参数 `base_version_id` |
| `routes/optimize.py` / `routes/llm_config.py` | 如有引用同步更新 |
| `main.py` | 挂载新路由 |
| `database.py` | 迁移逻辑（见第 3 节） |
| `llm_engine.py` | Prompt 中文概念词更新；变量名按映射表 |

## 5. 头像带出修复（`routes/job_resume.py` `generate`）

LLM 返回 `generated_content` 后、保存前：

```python
avatar = master_resume.content.get("avatar")
if avatar and not generated_content.get("avatar"):
    generated_content["avatar"] = avatar
```

- 头像不进入 Prompt（base64 过大且 LLM 无法生成）
- 预览 / PDF 导出自动生效（均已按 `content.avatar` 渲染）

## 6. 前端改动

| 文件 | 变更 |
| --- | --- |
| `lib/api.ts` | 类型/方法/URL 按映射表 |
| `app/base-resume/page.tsx`（新） | 原 master-resume 页 + 文案「主履历管理→基础简历管理」等 |
| `app/job-resume/page.tsx`（新） | 原 tailored-resume 页 + 文案「生成定制简历→生成岗位简历」等 |
| `components/BaseResumeForm.tsx`（新） | 文案同步 |
| `components/JobResumeForm.tsx`（新） | 文案同步 |
| `components/Navigation.tsx` | 菜单文案 + 路由 |
| `app/page.tsx`（首页） | 文案同步 |

旧目录/组件文件删除。

## 7. 文档

- `AGENTS.md`：项目简介、结构、数据模型、API 概览、开发约定同步更新
- `README.md`：同步更新
- 历史设计文档不改（记录当时决策）；本期新文档为本文

## 8. 影响范围

后端 8 文件 + 前端 8 文件 + 文档 2 文件；SQLite 一次幂等迁移；API 路径变更（本项目无外部调用方）

## 9. 明确不做

- 不做历史设计文档回溯改名
- 不为旧 API 路径提供兼容转发
- 不改 `llm_configs`、`settings` 相关命名
- 头像修复仅做「生成时拷贝」，不做「重新生成时强制覆盖已有头像」（已存在则保留 LLM 结果中的值，实际上 LLM 不会产生 avatar，即总以基础简历为准）
