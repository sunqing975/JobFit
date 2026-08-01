#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT=8000
FRONTEND_PORT=3000
INSTALL_DEPS=false
REBUILD=false
MODE="both"

# ---------- 虚拟环境检测与激活 ----------
VENV_DIR=""
setup_venv() {
    for candidate in "$BACKEND_DIR/venv" "$BACKEND_DIR/.venv" "$ROOT_DIR/venv" "$ROOT_DIR/.venv"; do
        if [ -f "$candidate/bin/activate" ]; then
            VENV_DIR="$candidate"
            break
        fi
    done

    if [ -z "$VENV_DIR" ]; then
        echo "==> 未检测到虚拟环境，正在创建 $BACKEND_DIR/venv ..."
        python3 -m venv "$BACKEND_DIR/venv"
        VENV_DIR="$BACKEND_DIR/venv"
    fi

    echo "==> 使用虚拟环境: $VENV_DIR"

    if [ "$INSTALL_DEPS" = true ] || [ ! -f "$VENV_DIR/bin/uvicorn" ]; then
        echo "==> 安装后端依赖..."
        "$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt" -q
    fi
}

usage() {
    cat <<EOF
用法: ./start.sh [选项]

选项:
  -b, --backend-only    只启动后端
  -f, --frontend-only   只启动前端
  -p, --port PORT       后端端口 (默认: 8000)
  -P, --frontend-port PORT  前端端口 (默认: 3000)
  -i, --install         启动前安装依赖（后端自动进 venv 安装）
  -r, --rebuild         启动前重新构建前端
  -h, --help            显示帮助信息

示例:
  ./start.sh                             启动前后端（自动检测/创建 venv）
  ./start.sh -i                          安装依赖后启动
  ./start.sh -b -p 9000                  后端端口 9000
  ./start.sh -f -P 8080                  只启动前端，端口 8080
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -b|--backend-only) MODE="backend" ;;
        -f|--frontend-only) MODE="frontend" ;;
        -p|--port) BACKEND_PORT="$2"; shift ;;
        -P|--frontend-port) FRONTEND_PORT="$2"; shift ;;
        -i|--install) INSTALL_DEPS=true ;;
        -r|--rebuild) REBUILD=true ;;
        -h|--help) usage ;;
        *) echo "未知选项: $1"; usage ;;
    esac
    shift
done

cleanup() {
    echo ""
    echo "正在关闭服务..."
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null && echo "后端已停止"
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && echo "前端已停止"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ---------- 后端需要 venv ----------
if [ "$MODE" != "frontend" ]; then
    setup_venv
fi

if [ "$MODE" != "backend" ]; then
    if [ "$INSTALL_DEPS" = true ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo "==> 安装前端依赖..."
        (cd "$FRONTEND_DIR" && npm install --silent)
    fi
    if [ "$REBUILD" = true ]; then
        echo "==> 构建前端..."
        (cd "$FRONTEND_DIR" && npx next build)
    fi
fi

# 释放已占用的端口
kill_port() {
    local port=$1
    local pids
    pids=$(lsof -ti "tcp:$port" 2>/dev/null) || true
    if [ -n "$pids" ]; then
        echo "$pids" | while read -r pid; do
            [ -z "$pid" ] && continue
            echo "  端口 $port 已被占用，正在释放 (PID: $pid)..."
            kill -9 "$pid" 2>/dev/null || true
        done
        sleep 1
    fi
}

if [ "$MODE" != "frontend" ]; then
    kill_port "$BACKEND_PORT"
    echo "==> 启动后端 (端口 $BACKEND_PORT)..."
    (cd "$BACKEND_DIR" && "$VENV_DIR/bin/uvicorn" app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload) &
    BACKEND_PID=$!
    sleep 2
fi

if [ "$MODE" != "backend" ]; then
    kill_port "$FRONTEND_PORT"
    echo "==> 启动前端 (端口 $FRONTEND_PORT)..."
    (cd "$FRONTEND_DIR" && npx next dev --port "$FRONTEND_PORT") &
    FRONTEND_PID=$!
fi

echo ""
echo "==================================="
if [ "$MODE" != "frontend" ]; then
    echo "  后端: http://localhost:$BACKEND_PORT"
    echo "  后端文档: http://localhost:$BACKEND_PORT/docs"
fi
if [ "$MODE" != "backend" ]; then
    echo "  前端: http://localhost:$FRONTEND_PORT"
fi
echo "  按 Ctrl+C 停止所有服务"
echo "==================================="

wait
