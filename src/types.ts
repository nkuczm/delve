export interface Story {
  title: string
  description: string
  body?: string
  content?: string
  url?: string
  source?: string
  imageUrl?: string
  publishedAt?: string
  topic?: string
  isAIGenerated?: boolean
}

export interface PreloadCache {
  up?: Story[]
  down?: Story[]
  right?: Story[]
}

export type AppState = 'SEARCH' | 'VIEWING' | 'LOADING' | 'CHOOSING'

export type NavigationDirection = 'up' | 'down' | 'right'

export interface ChoiceContext {
  direction: NavigationDirection
  stories: Story[]
}
