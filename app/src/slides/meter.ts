// The smart/dumb zone meter, shared by slides 3–8: a column of short vertical line segments beside
// the context window, coloured by zone as on slide 3 (20% green, 20% yellow, 10% orange, 50% red).
// Thick segments = filled context, thin segments = still free. Two scales:
//
//  - `meter` (far scale, no discontinuity): all 20 segments. The dashed smart/dumb line itself is
//    drawn on slide 3 only; here the colour change between the yellow segments carries it.
//  - `zoomedMeter` (near scale): the visible part of the window is only the start of the smart zone,
//    so long green segments of a fixed length run down to the axis break (the zigzag across the
//    window), and a single red segment below it says the dumb zone is only after the discontinuity.
import type { ShapeRef, SlideBuilder } from '../deck'

export type Zone = 'green' | 'yellow' | 'orange' | 'red'

/** Segments in the far-scale meter (same count as the bars on slide 3). */
export const SEGMENTS = 20
/** The dashed smart/dumb line (slide 3) sits below this many segments: between the yellow ones, at 30%. */
export const BOUNDARY = 6
/** Fill level at the end of the yellow zone: a window that is "mostly free" is thick down to here at most. */
export const YELLOW_END = 8 / SEGMENTS
/** Horizontal room a meter takes; the line sits in the middle of it. */
export const METER_W = 18
/** Gap between the meter and the window edge. */
export const METER_GAP = 12
/** Where a meter's line goes for a window at `winX`. */
export const meterX = (winX: number) => winX - METER_GAP - METER_W / 2

const SEG_GAP = 6
const THICK = 'l' as const
const THIN = 's' as const

/** Zone colour of segment `i` of `SEGMENTS`. */
export function zoneColor(i: number): Zone {
  if (i < 4) return 'green'
  if (i < 8) return 'yellow'
  if (i < 10) return 'orange'
  return 'red'
}

function segment(s: SlideBuilder, name: string, x: number, y0: number, y1: number, color: Zone, thick: boolean): ShapeRef {
  return s.line(name, {
    points: [
      { x, y: y0 },
      { x, y: y1 },
    ],
    color,
    dash: 'draw',
    size: thick ? THICK : THIN,
  })
}

export interface MeterOpts {
  /** Line x. */
  x: number
  /** Top of the window. */
  y: number
  /** Height of the window. */
  h: number
  /** Fill level 0..1: segments that start above it are thick. */
  level: number
}

/** Far scale: all 20 segments, thick down to the fill level. */
export function meter(s: SlideBuilder, prefix: string, o: MeterOpts): void {
  const pitch = o.h / SEGMENTS
  const fillY = o.level * o.h
  for (let i = 0; i < SEGMENTS; i++) {
    const top = i * pitch
    segment(s, `${prefix}seg-${i + 1}`, o.x, o.y + top + SEG_GAP / 2, o.y + top + pitch - SEG_GAP / 2, zoneColor(i), top < fillY)
  }
}

const ZIG_H = 14
const ZIG_GAP = 12
const RED_MIN = 50
/** Standard window height (slides 3, 4 step 1, 6, 7): fixes the green segment length everywhere. */
const STD_WIN_H = 620
/** Green segments in a standard window before the axis break. */
const STD_GREEN = 4
/** Fixed green segment length: four of them plus the zigzag band and the red segment fill a standard window. */
const GREEN_LEN = (STD_WIN_H - (ZIG_GAP + ZIG_H + ZIG_GAP) - (STD_GREEN - 1) * SEG_GAP) / (STD_GREEN + 1)
/** A truncated last segment shorter than this is dropped rather than drawn as a dot. */
const MIN_STUB = 12
/** Room a zoomed window needs below its content: gap, zigzag, gap, the shortest red segment. */
export const ZOOM_TAIL = ZIG_GAP + ZIG_H + ZIG_GAP + RED_MIN

export interface ZoomedMeterOpts {
  /** The window box. Make it at least `contentEnd - win.y + ZOOM_TAIL` tall. */
  win: { x: number; y: number; w: number; h: number }
  /** Page y where the window's content ends; the zigzag sits below it and the fill level is here. */
  contentEnd: number
  /** Where the "… much more" label goes (x); omitted = no label. */
  labelX?: number
}

/**
 * Near scale: green segments of a fixed length down to the axis break, the zigzag across the window,
 * one red segment at the bottom. In a standard window that is four green segments; a taller window
 * gets more, and only the last one is cut short to fit before the zigzag. The zigzag sits where the
 * standard layout puts it, or lower when the content reaches further. Returns the top of the zigzag.
 */
export function zoomedMeter(s: SlideBuilder, prefix: string, o: ZoomedMeterOpts): number {
  const { win } = o
  const x = meterX(win.x)
  const bottom = win.y + win.h
  const stdBreak = win.y + STD_GREEN * (GREEN_LEN + SEG_GAP) - SEG_GAP + ZIG_GAP
  const breakY = Math.round(Math.max(stdBreak, o.contentEnd + ZIG_GAP))

  const greenEnd = breakY - ZIG_GAP
  for (let i = 0, top = win.y; top < greenEnd; i++, top += GREEN_LEN + SEG_GAP) {
    const end = Math.min(top + GREEN_LEN, greenEnd)
    if (end - top < MIN_STUB) break
    segment(s, `${prefix}seg-${i + 1}`, x, top, end, 'green', top < o.contentEnd)
  }

  const zig: { x: number; y: number }[] = []
  const teeth = 26
  const x0 = win.x - 14
  const x1 = win.x + win.w + 14
  for (let i = 0; i <= teeth; i++) {
    zig.push({ x: x0 + ((x1 - x0) * i) / teeth, y: breakY + (i % 2 === 0 ? 0 : ZIG_H) })
  }
  s.line(`${prefix}axis-break`, { points: zig, dash: 'solid', size: 's', color: 'grey' })
  if (o.labelX !== undefined) {
    s.text(`${prefix}axis-break-label`, { x: o.labelX, y: breakY - 6, text: '… much more', size: 's', color: 'grey' })
  }

  segment(s, `${prefix}seg-red`, x, breakY + ZIG_H + ZIG_GAP, bottom, 'red', false)
  return breakY
}
