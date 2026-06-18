import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const moduleCache = new Map()
const localStore = new Map()

const context = vm.createContext({
  console,
  Date,
  Math,
  JSON,
  localStorage: {
    getItem: key => localStore.has(key) ? localStore.get(key) : null,
    setItem: (key, value) => localStore.set(key, String(value)),
    removeItem: key => localStore.delete(key)
  },
  structuredClone: value => JSON.parse(JSON.stringify(value))
})

async function loadModule(specifier, referrer = path.join(root, 'tests/js/mutqin-flow.test.mjs')) {
  if (specifier === 'vue') {
    if (!moduleCache.has('vue')) {
      const vueModule = new vm.SourceTextModule(`
        export function reactive(value) { return value }
        export function toRaw(value) { return value }
        export function computed(getter) { return { get value() { return getter() } } }
        export function toRefs(value) {
          return Object.fromEntries(Object.keys(value).map(key => [key, { get value() { return value[key] }, set value(next) { value[key] = next } }]))
        }
        export function watch() { return function unwatch() { unwatch.calls = (unwatch.calls || 0) + 1 } }
      `, { context, identifier: 'vue' })
      await vueModule.link(() => {})
      await vueModule.evaluate()
      moduleCache.set('vue', vueModule)
    }
    return moduleCache.get('vue')
  }

  const resolved = specifier.startsWith('.')
    ? path.resolve(path.dirname(referrer), `${specifier}${specifier.endsWith('.js') ? '' : '.js'}`)
    : path.resolve(root, specifier)

  if (moduleCache.has(resolved)) return moduleCache.get(resolved)
  const source = await fs.readFile(resolved, 'utf8')
  const mod = new vm.SourceTextModule(source, { context, identifier: resolved })
  moduleCache.set(resolved, mod)
  await mod.link(child => loadModule(child, resolved))
  await mod.evaluate()
  return mod
}

const persistence = await loadModule('resources/js/composables/useMutqinPersistence.js')
const ayahState = await loadModule('resources/js/composables/useAyahState.js')
const takrar = await loadModule('resources/js/composables/useTakrarLadder.js')
const chaining = await loadModule('resources/js/composables/useChaining.js')
const retention = await loadModule('resources/js/composables/useRetentionZones.js')
const planner = await loadModule('resources/js/composables/useDailyPlanner.js')
const session = await loadModule('resources/js/composables/useSessionEngine.js')
const spacedRepetition = await loadModule('resources/js/engine/spaced_repetition_memory.js')
const hifzSessionEngine = await loadModule('resources/js/engine/hifz_session_engine.js')
const memorisationSource = await fs.readFile(path.join(root, 'resources/js/components/Memorisation.vue'), 'utf8')

const { loadMutqinState, saveMutqinState, useMutqinPersistence, watchMutqinState } = persistence.namespace
const { seedAyahs, updateAyah } = ayahState.namespace
const { repeatAyah, hideAyah, completeTakrarStep, getTakrarStep } = takrar.namespace
const { buildChainQueue, recordChainResult } = chaining.namespace
const { getDueReviews, scoreRetention } = retention.namespace
const { createDailyPlan } = planner.namespace
const { startMutqinSession, moveMutqinSession, completeMutqinSession } = session.namespace
const { updateAyahProgress, AYAH_PROGRESS_STORAGE_KEY } = spacedRepetition.namespace
const { loadAyahProgress } = hifzSessionEngine.namespace

function resetStorage() {
  localStore.clear()
  moduleCache.delete(path.resolve(root, 'resources/js/composables/useMutqinPersistence.js'))
}

const verses = [
  { key: '110:1', number: 1, arabic: 'a' },
  { key: '110:2', number: 2, arabic: 'b' },
  { key: '110:3', number: 3, arabic: 'c' },
  { key: '110:4', number: 4, arabic: 'd' }
]

assert.equal(AYAH_PROGRESS_STORAGE_KEY, 'mutqin_ayah_progress')
updateAyahProgress(112, 1, 1)
updateAyahProgress(112, 1, 0.5)
const savedAyahProgress = JSON.parse(localStore.get('mutqin_ayah_progress'))
assert.deepEqual(
  Object.keys(savedAyahProgress['112:1']).sort(),
  ['attempts', 'ayah', 'lastReviewed', 'lastScore', 'masteryScore', 'nextReview', 'repetitionCount', 'surah'].sort()
)
assert.equal(savedAyahProgress['112:1'].surah, 112)
assert.equal(savedAyahProgress['112:1'].ayah, 1)
assert.equal(savedAyahProgress['112:1'].attempts, 2)
assert.equal(savedAyahProgress['112:1'].lastScore, 0.5)
localStore.set('mutqin_spaced_repetition_memory', JSON.stringify({
  '112:2': {
    masteryScore: 0.25,
    repetitionCount: 1,
    lastReviewed: '2026-06-01T00:00:00.000Z',
    nextReview: '2026-06-02T00:00:00.000Z'
  }
}))
const mergedAyahProgress = loadAyahProgress()
assert.equal(mergedAyahProgress['112:1'].attempts, 2)
assert.equal(mergedAyahProgress['112:2'].masteryScore, 0.25)
updateAyahProgress(112, 3, 0)
const migratedAyahProgress = JSON.parse(localStore.get('mutqin_ayah_progress'))
assert.deepEqual(
  Object.keys(migratedAyahProgress['112:2']).sort(),
  ['attempts', 'ayah', 'lastReviewed', 'lastScore', 'masteryScore', 'nextReview', 'repetitionCount', 'surah'].sort()
)
assert.equal(migratedAyahProgress['112:2'].surah, 112)
assert.equal(migratedAyahProgress['112:2'].ayah, 2)

const state = loadMutqinState()
const store = useMutqinPersistence()
assert.ok(store.globalState.value.sessionState)
assert.ok(store.sessionState.value.queue)
const stopOne = watchMutqinState(state)
const stopTwo = watchMutqinState(state)
assert.equal(stopOne, stopTwo)
stopOne()
seedAyahs(state, verses)
assert.deepEqual(Object.keys(state.ayahs), ['110:1', '110:2', '110:3', '110:4'])
assert.equal(getTakrarStep(state.ayahs['110:1']), 5)
updateAyah(state, '110:1', { mastery_level: 99, repetition_count: -4, zone: 'Broken' })
assert.equal(state.ayahs['110:1'].mastery_level, 5)
assert.equal(state.ayahs['110:1'].repetition_count, 0)
assert.equal(state.ayahs['110:1'].zone, 'Fresh')
updateAyah(state, '110:1', { mastery_level: 1 })

repeatAyah(state, '110:1')
hideAyah(state, '110:1')
assert.equal(state.ayahs['110:1'].repetition_count, 1)
assert.equal(state.ayahs['110:1'].weak_count, 1)

state.ayahs['110:1'].repetition_count = 5
completeTakrarStep(state, '110:1', 'Easy')
assert.equal(state.ayahs['110:1'].mastery_level, 2)
assert.equal(getTakrarStep(state.ayahs['110:1']), 10)
completeTakrarStep(state, '110:1', 'Shaky')
assert.equal(state.ayahs['110:1'].mastery_level, 2)
state.ayahs['110:1'].repetition_count = 10
completeTakrarStep(state, '110:1', 'Easy')
assert.equal(getTakrarStep(state.ayahs['110:1']), 20)
state.ayahs['110:1'].repetition_count = 20
completeTakrarStep(state, '110:1', 'Easy')
assert.equal(getTakrarStep(state.ayahs['110:1']), 'hidden')
completeTakrarStep(state, '110:1', 'Easy')
assert.equal(getTakrarStep(state.ayahs['110:1']), 'mastered')
completeTakrarStep(state, '110:1', 'Forgot')
assert.equal(getTakrarStep(state.ayahs['110:1']), 'hidden')

state.ayahs['110:1'].mastery_level = 2
state.ayahs['110:2'].mastery_level = 2
const chainQueue = buildChainQueue(verses.slice(0, 4))
assert.equal(JSON.stringify(chainQueue.map(item => item.verse.key)), JSON.stringify(['110:1', '110:1', '110:2', '110:1', '110:2', '110:3', '110:1', '110:2', '110:3', '110:4']))
const dedupedChainQueue = buildChainQueue([verses[0], verses[0], verses[1]])
assert.equal(JSON.stringify(dedupedChainQueue.map(item => item.verse.key)), JSON.stringify(['110:1', '110:1', '110:2']))
recordChainResult(state, '110:1', '110:2', true)
recordChainResult(state, '110:2', '110:3', false)
assert.equal(state.chains['110:1->110:2'].chain_strength, 51)
assert.equal(state.chains['110:2->110:3'].chain_errors, 1)
assert.equal(state.ayahs['110:3'].chain_errors, 1)
assert.equal(state.ayahs['110:3'].weak_count, 1)

state.ayahs['110:1'].next_review = '2000-01-01T23:59:00.000Z'
assert.equal(getDueReviews(state, '2026-05-15').length, 4)
scoreRetention(state, '110:1', 'Easy')
assert.equal(state.ayahs['110:1'].zone, 'Fresh')
assert.equal(state.ayahs['110:1'].zone_step, 1)
scoreRetention(state, '110:1', 'Easy')
scoreRetention(state, '110:1', 'Easy')
assert.equal(state.ayahs['110:1'].zone, 'Stable')

state.ayahs['110:2'].status = 'learning'
state.ayahs['110:2'].next_review = '2000-01-01'
const beforePlan = JSON.stringify(state)
const plan = createDailyPlan(state, verses, {
  repetitions: 3,
  audioDurations: { '110:3': 40, '110:4': 20 },
  reviewSeconds: 20
})
assert.ok(Array.isArray(plan.new))
assert.ok(Array.isArray(plan.chains))
assert.ok(Array.isArray(plan.reviews))
assert.equal(plan.ETA, 5)
assert.equal(JSON.stringify(state), beforePlan, 'planner must not mutate state')

startMutqinSession(state, {
  mode: 'advanced',
  queue: [
    { phase: 'Planner', ayahId: '110:1' },
    ...plan.queue,
    ...plan.queue
  ],
  config: { chapterId: 110, rangeStart: 1, rangeEnd: 4 },
  planner: { ETA: plan.ETA }
})
const queueAfterFirstStart = JSON.stringify(state.sessionState.queue)
moveMutqinSession(state, 2)
startMutqinSession(state, {
  mode: 'advanced',
  queue: [
    { phase: 'Planner', ayahId: '110:1' },
    ...plan.queue,
    ...plan.queue
  ],
  config: { chapterId: 110, rangeStart: 1, rangeEnd: 4 },
  planner: { ETA: plan.ETA }
})
assert.equal(JSON.stringify(state.sessionState.queue), queueAfterFirstStart)
assert.equal(state.sessionState.current_index, 2)
assert.equal(state.sessionState.active, true)
assert.equal(state.sessionState.queue[0].phase, 'Planner')
assert.ok(state.sessionState.queue.some(item => item.phase === 'Takrar'))
assert.ok(state.sessionState.queue.some(item => item.phase === 'Chaining'))
assert.ok(state.sessionState.queue.some(item => item.phase === 'Recall'))
assert.ok(state.sessionState.queue.some(item => item.phase === 'Retention'))
assert.equal(new Set(state.sessionState.queue.map(item => `${item.phase}:${item.ayahId}:${item.chainStage || ''}:${item.repeatCount || ''}`)).size, state.sessionState.queue.length)
moveMutqinSession(state, 1)
assert.equal(state.sessionState.current_index, 1)
completeMutqinSession(state)
assert.equal(state.sessionState.active, false)
assert.equal(state.stats.sessions_completed, 1)
completeMutqinSession(state)
assert.equal(state.stats.sessions_completed, 1)

startMutqinSession(state, { mode: 'beginner', queue: [] })
assert.equal(state.sessionState.active, false)
assert.equal(state.sessionState.queue.length, 0)

startMutqinSession(state, {
  mode: 'advanced',
  queue: [
    { phase: 'Linking', ayahId: '110:1', verse: verses[0], chainKey: 'linking:110:1', sequencePosition: 1, sequenceTotal: 2, repeatCount: 1 },
    { phase: 'Linking', ayahId: '110:1', verse: verses[0], chainKey: 'linking:110:1', sequencePosition: 2, sequenceTotal: 2, repeatCount: 1 },
    { phase: 'Cumulative', ayahId: '110:1', verse: verses[0], chainKey: 'cumulative:1', sequencePosition: 1, sequenceTotal: 1, repeatCount: 1 },
    { phase: 'Cumulative', ayahId: '110:1', verse: verses[0], chainKey: 'cumulative:2', sequencePosition: 1, sequenceTotal: 2, repeatCount: 1 }
  ],
  config: { chapterId: 110, rangeStart: 1, rangeEnd: 2, chainingMethod: 'linking' }
})
assert.equal(state.sessionState.queue.filter(item => item.phase === 'Linking').length, 2)
assert.equal(state.sessionState.queue.filter(item => item.phase === 'Cumulative').length, 2)
assert.deepEqual(
  state.sessionState.queue.filter(item => item.phase === 'Linking').map(item => item.sequencePosition),
  [1, 2]
)

saveMutqinState(state)
assert.equal(saveMutqinState(state), false)
const restored = loadMutqinState()
assert.equal(restored.stats.sessions_completed, 1)
assert.equal(restored.ayahs['110:1'].id, '110:1')

localStore.set('mutqin_state', JSON.stringify({
  version: 0,
  ayahs: { '2:1': { text: 'legacy' } },
  chains: { '2:1->2:2': { chain_strength: 999, chain_errors: -5, attempts: -1 } },
	  sessionState: {
	    active: true,
	    phase: 'Recall',
	    current_index: 99,
	    queue: [{ phase: 'Review', ayahId: '2:1' }, { phase: 'Review', ayahId: '2:1' }, { broken: true }]
	  }
	}))
const migrated = loadMutqinState()
assert.equal(migrated.version, 1)
assert.equal(migrated.ayahs['2:1'].id, '2:1')
assert.equal(migrated.sessionState.queue.length, 1)
assert.equal(migrated.sessionState.current_index, 0)
assert.equal(migrated.sessionState.phase, 'Retention')
assert.equal(migrated.chains['2:1->2:2'].chain_strength, 100)
assert.equal(migrated.chains['2:1->2:2'].chain_errors, 0)
assert.equal(migrated.ayahs['2:1'].next_review.length, 10)

localStore.set('mutqin_state:backup', JSON.stringify({
  version: 1,
  ayahs: { '3:1': { id: '3:1', text: 'backup', next_review: '2000-01-01' } },
  sessionState: { active: true, queue: [{ phase: 'Takrar', ayahId: '3:1' }], current_index: 0 }
}))
localStore.set('mutqin_state', '{broken json')
const recovered = loadMutqinState()
assert.equal(recovered.ayahs['3:1'].id, '3:1')

resetStorage()
const dayOne = loadMutqinState()
seedAyahs(dayOne, verses.slice(0, 3))
for (const verse of verses.slice(0, 3)) {
  for (let i = 0; i < 5; i += 1) repeatAyah(dayOne, verse.key)
  completeTakrarStep(dayOne, verse.key, 'Easy')
}
const dayOnePlan = createDailyPlan(dayOne, verses.slice(0, 3), { repetitions: 5, audioDurations: { '110:1': 10, '110:2': 12, '110:3': 14 } })
startMutqinSession(dayOne, {
  mode: 'beginner',
  queue: [
    { phase: 'Planner', ayahId: '110:1' },
    ...dayOnePlan.queue
  ],
  config: { chapterId: 110, rangeStart: 1, rangeEnd: 3 },
  planner: { ETA: dayOnePlan.ETA }
})
moveMutqinSession(dayOne, 2)
saveMutqinState(dayOne)

const afterRefresh = loadMutqinState()
assert.equal(afterRefresh.sessionState.active, true)
assert.equal(afterRefresh.sessionState.current_index, 2)
assert.equal(afterRefresh.sessionState.config.chapterId, 110)
const resumedPlan = createDailyPlan(afterRefresh, verses.slice(0, 3), {
  repetitions: 5,
  audioDurations: { '110:1': 10, '110:2': 12, '110:3': 14 },
  currentAudioDuration: 12,
  currentAudioTime: 6
})
assert.equal(resumedPlan.ETA >= 1, true)

afterRefresh.ayahs['110:1'].next_review = '2000-01-01'
afterRefresh.ayahs['110:2'].next_review = '2000-01-01'
saveMutqinState(afterRefresh)
const dayTwo = loadMutqinState()
const dayTwoPlan = createDailyPlan(dayTwo, verses.slice(0, 3), { repetitions: 5, audioDurations: { '110:1': 10, '110:2': 12, '110:3': 14 } })
assert.equal(dayTwoPlan.reviews.length >= 2, true)
assert.equal(new Set(dayTwoPlan.reviews.map(ayah => ayah.id)).size, dayTwoPlan.reviews.length)
scoreRetention(dayTwo, '110:1', 'Easy')
recordChainResult(dayTwo, '110:1', '110:2', false)
assert.equal(dayTwo.chains['110:1->110:2'].chain_errors >= 1, true)
assert.equal(dayTwo.stats.overdue_reviews >= 1, true)

assert.match(memorisationSource, /async playVerse\(verse, options = \{\}\)/, 'playVerse must accept force option')
assert.match(memorisationSource, /!options\.force && this\.activeKey === verse\.key/, 'same-ayah manual play may toggle only when not forced')
assert.equal((memorisationSource.match(/playQueueEntry\(v, \{ force: true, queueIndex: this\.queueIndex \}\)/g) || []).length >= 2, true, 'queue navigation must force same-ayah replay for repetitions')
assert.match(memorisationSource, /playQueueEntry\(first, \{ force: true, queueIndex: playbackIndex \}\)/, 'session start must force first playback through queue entry metadata')
assert.match(memorisationSource, /setActiveVerse\(verseKey, \{ queueIndex: this\.queueIndex \}\)/, 'next navigation must preserve duplicate queue entry index')
assert.match(memorisationSource, /queueIndex: Number\.isFinite\(options\.queueIndex\)/, 'playback must not reset repeated ayah entries to first queue match')
assert.doesNotMatch(memorisationSource, /createAyahSegments/, 'linking must be ayah-level, not word-segment based')
assert.match(memorisationSource, /linking:single:\$\{verse\.key\}/, 'linking must include individual ayah practice')
assert.match(memorisationSource, /linking:\$\{verse\.key\}->\$\{nextVerse\.key\}/, 'linking must include adjacent ayah pairs')

console.log('mutqin-flow composable integration passed')
