import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDashboardAiReciteStatsView } from '../../resources/js/scripts/dashboardAiRecite/buildStatsView.js'
import {
  clampAyah,
  nextAyahLocation,
  resolveDefaultLocation,
  surahCatalog,
} from '../../resources/js/scripts/dashboardAiRecite/location.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const dashboard = readFileSync(join(root, 'resources/js/views/Dashboard.vue'), 'utf8')
const aiReciteAttemptCard = readFileSync(join(root, 'resources/js/components/dashboard/DashAiReciteAttemptCard.vue'), 'utf8')
const dashboardCss = readFileSync(join(root, 'resources/js/views/Dashboard.css'), 'utf8')
const attemptFeedback = readFileSync(join(root, 'resources/js/scripts/dashboardAiRecite/attemptFeedback.js'), 'utf8')
const adminDashboardCss = readFileSync(join(root, 'resources/js/views/AdminDashboard.css'), 'utf8')
const memorisation = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
  + '\n'
  + readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
  + '\n'
  + readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
  + '\n'
  + readFileSync(join(root, 'resources/js/views/Memorisation.mobile-grid.css'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))

function t(key, params = {}) {
  const parts = key.split('.')
  let cursor = en
  for (const part of parts) cursor = cursor?.[part]
  if (typeof cursor !== 'string') return key
  return cursor.replace(/\{(\w+)\}/g, (_, name) => (params[name] == null ? `{${name}}` : String(params[name])))
}

assert.doesNotMatch(dashboard, /dash-ai-recite-cta/, 'progress page does not expose the AI Recite CTA')
assert.doesNotMatch(dashboard, /openAiRecite/, 'progress page does not open the standalone modal')
assert.doesNotMatch(dashboard, /DashboardAiReciteModal/, 'progress page does not mount the AI Recite modal')
assert.match(dashboard, /id="ai-recite-results"/, 'progress page has an AI Recite results section')
assert.match(aiReciteAttemptCard, /item\.has_audio/, 'recent attempts expose a listen affordance when audio exists')
assert.match(aiReciteAttemptCard, /dashboard\.ai_recite\.listen/, 'listen copy is used on saved checks')
assert.match(dashboard, /DashAiReciteAttemptCard/, 'progress page uses compact AI Recite attempt cards')
assert.match(aiReciteAttemptCard, /dashboard\.ai_recite\.review_feedback/, 'compact cards expose review feedback')
assert.match(dashboard, /dashboard\.ai_recite\.view_all_checks/, 'compact list links to view all checks')
assert.match(dashboard, /aiReciteVisibleCards/, 'progress page limits visible AI Recite cards')
assert.match(dashboard, /aiRecitePreview\(\)[\s\S]*?slice\(0,\s*3\)/, 'recent AI Recite preview shows at most three attempts')
assert.match(dashboardCss, /\.dash-fb-card/, 'compact feedback cards have dedicated styles')
assert.match(attemptFeedback, /feedbackInsightKey/, 'attempt feedback insights are deterministic helpers')
assert.match(
  dashboardCss,
  /max-width:\s*1023\.98px[\s\S]*?\.user-dashboard__review-row[\s\S]*?order:\s*2[\s\S]*?\.dash-achievements[\s\S]*?order:\s*3[\s\S]*?\.dash-history[\s\S]*?order:\s*4/,
  'mobile progress page orders revisit/AI recite, achievements, then learning history',
)
assert.match(dashboard, /toggleRevisitCard/, 'revisit ayahs expand on demand')
assert.match(dashboard, /data-testid="review-focus-workspace"/, 'revisit and recitation feedback share one review workspace')
assert.match(dashboardCss, /\.dash-review-workspace__head/, 'the combined review workspace has a distinct visual header')
assert.match(dashboard, /revisitItems\?\.\[0\]\?\.key/, 'the highest-priority revisit ayah is open by default')
assert.match(dashboard, /'is-priority': index === 0/, 'the highest-priority revisit ayah is visually distinguished')
assert.match(dashboardCss, /dash-learning__metrics--compact/, 'learning metrics use a compact layout')
assert.match(dashboard, /weakHistoryLine/, 'progress page keeps weak ayah history in the review drawer')
assert.match(dashboard, /data-testid="dash-weak-history"/, 'weak ayah history is marked for tests')
assert.match(dashboardCss, /\.dash-murajaah-row__history/, 'weak ayah history has compact row styles')
assert.equal(en.dashboard.weak_history_attempts, 'Checked {n} times')
assert.match(
  dashboardCss,
  /min-width:\s*1024px[\s\S]*?\.user-dashboard__review-row[\s\S]*?grid-column:\s*1 \/ -1[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(0,\s*1fr\)/,
  'desktop progress page shows Muraja’ah beside AI Recite results',
)
assert.match(
  dashboardCss,
  /review-row--secondary[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[\s\S]*?align-items:\s*start/,
  'secondary review columns have equal widths without forced equal heights',
)
assert.match(dashboard, /loadAiReciteResults/, 'progress page loads saved AI Recite results')
assert.match(dashboard, /aiReciteStats:\s*initial\?\.ai_recite_stats \|\| null/, 'progress page hydrates AI Recite results from dashboard DB payload')
assert.match(dashboard, /ai-recite-results/, 'progress page can be linked to the results section')
assert.match(dashboard, /WorkspaceAiReciteResultModal/, 'saved attempts use the canonical result modal')
assert.match(dashboard, /withStrictMadaniResultGlyphs/, 'saved attempt analysis strictly applies Madani V2 glyphs')
assert.match(dashboard, /hydrateSavedReciteMadaniGlyphs/, 'saved attempt analysis hydrates Madani page glyphs')
assert.match(dashboard, /Test has been saved/, 'saved attempt modal tells the user the test was saved')

assert.match(memorisation, /workspace-ai-recite-cta/, 'session card exposes the AI Recite CTA')
assert.match(memorisation, /openWorkspaceAiRecite/, 'session card opens the memory check modal')
assert.match(memorisation, /fromWorkspaceAiRecite:\s*true/, 'session card uses the workspace AI Recite entry')
assert.match(memorisation, /AiMemorisationDetectionModal/, 'memorisation mounts the memory check modal')
assert.doesNotMatch(memorisation, /ready-copy|amdReadyCopy/, 'memory check modal omits the redundant feature explanation')
assert.doesNotMatch(memorisation, /DashboardAiReciteModal/, 'session card does not mount the dashboard AI Recite modal')
assert.match(memorisation, /presentWorkspaceReciteAnalysis/, 'workspace recite opens analysis after completion')
assert.match(memorisation, /workspaceReciteAnalysisOpen/, 'memorisation mounts the recite analysis modal')
assert.match(memorisation, /WorkspaceAiReciteResultModal/, 'workspace recite uses the post-session-style result modal')
assert.match(memorisation, /buildWorkspaceAiReciteResultView/, 'workspace recite builds guided AI review view')
assert.match(memorisation, /withStrictMadaniResultGlyphs/, 'live results enrich through the Madani result helper')
assert.match(
  memorisation,
  /hydrateWorkspaceReciteMadaniGlyphs[\s\S]*loadMadaniAyahGlyphs/,
  'live result hydration can load Madani V2 ayah glyphs',
)
assert.match(memorisation, /readable Unicode Arabic immediately/, 'analysis shows readable Unicode without waiting on QCF glyphs')
assert.match(memorisation, /dashboard_ai_recite/, 'workspace recite saves standalone attempts')
assert.match(memorisation, /workspaceReciteAttemptSaved/, 'workspace recite marks a saved attempt')
assert.match(memorisation, /aiReciteResultsHref/, 'workspace recite links to the progress results section')
assert.match(memorisation, /:attempt-saved="workspaceReciteAttemptSaved"/, 'workspace modal surfaces save status')
assert.match(memorisation, /Test has been saved/, 'workspace modal tells the user the test was saved')
assert.equal(en.dashboard.ai_recite.attempt_saved, 'Test has been saved.')
assert.match(memorisation, /border-radius:\s*8px/, 'session card CTA uses 8px radius')
assert.match(memorisation, /workspace-ai-gold-pulse/, 'session card CTA has gold glow')
assert.match(memorisation, /workspace-ai-shimmer/, 'session card CTA has AI shimmer')
assert.match(memorisation, /workspace-ai-icon-spark/, 'session card CTA sparkles the stars icon')
assert.match(memorisation, /\[data-theme="light"\] \.workspace-ai-recite-cta/, 'light theme gold palette')
assert.match(memorisation, /\[data-theme="sepia"\] \.workspace-ai-recite-cta/, 'sepia theme gold palette')
assert.match(memorisation, /\[data-theme="dark"\] \.workspace-ai-recite-cta/, 'dark theme gold palette')
assert.match(memorisation, /--ai-circle-size:\s*clamp\(36px, 9\.6vw, 44px\)/, 'mobile AI icon scales with the viewport')
assert.match(memorisation, /data-theme="sepia"\][\s\S]*workspace-ai-recite-cta\.top-card-action-trigger/, 'sepia has a dedicated mobile AI icon palette')
assert.match(memorisation, /is-animated/, 'session card CTA supports animation toggle')
assert.match(memorisation, /prefers-reduced-motion/, 'session card glow respects reduced motion')
assert.match(
  memorisation,
  /top-card-session-cluster[\s\S]*?has-paired-actions[\s\S]*?workspace-ai-recite-cta/,
  'cluster toggles paired layout when Pause/End are visible',
)
assert.match(
  memorisation,
  /max-width:\s*767\.98px[\s\S]*?has-paired-actions:has\(\.workspace-ai-recite-cta\)[\s\S]*?width:\s*100%/,
  'mobile paired layout keeps the action row full width',
)
assert.match(
  memorisation,
  /max-width:\s*767\.98px[\s\S]*?flex-flow:\s*row nowrap[\s\S]*?session-primary-action[\s\S]*?min-width:\s*max-content/,
  'mobile Resume label keeps its full width',
)

assert.match(memorisation, /scheduleWorkspaceReciteSaveRetry/, 'failed saves retry in the active flow')
assert.match(memorisation, /idempotency_key/, 'the active flow persists an idempotency key')
assert.match(memorisation, /uploadAiReciteAttemptAudio/, 'the recording reference is persisted before save is confirmed')
assert.match(
  memorisation,
  /uploadAiReciteAttemptAudio[\s\S]*presentWorkspaceReciteAnalysis/,
  'audio persistence completes before the canonical result claims the attempt is saved',
)
assert.match(memorisation, /audio_reference_not_saved/, 'missing recording references stay in the retry path')

assert.match(dashboard, /aiReciteFocus/, 'progress page shows weak ayahs that need practice')
assert.match(dashboard, /aiReciteUnifiedCards/, 'recent checks and needs-practice share one card list')
assert.match(dashboard, /card_kind: 'focus'/, 'needs-practice items map into the shared attempt card layout')
assert.match(dashboard, /card_kind === 'attempt'/, 'attempt cards keep expandable feedback in the shared list')
assert.equal(en.dashboard.ai_recite.review_feedback, 'Review feedback')
assert.equal(en.dashboard.ai_recite.wording_match, 'Wording match')
assert.match(en.dashboard.ai_recite.no_attention_ayahs, /check did not flag/i, 'an unflagged check does not imply teacher approval or flawless recitation')
assert.equal(en.dashboard.ai_recite.show_flagged_ayahs, 'Show wording differences')
assert.equal(en.dashboard.ai_recite.insight_excellent, 'Excellent match. Most evaluated words matched.')
assert.match(en.dashboard.ai_recite.words_matched_percent, /\{n\}% words matched/)
assert.match(aiReciteAttemptCard, /attentionAyahs\.length/, 'flagged, uncertain, and skipped ayahs are the default detail view')
assert.match(aiReciteAttemptCard, /ayah\.counts\?\.evaluated === 0[\s\S]*?dashboard\.word_unassessed/, 'an unevaluated ayah is labelled not checked rather than matched')
assert.match(aiReciteAttemptCard, /show_all_ayahs/, 'fully matched ayahs remain available behind Show all')
assert.match(aiReciteAttemptCard, /dashboard\.ai_recite\.review_passage/, 'each saved recitation has one primary review action')
assert.match(aiReciteAttemptCard, /dashboard\.ai_recite\.show_flagged_ayahs/, 'attention checks make their next step explicit')
assert.doesNotMatch(aiReciteAttemptCard, /dash-fb-ayah__actions/, 'nested ayah rows do not repeat the review action')
assert.equal(
  (aiReciteAttemptCard.match(/dashboard\.revisit_check_again/g) || []).length,
  1,
  'each expanded recitation exposes Check again once as a secondary action',
)
assert.match(aiReciteAttemptCard, /dashboard\.word_skipped/, 'the expanded colour key includes skipped words')
assert.match(dashboard, /summary_attempt_one/, 'the recitation summary handles singular attempt grammar')
assert.doesNotMatch(dashboard, /dash-ai-results__word/, 'often-missed chips are removed from the dashboard')
assert.doesNotMatch(dashboard, /openMissedWordAttempt/, 'often-missed actions are removed with the section')
assert.doesNotMatch(dashboard, /missed_words_hint/, 'often-missed helper copy is removed with the section')
assert.doesNotMatch(dashboard, /dash-ai-results__word-detail/, 'often-missed does not show a second detail panel')

assert.equal(en.dashboard.ai_recite.cta_label, 'Recite')
assert.match(en.dashboard.ai_recite.cta_hint, /memorisation/i)
assert.match(dashboard, /heroProgressSummary/, 'hero keeps a single summary line under the greeting')
assert.match(dashboard, /currently_learning_with_surah/, 'hifz hero names the current surah with its ayah range')
assert.equal(en.dashboard.hero_context_ai_recite, 'AI Recite')

const chapters = surahCatalog()
assert.equal(chapters[0].id, 1)
assert.equal(chapters[0].ayahCount, 7)
assert.equal(clampAyah(112, 9), 4)
assert.deepEqual(nextAyahLocation(112, 3), {
  surah_number: 112,
  ayah: 4,
  surah_name: chapters[111].name,
})
assert.equal(nextAyahLocation(112, 4), null)

assert.deepEqual(resolveDefaultLocation({
  preferred: { surah_number: 2, ayah: 5 },
  lastTested: { surah_number: 36, ayah: 12 },
}), {
  surah_number: 2,
  ayah: 5,
  surah_name: chapters[1].name,
})

assert.deepEqual(resolveDefaultLocation({
  preferred: { surah_number: 0, ayah: 0 },
  lastTested: { surah_number: 36, ayah: 12 },
}), {
  surah_number: 36,
  ayah: 12,
  surah_name: chapters[35].name,
})

assert.deepEqual(resolveDefaultLocation({
  lastTested: { surah_number: 36, ayah: 12 },
  progress: { current_surah_number: 2, current_ayah: 5 },
}), {
  surah_number: 36,
  ayah: 12,
  surah_name: chapters[35].name,
})

assert.deepEqual(resolveDefaultLocation({
  progress: { current_surah_number: 18, ayah_start: 10 },
}), {
  surah_number: 18,
  ayah: 10,
  surah_name: chapters[17].name,
})

const empty = buildDashboardAiReciteStatsView({ total_attempts: 0 }, t)
assert.equal(empty.empty, true)
assert.ok(empty.cards.every((card) => card.value === '—' || card.key === 'improvement'))

const filled = buildDashboardAiReciteStatsView({
  total_attempts: 4,
  average_accuracy: 81,
  recent_accuracy: 88,
  best_accuracy: 94,
  ayahs_tested: 3,
  peek_used_count: 1,
  peek_used_percent: 25,
  improvement: 6,
  weakest_ayahs: [{ surah_number: 1, surah_name: 'Al-Fatiha', ayah: 5, accuracy: 60, last_attempted_at: '2026-09-04T12:00:00Z' }],
  missed_words: [{
    text: 'الضالين',
    count: 2,
    surah_number: 1,
    surah_name: 'Al-Fatiha',
    ayah: 7,
    last_attempt_id: 9,
  }],
  recent_attempts: [{
    id: 9,
    surah_number: 1,
    surah_name: 'Al-Fatiha',
    ayah_start: 5,
    ayah_end: 5,
    accuracy_percent: 88,
    peek_used: true,
    has_audio: true,
    occurred_at: '2026-09-04T12:00:00Z',
  }],
}, t)
assert.equal(filled.empty, false)
assert.ok(filled.cards.some((card) => card.key === 'average' && card.value.includes('81')))
assert.equal(filled.weakest[0].label.includes('5'), true)
assert.equal(filled.weakest[0].last_attempted_at, '2026-09-04T12:00:00Z')
assert.equal(filled.focus.length, 1)
assert.equal(filled.focus[0].last_attempted_at, '2026-09-04T12:00:00Z')
assert.equal(filled.holding, false)
assert.equal(filled.score.tone, 'strong')
assert.equal(filled.missed[0].text, 'الضالين')
assert.equal(filled.missed[0].count, 2)
assert.equal(filled.missed[0].last_attempt_id, 9)
assert.match(filled.missed[0].count_label, /2/)
assert.match(filled.missed[0].action_label, /الضالين/)
assert.equal(filled.recent[0].peek_used, true)
assert.equal(filled.recent[0].has_audio, true)

const perfect = buildDashboardAiReciteStatsView({
  total_attempts: 1,
  average_accuracy: 100,
  recent_accuracy: 100,
  best_accuracy: 100,
  weakest_ayahs: [{ surah_number: 1, surah_name: 'Al-Fatihah', ayah: 1, accuracy: 100 }],
}, t)
assert.equal(perfect.focus.length, 0)
assert.equal(perfect.holding, true)

const markedWeak = buildDashboardAiReciteStatsView({
  total_attempts: 1,
  weakest_ayahs: [{ surah_number: 1, surah_name: 'Al-Fatiha', ayah: 2, accuracy: 96, needs_practice: true }],
}, t)
assert.equal(markedWeak.focus.length, 1)
assert.equal(markedWeak.focus[0].ayah, 2)
assert.equal(markedWeak.holding, false)

const multipleFlagged = buildDashboardAiReciteStatsView({
  total_attempts: 2,
  weakest_ayahs: [
    { surah_number: 2, surah_name: 'Al-Baqarah', ayah: 3, accuracy: 62, needs_practice: true },
    { surah_number: 2, surah_name: 'Al-Baqarah', ayah: 4, accuracy: 67, needs_practice: true },
  ],
}, t)
assert.equal(multipleFlagged.focus.length, 2)
assert.equal(perfect.score.label, en.dashboard.analysis_accuracy_label)

assert.match(
  adminDashboardCss,
  /@media \(max-width: 1023px\)[\s\S]*?\.admin-table-shell[\s\S]*?display:\s*none/,
  'admin console hides wide tables on tablet and phone',
)
assert.match(
  adminDashboardCss,
  /@media \(max-width: 1023px\)[\s\S]*?\.admin-user-cards[\s\S]*?display:\s*grid/,
  'admin console shows card lists on tablet and phone',
)
assert.match(
  dashboardCss,
  /@media \(max-width: 1023px\)[\s\S]*?\.dash-section__head-row[\s\S]*?flex-direction:\s*column/,
  'progress dashboard stacks chart header controls on tablet and phone',
)

console.log('dashboard-ai-recite.test.mjs: ok')
