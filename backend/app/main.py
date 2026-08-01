from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routes import master_resume, tailored_resume, llm_config, optimize, resume_import, ocr


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

app.include_router(master_resume.router)
app.include_router(tailored_resume.router)
app.include_router(llm_config.router)
app.include_router(optimize.router)
app.include_router(resume_import.router)
app.include_router(ocr.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "JobFit API is running"}
