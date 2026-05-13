import { beforeEach, describe, expect, it } from 'vitest'
import { ConversationStore } from '../../src/application/agent/ConversationStore'
import type { Conversation } from '../../src/domain/types/agent'
import { MockFileService } from '../../src/infrastructure/MockFileService'

describe('ConversationStore', () => {
  let fs: MockFileService
  let store: ConversationStore

  beforeEach(() => {
    fs = new MockFileService()
    store = new ConversationStore(fs)
  })

  it('应保存对话', async () => {
    const conv: Conversation = {
      id: 'conv-1',
      title: '测试对话',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      providerId: 'claude',
      modelId: 'claude-sonnet-4-20250514',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      version: 1,
    }

    await store.save('/book', conv)
    const loaded = await store.load('/book', 'conv-1')
    expect(loaded).not.toBeNull()
    expect(loaded?.title).toBe('测试对话')
    expect(loaded?.version).toBe(2)
    expect(loaded?.messages).toHaveLength(1)
  })

  it('加载不存在的对话应返回 null', async () => {
    const result = await store.load('/book', 'nonexistent')
    expect(result).toBeNull()
  })

  it('应列出对话', async () => {
    const conv1: Conversation = {
      id: 'conv-1',
      title: '对话1',
      messages: [],
      providerId: 'claude',
      modelId: 'model',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      version: 1,
    }
    const conv2: Conversation = {
      id: 'conv-2',
      title: '对话2',
      messages: [],
      providerId: 'openai',
      modelId: 'gpt-4o',
      createdAt: '2025-01-02T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z',
      version: 1,
    }

    await store.save('/book', conv1)
    await store.save('/book', conv2)
    const list = await store.list('/book')

    expect(list).toHaveLength(2)
    expect(list.map((c) => c.title).sort()).toEqual(['对话1', '对话2'])
  })

  it('应删除对话', async () => {
    const conv: Conversation = {
      id: 'conv-1',
      title: '待删除',
      messages: [],
      providerId: 'claude',
      modelId: 'model',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      version: 1,
    }

    await store.save('/book', conv)
    await store.delete('/book', 'conv-1')
    const loaded = await store.load('/book', 'conv-1')
    // 删除后文件内容被清空，JSON.parse 会失败
    expect(loaded).toBeNull()
  })
})
