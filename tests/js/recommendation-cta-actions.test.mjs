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
import {
  RECOMMENDATION_TYPES,
  isAdvanceRecommendation,
  shouldNudgeMemorisationCheckBeforeAdvance,
} from '../../resources/js/scripts/recommendations/nextSessionRecommendation.js'

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
  assert.match(en, /"startFocusedReview": "Start focused review"/)
  assert.match(en, /"checkNow": "Check now"/)
  assert.match(en, /"continueWithoutTesting": "Continue without testing"/)
  assert.match(en, /"Test your memorisation first\?"/)
  assert.match(source, /preferStartFocusedReview/)
  assert.match(source, /buildFocusedPracticeRange/)

  const focusedCtas = mapPostSessionCtas(POST_SESSION_CTA_STATES.NEEDS_PRACTICE, {
    preferStartFocusedReview: true,
    weakAyahNumber: 13,
  })
  assert.equal(focusedCtas[0].labelKey, 'startFocusedReview')
  assert.equal(focusedCtas[0].action, POST_SESSION_CTA_ACTIONS.REVISE_FOCUS_PHRASE)
}

// Soft nudge: advance without AI check only
{
  const continueRec = {
    type: RECOMMENDATION_TYPES.CONTINUE,
    session_mode: 'new_learning',
    range_kind: 'new',
    surah: { id: 1 },
    ayah_range: { from: 4, to: 6 },
  }
  const nextRangeRec = {
    type: RECOMMENDATION_TYPES.CONTINUE_NEXT_RANGE,
    session_mode: 'new_learning',
    ayah_range: { from: 7, to: 9 },
    surah: { id: 1 },
  }
  const nextSurahRec = {
    type: RECOMMENDATION_TYPES.NEXT_SURAH,
    session_mode: 'new_learning',
    next_surah: { id: 2 },
    ayah_range: { from: 1, to: 3 },
  }
  const similarRec = {
    type: 'similar',
    session_mode: 'new_learning',
    surah: { id: 2 },
    ayah_range: { from: 1, to: 2 },
  }
  const repeatRec = {
    type: RECOMMENDATION_TYPES.REPEAT_CURRENT_RANGE,
    session_mode: 'revision',
    range_kind: 'repeated',
    surah: { id: 1 },
    ayah_range: { from: 1, to: 3 },
  }
  const needsPracticeRec = {
    type: RECOMMENDATION_TYPES.CONTINUE,
    session_mode: 'new_learning',
    reason_code: 'confidence_needs_practice',
    surah: { id: 1 },
    ayah_range: { from: 4, to: 6 },
  }

  assert.equal(isAdvanceRecommendation(continueRec), true)
  assert.equal(isAdvanceRecommendation(nextRangeRec), true)
  assert.equal(isAdvanceRecommendation(nextSurahRec), true)
  assert.equal(isAdvanceRecommendation(similarRec), true)
  assert.equal(isAdvanceRecommendation(repeatRec), false)

  assert.equal(shouldNudgeMemorisationCheckBeforeAdvance({
    hasAiCheck: false,
    recommendation: continueRec,
    alreadyNudged: false,
  }), true)
  assert.equal(shouldNudgeMemorisationCheckBeforeAdvance({
    hasAiCheck: false,
    recommendation: nextRangeRec,
  }), true)
  assert.equal(shouldNudgeMemorisationCheckBeforeAdvance({
    hasAiCheck: false,
    recommendation: nextSurahRec,
  }), true)
  assert.equal(shouldNudgeMemorisationCheckBeforeAdvance({
    hasAiCheck: false,
    recommendation: similarRec,
  }), true)

  // No nudge after AI check, when already shown, or for repeat / needs-practice plans
  assert.equal(shouldNudgeMemorisationCheckBeforeAdvance({
    hasAiCheck: true,
    recommendation: continueRec,
  }), false)
  assert.equal(shouldNudgeMemorisationCheckBeforeAdvance({
    hasAiCheck: false,
    recommendation: continueRec,
    alreadyNudged: true,
  }), false)
  assert.equal(shouldNudgeMemorisationCheckBeforeAdvance({
    hasAiCheck: false,
    recommendation: repeatRec,
  }), false)
  assert.equal(shouldNudgeMemorisationCheckBeforeAdvance({
    hasAiCheck: false,
    recommendation: needsPracticeRec,
  }), false)
  assert.equal(shouldNudgeMemorisationCheckBeforeAdvance({
    hasAiCheck: false,
    recommendation: null,
  }), false)

  const nudgeCtas = mapPostSessionCtas(POST_SESSION_CTA_STATES.MEMORISATION_CHECK_NUDGE)
  assert.deepEqual(nudgeCtas.map((b) => [b.variant, b.action, b.labelKey]), [
    ['ai', POST_SESSION_CTA_ACTIONS.CHECK_MEMORISATION, 'checkNow'],
    ['secondary', POST_SESSION_CTA_ACTIONS.CONTINUE_WITHOUT_TESTING, 'continueWithoutTesting'],
  ])
}

// Wiring: soft nudge gates start recommended session
{
  assert.match(source, /shouldNudgeMemorisationCheckBeforeAdvance\(/)
  assert.match(source, /maybeShowMemorisationCheckNudge\(/)
  assert.match(source, /continueWithoutMemorisationCheck\(/)
  assert.match(source, /memorisation_check_nudge/)
  assert.match(source, /skipMemorisationCheckNudge/)
  assert.match(source, /CONTINUE_WITHOUT_TESTING/)
  assert.match(vue, /data-testid="post-session-memorisation-check-nudge"/)
  assert.match(vue, /memorisationCheckNudge\.title/)
}

console.log('recommendation-cta-actions.test.mjs: ok')
