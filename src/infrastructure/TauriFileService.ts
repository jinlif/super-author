import { invoke } from '@tauri-apps/api/core'
import type { IFileService } from './IFileService'
import type { FileEntry } from '../domain/types/file'

export class TauriFileService implements IFileService {
  async readFile(path: string): Promise<string> {
    return invoke<string>('read_file', { path })
  }

  async writeFile(path: string, content: string): Promise<void> {
    return invoke<void>('write_file', { path, content })
  }

  async readDir(path: string): Promise<FileEntry[]> {
    return invoke<FileEntry[]>('read_dir', { path })
  }

  async createDir(path: string): Promise<void> {
    return invoke<void>('create_dir', { path })
  }

  async exists(path: string): Promise<boolean> {
    return invoke<boolean>('path_exists', { path })
  }
}
