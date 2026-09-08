import { slide } from '../deck'
import type { ShapeRef, SlideBuilder } from '../deck'

// One step. Left: the whole course in one far-scale window — a healthy thread. Thin harness strips
// (system prompt, one CLI tool, a short AGENTS.md), your prompt, two rounds of "edit, run the
// check, read the result", and the dashed final response, all sitting above the smart/dumb line
// with room to spare. Labels in the gap name each strip; the dumb zone below stays empty. Right:
// the four rules as a plain list. Colors by author as everywhere: harness grey, human light-blue,
// model violet, tool result light-green (teal); `fill: 'solid'` is the light tint.

type Author = 'grey' | 'light-blue' | 'violet' | 'light-green'

const PAD = 16
const GAP = 8

const COL_X = 800
const COL_W = 720

/** The context window box, same size and place as on the glossary and context-window slides. */
const WIN = { x: 80, y: 170, w: 440, h: 620 }
const LABEL_DY = 28

const RULES = ['Every token counts', 'Stay in the smart zone', 'CLIs/code for power, MCPs for control', 'Deterministic wherever possible']

interface Strip {
  name: string
  h: number
  color: Author
  /** Label in the gap beside the strip (empty = none). */
  label: string
  dashed?: boolean
  lighter?: boolean
}

// The thread, top to bottom. Heights are far-scale: proportional-ish, no body text.
const THREAD: Strip[] = [
  { name: 'system', h: 28, color: 'grey', label: 'system prompt' },
  { name: 'tool', h: 12, color: 'grey', label: 'run_command · 1 tool\nAGENTS.md · short', lighter: true },
  { name: 'agents', h: 14, color: 'grey', label: '' },
  { name: 'user', h: 28, color: 'light-blue', label: 'your prompt' },
  { name: 'model-1', h: 24, color: 'violet', label: 'edit, ▶ pnpm check' },
  { name: 'check-1', h: 30, color: 'light-green', label: '✗ 1 test failing' },
  { name: 'model-2', h: 24, color: 'violet', label: 'edit, ▶ pnpm check' },
  { name: 'check-2', h: 20, color: 'light-green', label: '✓ 4 tests passed' },
  { name: 'model-3', h: 24, color: 'violet', label: '"Fixed."', dashed: true },
]

/** A message block at far scale: a thin tinted strip, no text. */
function strip(s: SlideBuilder, name: string, x: number, y: number, w: number, o: Strip): ShapeRef {
  return s.rect(name, {
    x,
    y,
    w,
    h: o.h,
    color: o.color,
    fill: o.lighter ? 'semi' : 'solid',
    dash: o.dashed ? 'dashed' : 'solid',
    size: 's',
  })
}

export default slide('rules-of-thumb', 'Rules of thumb', (s) => {
  s.text('title', { x: 80, y: 50, text: 'Rules of thumb', size: 'xl' })

  // ---- Left: one healthy thread in one window.
  const win = s.rect('window', { ...WIN, fill: 'none' })
  const bx = win.x + PAD
  const bw = win.w - PAD * 2
  const sideX = win.x + win.w + 16
  let y = win.y + PAD

  THREAD.forEach((o) => {
    const r = strip(s, o.name, bx, y, bw, o)
    if (o.label) {
      s.text(`${o.name}-label`, {
        x: sideX,
        y: r.y + r.h / 2 - 15,
        text: o.label,
        size: 's',
        color: o.dashed ? 'violet' : 'grey',
        font: o.color === 'light-green' ? 'mono' : 'draw',
      })
    }
    y = r.y + r.h + GAP
  })
  const fillEnd = y - GAP

  // The smart/dumb boundary, dashed, through the window and into the gap. A bit below half: this
  // thread is one clear task, so the line sits lower than on slide 3.
  const boundaryY = win.y + Math.round(win.h * 0.55)
  s.line('boundary', {
    points: [
      { x: win.x - 30, y: boundaryY },
      { x: 760, y: boundaryY },
    ],
    dash: 'dashed',
    size: 'm',
  })
  s.text('smart-zone', { x: sideX, y: boundaryY - 44, text: 'smart zone', size: 'm' })
  s.text('dumb-zone', { x: sideX, y: boundaryY + 16, text: 'dumb zone', size: 'm', color: 'grey' })
  // Headroom between the last block and the line.
  s.text('headroom', {
    x: win.x,
    y: fillEnd + (boundaryY - fillEnd) / 2 - 12,
    text: 'room to spare',
    size: 's',
    color: 'grey',
    autoSize: false,
    w: win.w,
    textAlign: 'middle',
  })

  s.text('window-label', { x: win.x, y: win.y + win.h + LABEL_DY, text: 'context window: one thread', size: 's' })

  // ---- Right: the four rules, one line each.
  RULES.forEach((rule, i) => {
    s.text(`rule-${i + 1}`, { x: COL_X, y: 240 + i * 150, text: rule, size: 'l', autoSize: false, w: COL_W })
  })
})
