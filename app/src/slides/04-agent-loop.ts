import { slide, STAGE, stageAt } from '../deck'
import type { ShapeRef, SlideBuilder } from '../deck'

// Three steps stacked vertically. Colors by author: harness grey, human light-blue, model violet,
// tool result light-green (teal). `fill: 'solid'` is tldraw's light tint of the color, `fill: 'fill'`
// the full color (meter). Fresh model output is dashed; it turns solid inside the next request.
// Geo labels: font 18px at size 's', label needs (18 * 1.35 + 32) * scale of height or the shape grows.

type Author = 'grey' | 'light-blue' | 'violet' | 'light-green'

const PAD = 16
const LABEL_FONT = 18
const LABEL_LINE = 1.35
const LABEL_PAD = 32
const CHAR_DRAW = 0.5
const CHAR_MONO = 0.6

const COL_X = 780
const COL_W = 740

interface BlockOpts {
  x: number
  y: number
  w: number
  color: Author
  text: string
  mono?: boolean
  dashed?: boolean
  scale?: number
  /** Minimum height; the label estimate wins when taller. */
  h?: number
  lighter?: boolean
}

/** Estimated label height for a geo label with size 's' and `scale`. */
function labelH(text: string, w: number, mono: boolean, scale: number) {
  const charW = LABEL_FONT * (mono ? CHAR_MONO : CHAR_DRAW) * scale
  const perLine = Math.max(1, Math.floor((w - LABEL_PAD * scale) / charW))
  // Greedy word wrap: a word that does not fit moves to the next line whole.
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

/** A message block at near scale: readable text, left-aligned, tinted by author. */
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
    fill: o.lighter ? 'semi' : 'solid',
    dash: o.dashed ? 'dashed' : 'draw',
    size: 's',
    font: o.mono ? 'mono' : 'draw',
    align: 'start',
    verticalAlign: 'start',
    scale,
  })
}

/** A message block at far scale: a thin tinted strip, no text. */
function strip(s: SlideBuilder, name: string, x: number, y: number, w: number, h: number, color: Author): ShapeRef {
  return s.rect(name, { x, y, w, h, color, fill: 'solid', dash: 'solid', size: 's' })
}

/** Headline + body bullets, same rhythm as slide 3. */
function bullets(s: SlideBuilder, prefix: string, x: number, y0: number, w: number, items: [string, string][], gap = 70) {
  let y = y0
  items.forEach(([head, body], i) => {
    const h = s.text(`${prefix}b${i + 1}-head`, { x, y, text: head, size: 'm' })
    const b = s.text(`${prefix}b${i + 1}-body`, { x, y: y + h.h + 4, text: body, size: 's', autoSize: false, w })
    y += h.h + b.h + gap
  })
}

const TASK = 'The login test is failing. Fix it.'
const SYSTEM_PROMPT =
  'You are a coding agent working in the user’s repository. Read files before you change them. Keep edits small and run the tests.'
const TOOLS = 'Tools: Read, Edit, Glob, Grep, Bash, WebFetch'

const TEST_OUTPUT = [
  '// src/auth/login.test.ts',
  "it('rejects an expired token', () => {",
  '  const token = issue({ ttl: -60 })',
  '  const res = login(token)',
  '  expect(res.status).toBe(401)',
  '})',
  '',
  'FAIL  login > rejects an expired token',
  '  expected 401, received 200',
  '  at login.test.ts:14',
  '  token.exp   = 1757260800',
  '  Date.now()  = 1757260800000',
].join('\n')

interface Turn {
  n: number
  result: string
  resultScale?: number
  say: string
  call?: string
}

const TURNS: Turn[] = [
  { n: 2, result: 'src/auth/login.test.ts', say: 'Reading it.', call: '▶ Read { path: "src/auth/login.test.ts" }' },
  {
    n: 3,
    result: TEST_OUTPUT,
    resultScale: 0.7,
    say: 'The check compares seconds to milliseconds.',
    call: '▶ Edit { path: "src/auth/login.ts", old: "exp < Date.now()", new: "exp * 1000 < Date.now()" }',
  },
  { n: 4, result: 'OK, 1 replacement', say: 'Running the tests.', call: '▶ Bash { command: "pnpm test login" }' },
  { n: 5, result: '✓ 4 tests passed', say: 'Fixed. The token expiry was in seconds but compared to milliseconds. Tests pass.' },
]

const STEP1_BULLETS: [string, string][] = [
  [
    'Your first message isn’t the start of the conversation.',
    'The harness adds a system message, descriptions of all the available tools and other things before you write your first word.',
  ],
  ['The response is always text.', 'The model cannot run anything; it writes "call this tool with these arguments" and stops.'],
  [
    'The harness runs the tool.',
    'It executes the tool call and sticks the agent message together with the tool result into the conversation history to construct the next request.',
  ],
]

const STEP3_BULLETS: [string, string][] = [
  [
    'Your second message lands on top of everything.',
    'The whole first task, every tool result, every intermediate answer, is still in the window. Nothing was cleaned up.',
  ],
  [
    'Check the level before you type.',
    'Every harness shows it somewhere: a percentage, a token count, a bar. If you are already near the dashed line, think twice before sending another prompt in this thread.',
  ],
]

// ---------------------------------------------------------------- step 1: one request

function stepOne(s: SlideBuilder) {
  const o = s.steps[0]
  s.text('title', { x: o.x + 80, y: o.y + 50, text: 'The agent loop', size: 'xl' })

  const win = s.rect('window', { x: o.x + 80, y: o.y + 170, w: 520, h: 540, fill: 'none' })
  const bx = win.x + PAD
  const bw = win.w - PAD * 2
  const sideX = win.x + win.w + 16
  let y = win.y + PAD

  const sys = block(s, 'system', { x: bx, y, w: bw, color: 'grey', text: SYSTEM_PROMPT })
  s.text('system-label', { x: sideX, y: sys.y + 4, text: 'system prompt', size: 's', color: 'grey' })
  y = sys.y + sys.h + 10

  const tools = block(s, 'tools', { x: bx, y, w: bw, color: 'grey', text: TOOLS, lighter: true })
  s.text('tools-label', { x: sideX, y: tools.y + 4, text: 'tool descriptions', size: 's', color: 'grey' })
  y = tools.y + tools.h + 22

  // Axis break: the window is much larger than drawn.
  const zig: { x: number; y: number }[] = []
  const teeth = 26
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

  const say = block(s, 'say', { x: bx, y, w: bw, color: 'violet', text: 'Let me find the test first.', dashed: true })
  s.text('say-label', { x: sideX, y: say.y + 4, text: 'response', size: 's', color: 'grey' })
  y = say.y + say.h + 6
  const call = block(s, 'call', {
    x: bx,
    y,
    w: bw,
    color: 'violet',
    text: '▶ Glob { pattern: "**/*login*.test.ts" }',
    mono: true,
    dashed: true,
  })
  s.text('call-label', { x: sideX, y: call.y + 4, text: 'tool call', size: 's', color: 'grey' })

  s.text('window-label', { x: win.x, y: win.y + win.h + 20, text: 'context window: request 1', size: 's' })

  bullets(s, '', o.x + COL_X, o.y + 170, COL_W, STEP1_BULLETS)
}

// ---------------------------------------------------------------- step 2: the loop

function stepTwo(s: SlideBuilder) {
  const o = s.steps[1]
  s.text('title-2', { x: o.x + 80, y: o.y + 50, text: 'The agent loop', size: 'xl' })
  s.text('caption', {
    x: o.x + 80,
    y: o.y + 118,
    text: 'Each window is a complete, fresh request. The model reads all of it, every time.',
    size: 'm',
  })

  const winW = 345
  const gap = 20
  const winY = o.y + 192
  const winH = 648
  const bw = winW - PAD * 2

  TURNS.forEach((t, i) => {
    const p = `w${t.n}-`
    const wx = o.x + 80 + i * (winW + gap)
    const win = s.rect(`${p}window`, { x: wx, y: winY, w: winW, h: winH, fill: 'none' })
    const bx = win.x + PAD
    let y = win.y + PAD

    // Collapsed history: system + tools on one line, the task, then older turns squished to strips.
    const sys = s.rect(`${p}system`, {
      x: bx,
      y,
      w: bw,
      h: 34,
      label: 'system prompt + tools',
      color: 'grey',
      fill: 'solid',
      dash: 'solid',
      size: 's',
      scale: 0.6,
      align: 'start',
    })
    y = sys.y + sys.h + 6
    const user = s.rect(`${p}user`, {
      x: bx,
      y,
      w: bw,
      h: 34,
      label: TASK,
      color: 'light-blue',
      fill: 'solid',
      dash: 'solid',
      size: 's',
      scale: 0.6,
      align: 'start',
    })
    y = user.y + user.h + 6
    const older = 2 * (t.n - 2) + 1
    for (let k = 0; k < older; k++) {
      const color: Author = k % 2 === 0 ? 'violet' : 'light-green'
      strip(s, `${p}old-${k + 1}`, bx, y, bw, 16, color)
      y += 22
    }
    y += 6

    // Current turn, readable: the tool result that came in, then the fresh response.
    const result = block(s, `${p}result`, {
      x: bx,
      y,
      w: bw,
      color: 'light-green',
      text: t.result,
      mono: true,
      scale: t.resultScale,
    })
    y = result.y + result.h + 10
    const say = block(s, `${p}say`, { x: bx, y, w: bw, color: 'violet', text: t.say, dashed: true })
    y = say.y + say.h + 6
    if (t.call) {
      block(s, `${p}call`, { x: bx, y, w: bw, color: 'violet', text: t.call, mono: true, dashed: true, scale: 0.85 })
    }

    s.text(`${p}label`, { x: win.x, y: win.y - 30, text: `request ${t.n}`, size: 's', color: 'grey' })
  })
}

// ---------------------------------------------------------------- step 3: the next prompt

function stepThree(s: SlideBuilder) {
  const o = s.steps[2]
  s.text('title-3', { x: o.x + 80, y: o.y + 50, text: 'The agent loop', size: 'xl' })

  const win = s.rect('window-3', { x: o.x + 80, y: o.y + 170, w: 520, h: 640, fill: 'none' })
  const bx = win.x + PAD
  const bw = win.w - PAD * 2
  let y = win.y + PAD

  // The whole first conversation, honest scale: solid compressed strips.
  strip(s, 'h-system', bx, y, bw, 16, 'grey')
  y += 22
  strip(s, 'h-user', bx, y, bw, 16, 'light-blue')
  y += 22
  const history: [Author, number][] = [
    ['violet', 10],
    ['light-green', 10],
    ['violet', 10],
    ['light-green', 36], // the test file
    ['violet', 14],
    ['light-green', 10],
    ['violet', 10],
    ['light-green', 10],
    ['violet', 14],
  ]
  history.forEach(([color, h], k) => {
    strip(s, `h-${k + 1}`, bx, y, bw, h, color)
    y += h + 5
  })
  y += 8

  const user2 = block(s, 'user-2', {
    x: bx,
    y,
    w: bw,
    color: 'light-blue',
    text: 'Great, now also add a test for expired tokens.',
  })
  y = user2.y + user2.h + 10
  const say2 = s.rect('say-2', {
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
  const levelY = say2.y + say2.h + PAD

  s.text('window-label-3', { x: win.x, y: win.y + win.h + 20, text: 'context window: request 6', size: 's' })

  // Thin meter on the right edge: zones from slide 3, filled down to just below the dashed line.
  const mx = win.x + win.w + 40
  const mw = 18
  const zones: [Author | 'green' | 'yellow' | 'orange' | 'red', number, number][] = [
    ['green', 0, 0.2],
    ['yellow', 0.2, 0.4],
    ['orange', 0.4, 0.5],
    ['red', 0.5, 1],
  ]
  const level = (levelY - win.y) / win.h
  zones.forEach(([color, from, to], k) => {
    const toClamped = Math.min(to, level)
    if (toClamped <= from) return
    s.rect(`meter-${k + 1}`, {
      x: mx,
      y: win.y + win.h * from,
      w: mw,
      h: win.h * (toClamped - from),
      color: color as 'green' | 'yellow' | 'orange' | 'red',
      fill: 'fill',
      dash: 'solid',
      size: 's',
    })
  })
  s.rect('meter', { x: mx, y: win.y, w: mw, h: win.h, fill: 'none', dash: 'solid', size: 's' })
  s.line('meter-limit', {
    points: [
      { x: mx - 8, y: win.y + win.h },
      { x: mx + mw + 8, y: win.y + win.h },
    ],
    size: 'xl',
    dash: 'solid',
  })
  const boundaryY = win.y + win.h * 0.5
  s.line('boundary-3', {
    points: [
      { x: win.x + win.w + 16, y: boundaryY },
      { x: mx + mw + 60, y: boundaryY },
    ],
    dash: 'dashed',
    size: 'm',
  })
  s.text('smart-3', { x: mx + mw + 12, y: boundaryY - 34, text: 'smart', size: 's', color: 'grey' })
  s.text('dumb-3', { x: mx + mw + 12, y: boundaryY + 8, text: 'dumb', size: 's', color: 'grey' })

  bullets(s, 's3-', o.x + COL_X, o.y + 170, COL_W, STEP3_BULLETS, 80)
}

export default slide(
  'agent-loop',
  'The agent loop',
  (s) => {
    stepOne(s)
    stepTwo(s)
    stepThree(s)
  },
  { viewports: [STAGE, stageAt(0, 1), stageAt(0, 2)] },
)
