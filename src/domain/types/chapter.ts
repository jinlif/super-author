export interface Chapter {
  id: string
  bookId: string
  title: string
  order: number
  status: 'draft' | 'completed'
  wordCount: number
  filePath: string
  volume?: string
  createdAt: string
  updatedAt: string
}

export interface ChapterRevision {
  id: string
  chapterId: string
  content: string
  timestamp: string
  summary: string
}

export interface CreateChapterInput {
  bookId: string
  title: string
  order: number
}
