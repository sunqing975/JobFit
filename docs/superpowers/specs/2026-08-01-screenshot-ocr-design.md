# JobFit 截图 OCR 方案

> 状态：已讨论确认，待实现
> 背景：招聘平台岗位信息无法复制、无法打开开发者工具，用户通过**截屏**获取内容，需 OCR 识别
> 场景 A：OCR 文本作为岗位 JD 填入定制简历输入框（纯文本，不经过 LLM）
> 场景 B：截图导入主履历（OCR → LLM 结构化，见 `docs/superpowers/specs/2026-08-01-pdf-import-design.md` 同链路）

## 1. 目标

1. **场景 A（JD 识别）**：定制简历页 JD 输入框旁提供「图片识别」按钮，截图/选图后 OCR 识别，文本**追加**到 JD 输入框末尾，用户可继续修改
2. **场景 B（主履历导入）**：导入弹窗「图片截图」Tab，粘贴/多选截图，OCR → LLM 结构化为主履历 JSON 草稿
3. OCR 引擎：RapidOCR（PP-OCRv4/v6 mobile 模型），纯 pip 依赖、离线运行、隐私安全

## 2. 技术选型

| 方案 | 结论 |
| --- | --- |
| **RapidOCR（rapidocr_onnxruntime / rapidocr 2.x）** | ✅ 选中：中文规范字体识别率高，纯 pip 安装（onnxruntime 后端），模型 ~30MB 首次自动下载，离线隐私安全 |
| Tesseract | ❌ 需另装系统二进制 + chi_sim 语言包，Windows 配置麻烦，中文效果一般 |
| 云端 OCR API | ❌ 需注册/付费，岗位信息上传云端有隐私风险 |
| Windows 原生 OCR | ❌ WinRT 调用复杂、跨平台差 |

## 3. 整体流程

```
场景 A（JD 识别）：
定制简历页 JD 输入框旁「图片识别」按钮 → 小弹窗（粘贴/多选截图）
  → POST /api/ocr/extract（纯 OCR，不调 LLM）
  → 返回 { text } → 追加到 JD 输入框末尾 → 用户修改后照常生成

场景 B（主履历导入）：
导入弹窗「图片截图」Tab → 粘贴/多选截图（PNG/JPG/WebP，≤10 张，每张 ≤10MB）
  → POST /api/master-resume/import-image
  → RapidOCR 逐张识别 → 拼接文本（图片名间插入分隔标记）
  → 复用 parse_resume_text()（LLM 结构化，与 PDF 导入完全同一链路）
  → 返回 ParsedResume
前端：可编辑预览 → 确认存为新版本（change_log「从截图导入」）
```

## 4. 后端设计

### 4.1 依赖

| 依赖 | 用途 |
| --- | --- |
| `rapidocr`（3.x，onnxruntime 后端） | 中文 OCR（模型随包内置，完全离线） |

- 封装为懒加载单例（`RapidOCR` 实例只初始化一次，避免每次请求重复加载模型）
- 公共常量与图片类型白名单收敛在 `ocr_engine.py`：`MAX_IMAGES=10`、`MAX_IMAGE_SIZE=10MB`、`MIN_IMAGE_TEXT_LENGTH=10`、`ALLOWED_IMAGE_TYPES={png,jpeg,webp}`

### 4.2 新增端点

#### `POST /api/ocr/extract`（场景 A：JD 纯文本）

- 请求：`multipart/form-data`，字段 `files`（可多张）
- 校验：每张 ≤10MB、类型为 PNG/JPG/JPEG/WebP；张数 ≤10
- 处理：逐张 OCR → 文本按 `---- 图片N ----` 分隔拼接 → **直接返回 `{ text }`，不调 LLM**（JD 场景只需要原文，LLM 结构化会改写 JD 内容）
- OCR 无文本：返回 400「未能从图片中识别出文本」
- 放独立路由 `backend/app/routes/ocr.py`（语义通用，主履历导入也能复用）

#### `POST /api/master-resume/import-image`（场景 B：主履历导入）

- 请求：`multipart/form-data`，字段 `files`（可多张）
- 校验：每张 ≤10MB、类型为 PNG/JPG/JPEG/WebP；张数 ≤10
- 处理：逐张 OCR → 文本按 `---- 图片1 ----` 分隔拼接 → 复用 `_parse_or_400()` 进入 LLM 结构化
- OCR 识别失败（无任何文本）：返回 400「未能从图片中识别出文本」

### 4.3 代码组织

- 新增 `backend/app/ocr_engine.py`：`RapidOCR` 懒加载单例 + `ocr_images(files) -> str`（逐张识别、拼接、图片间分隔标记）+ 公共常量
- 新增 `backend/app/routes/ocr.py`：`/api/ocr/extract` 端点
- `backend/app/routes/resume_import.py`：新增 `import_image` 端点，复用 `ocr_images` 与 `_parse_or_400()`；`ALLOWED_IMAGE_TYPES` 等常量改为从 `ocr_engine.py` 引入
- `main.py`：挂载 ocr 路由

## 5. 前端设计

### 5.1 JD 识别入口（`TailoredResumeForm.tsx`，场景 A）

- JD 输入框 label 旁新增「图片识别」小按钮
- 点击弹出小弹窗（`JDOcrModal` 或复用简单弹窗）：
  - 点击选择图片（`multiple`）+ **Ctrl+V 剪贴板粘贴**
  - 图片缩略图列表，每张可删除
  - 识别完成 → 文本**追加**到 JD 输入框末尾（已有内容保留，以空行分隔），弹窗关闭，用户可继续编辑
- 识别中按钮显示 loading；失败展示错误信息

### 5.2 主履历导入弹窗（`ResumeImportModal.tsx`，场景 B）

- Tab 从两个扩展为三个：**上传 PDF** / **图片截图** / **粘贴文本**
- 图片截图 Tab：
  - 点击选择图片（`accept="image/png,image/jpeg,image/webp"`，`multiple`）
  - **支持 Ctrl+V 剪贴板粘贴**（监听弹窗内 `onPaste`，读取 `clipboardData.files`）
  - 图片缩略图列表（网格），每张可删除
  - 解析按钮 → 调 `api.masterResume.importImage(files)`
- 解析成功进入可编辑预览（复用 `MasterResumeForm`），保存 change_log 默认「从截图导入」

### 5.3 `lib/api.ts`

- 新增 `api.ocr.extract(files)`：`POST /api/ocr/extract`，返回 `{ text }`
- 新增 `importImage(files: File[])`：FormData 追加多张 `files`

## 6. 影响范围

| 文件 | 变更 |
| --- | --- |
| `backend/requirements.txt` | + `rapidocr`、`onnxruntime` |
| `backend/app/ocr_engine.py` | 新增：OCR 懒加载单例 + 多图识别拼接 + 公共常量 |
| `backend/app/routes/ocr.py` | 新增：`/api/ocr/extract` 纯文本端点 |
| `backend/app/routes/resume_import.py` | 新增 `import-image` 端点；常量改从 `ocr_engine.py` 引入 |
| `backend/app/main.py` | 挂载 ocr 路由 |
| `frontend/lib/api.ts` | 新增 `api.ocr.extract`、`importImage` |
| `frontend/components/TailoredResumeForm.tsx` | JD 输入框旁「图片识别」按钮 + 弹窗 |
| `frontend/components/ResumeImportModal.tsx` | 新增「图片截图」Tab（粘贴/多选/缩略图） |

## 7. 明确不做（本期）

- 图片区域裁剪（依赖前端裁剪库，本期用整图识别）
- 表格结构还原（岗位信息以文本流为主，结构化交给 LLM）
- 截图去重（连续截图重复行由 LLM 自然合并）
- JD 识别结果自动清理（如去除行号/广告），仅原样拼接文本，由用户自行编辑

## 8. 风险与兜底

| 风险 | 兜底 |
| --- | --- |
| 首次运行模型下载失败/网络受限 | 返回明确错误；支持设置本地模型目录（env 变量，二期） |
| 复杂背景/反色截图识别率下降 | 规范机器字体场景识别率高；预览确认环节人工修正 |
| 多图拼接顺序错乱 | 按上传顺序拼接 + 图片名分隔标记辅助 LLM |
| 超大图片拖慢接口 | 单张 10MB、最多 10 张上限 |
