import { slide, stageAt } from '../deck'
import type { ShapeRef, SlideBuilder, Viewport } from '../deck'
import { METER_GAP, METER_W, YELLOW_END, meter as zoneMeter } from './meter'

// Five steps. Step 1 is an overview: the slide title above a 2×2 grid of quadrants, one per
// technique; its viewport is the bounding box of the grid, so the camera is zoomed out and only the
// quadrant titles are readable. Steps 2–5 frame one quadrant each (stage-sized, on a grid). The
// slide heading appears once, in the overview; each quadrant carries only its own title. Grammar of
// every quadrant: the full window
// on the left, what you do about it on the right. Colors by author as in slide 4: harness grey,
// human light-blue, model violet, tool result light-green. Near scale: outline-only blocks, text in
// the author color; far scale: thin strips in the light tint (`fill: 'solid'`); fresh model output
// is dashed. Every window has the far-scale zone meter (./meter) on its left.

type Author = 'grey' | 'light-blue' | 'violet' | 'light-green'

const PAD = 16
const LABEL_FONT = 18
const LABEL_LINE = 1.35
const LABEL_PAD = 32
const CHAR_DRAW = 0.5
const CHAR_MONO = 0.6

const COL_X = 880
const COL_W = 640
/** Width of the left column (window area): from x + 80 to just before the bullet column. */
const LEFT_W = 760
// The context window box, same size and place as on the glossary and context-window slides. Where a
// quadrant shows more than one window they share the height and the top edge; widths shrink to fit.
const WIN = { x: 80, y: 170, w: 440, h: 620 }
const TOP = WIN.y
const WIN_H = WIN.h
const LABEL_DY = 28

const QUADS: Viewport[] = [stageAt(0, 0), stageAt(1, 0), stageAt(0, 1), stageAt(1, 1)]
const OVERVIEW_MARGIN = 100
const TITLE_Y = -350
const OVERVIEW: Viewport = {
  x: QUADS[0].x - OVERVIEW_MARGIN,
  y: TITLE_Y - 30,
  w: QUADS[1].x + QUADS[1].w + OVERVIEW_MARGIN - (QUADS[0].x - OVERVIEW_MARGIN),
  h: QUADS[3].y + QUADS[3].h + OVERVIEW_MARGIN - (TITLE_Y - 30),
}

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

/** The zone meter (see ./meter) in a METER_W-wide slot at `x`, filled down to `level` (0..1). */
function meter(s: SlideBuilder, p: string, x: number, y: number, h: number, level: number): void {
  zoneMeter(s, `${p}meter-`, { x: x + METER_W / 2, y, h, level })
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

/** Quadrant title at the usual title position. The slide heading is only in the overview. */
function header(s: SlideBuilder, p: string, o: Viewport, name: string) {
  s.text(`${p}title`, { x: o.x + 80, y: o.y + 50, text: name, size: 'xl' })
}

// ---------------------------------------------------------------- step 1: overview

function overview(s: SlideBuilder) {
  s.text('title', { x: QUADS[0].x + 80, y: TITLE_Y, text: 'Managing context', size: 'xl', scale: 2.5 })
}

// ---------------------------------------------------------------- step 2: task sizing

function taskSizing(s: SlideBuilder) {
  const o = s.steps[1]
  header(s, 'q1-', o, QUAD_TITLES[0])
  const top = o.y + TOP

  // Three requests, one window each: meter + window per task, side by side in the left column. The
  // meter colours say where each task lands relative to the smart/dumb line.
  const TASKS: [string, number][] = [
    ['rename a function', 0.15],
    ['fix the login test', 0.4],
    ['migrate auth to the new library', 0.95],
  ]
  const winW = 180
  const groupW = METER_W + METER_GAP + winW
  const groupGap = (LEFT_W - TASKS.length * groupW) / (TASKS.length - 1)
  TASKS.forEach(([label, level], k) => {
    const p = `q1-t${k + 1}-`
    const gx = o.x + 80 + k * (groupW + groupGap)
    const win = s.rect(`${p}window`, { x: gx + METER_W + METER_GAP, y: top, w: winW, h: WIN_H, fill: 'none' })
    const end = history(s, p, win.x + PAD, top + PAD, winW - PAD * 2, top + WIN_H * level, [['grey', 12], ['light-blue', 12]], NOISE, 4)
    meter(s, p, gx, top, WIN_H, (end - 4 - top) / WIN_H)
    s.text(`${p}label`, { x: gx, y: top + WIN_H + LABEL_DY, text: label, size: 's', autoSize: false, w: groupW, textAlign: 'middle' })
  })

  bullets(s, 'q1-', o.x + COL_X, top, COL_W, Q1_BULLETS)
}

// ---------------------------------------------------------------- step 3: compaction

function compaction(s: SlideBuilder) {
  const o = s.steps[2]
  header(s, 'q2-', o, QUAD_TITLES[1])
  const top = o.y + TOP

  // Before: a long history that ends with the user typing /compact.
  const w1 = s.rect('q2-win1', { x: o.x + 120, y: top, w: 200, h: WIN_H, fill: 'none' })
  const bw1 = w1.w - PAD * 2
  const cmdH = labelH('/compact', bw1, true, 0.75)
  const y1 = history(s, 'q2-h', w1.x + PAD, top + PAD, bw1, top + WIN_H * 0.86 - cmdH - 4)
  const cmd = block(s, 'q2-cmd', { x: w1.x + PAD, y: y1 + 2, w: bw1, color: 'light-blue', text: '/compact', mono: true, scale: 0.75 })
  meter(s, 'q2-', o.x + 80, top, WIN_H, (cmd.y + cmd.h + PAD - top) / WIN_H)
  s.text('q2-win1-label', { x: w1.x, y: top + WIN_H + LABEL_DY, text: 'before', size: 's' })

  // After: system prompt, the summary, and an empty slot where the next prompt goes.
  const w2 = s.rect('q2-win2', { x: o.x + 430, y: top, w: 200, h: WIN_H, fill: 'none' })
  const bw = w2.w - PAD * 2
  let y = top + PAD
  strip(s, 'q2-sys', w2.x + PAD, y, bw, 14, 'grey')
  y += 20
  const sum = s.rect('q2-summary', { x: w2.x + PAD, y, w: bw, h: 90, label: 'summary', color: 'grey', labelColor: 'grey', fill: 'none', size: 's' })
  y = sum.y + sum.h + 8
  s.rect('q2-next-prompt', { x: w2.x + PAD, y, w: bw, h: 36, color: 'light-blue', fill: 'none', dash: 'draw', size: 's' })
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

const PLAN_FILE = 'PLAN.md\ngoal: auth on new library\ndone: login, logout\nnext: token refresh\ngotchas: 1s TTL flakes'

function handoff(s: SlideBuilder) {
  const o = s.steps[3]
  header(s, 'q3-', o, QUAD_TITLES[2])
  const top = o.y + TOP
  const SC = 0.75

  // Before: history, then the user asks for the file and the model writes it (history now, solid).
  const w1 = s.rect('q3-win1', { x: o.x + 120, y: top, w: 190, h: WIN_H, fill: 'none' })
  const bw1 = w1.w - PAD * 2
  const y1 = history(s, 'q3-h', w1.x + PAD, top + PAD, bw1, top + WIN_H * 0.42)
  const ask = block(s, 'q3-ask', { x: w1.x + PAD, y: y1 + 4, w: bw1, color: 'light-blue', text: 'Please write this to PLAN.md', scale: SC })
  const write = block(s, 'q3-write', { x: w1.x + PAD, y: ask.y + ask.h + 8, w: bw1, color: 'violet', text: '▶ Write PLAN.md', mono: true, scale: SC })
  meter(s, 'q3-', o.x + 80, top, WIN_H, (write.y + write.h + PAD - top) / WIN_H)
  s.text('q3-win1-label', { x: w1.x, y: top + WIN_H + LABEL_DY, text: 'before', size: 's' })

  // The file: blue-bordered, on disk, between the two windows, level with the Write call.
  const writeCy = write.y + write.h / 2
  const file = s.rect('q3-file', {
    x: o.x + 375,
    y: writeCy - 150,
    w: 120,
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

  // Fresh: system prompt, the user points at the file, the model reads it, the contents come back as
  // a tool result, then the first fresh response.
  const w2 = s.rect('q3-win2', { x: o.x + 555, y: top, w: 265, h: WIN_H, fill: 'none' })
  const bw2 = w2.w - PAD * 2
  let y = top + PAD
  strip(s, 'q3-sys', w2.x + PAD, y, bw2, 14, 'grey')
  y += 20
  const prompt = block(s, 'q3-prompt', { x: w2.x + PAD, y, w: bw2, color: 'light-blue', text: 'Read PLAN.md and implement', scale: SC })
  y = prompt.y + prompt.h + 8
  const read = block(s, 'q3-read', { x: w2.x + PAD, y, w: bw2, color: 'violet', text: '▶ Read PLAN.md', mono: true, scale: SC })
  y = read.y + read.h + 8
  const result = block(s, 'q3-result', { x: w2.x + PAD, y, w: bw2, color: 'light-green', text: PLAN_FILE, mono: true, scale: SC })
  y = result.y + result.h + 8
  strip(s, 'q3-next', w2.x + PAD, y, bw2, 14, 'violet', true)
  s.text('q3-win2-label', { x: w2.x, y: top + WIN_H + LABEL_DY, text: 'fresh', size: 's' })

  // Write: level arrow from the tool call into the file. Read: from the file up into the tool result.
  s.arrow('q3-write-arrow', { start: { x: write.x + write.w + 2, y: writeCy }, end: { x: file.x - 2, y: writeCy }, size: 's' })
  s.text('q3-write-label', { x: w1.x + w1.w, y: writeCy - 36, text: 'write', size: 's', autoSize: false, w: file.x - (w1.x + w1.w), textAlign: 'middle' })
  const readStart = { x: file.x + file.w + 2, y: file.y + 40 }
  const readEnd = { x: result.x - 2, y: result.y + result.h / 2 }
  s.arrow('q3-read-arrow', { start: readStart, end: readEnd, size: 's' })
  s.text('q3-read-label', { x: file.x + file.w + 6, y: Math.min(readStart.y, readEnd.y) - 36, text: 'read', size: 's' })

  bullets(s, 'q3-', o.x + COL_X, top, COL_W, Q3_BULLETS)
}

// ---------------------------------------------------------------- step 5: subagents

const SUB_PROMPT = 'Find where sessions expire and why the session test is flaky.'
const SUB_ANSWER = 'Sessions expire in src/auth/session.ts:42; the test uses a 1s TTL.'

function subagents(s: SlideBuilder) {
  const o = s.steps[4]
  header(s, 'q4-', o, QUAD_TITLES[3])
  const top = o.y + TOP
  const SC = 0.7

  // Main window, near scale: the task, one Agent call, one small result, the response.
  const main = s.rect('q4-main', { x: o.x + 120, y: top, w: 320, h: WIN_H, fill: 'none' })
  const bx = main.x + PAD
  const bw = main.w - PAD * 2
  let y = top + PAD
  strip(s, 'q4-sys', bx, y, bw, 12, 'grey')
  y += 18
  const user = block(s, 'q4-user', { x: bx, y, w: bw, color: 'light-blue', text: 'Fix the flaky session test', scale: SC })
  y = user.y + user.h + 6
  const call = block(s, 'q4-call', { x: bx, y, w: bw, color: 'violet', text: '▶ Agent { prompt: "Find where sessions expire…" }', mono: true, scale: SC })
  y = call.y + call.h + 6
  const result = block(s, 'q4-result', { x: bx, y, w: bw, color: 'light-green', text: SUB_ANSWER, mono: true, scale: SC })
  y = result.y + result.h + 6
  const response = block(s, 'q4-response', { x: bx, y, w: bw, color: 'violet', text: 'response', dashed: true, scale: SC })
  meter(s, 'q4-', o.x + 80, top, WIN_H, Math.min(YELLOW_END, (response.y + response.h - top) / WIN_H))
  s.text('q4-main-label', { x: main.x, y: top + WIN_H + LABEL_DY, text: 'main window', size: 's' })

  // The subagent's own window: the prompt, a lot of noisy work, the final answer at the bottom.
  const sub = s.rect('q4-sub', { x: o.x + 540, y: top, w: 280, h: Math.round(WIN_H * 0.8), fill: 'none' })
  const sx = sub.x + PAD
  const sw = sub.w - PAD * 2
  let sy = top + PAD
  strip(s, 'q4-sub-sys', sx, sy, sw, 12, 'grey')
  sy += 18
  const subUser = block(s, 'q4-sub-user', { x: sx, y: sy, w: sw, color: 'light-blue', text: SUB_PROMPT, scale: SC })
  sy = subUser.y + subUser.h + 8
  const answerH = labelH(SUB_ANSWER, sw, false, SC)
  const answerY = sub.y + sub.h - PAD - answerH
  history(s, 'q4-s', sx, sy, sw, answerY - 6, [], NOISE_DENSE, 4)
  const answer = block(s, 'q4-answer', { x: sx, y: answerY, w: sw, color: 'violet', text: SUB_ANSWER, scale: SC })
  s.text('q4-sub-label', { x: sub.x, y: sub.y + sub.h + LABEL_DY, text: 'subagent, its own window', size: 's' })

  // Out: the Agent call becomes the subagent's prompt. Back: its last message becomes the tool result.
  s.arrow('q4-send', {
    start: { x: call.x + call.w + 2, y: call.y + call.h / 2 },
    end: { x: subUser.x - 2, y: subUser.y + subUser.h / 2 },
    size: 's',
  })
  s.arrow('q4-return', {
    start: { x: answer.x - 2, y: answer.y + answer.h * 0.7 },
    end: { x: result.x + result.w + 2, y: result.y + result.h / 2 },
    bend: 12,
    size: 's',
  })

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
