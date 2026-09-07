import { slide } from '../deck'

export default slide('title', 'Title', (s) => {
  s.text('headline', { center: true, y: 300, text: 'AI coding agents: the basics', size: 'xl' })
  s.text('subtitle', {
    center: true,
    y: 400,
    text: 'How they work, why they get dumb, and how to keep them sharp',
    size: 'm',
    color: 'grey',
  })
  s.text('byline', { center: true, y: 480, text: 'Viktor Nawrath · profiq · 8 Sep 2026', size: 's', color: 'grey' })
  s.text('hint', { x: 1200, y: 800, text: '→ to advance · U for tools', size: 's', color: 'grey' })
})
