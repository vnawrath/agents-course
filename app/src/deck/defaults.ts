// Per-shape-type defaults. These mirror what tldraw's own toolbar creates
// (see getDefaultProps() in tldraw/dist-esm/lib/shapes/*/…ShapeUtil.mjs) so an
// unspecified prop looks exactly like a hand-drawn shape would. The single
// deck-wide deviation: font 'draw' is stated explicitly here for every type.
import { toRichText } from '@tldraw/tlschema'
import type {
  TLArrowShapeProps,
  TLGeoShapeProps,
  TLLineShapeProps,
  TLNoteShapeProps,
  TLTextShapeProps,
} from '@tldraw/tlschema'

export const DECK_FONT = 'draw' as const

export const geoDefaults = (): TLGeoShapeProps => ({
  w: 100,
  h: 100,
  geo: 'rectangle',
  dash: 'draw',
  growY: 0,
  url: '',
  scale: 1,
  flipX: false,
  flipY: false,
  color: 'black',
  labelColor: 'black',
  fill: 'none',
  size: 'm',
  font: DECK_FONT,
  align: 'middle',
  verticalAlign: 'middle',
  richText: toRichText(''),
})

export const textDefaults = (): TLTextShapeProps => ({
  color: 'black',
  size: 'm',
  w: 8,
  font: DECK_FONT,
  textAlign: 'start',
  autoSize: true,
  scale: 1,
  richText: toRichText(''),
})

export const noteDefaults = (): TLNoteShapeProps => ({
  color: 'black',
  richText: toRichText(''),
  size: 'm',
  font: DECK_FONT,
  align: 'middle',
  verticalAlign: 'middle',
  labelColor: 'black',
  growY: 0,
  fontSizeAdjustment: 1,
  url: '',
  scale: 1,
  textLastEditedBy: null,
})

export const arrowDefaults = (): TLArrowShapeProps => ({
  kind: 'arc',
  elbowMidPoint: 0.5,
  dash: 'draw',
  size: 'm',
  fill: 'none',
  color: 'black',
  labelColor: 'black',
  bend: 0,
  start: { x: 0, y: 0 },
  end: { x: 2, y: 0 },
  arrowheadStart: 'none',
  arrowheadEnd: 'arrow',
  richText: toRichText(''),
  labelPosition: 0.5,
  font: DECK_FONT,
  scale: 1,
})

// Line points are filled in by the builder (they need index keys).
export const lineDefaults = (): Omit<TLLineShapeProps, 'points'> => ({
  dash: 'draw',
  size: 'm',
  color: 'black',
  spline: 'line',
  scale: 1,
})

/** Text shape font size in px per tldraw size token (FONT_SIZES × 16). Used only for layout estimates. */
export const TEXT_FONT_PX = { s: 18, m: 24, l: 36, xl: 44 } as const
export const TEXT_LINE_HEIGHT = 1.35
export const NOTE_SIZE = 200
