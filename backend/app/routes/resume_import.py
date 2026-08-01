import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session

from ..database import get_db
from ..llm_engine import parse_resume_text
from ..ocr_engine import (
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_SIZE,
    MAX_IMAGES,
    MIN_IMAGE_TEXT_LENGTH,
    _ocr_bytes,
    ocr_images,
)
from ..schemas import ParsedResume, ResumeImportTextRequest

router = APIRouter(prefix="/api/base-resume", tags=["Base Resume Import"])

MAX_PDF_SIZE = 10 * 1024 * 1024
MAX_TEXT_LENGTH = 100_000
MIN_TEXT_LENGTH = 100
MAX_PDF_PAGES = 20
PDF_RENDER_DPI = 150


def _extract_pdf_text(content: bytes) -> str:
    import pdfplumber

    pages = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return "\n\n".join(pages)


def _pdf_to_images(content: bytes) -> list[bytes]:
    """将 PDF 每页渲染为 PNG 字节（扫描版 OCR 用）。"""
    import fitz

    doc = fitz.open(stream=content, filetype="pdf")
    if doc.page_count > MAX_PDF_PAGES:
        raise ValueError(f"PDF 页数不能超过 {MAX_PDF_PAGES} 页，请拆分后导入")

    images = []
    for page in doc:
        pixmap = page.get_pixmap(dpi=PDF_RENDER_DPI)
        images.append(pixmap.tobytes("png"))
    doc.close()
    return images


def _ocr_pdf(content: bytes) -> str:
    """扫描版 PDF：渲染每页后 OCR，页间插入分隔标记。"""
    parts = []
    for idx, image in enumerate(_pdf_to_images(content), start=1):
        if len(image) > MAX_IMAGE_SIZE:
            raise ValueError(f"PDF 第 {idx} 页渲染后图片超过 10MB，请降低扫描清晰度后重试")
        text = _ocr_bytes(image, f"第{idx}页")
        if text.strip():
            parts.append(f"---- 第{idx}页 ----\n{text}")
    return "\n\n".join(parts)


def _parse_or_400(text: str, db: Session) -> ParsedResume:
    try:
        return ParsedResume.model_validate(parse_resume_text(text, db))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import-pdf", response_model=ParsedResume)
def import_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not (file.content_type == "application/pdf" or file.filename.lower().endswith(".pdf")):
        raise HTTPException(status_code=400, detail="仅支持 PDF 文件")

    content = file.file.read()
    if len(content) > MAX_PDF_SIZE:
        raise HTTPException(status_code=413, detail="PDF 文件大小不能超过 10MB")

    try:
        text = _extract_pdf_text(content)
    except Exception:
        raise HTTPException(status_code=400, detail="无法解析该 PDF 文件，请确认文件未损坏")

    if len(text.strip()) < MIN_TEXT_LENGTH:
        try:
            text = _ocr_pdf(content)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception:
            raise HTTPException(status_code=400, detail="扫描版 PDF 识别失败，请确认扫描清晰、文字为规范字体")

    if len(text.strip()) < MIN_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail="未能从该 PDF 中提取到文本，请确认文件为文本型 PDF 或扫描清晰",
        )

    return _parse_or_400(text, db)


@router.post("/import-text", response_model=ParsedResume)
def import_text(data: ResumeImportTextRequest, db: Session = Depends(get_db)):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="请输入需要导入的简历文本")
    if len(data.text) > MAX_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail="文本内容过长，请控制在 100KB 以内")

    return _parse_or_400(data.text, db)


@router.post("/import-image", response_model=ParsedResume)
def import_image(files: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    if not files:
        raise HTTPException(status_code=400, detail="请至少选择一张图片")
    if len(files) > MAX_IMAGES:
        raise HTTPException(status_code=400, detail=f"一次最多上传 {MAX_IMAGES} 张图片")

    for f in files:
        if f.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail=f"不支持的图片格式: {f.filename}")

    try:
        text = ocr_images(files)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=400, detail="OCR 识别失败，请确认截图清晰可读")

    if len(text.strip()) < MIN_IMAGE_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail="未能从图片中识别出文本，请确认截图清晰、文字为规范字体")

    return _parse_or_400(text, db)
