import assert from 'node:assert/strict'
import {
  LIVE_WORD_STATUS_MARK,
  LIVE_WORD_STATUSES,
  applyLiveWordPresentationStyles,
  clearLiveWordPresentationStyles,
  getLiveWordPresentation,
  getLiveWordStatusMark,
  normalizeLiveWordTheme,
} from '../../resources/js/scripts/formatting/liveWordPresentation.js'

function makeStyleNode() {
  const store = new Map()
  return {
    style: {
      setProperty(name, value) {
        store.set(name, value)
      },
      removeProperty(name) {
        store.delete(name)
      },
      getPropertyValue(name) {
        return store.has(name) ? store.get(name) : ''
      },
    },
    _store: store,
  }
}

{
  assert.equal(normalizeLiveWordTheme('dark'), 'dark')
  assert.equal(normalizeLiveWordTheme('SEPIA'), 'sepia')
  assert.equal(normalizeLiveWordTheme(''), 'light')
}

{
  for (const status of LIVE_WORD_STATUSES) {
    const mark = getLiveWordStatusMark(status)
    assert.ok(mark.underlineStyle, `${status} needs underline style`)
    assert.ok(mark.borderStyle, `${status} needs border style`)
  }

  assert.equal(LIVE_WORD_STATUS_MARK.correct.underlineStyle, 'solid')
  assert.equal(LIVE_WORD_STATUS_MARK.partial.underlineStyle, 'dashed')
  assert.equal(LIVE_WORD_STATUS_MARK.incorrect.underlineStyle, 'double')
  assert.equal(LIVE_WORD_STATUS_MARK.omitted.underlineStyle, 'dotted')
}

{
  const lightCorrect = getLiveWordPresentation('correct', 'verse', 'light')
  const darkCorrect = getLiveWordPresentation('correct', 'verse', 'dark')
  assert.equal(lightCorrect.color, '#146443')
  assert.equal(darkCorrect.color, '#8fd4a8')
  assert.equal(lightCorrect.underlineStyle, 'solid')
  assert.equal(darkCorrect.underlineStyle, 'solid')
  assert.notEqual(lightCorrect.color, darkCorrect.color, 'dark theme must not reuse light status colours')
}

{
  const lightOmitted = getLiveWordPresentation('omitted', 'verse', 'light')
  const darkOmitted = getLiveWordPresentation('omitted', 'verse', 'dark')
  assert.equal(lightOmitted.underlineStyle, 'dotted')
  assert.equal(darkOmitted.underlineStyle, 'dotted')
  assert.notEqual(darkOmitted.color, '#1a1a1a')
  assert.notEqual(darkOmitted.color, '#1f1a17')
}

{
  const chipPartial = getLiveWordPresentation('partial', 'chip', 'light')
  assert.equal(chipPartial.borderStyle, 'dashed')
  assert.ok(chipPartial.borderColor && chipPartial.borderColor !== 'transparent')
  assert.ok(chipPartial.background && chipPartial.background !== 'transparent')
  assert.equal(chipPartial.underlineStyle, 'dashed')

  const chipIncorrect = getLiveWordPresentation('incorrect', 'chip', 'dark')
  assert.equal(chipIncorrect.borderStyle, 'double')
  assert.equal(chipIncorrect.color, '#f0a090')
}

{
  const node = makeStyleNode()
  const presentation = getLiveWordPresentation('incorrect', 'verse', 'light')
  applyLiveWordPresentationStyles(node, presentation, 'verse')
  assert.equal(node.style.getPropertyValue('text-decoration-line'), 'underline')
  assert.equal(node.style.getPropertyValue('text-decoration-style'), 'double')
  assert.equal(node.style.getPropertyValue('color'), '#9b2e27')
  assert.equal(node.style.getPropertyValue('box-shadow'), 'none')
}

{
  const node = makeStyleNode()
  const presentation = getLiveWordPresentation('omitted', 'chip', 'dark')
  applyLiveWordPresentationStyles(node, presentation, 'chip')
  assert.equal(node.style.getPropertyValue('border-style'), 'dotted')
  assert.equal(node.style.getPropertyValue('text-decoration-style'), 'dotted')
  assert.equal(node.style.getPropertyValue('color'), '#f2ebe3')
  assert.ok(node.style.getPropertyValue('border-color'))
}

{
  const node = makeStyleNode()
  applyLiveWordPresentationStyles(node, getLiveWordPresentation('correct', 'verse', 'light'), 'verse')
  clearLiveWordPresentationStyles(node)
  assert.equal(node._store.size, 0)
}

{
  // Sepia uses the light (high-contrast ink) palette, not dark pastels.
  const sepia = getLiveWordPresentation('partial', 'verse', 'sepia')
  const light = getLiveWordPresentation('partial', 'verse', 'light')
  assert.equal(sepia.color, light.color)
  assert.equal(sepia.underlineStyle, 'dashed')
}

console.log('live-word-presentation-a11y.test.mjs: ok')
