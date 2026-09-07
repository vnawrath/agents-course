import { slide } from '../deck'

// The window as an LED meter: 20 thin full-color bars, 20% green, 30% yellow (lowest two orange),
// 50% red (fill 'fill' is tldraw's full-color fill; 'solid' is the tint). Solid bottom edge = the hard limit. A dashed line at the yellow/red boundary cuts
// through the meter and runs into the gap on the right, splitting the smart zone from the dumb zone.
const BARS = 20
const BAR_H = 20
const BAR_PITCH = 29
const PAD = 24

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

function barColor(i: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (i < 4) return 'green'
  if (i < 8) return 'yellow'
  if (i < 10) return 'orange'
  return 'red'
}

export default slide('context-window', 'The context window', (s) => {
  s.text('title', { x: 80, y: 50, text: 'The context window', size: 'xl' })

  // Left: the window wrapper drawn as a meter.
  const win = s.rect('window', {
    x: 80,
    y: 170,
    w: 300,
    h: PAD * 2 + (BARS - 1) * BAR_PITCH + BAR_H,
    fill: 'none',
  })
  for (let i = 0; i < BARS; i++) {
    s.rect(`bar-${i + 1}`, {
      x: win.x + PAD,
      y: win.y + PAD + i * BAR_PITCH,
      w: win.w - PAD * 2,
      h: BAR_H,
      color: barColor(i),
      fill: 'fill',
      dash: 'solid',
    })
  }
  // Hard limit: a thick solid line on the bottom edge.
  s.line('hard-limit', {
    points: [
      { x: win.x - 10, y: win.y + win.h },
      { x: win.x + win.w + 10, y: win.y + win.h },
    ],
    size: 'xl',
    dash: 'solid',
  })
  s.text('hard-limit-label', { x: win.x + win.w + 40, y: win.y + win.h - 16, text: 'hard limit', size: 's', color: 'grey' })
  s.text('window-label', { x: win.x, y: win.y + win.h + 28, text: 'context window', size: 's' })

  // The smart/dumb boundary: dashed, through the meter and far into the gap on the right.
  const gapRight = 760
  const boundaryY = win.y + PAD + 10 * BAR_PITCH - Math.round((BAR_PITCH - BAR_H) / 2)
  s.line('boundary', {
    points: [
      { x: win.x - 30, y: boundaryY },
      { x: gapRight, y: boundaryY },
    ],
    dash: 'dashed',
    size: 'm',
  })
  const labelX = win.x + win.w + 40
  s.text('smart-zone', { x: labelX, y: boundaryY - 80, text: 'Smart zone', size: 'l' })
  s.text('dumb-zone', { x: labelX, y: boundaryY + 30, text: 'Dumb zone', size: 'l' })

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
