import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  QURAN_UI_ARABIC_FONT,
  applyQuranFontCssVariable,
  resolveQuranFontFamily,
} from '../../resources/js/scripts/quran/quranFonts.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function mockRoot() {
  const props = new Map()
  const attrs = new Map()
  return {
    props,
    attrs,
    style: {
      setProperty(key, value) { props.set(key, value) },
    },
    setAttribute(key, value) { attrs.set(key, value) },
    removeAttribute(key) { attrs.delete(key) },
  }
}

test('QURAN_UI_ARABIC_FONT is Latin-safe and never a Quran-only face', () => {
  assert.match(QURAN_UI_ARABIC_FONT, /Amiri/)
  assert.match(QURAN_UI_ARABIC_FONT, /Noto Naskh Arabic/)
  assert.doesNotMatch(QURAN_UI_ARABIC_FONT, /Uthmanic|KFGQPC|Amiri Quran/)
})

test('applyQuranFontCssVariable never writes a Mushaf face onto --font-ar', () => {
  for (const id of ['uthmanic', 'amiri', 'naskh', 'scheherazade', 'lateef']) {
    const { props } = mockRoot()
    applyQuranFontCssVariable(id, { style: { setProperty(k, v) { props.set(k, v) } }, setAttribute() {} })
    assert.equal(props.get('--font-ar'), QURAN_UI_ARABIC_FONT, `--font-ar leaked for ${id}`)
    assert.equal(props.get('--quran-font'), resolveQuranFontFamily(id))
    assert.doesNotMatch(props.get('--font-ar'), /Uthmanic|KFGQPC|Lateef|Amiri Quran/)
  }
})

test('Uthmanic @font-face restricts unicode-range so Latin space falls through', () => {
  const scss = read('resources/sass/app.scss')
  const faces = [...scss.matchAll(/@font-face\s*\{[\s\S]*?\}/g)].map((m) => m[0])
  const uthmanic = faces.filter((face) => /UthmanicHafs|KFGQPC Uthmanic Script HAFS/.test(face))
  assert.ok(uthmanic.length >= 2, 'both Uthmanic family names must be declared')
  for (const face of uthmanic) {
    assert.match(face, /unicode-range:\s*U\+0600-06FF/, 'Arabic block required')
    assert.doesNotMatch(face, /U\+0020|U\+0000-007F/, 'must not claim Basic Latin / space')
  }
})

test('default tokens keep --font-ar off Uthmanic and --quran-font independent', () => {
  const scss = read('resources/sass/app.scss')
  assert.match(scss, /--font-ar:\s*"Amiri"/)
  assert.doesNotMatch(scss, /--font-ar:\s*"[^"]*Uthmanic/)
  assert.match(scss, /--quran-font:\s*"KFGQPC Uthmanic Script HAFS"/)
  assert.doesNotMatch(scss, /--quran-font:\s*var\(--font-ar\)/)
})

test('workspace chrome locks to --font-ui and lifts the menu above the rail', () => {
  const css = read('resources/js/views/Memorisation.css')
  assert.match(css, /\.top-card-menu \.top-card-menu-label,[\s\S]*?font-family:\s*var\(--font-ui/)
  assert.match(css, /\.session-progress-rail__title,[\s\S]*?font-family:\s*var\(--font-ui/)
  assert.match(
    css,
    /\.workspace-shell:has\(\.top-card-menu-wrap\.is-menu-open\)[\s\S]*?z-index:\s*130/,
    'open font menu must stack above the sticky progress rail',
  )
  assert.match(css, /html body \.app \.session-progress-rail \{\s*z-index:\s*8/)
})
