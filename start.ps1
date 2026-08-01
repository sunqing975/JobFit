param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [int]$Port = 8000,
    [int]$FrontendPort = 3000,
    [switch]$Install,
    [switch]$Rebuild,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$ROOT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR = Join-Path $ROOT_DIR "backend"
$FRONTEND_DIR = Join-Path $ROOT_DIR "frontend"
$MODE = "both"

function Show-Usage {
    $usage = @"
用法: .\start.ps1 [选项]

选项:
  -BackendOnly         只启动后端
  -FrontendOnly        只启动前端
  -Port PORT           后端端口 (默认: 8000)
  -FrontendPort PORT   前端端口 (默认: 3000)
  -Install             启动前安装依赖（后端自动进 venv 安装）
  -Rebuild             启动前重新构建前端
  -Help                显示帮助信息

示例:
  .\start.ps1                            启动前后端（自动检测/创建 venv）
  .\start.ps1 -Install                   安装依赖后启动
  .\start.ps1 -BackendOnly -Port 9000    后端端口 9000
  .\start.ps1 -FrontendOnly -FrontendPort 8080  只启动前端，端口 8080
"@
    Write-Host $usage
    exit 0
}

if ($Help) { Show-Usage }
if ($BackendOnly) { $MODE = "backend" }
if ($FrontendOnly) { $MODE = "frontend" }
$INSTALL_DEPS = [bool]$Install
$REBUILD = [bool]$Rebuild

# ---------- 虚拟环境检测与激活 ----------
$VENV_DIR = ""
function Setup-Venv {
    foreach ($candidate in @(
        (Join-Path $BACKEND_DIR "venv"),
        (Join-Path $BACKEND_DIR ".venv"),
        (Join-Path $ROOT_DIR "venv"),
        (Join-Path $ROOT_DIR ".venv")
    )) {
        if (Test-Path (Join-Path $candidate "Scripts\activate.ps1")) {
            $script:VENV_DIR = $candidate
            break
        }
    }

    if (-not $script:VENV_DIR) {
        Write-Host "==> 未检测到虚拟环境，正在创建 $BACKEND_DIR\venv ..."
        python -m venv (Join-Path $BACKEND_DIR "venv")
        $script:VENV_DIR = Join-Path $BACKEND_DIR "venv"
    }

    Write-Host "==> 使用虚拟环境: $script:VENV_DIR"

    if ($INSTALL_DEPS -or -not (Test-Path (Join-Path $script:VENV_DIR "Scripts\uvicorn.exe"))) {
        Write-Host "==> 安装后端依赖..."
        & (Join-Path $script:VENV_DIR "Scripts\pip.exe") install -r (Join-Path $BACKEND_DIR "requirements.txt") -q
    }
}

# 释放已占用的端口
function Kill-Port([int]$Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        foreach ($c in $conn) {
            Write-Host "  端口 $Port 已被占用，正在释放 (PID: $($c.OwningProcess))..."
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }
}

# ---------- 后端需要 venv ----------
if ($MODE -ne "frontend") {
    Setup-Venv
}

if ($MODE -ne "backend") {
    if ($INSTALL_DEPS -or -not (Test-Path (Join-Path $FRONTEND_DIR "node_modules"))) {
        Write-Host "==> 安装前端依赖..."
        Push-Location $FRONTEND_DIR
        try { npm install --silent } finally { Pop-Location }
    }
    if ($REBUILD) {
        Write-Host "==> 构建前端..."
        Push-Location $FRONTEND_DIR
        try { npx next build } finally { Pop-Location }
    }
}

$BACKEND_PID = $null
$FRONTEND_PID = $null

function Stop-Services {
    Write-Host ""
    Write-Host "正在关闭服务..."
    if ($BACKEND_PID) {
        Stop-Process -Id $BACKEND_PID -Force -ErrorAction SilentlyContinue
        Write-Host "后端已停止"
    }
    if ($FRONTEND_PID) {
        Stop-Process -Id $FRONTEND_PID -Force -ErrorAction SilentlyContinue
        Write-Host "前端已停止"
    }
    exit 0
}

if ($MODE -ne "frontend") {
    Kill-Port $Port
    Write-Host "==> 启动后端 (端口 $Port)..."
    $BACKEND_PID = Start-Process -FilePath (Join-Path $script:VENV_DIR "Scripts\uvicorn.exe") `
        -ArgumentList "app.main:app", "--host", "0.0.0.0", "--port", "$Port", "--reload" `
        -WorkingDirectory $BACKEND_DIR -PassThru -NoNewWindow | Select-Object -ExpandProperty Id
    Start-Sleep -Seconds 2
}

if ($MODE -ne "backend") {
    Kill-Port $FrontendPort
    Write-Host "==> 启动前端 (端口 $FrontendPort)..."
    $FRONTEND_PID = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "npx next dev --port $FrontendPort" `
        -WorkingDirectory $FRONTEND_DIR -PassThru -NoNewWindow | Select-Object -ExpandProperty Id
}

Write-Host ""
Write-Host "==================================="
if ($MODE -ne "frontend") {
    Write-Host "  后端: http://localhost:$Port"
    Write-Host "  后端文档: http://localhost:$Port/docs"
}
if ($MODE -ne "backend") {
    Write-Host "  前端: http://localhost:$FrontendPort"
}
Write-Host "  按 Ctrl+C 停止所有服务"
Write-Host "==================================="

try {
    while ($true) { Start-Sleep -Seconds 1 }
}
finally {
    Stop-Services
}
