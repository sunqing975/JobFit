# AI 优化接口 SSE 流式改造

> 状态：方案已讨论确认（流式写入 textarea、带停止按钮、直接改造原接口），待实现

## 1. 背景

用户反馈：AI 优化（summary/experience/project）接口为同步阻塞，生成耗时 5~15 秒无反馈；且偶发 LLM 返回空串导致前端直接覆盖清空用户原文（优化后 textarea 变空、无提示，刷新后数据仍在）。

## 2. 目标

1. `POST /api/optimize/content` 改造为 **SSE 流式**（`text/event-stream`），token 边生成边推送，前端实时写入 textarea
2. 优化中提供**停止按钮**（AbortController 中断请求）
3. 顺带修复空结果清空 bug：输出为空 / LLM 报错时**回滚到优化前原文**

## 3. 后端设计（`backend/app/routes/optimize.py`）

- `POST /api/optimize/content` 直接改为 SSE（不保留同步版本），移除 `OptimizeResponse` schema
- 路由内同步获取 `llm = get_active_llm_client(db)`（get_db 为同步依赖，保持不变），返回 `StreamingResponse(generator, media_type="text/event-stream")`
- 事件格式（每个事件一行 `data: {...}\n\n`）：
  - `{"type": "delta", "content": "..."}` — 增量 token（`chain.astream` 经 `StrOutputParser` 的 str chunk）
  - `{"type": "done"}` — 正常结束
  - `{"type": "error", "message": "..."}` — LLM 异常 / 总输出为空（HTTP 200 内承载，前端好处理）
- 校验保持：`text` 为空 → 400；`type` 不支持 → 400
- LLM 未配置（无激活配置）→ error 事件
- 客户端断开（`asyncio` cancel）→ generator 正常退出

## 4. 前端设计

### 4.1 `frontend/lib/api.ts`

- `api.optimize.content` 改造为流式方法：

```ts
streamContent(
  text: string,
  type: "summary" | "experience" | "project",
  handlers: { onDelta: (s: string) => void; onDone: () => void; onError: (msg: string) => void },
): AbortController
```

- 实现：`fetch(POST)` + `res.body.getReader()` + `TextDecoder("utf-8", {stream: true})` 解码，按 `\n\n` 分帧解析 `data: ` 行 JSON
- 返回 `AbortController` 供停止按钮调用；abort 时 `onError("已停止")` 触发回滚

### 4.2 `frontend/components/BaseResumeForm.tsx`

三处优化按钮（summary / experience / project）统一逻辑：

1. 点击优化：`backup = 当前值`，目标内容**置空**，进入流式状态（按钮变「停止」）
2. 收到 `onDelta`：`setX(prev => prev + delta)` 实时追加
3. `onDone`：完成，恢复正常按钮
4. `onError`（含空结果 / LLM 错误 / 停止）：`setX(backup)` 回滚原文，alert 展示错误信息（空结果提示"优化结果为空，请重试"）
5. 停止按钮：调用 `controller.abort()`，回滚原文
6. experience/project 的 bullets：增量内容按 `\n` 分组成数组写入（停止/出错时回滚原数组）

## 5. 影响范围

| 文件 | 变更 |
| --- | --- |
| `backend/app/routes/optimize.py` | 同步 → SSE 流式，移除 OptimizeResponse |
| `frontend/lib/api.ts` | optimize.content → streamContent |
| `frontend/components/BaseResumeForm.tsx` | 三处优化按钮流式化 + 停止 + 回滚 |

## 6. 风险

- SSE 与 fetch 流式解析复杂度在前端，需用 `ReadableStream`（现代浏览器均支持）
- 中文 token 流式 UTF-8 解码需 `TextDecoder(stream: true)` 避免乱码
- 本地无反向代理，不存在 buffer 问题；如未来部署到 Nginx 需关闭代理缓冲

## 7. 明确不做

- 不做 job-resume 生成（大 JSON）的流式改造
- 不做自动重试 / 失败恢复
- 不做进度百分比
- 不保留同步版 `/content` 接口
