import { slide, stageAt } from '../deck'
import type { ShapeRef, SlideBuilder, Viewport } from '../deck'

// Five steps. Step 1 is an overview: the slide title above a 2×2 grid of framed quadrants, one per
// technique; its viewport is the bounding box of the grid, so the camera is zoomed out and only the
// big quadrant labels are readable. Steps 2–5 frame one quadrant each (stage-sized, on a grid with a
// 320 px gap so the frame captions fit between the rows). Grammar of every quadrant: the full window
// on the left, what you do about it on the right. Colors by author as in slide 4: harness grey,
// human light-blue, model violet, tool result light-green. Near scale: outline-only blocks, text in
// the author color; far scale: thin strips in the light tint (`fill: 'solid'`); `fill: 'fill'` is
// the full color (meter); fresh model output is dashed.

type Author = 'grey' | 'light-blue' | 'violet' | 'light-green'
type Zone = 'green' | 'yellow' | 'orange' | 'red'

const PAD = 16
const LABEL_FONT = 18
const LABEL_LINE = 1.35
const LABEL_PAD = 32
const CHAR_DRAW = 0.5
const CHAR_MONO = 0.6

const COL_X = 880
const COL_W = 640
// The context window box, same size and place as on the glossary and context-window slides. Where a
// quadrant shows more than one window they share the height and the top edge; widths shrink to fit.
const WIN = { x: 80, y: 170, w: 440, h: 620 }
const TOP = WIN.y
const WIN_H = WIN.h
const LABEL_DY = 28

const GRID_GAP = 320
const QUADS: Viewport[] = [stageAt(0, 0, GRID_GAP), stageAt(1, 0, GRID_GAP), stageAt(0, 1, GRID_GAP), stageAt(1, 1, GRID_GAP)]
const FRAME_SIDE = 70
const FRAME_TOP = 160
const FRAME_BOTTOM = 60
const OVERVIEW: Viewport = {
  x: QUADS[0].x - FRAME_SIDE - 30,
  y: -380,
  w: QUADS[1].x + QUADS[1].w + FRAME_SIDE + 30 - (QUADS[0].x - FRAME_SIDE - 30),
  h: QUADS[3].y + QUADS[3].h + FRAME_BOTTOM + 110 + 380,
}

const ZONES: [Zone, number, number][] = [
  ['green', 0, 0.2],
  ['yellow', 0.2, 0.4],
  ['orange', 0.4, 0.5],
  ['red', 0.5, 1],
]

// ---------------------------------------------------------------- copy (fixed)

const QUAD_TITLES = ['Task sizing', 'Compaction', 'Handoff file', 'Subagents']

const Q1_BULLETS: [string, string][] = [
  [
    'Size the task to the smart zone, not to the window.',
    'If the work plus the files it needs plus the back-and-forth will not fit above the dashed line, it is too big for one thread.',
  ],
  ['Cut before you start.', 'Split by file, by layer, by step. Ten small threads beat one long one, every time.'],
]

const Q2_BULLETS: [string, string][] = [
  [
    'The harness does this when the bar gets close.',
    'It replaces the conversation with a summary written by the model and keeps going as if nothing happened.',
  ],
  [
    'You do not choose what survives.',
    'Exact file contents, the approach it rejected, the constraint you mentioned once — first to go. Then the model repeats the mistake it already fixed.',
  ],
]

const Q3_BULLETS: [string, string][] = [
  [
    'Compaction on your terms.',
    'Before the window gets full, have the agent write down the goal, what is done, what is next, and the gotchas, into a file.',
  ],
  [
    'Then start fresh.',
    'New window, the file goes in first. You keep what matters and drop the noise, and you can read the file yourself.',
  ],
]

const Q4_BULLETS: [string, string][] = [
  [
    'Noise happens somewhere else.',
    'Searching, reading twenty files, running a long test suite fill a window fast. Send that to a subagent with its own window.',
  ],
  [
    'Only the answer comes back.',
    'The main window pays for one small block instead of the whole exploration, and stays in the smart zone longer.',
  ],
]

// ---------------------------------------------------------------- helpers (same rhythm as slide 4)

/** Estimated label height for a geo label with size 's' and `scale`. */
function labelH(text: string, w: number, mono: boolean, scale: number) {
  const charW = LABEL_FONT * (mono ? CHAR_MONO : CHAR_DRAW) * scale
  const perLine = Math.max(1, Math.floor((w - LABEL_PAD * scale) / charW))
  const lines = text.split('\n').reduce((n, line) => {
    let count = 1
    let used = 0
    for (const word of line.split(' ')) {
      const need = used === 0 ? word.length : used + 1 + word.length
      if (need <= perLine) used = need
      else {
        count += Math.max(1, Math.ceil(word.length / perLine) - (used === 0 ? 1 : 0))
        used = word.length % perLine || Math.min(word.length, perLine)
      }
    }
    return n + count
  }, 0)
  return Math.ceil((lines * LABEL_FONT * LABEL_LINE + LABEL_PAD) * scale) + 6
}

interface BlockOpts {
  x: number
  y: number
  w: number
  color: Author
  text: string
  mono?: boolean
  dashed?: boolean
  scale?: number
  h?: number
}

/** A message block at near scale: outline in the author color, readable text in the same color. */
function block(s: SlideBuilder, name: string, o: BlockOpts): ShapeRef {
  const scale = o.scale ?? 1
  const h = Math.max(o.h ?? 0, labelH(o.text, o.w, o.mono ?? false, scale))
  return s.rect(name, {
    x: o.x,
    y: o.y,
    w: o.w,
    h,
    label: o.text,
    color: o.color,
    labelColor: o.color,
    fill: 'none',
    dash: o.dashed ? 'dashed' : 'draw',
    size: 's',
    font: o.mono ? 'mono' : 'draw',
    align: 'start',
    verticalAlign: 'start',
    scale,
  })
}

/** A message block at far scale: a thin tinted strip, no text. */
function strip(s: SlideBuilder, name: string, x: number, y: number, w: number, h: number, color: Author, dashed = false): ShapeRef {
  return s.rect(name, { x, y, w, h, color, fill: 'solid', dash: dashed ? 'dashed' : 'solid', size: 's' })
}

const NOISE: [Author, number][] = [
  ['light-green', 26],
  ['violet', 10],
  ['light-green', 12],
  ['violet', 14],
  ['light-green', 40],
  ['violet', 10],
  ['light-green', 18],
  ['violet', 12],
]
const NOISE_DENSE: [Author, number][] = [
  ['light-green', 16],
  ['violet', 6],
  ['light-green', 10],
  ['violet', 6],
  ['light-green', 22],
  ['violet', 6],
]
const HEAD: [Author, number][] = [
  ['grey', 14],
  ['light-blue', 14],
]

/** Conversation history at far scale: strips from `y` down to (not past) `maxY`. Returns the next free y. */
function history(
  s: SlideBuilder,
  p: string,
  x: number,
  y: number,
  w: number,
  maxY: number,
  head: [Author, number][] = HEAD,
  noise: [Author, number][] = NOISE,
  gap = 5,
) {
  let yy = y
  for (let i = 0; ; i++) {
    const [color, h] = i < head.length ? head[i] : noise[(i - head.length) % noise.length]
    if (yy + h > maxY) break
    strip(s, `${p}${i + 1}`, x, yy, w, h, color)
    yy += h + gap
  }
  return yy
}

/** Thin meter (zones from slide 3) filled down to `level` (0..1), with the hard limit under it. */
function meter(s: SlideBuilder, p: string, x: number, y: number, h: number, level: number): ShapeRef {
  const mw = 18
  ZONES.forEach(([color, from, to], k) => {
    const toClamped = Math.min(to, level)
    if (toClamped <= from) return
    s.rect(`${p}meter-${k + 1}`, { x, y: y + h * from, w: mw, h: h * (toClamped - from), color, fill: 'fill', dash: 'solid', size: 's' })
  })
  const m = s.rect(`${p}meter`, { x, y, w: mw, h, fill: 'none', dash: 'solid', size: 's' })
  s.line(`${p}meter-limit`, {
    points: [
      { x: x - 8, y: y + h },
      { x: x + mw + 8, y: y + h },
    ],
    size: 'xl',
    dash: 'solid',
  })
  return m
}

/** Headline + body bullets, same rhythm as slides 3 and 4. */
function bullets(s: SlideBuilder, prefix: string, x: number, y0: number, w: number, items: [string, string][], gap = 80) {
  let y = y0
  items.forEach(([head, body], i) => {
    const h = s.text(`${prefix}b${i + 1}-head`, { x, y, text: head, size: 'm' })
    const b = s.text(`${prefix}b${i + 1}-body`, { x, y: y + h.h + 4, text: body, size: 's', autoSize: false, w })
    y += h.h + b.h + gap
  })
}

/** Kicker + quadrant title at the usual title position. */
function header(s: SlideBuilder, p: string, o: Viewport, name: string) {
  s.text(`${p}kicker`, { x: o.x + 80, y: o.y + 14, text: 'Managing context', size: 's', color: 'grey' })
  s.text(`${p}title`, { x: o.x + 80, y: o.y + 50, text: name, size: 'xl' })
}

// ---------------------------------------------------------------- step 1: overview

function overview(s: SlideBuilder) {
  s.text('title', { x: QUADS[0].x - FRAME_SIDE, y: -350, text: 'Managing context', size: 'xl', scale: 2.5 })
  QUADS.forEach((v, i) => {
    s.rect(`frame-${i + 1}`, {
      x: v.x - FRAME_SIDE,
      y: v.y - FRAME_TOP,
      w: v.w + FRAME_SIDE * 2,
      h: v.h + FRAME_TOP + FRAME_BOTTOM,
      color: 'grey',
      dash: 'dashed',
      size: 'l',
      fill: 'none',
    })
    s.text(`frame-label-${i + 1}`, { x: v.x - 40, y: v.y - 140, text: QUAD_TITLES[i], size: 'xl', scale: 2 })
  })
}

// ---------------------------------------------------------------- step 2: task sizing

function taskSizing(s: SlideBuilder) {
  const o = s.steps[1]
  header(s, 'q1-', o, QUAD_TITLES[0])

  const win = { x: o.x + WIN.x, y: o.y + WIN.y, w: WIN.w, h: WIN.h }
  // Meter tint as the window background.
  ZONES.forEach(([color, from, to], k) => {
    s.rect(`q1-zone-${k + 1}`, {
      x: win.x + 3,
      y: win.y + win.h * from,
      w: win.w - 6,
      h: win.h * (to - from),
      color,
      fill: 'solid',
      dash: 'solid',
      size: 's',
    })
  })
  s.rect('q1-window', { ...win, fill: 'none' })
  s.line('q1-hard-limit', {
    points: [
      { x: win.x - 10, y: win.y + win.h },
      { x: win.x + win.w + 10, y: win.y + win.h },
    ],
    size: 'xl',
    dash: 'solid',
  })
  const sideX = win.x + win.w + 40
  s.text('q1-hard-limit-label', { x: sideX, y: win.y + win.h - 16, text: 'hard limit', size: 's', color: 'grey' })

  const boundaryY = win.y + win.h * 0.5
  s.line('q1-boundary', {
    points: [
      { x: win.x - 30, y: boundaryY },
      { x: o.x + 840, y: boundaryY },
    ],
    dash: 'dashed',
    size: 'm',
  })
  s.text('q1-smart', { x: sideX, y: boundaryY - 40, text: 'smart zone', size: 's', color: 'grey' })
  s.text('q1-dumb', { x: sideX, y: boundaryY + 10, text: 'dumb zone', size: 's', color: 'grey' })

  // Three tasks hanging from the top of the window: prompt + files + back-and-forth.
  const TASKS: [string, number][] = [
    ['rename a function', 90],
    ['fix the login test', 235],
    ['migrate auth to the new library', 440],
  ]
  const barW = 110
  const innerX = win.x + 24
  const pitch = (win.w - 48 - barW) / 2
  TASKS.forEach(([label, total], k) => {
    const bx = innerX + k * pitch
    history(s, `q1-t${k + 1}-`, bx, win.y + 24, barW, win.y + 24 + total, [['grey', 12], ['light-blue', 12]], NOISE, 4)
    s.text(`q1-t${k + 1}-label`, {
      x: bx + barW / 2 - pitch / 2,
      y: win.y + win.h + LABEL_DY,
      text: label,
      size: 's',
      autoSize: false,
      w: pitch,
      textAlign: 'middle',
    })
  })

  bullets(s, 'q1-', o.x + COL_X, o.y + TOP, COL_W, Q1_BULLETS)
}

// ---------------------------------------------------------------- step 3: compaction

function compaction(s: SlideBuilder) {
  const o = s.steps[2]
  header(s, 'q2-', o, QUAD_TITLES[1])
  const top = o.y + TOP

  meter(s, 'q2-', o.x + 80, top, WIN_H, 0.88)

  const w1 = s.rect('q2-win1', { x: o.x + 120, y: top, w: 200, h: WIN_H, fill: 'none' })
  history(s, 'q2-h', w1.x + PAD, top + PAD, w1.w - PAD * 2, top + WIN_H * 0.86)
  s.text('q2-win1-label', { x: w1.x, y: top + WIN_H + LABEL_DY, text: 'before', size: 's' })

  const w2 = s.rect('q2-win2', { x: o.x + 430, y: top, w: 200, h: WIN_H, fill: 'none' })
  const bw = w2.w - PAD * 2
  let y = top + PAD
  strip(s, 'q2-sys', w2.x + PAD, y, bw, 14, 'grey')
  y += 20
  const sum = s.rect('q2-summary', { x: w2.x + PAD, y, w: bw, h: 90, label: 'summary', color: 'grey', labelColor: 'grey', fill: 'none', size: 's' })
  y = sum.y + sum.h + 8
  strip(s, 'q2-next', w2.x + PAD, y, bw, 14, 'violet', true)
  s.text('q2-win2-label', { x: w2.x, y: top + WIN_H + LABEL_DY, text: 'after', size: 's' })

  s.arrow('q2-compact', { from: 'q2-win1', to: 'q2-win2', size: 's' })
  s.text('q2-compact-label', { x: w1.x + w1.w + 20, y: top + WIN_H / 2 - 40, text: 'compact', size: 's' })

  // What fell out: crossed-out strips beside the new window.
  const DROPPED: [string, Author, number][] = [
    ['exact file contents', 'light-green', 60],
    ['the rejected approach', 'violet', 30],
    ['the constraint mentioned once', 'light-blue', 14],
  ]
  const dx = o.x + 665
  const dw = 160
  s.text('q2-dropped', { x: dx, y: top, text: 'dropped', size: 's', color: 'grey' })
  let dy = top + 56
  DROPPED.forEach(([label, color, h], k) => {
    const t = s.text(`q2-drop-${k + 1}-label`, { x: dx, y: dy, text: label, size: 's', autoSize: false, w: dw })
    const st = strip(s, `q2-drop-${k + 1}`, dx, dy + t.h + 14, dw, h, color)
    s.line(`q2-drop-${k + 1}-strike`, {
      points: [
        { x: dx - 12, y: st.y + h / 2 },
        { x: dx + dw + 12, y: st.y + h / 2 },
      ],
      size: 'm',
      dash: 'solid',
    })
    dy = st.y + h + 48
  })

  bullets(s, 'q2-', o.x + COL_X, top, COL_W, Q2_BULLETS)
}

// ---------------------------------------------------------------- step 4: handoff file

function handoff(s: SlideBuilder) {
  const o = s.steps[3]
  header(s, 'q3-', o, QUAD_TITLES[2])
  const top = o.y + TOP

  meter(s, 'q3-', o.x + 80, top, WIN_H, 0.68)

  const w1 = s.rect('q3-win1', { x: o.x + 120, y: top, w: 180, h: WIN_H, fill: 'none' })
  const bw1 = w1.w - PAD * 2
  const y1 = history(s, 'q3-h', w1.x + PAD, top + PAD, bw1, top + WIN_H * 0.56)
  block(s, 'q3-write', { x: w1.x + PAD, y: y1 + 4, w: bw1, color: 'violet', text: '▶ Write PLAN.md', mono: true, dashed: true, scale: 0.75 })
  s.text('q3-win1-label', { x: w1.x, y: top + WIN_H + LABEL_DY, text: 'before', size: 's' })

  // The file: blue-bordered, on disk, between the two windows.
  const file = s.rect('q3-file', {
    x: o.x + 400,
    y: top + 190,
    w: 150,
    h: 210,
    label: 'PLAN.md\n\ngoal\ndone\nnext\ngotchas',
    color: 'light-blue',
    fill: 'semi',
    size: 's',
    font: 'mono',
    align: 'start',
    verticalAlign: 'start',
  })
  s.text('q3-disk', { x: file.x, y: file.y + file.h + 12, text: 'on disk', size: 's', color: 'grey' })

  const w2 = s.rect('q3-win2', { x: o.x + 650, y: top, w: 170, h: WIN_H, fill: 'none' })
  const bw2 = w2.w - PAD * 2
  let y = top + PAD
  strip(s, 'q3-sys', w2.x + PAD, y, bw2, 14, 'grey')
  y += 20
  const plan = s.rect('q3-plan-in', {
    x: w2.x + PAD,
    y,
    w: bw2,
    h: 64,
    label: 'PLAN.md',
    color: 'light-blue',
    labelColor: 'light-blue',
    fill: 'none',
    size: 's',
    font: 'mono',
  })
  y = plan.y + plan.h + 6
  strip(s, 'q3-prompt', w2.x + PAD, y, bw2, 14, 'light-blue')
  y += 20
  strip(s, 'q3-next', w2.x + PAD, y, bw2, 14, 'violet', true)
  s.text('q3-win2-label', { x: w2.x, y: top + WIN_H + LABEL_DY, text: 'fresh', size: 's' })

  s.arrow('q3-write-arrow', { from: 'q3-write', to: 'q3-file', label: 'write', size: 's' })
  s.arrow('q3-read-arrow', { from: 'q3-file', to: 'q3-plan-in', label: 'read', size: 's' })

  bullets(s, 'q3-', o.x + COL_X, top, COL_W, Q3_BULLETS)
}

// ---------------------------------------------------------------- step 5: subagents

function subagents(s: SlideBuilder) {
  const o = s.steps[4]
  header(s, 'q4-', o, QUAD_TITLES[3])
  const top = o.y + TOP

  meter(s, 'q4-', o.x + 80, top, WIN_H, 0.34)

  const main = s.rect('q4-main', { x: o.x + 120, y: top, w: 220, h: WIN_H, fill: 'none' })
  const bx = main.x + PAD
  const bw = main.w - PAD * 2
  let y = top + PAD
  strip(s, 'q4-sys', bx, y, bw, 14, 'grey')
  y += 20
  strip(s, 'q4-user', bx, y, bw, 14, 'light-blue')
  y += 20
  const call = s.rect('q4-call', {
    x: bx,
    y,
    w: bw,
    h: 38,
    label: '▶ Agent ×3',
    color: 'violet',
    labelColor: 'violet',
    fill: 'none',
    size: 's',
    font: 'mono',
    scale: 0.8,
  })
  y = call.y + call.h + 8
  for (let k = 0; k < 3; k++) {
    strip(s, `q4-ret-${k + 1}`, bx, y, bw, 12, 'light-green')
    y += 17
  }
  y += 4
  s.rect('q4-response', { x: bx, y, w: bw, h: 38, label: 'response', color: 'violet', labelColor: 'violet', fill: 'none', dash: 'dashed', size: 's' })
  s.text('q4-main-label', { x: main.x, y: top + WIN_H + LABEL_DY, text: 'main window', size: 's' })

  const boundaryY = top + WIN_H * 0.5
  s.line('q4-boundary', {
    points: [
      { x: o.x + 60, y: boundaryY },
      { x: main.x + main.w + 30, y: boundaryY },
    ],
    dash: 'dashed',
    size: 'm',
  })

  // Three subagent windows, each full of noisy work.
  const SUBS = ['search the repo', 'read twenty files', 'run the test suite']
  SUBS.forEach((label, k) => {
    const sy = top + k * ((WIN_H - 170) / 2)
    const sw = s.rect(`q4-sub-${k + 1}`, { x: o.x + 470, y: sy, w: 180, h: 170, fill: 'none', size: 's' })
    s.text(`q4-sub-${k + 1}-label`, { x: sw.x + sw.w + 14, y: sy + 6, text: label, size: 's', color: 'grey' })
    history(s, `q4-s${k + 1}-`, sw.x + 12, sy + 12, sw.w - 24, sy + 170 - 12, [['grey', 8], ['violet', 8]], NOISE_DENSE, 3)
    s.arrow(`q4-arrow-${k + 1}`, { start: { x: call.x + call.w + 2, y: call.y + call.h / 2 }, to: `q4-sub-${k + 1}`, size: 's' })
  })
  s.text('q4-subs-label', { x: o.x + 470, y: top + WIN_H + LABEL_DY, text: 'subagents, each with its own window', size: 's' })

  bullets(s, 'q4-', o.x + COL_X, top, COL_W, Q4_BULLETS)
}

export default slide(
  'managing-context',
  'Managing context',
  (s) => {
    overview(s)
    taskSizing(s)
    compaction(s)
    handoff(s)
    subagents(s)
  },
  { viewports: [OVERVIEW, ...QUADS] },
)
