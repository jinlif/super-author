# 待办

> **维护规则：**
>
> - 完成的任务直接删除，不归档（git history 是真相）
> - Bug 修复后：摘要写入 `docs/bugfix/bug-N.md`，从本文件删除
> - 新增任务：追加到对应 section，注明依赖关系
> - 阶段完成后：删除该阶段所有条目，更新"排队中"为"当前"

> 设计文档：
>
> - [设计文档](docs/superpowers/specs/2026-05-08-super-author-design.md)
> - [Phase 2 设计](docs/superpowers/specs/2026-05-09-super-author-phase2-design.md)
> - [Model Service 设计](docs/superpowers/specs/2026-05-10-editor-model-service-design.md)
> - [Phase 3-6 实施计划](docs/superpowers/plans/2026-05-10-super-author-phase3-plan.md)
>
> 路线：B（Tauri + cline 核心模块）

---

## 当前：Phase 3.8 架构重构

### 3.8a 数据模型 & 存储层

- [ ] **3.8a.1** 历史会话持久化 — ConversationStore 接入 `ConfigService.historyDir`，移除 `_conversationCache` 纯内存缓存
- [ ] **3.8a.2** 目录描述系统 — BookMeta 扩展 `dirDescriptions`，book.json 存储/读取，系统目录给默认描述
- [ ] **3.8a.3** 书籍简介 DESCRIPTION.md — 创建书籍时生成，加载时读取作为 description

### 3.8b 系统提示词重构

- [ ] **3.8b.1** SystemPrompt 重写 — 新签名 `(tools, bookMeta, dirDescriptions, chapterSummaries?) => string`，删除 ContextBuilder

### 3.8c 工具全面重构

- [ ] **3.8c.1** 删除旧工具 + 基础设施调整
- [ ] **3.8c.2** 实现 7 个新通用工具（ListDir / CreateEntry / GetFileInfo / DeleteEntry / RenameEntry / Grep / UpdateFile）
- [ ] **3.8c.3** UI 层适配 — 系统目录/文件禁用重命名和删除，移除旧 write_chapter 相关逻辑

### 3.8d SubAgent 支持

- [ ] **3.8d.1** SubAgent 类型定义
- [ ] **3.8d.2** SubAgent 工具实现
- [ ] **3.8d.3** 章节摘要系统 — `ChapterSummaryService`，存储于 `.super-author/chapter-summaries.json`

---

## 排队中

- **Phase 4** Skill 系统（SkillLoader / SkillMatcher / 内置 Skill / SkillManager UI）
- **Phase 5** MCP 集成（McpHub / McpClient / MCP 工具自动注册）
- **Phase 6** 高级功能（划词备注、角色管理、写作目标、修订历史、应用设置、性能优化）

---

## 已知问题

暂无

## 待优化

- 标题栏主题色与 VS Code 暗色主题对齐
- 面板拖拽调整大小
- i18n 支持
