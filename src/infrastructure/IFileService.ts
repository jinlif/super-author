import type { FileEntry } from '../domain/types/file'

export interface IFileService {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  readDir(path: string): Promise<FileEntry[]>
  createDir(path: string): Promise<void>
  exists(path: string): Promise<boolean>
}
