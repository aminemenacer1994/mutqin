import assert from 'node:assert/strict'
import { QURAN_TOTALS } from '../../resources/js/scripts/engine/hifz_session_engine.js'
import {
  ayahsInJuzRange,
  ayahsInSurah,
  juzAmmaAyahCount,
  scaleFromAyahs,
} from '../../resources/js/scripts/seoTools/quranCorpus.js'
import { buildPublicMemorizationPlan } from '../../resources/js/scripts/seoTools/planner.js'
import { buildHifzProgressSummary } from '../../resources/js/scripts/seoTools/progress.js'
import {
  buildPublicQuizCards,
  gradePublicQuizAnswer,
  versesFromEditionAyahs,
} from '../../resources/js/scripts/seoTools/quiz.js'
import { trackSeoTool } from '../../resources/js/scripts/seoTools/track.js'

assert.equal(ayahsInJuzRange(1, 30), QURAN_TOTALS.ayahs)
assert.equal(juzAmmaAyahCount(), ayahsInJuzRange(30, 30))
assert.ok(juzAmmaAyahCount() > 500 && juzAmmaAyahCount() < 700)
assert.equal(ayahsInSurah(1), 7)
assert.equal(ayahsInSurah(112), 4)

const ikhlasPlan = buildPublicMemorizationPlan({
  target: 'surah',
  surah: 112,
  from: 1,
  to: 4,
  dailyAyahs: 2,
  daysPerWeek: 7,
  now: new Date('2026-01-01T00:00:00Z'),
})
assert.equal(ikhlasPlan.totalAyahs, 4)
assert.equal(ikhlasPlan.dailyTarget, 2)
assert.equal(ikhlasPlan.estimatedDays, 2)
assert.equal(ikhlasPlan.calendarDays, 2)
assert.match(ikhlasPlan.firstSittingLabel, /Al-Ikhlas/)

const weekPlan = buildPublicMemorizationPlan({
  target: 'juz-amma',
  dailyAyahs: 3,
  daysPerWeek: 3,
  now: new Date('2026-01-01T00:00:00Z'),
})
assert.equal(weekPlan.totalAyahs, juzAmmaAyahCount())
assert.ok(weekPlan.calendarDays > weekPlan.estimatedDays)

const fullJuz = buildHifzProgressSummary({ mode: 'juz', fromJuz: 1, toJuz: 30, dailyAyahs: 3 })
assert.equal(fullJuz.ayahs, QURAN_TOTALS.ayahs)
assert.equal(fullJuz.percent, 100)
assert.equal(fullJuz.remainingAyahs, 0)
assert.equal(fullJuz.remainingDays, 0)

const pages = buildHifzProgressSummary({ mode: 'pages', pages: 302, dailyAyahs: 5 })
assert.ok(pages.percent > 40 && pages.percent < 60)
assert.equal(scaleFromAyahs(0).pages, 0)

const verses = versesFromEditionAyahs(112, [
  { numberInSurah: 1, text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ' },
  { numberInSurah: 2, text: 'ٱللَّهُ ٱلصَّمَدُ' },
  { numberInSurah: 3, text: 'لَمْ يَلِدْ وَلَمْ يُولَدْ' },
  { numberInSurah: 4, text: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌ' },
], 1, 4)
assert.equal(verses.length, 4)
const cards = buildPublicQuizCards(verses, { questionCount: 4 })
assert.equal(cards.length, 4)
assert.ok(cards.every((card) => ['mcq', 'blank', 'flashcard'].includes(card.type)))
const flash = cards.find((card) => card.type === 'flashcard')
if (flash) {
  assert.equal(gradePublicQuizAnswer(flash, 'recalled'), true)
  assert.equal(gradePublicQuizAnswer(flash, 'missed'), false)
}

const events = []
globalThis.window = {
  gtag(...args) {
    events.push(args)
  },
}
trackSeoTool('seo_tool_planner', { daily: 3, transcript: 'بسم الله الرحمن' })
assert.equal(events.length, 1)
assert.equal(events[0][1], 'seo_tool_planner')
assert.equal(events[0][2].daily, 3)
assert.equal(events[0][2].transcript, undefined)

console.log('seo-tools.test.mjs: ok')
