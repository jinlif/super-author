# 待办

> **维护规则：**
>
> - 完成的任务直接删除，不归档（git history 是真相）
> - Bug 修复后：摘要写入 `docs/bugfix/bug-N.md`，从本文件删除
> - 新增任务：追加到对应 section，注明依赖关系
> - 阶段完成后：删除该阶段所有条目，更新"排队中"为"当前"

> **设计文档：**
>
> - [设计文档](docs/superpowers/specs/2026-05-08-super-author-design.md)
> - [Phase 2 设计](docs/superpowers/specs/2026-05-09-super-author-phase2-design.md)
> - [Model Service 设计](docs/superpowers/specs/2026-05-10-editor-model-service-design.md)
> - [Phase 3-6 实施计划](docs/superpowers/plans/2026-05-10-super-author-phase3-plan.md)
>
> 路线：B（Tauri + cline 核心模块）

---

## 当前：Phase 3.9

### 3.9i 聊天面板内容渲染

聊天面板内容使用markdown格式渲染，由于有tool use部分，这一部分改为独立的一次会话，即思考和工具以及正文都分割开显示（相当于发了多次消息的效果）

---

## 排队中

- **Phase 4** Skill 系统（SkillLoader / SkillMatcher / 内置 Skill / SkillManager UI）
- **Phase 5** MCP 集成（McpHub / McpClient / MCP 工具自动注册）
- **Phase 6** 高级功能（划词备注、角色管理、写作目标、修订历史、应用设置、性能优化）

---

## 待优化

- 标题栏主题色与 VS Code 暗色主题对齐
- 面板拖拽调整大小
- i18n 支持

## bug

暂无
