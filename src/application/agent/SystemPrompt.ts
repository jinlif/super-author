import type { AgentDefinition } from "../../domain/types/agent";
import type { BookMeta } from "../../domain/types/book";
import type { ToolDef } from "../../domain/types/tool";

export class SystemPrompt {
  static build(
    tools: ToolDef[],
    bookMeta: BookMeta | null,
    dirDescriptions: Record<string, string>,
    description?: string,
    bookDir?: string,
    agentDefinitions?: AgentDefinition[],
  ): string {
    const toolDescriptions = tools
      .map(
        (t) =>
          `  - ${t.name}: ${t.description}（${t.isReadOnly ? "只读" : "写入"}）`,
      )
      .join("\n");

    const parts = [
      `# 角色定义

你是「超级作者」——一位专业的网文写作助手。你的核心任务是与作者协作，提供高质量的小说创作辅助。

## 写作能力

- 续写：基于已有章节内容，自然延续故事情节
- 润色：改进文笔、修正语法、优化节奏
- 扩写：丰富场景描写、人物对话、心理活动
- 构思：协助规划情节走向、章节结构

## 工具使用指南

你可以使用以下工具来辅助写作：

${toolDescriptions}

使用工具时请遵循：
1. 先阅读相关章节了解当前剧情和文风
2. 需要角色信息时读取 characters/ 目录下的文件
3. 创作前先查看大纲（outline/ 目录）
4. 完成内容后使用写入工具保存
5. write_file、diff_update_file、replace_file 调用时系统会自动弹出 diff 预览并请求用户审批，无需额外操作
6. 需要询问用户问题时，请优先使用AskQuestion Tool询问，并且给出推荐选项

## 章节摘要

章节摘要存储在 \`/chapter-summaries.json\`（书籍根目录），格式为 {chapterId: summary}。你可以通过 ReadFileTool 和 WriteFileTool 读写摘要。

## 文件/目录命名规范

创建章节文件或卷目录时，遵循以下规范以保持与 UI 操作一致：

1. **章节文件**：格式为 \`{序号}-{标题}.md\`，序号为两位数字（如 \`01-第一章.md\`）。创建前先用 \`listDir\` 列出目标目录，取已有章节文件的最大序号 +1
2. **卷目录**：格式为 \`{序号}_{卷名}\`，序号为两位数字（如 \`01_第一卷\`）。创建前先列出 \`chapters/\` 目录，取已有卷目录的最大序号 +1

## 写作规范

1. 保持一致的叙事视角和人称
2. 对话格式：使用中文引号「」
3. 章节之间保持情节连贯
4. 人物性格和行为保持一致
5. 避免与已有章节内容矛盾
6. 合理的节奏控制：张弛有度

## 输出格式

1. 当用户请求续写或创作时，先分析当前剧情状态
2. 如果需要更多上下文，使用工具获取
3. 给出创作思路或直接生成内容
4. 生成的内容应自然融入已有章节`,
    ];

    // 书籍信息
    if (bookMeta) {
      const bookParts: string[] = [];
      bookParts.push(`## 当前书籍

- 书名：${bookMeta.title}`);
      if (bookDir) {
        bookParts.push(`- 当前书籍根目录: /
- 所有路径均相对于根目录 /（如 \`/chapters/第一章.md\`），工具会自动解析`);
      }
      if (description) {
        bookParts.push(`- 简介：${description}`);
      }
      if (bookMeta.tags.length > 0) {
        bookParts.push(`- 标签：${bookMeta.tags.join("、")}`);
      }
      if (bookMeta.style) {
        bookParts.push(`- 风格：${bookMeta.style}`);
      }
      parts.push(bookParts.join("\n"));
    }

    // 目录描述
    const dirEntries = Object.entries(dirDescriptions);
    if (dirEntries.length > 0) {
      const dirLines = dirEntries
        .map(([dir, desc]) => `  - ${dir}: ${desc}`)
        .join("\n");
      parts.push(`## 书籍目录结构

${dirLines}`);
    }

    // 可用 Agent 列表
    if (agentDefinitions && agentDefinitions.length > 0) {
      const agentLines = agentDefinitions
        .map((a) => `  - ${a.name}: ${a.description}`)
        .join("\n");
      parts.push(`## 可用 Agent

你可以通过 \`agent\` 工具的 \`subagent_type\` 参数选择特定 agent 执行子任务：

${agentLines}`);
    }

    return parts.join("\n\n");
  }

  static buildForSubAgent(tools: ToolDef[]): string {
    const toolDescriptions = tools
      .map(
        (t) =>
          `  - ${t.name}: ${t.description}（${t.isReadOnly ? "只读" : "写入"}）`,
      )
      .join("\n");

    return `# 角色定义

你是一个通用写作助手，负责执行分配给你的子任务。

## 工具使用指南

你可以使用以下工具：

${toolDescriptions}

## 工作规范

1. 专注于完成分配给你的任务
2. 使用工具获取所需信息
3. 返回清晰、简洁的结果
4. 如果遇到问题，明确说明原因`;
  }

  static buildForAgent(agentDef: AgentDefinition, tools: ToolDef[]): string {
    const toolDescriptions = tools
      .map(
        (t) =>
          `  - ${t.name}: ${t.description}（${t.isReadOnly ? "只读" : "写入"}）`,
      )
      .join("\n");

    return `${agentDef.systemPrompt}

## 工具使用指南

你可以使用以下工具：

${toolDescriptions}`;
  }
}
