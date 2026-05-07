import { sm2Review } from './sm2'
import { plannerInitialState } from './planner'
import { chainingStart, chainingAdvance, chainingStop } from './chaining'
import { quizStart, quizAnswer, quizStop } from './quiz'
import { mistakesAdd } from './mistakes'
import { audioSetSource, audioSetTime, audioSetPlayback } from './audio'

function nowIso() {
  return new Date().toISOString()
}

function sortVerseKeys(keys) {
  // Deterministic sort: "2:255" by surah then ayah.
  return [...keys].sort((a, b) => {
    const [as, aa] = String(a).split(':').map(n => Number(n) || 0)
    const [bs, ba] = String(b).split(':').map(n => Number(n) || 0)
    if (as !== bs) return as - bs
    return aa - ba
  })
}

function verseKeyFromSelection(surahNumber, ayahNumber) {
  return `${Number(surahNumber)}:${Number(ayahNumber)}`
}

export function coreEnsureState(state) {
  const iso = nowIso()
  return {
    ...state,
    planner: state.planner || plannerInitialState(iso),
    session: state.session || {
      id: null,
      active: false,
      type: null,
      createdIso: null,
      selectedSurahId: '',
      ayahRange: { start: 1, end: 1 },
      queueVerseKeys: [],
      currentIndex: 0
    }
  }
}

export function coreDeriveSessionType(state, { selectedSurahId } = {}) {
  // RULE: session type must be planner-derived only.
  // If planner.intent is set, we obey it. Otherwise we return 'memorisation' (no override).
  const intent = state.planner?.intent
  if (intent === 'revision' || intent === 'mixed' || intent === 'recovery' || intent === 'memorisation') return intent
  return 'memorisation'
}

export function coreBuildQueue(state, { selectedSurahId, ayahRange } = {}) {
  const surah = Number(selectedSurahId) || 0
  const start = Number(ayahRange?.start) || 1
  const end = Number(ayahRange?.end) || start

  const type = coreDeriveSessionType(state, { selectedSurahId })

  const rangeKeys = []
  for (let a = start; a <= end; a++) rangeKeys.push(verseKeyFromSelection(surah, a))

  const sm2Items = state.sm2?.items ? Object.entries(state.sm2.items) : []
  const dueKeys = sm2Items
    .filter(([k, v]) => {
      if (!v?.dueIso) return false
      if (!k.startsWith(`${surah}:`)) return false
      return new Date(v.dueIso) <= new Date()
    })
    .map(([k]) => k)

  const mistakeKeys = (state.mistakes?.items || [])
    .map(m => m.verseKey)
    .filter(k => String(k).startsWith(`${surah}:`))

  if (type === 'revision') return sortVerseKeys(dueKeys.length ? dueKeys : rangeKeys)
  if (type === 'recovery') return sortVerseKeys(mistakeKeys.length ? mistakeKeys : dueKeys.length ? dueKeys : rangeKeys)
  if (type === 'mixed') {
    const due = sortVerseKeys(dueKeys)
    const fresh = sortVerseKeys(rangeKeys.filter(k => !due.includes(k)))
    const takeDue = Math.ceil((due.length || 0) / 2) || Math.min(10, due.length)
    const takeFresh = Math.ceil((fresh.length || 0) / 2) || Math.min(10, fresh.length)
    return sortVerseKeys([...due.slice(0, takeDue), ...fresh.slice(0, takeFresh)])
  }
  return sortVerseKeys(rangeKeys)
}

export function coreStartSession(state, { selectedSurahId, ayahRange } = {}) {
  const iso = nowIso()
  const ensured = coreEnsureState(state)
  const type = coreDeriveSessionType(ensured, { selectedSurahId })
  const queueVerseKeys = coreBuildQueue(ensured, { selectedSurahId, ayahRange })

  return {
    ...ensured,
    session: {
      id: `sess_${Date.now()}`,
      active: true,
      type,
      createdIso: iso,
      selectedSurahId: String(selectedSurahId || ''),
      ayahRange: { ...ayahRange },
      queueVerseKeys,
      currentIndex: 0
    },
    chaining: chainingStart(ensured.chaining, queueVerseKeys[0] || null, iso)
  }
}

export function coreAdvanceSession(state) {
  const iso = nowIso()
  const s = coreEnsureState(state)
  if (!s.session?.active) return s
  const nextIndex = Math.min((s.session.currentIndex || 0) + 1, (s.session.queueVerseKeys || []).length)
  const active = nextIndex < (s.session.queueVerseKeys || []).length
  const nextKey = s.session.queueVerseKeys[nextIndex] || null

  return {
    ...s,
    session: { ...s.session, currentIndex: nextIndex, active },
    chaining: nextKey ? chainingAdvance(s.chaining, nextKey, iso) : chainingStop(s.chaining, iso)
  }
}

export function coreRecordMistake(state, { verseKey, type = 'general', note = '' } = {}) {
  const iso = nowIso()
  const s = coreEnsureState(state)
  return { ...s, mistakes: mistakesAdd(s.mistakes, { verseKey, type, note }, iso) }
}

export function coreSm2Grade(state, { verseKey, grade } = {}) {
  const iso = nowIso()
  const s = coreEnsureState(state)
  return { ...s, sm2: sm2Review(s.sm2, verseKey, grade, iso) }
}

export function coreAudioUpdate(state, patch = {}) {
  const iso = nowIso()
  const s = coreEnsureState(state)
  let audio = s.audio
  if (patch.src !== undefined) audio = audioSetSource(audio, patch.src, iso)
  if (patch.currentTime !== undefined) audio = audioSetTime(audio, patch.currentTime, iso)
  audio = audioSetPlayback(audio, patch, iso)
  return { ...s, audio }
}

export function coreQuizStart(state, { mode, queue } = {}) {
  const iso = nowIso()
  const s = coreEnsureState(state)
  return { ...s, quiz: quizStart(s.quiz, { mode, queue }, iso) }
}

export function coreQuizAnswer(state, isCorrect) {
  const iso = nowIso()
  const s = coreEnsureState(state)
  return { ...s, quiz: quizAnswer(s.quiz, !!isCorrect, iso) }
}

export function coreQuizStop(state) {
  const iso = nowIso()
  const s = coreEnsureState(state)
  return { ...s, quiz: quizStop(s.quiz, iso) }
}

