import { serializeTldrawJsonBlob, useValue, type Editor } from 'tldraw'
import { cycleColorScheme, getColorScheme } from './colorScheme'
import { slides } from './deck'
import { currentSlideIndex, currentStep, goToSlide, next, prev, stepCount } from './navigation'
import { relockBuilt, resetDeck, unlockAll } from './reconcile'

export function Nav({ editor }: { editor: Editor }) {
  const index = useValue('slide index', () => currentSlideIndex(editor), [editor])
  const step = useValue('slide step', () => currentStep(), [])
  const total = slides.length
  const current = slides[index]
  const steps = stepCount(index)
  const atStart = index <= 0 && step <= 0
  const atEnd = index >= total - 1 && step >= steps - 1

  return (
    <div className="deck-nav" role="navigation" aria-label="Slides">
      <button className="deck-btn" onClick={() => prev(editor)} disabled={atStart} title="Previous (←, PageUp)">
        ‹
      </button>
      <span className="deck-nav__label">
        <span className="deck-nav__count">
          {index < 0 ? '–' : index + 1} / {total}
          {steps > 1 && (
            <span className="deck-nav__step">
              {' · '}
              {step + 1}/{steps}
            </span>
          )}
        </span>
        <span className="deck-nav__title">{current?.title ?? 'not a slide'}</span>
      </span>
      <button className="deck-btn" onClick={() => next(editor)} disabled={atEnd} title="Next (→, Space, PageDown)">
        ›
      </button>
    </div>
  )
}

const SCHEME_LABEL = { system: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' } as const

export function DeckMenu({ editor }: { editor: Editor }) {
  const scheme = useValue('color scheme', () => getColorScheme(editor), [editor])

  const exportTldr = async () => {
    const blob = await serializeTldrawJsonBlob(editor)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agents-course-${new Date().toISOString().slice(0, 10)}.tldr`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const reset = () => {
    if (!window.confirm('Reset deck? This deletes EVERY shape on every page (including your annotations) and rebuilds the slides.')) return
    resetDeck(editor)
    goToSlide(editor, 0)
  }

  return (
    <div className="deck-menu">
      <button className="deck-btn" onClick={() => cycleColorScheme(editor)} title="Cycle system → light → dark (C)">
        {SCHEME_LABEL[scheme]}
      </button>
      <button className="deck-btn" onClick={() => unlockAll(editor)} title="Unlock every shape on this page so you can move it">
        Unlock all
      </button>
      <button className="deck-btn" onClick={() => relockBuilt(editor)} title="Put the built shapes back where the source says, locked">
        Relock built
      </button>
      <button className="deck-btn" onClick={exportTldr} title="Download the whole document as a .tldr file">
        Export .tldr
      </button>
      <button className="deck-btn deck-btn--danger" onClick={reset} title="Delete everything and rebuild the slides">
        Reset deck
      </button>
    </div>
  )
}
