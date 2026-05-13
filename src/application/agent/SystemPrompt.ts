import type { ToolDef } from '../../domain/types/tool'

export interface WritingContext {
  currentChapter?: string
  characters?: string
  outline?: string
}

export class SystemPrompt {
  static build(tools: ToolDef[], context?: WritingContext): string {
    const toolDescriptions = tools
      .map((t) => `  - ${t.name}: ${t.description}（${t.isReadOnly ? '只读' : '写入'}）`)
      .join('\n')

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
2. 需要获取角色信息时使用 get_characters
3. 创作前先 check 大纲 (read_outline)
4. 完成内容后写入章节 (write_chapter)

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
    ]

    if (context) {
      const ctxParts: string[] = []

      if (context.currentChapter) {
        ctxParts.push(`## 当前章节内容\n\n${context.currentChapter}`)
      }

      if (context.characters) {
        ctxParts.push(`## 角色信息\n\n${context.characters}`)
      }

      if (context.outline) {
        ctxParts.push(`## 大纲信息\n\n${context.outline}`)
      }

      if (ctxParts.length > 0) {
        parts.push(`## 写作上下文\n\n${ctxParts.join('\n\n')}`)
      }
    }

    return parts.join('\n\n')
  }
}
