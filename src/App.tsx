import { useState, useCallback, useEffect, useRef } from 'react'
import { Story, AppState, NavigationDirection, ChoiceContext, PreloadCache } from './types'
import SearchBar from './components/SearchBar'
import StoryView from './components/StoryView'
import ChoiceCards from './components/ChoiceCards'
import LoadingOverlay from './components/LoadingOverlay'

async function fetchNavigation(
  currentStory: Story,
  direction: NavigationDirection,
  searchQuery: string,
  signal?: AbortSignal
): Promise<Story[]> {
  const res = await fetch('/api/navigate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentStory, direction, searchQuery }),
    signal,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Navigation failed')
  if (!data.stories || data.stories.length === 0) {
    throw new Error('Could not generate stories. Please try again.')
  }
  return data.stories as Story[]
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('SEARCH')
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [history, setHistory] = useState<Story[]>([])
  const [choiceContext, setChoiceContext] = useState<ChoiceContext | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Pre-load cache: keyed by direction, holds resolved stories (or null on failure)
  const preloadCache = useRef<PreloadCache>({})
  const preloadAbort = useRef<AbortController | null>(null)

  // ── Pre-load adjacent stories whenever a new story is displayed ─────────────
  useEffect(() => {
    if (!currentStory || appState !== 'VIEWING') return

    // Cancel any in-flight preloads from the previous story
    preloadAbort.current?.abort()
    const abort = new AbortController()
    preloadAbort.current = abort

    // Clear stale cache
    preloadCache.current = {}

    const directions: NavigationDirection[] = ['up', 'down', 'right']
    directions.forEach(async (dir) => {
      try {
        const stories = await fetchNavigation(currentStory, dir, searchQuery, abort.signal)
        if (!abort.signal.aborted) {
          preloadCache.current[dir] = stories
        }
      } catch {
        // Silently fail – handleNavigate will do a fresh fetch as fallback
      }
    })

    return () => { abort.abort() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStory?.title, appState === 'VIEWING'])

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

    // Check preload cache first – use instantly if available
    const cached = preloadCache.current[direction]
    if (cached && cached.length > 0) {
      preloadCache.current[direction] = undefined
      if (direction === 'right') {
        setHistory(h => [...h, currentStory])
        setCurrentStory(cached[0])
        setAppState('VIEWING')
      } else {
        setChoiceContext({ direction, stories: cached })
        setAppState('CHOOSING')
      }
      return
    }

    // Cache miss – fall back to live fetch with loading overlay
    const messages: Record<string, string> = {
      up: 'Zooming out to bigger picture…',
      down: 'Zooming in to details…',
      right: 'Finding an alternative story…',
    }

    setLoadingMessage(messages[direction])
    setAppState('LOADING')
    setError(null)

    try {
      const stories = await fetchNavigation(currentStory, direction, searchQuery)

      if (direction === 'right') {
        setHistory(h => [...h, currentStory])
        setCurrentStory(stories[0])
        setAppState('VIEWING')
      } else {
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
    preloadAbort.current?.abort()
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
