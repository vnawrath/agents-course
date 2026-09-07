// Generator: slide sources → src/generated/deck.tldr.json.
// Node only. Imports tldraw's schema packages, never `tldraw`/`@tldraw/editor` (they need a DOM).
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Store } from '@tldraw/store'
import {
  createTLSchema,
  defaultBindingSchemas,
  defaultShapeSchemas,
  DocumentRecordType,
  TLDOCUMENT_ID,
  type TLRecord,
  type TLStoreProps,
} from '@tldraw/tlschema'
import { buildSlide, stableIndices, type DeckFile, type DeckRecord } from '../src/deck'
import { slides } from '../src/slides'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/generated/deck.tldr.json')

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function main() {
  const seenIds = new Set<string>()
  for (const s of slides) {
    if (seenIds.has(s.id)) throw new Error(`duplicate slide id "${s.id}"`)
    seenIds.add(s.id)
  }

  const pageIndices = stableIndices(slides.length)
  const built = slides.map((def, i) => buildSlide(def, pageIndices[i]))
  const pages = built.map((b) => b.page)
  const shapes = built.flatMap((b) => b.shapes)
  const bindings = built.flatMap((b) => b.bindings)

  const content: DeckRecord[] = [...pages, ...shapes, ...bindings]
  const deckHash = createHash('sha256').update(stableStringify(content)).digest('hex').slice(0, 12)
  const document = DocumentRecordType.create({ id: TLDOCUMENT_ID, meta: { deckHash } })
  const records: DeckRecord[] = [document, ...content]

  // Validate against the real schema by putting everything into a real Store (throws on invalid records).
  const schema = createTLSchema({ shapes: defaultShapeSchemas, bindings: defaultBindingSchemas })
  const store = new Store<TLRecord, TLStoreProps>({
    schema,
    // Asset/user stores are only needed by the editor; the plain Store never touches them.
    props: { defaultName: '', assets: {} as TLStoreProps['assets'], users: {} as TLStoreProps['users'], onMount: () => {} },
  })
  store.put(records as TLRecord[])
  if (store.allRecords().length !== records.length) throw new Error('duplicate record ids in deck')

  const file: DeckFile = { tldrawFileFormatVersion: 1, schema: schema.serialize(), records }
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(file, null, 2) + '\n')
  console.log(
    `[deck] ${slides.length} slides, ${shapes.length} shapes, ${bindings.length} bindings → src/generated/deck.tldr.json (hash ${deckHash})`,
  )
}

main()
