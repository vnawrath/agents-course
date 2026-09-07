import { slide } from '../deck'
import type { ShapeRef, SlideBuilder } from '../deck'

// One step. Left: the near-scale window from slide 4 with its harness blocks (system prompt, tool
// descriptions, AGENTS.md), the AGENTS.md block ringed as the one you control, with a callout;
// then the axis break, your prompt and the dashed response. Right: the three bullets.
// Colors by author: harness grey, human light-blue, model violet; `fill: 'solid'` is the light tint.

type Author = 'grey' | 'light-blue' | 'violet' | 'light-green'

const PAD = 16
const LABEL_FONT = 18
const LABEL_LINE = 1.35
const LABEL_PAD = 32
const CHAR_DRAW = 0.56
const CHAR_MONO = 0.6

const COL_X = 800
const COL_W = 720

const SYSTEM_PROMPT =
  'You are a coding agent working in the user’s repository. Read files before you change them. Keep edits small and run the tests.'
const TOOLS = 'Tools: Read, Edit, Glob, Grep, Bash, WebFetch'
const AGENTS_MD = [
  '# AGENTS.md',
  'build: pnpm build   test: pnpm test',
  'run:   pnpm dev',
  'rules: small PRs, no new deps',
  'where: app/src code, design/ plans',
].join('\n')
const TASK = 'The login test is failing. Fix it.'

const BULLETS: [string, string][] = [
  [
    'It is the one block you control in the harness section.',
    'Read at the start of every thread, and in every request after that.',
  ],
  [
    'Every line is a permanent tax.',
    'Keep what every task needs: how to build, test and run, the two or three house rules, where things live. Nothing else.',
  ],
  ['It is not a wish list.', 'A long AGENTS.md is a bad prompt on every request. Tighten it like code.'],
]

/** Estimated label height for a geo label with size 's' and `scale` (same as slides 4 and 5). */
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
  lighter?: boolean
}

/** A message block at near scale: readable text, left-aligned, tinted by author. */
function block(s: SlideBuilder, name: string, o: BlockOpts): ShapeRef {
  const h = labelH(o.text, o.w, o.mono ?? false, 1)
  return s.rect(name, {
    x: o.x,
    y: o.y,
    w: o.w,
    h,
    label: o.text,
    color: o.color,
    fill: o.lighter ? 'semi' : 'solid',
    dash: o.dashed ? 'dashed' : 'draw',
    size: 's',
    font: o.mono ? 'mono' : 'draw',
    align: 'start',
    verticalAlign: 'start',
  })
}

/** Headline + body bullets, same rhythm as slides 3–5. */
function bullets(s: SlideBuilder, x: number, y0: number, w: number, items: [string, string][], gap = 78) {
  let y = y0
  items.forEach(([head, body], i) => {
    const h = s.text(`b${i + 1}-head`, { x, y, text: head, size: 'm' })
    const b = s.text(`b${i + 1}-body`, { x, y: y + h.h + 4, text: body, size: 's', autoSize: false, w })
    y += h.h + b.h + gap
  })
}

export default slide('agents-md', 'AGENTS.md', (s) => {
  s.text('title', { x: 80, y: 50, text: 'AGENTS.md', size: 'xl' })

  // Left: the window, a little narrower than on slide 4 to leave room for the callout beside it.
  const win = s.rect('window', { x: 80, y: 170, w: 470, h: 640, fill: 'none' })
  const bx = win.x + PAD
  const bw = win.w - PAD * 2
  const sideX = win.x + win.w + 16
  let y = win.y + PAD

  const sys = block(s, 'system', { x: bx, y, w: bw, color: 'grey', text: SYSTEM_PROMPT })
  s.text('system-label', { x: sideX, y: sys.y + 4, text: 'system prompt', size: 's', color: 'grey' })
  y = sys.y + sys.h + 10

  const tools = block(s, 'tools', { x: bx, y, w: bw, color: 'grey', text: TOOLS, lighter: true })
  s.text('tools-label', { x: sideX, y: tools.y + 4, text: 'tool descriptions', size: 's', color: 'grey' })
  y = tools.y + tools.h + 10

  // AGENTS.md: a harness block like the others, but ringed — the one you control.
  const agents = block(s, 'agents', { x: bx, y, w: bw, color: 'grey', text: AGENTS_MD, mono: true })
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
  y = agents.y + agents.h + 24

  // Axis break: the window is much larger than drawn.
  const zig: { x: number; y: number }[] = []
  const teeth = 24
  const x0 = win.x - 14
  const x1 = win.x + win.w + 14
  for (let i = 0; i <= teeth; i++) {
    zig.push({ x: x0 + ((x1 - x0) * i) / teeth, y: y + (i % 2 === 0 ? 0 : 14) })
  }
  s.line('axis-break', { points: zig, dash: 'solid', size: 's', color: 'grey' })
  s.text('axis-break-label', { x: sideX, y: y - 6, text: '… much more', size: 's', color: 'grey' })
  y += 14 + 22

  const user = block(s, 'user', { x: bx, y, w: bw, color: 'light-blue', text: TASK })
  s.text('user-label', { x: sideX, y: user.y + 4, text: 'your prompt', size: 's', color: 'grey' })
  y = user.y + user.h + 14

  const say = s.rect('say', {
    x: bx,
    y,
    w: bw,
    h: 56,
    label: 'response',
    color: 'violet',
    fill: 'solid',
    dash: 'dashed',
    size: 's',
  })
  s.text('say-label', { x: sideX, y: say.y + 4, text: 'response', size: 's', color: 'grey' })

  s.text('window-label', { x: win.x, y: win.y + win.h + 20, text: 'context window: every request', size: 's' })

  bullets(s, COL_X, 170, COL_W, BULLETS)
})
