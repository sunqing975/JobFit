from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from ..ocr_engine import ALLOWED_IMAGE_TYPES, MAX_IMAGES, MIN_IMAGE_TEXT_LENGTH, ocr_images

router = APIRouter(prefix="/api/ocr", tags=["OCR"])


class OCRResult(BaseModel):
    text: str


@router.post("/extract", response_model=OCRResult)
def extract_text(files: list[UploadFile] = File(...)):
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

    return OCRResult(text=text)
