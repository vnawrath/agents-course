import { measureText, slide } from '../deck'

const TERMS: [string, string][] = [
  ['LLM*', 'a text-in, text-out machine. No memory between calls.'],
  ['Token', 'the unit the machine reads and writes. Roughly ¾ of a word. Every limit and price is in tokens.'],
  ['Context window', 'the hard limit for request and response combined, per call.'],
  ['Agent (harness)', 'a program that gives an LLM tools and calls it in a loop.'],
  ['Tool', 'a function the harness runs when the model asks: read a file, run a command, search.'],
]

const TERM_GAP = 2
const ITEM_GAP = 44

export default slide('glossary', 'Glossary', (s) => {
  s.text('title', { x: 80, y: 50, text: 'Glossary', size: 'xl' })

  // Left: the context window (M) with a request and a response (S) inside it. Same box as slide 3.
  const win = s.rect('window', { x: 80, y: 170, w: 440, h: 620, fill: 'none' })
  const request = s.rect('request', {
    x: win.x + 40,
    y: win.y + 40,
    w: win.w - 80,
    h: 280,
    label: 'request',
    fill: 'semi',
    size: 's',
  })
  s.rect('response', {
    x: request.x,
    y: request.y + request.h + 80,
    w: request.w,
    h: 140,
    label: 'response',
    fill: 'semi',
    dash: 'dashed',
    size: 's',
  })
  s.arrow('flow', { from: 'request', to: 'response' })
  const captionY = win.y + win.h + 28
  s.text('window-label', { x: win.x, y: captionY, text: 'context window', size: 's' })

  // Right: term / definition pairs, centered vertically on the window.
  const colX = 620
  const colW = 860
  const total =
    TERMS.reduce((n, [term, def]) => n + measureText(term, 'm', undefined, true).h + TERM_GAP + measureText(def, 's', colW, false).h, 0) +
    ITEM_GAP * (TERMS.length - 1)
  let y = Math.round(win.y + (win.h - total) / 2)
  TERMS.forEach(([term, def], i) => {
    const t = s.text(`term-${i + 1}`, { x: colX, y, text: term, size: 'm' })
    const d = s.text(`def-${i + 1}`, { x: colX, y: y + t.h + TERM_GAP, text: def, size: 's', autoSize: false, w: colW })
    y += t.h + d.h + ITEM_GAP
  })

  // Footnote under the column, on the same line as the window caption.
  s.text('footnote', {
    x: colX,
    y: captionY,
    text: '* yes, also images and audio. Text is what matters here.',
    size: 's',
  })
})
