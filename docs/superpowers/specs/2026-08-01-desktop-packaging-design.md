# 桌面单文件应用（Windows）打包设计

> 状态：已实现（2026-08-01，commit 待提交）。实现与文档一致，打包版 exe 已实测通过。

## 1. 目标

将现有 Web 版 JobFit 打包为 Windows 单文件 exe：双击启动，自动拉起浏览器访问应用，无需源码编译、无需安装依赖。

## 2. 架构

```
单一 exe（PyInstaller --onefile）
├── FastAPI 应用（现有全部路由，零改动）
│   ├── API 路由（base-resume / job-resume / ocr / llm-config / import）
│   └── StaticFiles 托管前端静态产物（next build 输出）
├── RapidOCR 模型 + onnxruntime（打包资源）
├── pdfplumber / pymupdf / langchain 等依赖
└── 启动逻辑：
    1. 探测空闲端口（默认从 8000 起，被占用则 +1）
    2. 启动 uvicorn（app 实例，不 reload）
    3. webbrowser.open(http://127.0.0.1:{port})
    4. 控制台窗口显示日志（关闭控制台 = 退出）
```

**关键：前端与 API 同源** —— FastAPI 一个端口同时服务页面和 API，天然无 CORS、无需配置端口。

## 3. 代码改动清单

### 3.1 前端（`frontend`）

- `next.config.ts`：加 `output: "export"`（App Router 静态导出）
- `lib/api.ts`：`API_URL` 改为运行时判断——
  - 开发模式（访问 3000 端口）：`http://localhost:8000`（保持现有开发链路）
  - 打包模式（同源访问）：`""` 相对路径（适配动态端口）
  - 判断依据：`window.location.port === "3000"`，不依赖构建环境变量

### 3.2 后端

- `database.py`：`DATABASE_URL` 动态化——
  - 优先环境变量 `DATABASE_URL`
  - 默认 `%APPDATA%/JobFit/jobfit.db`（`os.path.expanduser`，onefile 解压目录不可写/重启丢失）
  - **现有数据迁移**：用户需手动把 `backend/jobfit.db` 复制到 `%APPDATA%/JobFit/`（README 说明）
- `main.py`：挂载 `StaticFiles`（前端 dist 目录，`html=True`）

### 3.3 打包脚本（`build.ps1` 位于项目根目录）

打包涉及前后端两个子项目，脚本与产物统一放在**项目根目录**（与 backend 平级）：

```
JobFit/
├── build.ps1            # 一键打包（前端 build → 拷 app/static → PyInstaller）
├── dist/                # 打包产物（JobFit.exe），与 backend 平级
└── backend/
    ├── jobfit.spec      # PyInstaller onefile 配置（相对 backend 工作目录运行）
    └── app/static/      # 前端静态产物（构建中间产物，gitignore）
```

- `jobfit.spec`：PyInstaller onefile 配置
  - `datas`：`rapidocr/models/*.onnx`、前端 `dist/`（拷入 `app/static`）
  - `hiddenimports`：uvicorn 全家、sqlmodel、rapidocr、pdfplumber、fitz 等
  - 图标（可选）
- `build.ps1`（根目录）：`npm run build`（前端）→ 拷 `frontend/out` → 在 `backend/` 下执行 `pyinstaller --distpath ..\dist jobfit.spec`
- 体积预估 300-500MB（onnxruntime ~60MB + RapidOCR 模型 ~20MB + Python 运行时），onefile 首启需解压（数秒-十几秒）

## 4. 影响范围

| 文件 | 变更 |
| --- | --- |
| `frontend/next.config.ts` | `output: "export"` |
| `frontend/lib/api.ts` | API_URL 运行时判断 |
| `backend/app/database.py` | 数据库路径动态化 |
| `backend/app/main.py` | 托管前端静态文件 |
| `backend/jobfit.spec`（新） | PyInstaller 配置 |
| `build.ps1`（新，根目录） | 一键打包脚本 |
| `README.md` | 打包使用说明 + 数据迁移说明 |
| `AGENTS.md` | 项目结构/启动方式补充 |

## 5. 风险

- PyInstaller 收集 FastAPI/LangChain/RapidOCR 全家桶依赖项多，hidden imports 需多轮试错
- onefile 首启慢、防病毒软件可能误报（常见问题，说明文档提示）
- 控制台窗口随 exe 保留（日志可排查问题），后续再做无窗口模式
- 打包必须在 Windows 机器执行（PyInstaller 不跨平台），Mac 包需 Mac/CI（本期不做）

## 6. 明确不做

- Mac / Linux / 安卓打包（本期仅 Windows）
- 自动更新、系统托盘、开机自启
- 无控制台窗口模式（本期保留日志窗口）
- 自定义应用图标（可用默认 PyInstaller 图标）
- 内嵌浏览器（保持系统默认浏览器）
