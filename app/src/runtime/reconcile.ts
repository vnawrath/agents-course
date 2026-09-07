// Keeps the persisted store in sync with the bundled deck without touching the user's own shapes.
import type { Editor, TLShape } from 'tldraw'
import { bundledBindings, bundledHash, bundledPageIds, bundledPages, bundledShapes, isBuilt } from './deck'

function allShapes(editor: Editor): TLShape[] {
  return editor.store.allRecords().filter((r): r is TLShape => r.typeName === 'shape')
}

function putBundle(editor: Editor) {
  // Existing pages with the same id are updated in place, never duplicated.
  editor.store.put(bundledPages)
  editor.store.put(bundledShapes)
  editor.store.put(bundledBindings)
}

function stampHash(editor: Editor) {
  const doc = editor.getDocumentSettings()
  editor.updateDocumentSettings({ meta: { ...doc.meta, deckHash: bundledHash } })
}

/** Removes pages not in the bundle. Assumes the bundled pages are already present. */
function dropPages(editor: Editor, predicate: (pageId: TLShape['parentId']) => boolean) {
  for (const page of editor.getPages()) {
    if (!bundledPageIds.has(page.id) && predicate(page.id)) editor.deletePage(page.id)
  }
}

/**
 * Replaces the generated shapes when the bundled deck differs from what is stored.
 * Returns true when something changed.
 */
export function reconcile(editor: Editor): boolean {
  const before = editor.getDocumentSettings().meta.deckHash
  if (before === bundledHash) return false
  editor.run(
    () => {
      editor.deleteShapes(allShapes(editor).filter(isBuilt).map((s) => s.id))
      putBundle(editor)
      // A fresh store comes with tldraw's own empty "Page 1"; drop it so the deck starts clean.
      // Otherwise user-made pages are left alone.
      if (before === undefined) dropPages(editor, (id) => editor.getSortedChildIdsForParent(id).length === 0)
      stampHash(editor)
    },
    { ignoreShapeLock: true, history: 'ignore' },
  )
  editor.clearHistory()
  return true
}

/** Unlocks every shape on the current page (same as tldraw's own "Unlock all"). */
export function unlockAll(editor: Editor) {
  const updates = editor.getCurrentPageShapes().filter((s) => s.isLocked).map((s) => ({ id: s.id, type: s.type, isLocked: false }))
  if (updates.length === 0) return
  editor.markHistoryStoppingPoint('unlock all')
  editor.updateShapes(updates)
}

/** Puts every built shape back where the source says (position, props, locked). User shapes are untouched. */
export function relockBuilt(editor: Editor) {
  editor.run(
    () => {
      editor.deleteShapes(allShapes(editor).filter(isBuilt).map((s) => s.id))
      putBundle(editor)
    },
    { ignoreShapeLock: true, history: 'ignore' },
  )
  editor.clearHistory()
}

/** Wipes every shape on every page, removes non-bundled pages, and rebuilds from the bundle. */
export function resetDeck(editor: Editor) {
  editor.run(
    () => {
      editor.deleteShapes(allShapes(editor).map((s) => s.id))
      putBundle(editor)
      dropPages(editor, () => true)
      stampHash(editor)
    },
    { ignoreShapeLock: true, history: 'ignore' },
  )
  editor.clearHistory()
}
