# agents-course deck

A slide deck that is a [tldraw](https://tldraw.dev) document. Slides are written as
TypeScript, compiled into a `.tldr`-compatible JSON file, and shown in a stripped-down tldraw
editor that you can draw on top of during the talk. The production build is one self-contained
`dist/index.html` that works from `file://` with no network.

## Commands

| command           | what it does                                                                 |
| ----------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`        | generator in watch mode + Vite dev server (bound to the Tailscale address)  |
| `pnpm build:deck` | slide sources → `src/generated/deck.tldr.json`                              |
| `pnpm typecheck`  | `tsc --noEmit` over `src/` and `scripts/`                                    |
| `pnpm build`      | `build:deck` → typecheck → `vite build` → single `dist/index.html` (~6 MB)   |

Node 22, pnpm 10.

## Three layers

```
scripts/build-deck.ts         generator (Node only, tsx) → src/generated/deck.tldr.json
src/deck/                     the slide DSL: slide(), the `s` helpers, defaults, stable ids
src/slides/                   one file per slide + index.ts (order = deck order)
src/generated/deck.tldr.json  generated artifact — never hand-edited, but committed
src/runtime/                  the browser app: App, reconcile, Nav, keys, asset URLs, CSS
src/main.tsx
```

1. **DSL (`src/deck/`)** — `slide(id, title, (s) => …, { viewport?, viewports? })` with `s.text`, `s.rect`,
   `s.arrow`, `s.note`, `s.line`. Every helper takes a mandatory local name and real tldraw props;
   the sugar is `text`/`label` strings becoming rich text and `center: true` on text (a stage-wide
   box with `textAlign: 'middle'`). Per-type defaults mirror what tldraw's own toolbar creates
   (`getDefaultProps()`), plus `font: 'draw'` deck-wide. Every slide has one or more **viewports**
   (its *steps*): the rectangles the camera frames, default `[STAGE]` = 1600×900 at the origin.
   The first is exposed as `s.stage`, all of them as `s.steps`.
2. **Generator (`scripts/build-deck.ts`)** — builds page, shape and binding records, puts them into
   a real `@tldraw/store` `Store` with the real schema (typos in props fail the build), computes
   `deckHash` (sha256 of the stable-stringified records, 12 hex chars) into the document record's
   meta, writes each slide's steps into its page record's `meta.viewports` (and the first one into
   `meta.viewport`), and writes a file in the `.tldr` format (`tldrawFileFormatVersion`, `schema`, `records`).
   Fractional indices are generated deterministically so the output is byte-stable.
3. **Runtime (`src/runtime/`)** — `<Tldraw persistenceKey="agents-course-deck">` with most UI slots
   removed. On mount it *reconciles*: if the stored `deckHash` differs from the bundled one, every
   shape with `meta.built === true` is deleted and the bundled pages/shapes/bindings are put in.
   Your own drawings (no `meta.built`) and your own pages are never touched. Then it navigates to
   the slide and step in the URL hash and fits the camera to that step's viewport (letterboxed,
   inset 32). tldraw.com ignores the meta but keeps it, so exports round-trip.

## Adding a slide

Create `src/slides/03-something.ts`:

```ts
import { slide } from '../deck'

export default slide('something', 'Something', (s) => {
  s.text('title', { x: 80, y: 50, text: 'Something', size: 'xl' })
  s.text('centered', { center: true, y: s.stage.h - 80, text: 'Centered on the stage', size: 's' })
  const box = s.rect('box', { x: 80, y: 170, w: 400, h: 200, label: 'a box', color: 'light-blue', fill: 'semi' })
  s.rect('other', { x: box.x + box.w + 120, y: box.y, w: 400, h: 200, label: 'another', dash: 'dashed' })
  s.arrow('link', { from: 'box', to: 'other' })
  s.text('note', { x: 80, y: 420, text: 'Long text wraps when autoSize is false.', size: 's', color: 'grey', autoSize: false, w: 600 })
})
```

Then add it to `src/slides/index.ts` in the position you want. Lay content out inside `s.stage`
(0..1600 × 0..900 by default); pass `{ viewport: { x, y, w, h } }` as the fourth argument when a
slide needs a different frame.

### Steps

A slide can have several camera frames. Pass `{ viewports: [STAGE, stageAt(0, 1), …] }` and `→`
walks through them before moving to the next slide (`←` walks back, `S` refits the current one).
The pill shows `n / N · s/S` and the hash becomes `#<slideId>/<step>`. `stageAt(col, row)` is a
stage-sized frame on a grid with a 200 px gap, so content for step two goes at `s.steps[1].y + …`.
The steps are just viewports: everything is on the same page, so you can also zoom out and pan
around it by hand.

```ts
import { slide, STAGE, stageAt } from '../deck'

export default slide('loop', 'The agent loop', (s) => {
  s.text('t1', { x: 80, y: 50, text: 'Step one', size: 'xl' })
  s.text('t2', { x: 80, y: s.steps[1].y + 50, text: 'Step two', size: 'xl' })
}, { viewports: [STAGE, stageAt(0, 1)] })
```

Rules the build enforces:

- slide ids are kebab-case and unique; shape names are unique within a slide;
- `s.arrow({ from, to })` must name shapes defined earlier in the same slide;
- props are validated by tldraw's schema (`color: 'gray'` is a build error; it is `grey`).

Each helper returns `{ id, x, y, w, h }` so you can lay things out relative to each other. For text
the `w`/`h` are estimates (tldraw measures the real size at render time). Composites are plain
functions that take `s` and call the helpers.

Ids are stable: `page:slide-<slideId>` and `shape:<slideId>/<name>`. Renaming a shape gives it a
new id, which is fine — the runtime replaces all built shapes wholesale whenever the hash changes.

## The round-trip rule

- **Never hand-edit `src/generated/deck.tldr.json`.** It is overwritten by every build.
- Edits you make in the browser live in IndexedDB (`persistenceKey`), not in the repo.
- To move a browser edit into the source of truth: **Export .tldr**, find the shape by its stable id
  (`shape:<slide>/<name>`), and port the delta (position, size, prop) into the slide file by hand.
  The next build regenerates the JSON, the next reload reconciles it into the store.
- Built shapes are locked. Right-click → *Unlock all* (from tldraw's context menu) if you need to
  move one during rehearsal; the next reconcile puts it back where the source says.

## Keys

| key                              | action                                                                 |
| -------------------------------- | ---------------------------------------------------------------------- |
| `→` `Space` `PageDown`           | next step, then next slide                                             |
| `←` `PageUp`                     | previous step, then last step of the previous slide                    |
| `S`                              | fit the current step (its viewport)                                    |
| `U`                              | toggle edit chrome / UI (toolbar, style panel, Theme/Export/Reset menu) |
| `C`                              | cycle color scheme: system → light → dark                              |

`PageUp`/`PageDown` always work. Arrows, Space, S, U and C only fire when nothing is selected, no
shape is being edited, focus is not in an input, and no modifier is held — so tldraw's own
shortcuts keep working while you draw. The chrome choice is remembered in `localStorage`;
the deck starts in presenting mode (chrome hidden).

Our keys are chosen from the letters tldraw does not bind (`c i j m p s u w y`); every other
single letter is a tldraw tool shortcut (`d` draw, `f` frame, `h` hand, …) and must stay free.

URL hash `#<slideId>` deep-links to a slide, `#<slideId>/<step>` to a step (1-based); both are
updated as you navigate.

## Color scheme

The deck follows the OS setting by default (`<Tldraw colorScheme="system">`). `C` or the
`Theme: …` menu button cycles system → light → dark; the choice is tldraw's own user preference
(`editor.user.updateUserPreferences({ colorScheme })`), persisted by tldraw in `localStorage`.
Our chrome reads `editor.user.getIsDarkMode()` and switches its CSS variables (`.deck--dark`).
Shapes use tldraw's color tokens, so they re-theme automatically.

## What is tldraw and what is ours

On screen, **ours**: the bottom pill `‹ n / N · s/S Title ›`, the top-left `Theme` / `Export .tldr` /
`Reset deck` menu (only with chrome), the keyboard handling. Everything else — canvas, toolbar, style panel,
right-click context menu, dialogs, toasts, the "Get a license" watermark — is stock tldraw with
the other panels set to `null`. There are no custom shapes; all shapes are tldraw's `text`, `geo`,
`arrow`, `note`, `line` with tldraw's color/fill/dash/size tokens.

`Export .tldr` uses tldraw's `serializeTldrawJsonBlob`, so the file opens in tldraw.com.
`Reset deck` deletes *every* shape on *every* page, removes pages that are not in the bundle,
and rebuilds from the bundle (asks for confirmation).

## Known limitations

- No tldraw license → the small "Get a license for production" watermark is shown.
- Slide fitting frames the current step's viewport; content outside it is still there, just off
  screen until you pan. Pages without viewports (older decks) fall back to the built shapes' bounds.
- Text `w`/`h` returned by `s.text` are estimates; use explicit `w` + `autoSize: false` for anything
  that must wrap.
- Reconcile is all-or-nothing per hash change; it does not diff individual shapes.
- The generator runs in Node and must not import `tldraw`/`@tldraw/editor` (they need a DOM).
  `@tldraw/store`, `@tldraw/tlschema` and `@tldraw/utils` are direct dependencies for that reason.
- The icon-inlining hack in `src/runtime/assetUrls.ts` (per-icon base64 data URIs) is what makes the
  single-file build work offline; keep `optimizeDeps.exclude: ['@tldraw/assets']` in `vite.config.ts`.
