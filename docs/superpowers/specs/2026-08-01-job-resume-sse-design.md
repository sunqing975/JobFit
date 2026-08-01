# 岗位简历生成 SSE 流式改造（匹配分析流式 + 最终渲染）

> 状态：方案已讨论确认（方案 A：两段式流式），待实现

## 1. 背景

岗位简历生成 `POST /api/job-resume/generate` 为同步阻塞，耗时 10~30 秒无任何反馈。与 AI 优化（纯文本）不同，生成输出是**结构化 JSON**，流式过程中 95% 时间为无效 JSON，无法逐 token 渲染。

## 2. 目标

1. 生成接口改为 **SSE 流式**，输出分两段：
   - 第一段「JD 匹配分析」文本（人类可读，实时逐字展示）
   - 第二段「完整简历 JSON」（流式收集，收完一次性解析渲染）
2. 生成中提供**停止按钮**（AbortController）
3. 数据入库、历史记录、自动选中逻辑**完全不变**

## 3. 输出协议（`backend/app/llm_engine.py`）

`RESUME_GENERATION_PROMPT` system 消息追加格式约束：

```
输出分两段：
1. 【JD 匹配分析】：300 字以内，说明 JD 核心要求、简历已覆盖点、缺失/建议补充点（人类可读文本）
2. 分隔行 ===JSON===
3. 【完整简历 JSON】：符合要求 1~7 的完整结构化 JSON

示例：
<匹配分析文本>
===JSON===
{...完整 JSON...}
```

## 4. 后端设计（`backend/app/routes/job_resume.py`）

`POST /api/job-resume/generate` 改为 SSE（不保留同步版）：

- 事件格式（沿用优化接口约定，`data: {...}\n\n`）：
  - `{"type": "analysis", "content": "..."}` — 分析段增量文本
  - `{"type": "done", "resume": {JobResumeResponse 完整对象}}` — 生成完成并已入库
  - `{"type": "error", "message": "..."}` — LLM 异常 / 未找到激活配置 / JSON 解析失败
- 流式分界检测（处理标记跨 chunk）：
  - 累积 `full_buffer`，搜索 `===JSON===`
  - 未找到时：每收到 chunk，将 `full_buffer` 中已确认安全的头部（尾部保留 16 字符防分界跨块）推为 `analysis` 增量
  - 找到时：分界前剩余文本推为最后一段 `analysis`，分界后内容进入 `json_parts`，后续 chunk 全部进 `json_parts`
  - 容错：流结束仍未找到分界 → 全部内容按原逻辑 `_extract_json` 解析（兼容模型不输出分析段）
- 完成后：`_extract_json(json_parts)` → avatar 注入 → 入库 → `done` 事件携带记录（与现有返回结构一致）
- 解析失败：不再存 `raw_output` 兜底（无法渲染），改发 `error` 事件提示重试

## 5. 前端设计

### 5.1 `frontend/lib/api.ts`

- 抽公共 SSE 帧解析 helper（复用优化接口的 ReadableStream/TextDecoder 逻辑）
- `jobResume.generate` 改为 `generateStream(data, handlers: {onAnalysis, onDone, onError}): AbortController`，`done` 事件解出 resume 对象后调 `onDone`

### 5.2 `frontend/app/job-resume/page.tsx`

- `handleGenerate` 改用 `generateStream`：
  - `onAnalysis`：更新实时分析文本状态
  - `onDone(resume)`：走现有逻辑（`setSelectedResume` + 刷新列表 + 切换筛选）
  - `onError`：`setError`
- 生成中（右栏无选中简历时）展示「生成中」面板：转圈 + **实时匹配分析文本**（等宽/段落样式）；生成完成自动切换到简历预览
- 生成期间历史记录不新增条目（完成入库后刷新才有）

### 5.3 `frontend/components/JobResumeForm.tsx`

- 生成中按钮变「停止」（调用 controller.abort，中断后不产生记录、不弹窗）

## 6. 影响范围

| 文件 | 变更 |
| --- | --- |
| `backend/app/llm_engine.py` | RESUME_GENERATION_PROMPT 两段输出约束 |
| `backend/app/routes/job_resume.py` | generate 改 SSE + 分界检测 + 无 raw_output 兜底 |
| `frontend/lib/api.ts` | 抽 SSE helper + generateStream |
| `frontend/app/job-resume/page.tsx` | 生成流程改造 + 分析展示 |
| `frontend/components/JobResumeForm.tsx` | 生成中显示停止按钮 |

## 7. 风险

- 分界标记跨 chunk 被截断 → 尾部保留 16 字符缓冲处理
- 模型不遵循格式（无分析段/无分界）→ 整体按 JSON 解析的容错路径
- 分析文本不落库，刷新后消失（仅生成过程展示）

## 8. 明确不做

- 不做匹配分析的结构化存储与展示（本次仅生成过程实时展示）
- 不做容错增量 JSON 渲染（半截内容无意义）
- 不做生成结果的自动重试
- 不做异步任务队列（生成仍同步等待流完成）
