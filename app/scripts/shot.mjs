// Screenshot every step of one slide from the running dev server.
//   node scripts/shot.mjs <slideId> [outDir]
// Writes <outDir>/<slideId>-<step>.png (default outDir: scratchpad) and prints camera bounds + page errors.
// Needs the dev server on http://100.68.163.38:5173 and `pnpm build:deck` run first (the server has no watch).
import { chromium } from '/home/viktor/repos/profiq.com-llm-friendly/node_modules/playwright-core/index.mjs'

const [slideId, outDir = '/tmp/claude-1001/-home-viktor-repos-agents-course/842f5c73-5da0-4683-86ff-cf37119ade31/scratchpad'] = process.argv.slice(2)
if (!slideId) { console.error('usage: node scripts/shot.mjs <slideId> [outDir]'); process.exit(1) }

const browser = await chromium.launch({ executablePath: '/home/viktor/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome' })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()) })

await page.goto(`http://100.68.163.38:5173/#${slideId}`, { waitUntil: 'networkidle' })
await page.waitForSelector('.deck-nav')
await page.evaluate(() => localStorage.setItem('agents-course-deck:chrome', '0'))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.deck-nav')
await page.waitForTimeout(1200)

const info = await page.evaluate((id) => {
  const ed = window.__editor
  const pg = ed.getCurrentPage()
  return { slide: pg.meta.slide, steps: (pg.meta.viewports ?? [pg.meta.viewport]).length, shapes: ed.getCurrentPageShapes().length }
}, slideId)
if (info.slide !== slideId) { console.error(`landed on "${info.slide}", not "${slideId}" — is the slide in src/slides/index.ts and was build:deck run?`); await browser.close(); process.exit(1) }

for (let step = 1; step <= info.steps; step++) {
  if (step > 1) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400) }
  const pill = (await page.locator('.deck-nav__label').innerText()).replace(/\s+/g, ' ')
  const cam = await page.evaluate(() => { const b = window.__editor.getViewportPageBounds(); return `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)}` })
  const file = `${outDir}/${slideId}-${step}.png`
  await page.screenshot({ path: file })
  console.log(`step ${step}/${info.steps}  pill "${pill}"  camera ${cam}  → ${file}`)
}
// Zoomed-out view of the whole page (all steps + anything that leaked outside them).
await page.evaluate(() => { const ed = window.__editor; ed.zoomToBounds(ed.getCurrentPageBounds(), { inset: 40, animation: undefined }) })
await page.waitForTimeout(300)
await page.screenshot({ path: `${outDir}/${slideId}-all.png` })
console.log(`page bounds ${await page.evaluate(() => { const b = window.__editor.getCurrentPageBounds(); return `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)}` })}  → ${outDir}/${slideId}-all.png`)
console.log(`shapes ${info.shapes}; errors ${JSON.stringify(errors)}`)
await browser.close()
