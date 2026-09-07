// Fonts/icons are imported through Vite so the single-file build inlines them as data: URIs.
//
// Icons need special care. tldraw's default icon URLs point into one sprite selected by an
// SVG fragment (`0_merged.svg#name`), which does not work once the sprite is a data: URI.
// And Vite's own inlined SVG form (`data:image/svg+xml,<svg ...>`) contains spaces/quotes
// that are invalid inside tldraw's unquoted CSS `mask: url(...)`. So we import every single
// icon as raw text and hand tldraw a base64 data: URI per icon.
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'

const iconSources = import.meta.glob('/node_modules/@tldraw/assets/icons/icon/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const singleIcons = Object.fromEntries(
  Object.entries(iconSources)
    .map(([path, svg]) => [path.split('/').pop()!.replace(/\.svg$/, ''), svgToBase64DataUri(svg)])
    .filter(([name]) => name !== '0_merged'),
)

const baseAssetUrls = getAssetUrlsByImport()
export const assetUrls = { ...baseAssetUrls, icons: { ...baseAssetUrls.icons, ...singleIcons } }

function svgToBase64DataUri(svg: string) {
  const bytes = new TextEncoder().encode(svg)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return `data:image/svg+xml;base64,${btoa(bin)}`
}
