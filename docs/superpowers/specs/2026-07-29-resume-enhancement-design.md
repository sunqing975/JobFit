# JobFit 主履历增强 & UI 重设计

## 1. 目标

1. 主履历字段从基础的 7 项扩展到标准简历的完整字段集
2. 支持头像上传（Base64 内嵌存储）
3. UI 升级为简洁专业风格，提升视觉体验

## 2. 数据模型

### MasterResume JSON 结构

```typescript
interface Resume {
  // 基本信息
  avatar?: string            // base64 data URL
  name: string
  title: string
  email: string
  phone: string
  location?: string          // 所在地
  website?: string           // 个人网站
  linkedin?: string          // LinkedIn URL
  github?: string            // GitHub URL

  // 个人总结
  summary?: string

  // 技能分类
  skillCategories?: {
    category: string         // 如 "前端", "后端", "DevOps"
    skills: string[]         // 技能列表
  }[]

  // 工作经历
  experience: {
    company: string
    location?: string
    role: string
    period: string           // "2020.03 - 2023.06"
    bullets: string[]
    techStack?: string[]     // 技术栈标签
  }[]

  // 项目经历
  projects: {
    name: string
    role: string
    period: string
    description: string
    bullets: string[]
    techStack?: string[]
    url?: string
  }[]

  // 教育背景
  education: {
    school: string
    degree: string            // 学士 / 硕士 / 博士
    major: string
    period: string
    gpa?: string
  }[]

  // 证书认证
  certifications?: {
    name: string
    issuer: string
    date: string
    url?: string
  }[]

  // 语言能力
  languages?: {
    name: string
    proficiency: string      // 母语 / 流利 / 商务 / 基础
  }[]

  // 获奖荣誉
  awards?: {
    name: string
    issuer: string
    date: string
  }[]

  // 出版物
  publications?: {
    title: string
    publisher: string
    date: string
    url?: string
  }[]
}
```

## 3. UI 设计

### 3.1 整体风格
- 简洁专业风，蓝白灰主色调
- `#2563EB` 主蓝色，`#F8FAFC` 背景，`#1E293B` 文字
- 圆角卡片 (rounded-lg shadow-sm)，充分留白
- 卡片带左侧彩色描边装饰

### 3.2 主履历页面布局
```
┌────────────────────────────────────────────────┐
│  主履历管理                                      │
├──────────┬──────────────────────────┬───────────┤
│ 版本历史  │  表单区域                 │  实时预览  │
│ (窄边栏)  │  · 基本信息卡片            │  (A4纸效果)│
│           │  · 个人总结卡片            │           │
│  v3       │  · 技能分类卡片            │           │
│  v2       │  · 工作经历卡片(可添加多条) │           │
│  v1       │  · 项目经历卡片            │           │
│           │  · 教育背景卡片            │           │
│           │  · 证书/语言/获奖/出版物    │           │
│           │  (折叠面板，按需展开)       │           │
└──────────┴──────────────────────────┴───────────┘
```

### 3.3 定制简历页面布局
```
┌─────────────────────────────────────────────────┐
│  生成定制简历                                      │
├─────────────────────┬───────────────────────────┤
│  JD 输入区           │  简历预览 (A4 纸效果)       │
│  · 选择履历版本       │  · 白底阴影，模拟纸张       │
│  · 目标职位          │  · 分页渲染               │
│  · 公司名称          │  · 完整字段展示            │
│  · JD 文本           │  · PDF 导出按钮            │
│  · 生成按钮           │                           │
│                      │                           │
│  历史记录列表          │                           │
└─────────────────────┴───────────────────────────┘
```

### 3.4 表单交互
- 每个区块独立卡片，标题栏带折叠/展开按钮
- 工作经历和项目经历支持动态增删多条
- 技能分类支持增删分类，每个分类内增删技能标签
- 头像上传：点击头像区域 → 文件选择器 → 预览裁剪圆形
- 证书/语言/获奖/出版物在"更多"折叠面板中

### 3.5 预览交互
- 表单右侧实时预览，输入即更新
- 模拟 A4 纸白底阴影效果
- 头像区域圆形显示
- 技能分类展示为多行标签组
- 技术栈以彩色小标签展示在经历条目旁

## 4. 影响范围

| 文件 | 变更 |
|---|---|
| `frontend/components/MasterResumeForm.tsx` | 完全重写，全字段 + 头像上传 + 动态增删 |
| `frontend/components/ResumePreview.tsx` | 完全重写，全字段渲染 + A4 纸效果 |
| `frontend/components/PDFExporter.tsx` | 适配新字段 |
| `frontend/app/master-resume/page.tsx` | 三栏布局改造 |
| `frontend/app/tailored-resume/page.tsx` | 预览区样式升级 |
| `frontend/app/globals.css` | 增强基础样式层 |
| `backend/app/llm_engine.py` | 更新 prompt 告知 LLM 新字段结构 |

## 5. 头像存储方案

Base64 data URL 直接存储在 resume JSON 的 `avatar` 字段中。

- 前端：`FileReader.readAsDataURL()` 读取 → 预览 → 存入 state
- 后端：JSON 中已有 `avatar` 字段，存入 SQLite 无需改动 schema
- 限制：建议图片 < 2MB，过大影响 JSON 存储和传输性能
