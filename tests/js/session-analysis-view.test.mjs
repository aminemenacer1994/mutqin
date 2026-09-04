import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSessionAnalysisView, hasSavedAnalysis } from '../../resources/js/scripts/sessionAnalysis/buildSessionAnalysisView.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const dashboard = readFileSync(join(root, 'resources/js/views/Dashboard.vue'), 'utf8')
const modal = readFileSync(join(root, 'resources/js/components/SessionAnalysisModal.vue'), 'utf8')
const memorisation = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))

function t(key, params = {}) {
  const parts = key.split('.')
  let cursor = en
  for (const part of parts) cursor = cursor?.[part]
  if (typeof cursor !== 'string') return key
  return cursor.replace(/\{(\w+)\}/g, (_, name) => (params[name] == null ? `{${name}}` : String(params[name])))
}

assert.match(dashboard, /dashboard\.view_analysis/, 'Progress Dashboard exposes View analysis')
assert.match(dashboard, /openAnalysisForItem\(item, 'session'\)/, 'sessions drawer loads that session only')
assert.match(dashboard, /openAnalysisForItem\(item, 'attempt'\)/, 'AI checks drawer loads that attempt only')
assert.match(dashboard, /drawerMode === 'activity'[\s\S]*openAnalysisForItem\(item\)/, 'All sessions list also offers View analysis')
assert.match(dashboard, /dash-drawer__row--analysis/, 'analysis rows use a dedicated desktop/mobile layout')
assert.match(dashboard, /dash-btn--primary[\s\S]*dash-drawer__analysis-cta/, 'View analysis is a primary tap target')
assert.match(dashboard, /getSessionAnalysis|getAiReciteAttemptAnalysis/, 'detailed analysis is fetched on click')
assert.match(dashboard, /<SessionAnalysisModal/, 'Dashboard reuses the existing Analysis Modal')
assert.match(memorisation, /<SessionAnalysisModal/, 'Memorisation keeps the shared Analysis Modal')
assert.doesNotMatch(memorisation, /@click\.self="closeSessionAnalyticsModal"/, 'backdrop click no longer closes the modal')
assert.match(modal, /@click\.self\.prevent/, 'backdrop click is swallowed')
assert.match(modal, /@mousedown\.self\.prevent/, 'backdrop mousedown is swallowed')
assert.match(modal, /modal-close-btn/, 'existing close button remains')
assert.match(modal, /variant="error"/, 'error state present')
assert.match(modal, /variant="empty"/, 'empty state present')
assert.match(modal, /analytics-loading/, 'loading state present')
assert.match(modal, /session-analysis-modal-open/, 'background scroll/interaction is locked')

const first = buildSessionAnalysisView({
  has_analysis: true,
  session: {
    id: 11,
    surah_name: 'Al-Ikhlas',
    surah_number: 112,
    ayah_start: 1,
    ayah_end: 4,
    status: 'completed',
    occurred_at: '2026-09-01T10:00:00Z',
    duration_seconds: 180,
    repetitions_completed: 2,
  },
  assessment: {
    accuracy: 77,
    friendly_summary: 'First session analysis',
    duration_ms: 4000,
  },
  ai_attempt: {
    band: 'mixed',
    accuracy_percent: 77,
    color_counts: { green: 8, amber: 2, red: 1, black: 0, gray: 0 },
    weak_words: [{ ayahNumber: 2, text: 'الصمد' }],
    word_statuses: [
      { text: 'قل', status: 'correct', ayah_number: 1 },
      { text: 'الصمد', status: 'wrong', ayah_number: 2 },
    ],
    plan_snapshot: { title: 'Repeat the weak ayah slowly' },
  },
  recommendation: {
    recommended_technique: 'slow_repeat',
    ai_assessment: { summary: 'Return to ayah 2', result: 'mixed', weak_ayahs: [2] },
  },
  retention: {
    weak_spots: [{ id: 9, ayah_number: 2, severity: 'high', status: 'active' }],
  },
  audio: null,
}, t)

assert.equal(first.hasContent, true)
assert.match(first.sessionLabel, /Al-Ikhlas/)
assert.match(first.sessionLabel, /1/)
assert.ok(first.summaryCards.some((card) => card.key === 'accuracy' && String(card.value).includes('77')))
assert.ok(first.aiReview)
assert.notEqual(first.aiReview.accuracy, 41)
assert.ok(first.ayahRows.some((row) => row.ayah === 2))
assert.ok(first.recommendations.some((item) => /weak ayah|Return to ayah 2|slow_repeat/i.test(`${item.label} ${item.detail}`)))
assert.equal(first.retention[0].label, 'Ayah 2')
assert.equal(first.audio, null)

const latest = buildSessionAnalysisView({
  has_analysis: true,
  session: { id: 12, surah_name: 'Al-Fatihah', ayah_start: 1, ayah_end: 7, status: 'completed' },
  assessment: { accuracy: 41, friendly_summary: 'Latest session analysis' },
  ai_attempt: { band: 'weak', accuracy_percent: 41, word_statuses: [] },
}, t)

assert.notEqual(first.aiReview.accuracy, latest.aiReview.accuracy)
assert.notEqual(first.sessionLabel, latest.sessionLabel)

assert.equal(hasSavedAnalysis({ has_analysis: true }), true)
assert.equal(hasSavedAnalysis({ has_analysis: false }), false)
assert.equal(hasSavedAnalysis({}), false)

const empty = buildSessionAnalysisView({ has_analysis: false, session: { id: 3 } }, t)
assert.equal(empty.hasContent, false)

const noExtras = buildSessionAnalysisView({
  has_analysis: true,
  assessment: { accuracy: 72, surah_name: 'Al-Fatiha', start_ayah: 1, end_ayah: 3 },
  ai_attempt: {
    accuracy_percent: 72,
    word_statuses: [{ text: 'بسم', status: 'correct', ayah_number: 1 }],
  },
  practice_plan: { title: 'Repeat weak ayah', why: 'Focus here' },
  recommendation: { recommended_technique: 'slow_repeat' },
  retention: { weak_spots: [{ id: 1, ayah_number: 2, severity: 'high', status: 'active' }] },
}, t, { includeRecommendations: false, includeRetention: false })
assert.equal(noExtras.recommendations.length, 0)
assert.equal(noExtras.retention.length, 0)
assert.ok(noExtras.aiReview)

console.log('session-analysis-view.test.mjs: ok')
