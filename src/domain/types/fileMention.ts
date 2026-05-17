// 文件附件提及相关类型

export type FileType = 'chapter' | 'character' | 'outline' | 'setting' | 'other'

export interface FileMentionItem {
  id: string
  type: FileType
  title: string
  filePath: string
  volume?: string
  isDir?: boolean
  relativeDir?: string
}

export interface SelectedMention {
  item: FileMentionItem
  displayText: string
}