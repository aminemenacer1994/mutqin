import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildMadaniAutosaveFingerprint,
  buildMadaniSessionPersistence,
  resolveMadaniResumeView,
  shouldKeepSessionOnReload,
  shouldWriteMadaniAutosave,
} from '../../resources/js/scripts/mushaf/qpcMadaniPersistence.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const index = JSON.parse(readFileSync(join(root, 'public/quran/madani-v2/verse-pages.json'), 'utf8'))

const sitting = {
  sessionId: 7,
  readingViewMode: 'madani_mushaf',
  stage: 'Takrar',
  activeVerseKey: '2:30',
  chapterId: 2,
  rangeStart: 29,
  rangeEnd: 37,
  queueIndex: 1,
  speed: 1,
  reciterId: 'ar.alafasy',
  currentTime: 12,
  technique: 'listen',
  aiAttemptId: 11,
  aiResultId: 4,
  status: 'active',
}

const saved = buildMadaniSessionPersistence(sitting)
assert.equal(saved.sessionId, 7)
assert.equal(saved.readingViewMode, 'madani_mushaf')
assert.equal(saved.stage, 'Takrar')
assert.equal(saved.activeVerseKey, '2:30')
assert.equal(saved.rangeStart, 29)
assert.equal(saved.rangeEnd, 37)
assert.equal(saved.technique, 'listen')
assert.equal(saved.aiAttemptId, 11)
assert.equal(saved.status, 'active')
assert.equal(Object.hasOwn(saved, 'page'), false)
assert.equal(Object.hasOwn(saved, 'qpcMadaniPinnedPage'), false)

const reloaded = resolveMadaniResumeView({
  ...saved,
  qpcMadaniPinnedPage: 1,
  mushafPageIndex: 0,
  madaniPage: 50,
}, { index, viewportWidth: 1400 })
assert.equal(shouldKeepSessionOnReload(saved), true)
assert.equal(reloaded.resumable, true)
assert.equal(reloaded.usedSavedPage, false)
assert.equal(reloaded.derivedFromAyah, true)
assert.equal(reloaded.activeVerseKey, '2:30')
assert.equal(reloaded.page, index['2:30'])
assert.notEqual(reloaded.page, 1)
assert.notEqual(reloaded.page, 50)
assert.deepEqual(reloaded.visiblePages, [5, 6])

const paused = resolveMadaniResumeView({
  ...sitting,
  status: 'paused',
  activeVerseKey: '2:30',
  qpcMadaniPinnedPage: 99,
}, { index, viewportWidth: 1400 })
assert.equal(paused.status, 'paused')
assert.equal(paused.resumable, true)
assert.equal(paused.page, index['2:30'])
assert.equal(paused.usedSavedPage, false)

const stacked = resolveMadaniResumeView({
  ...sitting,
  readingViewMode: 'stacked',
  status: 'paused',
  qpcMadaniPinnedPage: 6,
}, { index, viewportWidth: 1400 })
assert.equal(stacked.readingViewMode, 'stacked')
assert.equal(stacked.activeVerseKey, '2:30')
assert.equal(stacked.page, null)
assert.equal(stacked.resumable, true)

const earlierPage = resolveMadaniResumeView({
  ...sitting,
  activeVerseKey: '2:29',
}, { index, viewportWidth: 1080 })
const laterPage = resolveMadaniResumeView({
  ...sitting,
  activeVerseKey: '2:30',
}, { index, viewportWidth: 1080 })
assert.notEqual(earlierPage.page, laterPage.page)
assert.equal(laterPage.page, index['2:30'])
assert.equal(laterPage.activeVerseKey, '2:30')

assert.equal(shouldKeepSessionOnReload({ ...sitting, status: 'completed' }), false)
assert.equal(shouldKeepSessionOnReload({ ...sitting, completed: true }), false)
const completed = resolveMadaniResumeView({ ...sitting, status: 'completed' }, { index, viewportWidth: 1400 })
assert.equal(completed.status, 'completed')
assert.equal(completed.resumable, false)
assert.equal(completed.page, null)

assert.equal(shouldKeepSessionOnReload({ ...sitting, status: 'ended_early' }), false)
const ended = resolveMadaniResumeView({ ...sitting, endedEarly: true }, { index, viewportWidth: 390 })
assert.equal(ended.status, 'ended_early')
assert.equal(ended.resumable, false)
assert.equal(ended.page, null)

const mobile = resolveMadaniResumeView(sitting, { index, viewportWidth: 390 })
const desktop = resolveMadaniResumeView(sitting, { index, viewportWidth: 1400 })
assert.equal(mobile.activeVerseKey, desktop.activeVerseKey)
assert.equal(mobile.page, desktop.page)
assert.deepEqual(mobile.visiblePages, [mobile.page])
assert.deepEqual(desktop.visiblePages, [5, 6])
const fingerprint = buildMadaniAutosaveFingerprint(sitting)
assert.equal(buildMadaniAutosaveFingerprint({ ...sitting, qpcMadaniPinnedPage: 12 }), fingerprint)
assert.equal(shouldWriteMadaniAutosave({
  reason: 'viewport',
  previousFingerprint: fingerprint,
  nextFingerprint: fingerprint,
}), false)

assert.equal(shouldWriteMadaniAutosave({
  reason: 'word-highlight',
  previousFingerprint: fingerprint,
  nextFingerprint: `${fingerprint}|word`,
}), false)
assert.equal(shouldWriteMadaniAutosave({
  reason: 'page-render',
  previousFingerprint: '',
  nextFingerprint: fingerprint,
}), false)
assert.equal(shouldWriteMadaniAutosave({
  reason: 'page-navigation',
  previousFingerprint: fingerprint,
  nextFingerprint: fingerprint,
}), false)
const moved = buildMadaniAutosaveFingerprint({ ...sitting, activeVerseKey: '2:31' })
assert.equal(shouldWriteMadaniAutosave({
  reason: 'page-navigation',
  previousFingerprint: fingerprint,
  nextFingerprint: moved,
}), true)
assert.equal(shouldWriteMadaniAutosave({
  reason: 'layout',
  previousFingerprint: fingerprint,
  nextFingerprint: buildMadaniAutosaveFingerprint({ ...sitting, readingViewMode: 'stacked' }),
}), true)
assert.equal(shouldWriteMadaniAutosave({
  reason: 'stage',
  previousFingerprint: fingerprint,
  nextFingerprint: buildMadaniAutosaveFingerprint({ ...sitting, stage: 'Retention' }),
}), true)
assert.equal(shouldWriteMadaniAutosave({
  reason: 'playback',
  previousFingerprint: fingerprint,
  nextFingerprint: buildMadaniAutosaveFingerprint({ ...sitting, isPlaying: true }),
}), true)
assert.equal(shouldWriteMadaniAutosave({
  reason: 'ai-attempt',
  previousFingerprint: fingerprint,
  nextFingerprint: buildMadaniAutosaveFingerprint({ ...sitting, aiAttemptId: 12 }),
}), true)

assert.match(memorisationJs, /buildContinueSessionPayload\(\)[\s\S]{0,1800}buildMadaniSessionPersistence/)
assert.doesNotMatch(memorisationJs, /buildContinueSessionPayload\(\)[\s\S]{0,2200}qpcMadaniPinnedPage/)
assert.match(memorisationJs, /hydrateSessionFromPayload[\s\S]{0,1600}resolveMadaniResumeView/)
assert.match(memorisationJs, /shouldKeepSessionOnReload\(persistedContinue\)/)
assert.match(memorisationJs, /commitMadaniSessionPersistence\('layout'\)/)
assert.match(memorisationJs, /commitMadaniSessionPersistence\('page-navigation'\)/)
assert.match(memorisationJs, /applyWordHighlightClasses\(verseKey, activeIndex\)[\s\S]{0,240}word-highlight/)
assert.doesNotMatch(memorisationJs, /applyWordHighlightClasses\(verseKey, activeIndex\)[\s\S]{0,500}scheduleSessionCheckpoint/)
assert.match(memorisationJs, /\$watch\('qpcMadaniCurrentPage'[\s\S]{0,280}page-render/)
assert.doesNotMatch(memorisationJs, /\$watch\('qpcMadaniCurrentPage'[\s\S]{0,360}scheduleSessionCheckpoint/)
assert.match(memorisationJs, /reason: 'viewport'/)
assert.doesNotMatch(memorisationJs, /handlePracticeTurnCalloutResize = \(\) => \{[\s\S]{0,500}scheduleSessionCheckpoint/)
assert.match(memorisationJs, /sessionEndedEarly \|\| this\.mutqinState\?\.sessionState\?\.completed/)
assert.match(memorisationJs, /ensureReadingLayoutReadyForSession\(\)[\s\S]{0,700}resolveMadaniResumeView/)

console.log('PASS')
