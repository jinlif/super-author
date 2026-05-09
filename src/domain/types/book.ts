export interface BookMeta {
  title: string
  author: string
  description: string
  tags: string[]
  style: string
  createdAt: string
  updatedAt: string
}

export interface Book {
  id: string
  title: string
  author: string
  description: string
  cover?: string
  tags: string[]
  style: string
  directory: string
  createdAt: string
  updatedAt: string
}

export interface CreateBookInput {
  title: string
  author: string
  description?: string
  tags?: string[]
  style?: string
}
