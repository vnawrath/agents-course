import { slide, STAGE, STAGE_GAP, stageAt } from '../deck'
import type { ShapeRef, SlideBuilder } from '../deck'

// Three steps stacked vertically. Colors by author: harness grey, human light-blue, model violet,
// tool result light-green (teal). Near scale: outline-only blocks, text in the author color. Far
// scale: thin strips in the light tint (`fill: 'solid'`); `fill: 'fill'` is the full color (meter).
// Fresh model output is dashed; it turns solid inside the next request.
// Geo labels: font 18px at size 's', label needs (18 * 1.35 + 32) * scale of height or the shape grows.

type Author = 'grey' | 'light-blue' | 'violet' | 'light-green'

const PAD = 16
const LABEL_FONT = 18
const LABEL_LINE = 1.35
const LABEL_PAD = 32
const CHAR_DRAW = 0.52
const CHAR_MONO = 0.6

const COL_X = 780
const COL_W = 740

/** The context window box, same size and place as on the glossary and context-window slides. */
const WIN = { x: 80, y: 170, w: 440, h: 620 }
const LABEL_DY = 28

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
}

/** Greedy word-wrap line count: a word that does not fit moves to the next line whole. */
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

/** Estimated label height for a geo label with size 's' and `scale`. */
function labelH(text: string, w: number, mono: boolean, scale: number) {
  const charW = LABEL_FONT * (mono ? CHAR_MONO : CHAR_DRAW) * scale
  const perLine = Math.max(1, Math.floor((w - LABEL_PAD * scale) / charW))
  const lines = wrapLines(text, perLine)
  return Math.ceil((lines * LABEL_FONT * LABEL_LINE + LABEL_PAD) * scale) + 6
}

/** Estimated height of a fixed-width size 's' text shape: 24 px per wrapped line at scale 1. */
function textH(text: string, w: number, mono: boolean, scale: number) {
  const charW = LABEL_FONT * (mono ? CHAR_MONO : CHAR_DRAW) * scale
  const lines = wrapLines(text, Math.max(1, Math.floor(w / charW)))
  return Math.ceil(lines * Math.round(LABEL_FONT * LABEL_LINE) * scale)
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

const TEST_FILE = [
  '// src/auth/login.test.ts',
  "it('rejects an expired token', () => {",
  '  const exp = Date.now() / 1000 - 60 // seconds',
  '  const token = issue({ exp })',
  '  const res = login(token)',
  '  expect(res.status).toBe(401)',
  '})',
].join('\n')

interface Response {
  say: string
  call?: string
}

/** The model's response in requests 1–4. Request n+1 replays response n solid, above tool result n. */
const RESPONSES: Response[] = [
  { say: 'Let me read the test first.', call: '▶ Read { path: "src/auth/login.test.ts" }' },
  {
    say: 'The check compares seconds to milliseconds.',
    call: '▶ Edit { path: "src/auth/login.ts", old: "exp < Date.now()", new: "exp * 1000 < Date.now()" }',
  },
  { say: 'Running the tests.', call: '▶ Bash { command: "pnpm test login" }' },
  { say: 'Fixed. The token expiry was in seconds but compared to milliseconds. Tests pass.' },
]

/** Tool results 1–3: what the harness got back from Read, Edit and Bash. */
const RESULTS: { text: string; scale?: number }[] = [
  { text: TEST_FILE, scale: 0.7 },
  { text: 'OK, 1 replacement' },
  { text: '✓ 4 tests passed' },
]

/**
 * One response as a single box: the sentence in the draw font and the tool call in mono. A geo label
 * has one font, so these are text shapes inside a plain rect. Dashed while fresh, solid once it is
 * history inside the next request.
 */
function response(
  s: SlideBuilder,
  name: string,
  o: { x: number; y: number; w: number; r: Response; dashed: boolean; scale?: number },
): { ref: ShapeRef; callY: number } {
  const scale = o.scale ?? 1
  const inner = (LABEL_PAD / 2) * scale
  const tw = o.w - inner * 2
  const gap = 12 * scale
  const sayH = textH(o.r.say, tw, false, scale)
  const callH = o.r.call ? textH(o.r.call, tw, true, scale) : 0
  const h = inner * 2 + sayH + (o.r.call ? gap + callH : 0)
  const ref = s.rect(name, {
    x: o.x,
    y: o.y,
    w: o.w,
    h,
    color: 'violet',
    fill: 'none',
    dash: o.dashed ? 'dashed' : 'draw',
    size: 's',
  })
  s.text(`${name}-text`, { x: o.x + inner, y: o.y + inner, w: tw, autoSize: false, text: o.r.say, size: 's', color: 'violet', scale })
  const callY = o.y + inner + sayH + gap
  if (o.r.call) {
    s.text(`${name}-call`, {
      x: o.x + inner,
      y: callY,
      w: tw,
      autoSize: false,
      text: o.r.call,
      size: 's',
      color: 'violet',
      font: 'mono',
      scale,
    })
  }
  return { ref, callY }
}

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

  const win = s.rect('window', { x: o.x + WIN.x, y: o.y + WIN.y, w: WIN.w, h: WIN.h, fill: 'none' })
  const bx = win.x + PAD
  const bw = win.w - PAD * 2
  const sideX = win.x + win.w + 16
  let y = win.y + PAD

  // The break line near the bottom says the window is far larger than what is drawn.
  const sys = block(s, 'system', { x: bx, y, w: bw, color: 'grey', text: SYSTEM_PROMPT })
  s.text('system-label', { x: sideX, y: sys.y + 4, text: 'system prompt', size: 's', color: 'grey' })
  y = sys.y + sys.h + 10

  const tools = block(s, 'tools', { x: bx, y, w: bw, color: 'grey', text: TOOLS })
  s.text('tools-label', { x: sideX, y: tools.y + 4, text: 'tool descriptions', size: 's', color: 'grey' })
  y = tools.y + tools.h + 14

  const user = block(s, 'user', { x: bx, y, w: bw, color: 'light-blue', text: TASK })
  s.text('user-label', { x: sideX, y: user.y + 4, text: 'your prompt', size: 's', color: 'grey' })
  y = user.y + user.h + 14

  // One response: a single dashed box, the sentence and the tool call.
  const { ref: say, callY } = response(s, 'say', { x: bx, y, w: bw, r: RESPONSES[0], dashed: true })
  s.text('say-label', { x: sideX, y: say.y + 4, text: 'response', size: 's', color: 'grey' })
  s.text('call-label', { x: sideX, y: callY - 4, text: 'tool call', size: 's', color: 'grey' })

  // Axis break near the bottom edge: the window is much larger than drawn.
  const breakY = win.y + win.h - 70
  const zig: { x: number; y: number }[] = []
  const teeth = 26
  const x0 = win.x - 14
  const x1 = win.x + win.w + 14
  for (let i = 0; i <= teeth; i++) {
    zig.push({ x: x0 + ((x1 - x0) * i) / teeth, y: breakY + (i % 2 === 0 ? 0 : 14) })
  }
  s.line('axis-break', { points: zig, dash: 'solid', size: 's', color: 'grey' })
  s.text('axis-break-label', { x: sideX, y: breakY - 6, text: '… much more', size: 's', color: 'grey' })

  s.text('window-label', { x: win.x, y: win.y + win.h + LABEL_DY, text: 'context window: request 1', size: 's' })

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

  // Three windows of the shared size fill the stage width: 80 + 3 × 440 + 2 × 60 = 1520.
  const winW = WIN.w
  const requests = RESULTS.length
  const gap = (STAGE.w - 2 * WIN.x - requests * winW) / (requests - 1)
  const winY = o.y + WIN.y
  const bw = winW - PAD * 2

  // Window i shows request n = i + 2. Only the system prompt + tools and the task are collapsed;
  // every turn is readable, so each window is visibly taller than the one before it. Requests 3
  // and 4 grow past the bottom of the stage on purpose: pan to see the rest.
  RESULTS.forEach((_, i) => {
    const n = i + 2
    const p = `w${n}-`
    const wx = o.x + WIN.x + i * (winW + gap)
    const bx = wx + PAD
    let y = winY + PAD

    const sys = s.rect(`${p}system`, {
      x: bx,
      y,
      w: bw,
      h: 34,
      label: 'system prompt + tools',
      color: 'grey',
      labelColor: 'grey',
      fill: 'none',
      dash: 'draw',
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
      labelColor: 'light-blue',
      fill: 'none',
      dash: 'draw',
      size: 's',
      scale: 0.6,
      align: 'start',
    })
    y = user.y + user.h + 10

    // Every turn so far: the response that asked for the tool (solid now, it is history) and the
    // tool result that came back.
    for (let k = 0; k <= i; k++) {
      const prev = response(s, `${p}say-${k + 1}`, { x: bx, y, w: bw, r: RESPONSES[k], dashed: false }).ref
      y = prev.y + prev.h + 10
      const result = block(s, `${p}result-${k + 1}`, {
        x: bx,
        y,
        w: bw,
        color: 'light-green',
        text: RESULTS[k].text,
        mono: true,
        scale: RESULTS[k].scale,
      })
      y = result.y + result.h + 10
    }
    // The fresh response.
    const say = response(s, `${p}say`, { x: bx, y, w: bw, r: RESPONSES[i + 1], dashed: true }).ref
    y = say.y + say.h + PAD

    // The window itself, drawn last so its height fits the content. Never shorter than the shared box.
    const winH = Math.max(WIN.h, y - winY)
    s.rect(`${p}window`, { x: wx, y: winY, w: winW, h: winH, fill: 'none' })
    s.text(`${p}label`, { x: wx, y: winY + winH + LABEL_DY, text: `context window: request ${n}`, size: 's' })
  })
}

// ---------------------------------------------------------------- step 3: the next prompt

function stepThree(s: SlideBuilder) {
  const o = s.steps[2]
  s.text('title-3', { x: o.x + 80, y: o.y + 50, text: 'The agent loop', size: 'xl' })

  const win = s.rect('window-3', { x: o.x + WIN.x, y: o.y + WIN.y, w: WIN.w, h: WIN.h, fill: 'none' })
  const bx = win.x + PAD
  const bw = win.w - PAD * 2
  let y = win.y + PAD

  // The whole first conversation, honest scale: solid compressed strips.
  strip(s, 'h-system', bx, y, bw, 16, 'grey')
  y += 22
  strip(s, 'h-user', bx, y, bw, 16, 'light-blue')
  y += 22
  // Requests 1–4: Read, Edit, Bash, final answer.
  const history: [Author, number][] = [
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
    labelColor: 'violet',
    fill: 'none',
    dash: 'dashed',
    size: 's',
  })
  const levelY = say2.y + say2.h + PAD

  s.text('window-label-3', { x: win.x, y: win.y + win.h + LABEL_DY, text: 'context window: request 5', size: 's' })

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
  // Step 3 sits one extra gap lower: the request 3 and 4 windows in step 2 grow below their stage.
  { viewports: [STAGE, stageAt(0, 1), { ...stageAt(0, 2), y: stageAt(0, 2).y + STAGE_GAP }] },
)
