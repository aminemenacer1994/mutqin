import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildWorkspaceAiReciteResultView } from '../../resources/js/scripts/workspaceAiRecite/buildWorkspaceAiReciteResultView.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))
const modal = readFileSync(join(root, 'resources/js/components/WorkspaceAiReciteResultModal.vue'), 'utf8')

function t(key, params = {}) {
  const parts = key.split('.')
  let cursor = en
  for (const part of parts) cursor = cursor?.[part]
  if (typeof cursor !== 'string') return key
  return cursor.replace(/\{(\w+)\}/g, (_, name) => (params[name] == null ? `{${name}}` : String(params[name])))
}

const mixedResult = {
  wordStatuses: [
    { text: 'بِسْمِ', status: 'correct', ayahNumber: 1, ayahWordIndex: 0 },
    { text: 'اللَّهِ', status: 'correct', ayahNumber: 1, ayahWordIndex: 1 },
    { text: 'الرَّحْمَٰنِ', status: 'partial', ayahNumber: 1, ayahWordIndex: 2 },
    { text: 'الرَّحِيمِ', status: 'incorrect', ayahNumber: 1, ayahWordIndex: 3 },
  ],
  accuracyScore: 75,
  colorCounts: { green: 2, amber: 1, red: 1, black: 0, gray: 0 },
  durationSeconds: 42,
}

const view = buildWorkspaceAiReciteResultView({
  result: mixedResult,
  surahName: 'Al-Fatiha',
  rangeStart: 1,
  rangeEnd: 1,
  audioUrl: 'blob:audio',
}, t)

assert.equal(view.hasContent, true, 'mixed recitation produces content')
assert.match(view.headerLead, /Al-Fatiha/, 'header includes surah name')
assert.match(view.outcomeHeadline, /./, 'headline is populated')
assert.ok(view.outcomeStatChips.length >= 1, 'stat chips are shown')
assert.ok(view.focusAyahRows.length >= 1, 'focus ayah rows are built')
assert.ok(view.infoArchitecture.weakAreas.items.length >= 1, 'weak areas are listed')
assert.equal(view.showDetailsToggle, true, 'details toggle is available')
assert.ok(view.colourSegments.length >= 1, 'colour meter segments exist')
assert.equal(view.audioUrl, 'blob:audio', 'audio url is preserved')

const insufficient = buildWorkspaceAiReciteResultView({
  result: { wordStatuses: [], failureReason: 'silence' },
  surahName: 'Al-Fatiha',
  rangeStart: 1,
  rangeEnd: 1,
}, t)

assert.equal(insufficient.presentationMode, 'insufficient_audio', 'silence maps to insufficient audio')
assert.equal(insufficient.outcomeStatChips.length, 0, 'insufficient audio hides stat chips')

assert.match(modal, /post-session-simple__ai-review--guided/, 'modal uses guided AI review layout')
assert.match(modal, /post-session-simple__outcome--hero/, 'modal uses outcome hero block')
assert.match(modal, /post-session-simple__weak-spots/, 'modal includes weak spots')
assert.ok(view.detailsMetrics.some((m) => m.key === 'sequence'), 'sequence metric is included')
const sequenceMetric = view.detailsMetrics.find((m) => m.key === 'sequence')
assert.doesNotMatch(String(sequenceMetric?.value || ''), /slip/i, 'sequence metric avoids slips wording')

assert.match(modal, /post-session-simple__ai-details--open/, 'details section is always visible')
assert.doesNotMatch(modal, /bi-play-circle post-session-simple__focus-phrase-icon/, 'focus ayahs omit play icon')
assert.doesNotMatch(modal, /post-session-simple__ai-details-toggle/, 'details are not behind a collapse toggle')
assert.doesNotMatch(modal, /post-session-simple__panel--hero ps-rec-card/, 'modal excludes recommendation plan')
assert.doesNotMatch(modal, /save.*plan/i, 'modal excludes save plan actions')
assert.match(modal, /workspace-recite-try-again/, 'modal exposes try again action')

console.log('workspace-ai-recite-result-view.test.mjs passed')
