import { slide } from '../deck'

const TERMS: [string, string][] = [
  ['LLM*', 'a text-in, text-out machine. No memory between calls.'],
  ['Token', 'the unit the machine reads and writes. Roughly ¾ of a word. Every limit and price is in tokens.'],
  ['Context window', 'the hard limit for request and response combined, per call.'],
  ['Agent (harness)', 'a program that gives an LLM tools and calls it in a loop.'],
  ['Tool', 'a function the harness runs when the model asks: read a file, run a command, search.'],
]

export default slide('glossary', 'Glossary', (s) => {
  s.text('title', { x: 80, y: 50, text: 'Glossary', size: 'xl' })

  // Left: the context window with a request and a response inside it.
  const win = s.rect('window', {
    x: 80,
    y: 170,
    w: 440,
    h: 620,
    label: 'context window',
    fill: 'none',
    verticalAlign: 'end',
    size: 's',
  })
  const request = s.rect('request', {
    x: win.x + 40,
    y: win.y + 40,
    w: win.w - 80,
    h: 280,
    label: 'request',
    fill: 'semi',
  })
  s.rect('response', {
    x: request.x,
    y: request.y + request.h + 80,
    w: request.w,
    h: 140,
    label: 'response',
    fill: 'semi',
    dash: 'dashed',
  })
  s.arrow('flow', { from: 'request', to: 'response' })

  // Right: term / definition pairs.
  const colX = 620
  let y = 170
  TERMS.forEach(([term, def], i) => {
    const t = s.text(`term-${i + 1}`, { x: colX, y, text: term, size: 'm' })
    const d = s.text(`def-${i + 1}`, { x: colX, y: y + t.h + 2, text: def, size: 's', autoSize: false, w: 860 })
    y += t.h + d.h + 44
  })

  s.text('footnote', {
    x: 80,
    y: 830,
    text: '* yes, also images and audio. Text is what matters here.',
    size: 's',
  })
})
