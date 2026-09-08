import { slide } from '../deck'
import type { ShapeRef, SlideBuilder } from '../deck'
import { meter, meterX, YELLOW_END } from './meter'

// One step. Two windows side by side, same box and meters as slide 8. Left: the model checks the
// login page by hand — Screenshot, Click, Type, Screenshot … — every call and every result lands in
// the window. The first turns are readable, then the sequence collapses into alternating violet /
// teal strips at far scale and the meter is deep in the dumb zone before the model can say anything.
// Right: the same task as one Bash call to the e2e suite. One call, one result, one answer, and the
// window is still mostly free. Right column: the three bullets.
// Colors by author as on slide 4: harness grey, human light-blue, model violet, tool result
// light-green (teal); near-scale blocks are outline-only with the text in the author color,
// far-scale strips the light tint.

type Author = 'grey' | 'light-blue' | 'violet' | 'light-green'

const PAD = 16
const LABEL_FONT = 18
const LABEL_LINE = 1.35
const LABEL_PAD = 32
const CHAR_DRAW = 0.56
const CHAR_MONO = 0.6

const COL_X = 980
const COL_W = 540

// Same two-window layout as slide 8: shared top edge and height of the standard context window box
// (80, 170, 440×620), narrower so the meters, the side labels and the bullets all fit.
const WIN_X = 120
const WIN_Y = 170
const WIN_W = 300
const WIN_H = 620
const LABEL_DY = 28
const STRIP_H = 9
const STRIP_PITCH = 11

/** Compact turn rows (slide 4 step 2 style): label at 0.6 scale in a fixed-height box. */
const ROW_SCALE = 0.6
const ROW_H = 34
const ROW_GAP = 6
/** A screenshot comes back as an image: many more tokens than an "ok", so a visibly taller row. */
const IMAGE_H = 58

const SYSTEM_PROMPT = 'You are a coding agent. …'
const TASK = 'Does login still work?'

/** Readable start of the exploration: [tool call, tool result, result is an image]. */
const TURNS: [string, string, boolean][] = [
  ['▶ Screenshot', 'image 1280×800', true],
  ['▶ Click { "Log in" }', 'ok', false],
]
/** The rest of the exploration, at far scale: alternating call / result strips. */
const MORE_STRIPS = 14
const EXPLORE_SAY = 'Login seems to work.'

const E2E_CALL = '▶ Bash { command: "pnpm e2e login" }'
const E2E_RESULT = ['✓ login.spec.ts', '  3 passed (4.1s)'].join('\n')
const E2E_SAY = 'Login works.'

const BULLETS: [string, string][] = [
  [
    'Everything that can be deterministic should be.',
    'Linting, formatting, e2e tests, codegen. The model can write the script, but the script does the same thing every time.',
  ],
  [
    'The model guesses, the tool knows.',
    'A test result or a type error is the only thing in the window that is not an opinion.',
  ],
  [
    'Give it a fast, loud feedback loop.',
    'One command that fails clearly is worth more than a page of instructions. Make the check the definition of done: ask for "tests pass", not for "looks right".',
  ],
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

/** Estimated label height for a geo label with size 's' and `scale` (same as slides 4–8). */
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
}

/** A message block at near scale: outline in the author color, readable text in the same color. */
function block(s: SlideBuilder, name: string, o: BlockOpts): ShapeRef {
  const h = labelH(o.text, o.w, o.mono ?? false, 1)
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
  })
}

/** A compact turn: one line of mono text at 0.6 scale in a fixed-height outline box. */
function row(s: SlideBuilder, name: string, x: number, y: number, w: number, h: number, color: Author, text: string): ShapeRef {
  return s.rect(name, {
    x,
    y,
    w,
    h,
    label: text,
    color,
    labelColor: color,
    fill: 'none',
    dash: 'draw',
    size: 's',
    font: 'mono',
    align: 'start',
    verticalAlign: 'middle',
    scale: ROW_SCALE,
  })
}

/** A message block at far scale: a thin tinted strip, no text. */
function strip(s: SlideBuilder, name: string, x: number, y: number, w: number, h: number, color: Author): ShapeRef {
  return s.rect(name, { x, y, w, h, color, fill: 'solid', dash: 'solid', size: 's' })
}

/** The dashed violet response block, same as slides 4, 6, 7 and 8. */
function response(s: SlideBuilder, name: string, x: number, y: number, w: number, text: string): ShapeRef {
  return s.rect(name, { x, y, w, h: 56, label: text, color: 'violet', labelColor: 'violet', fill: 'none', dash: 'dashed', size: 's' })
}

/**
 * Headline + body bullets, same rhythm as slides 3–8. The body height is estimated here with
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

export default slide('deterministic-tooling', 'Deterministic tooling', (s) => {
  s.text('title', { x: 80, y: 50, text: 'Deterministic tooling', size: 'xl' })

  const winY = WIN_Y
  const winH = WIN_H
  const gap = 10
  const bw = WIN_W - PAD * 2

  // ---- Left window: the model explores the page by hand, turn after turn.
  const lx = WIN_X
  const lbx = lx + PAD
  const sideX = lx + WIN_W + 16
  let y = winY + PAD

  const lsys = block(s, 'l-system', { x: lbx, y, w: bw, color: 'grey', text: SYSTEM_PROMPT })
  s.text('l-system-label', { x: sideX, y: lsys.y + 4, text: 'system prompt', size: 's', color: 'grey' })
  y = lsys.y + lsys.h + gap

  const luser = block(s, 'l-user', { x: lbx, y, w: bw, color: 'light-blue', text: TASK })
  s.text('l-user-label', { x: sideX, y: luser.y + 4, text: 'your prompt', size: 's', color: 'grey' })
  y = luser.y + luser.h + gap

  // Readable turns: the call (violet, history so solid) and what came back (teal).
  TURNS.forEach(([call, result, image], i) => {
    const c = row(s, `l-call-${i + 1}`, lbx, y, bw, ROW_H, 'violet', call)
    if (i === 0) s.text('l-call-label', { x: sideX, y: c.y - 2, text: 'tool call', size: 's', color: 'grey' })
    y = c.y + c.h + ROW_GAP
    const r = row(s, `l-result-${i + 1}`, lbx, y, bw, image ? IMAGE_H : ROW_H, 'light-green', result)
    if (i === 0) s.text('l-result-label', { x: sideX, y: r.y + 4, text: 'tool result', size: 's', color: 'grey' })
    y = r.y + r.h + ROW_GAP
  })

  // The rest of the exploration at far scale: call, result, call, result …
  y += 2
  const stackTop = y
  for (let i = 0; i < MORE_STRIPS; i++) {
    strip(s, `l-more-${i + 1}`, lbx, y, bw, STRIP_H, i % 2 === 0 ? 'violet' : 'light-green')
    y += STRIP_PITCH
  }
  const stackBottom = y - (STRIP_PITCH - STRIP_H)
  s.line('l-stack-bracket', {
    points: [
      { x: sideX - 8, y: stackTop },
      { x: sideX - 4, y: stackTop },
      { x: sideX - 4, y: stackBottom },
      { x: sideX - 8, y: stackBottom },
    ],
    size: 's',
    dash: 'solid',
    color: 'grey',
  })
  s.text('l-more-label', {
    x: sideX,
    y: (stackTop + stackBottom) / 2 - 24,
    text: `${MORE_STRIPS} more\nturns`,
    size: 's',
    color: 'grey',
  })
  y = stackBottom + 8

  const lsay = response(s, 'l-say', lbx, y, bw, EXPLORE_SAY)
  s.text('l-say-label', { x: sideX, y: lsay.y + 4, text: 'response', size: 's', color: 'grey' })

  s.rect('l-window', { x: lx, y: winY, w: WIN_W, h: winH, fill: 'none' })
  meter(s, 'l-', { x: meterX(lx), y: winY, h: winH, level: (lsay.y + lsay.h + PAD - winY) / winH })
  s.text('l-window-label', {
    x: lx,
    y: winY + winH + LABEL_DY,
    text: `exploring: ${TURNS.length * 2 + MORE_STRIPS} browser turns`,
    size: 's',
  })

  // ---- Right window: the same check as one deterministic run.
  const rx = lx + WIN_W + 200
  const rbx = rx + PAD
  y = winY + PAD

  s.rect('r-window', { x: rx, y: winY, w: WIN_W, h: winH, fill: 'none' })

  const rsys = block(s, 'r-system', { x: rbx, y, w: bw, color: 'grey', text: SYSTEM_PROMPT })
  y = rsys.y + rsys.h + gap

  const ruser = block(s, 'r-user', { x: rbx, y, w: bw, color: 'light-blue', text: TASK })
  y = ruser.y + ruser.h + gap

  const rcall = block(s, 'r-call', { x: rbx, y, w: bw, color: 'violet', text: E2E_CALL, mono: true })
  y = rcall.y + rcall.h + gap

  const rresult = block(s, 'r-result', { x: rbx, y, w: bw, color: 'light-green', text: E2E_RESULT, mono: true })
  y = rresult.y + rresult.h + gap

  const rsay = response(s, 'r-say', rbx, y, bw, E2E_SAY)
  y = rsay.y + rsay.h
  meter(s, 'r-', { x: meterX(rx), y: winY, h: winH, level: Math.min(YELLOW_END, (y + PAD - winY) / winH) })

  // The rest of the window is free.
  s.text('r-free', {
    x: rx,
    y: y + (winY + winH - y) / 2 - 14,
    text: 'free',
    size: 's',
    color: 'grey',
    autoSize: false,
    w: WIN_W,
    textAlign: 'middle',
  })
  s.text('r-window-label', { x: rx, y: winY + winH + LABEL_DY, text: 'deterministic: 1 e2e run', size: 's' })

  bullets(s, COL_X, 170, COL_W, BULLETS)
})
