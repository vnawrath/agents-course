import { slide } from '../deck'
import { BOUNDARY, zoneColor } from './meter'

// The window (same M box as the glossary) as an LED meter: 20 thin outline-only S bars,
// 20% green, 30% yellow (lowest two orange), 50% red. A dashed line between the yellow bars
// (the only place the line is drawn; the meters on slides 4–8 carry it as the yellow colour change) cuts through the meter and runs
// into the gap on the right, splitting the smart zone from the dumb zone.
const WIN = { x: 80, y: 170, w: 440, h: 620 }
const BARS = 20
const BAR_H = 20
const PAD = 24
const BAR_PITCH = (WIN.h - PAD * 2 - BAR_H) / (BARS - 1)

const BULLETS: [string, string][] = [
  [
    'Quality drops way before the hard limit.',
    'A 1M-token window does not help if half of it is the dumb zone.',
  ],
  [
    'The dumb zone is expensive.',
    'As the window fills, every request costs more and comes back worse. The worst deal in the whole business.',
  ],
  [
    'The line moves: think of an instruction budget.',
    'One clear task over a big file stretches the smart zone. A long chat with ten topics, conflicting instructions and vague asks shrinks it. Size is not the only thing that fills the window, confusion does too.',
  ],
  [
    'Every token counts.',
    'Staying in the smart zone all the time is the skill; everything in this course is a technique for it.',
  ],
]

export default slide('context-window', 'The context window', (s) => {
  s.text('title', { x: 80, y: 50, text: 'The context window', size: 'xl' })

  // Left: the window wrapper drawn as a meter.
  const win = s.rect('window', { ...WIN, fill: 'none' })
  for (let i = 0; i < BARS; i++) {
    s.rect(`bar-${i + 1}`, {
      x: win.x + PAD,
      y: Math.round(win.y + PAD + i * BAR_PITCH),
      w: win.w - PAD * 2,
      h: BAR_H,
      color: zoneColor(i),
      fill: 'none',
      dash: 'draw',
      size: 's',
    })
  }
  s.text('window-label', { x: win.x, y: win.y + win.h + 28, text: 'context window', size: 's' })

  // The smart/dumb boundary: dashed, through the meter and far into the gap on the right.
  const gapRight = 760
  const boundaryY = win.y + PAD + BOUNDARY * BAR_PITCH - Math.round((BAR_PITCH - BAR_H) / 2)
  s.line('boundary', {
    points: [
      { x: win.x - 30, y: boundaryY },
      { x: gapRight, y: boundaryY },
    ],
    dash: 'dashed',
    size: 'm',
  })
  const labelX = win.x + win.w + 40
  // Narrow labels (two lines each) so the window can be as wide as on the glossary slide.
  s.text('smart-zone', { x: labelX, y: boundaryY - 130, text: 'Smart\nzone', size: 'l' })
  s.text('dumb-zone', { x: labelX, y: boundaryY + 30, text: 'Dumb\nzone', size: 'l' })

  // Right: bullets.
  const colX = 800
  const colW = 720
  let y = 170
  BULLETS.forEach(([head, body], i) => {
    const h = s.text(`b${i + 1}-head`, { x: colX, y, text: head, size: 'm' })
    const b = s.text(`b${i + 1}-body`, { x: colX, y: y + h.h + 4, text: body, size: 's', autoSize: false, w: colW })
    y += h.h + b.h + 78
  })
})
