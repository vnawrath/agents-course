import { useCallback, useEffect, useState } from 'react'
import { parseTldrawJsonFile, Tldraw, useValue, type Editor, type TLComponents } from 'tldraw'
import 'tldraw/tldraw.css'
import { assetUrls } from './assetUrls'
import { DeckContextMenu } from './ContextMenu'
import { useDeckKeys } from './keys'
import { DeckMenu, Nav } from './Nav'
import { goToSlide, locationFromHash } from './navigation'
import { reconcile } from './reconcile'
import './styles.css'

const CHROME_KEY = 'agents-course-deck:chrome'

// Module-level constant: stable identity, so tldraw never re-mounts its UI.
// Kept: Toolbar, StylePanel, Dialogs, Toasts, RichTextToolbar, and the cursor/collaborator/a11y
// defaults. The context menu is ours so it can carry "Unlock all" (tldraw keeps it in the main menu).
const components: TLComponents = {
  ContextMenu: DeckContextMenu,
  MenuPanel: null,
  MainMenu: null,
  PageMenu: null,
  NavigationPanel: null,
  ZoomMenu: null,
  Minimap: null,
  SharePanel: null,
  TopPanel: null,
  HelpMenu: null,
  DebugMenu: null,
  DebugPanel: null,
  KeyboardShortcutsDialog: null,
  QuickActions: null,
  ActionsMenu: null,
  HelperButtons: null,
}

function readChrome() {
  try {
    return localStorage.getItem(CHROME_KEY) === '1'
  } catch {
    return false
  }
}

export function App() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [chrome, setChrome] = useState(readChrome)

  useEffect(() => {
    try {
      localStorage.setItem(CHROME_KEY, chrome ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [chrome])

  const onMount = useCallback((ed: Editor) => {
    if (import.meta.env.DEV) {
      // Smoke-test hooks; stripped from production builds.
      const w = window as unknown as { __editor?: Editor; __parseTldr?: (json: string) => unknown }
      w.__editor = ed
      w.__parseTldr = (json) => parseTldrawJsonFile({ json, schema: ed.store.schema })
    }
    reconcile(ed)
    const { index, step } = locationFromHash()
    goToSlide(ed, index, step)
    setEditor(ed)
  }, [])

  // Our chrome follows tldraw's resolved color mode (user preference, defaulting to the system setting).
  const dark = useValue('dark mode', () => editor?.user.getIsDarkMode() ?? false, [editor])

  return (
    <div className={`deck ${chrome ? 'deck--chrome' : 'deck--present'} ${dark ? 'deck--dark' : 'deck--light'}`}>
      <Tldraw
        persistenceKey="agents-course-deck"
        colorScheme="system"
        assetUrls={assetUrls}
        components={components}
        onMount={onMount}
      />
      {editor && <Chrome editor={editor} chrome={chrome} setChrome={setChrome} />}
    </div>
  )
}

function Chrome({ editor, chrome, setChrome }: { editor: Editor; chrome: boolean; setChrome: (fn: (c: boolean) => boolean) => void }) {
  const toggle = useCallback(() => setChrome((c) => !c), [setChrome])
  useDeckKeys(editor, toggle)

  useEffect(() => {
    const onHash = () => {
      const { index, step } = locationFromHash()
      goToSlide(editor, index, step)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [editor])

  return (
    <>
      <Nav editor={editor} />
      {chrome && <DeckMenu editor={editor} />}
    </>
  )
}
