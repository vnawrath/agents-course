import { slide } from '../deck'
import type { ShapeRef, SlideBuilder } from '../deck'

// One step. Two windows side by side. Left: the system prompt, then a thick grey stack of tool
// descriptions at far scale (thirty thin strips, three MCP servers, labelled in the gap beside the
// window), then your prompt and the dashed response — the window is nearly full before any work.
// Right: the same window with one thin grey strip, run_command, doing the same job via CLI; the
// prompt and response follow and the rest of the window is free. Right column: the three bullets.
// Colors by author: harness grey, human light-blue, model violet; `fill: 'solid'` is the light tint.

type Author = 'grey' | 'light-blue' | 'violet' | 'light-green'

const PAD = 16
const LABEL_FONT = 18
const LABEL_LINE = 1.35
const LABEL_PAD = 32
const CHAR_DRAW = 0.56
const CHAR_MONO = 0.6

const COL_X = 880
const COL_W = 640

const WIN_W = 250
const STRIP_H = 9
const STRIP_PITCH = 12
const GROUP_GAP = 12

const SYSTEM_PROMPT = 'You are a coding agent. …'
const TASK = 'Open a PR for the fix.'
const SERVERS: [string, number][] = [
  ['github MCP', 10],
  ['postgres MCP', 10],
  ['slack MCP', 10],
]

const BULLETS: [string, string][] = [
  [
    'Every tool description sits in the window before you type.',
    'Thirty tools is thousands of tokens on every request, whether you use them or not.',
  ],
  ['MCP is convenient, not free.', 'Connect the servers the task needs and remove the ones it does not.'],
  [
    'A CLI the model already knows costs one tool.',
    'gh, git, psql, curl: the model knows how to use them and the description is a single line.',
  ],
]

/** Estimated label height for a geo label with size 's' and `scale` (same as slides 4–7). */
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

/** A message block at far scale: a thin tinted strip, no text. */
function strip(s: SlideBuilder, name: string, x: number, y: number, w: number, h: number, color: Author): ShapeRef {
  return s.rect(name, { x, y, w, h, color, fill: 'solid', dash: 'solid', size: 's' })
}

/** The dashed violet response block, same as slides 6 and 7. */
function response(s: SlideBuilder, name: string, x: number, y: number, w: number): ShapeRef {
  return s.rect(name, { x, y, w, h: 56, label: 'response', color: 'violet', fill: 'solid', dash: 'dashed', size: 's' })
}

/** Headline + body bullets, same rhythm as slides 3–7; heads wrap inside the column. */
function bullets(s: SlideBuilder, x: number, y0: number, w: number, items: [string, string][], gap = 78) {
  let y = y0
  items.forEach(([head, body], i) => {
    const h = s.text(`b${i + 1}-head`, { x, y, text: head, size: 'm', autoSize: false, w })
    const b = s.text(`b${i + 1}-body`, { x, y: y + h.h + 4, text: body, size: 's', autoSize: false, w })
    y += h.h + b.h + gap
  })
}

export default slide('mcp-vs-cli', 'MCP vs CLI', (s) => {
  s.text('title', { x: 80, y: 50, text: 'MCP vs CLI', size: 'xl' })

  const winY = 170
  const gap = 10

  // ---- Left window: thirty MCP tool descriptions above the prompt. Drawn first, its height sets both.
  const lx = 80
  const lbx = lx + PAD
  const bw = WIN_W - PAD * 2
  const sideX = lx + WIN_W + 16
  let y = winY + PAD

  const lsys = block(s, 'l-system', { x: lbx, y, w: bw, color: 'grey', text: SYSTEM_PROMPT })
  s.text('l-system-label', { x: sideX, y: lsys.y + 4, text: 'system prompt', size: 's', color: 'grey' })
  y = lsys.y + lsys.h + gap

  const stackTop = y
  SERVERS.forEach(([server, count], g) => {
    s.text(`l-group-${g + 1}-label`, { x: sideX, y: y - 4, text: `${server}\n${count} tools`, size: 's', color: 'grey' })
    for (let i = 0; i < count; i++) {
      strip(s, `l-tool-${g + 1}-${i + 1}`, lbx, y, bw, STRIP_H, 'grey')
      y += STRIP_PITCH
    }
    y += GROUP_GAP - (STRIP_PITCH - STRIP_H)
  })
  const stackBottom = y - GROUP_GAP
  // A bracket in the gap marks the whole stack as tool descriptions.
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
  y = stackBottom + 14

  const luser = block(s, 'l-user', { x: lbx, y, w: bw, color: 'light-blue', text: TASK })
  s.text('l-user-label', { x: sideX, y: luser.y + 4, text: 'your prompt', size: 's', color: 'grey' })
  y = luser.y + luser.h + gap

  const lsay = response(s, 'l-say', lbx, y, bw)
  s.text('l-say-label', { x: sideX, y: lsay.y + 4, text: 'response', size: 's', color: 'grey' })
  y = lsay.y + lsay.h + PAD

  const winH = y - winY
  s.rect('l-window', { x: lx, y: winY, w: WIN_W, h: winH, fill: 'none' })
  s.text('l-window-label', { x: lx, y: winY + winH + 16, text: 'MCP: 3 servers, 30 tools', size: 's' })

  // ---- Right window: the same job via CLI, one tool.
  const rx = 560
  const rbx = rx + PAD
  y = winY + PAD

  s.rect('r-window', { x: rx, y: winY, w: WIN_W, h: winH, fill: 'none' })

  const rsys = block(s, 'r-system', { x: rbx, y, w: bw, color: 'grey', text: SYSTEM_PROMPT })
  y = rsys.y + rsys.h + gap

  strip(s, 'r-tool', rbx, y, bw, STRIP_H, 'grey')
  y += STRIP_H + 2
  const rtool = s.text('r-tool-label', { x: rbx, y, text: 'run_command', size: 's', font: 'mono', color: 'grey' })
  y = rtool.y + rtool.h + 8

  const ruser = block(s, 'r-user', { x: rbx, y, w: bw, color: 'light-blue', text: TASK })
  y = ruser.y + ruser.h + gap

  const rsay = response(s, 'r-say', rbx, y, bw)
  y = rsay.y + rsay.h

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
  s.text('r-window-label', { x: rx, y: winY + winH + 16, text: 'CLI: 1 tool', size: 's' })

  bullets(s, COL_X, 170, COL_W, BULLETS)
})
