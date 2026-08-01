# 主履历版本管理 & 定制简历来源展示

> 状态：已讨论确认，待实现

## 1. 目标

1. **版本历史删除**：主履历版本列表支持删除单个版本（不限制，可删至空）
2. **保存当前版本**：编辑已有版本时支持覆盖保存（不新增版本号），保留「另存为新版本」作为可选操作
3. **定制简历来源信息**：历史记录与预览区明确展示「用的哪个主履历版本 + 哪份岗位 JD」

## 2. 后端设计

### 2.1 新增端点（`routes/master_resume.py`）

#### `PUT /api/master-resume/versions/{id}`

- 请求体复用 `MasterResumeCreate`（content + change_log）
- 覆盖指定版本的 `content` 与 `change_log`，**不改变 version 号**，`created_at` 不变
- 版本不存在 → 404

#### `DELETE /api/master-resume/versions/{id}`

- 删除指定版本记录
- 版本不存在 → 404
- **不限制删除**：可删任意版本（含最新），列表可为空；被删除版本引用的定制简历记录保留，前端兜底显示「版本已删除」
- 注：SQLite 外键默认不强制，悬空引用由前端处理

### 2.2 定制简历来源

- 无需后端改动：`TailoredResume` 已有 `master_resume_version_id`（版本 id）与 `raw_jd_text`（完整 JD）
- 前端用已加载的 `masterVersions` 列表映射 `id → version 号`

## 3. 前端设计

### 3.1 `lib/api.ts`

- `masterResume.update(id, data)` → PUT
- `masterResume.delete(id)` → DELETE

### 3.2 版本历史删除（`VersionHistory.tsx` + 主履历页）

- `VersionHistory` 新增 props：`onDelete: (v: MasterResumeVersion) => void`
- 每条目 hover 时显示删除按钮（×），点击 → 主履历页弹出 `confirm` 确认 → 调 DELETE → 刷新列表
- 若删除的是当前选中版本 → 选中切换为列表中最新版本；列表空 → 回到「新建主履历」状态
- 最新版本不特殊保护（可删），与方案一致

### 3.3 保存当前版本（`MasterResumeForm.tsx` + 主履历页）

- `MasterResumeForm` 新增 props：`currentVersionId?: number | null`（当前编辑的是哪个版本）
- `onSave` 签名扩展为 `(content, changeLog, mode: "update" | "create") => Promise<void>`
- 保存区按钮逻辑：
  - `currentVersionId` 存在时：两个按钮——「保存当前版本」（mode=update，PUT 覆盖）与「另存为新版本」（mode=create，POST 新建）；变更说明输入框保留（两个按钮共用，可留空）
  - 无 `currentVersionId`（新建）时：仅「保存」按钮（create）
- 主履历页 `handleSave` 按 mode 分发：
  - update → `api.masterResume.update(currentVersionId, ...)` → 刷新列表（仍选中该版本）
  - create → 现有逻辑（刷新后选中新版本）

### 3.4 定制简历来源展示（`app/tailored-resume/page.tsx`）

- 辅助函数 `getVersionLabel(r)`：用 `masterVersions` 映射 `master_resume_version_id → "v{n}"`，映射不到显示「版本已删除」
- 历史记录卡片：在 JD 首行下增加一行「主履历 {label} · 岗位 {JD 首行}」（保留日期行）
- 预览区：`card-header` 下新增来源信息条：
  - 左侧：「主履历 {label} · 模型 {model_used}」
  - 下方可折叠 `<details>`：完整 JD 文本（`raw_jd_text`，等宽字体展示）

## 4. 影响范围

| 文件 | 变更 |
| --- | --- |
| `backend/app/routes/master_resume.py` | + `PUT`、`DELETE /versions/{id}` |
| `frontend/lib/api.ts` | + `update` / `delete` |
| `frontend/components/VersionHistory.tsx` | 条目删除按钮 |
| `frontend/components/MasterResumeForm.tsx` | 双保存按钮（当前版本/另存新版本） |
| `frontend/app/master-resume/page.tsx` | handleSave 双模式分发 + 删除处理与选中切换 |
| `frontend/app/tailored-resume/page.tsx` | 历史卡片来源信息 + 预览区来源行与 JD 折叠展示 |

## 5. 明确不做

- 不做版本对比/差异查看
- 不做删除定制简历记录（本期无入口）
- 不禁止删除被引用的主履历版本（悬空引用前端兜底）

## 6. 风险与兜底

| 风险 | 兜底 |
| --- | --- |
| 误删版本 | confirm 确认；版本可删至空后页面回到「新建」状态 |
| 删除被定制简历引用的版本 | 前端 `getVersionLabel` 兜底显示「版本已删除」 |
| 保存当前版本误覆盖 | 按钮文案明确区分「保存当前版本 / 另存为新版本」，变更说明可留空 |
