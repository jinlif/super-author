import type { IFileService } from '../../infrastructure/IFileService'

export interface WritingContextData {
  currentChapter?: string
  relevantCharacters?: string
  activeOutline?: string
}

/**
 * 估算字符串的 token 数（按中文约 1.5 字/token，英文约 3.5 字/token 粗略估计）
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[一-鿿㐀-䶿]/g) || []).length
  const otherChars = text.length - chineseChars
  return Math.ceil(chineseChars / 1.5 + otherChars / 3.5)
}

const DEFAULT_MAX_TOKENS = 6000

export class ContextBuilder {
  constructor(
    private fs: IFileService,
    private bookDir: string,
  ) {}

  async build(maxTokens = DEFAULT_MAX_TOKENS): Promise<WritingContextData> {
    const context: WritingContextData = {}

    // 收集当前章节
    context.currentChapter = await this.collectCurrentChapter()

    // 收集角色信息
    context.relevantCharacters = await this.collectCharacters()

    // 收集大纲
    context.activeOutline = await this.collectOutline()

    // Token 预算裁剪
    return this.fitToBudget(context, maxTokens)
  }

  private async collectCurrentChapter(): Promise<string | undefined> {
    // 由于 ContextBuilder 在 application 层不依赖 editor store，
    // currentChapter 由调用方传入，此方法保留用于从文件读取
    // 当前章节内容由 AgentStore 的 sendMessage 方法传入
    return undefined
  }

  private async collectCharacters(): Promise<string | undefined> {
    try {
      const charactersDir = `${this.bookDir}/characters`
      if (!(await this.fs.exists(charactersDir))) return undefined

      const entries = await this.fs.readDir(charactersDir)
      const files = entries.filter((e) => !e.isDir && e.name.endsWith('.md'))
      if (files.length === 0) return undefined

      const chars: string[] = []
      for (const f of files.slice(0, 5)) {
        try {
          const content = await this.fs.readFile(f.path)
          chars.push(`${f.name}:\n${content.trim()}`)
        } catch {
          // 跳过不可读文件
        }
      }

      return chars.length > 0 ? chars.join('\n\n') : undefined
    } catch {
      return undefined
    }
  }

  private async collectOutline(): Promise<string | undefined> {
    try {
      const outlinePath = `${this.bookDir}/outline/outline.md`
      if (!(await this.fs.exists(outlinePath))) return undefined
      return await this.fs.readFile(outlinePath)
    } catch {
      return undefined
    }
  }

  fitToBudget(context: WritingContextData, maxTokens: number): WritingContextData {
    const result: WritingContextData = { ...context }

    // 优先级：当前章节 > 角色卡 > 大纲
    // 当前章节内容由外部传入，裁剪时优先保留

    if (result.currentChapter) {
      const tokens = estimateTokens(result.currentChapter)
      if (tokens > maxTokens) {
        result.currentChapter = this.truncateText(result.currentChapter, maxTokens)
      }
    }

    if (result.relevantCharacters) {
      const remaining =
        maxTokens - (result.currentChapter ? estimateTokens(result.currentChapter) : 0)
      if (remaining <= 0) {
        delete result.relevantCharacters
      }
    }

    if (result.activeOutline) {
      const used =
        estimateTokens(result.currentChapter || '') +
        estimateTokens(result.relevantCharacters || '')
      const remaining = maxTokens - used
      if (remaining <= 0) {
        delete result.activeOutline
      } else if (estimateTokens(result.activeOutline) > remaining) {
        result.activeOutline = this.truncateText(result.activeOutline, remaining)
      }
    }

    return result
  }

  private truncateText(text: string, maxTokens: number): string {
    // 按 token 预算截断，保留开头部分并加提示
    const ratio = maxTokens / estimateTokens(text)
    if (ratio >= 1) return text
    const charLimit = Math.floor(text.length * ratio * 0.8)
    return `${text.slice(0, charLimit)}\n\n...（内容因长度限制已截断）`
  }
}
