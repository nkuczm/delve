import { useState, useCallback } from 'react'
import { Story, AppState, NavigationDirection, ChoiceContext } from './types'
import SearchBar from './components/SearchBar'
import StoryView from './components/StoryView'
import ChoiceCards from './components/ChoiceCards'
import LoadingOverlay from './components/LoadingOverlay'

export default function App() {
  const [appState, setAppState] = useState<AppState>('SEARCH')
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [history, setHistory] = useState<Story[]>([])
  const [choiceContext, setChoiceContext] = useState<ChoiceContext | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // ── Initial search ──────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    setError(null)
    setLoadingMessage(`Searching for "${query}"…`)
    setAppState('LOADING')

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')

      const articles: Story[] = data.articles
      if (!articles || articles.length === 0) {
        throw new Error('No articles found. Try a different search term.')
      }

      setCurrentStory(articles[0])
      setHistory([])
      setAppState('VIEWING')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setAppState('SEARCH')
    }
  }, [])

  // ── Navigate via swipe ──────────────────────────────────────────────────────
  const handleNavigate = useCallback(async (direction: NavigationDirection | 'left') => {
    if (!currentStory) return

    // Swipe left = go back in history
    if (direction === 'left') {
      if (history.length === 0) return
      const prev = history[history.length - 1]
      setHistory(h => h.slice(0, -1))
      setCurrentStory(prev)
      return
    }

    const messages: Record<string, string> = {
      up: 'Zooming out to bigger picture…',
      down: 'Zooming in to details…',
      right: 'Finding an alternative story…',
    }

    setLoadingMessage(messages[direction])
    setAppState('LOADING')
    setError(null)

    try {
      const res = await fetch('/api/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStory, direction, searchQuery }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Navigation failed')

      const stories: Story[] = data.stories
      if (!stories || stories.length === 0) {
        throw new Error('Could not generate stories. Please try again.')
      }

      if (direction === 'right') {
        // Immediately switch to the alternative story
        setHistory(h => [...h, currentStory])
        setCurrentStory(stories[0])
        setAppState('VIEWING')
      } else {
        // Show choice cards for up/down
        setChoiceContext({ direction, stories })
        setAppState('CHOOSING')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Navigation failed')
      setAppState('VIEWING')
    }
  }, [currentStory, history, searchQuery])

  // ── Select a story from choice cards ───────────────────────────────────────
  const handleChoose = useCallback((story: Story) => {
    if (!currentStory) return
    setHistory(h => [...h, currentStory])
    setCurrentStory(story)
    setChoiceContext(null)
    setAppState('VIEWING')
  }, [currentStory])

  // ── Dismiss choice cards ────────────────────────────────────────────────────
  const handleDismissChoices = useCallback(() => {
    setChoiceContext(null)
    setAppState('VIEWING')
  }, [])

  // ── Go back to search ───────────────────────────────────────────────────────
  const handleBackToSearch = useCallback(() => {
    setAppState('SEARCH')
    setCurrentStory(null)
    setHistory([])
    setChoiceContext(null)
    setError(null)
  }, [])

  return (
    <div className="app">
      {appState === 'SEARCH' && (
        <SearchBar onSearch={handleSearch} error={error} />
      )}

      {(appState === 'VIEWING' || appState === 'LOADING' || appState === 'CHOOSING') && currentStory && (
        <StoryView
          story={currentStory}
          onNavigate={handleNavigate}
          onBackToSearch={handleBackToSearch}
          canGoBack={history.length > 0}
          isInteractive={appState === 'VIEWING'}
        />
      )}

      {appState === 'LOADING' && (
        <LoadingOverlay message={loadingMessage} />
      )}

      {appState === 'CHOOSING' && choiceContext && (
        <ChoiceCards
          context={choiceContext}
          onChoose={handleChoose}
          onDismiss={handleDismissChoices}
        />
      )}

      {error && appState !== 'SEARCH' && (
        <div className="error-toast" onClick={() => setError(null)}>
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
