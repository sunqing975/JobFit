$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Frontend = Join-Path $Root "frontend"
$Backend = Join-Path $Root "backend"
$Dist = Join-Path $Root "dist"
$Static = Join-Path $Backend "app\static"
$PyInstaller = Join-Path $Backend "venv\Scripts\pyinstaller.exe"

Write-Host "[1/3] 构建前端静态产物..."
Push-Location $Frontend
npm run build
if ($LASTEXITCODE -ne 0) { throw "前端构建失败" }
Pop-Location

Write-Host "[2/3] 拷贝前端产物到 app/static..."
if (Test-Path $Static) { Remove-Item -Recurse -Force $Static }
New-Item -ItemType Directory -Path $Static -Force | Out-Null
Copy-Item -Path (Join-Path $Frontend "out\*") -Destination $Static -Recurse

Write-Host "[3/3] PyInstaller 打包..."
Push-Location $Backend
& $PyInstaller --clean --noconfirm --distpath $Dist jobfit.spec
if ($LASTEXITCODE -ne 0) { throw "PyInstaller 打包失败" }
Pop-Location

Write-Host "完成: $Dist\JobFit.exe"
