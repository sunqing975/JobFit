from functools import lru_cache

MAX_IMAGES = 10
MAX_IMAGE_SIZE = 10 * 1024 * 1024
MIN_IMAGE_TEXT_LENGTH = 10
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}


@lru_cache(maxsize=1)
def _get_engine():
    from rapidocr import RapidOCR

    return RapidOCR()


def _ocr_bytes(content: bytes, label: str) -> str:
    """对单张图片字节进行 OCR，返回识别文本（含大小校验）。"""
    if len(content) > MAX_IMAGE_SIZE:
        raise ValueError(f"图片「{label}」大小不能超过 10MB")

    engine = _get_engine()
    out = engine(content)
    return "\n".join(out.txts or [])


def ocr_images(files: list) -> str:
    """对多张截图逐张 OCR，按上传顺序拼接（图片间插入分隔标记）。"""
    parts = []
    for idx, file in enumerate(files, start=1):
        label = file.filename or f"图片{idx}"
        text = _ocr_bytes(file.file.read(), label)
        if text.strip():
            parts.append(f"---- {label} ----\n{text}")
    return "\n\n".join(parts)
