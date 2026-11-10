/**
 * Techniques may be enabled together. Each flag should change only its own
 * word state, and turning one off must not leave the others stuck on.
 */
import assert from 'node:assert/strict'
import {
  isAyahBlurred,
  isAyahFocusDimmed,
  isAyahFocusHidden,
  isAyahInActiveChain,
  madaniQpcWordTechniqueClass,
  resolveCheckerHiddenWordState,
  resolveHiddenRevealWordState,
  resolveQpcMadaniWordTechniqueState,
} from '../../resources/js/scripts/mushaf/qpcMadaniTechniques.js'

const activeWord = { location: '2:30:1', surah: '2', ayah: '30', word: '1', text: 'و' }
const nextWord = { location: '2:31:3', surah: '2', ayah: '31', word: '3', text: 'قال' }

const combined = {
  hasSessionStarted: true,
  focusModeEnabled: true,
  blurModeEnabled: true,
  anchorModeEnabled: true,
  wordHighlightEnabled: true,
  chainingEnabled: true,
  hiddenRevealModeEnabled: true,
  effectiveActiveAyah: '2:30',
  anchorIndexesByAyah: { '2:30': [0] },
  userHighlightIndexesByAyah: { '2:30': [1] },
  chainAyahKeys: ['2:30', '2:31'],
  hiddenRevealVerseKey: '2:31',
  hiddenRevealRevealed: [0],
  hiddenRevealCurrentIndex: 0,
  checkerHiddenIndexesByAyah: { '2:31': [2] },
  checkerPeekActive: false,
  sessionAyahKeys: ['2:30', '2:31'],
}

const active = resolveQpcMadaniWordTechniqueState(activeWord, combined)
const upcoming = resolveQpcMadaniWordTechniqueState(nextWord, combined)
const activeClasses = madaniQpcWordTechniqueClass(active)
const upcomingClasses = madaniQpcWordTechniqueClass(upcoming)

assert.equal(active.isAnchor, true)
assert.equal(active.isUserHighlight, false)
assert.equal(active.focusDimmed, false)
assert.equal(active.blurUpcoming, false)
assert.equal(active.masked, false)
assert.equal(activeClasses['anchor-highlight'], true)
assert.equal(activeClasses['user-word-highlight'], false)
assert.equal(activeClasses['is-word-masked'], false)

assert.equal(upcoming.focusDimmed, false)
assert.equal(upcoming.focusHidden, false)
assert.equal(upcoming.blurUpcoming, true)
assert.equal(upcoming.isAnchor, false)
assert.equal(upcoming.isChainMember, true)
assert.equal(upcoming.masked, true)
assert.equal(upcoming.checkerMasked, true)
assert.equal(upcomingClasses['is-focus-dim'], false)
assert.equal(upcomingClasses['is-focus-hidden'], false)
assert.equal(upcomingClasses['blur-upcoming'], true)
assert.equal(upcomingClasses['anchor-highlight'], false)
assert.equal(upcomingClasses['is-chain-member'], true)

const blurOff = resolveQpcMadaniWordTechniqueState(nextWord, {
  ...combined,
  blurModeEnabled: false,
})
assert.equal(blurOff.blurUpcoming, false)
assert.equal(blurOff.focusDimmed, false)
assert.equal(blurOff.focusHidden, false)
assert.equal(blurOff.masked, true)
assert.equal(madaniQpcWordTechniqueClass(blurOff)['blur-upcoming'], false)
assert.equal(madaniQpcWordTechniqueClass(blurOff)['is-focus-dim'], false)

const focusOff = resolveQpcMadaniWordTechniqueState(nextWord, {
  ...combined,
  focusModeEnabled: false,
})
assert.equal(focusOff.focusDimmed, false)
assert.equal(focusOff.blurUpcoming, true)

const chainOff = resolveQpcMadaniWordTechniqueState(nextWord, {
  ...combined,
  chainingEnabled: false,
})
assert.equal(chainOff.isChainMember, false)
assert.equal(isAyahInActiveChain('2:31', { ...combined, chainingEnabled: false }), false)
assert.equal(chainOff.blurUpcoming, true)
assert.equal(chainOff.focusHidden, true)
assert.equal(chainOff.focusDimmed, false)
assert.equal(isAyahFocusHidden('2:31', { ...combined, chainingEnabled: false }), true)

const outside = resolveQpcMadaniWordTechniqueState(
  { location: '2:40:1', surah: '2', ayah: '40', word: '1', text: 'x' },
  combined,
)
assert.equal(outside.focusDimmed, false)
assert.equal(outside.focusHidden, false)
assert.equal(outside.blurUpcoming, false)
assert.equal(outside.isAnchor, false)
assert.equal(outside.masked, false)
assert.equal(isAyahFocusDimmed('2:40', combined), false)
assert.equal(isAyahBlurred('2:40', combined), false)

assert.equal(resolveCheckerHiddenWordState(2, '2:30', combined).masked, false)
assert.equal(resolveHiddenRevealWordState(1, '2:31', {
  hiddenRevealModeEnabled: false,
  hiddenRevealVerseKey: '2:31',
  hiddenRevealRevealed: [],
}).masked, false)
assert.equal(resolveHiddenRevealWordState(1, '2:40', combined).masked, false)

const highlightOnly = resolveQpcMadaniWordTechniqueState(
  { location: '2:30:2', surah: '2', ayah: '30', word: '2', text: 'y' },
  combined,
)
assert.equal(highlightOnly.isUserHighlight, true)
assert.equal(highlightOnly.isAnchor, false)
assert.equal(madaniQpcWordTechniqueClass(highlightOnly)['user-word-highlight'], true)
assert.equal(madaniQpcWordTechniqueClass(highlightOnly)['anchor-highlight'], false)

console.log('technique-isolation.test.mjs: ok')
