import { useEffect, useCallback, useRef } from 'react'
import { useSwipeable } from 'react-swipeable'
import { Story, NavigationDirection } from '../types'

interface StoryViewProps {
  story: Story
  onNavigate: (direction: NavigationDirection | 'left') => void
  onBackToSearch: () => void
  canGoBack: boolean
  isInteractive: boolean
}

export default function StoryView({
  story,
  onNavigate,
  onBackToSearch,
  canGoBack,
  isInteractive,
}: StoryViewProps) {
  const lastSwipeTime = useRef(0)

  const navigate = useCallback((dir: NavigationDirection | 'left') => {
    if (!isInteractive) return
    const now = Date.now()
    if (now - lastSwipeTime.current < 800) return // debounce
    lastSwipeTime.current = now
    onNavigate(dir)
  }, [isInteractive, onNavigate])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isInteractive) return
      if (e.target instanceof HTMLInputElement) return
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          navigate('up')
          break
        case 'ArrowDown':
          e.preventDefault()
          navigate('down')
          break
        case 'ArrowRight':
          e.preventDefault()
          navigate('right')
          break
        case 'ArrowLeft':
          e.preventDefault()
          navigate('left')
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isInteractive, navigate])

  // Touch/mouse swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedUp: () => navigate('up'),
    onSwipedDown: () => navigate('down'),
    onSwipedRight: () => navigate('right'),
    onSwipedLeft: () => navigate('left'),
    swipeDuration: 500,
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 50,
  })

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const bgStyle = story.imageUrl
    ? { backgroundImage: `url(${story.imageUrl})` }
    : {}

  return (
    <div
      className={`story-view ${story.imageUrl ? 'has-image' : ''}`}
      style={bgStyle}
      {...swipeHandlers}
    >
      <div className="story-overlay" />

      {/* Top bar */}
      <div className="story-top-bar">
        <button
          className="back-to-search-btn"
          onClick={onBackToSearch}
          title="New search"
        >
          ⌕
        </button>
        {story.isAIGenerated && (
          <span className="ai-badge">AI Generated</span>
        )}
      </div>

      {/* Story content */}
      <div className="story-content">
        <div className="story-meta">
          {story.source && <span className="story-source">{story.source}</span>}
          {story.publishedAt && (
            <span className="story-date">{formatDate(story.publishedAt)}</span>
          )}
        </div>

        <h1 className="story-title">{story.title}</h1>

        {story.description && (
          <p className="story-description">{story.description}</p>
        )}

        {story.url && !story.isAIGenerated && (
          <a
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="story-link"
            onClick={e => e.stopPropagation()}
          >
            Read full article ↗
          </a>
        )}
      </div>

      {/* Navigation hints */}
      <div className="nav-hints">
        <div className="nav-hint nav-hint-up" onClick={() => navigate('up')}>
          <span className="nav-hint-arrow">↑</span>
          <span className="nav-hint-label">Bigger picture</span>
        </div>

        <div className="nav-hint-row">
          <div
            className={`nav-hint nav-hint-left ${!canGoBack ? 'nav-hint-disabled' : ''}`}
            onClick={() => canGoBack && navigate('left')}
          >
            <span className="nav-hint-arrow">←</span>
            <span className="nav-hint-label">Back</span>
          </div>

          <div className="nav-hint-center">
            <div className="nav-dot active" />
          </div>

          <div className="nav-hint nav-hint-right" onClick={() => navigate('right')}>
            <span className="nav-hint-label">Alternative</span>
            <span className="nav-hint-arrow">→</span>
          </div>
        </div>

        <div className="nav-hint nav-hint-down" onClick={() => navigate('down')}>
          <span className="nav-hint-arrow">↓</span>
          <span className="nav-hint-label">Zoom in</span>
        </div>
      </div>
    </div>
  )
}
