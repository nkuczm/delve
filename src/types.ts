export interface Story {
  title: string
  description: string
  content?: string
  url?: string
  source?: string
  imageUrl?: string
  publishedAt?: string
  topic?: string
  isAIGenerated?: boolean
}

export type AppState = 'SEARCH' | 'VIEWING' | 'LOADING' | 'CHOOSING'

export type NavigationDirection = 'up' | 'down' | 'right'

export interface ChoiceContext {
  direction: NavigationDirection
  stories: Story[]
}
