from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import init_db
from .routes import base_resume, job_resume, llm_config, optimize, resume_import, ocr


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="JobFit API",
    description="智能简历定制平台 - 基于大模型的简历匹配重构工具",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(base_resume.router)
app.include_router(job_resume.router)
app.include_router(llm_config.router)
app.include_router(optimize.router)
app.include_router(resume_import.router)
app.include_router(ocr.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "JobFit API is running"}


_packaged_static = Path(__file__).parent / "static"
if _packaged_static.is_dir():
    _static_dir = _packaged_static
else:
    _static_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "out"

if _static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")
