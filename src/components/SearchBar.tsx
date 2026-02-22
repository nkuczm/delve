import { useState, FormEvent, useEffect, useRef } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  error: string | null
}

const EXAMPLE_TOPICS = [
  'artificial intelligence',
  'climate change',
  'global economy',
  'space exploration',
  'renewable energy',
  'geopolitics',
]

export default function SearchBar({ onSearch, error }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [placeholder, setPlaceholder] = useState(EXAMPLE_TOPICS[0])
  const inputRef = useRef<HTMLInputElement>(null)

  // Cycle through example topics as placeholder
  useEffect(() => {
    let i = 1
    const interval = setInterval(() => {
      setPlaceholder(EXAMPLE_TOPICS[i % EXAMPLE_TOPICS.length])
      i++
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) onSearch(trimmed)
  }

  return (
    <div className="search-screen">
      <div className="search-content">
        <div className="logo-area">
          <h1 className="app-title">delve</h1>
          <p className="app-tagline">Navigate news at every level of depth</p>
        </div>

        <form className="search-form" onSubmit={handleSubmit}>
          <div className="search-input-wrapper">
            <span className="search-icon">⌕</span>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button type="submit" className="search-button" disabled={!query.trim()}>
            Explore
          </button>
        </form>

        {error && <p className="search-error">{error}</p>}

        <div className="gesture-guide">
          <div className="gesture-item">
            <span className="gesture-arrow">↑</span>
            <span className="gesture-label">Swipe up for broader context & trends</span>
          </div>
          <div className="gesture-item">
            <span className="gesture-arrow">↓</span>
            <span className="gesture-label">Swipe down for specific details</span>
          </div>
          <div className="gesture-item">
            <span className="gesture-arrow">→</span>
            <span className="gesture-label">Swipe right for an alternative story</span>
          </div>
          <div className="gesture-item">
            <span className="gesture-arrow">←</span>
            <span className="gesture-label">Swipe left to go back</span>
          </div>
        </div>
      </div>
    </div>
  )
}
