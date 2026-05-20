import { sm2InitialState } from './sm2'
import { plannerInitialState } from './planner'
import { quizInitialState } from './quiz'
import { mistakesInitialState } from './mistakes'
import { audioInitialState } from './audio'

export const MEM_STATE_KEY = 'memorisation_state_v2'

export function defaultMemorisationState() {
  return {
    version: 2,
    theme: 'light',
    arabicFont: 'system',
    features: {},
    selectedArabicEdition: 'quran-simple',
    selectedTranslationEdition: 'en.sahih',
    selectedTransliterationEdition: 'en.transliteration',
    selectedAudioEdition: '',
    quranComReciterId: 7,
    toolsOpen: true,
    activeTab: 'beginner',
    selectedSurahId: '',
    ayahRange: { start: 1, end: 1 },
    beginner: { repetitionCount: 3, playbackMode: 'continuous' },
    advanced: {
      recitationSpeed: 1,
      delayTime: 1,
      repetitionCount: 3,
      rangeLoopDelay: 0,
      sessionRepetitions: 1,
      playbackMode: 'continuous'
    },
    audio: audioInitialState(),
    sm2: sm2InitialState(),
    planner: plannerInitialState(),
    quiz: quizInitialState(),
    mistakes: mistakesInitialState(),
    session: {
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

export function loadMemorisationState() {
  try {
    const raw = localStorage.getItem(MEM_STATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 2) return null
    return parsed
  } catch {
    return null
  }
}

export function saveMemorisationState(state) {
  try {
    localStorage.setItem(MEM_STATE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota / privacy mode errors
  }
}
