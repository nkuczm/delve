import { useEffect } from 'react'
import { ChoiceContext, Story } from '../types'

interface ChoiceCardsProps {
  context: ChoiceContext
  onChoose: (story: Story) => void
  onDismiss: () => void
}

const DIRECTION_LABELS = {
  up: {
    icon: '↑',
    title: 'Zooming out',
    subtitle: 'Choose a broader perspective',
    accent: '#6c8ebf',
  },
  down: {
    icon: '↓',
    title: 'Zooming in',
    subtitle: 'Choose a specific angle',
    accent: '#82b366',
  },
}

export default function ChoiceCards({ context, onChoose, onDismiss }: ChoiceCardsProps) {
  const { direction, stories } = context
  const meta = DIRECTION_LABELS[direction as keyof typeof DIRECTION_LABELS]

  // Dismiss on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onDismiss])

  return (
    <div className="choice-overlay" onClick={onDismiss}>
      <div className="choice-panel" onClick={e => e.stopPropagation()}>
        <div className="choice-header">
          <span className="choice-direction-icon" style={{ color: meta?.accent }}>
            {meta?.icon}
          </span>
          <div>
            <h2 className="choice-title">{meta?.title}</h2>
            <p className="choice-subtitle">{meta?.subtitle}</p>
          </div>
          <button className="choice-close" onClick={onDismiss} title="Go back">
            ✕
          </button>
        </div>

        <div className="choice-cards">
          {stories.map((story, i) => (
            <button
              key={i}
              className="choice-card"
              onClick={() => onChoose(story)}
            >
              <div className="choice-card-number">{i + 1}</div>
              <div className="choice-card-body">
                <h3 className="choice-card-title">{story.title}</h3>
                {story.description && (
                  <p className="choice-card-desc">{story.description}</p>
                )}
                {story.source && (
                  <span className="choice-card-source">{story.source}</span>
                )}
              </div>
              <span className="choice-card-arrow">→</span>
            </button>
          ))}
        </div>

        <p className="choice-dismiss-hint">Tap anywhere outside to stay here · Esc to cancel</p>
      </div>
    </div>
  )
}
