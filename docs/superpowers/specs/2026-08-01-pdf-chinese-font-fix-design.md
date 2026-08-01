# PDF 导出中文崩溃修复

> 状态：已确认根因，待实现
> 现象：`pdf(Doc).toBlob()` 报 `Cannot read properties of null (reading 'write')`，堆栈在 `pdfkit.browser.js` 的 `PDFDocument.addContent`/`save`

## 1. 根因

- 导出文档全部使用 `fontFamily: "Helvetica"`（PDF 标准 14 字体，**不含中文字形**）
- @react-pdf 浏览器构建（pdfkit.browser.js）在写入字体时，对没有 glyph 的中文码点拿到 null 字体对象 → `addContent` 写入 null → crash
- Node 端不崩溃（处理路径不同），因此仅浏览器端出现
- 触发背景：内容为中文的定制简历（本次由 OCR 识别 JD 生成，中文必现）

## 2. 修复方案

### 2.1 注册中文字体（核心）

1. 下载开源中文字体到 `frontend/public/fonts/`：
   - `NotoSansCJKsc-Regular.otf`（思源黑体，正则）
   - `NotoSansCJKsc-Bold.otf`（粗体）
2. `PDFExporter.tsx` 导出时：
   ```ts
   Font.register({
     family: "NotoSansSC",
     fonts: [
       { src: "/fonts/NotoSansCJKsc-Regular.otf", fontWeight: "normal" },
       { src: "/fonts/NotoSansCJKsc-Bold.otf", fontWeight: "bold" },
     ],
   })
   ```
   根容器 `fontFamily: "NotoSansSC"`，原有 `fontWeight: "bold"` 内联样式继续生效（按字重匹配注册表）

### 2.2 顺带修正可疑样式简写（@react-pdf 不支持的写法）

| 现有写法 | 修正 |
| --- | --- |
| `borderBottom: "2 solid #ddd"` | `borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: "#ddd"` |
| `padding: "2 8"` / `padding: "1 6"` | `padding: [2, 8]` / `padding: [1, 6]`（数组简写） |
| `margin: "4 0 0 0"` | `margin: [4, 0, 0, 0]` |

## 3. 影响范围

| 文件 | 变更 |
| --- | --- |
| `frontend/public/fonts/` | 新增 2 个开源中文字体文件 |
| `frontend/components/PDFExporter.tsx` | 注册字体 + 文档 fontFamily 切换 + 样式简写修正 |

## 4. 明确不做

- 不切换后端渲染 PDF（Node 端，改动面大）
- 不处理字体子集化（全量思源黑体 ~16MB，按需加载可接受）

## 5. 验证

- `npm run build`
- 浏览器端导出含中文的定制简历 PDF，确认无报错且中文正常显示
