import { slide } from '../deck'

// One step, no visualization: the four rules as a plain list down the stage, one per line, at the
// title scale. Everything the course showed is behind them; this slide is only the takeaways.

const RULES = ['Every token counts', 'Stay in the smart zone', 'CLIs/code for power, MCPs for control', 'Deterministic wherever possible']

const LIST_X = 80
const LIST_Y = 220
const LIST_PITCH = 150
const LIST_W = 1440

export default slide('rules-of-thumb', 'Rules of thumb', (s) => {
  s.text('title', { x: 80, y: 50, text: 'Rules of thumb', size: 'xl' })

  RULES.forEach((rule, i) => {
    s.text(`rule-${i + 1}`, { x: LIST_X, y: LIST_Y + i * LIST_PITCH, text: rule, size: 'xl', autoSize: false, w: LIST_W })
  })
})
