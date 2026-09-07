// The slide DSL. A slide is a builder function over `s`; every shape gets a
// mandatory local name that becomes a stable id (`shape:<slideId>/<name>`).
// Props are real tldraw props passed straight through. The only sugar:
// `text` / `label` strings are converted to rich text.
import type { IndexKey } from '@tldraw/utils'
import { stableIndices } from './indices'
import { createBindingId, toRichText } from '@tldraw/tlschema'
import type {
  TLArrowBinding,
  TLArrowShape,
  TLArrowShapeProps,
  TLGeoShape,
  TLGeoShapeProps,
  TLLineShape,
  TLLineShapeProps,
  TLNoteShape,
  TLNoteShapeProps,
  TLPage,
  TLShape,
  TLShapeId,
  TLTextShape,
  TLTextShapeProps,
  VecModel,
} from '@tldraw/tlschema'
import { PageRecordType } from '@tldraw/tlschema'
import {
  arrowDefaults,
  geoDefaults,
  lineDefaults,
  NOTE_SIZE,
  noteDefaults,
  TEXT_FONT_PX,
  TEXT_LINE_HEIGHT,
  textDefaults,
} from './defaults'
import { pageIdFor, shapeIdFor, STAGE, type BuiltShapeMeta, type SlidePageMeta, type Viewport } from './format'

export interface ShapeRef {
  id: TLShapeId
  x: number
  y: number
  w: number
  h: number
}

type Pos = { x: number; y: number }
type NoRich<P> = Partial<Omit<P, 'richText'>>

export type TextOpts = NoRich<TLTextShapeProps> & {
  text: string
  y: number
  /** Left edge. Required unless `center` is set. */
  x?: number
  /** Center the text horizontally on the stage: a stage-wide fixed-width box with `textAlign: 'middle'`. */
  center?: boolean
}
export type RectOpts = Pos & NoRich<TLGeoShapeProps> & { label?: string }
export type NoteOpts = Pos & NoRich<TLNoteShapeProps> & { text?: string }
export type ArrowOpts = NoRich<TLArrowShapeProps> & {
  label?: string
  /** Local name of the shape the arrow starts at (creates a binding). */
  from?: string
  /** Local name of the shape the arrow ends at (creates a binding). */
  to?: string
  /** Explicit page-space start point (used when `from` is not given). */
  start?: VecModel
  /** Explicit page-space end point (used when `to` is not given). */
  end?: VecModel
}
export type LineOpts = NoRich<Omit<TLLineShapeProps, 'points'>> & {
  /** Page-space points, at least two. */
  points: VecModel[]
}

export interface SlideBuilder {
  /** The slide's first viewport (what the camera frames on entry). Lay content out relative to it. */
  readonly stage: Viewport
  /** All step viewports, in order (`[stage]` for a single-step slide). */
  readonly steps: readonly Viewport[]
  text(name: string, opts: TextOpts): ShapeRef
  rect(name: string, opts: RectOpts): ShapeRef
  note(name: string, opts: NoteOpts): ShapeRef
  arrow(name: string, opts: ArrowOpts): ShapeRef
  line(name: string, opts: LineOpts): ShapeRef
}

export interface SlideOpts {
  /** Camera frame for this slide. Defaults to `STAGE` (1600×900 at the origin). Ignored when `viewports` is given. */
  viewport?: Viewport
  /**
   * Steps: the camera frames for this slide, in order. → walks through them before moving to the
   * next slide, ← walks back, `S` refits the current one. Defaults to `[viewport]`.
   */
  viewports?: Viewport[]
}

export interface SlideDef {
  id: string
  title: string
  /** `viewports[0]` */
  viewport: Viewport
  viewports: Viewport[]
  build: (s: SlideBuilder) => void
}

export interface BuiltSlide {
  page: TLPage
  shapes: TLShape[]
  bindings: TLArrowBinding[]
}

export function slide(id: string, title: string, build: (s: SlideBuilder) => void, opts: SlideOpts = {}): SlideDef {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`slide id "${id}" must be kebab-case`)
  const viewports = opts.viewports ?? [opts.viewport ?? STAGE]
  if (viewports.length === 0) throw new Error(`slide "${id}": viewports must not be empty`)
  viewports.forEach((v, i) => {
    if (v.w <= 0 || v.h <= 0) throw new Error(`slide "${id}": viewport ${i + 1} must have positive size`)
  })
  return { id, title, viewport: viewports[0], viewports, build }
}

/** Rough text box estimate so callers can stack things; tldraw measures the real size at render time. */
function estimateText(text: string, size: keyof typeof TEXT_FONT_PX, w: number | undefined, autoSize: boolean) {
  const px = TEXT_FONT_PX[size]
  const lines = text.split('\n')
  const longest = Math.max(...lines.map((l) => l.length))
  const width = autoSize ? Math.ceil(longest * px * 0.55) : (w ?? 8)
  const wrapped = autoSize ? lines.length : lines.reduce((n, l) => n + Math.max(1, Math.ceil((l.length * px * 0.55) / width)), 0)
  return { w: width, h: Math.ceil(wrapped * px * TEXT_LINE_HEIGHT) }
}

/** Runs a slide definition and returns validated-shape-ready records (validation happens in the generator). */
export function buildSlide(def: SlideDef, pageIndex: IndexKey): BuiltSlide {
  const pageId = pageIdFor(def.id)
  const pageMeta: SlidePageMeta = {
    slide: def.id,
    viewport: { ...def.viewport },
    viewports: def.viewports.map((v) => ({ ...v })),
  }
  const page = PageRecordType.create({ id: pageId, name: def.title, index: pageIndex, meta: pageMeta })

  const shapes: TLShape[] = []
  const bindings: TLArrowBinding[] = []
  const refs = new Map<string, ShapeRef>()

  const meta = (name: string): BuiltShapeMeta => ({ built: true, slide: def.id, name })

  function register(name: string, ref: ShapeRef) {
    if (refs.has(name)) throw new Error(`slide "${def.id}": duplicate shape name "${name}"`)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) throw new Error(`slide "${def.id}": bad shape name "${name}"`)
    refs.set(name, ref)
    return ref
  }

  function base<T extends TLShape>(name: string, type: T['type'], x: number, y: number, props: T['props']): T {
    return {
      id: shapeIdFor(def.id, name),
      typeName: 'shape',
      type,
      x,
      y,
      rotation: 0,
      index: '' as IndexKey, // assigned below in array order
      parentId: pageId,
      isLocked: true,
      opacity: 1,
      props,
      meta: meta(name),
    } as unknown as T
  }

  const s: SlideBuilder = {
    stage: { ...def.viewport },
    steps: def.viewports.map((v) => ({ ...v })),
    text(name, { x: xOpt, y, text, center, ...rest }) {
      if (center) {
        // Full-width box so tldraw's own text alignment does the centering (robust to font metrics).
        rest = { autoSize: false, w: def.viewport.w, textAlign: 'middle', ...rest }
      }
      const x = center ? def.viewport.x : xOpt
      if (x === undefined) throw new Error(`slide "${def.id}": text "${name}" needs x or center`)
      const props: TLTextShapeProps = { ...textDefaults(), ...rest, richText: toRichText(text) }
      const est = estimateText(text, props.size, rest.w, props.autoSize)
      if (props.autoSize) props.w = est.w
      shapes.push(base<TLTextShape>(name, 'text', x, y, props))
      return register(name, { id: shapeIdFor(def.id, name), x, y, w: props.w, h: est.h })
    },
    rect(name, { x, y, label, ...rest }) {
      const props: TLGeoShapeProps = { ...geoDefaults(), ...rest, richText: toRichText(label ?? '') }
      shapes.push(base<TLGeoShape>(name, 'geo', x, y, props))
      return register(name, { id: shapeIdFor(def.id, name), x, y, w: props.w, h: props.h })
    },
    note(name, { x, y, text, ...rest }) {
      const props: TLNoteShapeProps = { ...noteDefaults(), ...rest, richText: toRichText(text ?? '') }
      shapes.push(base<TLNoteShape>(name, 'note', x, y, props))
      return register(name, { id: shapeIdFor(def.id, name), x, y, w: NOTE_SIZE, h: NOTE_SIZE })
    },
    arrow(name, { label, from, to, start, end, ...rest }) {
      const id = shapeIdFor(def.id, name)
      const lookup = (local: string, role: 'from' | 'to') => {
        const r = refs.get(local)
        if (!r) throw new Error(`slide "${def.id}": arrow "${name}" ${role}="${local}" refers to an unknown shape (define it first)`)
        return r
      }
      const center = (r: ShapeRef): VecModel => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
      const fromRef = from ? lookup(from, 'from') : undefined
      const toRef = to ? lookup(to, 'to') : undefined
      const p0 = fromRef ? center(fromRef) : start
      const p1 = toRef ? center(toRef) : end
      if (!p0 || !p1) throw new Error(`slide "${def.id}": arrow "${name}" needs from/start and to/end`)
      // Arrow-local coords: shape origin at p0; bound terminals are recomputed by tldraw from the bindings.
      const props: TLArrowShapeProps = {
        ...arrowDefaults(),
        ...rest,
        start: { x: 0, y: 0 },
        end: { x: p1.x - p0.x, y: p1.y - p0.y },
        richText: toRichText(label ?? ''),
      }
      shapes.push(base<TLArrowShape>(name, 'arrow', p0.x, p0.y, props))
      const bind = (terminal: 'start' | 'end', target: ShapeRef): TLArrowBinding => ({
        id: createBindingId(`${def.id}/${name}/${terminal}`),
        typeName: 'binding',
        type: 'arrow',
        fromId: id,
        toId: target.id,
        props: { terminal, normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false, snap: 'none' },
        meta: {},
      })
      if (fromRef) bindings.push(bind('start', fromRef))
      if (toRef) bindings.push(bind('end', toRef))
      const minX = Math.min(p0.x, p1.x)
      const minY = Math.min(p0.y, p1.y)
      return register(name, { id, x: minX, y: minY, w: Math.abs(p1.x - p0.x), h: Math.abs(p1.y - p0.y) })
    },
    line(name, { points, ...rest }) {
      if (points.length < 2) throw new Error(`slide "${def.id}": line "${name}" needs at least two points`)
      const origin = points[0]
      const keys = stableIndices(points.length)
      const pts: TLLineShapeProps['points'] = {}
      points.forEach((p, i) => {
        const k = keys[i]
        pts[k] = { id: k, index: k, x: p.x - origin.x, y: p.y - origin.y }
      })
      const props: TLLineShapeProps = { ...lineDefaults(), ...rest, points: pts }
      shapes.push(base<TLLineShape>(name, 'line', origin.x, origin.y, props))
      const xs = points.map((p) => p.x)
      const ys = points.map((p) => p.y)
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      return register(name, { id: shapeIdFor(def.id, name), x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY })
    },
  }

  def.build(s)

  const indices = stableIndices(shapes.length)
  shapes.forEach((shape, i) => {
    shape.index = indices[i]
  })

  return { page, shapes, bindings }
}
