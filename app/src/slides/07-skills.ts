import { slide } from '../deck'
import type { ShapeRef, SlideBuilder } from '../deck'
import { ZOOM_TAIL, zoomedMeter } from './meter'

// One step. Left: the near-scale window from slide 6. The harness is one grey line, then a grey mono
// block with the skill descriptions (one line per skill, always in the window), your `/release`, the
// violet Skill tool call, the skill body as a light-green tool result, and the dashed response; the
// axis break sits near the bottom edge. Middle: the real SKILL.md on disk, frontmatter above a thin
// line, body below; two arrows show which part lands where. Right: four bullets from the notes.
// Colors by author as on slide 4: harness grey, human light-blue, model violet, tool result
// light-green; outline-only blocks with the text in the author color.

type Author = 'grey' | 'light-blue' | 'violet' | 'light-green'

const PAD = 16
const LABEL_FONT = 18
const LABEL_LINE = 1.35
const LABEL_PAD = 32
const CHAR_DRAW = 0.56
const CHAR_MONO = 0.6

const COL_X = 1030
const COL_W = 500

/** The context window box, same size and place as on the glossary and context-window slides. */
const WIN = { x: 80, y: 170, w: 440, h: 620 }
const LABEL_DY = 28

const HARNESS = 'system prompt · tool descriptions · …'
/** Mono, drawn at MONO_SCALE: ~41 chars fit per line in the window at that scale, so lines stay under 40. */
const MONO_SCALE = 0.85
const SKILL_LIST = [
  'release — bump, changelog, tag, publish…',
  'review-pr — review against our checklist',
  'grill-me — poke at a plan until it holds',
  'agent-browser — drive a browser via CLI',
].join('\n')
const TASK = '/release'
const CALL = '▶ Skill { skill: "release" }'
/** The skill body as the tool returns it, abbreviated to the window width. */
const RESULT = [
  '# Release',
  '1. pnpm check; stop if anything is red.',
  '2. Bump package.json, update CHANGELOG…',
  '3. git tag vX.Y.Z && git push --tags',
  '4. Run scripts/publish.sh, bundled here.',
  '5. Post the changelog in #dev.',
].join('\n')

/** The file on disk. Mono at CARD_SCALE, ~32 chars per line at CARD.w. */
const CARD = { x: 736, y: 300, w: 268 }
const CARD_SCALE = 0.7
const FRONTMATTER = [
  '---',
  'name: release',
  'description: Bump the version,',
  '  write the changelog, tag,',
  '  publish, announce. Use when',
  '  asked to release or /release.',
  '---',
]
const BODY = [
  '# Release',
  '1. pnpm check; stop if anything',
  '   is red.',
  '2. Bump package.json, update',
  '   CHANGELOG.md from the commits',
  '   since the last tag.',
  '3. git tag vX.Y.Z',
  '   git push --tags',
  '4. Run scripts/publish.sh',
  '   (bundled here).',
  '5. Post the changelog in #dev.',
]
const SKILL_MD = [...FRONTMATTER, '', ...BODY].join('\n')

const BULLETS: [string, string][] = [
  [
    'Think of them as saved prompts.',
    'grill-me, review-pr, create-plan: a prompt you use often, with a name. Only the one-line description sits in the window; the full text is pulled in when the skill is invoked. Needed every time → AGENTS.md. Needed sometimes → a skill.',
  ],
  [
    'Invoke them yourself.',
    'The agent can pick a skill on its own, but do not rely on it. Say "use the frontend-design skill", or just type /frontend-design.',
  ],
  [
    'They can bundle things.',
    'A script (spin-up-environment.sh), a PR template, entity boilerplate: files next to SKILL.md that the agent uses when the skill runs.',
  ],
  [
    'They go well with CLIs.',
    'A skill that explains the common use-cases of a tool like agent-browser teaches the agent the CLI once, on demand.',
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

/** Estimated label height for a geo label with size 's' and `scale` (same as slides 4–6). */
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
 * Headline + body bullets, same rhythm as slides 3–6. The body height is estimated here with
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
  /** Where the next item would start, after the trailing gap. */
  return y
}

/** An example library of skills to browse. A geo rect, not a text: only geo shapes carry a clickable `url`. */
const LIBRARY = { text: 'Example library: skills.sh', url: 'https://skills.sh' }

export default slide('skills', 'Skills', (s) => {
  s.text('title', { x: 80, y: 50, text: 'Skills', size: 'xl' })

  // Left: the window, the shared size. Side labels live in the gap between the window and the card,
  // so the long ones are broken into two lines by hand.
  // The window is drawn after its content so it can grow to fit the content plus the axis break.
  const win = { ...WIN }
  const bx = win.x + PAD
  const bw = win.w - PAD * 2
  const sideX = win.x + win.w + 16
  let y = win.y + PAD

  // The harness section, compacted into one line (as on slide 6).
  const harness = block(s, 'harness', { x: bx, y, w: bw, color: 'grey', text: HARNESS })
  s.text('harness-label', { x: sideX, y: harness.y + 4, text: 'harness', size: 's', color: 'grey' })
  y = harness.y + harness.h + 10

  // The skill descriptions: one line per skill, always in the window. Extra slack leaves room for
  // the arrow that lands on its lower part.
  const list = block(s, 'skill-list', { x: bx, y, w: bw, color: 'grey', text: SKILL_LIST, mono: true, scale: MONO_SCALE, slack: 30 })
  s.text('skill-list-label', { x: sideX, y: list.y + 4, text: 'skills:\none line each', size: 's', color: 'grey' })
  y = list.y + list.h + 10

  const user = block(s, 'user', { x: bx, y, w: bw, color: 'light-blue', text: TASK, mono: true, scale: MONO_SCALE })
  s.text('user-label', { x: sideX, y: user.y + 4, text: 'your prompt', size: 's', color: 'grey' })
  y = user.y + user.h + 8

  // The model calls the Skill tool …
  const call = block(s, 'call', { x: bx, y, w: bw, color: 'violet', text: CALL, mono: true, scale: MONO_SCALE })
  y = call.y + call.h + 8

  // … and the skill body comes back as the tool result.
  const result = block(s, 'result', { x: bx, y, w: bw, color: 'light-green', text: RESULT, mono: true, scale: MONO_SCALE, slack: 6 })
  s.text('result-label', { x: sideX, y: result.y + 4, text: 'tool result:\nthe skill body', size: 's', color: 'grey' })
  y = result.y + result.h + 10

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

  // Middle: the one SKILL.md on disk, a tinted mono card. Frontmatter and body are separated by a
  // thin line drawn through the blank line between them.
  const cardH = labelH(SKILL_MD, CARD.w, true, CARD_SCALE)
  s.text('card-caption', { x: CARD.x, y: CARD.y - 30, text: 'skills/release/SKILL.md', size: 's', color: 'grey' })
  const card = s.rect('card', {
    ...CARD,
    h: cardH,
    label: SKILL_MD,
    color: 'grey',
    fill: 'solid',
    size: 's',
    font: 'mono',
    align: 'start',
    verticalAlign: 'start',
    scale: CARD_SCALE,
  })
  const lineH = LABEL_FONT * LABEL_LINE * CARD_SCALE
  const padTop = (LABEL_PAD / 2) * CARD_SCALE
  const splitY = Math.round(card.y + padTop + (FRONTMATTER.length + 0.5) * lineH)
  s.line('card-split', {
    points: [
      { x: card.x, y: splitY },
      { x: card.x + card.w, y: splitY },
    ],
    dash: 'solid',
    size: 's',
    color: 'grey',
  })

  // The two arrows: horizontal, so their text labels sit cleanly above / below them in the gap.
  const descY = list.y + list.h - 18
  s.arrow('desc-arrow', { start: { x: card.x, y: descY }, end: { x: bx + bw, y: descY }, size: 's' })
  s.text('desc-arrow-label', { x: sideX + 4, y: descY - 58, text: 'description: always\nin the window', size: 's' })

  const bodyY = result.y + result.h - 74
  s.arrow('body-arrow', { start: { x: card.x, y: bodyY }, end: { x: bx + bw, y: bodyY }, size: 's' })
  s.text('body-arrow-label', { x: sideX + 4, y: bodyY + 10, text: 'body:\nonly when invoked', size: 's' })

  const afterBullets = bullets(s, COL_X, 170, COL_W, BULLETS, 42)

  // Below the bullets: the link. Outline-only, one line; tldraw shows a link button on the shape.
  const link = s.rect('library', {
    x: COL_X,
    y: afterBullets - 20,
    w: COL_W,
    h: labelH(LIBRARY.text, COL_W, false, 1),
    label: LIBRARY.text,
    url: LIBRARY.url,
    color: 'grey',
    labelColor: 'black',
    fill: 'none',
    size: 's',
    align: 'start',
  })
  if (link.y + link.h > s.stage.y + s.stage.h - 20) {
    throw new Error(`skills: library link ends at ${link.y + link.h}, past the stage bottom`)
  }
})
