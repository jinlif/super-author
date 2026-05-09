import type { FileEntry } from '../domain/types/file'
import type { IFileService } from './IFileService'

export class MockFileService implements IFileService {
  private files: Map<string, string> = new Map()
  private dirs: Set<string> = new Set()

  constructor() {
    this.dirs.add('/')
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path)
    if (content === undefined) {
      throw new Error(`ENOENT: ${path}`)
    }
    return content
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content)
    const dir = path.substring(0, path.lastIndexOf('/')) || '/'
    this.dirs.add(dir)
  }

  async readDir(path: string): Promise<FileEntry[]> {
    // 规范化 path，确保以 / 结尾
    const prefix = path.endsWith('/') ? path : `${path}/`
    const entries = new Map<string, FileEntry>()

    // 先处理目录，确保目录被正确标记
    for (const dirPath of this.dirs) {
      if (dirPath.startsWith(prefix) && dirPath !== prefix) {
        const rest = dirPath.substring(prefix.length)
        const name = rest.includes('/') ? rest.substring(0, rest.indexOf('/')) : rest
        if (name && !entries.has(name)) {
          entries.set(name, { name, path: dirPath, isDir: true })
        }
      }
    }

    // 后处理文件，避免覆盖目录标记
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefix)) {
        const rest = filePath.substring(prefix.length)
        const name = rest.includes('/') ? rest.substring(0, rest.indexOf('/')) : rest
        if (name && !entries.has(name)) {
          entries.set(name, { name, path: `${prefix}${name}`, isDir: false })
        }
      }
    }

    return Array.from(entries.values())
  }

  async createDir(path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean)
    let current = ''
    for (const part of parts) {
      current += `/${part}`
      this.dirs.add(current)
    }
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.dirs.has(path)
  }
}
