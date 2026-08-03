import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  POST_SESSION_CTA_ACTIONS,
  POST_SESSION_CTA_STATES,
  mapPostSessionCtas,
} from '../../resources/js/scripts/recommendations/postSessionCtaMapping.js'
import { buildAiReviewDetails } from '../../resources/js/scripts/recommendations/aiReviewDetails.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const vue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const js = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const css = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const en = readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8')

const completionModal = vue.match(/post-session-simple__dialog[\s\S]*?<\/footer>/)?.[0] || ''
assert.ok(completionModal.length > 0, 'completion modal markup present')

function t(key, params = {}) {
  const dict = {
    'memorisation.postSession.recommendation.aiOutcomeStrong': 'Strong recall',
    'memorisation.postSession.recommendation.aiOutcomeMixed': 'Minor reinforcement needed',
    'memorisation.postSession.recommendation.aiOutcomeWeak': 'Focused revision recommended',
    'memorisation.postSession.recommendation.confidenceNeedsPractice': 'Focused revision recommended',
    'memorisation.postSession.recommendation.insufficientAudioStatus': 'Attempt could not be assessed',
    'memorisation.postSession.recommendation.aiSummaryMatchedWords': `We clearly matched ${params.matched} of ${params.total} words.`,
    'memorisation.postSession.recommendation.aiSummaryFocusPhrase': 'Focus on the highlighted phrase before checking again.',
    'memorisation.postSession.recommendation.aiSummaryStrongFollowUp': 'Nice work — you can continue while this still feels fresh.',
  }
  return dict[key] || key
}

// --- Result states: outcome hierarchy without leading percentage ---
{
  const wordStatuses = (correct, incorrect) => [
    ...Array.from({ length: correct }, () => ({ status: 'correct' })),
    ...Array.from({ length: incorrect }, () => ({ status: 'incorrect' })),
  ]

  const strong = buildAiReviewDetails('strong', {
    accuracy_percent: 90,
    matched_words: 18,
    total_words: 20,
    color_counts: { green: 18, amber: 1, red: 1, black: 0, gray: 0 },
  }, {
    accuracyScore: 90,
    wordStatuses: wordStatuses(18, 2),
  }, t)
  assert.equal(strong.outcome, 'strong')
  assert.ok(strong.summaryLine)
  assert.doesNotMatch(String(strong.summaryLine), /^\s*\d+\s*%/)
  assert.doesNotMatch(String(strong.outcomeLabel || ''), /^\s*\d+\s*%/)

  const mixed = buildAiReviewDetails('mixed', {
    accuracy_percent: 70,
    matched_words: 14,
    total_words: 20,
    color_counts: { green: 12, amber: 3, red: 4, black: 1, gray: 0 },
    weak_ayahs: [2],
  }, {
    accuracyScore: 70,
    wordStatuses: wordStatuses(14, 6),
  }, t)
  assert.ok(['mixed', 'weak', 'strong'].includes(mixed.outcome))
  assert.doesNotMatch(String(mixed.summaryLine), /^\s*\d+\s*%/)

  const weak = buildAiReviewDetails('weak', {
    accuracy_percent: 35,
    matched_words: 4,
    total_words: 20,
    color_counts: { green: 4, amber: 2, red: 10, black: 4, gray: 0 },
    weak_ayahs: [1, 2],
  }, {
    accuracyScore: 35,
    wordStatuses: wordStatuses(4, 16),
  }, t)
  assert.ok(['weak', 'mixed'].includes(weak.outcome) || weak.presentationMode === 'valid_zero_match')
  assert.doesNotMatch(String(weak.summaryLine || ''), /^\s*\d+\s*%/)

  const insufficient = buildAiReviewDetails('insufficient_audio', {
    insufficient_reason: 'silence',
  }, { insufficientAudio: true }, t)
  assert.ok(
    insufficient.presentationMode === 'insufficient_audio'
    || insufficient.outcome === 'insufficient_audio'
    || /could not be assessed|insufficient|audio/i.test(String(insufficient.outcomeLabel || insufficient.summaryLine || '')),
  )
}

// Guided hierarchy markup for each section
{
  assert.match(completionModal, /data-testid="post-session-outcome"/)
  assert.match(completionModal, /postSessionOutcomeHeadline/)
  assert.match(completionModal, /data-testid="post-session-main-focus"/)
  assert.match(completionModal, /postSessionFocusHighlightParts/)
  assert.match(completionModal, /is-weak/)
  assert.match(completionModal, /data-testid="post-session-why"/)
  assert.match(completionModal, /postSessionRecommendationReasonLine/)
  assert.match(completionModal, /data-testid="post-session-practice-method"/)
  assert.match(completionModal, /practiceMethod|practiceSetup|practice method|Practice setup/i)
  assert.match(completionModal, /data-testid="post-session-details"/)
  assert.match(completionModal, /data-testid="post-session-previous-attempt"/)
  assert.match(completionModal, /softwareGenerated|Software-generated/)
  assert.match(completionModal, /teacherComplement|Beta/)
  assert.match(js, /postSessionOutcomeHeadline/)
  assert.match(js, /headlineStrong|Strong recall/)
  assert.match(js, /headlineMixed|Minor reinforcement/)
  assert.match(js, /headlineWeak|Focused revision/)
  assert.match(en, /"headlineStrong":\s*"Strong recall"/)
  assert.match(en, /"headlineMixed":\s*"Minor reinforcement needed"/)
  assert.match(en, /"headlineWeak":\s*"Focused revision recommended"/)
}

// Empty / partial / failed recommendation states
{
  assert.match(completionModal, /postSessionRecommendationStatus === 'loading'/)
  assert.match(completionModal, /postSessionRecommendationStatus === 'empty'/)
  assert.match(completionModal, /postSessionRecommendationStatus === 'error'/)
  assert.match(completionModal, /retryPostSessionRecommendation/)
  assert.match(completionModal, /manualFallback|postSessionSimpleReason/)
  assert.match(js, /postSessionRecommendationStatus:\s*'idle'/)
}

// Missing data: focus / why / previous attempt optional
{
  assert.match(completionModal, /v-if="postSessionFocusHighlightParts\.length"/)
  assert.match(completionModal, /v-if="postSessionRecommendationReasonLine"/)
  assert.match(completionModal, /v-if="postSessionPreviousAttemptNote"/)
  assert.match(js, /postSessionFocusHighlightParts\(\)/)
  assert.match(js, /postSessionPracticeScopeLabel\(\)/)
  assert.match(js, /postSessionPreviousAttemptNote\(\)/)
  assert.match(js, /previous_attempts|related_attempts/)
  assert.match(js, /persistedForLater|dashboard and session history/)
}

// CTA hierarchy: primary revise → secondary check again → tertiary other range → text Close
{
  const needsPractice = mapPostSessionCtas(POST_SESSION_CTA_STATES.NEEDS_PRACTICE)
  assert.deepEqual(needsPractice.map((b) => [b.variant, b.action]), [
    ['primary', POST_SESSION_CTA_ACTIONS.REVISE_FOCUS_PHRASE],
    ['secondary', POST_SESSION_CTA_ACTIONS.CHECK_AGAIN],
    ['ghost', POST_SESSION_CTA_ACTIONS.OTHER_RANGE],
  ])
  assert.match(completionModal, /data-testid="post-session-actions"/)
  assert.match(completionModal, /postSessionCtaButtons/)
  assert.doesNotMatch(completionModal, /post-session-simple__text-close/)
  assert.doesNotMatch(completionModal, /data-testid="post-session-close"/)
  assert.match(js, /postSessionShowCloseTextAction\(\)\s*\{[\s\S]*?return false/)
  assert.match(js, /closePostSessionRecommendationModal/)
  assert.match(en, /"reviseFocusPhrase":\s*"Start recommended revision"/)
  assert.match(en, /"chooseAnotherRange":\s*"Choose another range"/)
  assert.match(en, /"retest":\s*"Check again"/)
}

// Persisted recommendations: save before show; closing must not discard
{
  assert.match(js, /buildAndPersistAiReciteFinalPlan[\s\S]{0,220}?showPostSessionModal\s*=\s*true|await this\.buildAndPersistAiReciteFinalPlan\(\)[\s\S]{0,180}?showPostSessionModal\s*=\s*true/)
  assert.match(js, /submitRecommendationAiAssessment/)
  assert.match(js, /closePostSessionRecommendationModal\(\)\s*\{[\s\S]*?showPostSessionModal\s*=\s*false[\s\S]*?recommendation_ready/)
  assert.doesNotMatch(
    String(js.match(/closePostSessionRecommendationModal\(\)\s*\{[\s\S]*?\n\s{4}\}/)?.[0] || ''),
    /postSessionRecommendation\s*=\s*null/,
    'closing the modal must not clear the recommendation object',
  )
  assert.match(js, /const preservedRecommendation = this\.postSessionRecommendation/)
  assert.match(js, /if \(preservedRecommendation && preservedStatus === 'ready'\)/)
  assert.match(js, /getNextRecommendation/)
}

// Mobile inset sheet (not full-bleed) + compact 3-col footer
{
  assert.match(
    css,
    /@media \(max-width:\s*720px\)[\s\S]*?\.post-session-simple--premium\.post-session-simple--calm-v2 \.post-session-simple__dialog[\s\S]*?min-height:\s*0\s*!important[\s\S]*?max-height:\s*min\(88dvh/,
  )
  assert.match(
    css,
    /\.post-session-simple\.post-session-simple--premium\.post-session-simple--calm-v2 \.post-session-simple__footer[\s\S]*?safe-area-inset-bottom/,
  )
  assert.match(
    css,
    /\.post-session-simple\.post-session-simple--premium\.post-session-simple--calm-v2 \.post-session-simple__dialog[\s\S]*?width:\s*min\(44rem/,
  )
  assert.match(css, /\[data-theme="dark"\] \.post-session-simple\.post-session-simple--premium/)
  assert.match(css, /\.post-session-simple__quran-token\.is-weak/)
  assert.match(css, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(css, /\.post-session-simple__text-close[\s\S]*?display:\s*none/)
  assert.match(css, /post-session-simple__plan-prompt--context/)
}

// Template order: outcome → focus → why → method → details
{
  const guidedStart = completionModal.indexOf('post-session-simple__ai-review--guided')
  assert.ok(guidedStart > 0)
  const slice = completionModal.slice(guidedStart, guidedStart + 9000)
  const outcomeIdx = slice.indexOf('data-testid="post-session-outcome"')
  const focusIdx = slice.indexOf('data-testid="post-session-main-focus"')
  const whyIdx = slice.indexOf('data-testid="post-session-why"')
  const detailsIdx = slice.indexOf('post-session-simple__ai-details')
  const practiceIdx = completionModal.indexOf('data-testid="post-session-practice-method"')
  assert.ok(outcomeIdx > 0)
  assert.ok(focusIdx > outcomeIdx, 'main focus follows outcome')
  assert.ok(whyIdx > focusIdx, 'why follows focus')
  assert.ok(detailsIdx > whyIdx, 'details follow why')
  assert.ok(practiceIdx > guidedStart, 'practice method card present after review')
}

console.log('post-session-recommendation-modal.test.mjs: ok')
