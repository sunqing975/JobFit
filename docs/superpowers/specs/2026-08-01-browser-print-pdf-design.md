# 浏览器打印导出 PDF 方案设计

日期：2026-08-01
状态：已确认

## 背景 / 问题

`@react-pdf/renderer` 存在库级布局 bug（官方 issue #2673/#2922，已挂 2 年未修）：Text 作为 flex 容器子元素时宽度计算错误，文本不换行、溢出到页面边缘被裁切。预览（HTML/CSS，浏览器渲染）正常，但 PDF 反复出现溢出，无法根治。

## 目标

- PDF 导出结果与页面预览 100% 一致（同一套 HTML/CSS 渲染）
- 彻底移除 react-pdf 依赖，消除布局 bug
- 桌面打包版（浏览器访问 localhost）同样可用

## 流程

1. 用户点击「导出 PDF」→ 调用 `window.print()`
2. 浏览器弹出系统打印对话框，用户选择打印机 / 「另存为 PDF」→ 完成导出
3. `@media print` 样式控制：仅打印简历预览区域，隐藏导航、按钮、表单、报告等

## 设计

### 前端

- `PDFExporter.tsx`：删除 react-pdf 动态 import 与布局代码，按钮改为 `window.print()`
- `job-resume/page.tsx`：预览容器外包 `.print-area`；表单、报告、按钮等非打印元素加 `.no-print`
- `globals.css` 新增打印样式：

```css
@media print {
  @page { size: A4; margin: 0; }
  body { background: #fff; }
  .no-print { display: none !important; }
  .print-area { display: block !important; }
  .print-area .a4-paper {
    width: 100%;
    min-height: 0;
    padding: 36px 32px;
    box-shadow: none;
    border: none;
  }
  .section-divider { margin: 14px 0; }
}
```

- 页边距由 `@page margin: 0` + `.a4-paper` padding 控制（A4 = 794px 宽，与预览一致）
- 打印背景色（如 tag 的浅色背景）通过 `print-color-adjust: exact` 保留

### 依赖清理

- `npm uninstall @react-pdf/renderer`
- 删除 `public/fonts/` 下两个 OTF 字体（仅 react-pdf 引用；网页字体走系统字体渲染）

### 布局要求

- 打印元素必须是普通文档流（不用 position:absolute 包裹），保证多页内容正确分页

## 影响范围

- `frontend/components/PDFExporter.tsx`、`frontend/app/job-resume/page.tsx`、`frontend/app/globals.css`
- `frontend/package.json` / `package-lock.json`
- `frontend/public/fonts/`（删除字体文件）
- 文档：`docs/superpowers/specs/2026-08-01-pdf-import-design.md` 等提及 PDF 导出的文档无需改动；本设计文档归档

## 风险

- 打印对话框为系统 UI，无法像 react-pdf 那样自动命名并静默下载文件（需用户手动「另存为 PDF」，文件名自定）
- 浏览器不同，打印边距/字体渲染有细微差异（Chrome 为默认目标，均为 Chromium 内核可接受）
- 若用户打印时勾选「背景图形」，tag 背景色会保留；未勾选则背景透明，文字仍可读

## 明确不做

- 不保留 react-pdf 双方案切换
- 不做静默下载（无文件 API 可用）
- 不做服务端/Playwright 无头打印（桌面打包版不适用）
