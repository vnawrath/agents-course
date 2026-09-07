// Shape of the generated artifact (src/generated/deck.tldr.json).
// Shared by the Node generator and the browser runtime; no DOM, no Node imports.
import type { SerializedSchemaV2 } from '@tldraw/store'
import type { JsonValue } from '@tldraw/utils'
import { createShapeId, PageRecordType, type TLBinding, type TLDocument, type TLPage, type TLShape } from '@tldraw/tlschema'

export type DeckRecord = TLDocument | TLPage | TLShape | TLBinding

export interface DeckFile {
  tldrawFileFormatVersion: 1
  schema: SerializedSchemaV2
  records: DeckRecord[]
}

/** Meta stamped on every generated shape so the runtime can tell ours from the user's. */
export interface BuiltShapeMeta {
  built: true
  slide: string
  name: string
  [key: string]: unknown
}

/** A rectangle in page space. */
export interface Viewport {
  x: number
  y: number
  w: number
  h: number
  [key: string]: JsonValue | undefined
}

/**
 * Default slide stage: a 16:9 rectangle at the origin. Slides lay content out inside it and
 * the runtime fits the camera to it (letterboxed), so the canvas around it stays free for annotations.
 */
export const STAGE: Viewport = { x: 0, y: 0, w: 1600, h: 900 }

/** Gap between stages laid out on a grid with `stageAt`. */
export const STAGE_GAP = 200

/**
 * A stage-sized viewport at grid position (col, row): `stageAt(0, 1)` is one stage below `STAGE`.
 * Use it to lay out the steps of a multi-step slide so the camera moves in whole screens.
 */
export const stageAt = (col: number, row: number, gap = STAGE_GAP): Viewport => ({
  x: STAGE.x + col * (STAGE.w + gap),
  y: STAGE.y + row * (STAGE.h + gap),
  w: STAGE.w,
  h: STAGE.h,
})

/**
 * Meta stamped on every generated page. `viewports` are the slide's steps, in order: the runtime
 * frames `viewports[step]` on entry, → / ← walk them before changing slide, `S` refits the current one.
 * `viewport` is always `viewports[0]` (kept so older readers still find a single frame).
 */
export interface SlidePageMeta {
  slide: string
  viewport: Viewport
  viewports: Viewport[]
  [key: string]: JsonValue | undefined
}

/** `page:slide-<slideId>` */
export const pageIdFor = (slideId: string) => PageRecordType.createId(`slide-${slideId}`)
/** `shape:<slideId>/<name>` */
export const shapeIdFor = (slideId: string, name: string) => createShapeId(`${slideId}/${name}`)
