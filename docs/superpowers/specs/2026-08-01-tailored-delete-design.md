# 定制简历历史记录删除

> 状态：已讨论确认，待实现

## 1. 目标

定制简历历史记录支持删除单条记录，误操作通过 confirm 确认兜底。

## 2. 后端设计

### `DELETE /api/tailored-resume/{resume_id}`（`routes/tailored_resume.py`）

- 删除指定 id 的 TailoredResume 记录
- 不存在 → 404

## 3. 前端设计

### 3.1 `lib/api.ts`

- `tailoredResume.delete(id)` → DELETE

### 3.2 历史记录（`app/tailored-resume/page.tsx`）

- 历史卡片 hover 显示 × 删除按钮，点击 → `confirm` 确认 → 调 DELETE → 从本地列表移除
- 删除的是当前选中项时：自动选中列表中最新的第一条；列表为空则 `selectedResume` 置 null（回到空状态）
- 卡片删除按钮需阻止冒泡（不触发选中）

## 4. 影响范围

| 文件 | 变更 |
| --- | --- |
| `backend/app/routes/tailored_resume.py` | + `DELETE /{id}` |
| `frontend/lib/api.ts` | + `tailoredResume.delete` |
| `frontend/app/tailored-resume/page.tsx` | 历史卡片删除按钮 + 选中切换 |

## 5. 明确不做

- 不做批量删除
- 不做删除确认弹窗（用浏览器 confirm，与主履历版本删除一致）
