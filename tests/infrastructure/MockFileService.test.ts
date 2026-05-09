import { describe, expect, it } from 'vitest'
import { MockFileService } from '../../src/infrastructure/MockFileService'

describe('MockFileService', () => {
  it('writeFile 后 readFile 返回正确内容', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/test.txt', 'hello')
    expect(await fs.readFile('/test.txt')).toBe('hello')
  })

  it('readFile 不存在的文件抛出错误', async () => {
    const fs = new MockFileService()
    await expect(fs.readFile('/nonexistent.txt')).rejects.toThrow('ENOENT')
  })

  it('readDir 返回文件和目录', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/dir/a.txt', 'a')
    await fs.writeFile('/dir/b.txt', 'b')
    await fs.createDir('/dir/sub')
    const entries = await fs.readDir('/dir')
    expect(entries).toHaveLength(3)
    expect(entries.find((e) => e.name === 'a.txt')?.isDir).toBe(false)
    expect(entries.find((e) => e.name === 'sub')?.isDir).toBe(true)
  })

  it('exists 检测文件和目录', async () => {
    const fs = new MockFileService()
    await fs.writeFile('/a.txt', '')
    await fs.createDir('/b')
    expect(await fs.exists('/a.txt')).toBe(true)
    expect(await fs.exists('/b')).toBe(true)
    expect(await fs.exists('/c')).toBe(false)
  })

  it('createDir 创建多层目录', async () => {
    const fs = new MockFileService()
    await fs.createDir('/a/b/c')
    expect(await fs.exists('/a/b/c')).toBe(true)
    expect(await fs.exists('/a/b')).toBe(true)
    expect(await fs.exists('/a')).toBe(true)
  })
})
