# Phase 2 工作计划 - 文档系统生产化

**时间范围**: 2-4 周  
**目标**: 完整的文档管理、存储和搜索系统  
**优先级**: Phase 1 安全框架已完, 需立即推进此阶段以支持用户上传文件

---

## 📋 关键工作项

### 1. 对象存储集成 (HIGH PRIORITY) 
**当前状态**: 代码框架已有，但仅支持本地文件

#### 1.1 选择存储方案
- [ ] **Mini选项** (推荐用于MVP): MinIO (兼容S3 API)
  - docker-compose 已支持: `minio` service
  - 改用例: docker-compose --profile minio up
  - 优点: 本地可跑，不依赖AWS/阿里云
  
- [ ] **标准选项** (生产环境):
  - S3 (Amazon)
  - OSS (阿里云)
  - 配置: 环境变量 + boto3

#### 1.2 实现方案
**Backend端**:
- [ ] 集成 boto3 (S3兼容)
- [ ] 实现 `services/storage.py`:
  - `upload_file()` → 上传到MinIO/S3
  - `generate_presigned_url()` → 预签名URL生成
  - `delete_file()` → 文件删除
  
- [ ] 更新 Document model:
  ```python
  storage_provider = Column(String, default="minio")  # minio/s3/oss
  bucket_name = Column(String)
  object_key = Column(String)  # 对象路径
  ```

- [ ] 修改上传流程:
  - 旧: `POST /upload` → 本地文件
  - 新: `POST /upload-init` → 获取presigned URL
       `POST /upload-complete` → 后端确认

**Frontend端**:
- [ ] 更新 `document-api.ts`:
  - 获取presigned URL
  - 直接上传到MinIO/S3 (bypass backend)
  - 上传完成后调用confirm端点

**测试**:
- [ ] 本地MinIO 500MB文件上传
- [ ] 大于5GB分块上传逻辑
- [ ] 网络中断恢复

---

### 2. 全文检索 (HIGH PRIORITY)
**当前状态**: 基础keyword查询已实现

#### 2.1 搜索功能扩展
**短期** (本周):
- [ ] 标题模糊匹配 (ILIKE 或 FULL TEXT SEARCH)
- [ ] 标签精确+模糊
- [ ] 创建者查询
- [ ] 时间范围过滤
- [ ] 权限过滤 (private/team/public)

实现:
```python
# 在 document.py 新增
@router.get("/search", response_model=PagedDocumentResponse)
async def search_documents(
    q: str = Query(...),  # 搜索词
    status: str = Query(None),  # draft/review/published
    tags: List[str] = Query(None),  # 标签数组
    owner_id: str = Query(None),  # 创建者
    from_date: str = Query(None),  # 时间范围
    to_date: str = Query(None),
    limit: int = 20,
    offset: int = 0,
    current_user: UserResponse = Depends(get_current_user),
):
    # 构建动态查询...
```

**中期** (2 周后):
- [ ] PostgreSQL Full-Text Search (FTS)
  - 支持中文分词 (jieba)
  - 权重配置 (title 2x desc)
  - 高亮结果片段

实现:
```sql
-- 创建tsvector索引
ALTER TABLE documents ADD COLUMN search_vector tsvector;
CREATE TRIGGER search_update BEFORE INSERT OR UPDATE
ON documents FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(search_vector, 'pg_catalog.english', 
  title, description);
CREATE INDEX search_idx ON documents USING GIN (search_vector);
```

**长期** (后续):
- [ ] 向量检索 (Phase 3)
  - OpenAI embeddings / 开源模型
  - PGVector 扩展
  - 语义搜索

---

### 3. 权限与分享 (MEDIUM PRIORITY)
**当前状态**: private/team/public 框架已有

#### 3.1 完成实现
- [ ] **Private 文档**
  - 仅 owner 可见
  - 已实现 ✅

- [ ] **Team 文档**  (需完成)
  - project_id 对应成员
  - TODO: project_members 表设计
  - TODO: 验证成员权限

- [ ] **Public 文档** (需完成)
  - admin 发布的文档
  - 需要域名支持
  - TODO: 公开分享链接生成

#### 3.2 分享链接
- [ ] **Shareable URL**:
  ```
  https://docs.example.com/share/{share_token}
  对应 Document.share_token, share_token_expires_at
  ```

- [ ] **分享权限**:
  - 只读 (view-only)
  - 可评论 (comment)
  - 可编辑 (edit) - 仅 team

---

### 4. 数据清理 & Mock移除 (MEDIUM PRIORITY)
**当前状态**: 演示数据仍然混杂在前端

#### 4.1 清理前端演示数据
- [ ] 移除 `DUMMY_PROJECT`, `DUMMY_PAPERS` 等常量  
- [ ] 替换为后端 API 加载
- [ ] 初始化流程:
  - 新用户 → 创建默认project
  - 可选: 加载示范数据 (可关闭)

#### 4.2 后端种子数据
- [ ] `mock_data/*.json` 仅在 dev/staging 启用
  - 设置: `ENABLE_SEED_DATA=true` (仅dev)
  - 生产: `ENABLE_SEED_DATA=false`

- [ ] 文档:
  ```python
  # main.py
  if os.getenv("ENABLE_SEED_DATA", "").lower() == "true":
      await initialize_mock_data()
  ```

---

### 5. 性能优化 (LOW PRIORITY)
**当前状态**: 基础实现，未优化

#### 5.1 数据库
- [ ] 索引优化:
  - owner_user_id (所有表)
  - status, permission (documents)
  - created_at (时间范围查询)
  
- [ ] 查询优化:
  - 避免 N+1 问题 (使用 joinedload)
  - 分页大小测试 (推荐 20-50)

#### 5.2 缓存
- [ ] Redis 集成:
  - 文档元数据缓存 (TTL: 5min)
  - 搜索结果缓存
  - 用户权限缓存

- [ ] CDN:
  - 文档预览 (HTML/PDF)
  - 缩略图

---

### 6. 测试扩展 (MEDIUM PRIORITY)

#### 6.1 API 测试
- [ ] 对象存储上传 (mock S3)
- [ ] 搜索功能 (各种查询组合)
- [ ] 权限控制 (跨用户/跨team)
- [ ] 大文件处理 (1GB+)

#### 6.2 集成测试
- [ ] 创建 → 上传 → 搜索 → 删除 完整流程
- [ ] 模式: `integration_tests.py` 中添加

```python
# 新增测试用例
async def test_document_workflow():
    # 1. 创建文档
    doc = await client.create_document(...)
    # 2. 获取presigned URL
    url = await client.get_upload_url(doc.id)
    # 3. 上传文件到MinIO
    await client.upload_file(url, file)
    # 4. 搜索文档
    results = await client.search("keyword")
    # 5. 删除文档
    await client.delete_document(doc.id)
```

---

## 📊 实施时间表

| 任务 | 优先级 | 预计时间 | 负责 |
|------|--------|---------|------|
| 1. 对象存储 (MinIO) | 🔴 | 3-5天 | Backend |
| 2. 全文检索基础 | 🔴 | 2-3天 | Backend |
| 3. 权限完成 | 🟡 | 2-3天 | Backend |
| 4. Mock数据清理 | 🟡 | 1-2天 | Frontend |
| 5. 性能优化 | 🟢 | 2-3天 | DevOps |
| 6. 测试扩展 | 🟡 | 2-3天 | QA |

**总计**: 12-19 天 (2.5-4 周)

---

## 🎯 验收标准

- [ ] 支持 500MB+ 文件上传
- [ ] 搜索响应 < 200ms (P95)
- [ ] 跨用户权限隔离验证
- [ ] 端到端集成测试通过
- [ ] 生产部署文档完成

---

## 🔗 依赖关系

```
┌─────────────────┐
│  对象存储集成   │ ← 必须先完成
├─────────────────┤
│  全文检索完成   │
│  权限模型完善   │
├─────────────────┤
│  Mock数据清理   │
│  性能优化       │
├─────────────────┤
│  完整测试覆盖   │
└─────────────────┘
```

---

## 📞 参考

- 设计文档: `DEVELOPMENT_PROGRESS_REPORT.md`
- 部署指南: `STAGING_SETUP.md`  
- API详情: `API_ARCHITECTURE.md`
- 上线检查: `PRODUCTION_READINESS.md`
