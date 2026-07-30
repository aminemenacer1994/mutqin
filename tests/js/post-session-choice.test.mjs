import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  POST_SESSION_ACTION,
  PRODUCT_SESSION_STATUS,
  buildRecommendedSessionTemplate,
  canRepeatRecommendedSession,
  isValidRecommendedTemplate,
  rememberRecommendedSessionTemplate,
  resolveProductSessionStatus,
  resolveRepeatRecommendedTemplate,
} from '../../resources/js/scripts/recommendations/postSessionChoice.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const vue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const js = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const en = readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8')

const template = buildRecommendedSessionTemplate({
  chapterId: 2,
  chapterName: 'Al-Baqarah',
  rangeStart: 1,
  rangeEnd: 5,
  reciterId: 'ar.alafasy',
  playbackSpeed: 0.75,
  repetitions: 4,
  delay: 2,
  talqinModeEnabled: true,
  recommendationId: 'rec-9',
  practiceWeakWords: [{ word: 'test' }],
})

assert.ok(template)
assert.equal(template.chapterId, 2)
assert.equal(template.rangeStart, 1)
assert.equal(template.rangeEnd, 5)
assert.equal(template.recommendationId, 'rec-9')
assert.equal(template.playbackSpeed, 0.75)
assert.equal(template.repetitions, 4)
assert.equal(template.fromRecommendation, true)
assert.ok(isValidRecommendedTemplate(template))
assert.equal(isValidRecommendedTemplate({ chapterId: 0, rangeStart: 1, rangeEnd: 2 }), false)

const history = rememberRecommendedSessionTemplate([], template)
assert.equal(history.length, 1)
assert.equal(
  resolveRepeatRecommendedTemplate({ justEndedTemplate: template, templates: [] })?.recommendationId,
  'rec-9',
)
assert.equal(
  resolveRepeatRecommendedTemplate({ justEndedTemplate: null, templates: history })?.chapterId,
  2,
)
assert.equal(
  resolveRepeatRecommendedTemplate({ justEndedTemplate: null, templates: [] }),
  null,
)
assert.equal(canRepeatRecommendedSession({ templates: history }), true)
assert.equal(canRepeatRecommendedSession({ templates: [] }), false)

assert.equal(
  resolveProductSessionStatus({ showPostSessionChoice: true }),
  PRODUCT_SESSION_STATUS.ENDED,
)
assert.equal(
  resolveProductSessionStatus({ creatingCustomDraft: true }),
  PRODUCT_SESSION_STATUS.DRAFT,
)
assert.equal(
  resolveProductSessionStatus({ hasReadySession: true }),
  PRODUCT_SESSION_STATUS.READY,
)
assert.equal(POST_SESSION_ACTION.REPEAT_RECOMMENDED, 'repeat_recommended')
assert.equal(POST_SESSION_ACTION.CREATE_CUSTOM, 'create_custom')

assert.match(vue, /data-testid="post-session-choice"/)
assert.match(vue, /data-testid="post-session-repeat-recommended"/)
assert.match(vue, /data-testid="post-session-create-custom"/)
assert.match(vue, /repeatRecommendedSessionFromChoice/)
assert.match(vue, /createCustomSessionFromChoice/)
assert.match(vue, /isPostSessionChoiceVisible/)
assert.match(vue, /action-buttons-group/)
assert.match(vue, /toolsPrimaryStartLabel/)
assert.match(vue, /class="top-card-icon-controls"/)
assert.match(vue, /action-btn-exit post-session-choice-custom/)
assert.match(vue, /workspace-shell--post-session-choice/)
assert.doesNotMatch(vue, /v-if="!isPostSessionChoiceVisible"/)
assert.doesNotMatch(vue, /action-btn-secondary top-card-action-trigger/)
assert.doesNotMatch(vue, /post-session-choice-actions/)
assert.match(en, /"What would you like to practise next\?"/)
assert.match(en, /"Repeat session"/)
assert.match(en, /"Custom session"/)
assert.match(js, /applyRestoredPostSessionChoice\(/)
assert.match(js, /Trust the persisted choice flag/)
assert.match(js, /Keep ended post-session choice CTAs across refresh/)
assert.match(js, /Re-apply after demote\/reconcile/)
assert.match(js, /startSessionWithCountdown\(/)
assert.match(js, /Start immediately/)
assert.match(en, /"Start custom session"/)
assert.doesNotMatch(en, /Return to previous ended session|Return him|Continue ended session/)

assert.match(
  js,
  /confirmSessionExit\(\{\s*showSummary: false,\s*openCompletion: false,\s*openPostSessionChoice: true,\s*\}\)/,
)
assert.match(js, /openPostSessionChoice\(/)
assert.match(js, /isPostSessionChoiceVisible\(\)/)
assert.match(js, /Only after End session confirm/)
assert.match(js, /prepareReadySessionFromRecommendedTemplate\(/)
assert.match(js, /memorisation\.postSessionChoice\.startCustomSession/)
assert.match(js, /POST_SESSION_ACTION\.CREATE_CUSTOM/)
assert.match(js, /POST_SESSION_ACTION\.REPEAT_RECOMMENDED/)
assert.match(js, /!this\.isPostSessionChoiceVisible/)
assert.match(js, /Do not invent post-session choice here/)
assert.doesNotMatch(
  js,
  /Keep the post-session choice CTAs visible after cleanup[\s\S]{0,120}showPostSessionChoice = true/,
)
console.log('post-session-choice.test.mjs: ok')
