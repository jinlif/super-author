# AI 文检测 Agent 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添加第一个内置 SubAgent `ai-detector`，用于检测文本是否具有 AI 生成特征

**Architecture:** 通过 Vite `import.meta.glob` 在构建时加载内置 agent 定义 `.md` 文件，解析为 `AgentDefinition` 对象，在 `agentStore.loadAgents()` 中与目录扫描结果合并。复用现有 `parseAgentFile` 解析逻辑。

**Tech Stack:** TypeScript, Vite (`import.meta.glob`), Zustand, Vitest

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/infrastructure/ConfigService.ts:21` | 修改 | 导出 `parseAgentFile` 函数 |
| `src/infrastructure/builtin-agents/ai-detector.md` | 新增 | Agent 定义（frontmatter + 系统提示词） |
| `src/infrastructure/builtinAgents.ts` | 新增 | 加载内置 agents 并暴露 `loadBuiltinAgents()` |
| `src/application/stores/agentStore.ts:220-226` | 修改 | `loadAgents()` 中合并内置 agents |
| `tests/infrastructure/builtinAgents.test.ts` | 新增 | 解析逻辑单测 |

---

### Task 1: 导出 `parseAgentFile` 并添加单测

**Files:**
- Modify: `src/infrastructure/ConfigService.ts:21`
- Create: `tests/infrastructure/builtinAgents.test.ts`

- [ ] **Step 1: 导出 `parseAgentFile`**

将 `src/infrastructure/ConfigService.ts` 第 21 行的函数签名从：

```ts
function parseAgentFile(content: string): AgentDefinition | null {
```

改为：

```ts
export function parseAgentFile(content: string): AgentDefinition | null {
```

- [ ] **Step 2: 编写解析逻辑的单测**

创建 `tests/infrastructure/builtinAgents.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { parseAgentFile } from '../../src/infrastructure/ConfigService'

describe('parseAgentFile', () => {
  const validContent = `---
name: ai-detector
description: 检测文本是否为 AI 生成
model: claude-sonnet-4-20250514
maxTurns: 10
tools:
  - read_file
  - list_dir
---

你是一个 AI 文检测专家。`

  it('应正确解析 frontmatter 各字段', () => {
    const result = parseAgentFile(validContent)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('ai-detector')
    expect(result!.description).toBe('检测文本是否为 AI 生成')
    expect(result!.model).toBe('claude-sonnet-4-20250514')
    expect(result!.maxTurns).toBe(10)
    expect(result!.tools).toEqual(['read_file', 'list_dir'])
    expect(result!.systemPrompt).toBe('你是一个 AI 文检测专家。')
  })

  it('无 body 时应返回 null', () => {
    const content = `---
name: test
description: desc
---
`
    expect(parseAgentFile(content)).toBeNull()
  })

  it('无 name 时应返回 null', () => {
    const content = `---
description: desc
---
body`
    expect(parseAgentFile(content)).toBeNull()
  })

  it('tools 为空数组时应返回 undefined', () => {
    const content = `---
name: test
---
body`
    const result = parseAgentFile(content)
    expect(result!.tools).toBeUndefined()
  })
})
```

- [ ] **Step 3: 运行测试验证通过**

Run: `npx vitest run tests/infrastructure/builtinAgents.test.ts`
Expected: 4 tests PASS

- [ ] **Step 4: 提交**

```bash
git add src/infrastructure/ConfigService.ts tests/infrastructure/builtinAgents.test.ts
git commit -m "refactor: 导出 parseAgentFile 并添加单测"
```

---

### Task 2: 创建 ai-detector Agent 定义文件

**Files:**
- Create: `src/infrastructure/builtin-agents/ai-detector.md`

- [ ] **Step 1: 创建 agent 定义文件**

创建 `src/infrastructure/builtin-agents/ai-detector.md`：

````markdown
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

你是一位专业的 AI 文检测分析师。你的任务是分析用户提供的文本，判断其是否具有 AI 生成的特征。你只做诊断分析，不做任何润色或修改。

## 你的工作流程

1. 如果用户直接提供了文本，直接分析
2. 如果用户要求检查某个文件或章节，使用 read_file 读取内容后分析
3. 如果用户要求浏览目录，使用 list_dir 查看结构后再读取目标文件

## AI 文特征检测体系

你需要从以下六个维度系统分析文本：

### 一、语言表达（权重最高）

**高频 AI 口癖**：检测以下词汇的出现频率——
- 连接词："然而""此外""值得注意的是""与此同时""不可否认""毋庸置疑"
- 修饰词："深邃""缱绻""彼时""不容置喙""恍若""宛若""缱倦"
- 情感词："不禁""竟然""居然""心中一震""心头一颤"
- 公文腔："需要指出的是""综上所述""由此可见"

**破折号泛滥**：统计破折号（——）的出现频率。人类写作中破折号是低频标点，AI 文中往往密集出现。这是最具辨识度的视觉特征之一。

**翻译腔句式**：检测英文语序残留，如"形容词+又+形容词"结构、过长的从句嵌套。

**形容词堆叠**：名词前超过 3 层"的"字定语修饰。

**词汇多样性**：异常高（缺乏个人用词习惯）或异常低（重复模板短语）都是信号。

### 二、句式结构

- 句长是否过于均匀，缺少长短句的节奏变化
- 是否大量使用排比、并列结构
- "不是……而是……""与其……不如……"等固定连接词是否高频出现
- 转折、因果关系是否过于工整对仗

### 三、逻辑结构

- **套路化叙事**：是否呈现"弱→辱→金手指→打脸"的模板化结构
- **模板趋同**：是否选择最"安全"的叙事路径，缺乏意外
- **逻辑断裂**：前后是否矛盾，角色设定是否突变，是否凭空捏造事件
- **节奏失调**：是否注水（堆砌描写不推剧情）或过快无松弛

### 四、描写手法

- **"空镜头"**：是否有脱离剧情的无关环境描写，为描写而描写
- **意象拼贴**：多个意象堆砌但缺乏有机联系
- **感官描写的"廉价高级感"**：多感官罗列但逻辑不兼容（如"烈日的铁锈味"）
- **过度解释**：是否把情感、伏笔、笑点全部总结出来，破坏留白

### 五、叙事推进

- 情节是否有推进力，还是"静止叙事"
- 是否只有环境描写和内心独白，迟迟不推动故事
- 是否套路化"爽文"结构，缺乏复杂性和意外

### 六、情感表达

- 情感是否"告诉"而非"展示"（"他很悲伤" vs 通过行为暗示）
- 人设是否完美化，缺乏真实人性的复杂
- 是否缺乏代入感与共鸣
- 是否无法运用"留白"美学

## 输出格式

分析完成后，按以下格式输出：

## AI 文检测报告

**总体评分：XX/100**（分数越高，AI味越重。0-20=几乎无人工痕迹，21-40=轻微AI味，41-60=中等AI味，61-80=明显AI味，81-100=严重AI味）

### 分维度评分

| 维度 | 分数 | 等级 |
|------|------|------|
| 语言表达 | XX | 轻微/中等/明显/严重 |
| 句式结构 | XX | 轻微/中等/明显/严重 |
| 逻辑结构 | XX | 轻微/中等/明显/严重 |
| 描写手法 | XX | 轻微/中等/明显/严重 |
| 叙事推进 | XX | 轻微/中等/明显/严重 |
| 情感表达 | XX | 轻微/中等/明显/严重 |

### 主要问题

列出最突出的 3-5 个问题，每个问题包含：
1. **问题类型**：如"破折号泛滥""空镜头描写"等
2. **具体描述**：问题的表现
3. **原文举例**：从被检测文本中引用具体段落或句子

### 诊断结论

一段简要总结，指出最需要改进的 1-2 个方向。

## 注意事项

- 评分要客观，不要因为文本质量高就自动给低分
- 短文本（<500字）的检测准确度有限，应在结论中注明
- 人类写作也会有上述部分特征，关键在于频率和模式的异常程度
- 你只做分析，不做修改建议以外的任何操作
````

- [ ] **Step 2: 验证文件创建成功**

Run: `cat src/infrastructure/builtin-agents/ai-detector.md | head -8`
Expected: 显示 frontmatter 开头

- [ ] **Step 3: 提交**

```bash
git add src/infrastructure/builtin-agents/ai-detector.md
git commit -m "feat: 添加 ai-detector 内置 agent 定义文件"
```

---

### Task 3: 创建 `builtinAgents.ts` 加载模块

**Files:**
- Create: `src/infrastructure/builtinAgents.ts`
- Modify: `tests/infrastructure/builtinAgents.test.ts`

- [ ] **Step 1: 编写 `loadBuiltinAgents` 的单测**

在 `tests/infrastructure/builtinAgents.ts` 末尾追加：

```ts
import { loadBuiltinAgents } from '../../src/infrastructure/builtinAgents'

describe('loadBuiltinAgents', () => {
  it('应加载至少一个内置 agent', () => {
    const agents = loadBuiltinAgents()
    expect(agents.length).toBeGreaterThanOrEqual(1)
  })

  it('应包含 ai-detector agent', () => {
    const agents = loadBuiltinAgents()
    const detector = agents.find((a) => a.name === 'ai-detector')
    expect(detector).toBeDefined()
    expect(detector!.description).toBe('检测文本是否为 AI 生成，输出整体评分和问题分析')
    expect(detector!.maxTurns).toBe(10)
    expect(detector!.tools).toEqual(['read_file', 'list_dir', 'grep', 'get_file_info'])
    expect(detector!.systemPrompt).toContain('AI 文检测分析师')
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run tests/infrastructure/builtinAgents.test.ts`
Expected: FAIL — `Cannot find module '../../src/infrastructure/builtinAgents'`

- [ ] **Step 3: 创建 `src/infrastructure/builtinAgents.ts`**

```ts
import type { AgentDefinition } from '../domain/types/agent'
import { parseAgentFile } from './ConfigService'

const builtinModules = import.meta.glob('./builtin-agents/*.md', {
  as: 'raw',
  eager: true,
}) as Record<string, string>

let cached: AgentDefinition[] | null = null

export function loadBuiltinAgents(): AgentDefinition[] {
  if (cached) return cached
  cached = []
  for (const [path, content] of Object.entries(builtinModules)) {
    const agent = parseAgentFile(content)
    if (agent) {
      cached.push(agent)
    } else {
      console.warn(`跳过无效内置 agent 文件: ${path}`)
    }
  }
  return cached
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run tests/infrastructure/builtinAgents.test.ts`
Expected: 6 tests PASS（Task 1 的 4 个 + Task 3 的 2 个）

- [ ] **Step 5: 提交**

```bash
git add src/infrastructure/builtinAgents.ts tests/infrastructure/builtinAgents.test.ts
git commit -m "feat: 创建 builtinAgents 加载模块"
```

---

### Task 4: 集成到 agentStore

**Files:**
- Modify: `src/application/stores/agentStore.ts:220-226`

- [ ] **Step 1: 添加 import**

在 `src/application/stores/agentStore.ts` 顶部 import 区域添加：

```ts
import { loadBuiltinAgents } from '../../infrastructure/builtinAgents'
```

- [ ] **Step 2: 修改 `loadAgents` 方法**

将第 220-226 行从：

```ts
    const dirs: string[] = []
    if (bookDir) dirs.push(`${bookDir}/.super-author/agents`)
    dirs.push(`${homeDir}/.agents/agents`)
    dirs.push(`${homeDir}/.superauthor/agents`)

    const validModels = state.providerConfig.models
    const agents = await configService.loadAgentsFromDirs(dirs, validModels)
    set({ agentDefinitions: agents })
```

改为：

```ts
    // 优先级：书籍级 > 内置 > 用户级
    const dirs: string[] = []
    if (bookDir) dirs.push(`${bookDir}/.super-author/agents`)
    dirs.push(`${homeDir}/.agents/agents`)
    dirs.push(`${homeDir}/.superauthor/agents`)

    const validModels = state.providerConfig.models
    const dirAgents = await configService.loadAgentsFromDirs(dirs, validModels)

    // 内置 agents 作为兜底，同名被书籍级/用户级覆盖
    const builtinAgents = loadBuiltinAgents()
    const agentMap = new Map<string, AgentDefinition>()
    for (const agent of builtinAgents) agentMap.set(agent.name, agent)
    for (const agent of dirAgents) agentMap.set(agent.name, agent)

    set({ agentDefinitions: Array.from(agentMap.values()) })
```

- [ ] **Step 3: 运行全量测试**

Run: `npx vitest run`
Expected: 所有测试通过

- [ ] **Step 4: 提交**

```bash
git add src/application/stores/agentStore.ts
git commit -m "feat: agentStore 集成内置 agents 加载"
```

---

### Task 5: 端到端验证

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev`
Expected: 无编译错误

- [ ] **Step 2: 在 Agent 面板中测试**

1. 打开应用，进入 Agent 面板
2. 输入：`@ai-detector 帮我检查以下文本：七月的宁城热浪滚烫，整个城市空气中都弥漫着一股烈日的铁锈味，炽热的阳光透过教室破旧模糊的玻璃窗，把整个教室的人照得无精打采。他沉默了一会儿，心中充满了复杂的情绪——既愤怒又悲伤，同时还有些许无奈。`
3. 验证 agent 返回包含六维度评分表的检测报告

- [ ] **Step 3: 测试文件读取能力**

1. 在 Agent 面板输入：`@ai-detector 帮我检查一下当前书的目录结构`
2. 验证 agent 能使用 list_dir 工具浏览目录

- [ ] **Step 4: 提交最终状态**

```bash
git add -A
git commit -m "feat: 完成 ai-detector 内置 agent"
```
