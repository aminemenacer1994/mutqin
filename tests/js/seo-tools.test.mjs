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
import {
  captureSeoAttribution,
  clearSeoTool,
  getSeoAttribution,
  peekSeoTool,
  rememberSeoTool,
  trackRegistrationComplete,
  trackRegistrationStart,
  trackSeoCtaClick,
  trackSeoLandingView,
  trackSeoTool,
  trackWaitingListJoin,
} from '../../resources/js/scripts/seoTools/track.js'

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

const store = new Map()
const events = []
globalThis.window = {
  location: {
    pathname: '/tools/quran-memorization-planner',
    search: '?utm_source=seo_tool&utm_medium=cta&utm_campaign=planner',
  },
  gtag(...args) {
    events.push(args)
  },
  sessionStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)) },
    removeItem: (key) => { store.delete(key) },
  },
}
globalThis.document = { referrer: 'https://www.google.com/search?q=hifz' }

captureSeoAttribution()
const attr = getSeoAttribution()
assert.equal(attr.utm_source, 'seo_tool')
assert.equal(attr.utm_campaign, 'planner')
assert.equal(attr.tool, 'planner')
assert.equal(attr.referrer_host, 'google.com')
assert.equal(attr.organic_likely, false) // utm campaign wins over referrer host

events.length = 0
trackSeoLandingView({ kind: 'tool', pageId: 'tool-planner', path: '/tools/quran-memorization-planner', tool: 'planner' })
assert.ok(events.some((e) => e[1] === 'seo_landing_view'))
assert.ok(events.some((e) => e[1] === 'seo_tool_view'))

events.length = 0
trackSeoTool('seo_tool_planner', { tool: 'planner', daily: 3, transcript: 'بسم الله الرحمن', email: 'a@b.com' })
assert.ok(events.some((e) => e[1] === 'seo_tool_planner'))
assert.ok(events.some((e) => e[1] === 'seo_tool_start'))
assert.ok(events.some((e) => e[1] === 'seo_tool_complete'))
const plannerEvent = events.find((e) => e[1] === 'seo_tool_planner')
assert.equal(plannerEvent[2].daily, 3)
assert.equal(plannerEvent[2].tool, 'planner')
assert.equal(plannerEvent[2].transcript, undefined)
assert.equal(plannerEvent[2].email, undefined)
assert.equal(plannerEvent[2].landing_path, '/tools/quran-memorization-planner')
assert.equal(peekSeoTool(), 'planner')

events.length = 0
trackSeoCtaClick({ dest: 'primary', href: '/waiting-list?utm_source=seo_tool', ctaId: 'tool_primary', tool: 'planner' })
assert.ok(events.some((e) => e[1] === 'seo_cta_click'))
assert.ok(events.some((e) => e[1] === 'seo_waiting_list_click'))

events.length = 0
trackWaitingListJoin()
assert.ok(events.some((e) => e[1] === 'generate_lead'))
assert.ok(events.some((e) => e[1] === 'seo_tool_signup'))
assert.equal(peekSeoTool(), null)

rememberSeoTool('quiz')
clearSeoTool()
assert.equal(peekSeoTool(), null)

events.length = 0
window.location.pathname = '/register'
window.location.search = ''
trackRegistrationStart()
assert.equal(events[0][1], 'seo_registration_start')
trackRegistrationComplete({ method: 'email' })
assert.ok(events.some((e) => e[1] === 'seo_registration_complete'))
assert.ok(events.some((e) => e[1] === 'sign_up'))
const before = events.length
trackRegistrationComplete({ method: 'email' })
assert.equal(events.length, before) // once per session

events.length = 0
trackSeoLandingView({ kind: 'guide', pageId: 'guide-techniques', path: '/guides/quran-memorization-techniques' })
assert.ok(events.some((e) => e[1] === 'seo_guide_view'))
assert.equal(getSeoAttribution().guide_path, '/guides/quran-memorization-techniques')

console.log('seo-tools.test.mjs: ok')
