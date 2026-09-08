import { slide } from '../deck'
import type { ShapeRef, SlideBuilder } from '../deck'

// One step. Left: the same near-scale window as slide 6 — system prompt, tool descriptions, a small
// AGENTS.md, and a new harness block: the skill list (one line per skill). Then your prompt, the
// full text of the one skill the task matched, and the dashed response; the axis break sits near
// the bottom edge. Off to the right a stack of skill files on disk; an arrow pulls the front one
// into the window, captioned "only when the task needs it". Right column: the three bullets. Colors
// by author as on slide 4: harness grey, human light-blue, model violet; outline-only blocks with
// the text in the author color.

type Author = 'grey' | 'light-blue' | 'violet' | 'light-green'

const PAD = 16
const LABEL_FONT = 18
const LABEL_LINE = 1.35
const LABEL_PAD = 32
const CHAR_DRAW = 0.56
const CHAR_MONO = 0.6

const COL_X = 980
const COL_W = 540

/** The context window box, same size and place as on the glossary and context-window slides. */
const WIN = { x: 80, y: 170, w: 440, h: 620 }
const LABEL_DY = 28

const SYSTEM_PROMPT = 'You are a coding agent. …'
const TOOLS = 'Tools: Read, Edit, Grep, Bash, …'
const AGENTS_MD = '# AGENTS.md: build, test, rules'
const SKILL_LIST = ['release — how to cut a release', 'migration — how to write one', 'deploy — the deploy checklist'].join('\n')
const TASK = 'Cut the 2.4 release.'
const SKILL_TEXT = ['release.md', 'bump, changelog, tag, announce'].join('\n')
const SKILL_CARD = ['release.md', 'bump version', 'write changelog', 'tag + publish', 'announce in #dev'].join('\n')
const SKILL_FILES = ['deploy.md', 'migration.md']

const BULLETS: [string, string][] = [
  [
    'Instructions that load on demand.',
    'A skill is a file with a one-line description in the window, and the full text pulled in only when the task matches.',
  ],
  [
    'Put the long stuff here.',
    'Release process, how to write a migration, the deploy checklist. Detailed, rare, and free until used.',
  ],
  ['Rule of thumb:', 'if it is needed every time, AGENTS.md. If it is needed sometimes, a skill.'],
]

/** Estimated label height for a geo label with size 's' and `scale` (same as slides 4–6). */
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

/** Headline + body bullets, same rhythm as slides 3–6. */
function bullets(s: SlideBuilder, x: number, y0: number, w: number, items: [string, string][], gap = 78) {
  let y = y0
  items.forEach(([head, body], i) => {
    const h = s.text(`b${i + 1}-head`, { x, y, text: head, size: 'm' })
    const b = s.text(`b${i + 1}-body`, { x, y: y + h.h + 4, text: body, size: 's', autoSize: false, w })
    y += h.h + b.h + gap
  })
}

/**
 * Axis break near the bottom edge, as on slide 4: the window is much larger than drawn. Sits at the
 * slide 4 height when the content above ends early enough, otherwise centred in the space left.
 */
function axisBreak(s: SlideBuilder, win: ShapeRef, sideX: number, contentEnd: number) {
  const breakY = Math.max(win.y + win.h - 70, Math.round((contentEnd + win.y + win.h) / 2) - 7)
  const zig: { x: number; y: number }[] = []
  const teeth = 26
  const x0 = win.x - 14
  const x1 = win.x + win.w + 14
  for (let i = 0; i <= teeth; i++) {
    zig.push({ x: x0 + ((x1 - x0) * i) / teeth, y: breakY + (i % 2 === 0 ? 0 : 14) })
  }
  s.line('axis-break', { points: zig, dash: 'solid', size: 's', color: 'grey' })
  s.text('axis-break-label', { x: sideX, y: breakY - 6, text: '… much more', size: 's', color: 'grey' })
}

export default slide('skills', 'Skills', (s) => {
  s.text('title', { x: 80, y: 50, text: 'Skills', size: 'xl' })

  // Left: the window, the shared size. Blocks are packed tighter than on slide 6 so the extra skill
  // blocks fit above the axis break.
  const win = s.rect('window', { ...WIN, fill: 'none' })
  const bx = win.x + PAD
  const bw = win.w - PAD * 2
  const sideX = win.x + win.w + 16
  const gap = 6
  let y = win.y + PAD

  const sys = block(s, 'system', { x: bx, y, w: bw, color: 'grey', text: SYSTEM_PROMPT })
  s.text('system-label', { x: sideX, y: sys.y + 4, text: 'system prompt', size: 's', color: 'grey' })
  y = sys.y + sys.h + gap

  const tools = block(s, 'tools', { x: bx, y, w: bw, color: 'grey', text: TOOLS })
  s.text('tools-label', { x: sideX, y: tools.y + 4, text: 'tool descriptions', size: 's', color: 'grey' })
  y = tools.y + tools.h + gap

  const agents = block(s, 'agents', { x: bx, y, w: bw, color: 'grey', text: AGENTS_MD, mono: true })
  s.text('agents-label', { x: sideX, y: agents.y + 4, text: 'AGENTS.md', size: 's', color: 'grey' })
  y = agents.y + agents.h + gap

  // The skill list: one line per skill, always in the window.
  const list = block(s, 'skill-list', { x: bx, y, w: bw, color: 'grey', text: SKILL_LIST, mono: true })
  s.text('skill-list-label', { x: sideX, y: list.y + 4, text: 'skills: one line each', size: 's' })
  y = list.y + list.h + 10

  const user = block(s, 'user', { x: bx, y, w: bw, color: 'light-blue', text: TASK })
  s.text('user-label', { x: sideX, y: user.y + 4, text: 'your prompt', size: 's', color: 'grey' })
  y = user.y + user.h + gap

  // The one skill the task matched, pulled in as full text.
  const skill = block(s, 'skill-text', { x: bx, y, w: bw, color: 'grey', text: SKILL_TEXT, mono: true })
  y = skill.y + skill.h + 10

  const say = s.rect('say', {
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
  s.text('say-label', { x: sideX, y: say.y + 4, text: 'response', size: 's', color: 'grey' })
  y = say.y + say.h

  // Axis break near the bottom edge, as on slide 4: the window is much larger than drawn.
  axisBreak(s, win, sideX, y)

  s.text('window-label', { x: win.x, y: win.y + win.h + LABEL_DY, text: 'context window: every request', size: 's' })

  // Off to the side: the stack of skill files on disk. Back cards peek out above the front one.
  const cardX = 750
  const cardW = 210
  const peek = 46
  const frontH = labelH(SKILL_CARD, cardW, true, 1)
  const frontY = skill.y + skill.h / 2 - frontH / 2
  s.text('files-label', { x: cardX, y: frontY - peek * SKILL_FILES.length - 34, text: 'skill files, on disk', size: 's', color: 'grey' })
  SKILL_FILES.forEach((file, i) => {
    s.rect(`file-${i + 1}`, {
      x: cardX,
      y: frontY - peek * (SKILL_FILES.length - i),
      w: cardW,
      h: frontH,
      label: file,
      color: 'grey',
      fill: 'solid',
      size: 's',
      font: 'mono',
      align: 'start',
      verticalAlign: 'start',
    })
  })
  s.rect('file-front', {
    x: cardX,
    y: frontY,
    w: cardW,
    h: frontH,
    label: SKILL_CARD,
    color: 'grey',
    fill: 'solid',
    size: 's',
    font: 'mono',
    align: 'start',
    verticalAlign: 'start',
  })

  s.arrow('pull', { from: 'file-front', to: 'skill-text' })
  s.text('pull-label', {
    x: sideX,
    y: skill.y + skill.h / 2 + 10,
    text: 'only when the task needs it',
    size: 's',
    autoSize: false,
    w: 200,
  })

  bullets(s, COL_X, 170, COL_W, BULLETS)
})
