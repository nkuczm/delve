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

  // Left/right swipes only — vertical is used for scrolling the article
  const swipeHandlers = useSwipeable({
    onSwipedRight: () => navigate('right'),
    onSwipedLeft: () => navigate('left'),
    swipeDuration: 500,
    preventScrollOnSwipe: false,
    trackMouse: false,
    delta: 60,
  })

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Full readable text: prefer body, fall back to content, then description
  const fullText = story.body || story.content || story.description || ''

  return (
    <div className="story-view" {...swipeHandlers}>

      {/* Fixed header */}
      <div className="story-top-bar">
        <button
          className="back-to-search-btn"
          onClick={onBackToSearch}
          title="New search"
        >
          ⌕
        </button>
        <div className="story-masthead">
          {story.source && <span className="story-source">{story.source}</span>}
          {story.isAIGenerated && <span className="ai-badge">AI</span>}
        </div>
      </div>

      {/* Scrollable article body */}
      <div className="story-scroll">
        <article className="story-article">

          {story.imageUrl && (
            <div className="story-image-wrap">
              <img
                className="story-image"
                src={story.imageUrl}
                alt=""
                loading="lazy"
              />
            </div>
          )}

          <div className="story-meta">
            {story.publishedAt && (
              <span className="story-date">{formatDate(story.publishedAt)}</span>
            )}
            {story.topic && (
              <span className="story-topic">{story.topic}</span>
            )}
          </div>

          <h1 className="story-title">{story.title}</h1>

          <div className="story-rule" />

          <div className="story-body">
            {fullText.split('\n').filter(p => p.trim()).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {story.url && !story.isAIGenerated && (
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="story-link"
              onClick={e => e.stopPropagation()}
            >
              Read original article ↗
            </a>
          )}
        </article>
      </div>

      {/* Fixed navigation footer */}
      <div className="nav-hints">
        <div
          className="nav-hint nav-hint-up"
          onClick={() => navigate('up')}
          role="button"
          tabIndex={0}
        >
          <span className="nav-hint-arrow">↑</span>
          <span className="nav-hint-label">Bigger picture</span>
        </div>

        <div className="nav-hint-row">
          <div
            className={`nav-hint nav-hint-left ${!canGoBack ? 'nav-hint-disabled' : ''}`}
            onClick={() => canGoBack && navigate('left')}
            role="button"
            tabIndex={canGoBack ? 0 : -1}
          >
            <span className="nav-hint-arrow">←</span>
            <span className="nav-hint-label">Back</span>
          </div>

          <div className="nav-hint-center">
            <div className="nav-dot active" />
          </div>

          <div
            className="nav-hint nav-hint-right"
            onClick={() => navigate('right')}
            role="button"
            tabIndex={0}
          >
            <span className="nav-hint-label">Alternative</span>
            <span className="nav-hint-arrow">→</span>
          </div>
        </div>

        <div
          className="nav-hint nav-hint-down"
          onClick={() => navigate('down')}
          role="button"
          tabIndex={0}
        >
          <span className="nav-hint-arrow">↓</span>
          <span className="nav-hint-label">Zoom in</span>
        </div>
      </div>
    </div>
  )
}
