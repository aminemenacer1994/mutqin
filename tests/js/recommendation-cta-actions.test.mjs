/**
 * Primary weak-ayah selection and recommendation CTA action wiring.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { selectPrimaryWeakAyah } from '../../resources/js/scripts/recommendations/aiRecitePracticePlan.js'
import {
  POST_SESSION_CTA_ACTIONS,
  mapPostSessionCtas,
  POST_SESSION_CTA_STATES,
} from '../../resources/js/scripts/recommendations/postSessionCtaMapping.js'

const source = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
const vue = readFileSync(new URL('../../resources/js/views/Memorisation.vue', import.meta.url), 'utf8')
const en = readFileSync(new URL('../../resources/js/locales/en.json', import.meta.url), 'utf8')

// Never invent a weak ayah
{
  assert.equal(selectPrimaryWeakAyah({}), null)
  assert.equal(selectPrimaryWeakAyah({ weakAyahs: [], weakWords: [] }), null)
  assert.equal(selectPrimaryWeakAyah({ weakAyahs: [0, -1, 'x'] }), null)
}

// Prefer densest weak ayah (existing recommendation priority), not the lowest number
{
  const primary = selectPrimaryWeakAyah({
    weakAyahs: [3, 7],
    weakWords: [
      { ayahNumber: 7, text: 'a' },
      { ayahNumber: 7, text: 'b' },
      { ayahNumber: 7, text: 'c' },
      { ayahNumber: 3, text: 'd' },
    ],
  })
  assert.equal(primary, 7)
}

// Structural skip boosts density
{
  assert.equal(selectPrimaryWeakAyah({
    weakAyahs: [2, 5],
    skippedAyahs: [5],
    weakWords: [{ ayahNumber: 2 }],
  }), 5)
}

// Tie-break: earliest ayah when density equal
{
  assert.equal(selectPrimaryWeakAyah({
    weakAyahs: [4, 2],
    weakWords: [
      { ayahNumber: 4 },
      { ayahNumber: 2 },
    ],
  }), 2)
}

// CTA mapping: Continue / Review / Repeat Weak Ayah destinations
{
  const mostly = mapPostSessionCtas(POST_SESSION_CTA_STATES.MOSTLY_SECURE, {
    weakAyahNumber: 5,
    nextRangeStart: 6,
    nextRangeEnd: 8,
  })
  assert.equal(mostly[0].action, POST_SESSION_CTA_ACTIONS.REVIEW_WEAK_AYAH)
  assert.equal(mostly[0].variant, 'reinforce')
  assert.equal(mostly[2].action, POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE)

  const review = mapPostSessionCtas(POST_SESSION_CTA_STATES.REVIEW_RECOMMENDED, {
    weakAyahNumber: 5,
  })
  assert.equal(review[0].action, POST_SESSION_CTA_ACTIONS.REVISE_FOCUS_PHRASE)
  assert.equal(review[2].action, POST_SESSION_CTA_ACTIONS.REVIEW_WEAK_AYAH)
}

// Wiring contracts
{
  assert.match(source, /resolvePrimaryPostSessionWeakAyah\s*\(/)
  assert.match(source, /selectPrimaryWeakAyah\(/)
  assert.match(source, /weakAyahOnly:\s*true/)
  assert.match(source, /applyBackendStartResult\(\{\s*session:\s*sessionPayload/)
  const busyFn = source.match(/postSessionActionsBusy\(\)\s*\{[\s\S]*?\n\s{4}\},/)?.[0] || ''
  assert.ok(busyFn.includes('postSessionRecommendationStarting'))
  assert.equal(busyFn.includes("postSessionRecommendationStatus === 'loading'"), false)
  assert.match(source, /finally \{\s*\n\s*this\.postSessionRecommendationStarting = false/)
  assert.match(vue, /@click\.stop\.prevent="onPostSessionCtaAction\(btn\.action\)"/)
  assert.match(vue, /@keydown\.enter\.stop\.prevent="onPostSessionCtaAction\(btn\.action\)"/)
  assert.match(vue, /@keydown\.space\.stop\.prevent="onPostSessionCtaAction\(btn\.action\)"/)
  assert.match(en, /"reviseFocusPhrase": "Review"/)
  assert.match(en, /"continueToNextRange": "Continue"/)
  assert.match(en, /"reviewAyahOnce": "Repeat Weak Ayah"/)
}

console.log('recommendation-cta-actions.test.mjs: ok')
