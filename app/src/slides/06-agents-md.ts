import { slide } from '../deck'
import type { ShapeRef, SlideBuilder } from '../deck'
import { ZOOM_TAIL, zoomedMeter } from './meter'

// One step. Left: the near-scale window from slide 4. The harness section is one grey line (system
// prompt, tool descriptions, …) and a long, realistic AGENTS.md, ringed as the one block you control,
// with a callout; then your prompt and the dashed response; the axis break sits near the bottom edge.
// Right: four bullets from the author's notes. Colors by author as on slide 4: harness grey, human
// light-blue, model violet; outline-only blocks with the text in the author color.

type Author = 'grey' | 'light-blue' | 'violet' | 'light-green'

const PAD = 16
const LABEL_FONT = 18
const LABEL_LINE = 1.35
const LABEL_PAD = 32
const CHAR_DRAW = 0.56
const CHAR_MONO = 0.6

const COL_X = 800
const COL_W = 720

/** The context window box, same size and place as on the glossary and context-window slides. */
const WIN = { x: 80, y: 170, w: 440, h: 620 }
const LABEL_DY = 28

const HARNESS = 'system prompt · tool descriptions · …'
/** Mono, drawn at AGENTS_SCALE: ~41 chars fit per line at that scale, so every line is kept under 40. */
const AGENTS_SCALE = 0.85
const AGENTS_MD = [
  '# AGENTS.md',
  '',
  '## Run and verify',
  'pnpm dev · pnpm test · pnpm check',
  'Run pnpm check (lint + tsc) before you',
  'say you are done.',
  '## Glossary',
  'Record = a medical report (src/records/)',
  'Case = all records of one patient',
  '## Corrections',
  'Do not add dependencies without asking.',
  'The e2e suite needs `pnpm db:seed` first.',
  '## More',
  'Auth flow: docs/auth.md',
  'Releases: /release skill',
].join('\n')
const TASK = 'The login test is failing. Fix it.'

const BULLETS: [string, string][] = [
  [
    'It is attached to every request.',
    'Read at the start of every thread and sent again with every request after that. Every line is a permanent tax, so keep it as short as possible: only what every task needs.',
  ],
  [
    'What belongs in it.',
    'How to run and test the app, so the agent can verify its own work. A glossary of the most important concepts ("Records" means the medical reports in …). Corrections for the mistakes agents actually make in this repo, added from usage, not prefilled.',
  ],
  [
    'What does not.',
    'If it is not relevant to every request, it goes somewhere else: a docs/ directory that AGENTS.md links to, a skill, README.md or CONTRIBUTING.md. Do not have it AI-generated; write it yourself and tighten it like code.',
  ],
  ['CLAUDE.md', 'Claude Code reads CLAUDE.md instead. Make it one line, @AGENTS.md, and keep a single source of truth.'],
]

/** Word-wrapped line count of `text` at `perLine` characters per line. */
function wrapLines(text: string, perLine: number) {
  return text.split('\n').reduce((n, line) => {
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
}

/** Estimated label height for a geo label with size 's' and `scale` (same as slides 4 and 5). */
function labelH(text: string, w: number, mono: boolean, scale: number) {
  const charW = LABEL_FONT * (mono ? CHAR_MONO : CHAR_DRAW) * scale
  const lines = wrapLines(text, Math.max(1, Math.floor((w - LABEL_PAD * scale) / charW)))
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
  /** Label scale (font and padding); the block itself stays `w` wide. */
  scale?: number
  /** Extra height on top of the estimate; the estimate is rough for mono text. */
  slack?: number
}

/** A message block at near scale: outline in the author color, readable text in the same color. */
function block(s: SlideBuilder, name: string, o: BlockOpts): ShapeRef {
  const scale = o.scale ?? 1
  const h = labelH(o.text, o.w, o.mono ?? false, scale) + (o.slack ?? 0)
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

/**
 * Headline + body bullets, same rhythm as slides 3–5. The body height is estimated here with
 * word wrapping (the DSL's estimate ignores word breaks and lands a line short on long bodies).
 */
function bullets(s: SlideBuilder, x: number, y0: number, w: number, items: [string, string][], gap = 78) {
  let y = y0
  items.forEach(([head, body], i) => {
    const h = s.text(`b${i + 1}-head`, { x, y, text: head, size: 'm' })
    s.text(`b${i + 1}-body`, { x, y: y + h.h + 4, text: body, size: 's', autoSize: false, w })
    const bodyH = wrapLines(body, Math.floor(w / (18 * CHAR_DRAW))) * 18 * LABEL_LINE
    y += h.h + 4 + bodyH + gap
  })
}

export default slide('agents-md', 'AGENTS.md', (s) => {
  s.text('title', { x: 80, y: 50, text: 'AGENTS.md', size: 'xl' })

  // Left: the window, the shared size; the callout sits in the gap beside it.
  // The window is drawn after its content so it can grow to fit the content plus the axis break.
  const win = { ...WIN }
  const bx = win.x + PAD
  const bw = win.w - PAD * 2
  const sideX = win.x + win.w + 16
  let y = win.y + PAD

  // The rest of the harness section, compacted into one line.
  const harness = block(s, 'harness', { x: bx, y, w: bw, color: 'grey', text: HARNESS })
  s.text('harness-label', { x: sideX, y: harness.y + 4, text: 'harness', size: 's', color: 'grey' })
  y = harness.y + harness.h + 14

  // AGENTS.md: a harness block like the others, but ringed — the one you control.
  const agents = block(s, 'agents', { x: bx, y, w: bw, color: 'grey', text: AGENTS_MD, mono: true, scale: AGENTS_SCALE })
  s.rect('agents-ring', {
    x: agents.x - 7,
    y: agents.y - 7,
    w: agents.w + 14,
    h: agents.h + 14,
    fill: 'none',
    dash: 'draw',
    size: 'l',
  })
  s.text('agents-label', { x: sideX, y: agents.y + 4, text: 'AGENTS.md', size: 's' })
  const callout = s.text('callout', {
    x: sideX + 36,
    y: agents.y + 44,
    text: 'in every request, whether you need it or not',
    size: 's',
    autoSize: false,
    w: 190,
  })
  s.arrow('callout-arrow', {
    start: { x: callout.x - 6, y: callout.y + 30 },
    to: 'agents-ring',
    size: 's',
  })
  y = agents.y + agents.h + 14

  const user = block(s, 'user', { x: bx, y, w: bw, color: 'light-blue', text: TASK })
  s.text('user-label', { x: sideX, y: user.y + 4, text: 'your prompt', size: 's', color: 'grey' })
  y = user.y + user.h + 12

  const say = s.rect('say', {
    x: bx,
    y,
    w: bw,
    h: 44,
    label: 'response',
    color: 'violet',
    labelColor: 'violet',
    fill: 'none',
    dash: 'dashed',
    size: 's',
  })
  s.text('say-label', { x: sideX, y: say.y + 4, text: 'response', size: 's', color: 'grey' })
  y = say.y + say.h

  // The window, never shorter than the shared box; then the zoomed meter beside it and the axis
  // break across it (as on slide 4): what is drawn is only the start of the smart zone.
  win.h = Math.max(WIN.h, y - win.y + ZOOM_TAIL)
  s.rect('window', { ...win, fill: 'none' })
  zoomedMeter(s, '', { win, contentEnd: y, labelX: sideX })

  s.text('window-label', { x: win.x, y: win.y + win.h + LABEL_DY, text: 'context window: every request', size: 's' })

  bullets(s, COL_X, 170, COL_W, BULLETS, 56)
})
