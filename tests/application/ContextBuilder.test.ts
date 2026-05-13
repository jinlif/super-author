import { describe, expect, it } from 'vitest'
import { ContextBuilder } from '../../src/application/agent/ContextBuilder'
import { MockFileService } from '../../src/infrastructure/MockFileService'

describe('ContextBuilder', () => {
  it('应收集角色和大纲', async () => {
    const fs = new MockFileService()
    await fs.createDir('/book/characters')
    await fs.createDir('/book/outline')
    await fs.writeFile('/book/characters/张三.md', '姓名：张三')
    await fs.writeFile('/book/outline/outline.md', '# 大纲')

    const builder = new ContextBuilder(fs, '/book')
    const ctx = await builder.build(10000)

    expect(ctx.relevantCharacters).toContain('张三')
    expect(ctx.activeOutline).toContain('大纲')
  })

  it('无角色和大纲应返回空', async () => {
    const fs = new MockFileService()
    const builder = new ContextBuilder(fs, '/book')
    const ctx = await builder.build(10000)
    expect(ctx.relevantCharacters).toBeUndefined()
    expect(ctx.activeOutline).toBeUndefined()
  })

  it('应裁剪超预算的内容', () => {
    const builder = new ContextBuilder(new MockFileService(), '/book')
    const ctx = builder.fitToBudget(
      {
        currentChapter: 'x'.repeat(5000),
        relevantCharacters: '张三：主角',
        activeOutline: '# 大纲...',
      },
      1000,
    )
    // currentChapter 应被截断
    expect(ctx.currentChapter?.length).toBeLessThan(5000)
    expect(ctx.currentChapter).toContain('...（内容因长度限制已截断）')
  })
})
