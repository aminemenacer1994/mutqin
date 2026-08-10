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
  assert.match(completionModal, /postSessionWhyLine|postSessionPrimaryNextLine/)
  assert.match(completionModal, /postSessionUnderstandingText/)
  assert.match(completionModal, /data-testid="post-session-weak-spots"/)
  assert.match(completionModal, /postSessionWeakSpotRows/)
  assert.match(completionModal, /data-testid="post-session-personal-plan"/)
  assert.match(completionModal, /data-testid="post-session-scope-picker"/)
  assert.match(completionModal, /data-testid="post-session-practice-method"/)
  assert.match(completionModal, /postSessionSimpleActionLabel|postSessionPersonalPlan|recommendedPlan|Recommended plan/i)
  assert.match(completionModal, /data-testid="post-session-details"/)
  assert.match(completionModal, /data-testid="post-session-previous-attempt"/)
  assert.doesNotMatch(completionModal, /softwareGenerated|Software-generated/)
  assert.doesNotMatch(completionModal, /teacherComplement/)
  assert.doesNotMatch(completionModal, /post-session-simple__beta-tag/)
  assert.doesNotMatch(completionModal, /post-session-simple__generated-badge/)
  assert.match(completionModal, /postSessionOutcomeStatChips/)
  assert.match(completionModal, /post-session-simple__outcome-tools/)
  assert.match(completionModal, /post-session-simple__outcome-chip/)
  assert.match(completionModal, /post-session-simple__outcome--hero/)
  assert.match(completionModal, /is-incorrect/)
  assert.match(js, /postSessionOutcomeStatChips\(\)/)
  assert.match(js, /postSessionPrimaryNextLine\(\)/)
  assert.match(js, /postSessionCheckDurationLabel/)
  assert.match(js, /statRecitationTime/)
  assert.match(js, /phraseStart/)
  assert.match(js, /normalizeArabicForRecitationEngine/)
  assert.match(js, /playRecitationStartBeep/)
  assert.match(js, /_amdRecordStartBeepConsumed/)
  assert.match(js, /skipBeep/)
  assert.match(js, /ensureUiAudioContext/)
  // AMD must not re-arm a secondary listening cue after Record.
  assert.doesNotMatch(js, /recitationStartCueActive\s*=\s*true/)
  assert.match(css, /\.post-session-simple__quran-token\.is-incorrect/)
  assert.match(css, /#b91c1c|#dc2626/)
  assert.match(css, /\.post-session-simple__outcome-tools/)
  assert.match(css, /animation:\s*none/)
  assert.match(css, /\.post-session-simple__next-line/)
  assert.doesNotMatch(css, /psRecCardIn|psChipIn|psWrongPulse/)
  assert.match(en, /"statRecitationTime":\s*"Recitation time"/)
  assert.match(js, /headlineStrong|Strong recall/)
  assert.match(js, /headlineMixed|Minor reinforcement/)
  assert.match(js, /headlineWeak|Focused revision/)
  assert.match(en, /"headlineStrong":\s*"Strong recall"/)
  assert.match(en, /"headlineMixed":\s*"Minor reinforcement needed"/)
  assert.match(en, /"headlineWeak":\s*"Focused revision recommended"/)
}

// Hierarchy: two numbered steps, supporting detail visually subordinate
{
  const stepKickers = completionModal.match(/post-session-simple__section-kicker--step/g) || []
  assert.ok(stepKickers.length >= 2, 'result and next-practice sections are numbered steps')
  assert.match(completionModal, /post-session-simple__step-num/)
  assert.match(completionModal, /post-session-simple__section-kicker--sub/, 'sub-labels for supporting blocks')
  assert.match(completionModal, /post-session-simple__support-block/)
  assert.match(completionModal, /post-session-simple__weak-spots-list--inline/)
  assert.match(css, /\.post-session-simple__section-kicker--step/)
  assert.match(css, /\.post-session-simple__step-num/)
  assert.match(css, /\.post-session-simple__weak-spots-list--inline/)
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
  assert.match(completionModal, /postSessionPrimaryNextLine/)
  assert.match(completionModal, /v-if="postSessionPreviousAttemptNote"/)
  assert.match(js, /postSessionFocusHighlightParts\(\)/)
  assert.match(js, /postSessionPracticeScopeLabel\(\)/)
  assert.match(js, /postSessionPreviousAttemptNote\(\)/)
  assert.match(js, /previous_attempts|related_attempts/)
  assert.match(js, /persistedForLater|dashboard and session history/)
}

// CTA hierarchy: primary recommended → secondary Return to workspace → tertiary alternate
{
  const needsPractice = mapPostSessionCtas(POST_SESSION_CTA_STATES.NEEDS_PRACTICE)
  assert.deepEqual(needsPractice.map((b) => [b.variant, b.action]), [
    ['primary', POST_SESSION_CTA_ACTIONS.REVISE_FOCUS_PHRASE],
    ['secondary', POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE],
    ['ghost', POST_SESSION_CTA_ACTIONS.CHECK_AGAIN],
  ])
  assert.match(completionModal, /data-testid="post-session-actions"/)
  assert.match(completionModal, /postSessionCtaButtons/)
  assert.doesNotMatch(completionModal, /post-session-simple__text-close/)
  assert.doesNotMatch(completionModal, /data-testid="post-session-close"/)
  assert.match(js, /postSessionShowCloseTextAction\(\)\s*\{[\s\S]*?return false/)
  assert.match(js, /closePostSessionRecommendationModal/)
  assert.match(js, /returnToMemorisationWorkspace\(\)/)
  assert.match(js, /RETURN_TO_WORKSPACE/)
  assert.doesNotMatch(
    String(js.match(/returnToMemorisationWorkspace\(\)\s*\{[\s\S]*?\n\s{4}\}/)?.[0] || ''),
    /rejectRecommendation|startRecommendedSession|startSessionWithCountdown/,
    'return to workspace must not reject, start, or restart a session',
  )
  assert.doesNotMatch(
    String(js.match(/returnToMemorisationWorkspace\(\)\s*\{[\s\S]*?\n\s{4}\}/)?.[0] || ''),
    /postSessionRecommendation\s*=\s*null|aiReciteFinalPlan\s*=\s*null|postSessionSnapshot\s*=\s*null/,
    'return to workspace must not discard AI/recommendation results',
  )
  assert.match(en, /"reviseFocusPhrase":\s*"Start revision"/)
  assert.match(en, /"continueToNextRange":\s*"Continue to next session"/)
  assert.match(en, /"continueToAyahs":\s*"Continue to Ayahs \{start\}–\{end\}"/)
  assert.match(en, /"repeatThisSession":\s*"Repeat this session"/)
  assert.match(en, /"returnToWorkspace":\s*"Return to workspace"/)
  assert.match(en, /"retest":\s*"Check again"/)
  assert.match(en, /"startSession":\s*"Continue to next session"/)
  assert.match(en, /"startRevision":\s*"Start revision"/)
  assert.doesNotMatch(
    en.match(/"actions"\s*:\s*\{[\s\S]*?"continueToNextRange":\s*"[^"]+"/)?.[0] || '',
    /"continueToNextRange":\s*"Continue"/,
    'continue CTA must not use the vague label Continue',
  )

  // Every CTA outcome maps to an explicit destination action.
  const outcomeMatrix = [
    [POST_SESSION_CTA_STATES.NEEDS_PRACTICE, POST_SESSION_CTA_ACTIONS.REVISE_FOCUS_PHRASE, 'reviseFocusPhrase'],
    [POST_SESSION_CTA_STATES.REVIEW_RECOMMENDED, POST_SESSION_CTA_ACTIONS.REVISE_FOCUS_PHRASE, 'reviseFocusPhrase'],
    [POST_SESSION_CTA_STATES.MOSTLY_SECURE, POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE, 'continueToNextRange'],
    [POST_SESSION_CTA_STATES.STRONG, POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE, 'continueToNextRange'],
    [POST_SESSION_CTA_STATES.REVISION_COMPLETED, POST_SESSION_CTA_ACTIONS.CHECK_AGAIN, 'retest'],
    [POST_SESSION_CTA_STATES.AWAITING_CHECK, POST_SESSION_CTA_ACTIONS.CHECK_MEMORISATION, 'testWithAi'],
    [POST_SESSION_CTA_STATES.INSUFFICIENT_AUDIO, POST_SESSION_CTA_ACTIONS.TRY_RECORDING_AGAIN, 'tryRecordingAgain'],
    [POST_SESSION_CTA_STATES.CONFIRM, POST_SESSION_CTA_ACTIONS.CONFIRM_START, 'startSession'],
  ]
  for (const [state, action, labelKey] of outcomeMatrix) {
    const [lead] = mapPostSessionCtas(state)
    assert.equal(lead.action, action, `${state} lead action`)
    assert.equal(lead.labelKey, labelKey, `${state} lead label`)
    assert.ok(lead.variant === 'primary' || lead.variant === 'success', `${state} lead is primary/success`)
  }
  const strongRepeatLead = mapPostSessionCtas(POST_SESSION_CTA_STATES.STRONG, { isRepeat: true })[0]
  assert.equal(strongRepeatLead.labelKey, 'repeatThisSession')
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

  // Dark mode: opaque surfaces so cream text stays readable on scope / weak / focus chips
  assert.match(css, /--ps-card:\s*#2a2420/)
  assert.match(
    css,
    /html\[data-theme="dark"\][\s\S]{0,220}\.post-session-simple__scope-card[\s\S]{0,120}background:\s*#3a3129\s*!important/,
  )
  assert.match(
    css,
    /html\[data-theme="dark"\][\s\S]{0,280}\.post-session-simple__weak-spots-list--inline > \.post-session-simple__weak-spots-item[\s\S]{0,160}background:\s*#3a2a28\s*!important/,
  )
  assert.match(
    css,
    /html\[data-theme="dark"\][\s\S]{0,220}\.post-session-simple__quran-focus[\s\S]{0,120}background:\s*#3a3129\s*!important/,
  )
}

// Template order: outcome → focus → why → weak spots → details → practice plan
{
  const guidedStart = completionModal.indexOf('post-session-simple__ai-review--guided')
  assert.ok(guidedStart > 0)
  const slice = completionModal.slice(guidedStart, guidedStart + 14000)
  const outcomeIdx = slice.indexOf('data-testid="post-session-outcome"')
  const focusIdx = slice.indexOf('data-testid="post-session-main-focus"')
  const whyIdx = slice.indexOf('data-testid="post-session-why"')
  const weakIdx = slice.indexOf('data-testid="post-session-weak-spots"')
  const detailsIdx = slice.indexOf('post-session-simple__ai-details')
  const practiceIdx = completionModal.indexOf('data-testid="post-session-practice-method"')
  const scopeIdx = completionModal.indexOf('data-testid="post-session-scope-picker"')
  assert.ok(outcomeIdx > 0)
  assert.ok(focusIdx > outcomeIdx, 'main focus follows outcome')
  assert.ok(whyIdx > focusIdx, 'why follows focus')
  assert.ok(weakIdx > whyIdx, 'weak spots follow why')
  assert.ok(detailsIdx > weakIdx, 'details follow weak spots')
  assert.ok(practiceIdx > guidedStart, 'practice method card present after review')
  assert.ok(scopeIdx > practiceIdx, 'scope picker lives in the practice plan card')
}

// Recommendation copy hygiene: keep “then continue …” and pluralize focus meta
{
  assert.doesNotMatch(
    js,
    /replace\(\/\(\?:\[,\.\\s\]\+then\\s\+continue\)\+\\\.\?\/gi,\s*'\.'\)/,
    'must not strip legitimate “then continue” clauses',
  )
  assert.match(js, /Collapse duplicated .then continue/)
  assert.match(js, /scopeFocusMetaOne/)
  assert.match(en, /"scopeFocusMetaOne":\s*"\{count\} focus item · about \{minutes\} min"/)
  assert.match(en, /"phraseNeedsAttentionNext":\s*"Review it once, then continue to Ayahs \{start\}–\{end\}\."/)
  assert.match(en, /"evidenceReviewThenContinue":\s*"Review the weak phrase once, then continue to Ayahs \{start\}–\{end\}\."/)

  function stripAiDashes(text = '') {
    const RANGE_TOKEN = '\uE000'
    return String(text || '')
      .replace(/(\d)\s*[–—−‐‑‒―]\s*(\d)/g, `$1${RANGE_TOKEN}$2`)
      .replace(/\s*[—–―‐‑‒−]+\s*/g, ', ')
      .replace(new RegExp(RANGE_TOKEN, 'g'), '\u2013')
      .replace(/(?:^|\n)\s*[-−]+\s*(?=\n|$)/g, ' ')
      .replace(/(\w)\s+-\s+(\w)/g, '$1, $2')
      .replace(
        /(then\s+continue(?:\s+to\s+[^.!,;]+)?\.?)(?:\s*[,.]?\s*then\s+continue(?:\s+to\s+[^.!,;]+)?\.?)+/gi,
        '$1',
      )
      .replace(/,\s*,+/g, ',')
      .replace(/\.\s*,/g, '.')
      .replace(/,\s*\./g, '.')
      .replace(/\.{2,}/g, '.')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;:])/g, '$1')
      .trim()
      .replace(/^[,;:\s]+|[,;:\s]+$/g, '')
  }

  assert.equal(
    stripAiDashes('One phrase in Ayah 4 needs a little reinforcement. Review it once, then continue to Ayahs 6–8.'),
    'One phrase in Ayah 4 needs a little reinforcement. Review it once, then continue to Ayahs 6–8.',
  )
  assert.equal(
    stripAiDashes('Review the weak phrase once, then continue to Ayahs 6–8.'),
    'Review the weak phrase once, then continue to Ayahs 6–8.',
  )
  assert.equal(
    stripAiDashes('Review it once, then continue to Ayahs 6–8. then continue.'),
    'Review it once, then continue to Ayahs 6–8.',
  )
  assert.doesNotMatch(
    stripAiDashes('Review it once, then continue to Ayahs 6–8.'),
    /\.\s+to Ayahs/,
  )
}

console.log('post-session-recommendation-modal.test.mjs: ok')
