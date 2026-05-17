import type { FileMentionItem, FileType } from "../../domain/types/fileMention";
export type { FileMentionItem };
import { useBookStore } from "../stores/bookStore";

const FILE_TYPE_LABELS: Record<string, FileType> = {
  chapters: "chapter",
  chapter: "chapter",
  characters: "character",
  character: "character",
  char: "character",
  outline: "outline",
  outlines: "outline",
  setting: "setting",
  settings: "setting",
};

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".mdoc"]);

interface CacheEntry {
  files: FileMentionItem[]
  bookDir: string
}

let indexCache: CacheEntry | null = null

export class FileMentionService {
  // 从路径推断文件类型
  private static inferFileTypeFromPath(path: string): FileType {
    const lowerPath = path.toLowerCase()
    for (const [keyword, type] of Object.entries(FILE_TYPE_LABELS)) {
      if (lowerPath.includes(keyword)) {
        return type
      }
    }
    return "other"
  }

  // 从文件名提取标题（保留完整文件名含后缀）
  private static fileNameToTitle(name: string): string {
    return name
  }

  // 递归扫描目录
  private static async scanDir(
    dirPath: string,
    bookDir: string,
    fs: {
      exists: (p: string) => Promise<boolean>
      readDir: (p: string) => Promise<{ name: string; path: string; isDir: boolean }[]>
    },
    results: FileMentionItem[],
  ): Promise<void> {
    let entries: { name: string; path: string; isDir: boolean }[]
    try {
      entries = await fs.readDir(dirPath)
    } catch {
      return
    }

    // 统一路径为正斜杠，避免 Windows 反斜杠混用导致去重失败
    const normalized = entries.map((e) => ({ ...e, path: e.path.replace(/\\/g, '/') }))

    for (const entry of normalized) {
      const filePath = entry.path

      if (entry.isDir) {
        // 跳过系统目录和隐藏目录
        if (entry.name === ".super-author" || entry.name.startsWith(".")) continue
        await this.scanDir(filePath, bookDir, fs, results)
        continue
      }

      // 跳过系统文件
      if (entry.name === "book.json" || entry.name.startsWith(".")) continue
      if (entry.name.endsWith(".json")) continue

      // 只包含文本文件
      const ext = entry.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? ""
      if (!TEXT_EXTENSIONS.has(ext)) continue

      // 路径必须位于 bookDir 内
      if (!filePath.startsWith(bookDir)) continue

      const title = this.fileNameToTitle(entry.name)

      results.push({
        id: filePath,
        type: this.inferFileTypeFromPath(filePath),
        title,
        filePath,
      })
    }
  }

  // 使缓存失效
  static invalidateCache(): void {
    indexCache = null
  }

  // 获取书籍目录下所有可搜索的文件
  static async getSearchableFiles(): Promise<FileMentionItem[]> {
    const bookStore = useBookStore.getState()
    const { chapters, currentBook } = bookStore

    if (!currentBook) return []

    const bookDir = currentBook.directory.replace(/\\/g, '/')

    // 缓存命中（同一本书的目录）
    if (indexCache && indexCache.bookDir === bookDir) {
      return indexCache.files
    }

    const items: FileMentionItem[] = []

    // 添加章节（从 chapters 列表）
    chapters.forEach((ch) => {
      const path = ch.filePath.replace(/\\/g, '/')
      const fileName = path.split('/').pop() ?? ''
      items.push({
        id: ch.id,
        type: 'chapter',
        title: fileName || ch.title, // 用文件名（含后缀），fallback 到 store 的标题
        filePath: path,
        volume: ch.volume,
      })
    })

    // 递归扫描 bookDir
    await this.scanDir(bookDir, bookDir, bookStore._fs, items)

    // 去重（章节可能已被文件扫描再次添加）
    const seen = new Set<string>()
    const deduped = items.filter((item) => {
      if (seen.has(item.filePath)) return false
      seen.add(item.filePath)
      return true
    })

    indexCache = { files: deduped, bookDir }
    return deduped
  }

  // 搜索文件
  static async searchFiles(query: string): Promise<FileMentionItem[]> {
    const files = await this.getSearchableFiles()
    const q = query.toLowerCase().trim()

    if (!q) return files

    return files.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        (f.volume?.toLowerCase().includes(q) ?? false) ||
        f.type.toLowerCase().includes(q) ||
        f.filePath.toLowerCase().includes(q),
    )
  }

  // 列出指定相对路径下的文件和目录（一级，非递归）
  static async listDirectory(relativePath: string): Promise<FileMentionItem[]> {
    const bookStore = useBookStore.getState()
    const { currentBook } = bookStore

    if (!currentBook) return []

    const bookDir = currentBook.directory.replace(/\\/g, '/')
    const absDir = relativePath ? `${bookDir}/${relativePath}` : bookDir

    let entries: { name: string; path: string; isDir: boolean }[]
    try {
      entries = await bookStore._fs.readDir(absDir)
    } catch {
      return []
    }

    // 统一路径为正斜杠
    const normalized = entries.map((e) => ({ ...e, path: e.path.replace(/\\/g, '/') }))

    const items: FileMentionItem[] = []

    for (const entry of normalized) {
      const filePath = entry.path
      const relativeDir = relativePath || ''

      if (entry.isDir) {
        // 跳过系统目录和隐藏目录
        if (entry.name === '.super-author' || entry.name.startsWith('.')) continue
        items.push({
          id: filePath,
          type: this.inferFileTypeFromPath(filePath),
          title: entry.name,
          filePath,
          isDir: true,
          relativeDir,
        })
      } else {
        // 跳过系统文件
        if (entry.name === 'book.json' || entry.name.startsWith('.')) continue
        if (entry.name.endsWith('.json')) continue

        // 只包含文本文件
        const ext = entry.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? ''
        if (!TEXT_EXTENSIONS.has(ext)) continue

        items.push({
          id: filePath,
          type: this.inferFileTypeFromPath(filePath),
          title: entry.name, // 完整文件名（含后缀）
          filePath,
          relativeDir,
        })
      }
    }

    // 排序：目录在前，文件在后，各自按名称排序
    items.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.title.localeCompare(b.title, 'zh-CN')
    })

    return items
  }

  // 读取文件内容
  static async readFileContent(filePath: string): Promise<string | null> {
    const bookStore = useBookStore.getState()
    try {
      const exists = await bookStore._fs.exists(filePath)
      if (!exists) return null
      return await bookStore._fs.readFile(filePath)
    } catch {
      return null
    }
  }
}
