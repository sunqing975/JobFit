from functools import lru_cache

MAX_IMAGES = 10
MAX_IMAGE_SIZE = 10 * 1024 * 1024
MIN_IMAGE_TEXT_LENGTH = 10
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}


@lru_cache(maxsize=1)
def _get_engine():
    from rapidocr import RapidOCR

    return RapidOCR()


def ocr_images(files: list) -> str:
    """对多张截图逐张 OCR，按上传顺序拼接（图片间插入分隔标记）。"""
    engine = _get_engine()
    parts = []
    for idx, file in enumerate(files, start=1):
        content = file.file.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise ValueError(f"图片「{file.filename or idx}」大小不能超过 10MB")

        out = engine(content)
        text = "\n".join(out.txts or [])
        if text.strip():
            parts.append(f"---- 图片{idx} ----\n{text}")
    return "\n\n".join(parts)
