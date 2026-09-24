import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAudioIndexMap } from '../../resources/js/scripts/mushaf/madaniWordSync.js'
import {
  applyQpcMadaniRecitationPatchToNode,
  findQpcMadaniRecitationNode,
  normaliseMadaniRecitationVisualStatus,
  patchQpcMadaniRecitationDom,
  resolveAyahKeyForMadaniRecitationIndex,
  resolveMadaniRecitationWordTarget,
  resolveWordPositionForAudioIndex,
} from '../../resources/js/scripts/mushaf/qpcMadaniRecitationDom.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const wordVue = readFileSync(join(root, 'resources/js/components/madani/MadaniWord.vue'), 'utf8')

const verses = [{
  key: '2:30',
  words: [
    { position: 1, ar: 'a' },
    { position: 2, ar: 'b' },
    { position: 3, ar: 'c' },
  ],
}, {
  key: '2:31',
  words: [
    { position: 1, ar: 'd' },
    { position: 2, ar: 'e' },
  ],
}]
const audioIndexMap = buildAudioIndexMap(verses)
const context = {
  verses,
  audioIndexMap,
  evaluationMap: {
    a: { ayahKey: '2:30', wordOffset: 0, wordCount: 3 },
    b: { ayahKey: '2:31', wordOffset: 3, wordCount: 2 },
  },
  ayahBounds: [{ start: 0, end: 3 }, { start: 3, end: 5 }],
  ayahKeys: ['2:30', '2:31'],
}

assert.equal(normaliseMadaniRecitationVisualStatus({ status: 'correct' }), 'correct')
assert.equal(normaliseMadaniRecitationVisualStatus({ status: 'wrong' }), 'incorrect')
assert.equal(normaliseMadaniRecitationVisualStatus({ status: 'skipped' }), 'skipped')
assert.equal(normaliseMadaniRecitationVisualStatus({ status: 'extra' }), 'extra')
assert.equal(normaliseMadaniRecitationVisualStatus({ status: 'partial' }), 'partial')
assert.equal(normaliseMadaniRecitationVisualStatus({ status: 'pending' }, false), 'omitted')

assert.deepEqual(resolveMadaniRecitationWordTarget(1, context), {
  verseKey: '2:30',
  wordAudioIndex: 1,
  wordPosition: 2,
  locationKey: '2:30:2',
})
assert.deepEqual(resolveMadaniRecitationWordTarget(4, context), {
  verseKey: '2:31',
  wordAudioIndex: 1,
  wordPosition: 2,
  locationKey: '2:31:2',
})
assert.equal(resolveMadaniRecitationWordTarget(4, {
  ...context,
  ayahBounds: [{ start: 0, end: 3 }, { start: 3, end: 6 }],
  evaluationMap: {},
}), null, 'refuses to guess when token and audio counts diverge')

assert.equal(resolveWordPositionForAudioIndex(verses[0], 2), 3)
assert.equal(resolveAyahKeyForMadaniRecitationIndex(4, context), '2:31')

const doc = {
  querySelectorAll(selector) {
    const s = String(selector)
    if (s.includes('data-word-index="1"') && s.includes('2:30')) {
      return [{
        classList: new Set(),
        dataset: {},
        getAttribute(name) {
          if (name === 'data-location') return '2:30:2'
          return null
        },
        style: { setProperty() {}, removeProperty() {} },
        setAttribute() {},
        removeAttribute() {},
      }]
    }
    return []
  },
}

const node = findQpcMadaniRecitationNode(doc, {
  verseKey: '2:30',
  wordAudioIndex: 1,
  locationKey: '2:30:2',
})
assert.ok(node)
assert.equal(findQpcMadaniRecitationNode(doc, {
  verseKey: '2:30',
  wordAudioIndex: 1,
  locationKey: '2:30:9',
}), null)

const classList = new Set()
const patched = {
  classList: {
    add(...names) { names.forEach((name) => classList.add(name)) },
    remove(...names) { names.forEach((name) => classList.delete(name)) },
    toggle(name, on) { on ? classList.add(name) : classList.delete(name) },
  },
  dataset: {},
  style: { setProperty() {}, removeProperty() {} },
  setAttribute() {},
  removeAttribute() {},
  textContent: 'glyph',
}
const beforeText = patched.textContent
applyQpcMadaniRecitationPatchToNode(patched, { status: 'incorrect', current: true })
assert.equal(patched.textContent, beforeText, 'never mutates QPC glyph text')
assert.ok(classList.has('recitation-word-incorrect'))
assert.ok(classList.has('amd-word-current'))

const domRoot = {
  querySelectorAll(selector) {
    const s = String(selector)
    if (s.includes('2:31') && s.includes('data-word-index="1"')) {
      const classes = new Set()
      return [{
        classList: {
          add(...names) { names.forEach((name) => classes.add(name)) },
          remove(...names) { names.forEach((name) => classes.delete(name)) },
          toggle(name, on) { on ? classes.add(name) : classes.delete(name) },
        },
        dataset: {},
        getAttribute(name) {
          if (name === 'data-location') return '2:31:2'
          return null
        },
        style: { setProperty() {}, removeProperty() {} },
        setAttribute() {},
        removeAttribute() {},
      }]
    }
    return []
  },
}
const painted = patchQpcMadaniRecitationDom(domRoot, [{
  index: 4,
  status: 'correct',
  current: true,
}], context)
assert.equal(painted.changed, true)
assert.equal(painted.currentAyahKey, '2:31')

assert.match(memorisationJs, /patchQpcMadaniAmdRecitationFromPatches/)
assert.match(memorisationJs, /patchQpcMadaniRecitationDom/)
assert.match(memorisationJs, /qpcMadaniRecitationFollowAyah/)
assert.match(memorisationJs, /clearQpcMadaniRecitationSurface/)
assert.doesNotMatch(memorisationJs, /qpcMadaniSpeech|madaniSpeechmatics|MadaniReciteEngine/)
assert.match(wordVue, /recitation-word/)
assert.doesNotMatch(wordVue, /textContent\s*=|innerHTML\s*=/)

console.log('qpc-madani-recitation.test.mjs: ok')
