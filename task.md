# 超级作者 — 开发任务看板

> 需求文档：
> - [设计文档](docs/superpowers/specs/2026-05-08-super-author-design.md)
> - [实施计划](docs/superpowers/plans/2026-05-08-super-author-plan.md)

---

## Phase 1 遗留

- [ ] **Tauri v2 壳集成** — 创建 `src-tauri/` 目录，Rust 依赖，tauri.conf.json 配置

## Phase 2：数据模型 & 本地存储

> 目标：能创建书、写章节，数据存本地 markdown

- [ ] **2.1** TypeScript 类型定义完善 (Book, Chapter, Character, Annotation...)
- [ ] **2.2** Tauri Rust 文件系统 command (read_file, write_file, read_dir, watch_dir)
- [ ] **2.3** 前端文件服务层 (FileService 封装 Tauri invoke)
- [ ] **2.4** BookService — 书籍创建/打开/列表管理
- [ ] **2.5** 书籍选择页面/对话框
- [ ] **2.6** Monaco Editor 集成 — markdown 编辑、高亮
- [ ] **2.7** 章节内容读写 + 自动保存
- [ ] **2.8** 侧边栏章节树 + 大纲树
- [ ] **2.9** 状态栏 — 字数统计、写作目标进度
- [ ] **2.10** Phase 2 集成测试

## Phase 3：Agent 核心 + 多 Provider

> 目标：能在对话面板发指令，agent 返回内容写入编辑器

- [ ] **3.1** Provider 接口 + Claude API client
- [ ] **3.2** OpenAI API client
- [ ] **3.3** Provider 注册/切换机制
- [ ] **3.4** Agent 核心循环 (query → stream → tool calls → loop)
- [ ] **3.5** 内置基础工具 (read_chapter, write_chapter, search_chapters, get_characters)
- [ ] **3.6** 系统提示词 + 写作上下文构建
- [ ] **3.7** Agent 对话 UI (消息列表、流式渲染、工具调用展示)
- [ ] **3.8** 生成内容写入编辑器
- [ ] **3.9** 对话历史本地存储
- [ ] **3.10** Phase 3 集成测试

## Phase 4：Skill 系统

> 目标：用户可通过 skill 触发写作辅助功能

- [ ] **4.1** Skill 类型定义 + frontmatter 解析
- [ ] **4.2** Skill 加载引擎 (内置/用户级/书籍级)
- [ ] **4.3** Skill 注册 + 去重 + 优先级合并
- [ ] **4.4** Skill 匹配逻辑 (whenToUse 语义匹配)
- [ ] **4.5** 内置 skill: 续写、润色、大纲生成、角色提取
- [ ] **4.6** Skill 管理器 UI (查看/编辑/添加 skill)
- [ ] **4.7** 用户自定义 skill 热加载
- [ ] **4.8** Phase 4 集成测试

## Phase 5：MCP 集成

> 目标：可连接 web search 等 MCP server

- [ ] **5.1** MCP client 实现 (基于 @modelcontextprotocol/sdk)
- [ ] **5.2** stdio / SSE / WebSocket 传输支持
- [ ] **5.3** MCP 工具发现 + 注册到 Agent
- [ ] **5.4** MCP server 配置界面
- [ ] **5.5** OAuth 认证支持
- [ ] **5.6** Phase 5 集成测试

## Phase 6：高级功能 & 打磨

> 目标：划词备注、角色管理、写作目标、修订历史

- [ ] **6.1** 划词备注系统 (Annotation + 浮窗 UI)
- [ ] **6.2** 角色关系可视化
- [ ] **6.3** 写作目标追踪
- [ ] **6.4** 章节修订历史 (diff 对比)
- [ ] **6.5** 应用设置页面 (API Key、主题、快捷键等)
- [ ] **6.6** 性能优化 (大章节虚拟滚动、懒加载)
- [ ] **6.7** 最终集成测试 + E2E
