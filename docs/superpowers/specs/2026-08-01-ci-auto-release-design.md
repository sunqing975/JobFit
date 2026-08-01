# GitHub Actions 自动打包发布（tag 触发 + 手动触发）

> 状态：方案已讨论确认（push v* tag 自动出 Release + workflow_dispatch 手动触发），待实现

## 1. 目标

1. 推送 `v*` 标签时，CI 自动执行桌面打包（复用根目录 `build.ps1`）并发布 Release（含 JobFit.exe）
2. 支持 Actions 页面手动触发（不发 Release，仅产出打包产物 artifact 供调试）
3. 发版流程收敛为「打 tag」一步

## 2. 设计（`.github/workflows/release.yml`）

### 2.1 触发

```yaml
on:
  push:
    tags: ["v*"]
  workflow_dispatch:
```

### 2.2 Job（windows-latest）

| 步骤 | 说明 |
| --- | --- |
| checkout | 拉取代码（含 tag） |
| setup-python 3.13 | 匹配本地 venv 版本 |
| venv + pip install | 创建 `backend/venv`，`pip install -r backend/requirements.txt`；`actions/cache` 缓存 pip（key 含 requirements hash） |
| setup-node 20 + npm ci | 前端依赖，缓存 `~/.npm` |
| 执行 build.ps1 | 复用现有脚本（前端 build → 拷 out/ → PyInstaller），产物 `dist/JobFit.exe` |
| upload-artifact | 无条件上传 exe（手动触发时用于下载调试） |
| 发版（仅 push tag） | `gh release create <tag> --title ... --notes ...` + `gh release upload <tag> JobFit.exe`（`GITHUB_TOKEN`） |

### 2.3 发版细节

- tag 名取自 `github.ref_name`（如 `v1.2.0`），Release 标题 `JobFit <tag> - 智能简历定制平台`
- Notes 用固定模板（核心功能简介 + 使用说明），不自动生成 changelog（保持简单）
- Release 存在则复用更新（幂等：`gh release view` 判断）

## 3. 注意事项

- CI 环境无 `start.ps1` 参与，直接调根目录 build.ps1；脚本内 `$PSScriptRoot` 相对路径在 runner 上有效
- PyInstaller 打包约 2-3 分钟，整体 job 预计 8-12 分钟
- exe ~183MB 上传 GitHub Release（单文件上限 2GB，无问题）
- 本地开发流程不变（start.ps1 / build.ps1 照旧）

## 4. 影响范围

| 文件 | 变更 |
| --- | --- |
| `.github/workflows/release.yml` | 新建 |

## 5. 风险

- 依赖安装时长（rapidocr/onnxruntime 大）→ pip/node 缓存缓解
- CI 与本地 PyInstaller 环境差异（Python 3.13 已对齐）→ 打包后建议抽样运行一次 exe 冒烟
- GITHUB_TOKEN 默认权限需 `contents: write`（创建 Release）

## 6. 明确不做

- 不做自动生成 changelog（release notes 固定模板）
- 不做多平台打包（仅 Windows）
- 不做构建产物签名
- 不做 PR 触发预览构建
