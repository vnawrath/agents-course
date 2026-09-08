import { slide } from '../deck'
import type { ShapeRef, SlideBuilder } from '../deck'

// One step. Left: the agent loop from slide 4 compressed to a ring. The dashed violet model block
// (an edit and a tool call) sits at the top, the teal block "tests / linter / typecheck" closes the
// ring at the bottom: the harness runs the check, the result lands in the window, the model goes
// again. Your prompt enters the ring top-left, the ring exits bottom-right only when the check is
// green. Right column: the three bullets. Colors by author as on slide 4: human light-blue, model
// violet, tool result light-green (teal), harness grey; message blocks are outline-only with the
// text in the author color.

type Author = 'grey' | 'light-blue' | 'violet' | 'light-green'

const LABEL_FONT = 18
const LABEL_LINE = 1.35
const LABEL_PAD = 32
const CHAR_DRAW = 0.56
const CHAR_MONO = 0.6

const COL_X = 880
const COL_W = 640

const TASK = 'Fix the login test. Done when pnpm check passes.'
const MODEL = ['edit src/auth/login.ts', '▶ Bash { command: "pnpm check" }'].join('\n')
const CHECK_HEAD = 'tests / linter / typecheck'
const CHECK_OUT = ['$ pnpm check', '✗ test   expected 401, received 200', '✓ lint   0 problems', '✓ tsc    0 errors'].join('\n')
const DONE = '✓ all green → done'

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
  /** Minimum height; the label estimate wins when taller. */
  h?: number
}

/** A message block at near scale: outline in the author color, readable text in the same color. */
function block(s: SlideBuilder, name: string, o: BlockOpts): ShapeRef {
  const h = Math.max(o.h ?? 0, labelH(o.text, o.w, o.mono ?? false, 1))
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

  // ---- Entry: your prompt, top-left, outside the ring.
  const user = block(s, 'user', { x: 80, y: 190, w: 220, color: 'light-blue', text: TASK })
  s.text('user-label', { x: user.x, y: user.y - 30, text: 'your prompt', size: 's', color: 'grey' })

  // ---- Ring, top: the model's turn — an edit and the tool call. Fresh output, dashed.
  const model = block(s, 'model', { x: 360, y: 200, w: 420, color: 'violet', text: MODEL, mono: true, dashed: true })
  s.text('model-label', { x: model.x, y: model.y - 30, text: 'model: edit, then run the check', size: 's', color: 'grey' })

  // ---- Ring, bottom: the deterministic check closes the ring. Header + its output.
  const checkX = 300
  const checkW = 480
  const head = s.rect('check-head', {
    x: checkX,
    y: 560,
    w: checkW,
    h: 44,
    label: CHECK_HEAD,
    color: 'light-green',
    fill: 'fill',
    dash: 'solid',
    size: 's',
  })
  const out = block(s, 'check-out', { x: checkX, y: head.y + head.h, w: checkW, color: 'light-green', text: CHECK_OUT, mono: true })

  // The ring: harness runs the call (right side down), the result lands in the window (left side up).
  s.arrow('run', { from: 'model', to: 'check-head', bend: -170, label: 'harness runs it' })
  s.arrow('result', { from: 'check-head', to: 'model', bend: -170, label: 'result lands in the window' })
  s.text('again', {
    x: checkX + 120,
    y: (model.y + model.h + head.y) / 2 + 40,
    text: 'again, until it passes',
    size: 's',
    color: 'grey',
    autoSize: false,
    w: checkW - 240,
    textAlign: 'middle',
  })

  // Entry arrow into the ring.
  s.arrow('ask', { from: 'user', to: 'model' })

  // ---- Exit: only a green check ends the loop.
  const done = s.rect('done', {
    x: 560,
    y: out.y + out.h + 60,
    w: 220,
    h: 44,
    label: DONE,
    color: 'light-green',
    fill: 'solid',
    dash: 'solid',
    size: 's',
  })
  s.arrow('exit', { from: 'check-out', to: 'done' })
  void done

  bullets(s, COL_X, 170, COL_W, BULLETS)
})
