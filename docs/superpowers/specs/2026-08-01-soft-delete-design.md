# 软删除 + 级联删除 + 定制简历版本筛选

> 状态：方案已讨论确认（后端接口过滤），待实现

## 1. 目标

1. 主履历版本、定制简历的删除全部改为**软删除**（保留数据，可手动恢复）
2. 删除主履历版本时**级联软删除**其下所有定制简历
3. 定制简历历史记录支持**按主履历版本筛选**（后端接口过滤）

## 2. 后端设计

### 2.1 数据模型（`models.py`）

- `MasterResumeVersion` + `deleted_at: Optional[datetime] = None`
- `TailoredResume` + `deleted_at: Optional[datetime] = None`

### 2.2 迁移（`database.py` `init_db`）

- `create_all()` 后执行幂等迁移：用 `PRAGMA table_info` 检测两张表是否缺 `deleted_at` 列，缺则 `ALTER TABLE ... ADD COLUMN deleted_at DATETIME`
- 已有数据迁移后 `deleted_at` 为 NULL（= 未删除）

### 2.3 主履历路由（`routes/master_resume.py`）

- `list_versions` / `get_version` / `get_latest_version` / `PUT`：仅操作未删除记录（404 兜底）
- `create_version`：`next_version` 用全表 `max(version)+1`（含软删记录，避免版本号复用）
- `DELETE`：软删除（写 `deleted_at=now`），并级联软删 `tailored_resumes` 中 `master_resume_version_id` 指向它的未删除记录

### 2.4 定制简历路由（`routes/tailored_resume.py`）

- `GET /api/tailored-resume/?master_version_id=X`：可选过滤；不传返回全部未删除
- `get` / `DELETE`：仅未删除；`DELETE` 为软删除
- `generate`：基于未删除的主履历版本（404 兜底）

## 3. 前端设计

### 3.1 `lib/api.ts`

- `tailoredResume.list(masterVersionId?)` → 传参拼 query

### 3.2 定制简历页（`app/tailored-resume/page.tsx`）

- 历史记录上方加筛选下拉：**全部版本** + 各未删除主履历版本（`主履历 v1 · 日期`）
- 切换筛选 → 重新调 `list(masterVersionId)`；生成成功后刷新当前筛选下的列表
- 已删除主履历版本下的定制简历在「全部」下仍可见，label 显示「版本已删除」

### 3.3 版本历史（`VersionHistory.tsx` + `MasterResumeForm.tsx`）

- 删除确认文案增加提示：「该版本下的定制简历将一并删除」

## 4. 影响范围

| 文件 | 变更 |
| --- | --- |
| `backend/app/models.py` | 两表 + `deleted_at` |
| `backend/app/database.py` | `init_db` 幂等迁移 |
| `backend/app/routes/master_resume.py` | 查询过滤 + 软删 + 级联软删 |
| `backend/app/routes/tailored_resume.py` | 查询过滤 + 软删 + master_version_id 过滤 |
| `frontend/lib/api.ts` | list 支持版本过滤参数 |
| `frontend/app/tailored-resume/page.tsx` | 版本筛选下拉 |
| `frontend/components/VersionHistory.tsx` / `MasterResumeForm.tsx` | 删除确认文案 |

## 5. 明确不做

- 不做软删除数据的恢复入口（数据保留在库中，可通过改库恢复）
- 不做批量删除
- 不做已删除主履历版本的下拉入口（其定制简历仅在「全部」下可见）
