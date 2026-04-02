# 📚 论文阅读系统 - 完整代码框架

## 🎯 项目概览

这是一个完整的论文阅读管理系统，实现了从**Step 2（发现入门论文）** 到 **Step 3（阅读论文）** 的全工作流，包括PDF高亮、笔记管理、概念提取等功能。

---

## ✅ 已完成的功能

### 后端实现

#### 📦 数据模型 (`app/backend/models/manuscript.py`)
- **Paper** - 论文及其元数据、阅读状态、相关性标记
- **Note** - 文献笔记和永久笔记，支持引用多篇论文
- **Highlight** - PDF文本高亮，支持4种颜色
- **Concept** - 从论文/笔记提取的概念
- **Project** - 扩展项目模型，包含关系

#### 🔗 API端点 (`app/backend/routers/manuscript.py`)
```
/api/v1/manuscripts/

Papers:
  ✅ POST   /papers                  - 创建论文
  ✅ GET    /papers                  - 列出项目论文
  ✅ GET    /papers/:id              - 获取论文
  ✅ PUT    /papers/:id              - 更新论文
  ✅ DELETE /papers/:id              - 删除论文
  ✅ GET    /papers/entry-papers     - 获取入门+扩展论文(阅读)

Notes:
  ✅ POST   /notes                   - 创建笔记
  ✅ GET    /notes                   - 列出论文笔记
  ✅ GET    /notes/:id               - 获取笔记
  ✅ PUT    /notes/:id               - 更新笔记
  ✅ DELETE /notes/:id               - 删除笔记

Highlights:
  ✅ POST   /highlights              - 创建高亮
  ✅ GET    /highlights              - 列出高亮
  ✅ DELETE /highlights/:id          - 删除高亮

Concepts:
  ✅ POST   /concepts                - 创建概念
  ✅ GET    /concepts                - 列出概念
```

### 前端实现

#### 📡 API客户端 (`app/frontend/src/lib/manuscript-api.ts`)
- 完整的TypeScript类型定义
- 四个API命名空间：`paperAPI`, `noteAPI`, `highlightAPI`, `conceptAPI`
- 自动错误处理

#### 🎨 UI组件

##### Step 3: 读取论文列表
**文件**: `app/frontend/src/components/workflow/Step3ReadFoundPapers.tsx`
- ✅ 显示所有入门论文和扩展论文
- ✅ 按类型过滤（全部/入门/扩展）
- ✅ 显示论文元数据、阅读状态、相关性
- ✅ 点击论文标题进入阅读页面

##### 论文阅读页面（3:1布局）
**文件**: `app/frontend/src/components/reading/PaperReadPage.tsx`
- ✅ 3:1布局：2/3阅读区 + 1/3工具区
- ✅ 状态选择器（阅读/完成/待读）
- ✅ 退出确认对话框
- ✅ 自动保存状态

##### 左侧阅读区
**文件**: `app/frontend/src/components/reading/PaperReadingArea.tsx`
- ✅ 可收起的标题部分（默认收起）
  - 作者、年份、期刊
  - 发现路径和笔记
  - 摘要
- ✅ PDF阅读器区域
  - 无PDF时显示上传界面
  - Mock PDF内容演示

##### PDF高亮阅读器
**文件**: `app/frontend/src/components/reading/PDFHighlightReader.tsx`
- ✅ 文本选择检测
- ✅ 4种颜色高亮（黄色、绿色、红色、蓝色）
- ✅ 浮动工具栏（5个工具）
  - **高亮** - 4种颜色直接高亮
  - **添加笔记** - 对话框，创建文献笔记
  - **翻译** - UI就位，等待API集成
  - **解释** - 激活AI聊天，粘贴选中文本
  - **保存为概念** - 对话框，创建新概念

##### 右侧工具区
**文件**: `app/frontend/src/components/reading/PaperToolsArea.tsx`
- ✅ 笔记列表（文献笔记/永久笔记计数）
- ✅ 添加笔记按钮和完整对话框
- ✅ 笔记表单字段：
  - 标题（必填）
  - 描述
  - 页码
  - 关键词（逗号分隔）
  - 笔记类型（文献/永久）+ 帮助提示
  - 引用选择（占位符）
- ✅ 删除笔记功能
- ✅ 笔记持久化到后端

---

## 📁 文件结构

```
app/backend/
├── models/
│   ├── __init__.py
│   ├── auth.py
│   └── manuscript.py ⭐ NEW
└── routers/
    ├── auth.py
    ├── storage.py
    ├── health.py
    └── manuscript.py ⭐ NEW

app/frontend/src/
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── config.ts
│   ├── data.ts
│   ├── utils.ts
│   └── manuscript-api.ts ⭐ NEW
├── components/
│   ├── workflow/
│   │   └── Step3ReadFoundPapers.tsx ⭐ NEW
│   └── reading/
│       ├── PaperReadPage.tsx ⭐ NEW
│       ├── PaperReadingArea.tsx ⭐ NEW
│       ├── PDFHighlightReader.tsx ⭐ NEW
│       ├── PaperToolsArea.tsx ⭐ NEW
│       └── IMPLEMENTATION_GUIDE.ts ⭐ NEW
└── pages/
    ├── App.tsx (需要更新)
    └── WorkflowWorkspace.tsx (需要更新)

app/
├── INTEGRATION_CHECKLIST.md ⭐ NEW
├── ARCHITECTURE_OVERVIEW.md ⭐ NEW
└── QUICK_INTEGRATION_SNIPPETS.ts ⭐ NEW
```

---

## 🚀 快速开始

### 第一步：数据库迁移

```bash
cd app/backend

# 创建migratio
alembic revision --autogenerate -m "Add manuscript system"

# 应用migration
alembic upgrade head
```

### 第二步：更新App.tsx

在 `app/frontend/src/App.tsx` 中：

```typescript
// 添加导入
import PaperReadPage from "@/components/reading/PaperReadPage";

// 在routes数组中添加
{ path: "/paper-read/:paperId", element: <PaperReadPage /> }
```

### 第三步：更新WorkflowWorkspace.tsx

在 `app/frontend/src/pages/WorkflowWorkspace.tsx` 中：

```typescript
// 添加导入
import Step3ReadFoundPapers from "@/components/workflow/Step3ReadFoundPapers";

// 在step渲染部分添加
{currentStep === 3 && (
  <Step3ReadFoundPapers projectId={project.id} />
)}
```

### 第四步：添加全局CSS

在 `app/frontend/src/App.css` 中添加（参见QUICK_INTEGRATION_SNIPPETS.ts）

### 第五步：启动服务

```bash
# 终端1 - 后端
cd app/backend
uvicorn main:app --reload

# 终端2 - 前端  
cd app/frontend
npm run dev
```

### 第六步：测试工作流

1. 打开 http://localhost:3000
2. 导航到Step 2
3. 添加并标记入门论文
4. 单击下一步进入Step 3
5. 点击论文标题打开阅读页面
6. 测试高亮、笔记、状态更改

---

## 📊 数据模型

### Paper
```python
id, title, authors[], year, journal, abstract, url, pdf_path
discovery_path, discovery_note
is_entry_paper, is_expanded_paper
reading_status: "Reading" | "Completed" | "To Read"
relevance: "high" | "medium" | "low"
project_id, created_at, updated_at
```

### Note
```python
id, paper_id, project_id
title, description, content
note_type: "literature-note" | "permanent-note"
page, keywords[], citations[] (paper IDs)
created_at, updated_at
```

### Highlight
```python
id, paper_id
text, page, color ("yellow|green|red|blue"), note
created_at
```

### Concept
```python
id, project_id
title, description, definition
created_at, updated_at
```

---

## 🔧 功能实现状态

### ✅ 已完成
- [x] 后端模型和API
- [x] 前端API客户端
- [x] Step 3列表组件
- [x] 论文阅读页面（3:1布局）
- [x] 左侧读取区
- [x] PDF高亮读取器
- [x] 浮动工具栏
- [x] 右侧工具区和笔记管理
- [x] 状态选择器
- [x] 退出确认

### 🔄 部分完成（UI就位）
- [ ] 翻译功能（等待API集成）
- [ ] AI解释（等待聊天集成）
- [ ] 概念保存（保存逻辑就位）
- [ ] 引用选择（表单就位）

### ❌ Phase 2功能
- [ ] 真实PDF上传和解析
- [ ] 相关性对话框
- [ ] Artifact Center同步
- [ ] 翻译API集成
- [ ] AI聊天集成
- [ ] 论文对比模式
- [ ] 搜索功能

---

## 📚 文档

### 快速参考
- **QUICK_INTEGRATION_SNIPPETS.ts** - 复制粘贴就绪的代码片段
- **ARCHITECTURE_OVERVIEW.md** - 完整架构说明
- **INTEGRATION_CHECKLIST.md** - 集成清单和测试步骤

### 组件文档
- **IMPLEMENTATION_GUIDE.ts** - 实现详情和检查表

---

## 🧪 测试API

```bash
# 创建论文
curl -X POST http://localhost:8000/api/v1/manuscripts/papers \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","authors":["A"],"project_id":"p1"}'

# 列出入门论文
curl "http://localhost:8000/api/v1/manuscripts/papers/entry-papers?project_id=p1"

# 创建笔记
curl -X POST http://localhost:8000/api/v1/manuscripts/notes \
  -H "Content-Type: application/json" \
  -d '{"paper_id":"id","project_id":"p1","title":"Note","note_type":"literature-note"}'
```

---

## 💡 下一步建议

1. **立即可做**：运行集成步骤1-5，测试UI
2. **Phase 2**：添加PDF解析和翻译API
3. **Phase 3**：AI聊天集成和高级功能
4. **Phase 4**：性能优化和协作功能

---

## 📞 支持

每个文件都包含详细注释。查看：
- 组件注释了功能和Props
- API文件记录了端点
- 模型文件展示了字段和关系

---

**创建者**: AI Assistant  
**日期**: 2026-03-20  
**状态**: ✅ 框架完成，准备集成  
**预计集成时间**: 15-30分钟  
**预计首次运行**: 45分钟（包括迁移）
