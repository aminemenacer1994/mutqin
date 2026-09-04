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
const memorisation = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
  + '\n'
  + readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
  + '\n'
  + readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
  + '\n'
  + readFileSync(join(root, 'resources/js/views/Memorisation.mobile-grid.css'), 'utf8')
const modal = readFileSync(join(root, 'resources/js/components/DashboardAiReciteModal.vue'), 'utf8')
const css = readFileSync(join(root, 'resources/js/views/Dashboard.css'), 'utf8')
const modalCss = readFileSync(join(root, 'resources/js/components/DashboardAiReciteModal.css'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))

function t(key, params = {}) {
  const parts = key.split('.')
  let cursor = en
  for (const part of parts) cursor = cursor?.[part]
  if (typeof cursor !== 'string') return key
  return cursor.replace(/\{(\w+)\}/g, (_, name) => (params[name] == null ? `{${name}}` : String(params[name])))
}

assert.match(dashboard, /dash-ai-recite-cta/, 'dashboard exposes the AI Recite CTA')
assert.match(dashboard, /openAiRecite/, 'CTA opens the standalone modal')
assert.match(dashboard, /DashboardAiReciteModal/, 'dashboard mounts the AI Recite modal')
assert.match(dashboard, /webpackChunkName: "dash-ai-recite"/, 'heavy modal is lazy-loaded')
assert.doesNotMatch(dashboard, /createSpeechmaticsRealtimeProvider/, 'dashboard render does not import Speechmatics')
assert.match(css, /dash-ai-recite-glow/, 'CTA has a subtle AI glow')
assert.match(css, /prefers-reduced-motion/, 'dashboard glow respects reduced motion')
assert.match(modalCss, /prefers-reduced-motion/, 'modal animation respects reduced motion')

assert.match(memorisation, /workspace-ai-recite-cta/, 'session card exposes the AI Recite CTA')
assert.match(memorisation, /openWorkspaceAiRecite/, 'session card opens the standalone modal')
assert.match(memorisation, /DashboardAiReciteModal/, 'memorisation mounts the AI Recite modal')
assert.match(memorisation, /webpackChunkName: "dash-ai-recite"/, 'session-card modal is lazy-loaded')
assert.match(memorisation, /preferred-location="workspaceAiRecitePreferredLocation"/, 'session card passes the current ayah')
assert.match(memorisation, /workspace-ai-recite-glow/, 'session card CTA has a glow')
assert.match(memorisation, /workspace-ai-recite-shimmer/, 'session card CTA has a shimmer')
assert.match(memorisation, /workspace-ai-recite-spark/, 'session card CTA has a spark animation')
assert.match(memorisation, /prefers-reduced-motion/, 'session card glow respects reduced motion')
assert.match(
  memorisation,
  /workspace-shell-head-toolbar[\s\S]*?data-testid="workspace-ai-recite"[\s\S]*?workspace-shell-progress-pills/,
  'AI Recite sits on its own toolbar row below session actions',
)
assert.doesNotMatch(
  memorisation,
  /class="action-buttons-group"[\s\S]{0,1800}workspace-ai-recite-cta/,
  'AI Recite is not crammed into the Pause/End action group',
)

assert.match(modal, /Start Recording|ai_recite.start_recording/)
assert.match(modal, /stopRecitation|stopRecording/)
assert.match(modal, /peek next ayah|ai_recite.peek/i)
assert.match(modal, /see_stats/)
assert.match(modal, /try_again/)
assert.match(modal, /test_another/)
assert.match(modal, /dashboard_ai_recite/)
assert.match(modal, /createMemorisationAssessment/)
assert.doesNotMatch(modal, /submitRecommendationAiAssessment/)
assert.doesNotMatch(modal, /startMemorisationPracticePlan/)
assert.match(modal, /isBusy/, 'recording/processing blocks accidental dismiss')
assert.match(modal, /dash-ai-recite-open/, 'background scroll is locked')

assert.equal(en.dashboard.ai_recite.cta_label, 'AI Recite')
assert.match(en.dashboard.ai_recite.cta_hint, /memorisation/i)

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
  weakest_ayahs: [{ surah_number: 1, surah_name: 'Al-Fatiha', ayah: 5, accuracy: 60 }],
  missed_words: [{ text: 'الضالين', count: 2 }],
  recent_attempts: [{
    id: 9,
    surah_name: 'Al-Fatiha',
    ayah_start: 5,
    ayah_end: 5,
    accuracy_percent: 88,
    peek_used: true,
    occurred_at: '2026-09-04T12:00:00Z',
  }],
}, t)
assert.equal(filled.empty, false)
assert.ok(filled.cards.some((card) => card.key === 'average' && card.value.includes('81')))
assert.equal(filled.weakest[0].label.includes('5'), true)
assert.equal(filled.missed[0].text, 'الضالين')
assert.equal(filled.recent[0].peek_used, true)

console.log('dashboard-ai-recite.test.mjs: ok')
