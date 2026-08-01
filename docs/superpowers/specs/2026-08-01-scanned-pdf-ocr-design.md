# PDF 导入支持扫描版（自动 OCR 分流）

> 状态：方案已讨论确认（自动分流 + 20 页上限），待实现

## 1. 目标

`POST /api/base-resume/import-pdf` 支持扫描版 PDF：文本型走现有快速通道，扫描版自动降级为「PDF 渲染 → RapidOCR → LLM 结构化」，用户无感知。

## 2. 流程设计

```
import-pdf
  ├─ pdfplumber 提取文本
  ├─ 文本 ≥ MIN_TEXT_LENGTH(100) → 直接 LLM 结构化        （快速通道，不变）
  └─ 文本 < 100 → 自动降级：
       ├─ PyMuPDF 渲染每页为 PNG（DPI=150）
       ├─ RapidOCR 逐页识别 → 合并文本（页间分隔标记）
       ├─ 文本仍 < 100 → 400「未能识别出文本」
       └─ 文本足够 → LLM 结构化
```

## 3. 技术设计

### 3.1 新增依赖

- `pymupdf`（纯 Python wheel，自带渲染引擎，无需 poppler）

### 3.2 `ocr_engine.py` 重构

- 抽出 `_ocr_bytes(content: bytes, label: str) -> str`：单图字节 OCR，含 10MB 大小校验
- `ocr_images(files)` 改为循环调用 `_ocr_bytes(file.file.read(), ...)`（对外行为不变）

### 3.3 `routes/resume_import.py`

- 新增常量 `MAX_PDF_PAGES = 20`
- 新增 `_pdf_to_images(content: bytes) -> list[bytes]`：
  - `fitz.open` → 页数 > 20 → `ValueError("页面数超过 20 页，请拆分后导入")`
  - 每页 `page.get_pixmap(dpi=150)` → `tobytes("png")`
  - 单张 PNG > 10MB → `ValueError`（A4 150dpi 正常 < 2MB，几乎不触发）
- `import_pdf`：文本不足时调用 `_pdf_to_images` + `_ocr_bytes` 循环，合并文本后 `_parse_or_400`
- 错误文案更新：移除「扫描版 PDF 暂不支持（OCR 二期）」

### 3.4 前端（`ResumeImportModal.tsx`）

- PDF Tab 提示文案更新为「支持文本型与扫描版 PDF」

## 4. 影响范围

| 文件 | 变更 |
| --- | --- |
| `backend/requirements.txt` | + `pymupdf` |
| `backend/app/ocr_engine.py` | 抽 `_ocr_bytes` |
| `backend/app/routes/resume_import.py` | PDF 渲染 + OCR 降级 + 文案 |
| `frontend/components/ResumeImportModal.tsx` | 提示文案 |
| `AGENTS.md` | 导入说明同步 |

## 5. 风险与限制

- OCR 多页为 CPU 推理，20 页最坏情况耗时可能 1-2 分钟（MVP 可接受，前端已有「解析中」状态）
- 混合型 PDF（部分文本页 + 部分扫描页）：以整本 pdfplumber 文本量统一走一个通道，不做逐页判断

## 6. 明确不做

- 不做前端进度条
- 不做逐页文本/图片混合判断
- 不做导入后的图片预览
