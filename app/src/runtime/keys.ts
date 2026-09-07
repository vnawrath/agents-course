import { useEffect } from 'react'
import type { Editor } from 'tldraw'
import { cycleColorScheme } from './colorScheme'
import { fitSlide, next, prev } from './navigation'

function isTypingTarget(el: Element | null) {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable
}

export function useDeckKeys(editor: Editor, toggleChrome: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const handle = (fn: () => void) => {
        e.preventDefault()
        e.stopPropagation()
        fn()
      }
      // PageUp/PageDown always navigate.
      if (e.key === 'PageDown') return handle(() => next(editor))
      if (e.key === 'PageUp') return handle(() => prev(editor))

      // Everything else only when the user is not typing, editing or working with a selection.
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (isTypingTarget(document.activeElement)) return
      if (editor.getEditingShapeId()) return

      const key = e.key.toLowerCase()
      if (key === 's') return handle(() => fitSlide(editor))
      if (key === 'u') return handle(toggleChrome)
      if (key === 'c') return handle(() => cycleColorScheme(editor))

      if (editor.getSelectedShapeIds().length > 0) return
      if (e.key === 'ArrowRight' || e.key === ' ') return handle(() => next(editor))
      if (e.key === 'ArrowLeft') return handle(() => prev(editor))
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [editor, toggleChrome])
}
