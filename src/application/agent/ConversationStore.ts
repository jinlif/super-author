import type { Conversation, ConversationSummary } from '../../domain/types/agent'
import type { IFileService } from '../../infrastructure/IFileService'

export class ConversationStore {
  constructor(
    private fs: IFileService,
    private historyDir: string,
  ) {}

  private getDir(bookDir: string): string {
    // 从 bookDir 提取书籍目录名作为子目录
    const bookName = bookDir.replace(/\\/g, '/').split('/').pop() ?? 'default'
    return `${this.historyDir}/${bookName}`
  }

  private getPath(bookDir: string, id: string): string {
    return `${this.getDir(bookDir)}/${id}.json`
  }

  async save(bookDir: string, conversation: Conversation): Promise<void> {
    const dir = this.getDir(bookDir)
    if (!(await this.fs.exists(dir))) {
      await this.fs.createDir(dir)
    }

    const updated = {
      ...conversation,
      updatedAt: new Date().toISOString(),
      version: (conversation.version || 0) + 1,
    }

    await this.fs.writeFile(
      this.getPath(bookDir, conversation.id),
      JSON.stringify(updated, null, 2),
    )
  }

  async load(bookDir: string, id: string): Promise<Conversation | null> {
    try {
      const content = await this.fs.readFile(this.getPath(bookDir, id))
      return JSON.parse(content) as Conversation
    } catch {
      return null
    }
  }

  async list(bookDir: string): Promise<ConversationSummary[]> {
    try {
      const dir = this.getDir(bookDir)
      if (!(await this.fs.exists(dir))) return []

      const entries = await this.fs.readDir(dir)
      const summaries: ConversationSummary[] = []

      for (const entry of entries) {
        if (!entry.isDir && entry.name.endsWith('.json')) {
          try {
            const content = await this.fs.readFile(entry.path)
            const conv = JSON.parse(content) as Conversation
            summaries.push({
              id: conv.id,
              title: conv.title,
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt,
            })
          } catch {
            // 跳过损坏的文件
          }
        }
      }

      return summaries.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
    } catch {
      return []
    }
  }

  async delete(bookDir: string, id: string): Promise<void> {
    try {
      await this.fs.remove(this.getPath(bookDir, id))
    } catch {
      // 文件不存在视为删除成功
    }
  }
}
