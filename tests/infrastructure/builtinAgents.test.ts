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

import { loadBuiltinCommands } from '../../src/infrastructure/builtinCommands'

describe('loadBuiltinCommands', () => {
  it('应加载至少一个内置命令', () => {
    const cmds = loadBuiltinCommands()
    expect(cmds.length).toBeGreaterThanOrEqual(1)
  })

  it('应包含 ai-detect 命令', () => {
    const cmds = loadBuiltinCommands()
    const detect = cmds.find((c) => c.name === 'ai-detect')
    expect(detect).toBeDefined()
    expect(detect!.description).toBe('检测文本是否为 AI 生成')
    expect(detect!.prompt).toContain('ai-detector')
  })
})
