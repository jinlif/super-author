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

### 3.9k 工具系统优化

当前approval工具作用不大现在改为不对agent开放，而是改为内部逻辑。修改工具的实现，所有工具都要继承Permission类，继承Permission类后，Permission类有个鉴权字段，为true表示使用这个工具需要先调研approval，与当前edit工具逻辑一致。

### 3.9L 无输出样式优化

在无输出时，ai 助理显示一个闪烁光标，可以借鉴claude code的样式，比如一会显示thinking，一会显示mulling等，并且有对应的动画效果

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

### @功能bug

如 @k ，mention显示的内容包含@02-床前明月光.md 并没有与@后面字符过滤，但是@床 @月光却能够正常过滤
