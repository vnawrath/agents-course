// Typed view of the generated deck for the runtime.
import type { TLBinding, TLDocument, TLPage, TLPageId, TLShape } from '@tldraw/tlschema'
import type { DeckFile, Viewport } from '../deck/format'
import deckJson from '../generated/deck.tldr.json'

const file = deckJson as unknown as DeckFile

const document = file.records.find((r): r is TLDocument => r.typeName === 'document')!
export const bundledPages = file.records.filter((r): r is TLPage => r.typeName === 'page')
export const bundledShapes = file.records.filter((r): r is TLShape => r.typeName === 'shape')
export const bundledBindings = file.records.filter((r): r is TLBinding => r.typeName === 'binding')
export const bundledHash = String(document.meta.deckHash)
export const bundledPageIds = new Set<TLPageId>(bundledPages.map((p) => p.id))

export interface SlideInfo {
  id: string
  pageId: TLPageId
  title: string
  /** Step camera frames from page meta, in order. Empty only for decks generated before viewports existed. */
  viewports: Viewport[]
}

function readViewport(v: unknown): Viewport | undefined {
  if (!v || typeof v !== 'object') return undefined
  const { x, y, w, h } = v as Partial<Viewport>
  if ([x, y, w, h].some((n) => typeof n !== 'number')) return undefined
  return { x: x!, y: y!, w: w!, h: h! }
}

function readViewports(meta: TLPage['meta']): Viewport[] {
  const list = Array.isArray(meta.viewports) ? meta.viewports.map(readViewport) : []
  const steps = list.filter((v): v is Viewport => !!v)
  if (steps.length) return steps
  const single = readViewport(meta.viewport)
  return single ? [single] : []
}

/** Slides in deck order (pages sorted by their fractional index). */
export const slides: SlideInfo[] = [...bundledPages]
  .sort((a, b) => (a.index < b.index ? -1 : a.index > b.index ? 1 : 0))
  .map((p) => ({ id: String(p.meta.slide), pageId: p.id, title: p.name, viewports: readViewports(p.meta) }))

export const isBuilt = (shape: TLShape) => shape.meta.built === true
