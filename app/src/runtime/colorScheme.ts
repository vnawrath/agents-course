// Color scheme lives in tldraw's own user preferences (persisted by tldraw, shared with its UI).
// `undefined` means "not chosen" → the editor's `colorScheme` prop applies, which we set to 'system'.
import type { Editor } from 'tldraw'

export type ColorScheme = 'system' | 'light' | 'dark'
const ORDER: ColorScheme[] = ['system', 'light', 'dark']

export function getColorScheme(editor: Editor): ColorScheme {
  return editor.user.getUserPreferences().colorScheme ?? 'system'
}

export function setColorScheme(editor: Editor, scheme: ColorScheme) {
  editor.user.updateUserPreferences({ colorScheme: scheme })
}

/** system → light → dark → system */
export function cycleColorScheme(editor: Editor) {
  const next = ORDER[(ORDER.indexOf(getColorScheme(editor)) + 1) % ORDER.length]
  setColorScheme(editor, next)
  return next
}
