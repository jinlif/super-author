export interface BookMeta {
  title: string
  author: string
  tags: string[]
  style: string
  dirDescriptions: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface Book {
  id: string
  title: string
  author: string
  cover?: string
  tags: string[]
  style: string
  directory: string
  dirDescriptions: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface CreateBookInput {
  title: string
  author: string
  tags?: string[]
  style?: string
}
