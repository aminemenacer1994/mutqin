import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DAILY_MUTQIN_STEPS,
  dailyMutqinElapsedProgress,
  dailyMutqinStepIndex,
  nextDailyMutqinStep,
  normaliseDailyMutqinStep,
} from '../../resources/js/scripts/session/dailyMutqin.js'
import {
  buildDailyMutqinSessionConfig,
  DAILY_MUTQIN_REPETITIONS,
  DAILY_MUTQIN_SUGGESTED_SECONDS,
} from '../../resources/js/scripts/session/sessionDefaults.js'
import { dailyMutqinHref } from '../../resources/js/scripts/session/sessionGoal.js'
import { PRODUCT_EVENTS } from '../../resources/js/scripts/analytics/productEvents.js'
import { pickDashboardPrimaryKind } from '../../resources/js/scripts/dashboard/primaryAction.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const memorisationCss = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const dashboardVue = readFileSync(join(root, 'resources/js/views/Dashboard.vue'), 'utf8')
const homepageVue = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
const productEventsJs = readFileSync(join(root, 'resources/js/scripts/analytics/productEvents.js'), 'utf8')
const productEventsMd = readFileSync(join(root, 'docs/product-events.md'), 'utf8')
const productEventNamePhp = readFileSync(join(root, 'app/Support/Analytics/ProductEventName.php'), 'utf8')

function sliceMethod(source, name) {
  const needle = `${name}(`
  let from = 0
  while (from < source.length) {
    const idx = source.indexOf(needle, from)
    if (idx < 0) break
    from = idx + needle.length
    const before = source.slice(Math.max(0, idx - 24), idx)
    if (before.includes('this.')) continue
    if (!/\n\s{2,6}$/.test(before) && !/async\s+$/.test(before)) continue

    let depth = 0
    let bodyBrace = -1
    for (let i = idx + needle.length - 1; i < source.length; i += 1) {
      const ch = source[i]
      if (ch === '(') depth += 1
      if (ch === ')') {
        depth -= 1
        if (depth === 0) {
          bodyBrace = source.indexOf('{', i)
          break
        }
      }
    }
    if (bodyBrace < 0) continue

    depth = 0
    for (let i = bodyBrace; i < source.length; i += 1) {
      if (source[i] === '{') depth += 1
      if (source[i] === '}') {
        depth -= 1
        if (depth === 0) return source.slice(idx, i + 1)
      }
    }
  }
  assert.fail(`missing method ${name}`)
}

{
  assert.deepEqual([...DAILY_MUTQIN_STEPS], ['listen', 'repeat', 'hide', 'recite', 'finish'])
  assert.equal(normaliseDailyMutqinStep('HIDE'), 'hide')
  assert.equal(normaliseDailyMutqinStep('nope'), 'listen')
  assert.equal(nextDailyMutqinStep('listen'), 'repeat')
  assert.equal(nextDailyMutqinStep('recite'), 'finish')
  assert.equal(nextDailyMutqinStep('finish'), 'finish')
  assert.equal(dailyMutqinStepIndex('hide'), 2)
  assert.equal(DAILY_MUTQIN_SUGGESTED_SECONDS, 240)
  assert.equal(dailyMutqinElapsedProgress(0, 240, 1_000), 0)
  assert.equal(dailyMutqinElapsedProgress(1_000, 240, 1_000 + 120_000), 0.5)
  assert.equal(dailyMutqinElapsedProgress(1_000, 240, 1_000 + 600_000), 1)
}

{
  const config = buildDailyMutqinSessionConfig()
  assert.equal(config.chapterId, 1)
  assert.equal(config.rangeStart, 1)
  assert.equal(config.rangeEnd, 5)
  assert.equal(config.talqinModeEnabled, true)
  assert.equal(config.blurModeEnabled, false)
  assert.equal(config.repetitionsPerStep, DAILY_MUTQIN_REPETITIONS)
}

{
  assert.equal(dailyMutqinHref('/memorisation'), '/memorisation?journey=daily')
  assert.equal(
    dailyMutqinHref('/memorisation', { surah: 2, from: 1, to: 3, recommendation: 9 }),
    '/memorisation?journey=daily&surah=2&from=1&to=3&recommendation=9',
  )
  assert.match(dailyMutqinHref('/memorisation', { resume: true, session: 12 }), /resume=1/)
  assert.match(dailyMutqinHref('/memorisation', { resume: true, session: 12 }), /session=12/)
}

{
  assert.equal(PRODUCT_EVENTS.DAILY_MUTQIN_STARTED, 'daily_mutqin_started')
  assert.equal(PRODUCT_EVENTS.DAILY_MUTQIN_STEP_VIEWED, 'daily_mutqin_step_viewed')
  assert.equal(PRODUCT_EVENTS.DAILY_MUTQIN_COMPLETED, 'daily_mutqin_completed')
  assert.match(productEventsJs, /DAILY_MUTQIN_STARTED/)
  assert.match(productEventsJs, /CLIENT_INGEST[\s\S]*DAILY_MUTQIN_COMPLETED/)
  assert.match(productEventNamePhp, /DAILY_MUTQIN_STARTED = 'daily_mutqin_started'/)
  assert.match(productEventNamePhp, /self::DAILY_MUTQIN_COMPLETED/)
  assert.match(productEventsMd, /daily_mutqin_started/)
  assert.match(productEventsMd, /daily_mutqin_step_viewed/)
  assert.match(productEventsMd, /daily_mutqin_completed/)
}

{
  assert.match(homepageVue, /journey=daily/)
  assert.match(dashboardVue, /dailyMutqinEntryHref/)
  assert.match(dashboardVue, /dailyMutqinHref/)
  assert.match(dashboardVue, /todaysFocusHint/)
  assert.equal(pickDashboardPrimaryKind({ hasSaved: true, journey: { href: '/j' } }), 'saved')
  assert.equal(pickDashboardPrimaryKind({ journey: { href: '/j' } }), 'journey')
  assert.equal(pickDashboardPrimaryKind({}), 'fresh')
}

{
  assert.match(memorisationVue, /data-testid="daily-mutqin-guide"/)
  assert.match(memorisationVue, /data-testid="daily-mutqin-entry"/)
  assert.match(memorisationVue, /dailyMutqinBeginnerCue/)
  assert.doesNotMatch(memorisationVue, /daily-mutqin-primary/)
  assert.doesNotMatch(memorisationVue, /daily-mutqin-skip/)
  assert.doesNotMatch(memorisationVue, /advanceDailyMutqinPrimary/)
  assert.match(memorisationVue, /workspace-shell/)
  assert.doesNotMatch(memorisationVue, /suggestedDuration/)
  assert.doesNotMatch(memorisationVue, /progressLabel/)
  assert.match(memorisationCss, /\.daily-mutqin-guide/)
  const guideCssStart = memorisationCss.indexOf('/* One beginner line')
  const guideCss = guideCssStart >= 0
    ? memorisationCss.slice(guideCssStart, guideCssStart + 800)
    : ''
  assert.doesNotMatch(guideCss, /position:\s*sticky/)
  assert.match(memorisationCss, /prefers-reduced-motion/)
  assert.match(memorisationJs, /dailyMutqinBeginnerCue/)
}

{
  const consume = sliceMethod(memorisationJs, 'consumeDashboardEntryIntent')
  assert.match(consume, /journey === 'daily'/)
  assert.match(consume, /activateDailyMutqinFromEntry/)

  const activate = sliceMethod(memorisationJs, 'activateDailyMutqinFromEntry')
  assert.match(activate, /resumeUnfinishedSessionFromDailyMutqin/)
  assert.match(activate, /journeyReview/)
  assert.match(activate, /journeyContinue/)
  assert.match(activate, /getNextRecommendation/)
  assert.match(activate, /buildDailyMutqinSessionConfig|applyDailyMutqinSessionConfig/)
  assert.match(activate, /goal: 'revise'/)

  const advance = sliceMethod(memorisationJs, 'advanceDailyMutqinPrimary')
  assert.match(advance, /beginDailyMutqinSittingFromPending/)
  assert.match(advance, /toggleBlurModeRadio/)
  assert.match(advance, /finishDailyMutqinSitting/)
  assert.doesNotMatch(advance, /openWorkspaceAiRecite/)
  assert.doesNotMatch(advance, /setTimeout\([^\)]*finishDailyMutqin/)
  assert.doesNotMatch(advance, /240000|suggested_duration.*end|auto.?end/i)

  const hideBranch = advance.slice(advance.indexOf("step === 'hide'"))
  assert.match(hideBranch, /toggleBlurModeRadio/)
  assert.match(activate, /blurModeEnabled = false/)

  const openPost = sliceMethod(memorisationJs, 'openPostSessionModal')
  assert.match(openPost, /trackDailyMutqinCompleted/)
  assert.match(openPost, /loadPostSessionRecommendation/)

  const closePost = sliceMethod(memorisationJs, 'closePostSessionRecommendationModal')
  assert.match(closePost, /clearDailyMutqinGuide/)

  assert.match(sliceMethod(memorisationJs, 'openDailyMutqinRangeSetup'), /openNewSessionSetup/)
  assert.match(memorisationJs, /daily_mutqin:\s*!!this\.dailyMutqinActive/)
  assert.match(memorisationJs, /suggested_duration_seconds/)
  assert.doesNotMatch(memorisationJs, /autoEndDailyMutqin|forceEndAtSuggested/)

  assert.match(memorisationJs, /startFirstRunGuidedPractice/)
  assert.match(memorisationJs, /activateDailyMutqinGuideForSitting/)
  assert.match(memorisationVue, /workspaceAiReciteOptionalLabel/)
  assert.match(memorisationVue, /checkAnytimeOptional|workspaceAiReciteOptionalLabel/)

  const openPostFirst = sliceMethod(memorisationJs, 'openPostSessionModal')
  assert.match(openPostFirst, /postSessionIsFirstCompletion/)
  assert.match(openPostFirst, /loadPostSessionRecommendation/)
}

console.log('daily-mutqin passed')
