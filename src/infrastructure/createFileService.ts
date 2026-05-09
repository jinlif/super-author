import type { IFileService } from './IFileService'
import { MockFileService } from './MockFileService'
import { TauriFileService } from './TauriFileService'

export function createFileService(): IFileService {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return new TauriFileService()
  }
  return new MockFileService()
}
