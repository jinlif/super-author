# AI 文检测 Agent 设计文档

## 概述

为超级作者应用添加第一个内置 SubAgent——`ai-detector`，用于检测文本是否具有 AI 生成特征。该 agent 只做诊断分析，不做润色修改。

## 设计决策

- **方案**：纯 Prompt Agent（方案 A），利用 LLM 对 AI 模式的理解力，无额外工具代码
- **使用场景**：用户自检——AI 辅助写作后检查文章是否过于"AI味"
- **输出粒度**：概览评分（六维度评分表 + 问题举例 + 诊断结论）
- **文本来源**：用户在对话中指定内容，或 agent 自主读取章节文件

## 架构

### 内置 Agent 加载机制

新增项目内置 agent 目录，通过 Vite `import.meta.glob` 在构建时打包为代码常量。

**加载优先级**（同名覆盖，高优先级胜出）：

1. `{bookDir}/.super-author/agents/` — 书籍级（最高）
2. 内置 agents — 项目打包时内嵌
3. `{homeDir}/.agents/agents/` — 用户级
4. `{homeDir}/.superauthor/agents/` — 用户级

**实现方式**：

- 新增 `src/infrastructure/builtin-agents/ai-detector.md` 文件
- 新增 `src/infrastructure/builtinAgents.ts`，使用 `import.meta.glob('builtin-agents/*.md', { as: 'raw' })` 加载并解析
- `agentStore.loadAgents()` 中将内置 agents 与目录扫描结果合并

### Agent 元数据

```yaml
---
name: ai-detector
description: 检测文本是否为 AI 生成，输出整体评分和问题分析
model: claude-sonnet-4-20250514
maxTurns: 10
tools:
  - read_file
  - list_dir
  - grep
  - get_file_info
---
```

- `maxTurns: 10`：允许多轮分析（如先浏览目录再读取具体文件）
- `tools`：仅读取类工具，不能写入任何文件

## AI 文特征体系

系统提示词编码六大维度的检测特征：

### 一、语言层面

- **高频 AI 口癖**："然而""此外""值得注意的是""与此同时""深邃""缱绻""彼时""不容置喙"
- **破折号泛滥**：—— 的出现频率远超自然写作，是最直观的"视觉地标"
- **翻译腔句式**："形容词+又+形容词"、英文语序残留
- **形容词堆叠**：名词前 3 层以上"的"字定语
- **词汇多样性异常**：过高（无个人用词习惯）或过低（重复模板短语）

### 二、句式层面

- 句长过于均匀，缺少长短句节奏变化
- 大量排比、并列结构
- "不是……而是……""与其……不如……"等固定连接词高频出现
- 转折/因果过于工整对仗

### 三、结构层面

- **套路化叙事**：弱→辱→金手指→打脸的模板
- **模板趋同**：概率收敛导致的安全路径选择
- **逻辑断裂/幻觉**：前后矛盾、角色设定突变、凭空捏造事件
- **节奏失调**：要么注水（堆砌描写不推剧情），要么过快无松弛

### 四、描写层面

- **"空镜头"**：脱离剧情的无关环境描写，为描写而描写
- **意象拼贴无逻辑**：多个意象堆砌但缺乏有机联系
- **感官描写的"廉价高级感"**：多感官罗列但逻辑不兼容（如"烈日的铁锈味"）
- **过度解释**：把情感、伏笔、笑点全部总结出来，破坏留白

### 五、叙事层面

- 情节缺乏推进力，"静止叙事"
- 只有环境描写和内心独白，迟迟不推动故事
- 套路化"爽文"结构，缺乏复杂性和意外

### 六、情感层面

- 情感克制空洞，"告诉"而非"展示"
- 人设完美化，缺乏真实人性的复杂
- 缺乏代入感与共鸣
- 无法理解"留白"美学

## 输出格式

```markdown
## AI 文检测报告

**总体评分：XX/100**（分数越高，AI味越重）

### 分维度评分

| 维度 | 分数 | 等级 |
|------|------|------|
| 语言表达 | XX | 轻微/中等/明显/严重 |
| 句式结构 | XX | ... |
| 逻辑结构 | XX | ... |
| 描写手法 | XX | ... |
| 叙事推进 | XX | ... |
| 情感表达 | XX | ... |

### 主要问题

1. **[问题类型]**：具体描述 + 原文举例
2. **[问题类型]**：具体描述 + 原文举例
3. ...

### 诊断结论

一段简要总结，指出最需要改进的方向。
```

## 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/infrastructure/builtin-agents/ai-detector.md` | 新增 | Agent 定义文件（frontmatter + 系统提示词） |
| `src/infrastructure/builtinAgents.ts` | 新增 | 加载并解析内置 agent 文件 |
| `src/application/stores/agentStore.ts` | 修改 | `loadAgents()` 中合并内置 agents |
| `tests/infrastructure/builtinAgents.test.ts` | 新增 | 解析逻辑单测 |

## 测试策略

- `builtinAgents.test.ts`：验证 `parseAgentFile` 能正确解析 ai-detector.md 的 frontmatter 和 systemPrompt
- `agentStore.test.ts`：验证内置 agents 在 `loadAgents()` 结果中存在
- 手动验证：在 Agent 面板中使用 `@ai-detector` 分析一段文本
