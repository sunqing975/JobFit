# JD 匹配度评估报告（独立接口 + 用户触发 + 落库回看）

> 状态：方案已讨论确认（独立 SSE 接口、用户主动触发、报告与简历一同留存），待实现

## 1. 目标

1. 新增**独立评估接口**：基于已生成的岗位简历 + JD，输出 JD 匹配度评估报告（纯文本：匹配度评分、JD 核心要求、命中技能、缺失技能、优化建议）
2. 报告由**用户主动触发**生成（生成简历流程保持不变，两段式 SSE 不动）
3. 报告与简历**一同落库**，历史记录回看时可再次查看；可重复生成覆盖

## 2. 后端设计

### 2.1 数据模型（`backend/app/models.py`）

- `JobResume` 加 `match_report: Optional[str] = None`

### 2.2 迁移（`backend/app/database.py` `_migrate`）

- 幂等：`PRAGMA table_info(job_resumes)` 检测缺 `match_report` 列则 `ALTER TABLE job_resumes ADD COLUMN match_report TEXT`（沿用软删除先例）

### 2.3 Schema（`backend/app/schemas.py`）

- `JobResumeResponse` 加 `match_report: Optional[str]`（列表/详情接口自然携带，前端回看无需重拉）

### 2.4 新接口（`backend/app/routes/job_resume.py`）

`POST /api/job-resume/{resume_id}/report` → SSE 流式（`text/event-stream`）：

- 校验：记录存在且未删除（404）；`get_active_llm_client` 无激活配置 → `error` 事件
- Prompt（新增 `REPORT_PROMPT`，放 `llm_engine.py`）：system 要求按固定结构输出纯文本报告（匹配度评分：xx/100 / JD 核心要求 / 已命中技能 / 缺失技能 / 优化建议），human 传入「岗位简历 JSON + 岗位 JD」；不超过 300 字
- 事件：
  - `{"type": "delta", "content": "..."}` — 报告文本增量（`chain.astream`）
  - `{"type": "done"}` — 生成完成
  - `{"type": "error", "message": "..."}` — 异常 / 空输出
- 完成后：`record.match_report = 全文.strip()[:2000]` 落库提交；再次触发覆盖更新
- 不修改生成接口与生成 prompt

## 3. 前端设计

### 3.1 `frontend/lib/api.ts`

- `JobResume` 接口加 `match_report: string | null`
- 新增 `jobResume.generateReport(resumeId, handlers: {onDelta, onDone, onError}): AbortController`，复用 `readSSE`

### 3.2 `frontend/app/job-resume/page.tsx`

- 预览区「简历预览」卡片上方新增报告区：
  - 已有报告（`selectedResume.match_report`）：显示报告卡片（灰色底、`whitespace-pre-wrap`、限高滚动），标题旁「重新生成」按钮
  - 无报告：显示「生成评估报告」按钮
- 点击生成：按钮变「生成中...」（禁用）；`onDelta` 实时追加到报告卡片；完成后刷新 `selectedResume`（重拉 `jobResume.get(id)` 或本地 set match_report）；出错 alert
- 报告卡片可折叠（`<details>`），PDF 导出不受影响

## 4. 影响范围

| 文件 | 变更 |
| --- | --- |
| `backend/app/llm_engine.py` | 新增 REPORT_PROMPT |
| `backend/app/models.py` | JobResume + match_report |
| `backend/app/database.py` | 幂等 ALTER 迁移 |
| `backend/app/schemas.py` | JobResumeResponse + match_report |
| `backend/app/routes/job_resume.py` | 新增 report SSE 接口 |
| `frontend/lib/api.ts` | JobResume 类型 + generateReport |
| `frontend/app/job-resume/page.tsx` | 报告区 + 触发/展示/重新生成 |

## 5. 风险

- 模型不按格式输出 → 报告文本缺失或随意，仅作展示不校验格式
- 报告文本超长 → 截取 2000 字符落库，卡片限高滚动
- 并发触发（同一记录重复点击）→ 按钮生成中禁用即可

## 6. 明确不做

- 报告不进 PDF/预览简历
- 不做结构化评分数据（评分环、标签云可视化）
- 不做报告的历史版本管理（每次生成覆盖）
- 不改动现有生成接口（两段式 SSE 保持）
