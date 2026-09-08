// Slide + step navigation. A slide is a page; its steps are the camera frames in the page's
// `meta.viewports`. The current step lives in a tldraw atom (so React can subscribe) and in the
// URL hash as `#<slideId>` (step 1) or `#<slideId>/<step>` (1-based).
import { atom, Box, EASINGS, type Editor } from 'tldraw'
import { isBuilt, slides } from './deck'

const stepAtom = atom('deck step', 0)

export function currentSlideIndex(editor: Editor) {
  const pageId = editor.getCurrentPageId()
  return slides.findIndex((s) => s.pageId === pageId)
}

/** 0-based step within the current slide. */
export function currentStep() {
  return stepAtom.get()
}

/** Number of steps of the slide at `index` (at least 1). */
export function stepCount(index: number) {
  return Math.max(1, slides[index]?.viewports.length ?? 1)
}

/** Camera flight between steps of the same slide. Slide changes are instant (different page). */
const STEP_ANIMATION = { duration: 500, easing: EASINGS.easeInOutCubic }

/**
 * Fits the camera to the current step's viewport. Falls back to the generated shapes' bounds.
 * With `animate`, the camera flies to the viewport instead of jumping.
 */
export function fitSlide(editor: Editor, animate = false) {
  const slide = slides[currentSlideIndex(editor)]
  const viewport = slide?.viewports[Math.min(stepAtom.get(), (slide?.viewports.length ?? 1) - 1)]
  let bounds: Box | undefined
  if (viewport) {
    const { x, y, w, h } = viewport
    bounds = new Box(x, y, w, h)
  } else {
    const boxes = editor
      .getCurrentPageShapes()
      .filter(isBuilt)
      .map((s) => editor.getShapePageBounds(s))
      .filter((b): b is Box => !!b)
    bounds = boxes.length ? Box.Common(boxes) : editor.getCurrentPageBounds()
  }
  if (bounds) editor.zoomToBounds(bounds, { inset: 32, animation: animate ? STEP_ANIMATION : undefined })
}

function writeHash(slideId: string, step: number) {
  try {
    history.replaceState(null, '', step > 0 ? `#${slideId}/${step + 1}` : `#${slideId}`)
  } catch {
    /* ignore */
  }
}

/**
 * Goes to slide `index` (clamped) at `step` (clamped; negative counts from the end, -1 = last).
 * `animate` flies the camera when the target is another step of the current slide.
 */
export function goToSlide(editor: Editor, index: number, step = 0, animate = false) {
  const i = Math.max(0, Math.min(slides.length - 1, index))
  const slide = slides[i]
  if (!slide) return
  const n = stepCount(i)
  const s = step < 0 ? Math.max(0, n + step) : Math.min(n - 1, step)
  const samePage = editor.getCurrentPageId() === slide.pageId
  if (!samePage) editor.setCurrentPage(slide.pageId)
  stepAtom.set(s)
  editor.selectNone()
  // Animate only when moving between steps of the slide already on screen.
  fitSlide(editor, samePage && animate)
  writeHash(slide.id, s)
}

/** Next step, or the first step of the next slide. */
export function next(editor: Editor) {
  const i = currentSlideIndex(editor)
  if (i < 0) return goToSlide(editor, 0)
  const s = stepAtom.get()
  if (s < stepCount(i) - 1) goToSlide(editor, i, s + 1, true)
  else if (i < slides.length - 1) goToSlide(editor, i + 1, 0)
}

/** Previous step, or the last step of the previous slide. */
export function prev(editor: Editor) {
  const i = currentSlideIndex(editor)
  if (i < 0) return goToSlide(editor, 0)
  const s = stepAtom.get()
  if (s > 0) goToSlide(editor, i, s - 1, true)
  else if (i > 0) goToSlide(editor, i - 1, -1)
}

/** `#<slideId>` or `#<slideId>/<step>` → { index, step } (0-based; unknown → first slide). */
export function locationFromHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ''))
  const [id, stepStr] = raw.split('/')
  const i = slides.findIndex((s) => s.id === id)
  if (i < 0) return { index: 0, step: 0 }
  const step = Math.max(0, (parseInt(stepStr ?? '1', 10) || 1) - 1)
  return { index: i, step }
}
