import axios from 'axios'
import diff from 'fast-diff'
import { markRaw } from 'vue'
import { getEditions, getQuranEdition, getSurahEdition, getSurahEditions } from '../scripts/lib/quranApis'
import { loadMutqinState, saveMutqinState, watchMutqinState, replaceMutqinState } from '../scripts/composables/useMutqinPersistence'
import learningApi, { createDebouncer, withRetry } from '../scripts/api/learning'
import { seedAyahs } from '../scripts/composables/useAyahState'
import { buildSessionQueue, startMutqinSession, moveMutqinSession, completeMutqinSession } from '../scripts/composables/useSessionEngine'
import { createDailyPlan } from '../scripts/composables/useDailyPlanner'
import { hideAyah, completeTakrarStep, getTakrarStep } from '../scripts/composables/useTakrarLadder'
import { scoreRetention } from '../scripts/composables/useRetentionZones'
import { updateAyahProgress } from '../scripts/engine/spaced_repetition_memory'
import { WordSyncEngine } from '../scripts/audioSync'
import HifzPlanCreatorModal from '../components/HifzPlanCreatorModal.vue'
import {
  generateTodaySession,
  HIFZ_PLAN_STORAGE_KEY,
  AYAH_PROGRESS_STORAGE_KEY,
  HIFZ_PLAN_ARCHIVE_STORAGE_KEY,
  HIFZ_APP_STATE_STORAGE_KEY,
  calculatePlanForecast,
  normalizeDailyNewAyahCount,
  getProgressEntries,
  QURAN_TOTALS,
  buildHifzPlannerSessionState,
  createHifzAppState,
  resolvePlanScope
} from '../scripts/engine/hifz_session_engine'
import { buildHifzAnalyticsSnapshot } from '../scripts/engine/hifz_analytics'
import {
  buildRealtimePreviewAlignment,
  buildDeterministicRecitationResult,
  buildQuranAlignment,
  cleanRecitationDisplayText as cleanRecitationDisplayTextEngine,
  createRecognitionState,
  getRecognitionDisplayWords,
  getRecitationWordSimilarity as getRecitationWordSimilarityEngine,
  normalizeArabicForRecitation as normalizeArabicForRecitationEngine,
  stabilizeRecognitionEvent,
  tokenizeRecitationDisplayWords as tokenizeRecitationDisplayWordsEngine,
  tokenizeRecitationWords as tokenizeRecitationWordsEngine,
  wordsToTranscript
} from '../scripts/engine/recitation_analysis'
import {
  DEFAULT_REPLAY_VALIDATION_COUNT,
  buildRecognitionValidationReport,
  buildValidationAggregate
} from '../scripts/engine/recitation_validation'
import {
  MODE_STORAGE_KEYS,
  SESSION_STORAGE_KEYS,
  CENTRAL_SESSION_STORAGE_KEY,
  DEFAULT_ALQURAN_RECITER,
  RECITATION_IDB_NAME,
  RECITATION_IDB_VERSION,
  RECITATION_IDB_STORE,
  RECITATION_HISTORY_IDB_STORE,
  RECITATION_ANALYSIS_VERSION,
  RECITATION_CONFIDENCE_THRESHOLD,
  RECITATION_SILENCE_THROTTLE_MS,
  RECITATION_CHUNK_TIMESLICE_MS,
  RECITATION_TRANSCRIPTION_SETTLE_TIMEOUT_MS,
  RECITATION_TRANSCRIPTION_SETTLE_QUIET_MS,
  SPEECHMATICS_PARTIAL_CONFIDENCE,
  RECITATION_LIVE_INTERIM_CONFIDENCE_THRESHOLD,
  RECITATION_WORD_STATUS_CLASSES,
  tokenizeArabicText,
  splitArabicGraphemes,
  escapeHtml,
  deepClone,
  prepareIndexedDbPayload,
  slugifySessionFilePart,
  parseRecordingDurationSeconds,
  normalizeRecordingResult,
  parseRecordingDate,
  collectRecordingEntries,
  createCentralSessionState,
  createBeginnerState,
  createAdvancedState,
  createPlannerState,
  createRealtimeTranscriptionMeta,
  createTranscriptionAudioBridge,
  createSpeechmaticsRealtimeProvider
} from '../scripts/memorisationRuntime'

const HELP_LEARNING_FALLBACKS = {
  title: 'Help & Learning',
  subtitle: 'Learn how to use Mutqin\'s tools to memorise more effectively.',
  bestFor: 'Best for',
  sections: {
    tajweed: {
      title: 'Tajweed Rules',
      description: 'Tajweed is the set of rules that helps you recite the Quran correctly and beautifully. Mutqin highlights these rules so you can recognise and practise them while memorising.',
      bestFor: 'Students improving pronunciation and recitation quality.'
    },
    srs: {
      title: 'Smart Revision (SRS)',
      description: 'Mutqin automatically reminds you to review verses at the right time so they stay strong in your memory. Difficult verses appear more often, while stronger verses are reviewed less frequently.',
      bestFor: 'Long-term retention and preventing memorisation loss.'
    },
    techniques: {
      title: 'Memorisation Techniques',
      description: 'Choose the method that helps you stay steady, then adjust it as your range becomes more familiar.',
      bestFor: 'Students discovering which learning style works best for them.',
      details: {
        repetition: {
          label: 'Repetition Method',
          text: 'Repeat the same verse multiple times before moving on.'
        },
        linking: {
          label: 'Linking Method',
          text: 'Connect each verse to the next to improve flow and continuity.'
        },
        cumulative: {
          label: 'Cumulative Method',
          text: 'Continuously add new verses while revising previous ones.'
        }
      }
    },
    layouts: {
      title: 'Reading Layouts',
      description: 'Switch between stacked cards and a Mushaf-style page depending on the device and the kind of memorisation you want to do.',
      bestFor: 'Choosing the reading experience that feels most natural to you.',
      details: {
        stacked: {
          label: 'Stacked Layout',
          text: 'Displays each ayah in a clear vertical format that is easier to follow on smaller screens.'
        },
        mushaf: {
          label: 'Mushaf Layout',
          text: 'Displays ayahs in a traditional page-inspired style for students who prefer familiar page memorisation.'
        }
      }
    },
    aiRecitation: {
      title: 'AI Recitation',
      description: 'AI Recitation listens to your recitation and gives instant feedback so you can identify mistakes and improve accuracy while memorising.',
      bestFor: 'Students who want guided practice and immediate feedback.'
    },
    talqinMode: {
      title: 'Talqin Mode Guide',
      description: 'Talqin Mode automates the listen, pause, repeat, and extend cycle after you submit a practice session, so the timing stays consistent without extra manual control.',
      bestFor: 'Students building verse retention through guided listening and repetition.'
    },
    manualAssessment: {
      title: 'Manual Assessment',
      description: 'Manual Assessment lets you evaluate your own memorisation after each session and track confidence over time.',
      bestFor: 'Students who prefer self-reflection and independent revision.'
    }
  }
}

export default {
  name: 'TelawaApp',
  components: {
    HifzPlanCreatorModal
  },
  props: {
    auth: { type: Object, default: () => ({ check: false, id: null }) }
  },
  // [TEMP DIAGNOSTIC] Detect a runaway re-render loop and report the exact
  // reactive property that keeps re-triggering it. Remove once the bug is fixed.
  renderTriggered(event) {
    if (typeof window === 'undefined') return
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now())
    let dbg = window.__renderDbg
    if (!dbg || now - dbg.t > 1000) {
      dbg = window.__renderDbg = { t: now, count: 0, keys: {}, last: '' }
    }
    dbg.count += 1
    const key = String(event && event.key)
    dbg.keys[key] = (dbg.keys[key] || 0) + 1
    dbg.last = `${event && event.type} ${key}`
    if (dbg.count === 60) {
      const ranked = Object.entries(dbg.keys).sort((a, b) => b[1] - a[1]).slice(0, 10)
      console.error('[RENDER LOOP] suspected. Trigger keys (key -> count):', ranked)
      console.error('[RENDER LOOP] last trigger:', dbg.last, event && event.target)
      console.trace('[RENDER LOOP] stack')
      if (typeof window !== 'undefined' && typeof window.__showLoopBanner === 'function') {
        window.__showLoopBanner(
          'RENDER LOOP suspected.\nTop trigger keys (key -> count):\n'
          + ranked.map(([k, c]) => `   ${k}  ->  ${c}`).join('\n')
          + '\nLast trigger: ' + dbg.last
        )
      }
    }
  },
  data() {
    return {  
      quickSurahs: [
        { id: 1, name: 'Al-Fatihah', nameArabic: 'الْفَاتِحَة' },
        { id: 18, name: 'Al-Kahf', nameArabic: 'الْكَهْف' },
        { id: 36, name: 'Ya-Sin', nameArabic: 'يٰس' },
        { id: 55, name: 'Ar-Rahman', nameArabic: 'الرَّحْمَٰن' },
        { id: 56, name: 'Al-Waqiah', nameArabic: 'الْوَاقِعَة' },
        { id: 67, name: 'Al-Mulk', nameArabic: 'الْمُلْك' },
        { id: 73, name: 'Al-Muzzammil', nameArabic: 'الْمُزَّمِّل' },
        { id: 78, name: 'An-Naba', nameArabic: 'النَّبَأ' }
      ],
      dropdownOpen: false,
      continueSessionLabel: '',
      selectedSessionId: null,
      showContinueSession: false,
      showSelectSession: false,
      savedSessions: [], // Make sure this exists
      continueSessionPayload: null, // Make sure this exists
      hasContinueSession: false,
      startingFreshSessionSelection: false,
      returningUserChoicePending: false,
      pendingResumeDefaultTab: '',
      showHifzPlanModal: false,
      hifzPlanExists: false,
      hifzPlan: null,
      hifzAyahProgress: {},
      hifzTodayQueue: [],
      hifzPlannerAnalyticsOpen: false,
      // Hidden Reveal Mode State
      hiddenRevealModeEnabled: false,
      hiddenRevealSession: {
        revealedWordIndexes: new Set(), // Track which words have been revealed
        currentWordIndex: 0,
        lastCorrectWordTime: null,
        errorCount: 0,
        sessionStarted: false
      },
      wordElementsMap: new Map(), // Track DOM elements for each word
      // Luqmah Assistance State
	      luqmahState: {
	        active: false,
	        currentLevel: 0, // 0=none, 1=soft, 2=guided, 3=strong
	        failCount: 0,
	        lastFailTime: null,
	        failWindow: [], // Track recent failures for debouncing
	        hintTimeout: null
	      },
	      activeRecallFeedbackState: {
	        recitation: { issueKey: '', failCount: 0, hint: '' },
	        memorisation: { issueKey: '', failCount: 0, hint: '' }
	      },
	      heatmapTooltip: { visible: false, x: 0, y: 0, data: null },
      analyticsHeatmapData: [],
      heatmapTrends: { improved: [], declined: [] },
      heatmapFocusAreas: [],
      nameError: '',
      nameSuggestions: [
        'Morning Review',
        'Weekly Target',
        'Quick Revision',
        'Deep Memorisation'
      ],
      // Feature 1: Repetitions
      repetitionsPerStep: 5,
      selectedLoopCount: 5,
      fontOpen: false,
      bgOpen: false,
      borderOpen: false,
      mushafToolbarCollapsed: true,
      
      // Feature 2: Gap between verses
      gapBetweenVerses: "1x", // Options: 'none', '1x', '3s', '5s', 'custom'
      customGapSeconds: 2,
      anchorModeEnabled: false,
      anchorCount: 2,
      anchorHighlightObserver: null,
      anchorHighlightFrame: null,
      showCountdownOverlay: false,
      countdownValue: 3,
      countdownInterval: null,
      talqinPauseTimer: null,
      activeWaveIndex: 0,
      showSaveNameModal: false,
      saveSessionName: '',
      appReady: false,
      isBootstrapping: true,
      isDataReady: false,
      fontDropdownOpen: false,
      topCardMenuOpen: false,
      openVerseActionKey: '',
      verseFontSizes: {},
      defaultFontSize: 120,
      fontSizeStep: 10,
      minFontSize: 100,
      maxFontSize: 280,
      tajweedEnabled: false,
      beginner: createBeginnerState(),
      advanced: createAdvancedState(),
      planner: createPlannerState(),
      mutqinState: loadMutqinState(),
      centralSession: createCentralSessionState(),
      unwatchMutqinState: null,
      // Backend-driven learning persistence (authenticated users only). For guests
      // localStorage remains the source of truth; for authenticated users the
      // backend is authoritative and localStorage acts only as an offline cache.
      learningSync: {
        scheduler: null,
        applyingRemote: false,
        lastPushedHash: '',
        pushing: false,
        retryScheduled: false,
        ready: false,
      },
      currentWaveVerseKey: null,
      showKeyboardShortcuts: false,
      // chaining removed

      // Arabic text word highlighting state
      currentWordIndex: -1,
      currentHighlightedVerseKey: null,
      wordTimestampsMap: new Map(),
      wordHighlightHandler: null,
      currentVerseWords: [],
      wordHighlightFrame: null,
      wordHighlightTimestamps: [],
      wordHighlightLoading: false,
      wordHighlightRequestId: 0,
      wordSyncEngine: null,
      currentPhraseIndex: -1,
      lastHighlightedWordNodes: [],
      pendingWordHighlightState: null,
      wordHighlightNodeRegistry: markRaw(new Map()),
      wordClickHandler: null,
      statsTickFrame: null,
      statsTickLastFrameAt: 0,
      liveWordDomPatchFrame: null,
      pendingLiveWordDomPatches: {},
      recitationDisplayHtmlCache: markRaw(new Map()),
      liveWordVerseNodeRegistry: markRaw(new Map()),
      liveWordChipNodeRegistry: markRaw(new Map()),
      recitationCommittedAlignmentSignature: '',
      recitationCommittedAlignmentCache: null,
      aiMemorisationCheckerCommittedAlignmentSignature: '',
      aiMemorisationCheckerCommittedAlignmentCache: null,
      statsTick: Date.now(),
      sessionStartedAt: 0,
      sessionErrorCount: 0,
      advanceLocked: false,
      repeatActionLocked: false,
      playRequestLocked: false,
      mainCardCollapsed: false,
      feedbackCollapsed: true,

      // UI State
      currentMode: 'beginner',
      appState: createHifzAppState(),
      theme: 'light',
      activeLocale: 'en',
      languageOptions: [
        { value: 'en', label: 'English' },
        { value: 'ar', label: 'العربية' },
        { value: 'fr', label: 'Français' },
        { value: 'id', label: 'Bahasa Indonesia' },
        { value: 'tr', label: 'Türkçe' }
      ],
      tab: 'tools',
      showTools: false,
      readingViewMode: 'stacked',
      mushafPageIndex: 0,
      mushafBackground: 'warm',
      mushafBorder: 'classic',
      hoveredMushafVerseKey: '',
      mushafBackgroundOptions: [
        { value: 'warm', label: 'Warm' },
        { value: 'paper', label: 'Paper' },
        { value: 'contrast', label: 'High contrast' },
        { value: 'mist', label: 'Mist' },
        { value: 'night', label: 'Night' }
      ],
      mushafBorderOptions: [
        { value: 'classic', label: 'Classic' },
        { value: 'fine', label: 'Fine' },
        { value: 'layered', label: 'Layered' },
        { value: 'emerald', label: 'Emerald' },
        { value: 'ink', label: 'Ink' }
      ],
      focusModeEnabled: false,
      focusDimPercent: 54,
      blurModeEnabled: false,
      blurIntensity: 10,
      chainingEnabled: false,
      chainingMethod: '',
      chainingRepetitions: 1,
      // Primary guided UX flow: learn -> practice -> recall.
      flowStep: 'learn',
      flowListenPlays: 0,
      showPlannerModal: false,
      showPostLoginOnboarding: false,
      onboardingStepIndex: 0,
      onboardingDemoSnapshot: null,
      onboardingDemoActive: false,
      onboardingManualLaunch: false,
      onboardingPath: 'casual',
      onboardingGoal: 'small',
      showAdvancedAnalytics: false,
      showAdvancedMetricsModal: false,
      showConfirmModal: false,
      showSessionExitModal: false,
      sessionExitAutoSave: true,
      sessionExitSnapshot: null,
      sessionExitPreviewSnapshot: null,
      confirmModal: {
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        tone: 'default',
        action: '',
        data: null
      },
      plannerConfig: {
        surahId: 1,
        totalVersesInSurah: 7,
        versesPerDay: 5,
        minutesPerVerse: 2  // Average time per verse in minutes
      },
      analytics: {
        totalVersesRead: 0,
        totalTimeSpent: 0,
        currentStreak: 0,
        versesMastered: 0,
        totalRepetitions: 0,
        sessionsCompleted: 0,
        weeklyVerses: [0, 0, 0, 0, 0, 0, 0],
        weeklyMinutes: [0, 0, 0, 0, 0, 0, 0]
      },
      playerVisible: false,
      playerCollapsed: true,
      playerMenuOpen: false,
      hasContinueSession: false,
      continueSessionLabel: '',
      continueSessionPayload: null,
      showResumeModal: false,
      showRenameRecordingModal: false,
      renameRecordingId: '',
      renameRecordingName: '',
      renameRecordingError: '',
      lastScrollY: 0,
      scrollFrame: null,
      pendingDeleteId: '',
      verseRequestId: 0,

      // Session State
      activeVerseKey: null,
      isPlaying: false,
      manualOnlyPlayback: false,
      currentTime: 0,
      duration: 0,
      audioElement: null,
      recitationCheckRecording: false,
      recitationCheckPreparing: false,
      recitationCheckError: '',
      recitationCheckMediaRecorder: null,
      recitationCheckMediaStream: null,
      recitationCheckChunks: [],
      recitationCheckStartedAt: 0,
      recitationCheckResult: null,
      recitationCheckPendingTargets: [],
      recitationSessionEvaluationMap: {},
      recitationSessionHighlightMap: {},
      recitationCheckTargetVerseKey: '',
      recitationCheckScope: 'ayah',
      recitationCheckPanelOpen: false,
      recitationLiveWords: [],
      recitationCheckAutoStopArmed: false,
      recitationSpeechRecognition: null,
      recitationSpeechTranscript: '',
      recitationSpeechInterim: '',
      recitationSpeechStableWords: [],
      recitationRecognitionState: createRecognitionState(),
      recitationRawTranscriptStream: [],
      recitationWordBuffer: [],
      recitationAlignmentState: null,
      recitationLiveAlignmentSignature: '',
      recitationLiveUpdateTimer: null,
      recitationTranscriptionProvider: null,
      recitationTranscriptionClosing: false,
      recitationTranscriptionMeta: createRealtimeTranscriptionMeta(),
      recitationTranscriptionAudioBridge: null,
      recitationInputSessionId: '',
      recitationInputAudioHash: '',
      recitationSessionCacheDb: null,
      recitationVadState: {
        audioContext: null,
        analyser: null,
        source: null,
        frame: null,
        silenceStartedAt: 0,
        lastSpeechAt: 0,
        active: false,
        throttled: false
      },
      aiRecitationStrictProgression: true,
      aiRecitationPersistMistakes: false,
      persistentAiRecitationReviews: {},
      aiRecallModeEnabled: false,
      recallRevealCurrentIndex: -1,
      selfCheckSavedAttemptsVisible: false,
      selfCheckSavedAttemptsFilter: 'all',
      themeObserver: null,

      // Reading options
      script: 'uthmani',
      quranFont: 'uthmanic',
      fontPickerOpen: false,
      quranFontOptionDefs: [
        { value: 'uthmanic', icon: 'bi-book' },
        { value: 'amiri', icon: 'bi-type' },
        { value: 'naskh', icon: 'bi-text-paragraph' },
        { value: 'scheherazade', icon: 'bi-fonts' },
        { value: 'lateef', icon: 'bi-pencil' }
      ],
      showTranslation: true,
      showTransliteration: false,
      showWordByWord: false,
      wordByWordAudioEnabled: true,
      fontScale: 1,
      uiScale: 1,
      enScale: 1,

      // Audio playback settings
      settingsDraft: {
        tajweedEnabled: false,
        showTranslation: true,
        showTransliteration: false,
        showWordByWord: false,
        wordByWordAudioEnabled: true,
        defaultFontSize: 120
      },

      // Quiz state
      quizActive: false,
      quizScore: 0,
      quizMistakes: [],
      quizComplete: false,
      quizQueue: [],
      quizIndex: 0,
      quizCard: null,
      quizOptions: [],
      quizAnswer: '',
      quizRevealed: false,
      studyMode: 'recite',
      quizType: 'mixed',
      quizFocus: 'adaptive',
      quizLength: 6,

      // Data
      chapters: [],
      currentChapter: null,
      offlineSurahs: [],
      reciters: [{ id: 7, name: 'Alafasy' }],
      savedSessions: [],
      selectedStatsSessionId: '',
      exportSessionState: {
        activeSessionId: '',
        activeFormat: '',
        successSessionId: '',
        successFormat: '',
        errorSessionId: '',
        errorFormat: '',
        errorMessage: ''
      },
      loadingSessionId: '',
      showPlannerCompletionModal: false,
      showPlannerCompletionConfetti: false,
      plannerCompletionSnapshot: null,
      showSessionQuizConfetti: false,
      showSessionEndedModal: false,
      sessionEndedSnapshot: null,
      sessionEndedMetaCollapsed: {},
      showSessionAnalyticsModal: false,
      showHelpLearningModal: false,
      helpLearningActiveKey: 'tajweed',
      analyticsModalLoaded: false,
      analyticsModalRecordId: '',
      analyticsModalData: null,
      analyticsModalLastRefreshedAt: 0,
      analyticsReportState: {
        loading: false,
        success: false,
        error: ''
      },
      selectedSessionId: '',
      sessionName: '',
      showRecordingsLibrary: false,
      isRecordingsLibraryLoading: false,
      recordingsLibrary: [],
      recordingsLibrarySearch: '',
      selectedRecordingsAyahKey: '',
      recordingsNavExpanded: true,
      recordingValidationAuditState: {},
      pendingRecordingDeleteId: '',
      activeRecordingPlaybackId: '',
      recordingsAudioElement: null,
      recordingsAudioBound: false,
      showSelfCheckModal: false,
      selfCheckVerseRef: null,
      selfCheckVerseKey: '',
      selfCheckFontSize: 420,
      selfCheckTajweedEnabled: false,
      selfCheckBlurEnabled: false,
      selfCheckPeekActive: false,
      selfCheckModeChoiceVisible: false,
      selfCheckPreparing: false,
      selfCheckPreparingLabel: '',
      isSelfCheckRecording: false,
      selfCheckPermissionState: 'idle',
      selfCheckError: '',
      selfCheckMediaRecorder: null,
      selfCheckMediaStream: null,
      selfCheckChunks: [],
      selfCheckStartedAt: 0,
      selfCheckDraft: null,
      selfCheckDiscardOnStop: false,
      activeSelfCheckPreviewKey: '',
      activeSelfCheckAyahPlaybackKey: '',
      selfCheckLastSavedAyahKey: '',
      recordingsLibraryReturnToSelfCheckKey: '',
      showAiMemorisationCheckerModal: false,
      aiMemorisationCheckerVerseRef: null,
      aiMemorisationCheckerVerseKey: '',
      aiMemorisationCheckerScope: 'ayah',
      aiMemorisationCheckerTargetVerses: [],
      aiMemorisationCheckerMode: 'ayah',
      aiMemorisationCheckerTajweedEnabled: false,
      aiMemorisationCheckerBlurEnabled: false,
      aiMemorisationCheckerPeekActive: false,
      aiMemorisationCheckerRecording: false,
      aiMemorisationCheckerPreparing: false,
      aiMemorisationCheckerError: '',
      aiMemorisationCheckerSavedNotice: false,
      aiMemorisationCheckerDiscardOnStop: false,
      aiMemorisationCheckerMediaRecorder: null,
      aiMemorisationCheckerMediaStream: null,
      aiMemorisationCheckerChunks: [],
      aiMemorisationCheckerStartedAt: 0,
      aiMemorisationCheckerResult: null,
      aiMemorisationCheckerLiveWords: [],
      aiMemorisationCheckerEvaluationMap: {},
      aiMemorisationCheckerHighlightMap: {},
      aiMemorisationCheckerHiddenIndexes: [],
      aiMemorisationCheckerSpeechRecognition: null,
      aiMemorisationCheckerSpeechTranscript: '',
      aiMemorisationCheckerSpeechInterim: '',
      aiMemorisationCheckerStableWords: [],
      aiMemorisationCheckerRecognitionState: createRecognitionState(),
      aiMemorisationCheckerRawTranscriptStream: [],
      aiMemorisationCheckerWordBuffer: [],
      aiMemorisationCheckerAlignmentState: null,
      aiMemorisationCheckerLiveAlignmentSignature: '',
      aiMemorisationCheckerTranscriptionProvider: null,
      aiMemorisationCheckerTranscriptionClosing: false,
      aiMemorisationCheckerTranscriptionMeta: createRealtimeTranscriptionMeta(),
      aiMemorisationCheckerTranscriptionAudioBridge: null,
      aiMemorisationCheckerLiveTranscript: '',
      aiMemorisationCheckerLiveChunkInFlight: false,
      aiMemorisationCheckerLiveChunkQueue: [],
      aiMemorisationCheckerLiveUpdateTimer: null,
      aiMemorisationCheckerHistory: [],

      // Analytics
      sm2: {},
      events: [],
      plannerState: null,
      todayPlan: null,
      planRun: null,
      metrics: null,
      weakVersesList: [],
      // Simple stats
      simpleStats: {
        streak: 0,
        sessions: 0,
        memorised: 0,
        weak: 0
      },
      dailyPlan: {
        newVerses: 5,
        reviewVerses: 10,
        minutes: 20
      },
      todayPlanSummary: null,

      // UI Helpers
      banner: null,
      bannerTimer: null,
      networkOnline: true,
      restoredAudioState: null,
      loadVersesTimer: null,
      workspaceSyncTimer: null,
      handleMushafToolbarDocumentClick: null,
      playbackAdvanceTimer: null,
      toolsReturnFocusEl: null,
      segmentPlaybackTimer: null,
      segmentEndTime: 0,
      segmentPlaybackKind: '',
      touchStartX: 0,
      touchStartY: 0,
      hoverPeekVerseKey: null,
      touchPeekVerseKey: null,
      longPressPeekTimer: null,
      longPressPeekTriggered: false,
      blurPeekHoldingSpace: false,
      suppressNextVerseClick: false,

      // Word sequence
      wordSequence: null,
      playbackStartedAt: 0,
      currentVersePlaybackKey: '',
      currentPlaybackMode: 'verse',
      activeWordAudio: '',
      activeWordTooltip: null,
      compactMode: false,
      bookmarks: [],
      pins: [],

      // Options
      speedOptions: [0.5, 1, 1.25, 1.5, 2],
      delayOptions: [0, 0.5, 1, 2, 3, 5, 7, 10],
      recitationWindowOptions: [5, 8, 10, 12, 15, 20, 30],
      rangeLoopDelay: 1,
      recitationWindowActive: false,
      recitationWindowRemaining: 0,
      recitationWindowTimer: null,

      // Section open state - Expanded for consistency
      sectionOpen: {
        beginner_setup: true,
        beginner_audio: true,
        beginner_saved: false,
        advanced_setup: true,
        advanced_playback: false,
        advanced_practice: false,
        advanced_saved: false,
        session_tools: false,
        live_stats: false,
        analytics_overview: true,
        analytics_planner: true,
        analytics_weak: false,
        memorisation_techniques: false,
        saved_sessions: false,
        focus_mode: false,
        blur_mode: false,
        chaining: false,
        talqin_mode: false,
        anchor_mode: false,
        quiz_lab: false,
        presets: true,
        repetitions: false,
        gap_between: false,
      },

      // Audio event handlers
      audioTimeUpdate: null,
      audioEnded: null,
      audioError: null,
      audioPlaying: null,
      audioRateChange: null,
      audioLoadStart: null,
      lastAudioDebug: null,
      uiAudioContext: null,

      // AlQuran
      alquranAudioEditions: [],
      alquranEdition: '',
      showQuranSearchModal: false,
      quranSearchQuery: '',
      quranSearchLoading: false,
      quranSearchHasRun: false,
      quranSearchError: '',
      quranSearchIndex: [],
      quranSearchResults: [],
      quranSearchFilterType: 'all',
      quranSearchFilterValue: '',
      quranSearchShowTranslation: true,
      quranSearchFontSize: 34,
      quranSearchRecognition: null,
      quranSearchVoiceActive: false,

      // Misc
      currentVerseIndex: 0,
      isAudioLoading: false,
      sessionCompleted: false,
      sessionCompletedAt: null,
      hybridPendingKey: null,
      quizSkill: 'recite_text',
      quizSessionStats: null,
      quizLastResult: null,
      quizSummaryActive: false,
      verseRequestId: 0,
      verseDataCache: {},
      verseScrollMemory: {}
    }
  },

  computed: {
    rangeFilterOptions() {
      return [
        { value: 'all', label: this.t('memorisation.rangeOptions.all') },
        { value: 'juz', label: this.t('memorisation.rangeOptions.juz') },
        { value: 'hizb', label: this.t('memorisation.rangeOptions.hizb') },
        { value: 'page', label: this.t('memorisation.rangeOptions.page') },
        { value: 'surah', label: this.t('memorisation.rangeOptions.surah') },
        { value: 'ayah', label: this.t('memorisation.rangeOptions.ayah') },
        { value: 'word', label: this.t('memorisation.rangeOptions.word') }
      ]
    },
    quranSearchFilterOptions() {
      return this.rangeFilterOptions
    },
    helpLearningUi() {
      return {
        title: this.translateOrFallback('memorisation.helpLearning.title', HELP_LEARNING_FALLBACKS.title),
        subtitle: this.translateOrFallback('memorisation.helpLearning.subtitle', HELP_LEARNING_FALLBACKS.subtitle),
        bestFor: this.translateOrFallback('memorisation.helpLearning.bestFor', HELP_LEARNING_FALLBACKS.bestFor)
      }
    },
    helpLearningSections() {
      return [
        {
          key: 'tajweed',
          icon: 'bi-book-half',
          title: this.translateOrFallback('memorisation.helpLearning.sections.tajweed.title', HELP_LEARNING_FALLBACKS.sections.tajweed.title),
          description: this.translateOrFallback('memorisation.helpLearning.sections.tajweed.description', HELP_LEARNING_FALLBACKS.sections.tajweed.description),
          bestFor: this.translateOrFallback('memorisation.helpLearning.sections.tajweed.bestFor', HELP_LEARNING_FALLBACKS.sections.tajweed.bestFor)
        },
        {
          key: 'srs',
          icon: 'bi-arrow-repeat',
          title: this.translateOrFallback('memorisation.helpLearning.sections.srs.title', HELP_LEARNING_FALLBACKS.sections.srs.title),
          description: this.translateOrFallback('memorisation.helpLearning.sections.srs.description', HELP_LEARNING_FALLBACKS.sections.srs.description),
          bestFor: this.translateOrFallback('memorisation.helpLearning.sections.srs.bestFor', HELP_LEARNING_FALLBACKS.sections.srs.bestFor)
        },
        {
          key: 'techniques',
          icon: 'bi-lightbulb',
          title: this.translateOrFallback('memorisation.helpLearning.sections.techniques.title', HELP_LEARNING_FALLBACKS.sections.techniques.title),
          description: this.translateOrFallback('memorisation.helpLearning.sections.techniques.description', HELP_LEARNING_FALLBACKS.sections.techniques.description),
          bestFor: this.translateOrFallback('memorisation.helpLearning.sections.techniques.bestFor', HELP_LEARNING_FALLBACKS.sections.techniques.bestFor),
          details: [
            {
              label: this.translateOrFallback('memorisation.helpLearning.sections.techniques.details.repetition.label', HELP_LEARNING_FALLBACKS.sections.techniques.details.repetition.label),
              text: this.translateOrFallback('memorisation.helpLearning.sections.techniques.details.repetition.text', HELP_LEARNING_FALLBACKS.sections.techniques.details.repetition.text)
            },
            {
              label: this.translateOrFallback('memorisation.helpLearning.sections.techniques.details.linking.label', HELP_LEARNING_FALLBACKS.sections.techniques.details.linking.label),
              text: this.translateOrFallback('memorisation.helpLearning.sections.techniques.details.linking.text', HELP_LEARNING_FALLBACKS.sections.techniques.details.linking.text)
            },
            {
              label: this.translateOrFallback('memorisation.helpLearning.sections.techniques.details.cumulative.label', HELP_LEARNING_FALLBACKS.sections.techniques.details.cumulative.label),
              text: this.translateOrFallback('memorisation.helpLearning.sections.techniques.details.cumulative.text', HELP_LEARNING_FALLBACKS.sections.techniques.details.cumulative.text)
            }
          ]
        },
        {
          key: 'layouts',
          icon: 'bi-columns-gap',
          title: this.translateOrFallback('memorisation.helpLearning.sections.layouts.title', HELP_LEARNING_FALLBACKS.sections.layouts.title),
          description: this.translateOrFallback('memorisation.helpLearning.sections.layouts.description', HELP_LEARNING_FALLBACKS.sections.layouts.description),
          bestFor: this.translateOrFallback('memorisation.helpLearning.sections.layouts.bestFor', HELP_LEARNING_FALLBACKS.sections.layouts.bestFor),
          details: [
            {
              label: this.translateOrFallback('memorisation.helpLearning.sections.layouts.details.stacked.label', HELP_LEARNING_FALLBACKS.sections.layouts.details.stacked.label),
              text: this.translateOrFallback('memorisation.helpLearning.sections.layouts.details.stacked.text', HELP_LEARNING_FALLBACKS.sections.layouts.details.stacked.text)
            },
            {
              label: this.translateOrFallback('memorisation.helpLearning.sections.layouts.details.mushaf.label', HELP_LEARNING_FALLBACKS.sections.layouts.details.mushaf.label),
              text: this.translateOrFallback('memorisation.helpLearning.sections.layouts.details.mushaf.text', HELP_LEARNING_FALLBACKS.sections.layouts.details.mushaf.text)
            }
          ]
        },
        {
          key: 'ai-recitation',
          icon: 'bi-mic',
          title: this.translateOrFallback('memorisation.helpLearning.sections.aiRecitation.title', HELP_LEARNING_FALLBACKS.sections.aiRecitation.title),
          description: this.translateOrFallback('memorisation.helpLearning.sections.aiRecitation.description', HELP_LEARNING_FALLBACKS.sections.aiRecitation.description),
          bestFor: this.translateOrFallback('memorisation.helpLearning.sections.aiRecitation.bestFor', HELP_LEARNING_FALLBACKS.sections.aiRecitation.bestFor)
        },
        {
          key: 'talqin-mode',
          icon: 'bi-soundwave',
          title: this.translateOrFallback('memorisation.helpLearning.sections.talqinMode.title', HELP_LEARNING_FALLBACKS.sections.talqinMode.title),
          description: this.translateOrFallback('memorisation.helpLearning.sections.talqinMode.description', HELP_LEARNING_FALLBACKS.sections.talqinMode.description),
          bestFor: this.translateOrFallback('memorisation.helpLearning.sections.talqinMode.bestFor', HELP_LEARNING_FALLBACKS.sections.talqinMode.bestFor)
        },
        {
          key: 'manual-assessment',
          icon: 'bi-check2-square',
          title: this.translateOrFallback('memorisation.helpLearning.sections.manualAssessment.title', HELP_LEARNING_FALLBACKS.sections.manualAssessment.title),
          description: this.translateOrFallback('memorisation.helpLearning.sections.manualAssessment.description', HELP_LEARNING_FALLBACKS.sections.manualAssessment.description),
          bestFor: this.translateOrFallback('memorisation.helpLearning.sections.manualAssessment.bestFor', HELP_LEARNING_FALLBACKS.sections.manualAssessment.bestFor)
        }
      ]
    },
    activeHelpLearningSection() {
      return this.helpLearningSections.find(section => section.key === this.helpLearningActiveKey)
        || this.helpLearningSections[0]
        || null
    },
    shouldShowWorkspaceEmptyState() {
      return !this.hasVerses && !this.isLoggedIn
    },
    shouldShowOffcanvasTabs() {
      return true
    },
    showHifzPlannerUi() {
      return false
    },
    showAiMemorisationButton() {
      return false
    },
    buildLiveRecitationReviewResult(kind = 'recitation') {
      const liveWords = kind === 'memorisation' ? this.aiMemorisationCheckerLiveWords : this.recitationLiveWords
      const wordStatuses = (Array.isArray(liveWords) ? liveWords : []).map(word => ({ ...word }))
      const startedAt = kind === 'memorisation' ? this.aiMemorisationCheckerStartedAt : this.recitationCheckStartedAt
      const endedAt = Date.now()
      return {
        wordStatuses,
        startedAt,
        endedAt,
        durationSeconds: this.getRecitationElapsedSeconds({ startedAt, endedAt }),
        speedReview: this.getRecitationSpeedReview({ wordStatuses, startedAt, endedAt })
      }
    },
    sessionEndedActionCards() {
      return [
        {
          key: 'review-insights',
          label: this.t('memorisation.sessionEnd.reviewInsights'),
          description: this.t('memorisation.sessionEnd.reviewInsightsDesc'),
          icon: 'bi-bar-chart-line',
          tone: 'default'
        },
        {
          key: 'save-session',
          label: this.t('memorisation.sessionEnd.saveSession'),
          description: this.t('memorisation.sessionEnd.saveSessionDesc'),
          icon: 'bi-download',
          tone: 'default'
        },
        {
          key: 'reset-range',
          label: this.t('memorisation.sessionEnd.resetRange'),
          description: this.t('memorisation.sessionEnd.resetRangeDesc'),
          icon: 'bi-arrow-repeat',
          tone: 'default'
        },
        {
          key: 'create-session',
          label: this.t('memorisation.sessionEnd.createSession'),
          description: this.t('memorisation.sessionEnd.createSessionDesc'),
          icon: 'bi-plus-circle',
          tone: 'accent'
        }
      ]
    },
    sortedSavedSessions() {
      return [...this.savedSessions].sort((a, b) => {
        return new Date(b.savedAt) - new Date(a.savedAt);
      });
    },
    isSessionFullyCompleted() {
    // Check if all verses in the range have been completed
    return this.currentPosition >= this.totalVerses && 
        this.progressPercent >= 100 &&
        this.queueIndex >= this.queue.length - 1;
    },
    quranSearchWordCount() {
      return this.normalizeQuranSearchText(this.quranSearchQuery)
        .split(/\s+/)
        .filter(Boolean).length
    },
    supportsQuranVoiceSearch() {
      if (typeof window === 'undefined') return false
      return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    },
    quranSearchFilterLabel() {
      const labels = {
        juz: this.t('memorisation.search.juzNumber'),
        hizb: this.t('memorisation.search.hizbNumber'),
        page: this.t('memorisation.search.pageNumber'),
        surah: this.t('memorisation.search.surah'),
        ayah: this.t('memorisation.search.ayahNumber'),
        word: this.t('memorisation.search.wordPosition')
      }
      return labels[this.quranSearchFilterType] || this.t('memorisation.common.filterValue')
    },
    quranSearchFilterPlaceholder() {
      const placeholders = {
        juz: '1-30',
        hizb: '1-60',
        page: '1-604',
        ayah: this.t('memorisation.search.ayahNumber'),
        word: this.t('memorisation.search.wordNumber')
      }
      return placeholders[this.quranSearchFilterType] || ''
    },
    quranSearchFilterMax() {
      const max = {
        juz: 30,
        hizb: 60,
        page: 604,
        ayah: 286,
        word: 80
      }
      return max[this.quranSearchFilterType] || 604
    },
    filteredQuranSearchResults() {
      const type = this.quranSearchFilterType
      const rawValue = this.quranSearchFilterValue
      if (type === 'all' || rawValue === '' || rawValue === null || rawValue === undefined) {
        return this.quranSearchResults
      }
      const value = Number(rawValue)
      if (!Number.isFinite(value) || value <= 0) return this.quranSearchResults
      return this.quranSearchResults.filter(result => {
        if (type === 'juz') return Number(result.juz) === value
        if (type === 'hizb') return Number(result.hizb) === value
        if (type === 'page') return Number(result.page) === value
        if (type === 'surah') return Number(result.surah) === value
        if (type === 'ayah') return Number(result.ayah) === value
        if (type === 'word') return Number(result.firstWordIndex || 0) === value
        return true
      })
    },
    quranSearchFilterSummary() {
      if (this.quranSearchFilterType === 'all' || !this.quranSearchFilterValue) return this.t('memorisation.common.fullQuran')
      const option = this.quranSearchFilterOptions.find(item => item.value === this.quranSearchFilterType)
      return `${option?.label || this.t('common.filter')} ${this.quranSearchFilterValue}`
    },
    actualGapDelay() {
      if (this.gapBetweenVerses === "none") return 0;
      if (this.gapBetweenVerses === "3s") return 3;
      if (this.gapBetweenVerses === "5s") return 5;
      if (this.gapBetweenVerses === "custom") return this.customGapSeconds;
      return "dynamic"; // For '1x' - duration based on verse length
    },
    isValidSessionName() {
      return this.saveSessionName && this.saveSessionName.trim().length > 0 && this.saveSessionName.trim().length <= 50
    },

    anchorModeDescription() {
      if (!this.anchorModeEnabled) return this.t('memorisation.techniques.anchorOffDescription')
      const anchors = {
        1: this.t('memorisation.techniques.anchorFirstLast'),
        2: this.t('memorisation.techniques.anchorKeyPairs'),
        3: this.t('memorisation.techniques.anchorComplete')
      }
      return this.t('memorisation.techniques.anchorUsingDescription', { anchors: anchors[this.anchorCount] || anchors[2] })
    },
    getChainingMethodLabel() {
      return this.chainingMethodLabel
    },
    getChainingMethodDescription() {
      return this.chainingMethodDescription
    },
    getChainingMethodPreview() {
      return this.chainingMethodPreview
    },
    liveSessionStats() {
      const currentIndex = Math.max(0, Number(this.queueIndex || 0))
      const completedEntries = (this.queue || []).slice(0, currentIndex)
      const completedAyahs = new Set(
        completedEntries.map(item => item?.verse?.key || item?.key).filter(Boolean)
      ).size
      const elapsedMs = this.sessionStartedAt
        ? Math.max(0, Number(this.statsTick || Date.now()) - Number(this.sessionStartedAt))
        : 0
      const totalAttempts = completedAyahs + Number(this.sessionErrorCount || 0)
      const successRate = totalAttempts > 0
        ? Math.round((completedAyahs / totalAttempts) * 100)
        : 100

      return {
        ayahs_completed: completedAyahs,
        current_ayah_index: this.currentPosition,
        error_count: Number(this.sessionErrorCount || 0),
        session_time: this.formatTime(elapsedMs / 1000),
        success_rate: `${successRate}%`
      }
    },
    // In computed section - modify controlsAnalyticsCards to show/hide based on data
    controlsAnalyticsCards() {
      const hasData = this.savedSessions.length > 0 || this.totalVersePlayCountValue > 0 || this.totalVerses > 0
      if (!hasData) return []
      const covered = Math.max(0, this.currentPosition - 1)
      const total = this.totalVerses || 0
      return [
        {
          key: 'today',
          icon: 'bi-calendar2-check',
          label: this.t('memorisation.analytics.todayProgress'),
          value: `${this.progressPercent}%`,
          description: this.t('memorisation.analytics.todayProgressDesc', { covered, total })
        },
        {
          key: 'streak',
          icon: 'bi-fire',
          label: this.t('memorisation.analytics.streak'),
          value: this.analytics?.currentStreak || 0,
          description: this.t('memorisation.analytics.streakDesc')
        }
      ]
    },
    dueCount() {
      // "Due" is surfaced only as a count; scheduling/intervals remain invisible.
      const stats = this.mutqinState?.stats || {}
      const count = Number(stats.overdue_reviews || 0)
      return Number.isFinite(count) && count > 0 ? count : 0
    },
    flowCtaLabel() {
      if (!this.hasVerses) return this.t('memorisation.guided.start')
      if (this.guidedUiStep === 'review') return this.t('memorisation.guided.review')
      return this.t('memorisation.guided.play')
    },
    flowHint() {
      if (!this.hasVerses) return this.t('memorisation.guided.chooseSurahHint')
      if (this.guidedUiStep === 'review') {
        return this.dueCount
          ? this.t('memorisation.guided.versesToReview', { count: this.dueCount })
          : this.t('memorisation.guided.reviewDueHint')
      }
      return this.t('memorisation.guided.playActiveHint')
    },
    setupSummary() {
      const repeatCount = Math.max(1, Number(this.repetitionsPerStep || 1))
      const chaining = this.chainingEnabled
        ? this.t('memorisation.common.chainingLabel', { method: this.chainingMethod })
        : this.t('memorisation.common.plainSequence')
      return this.t('memorisation.common.setupSummary', { count: repeatCount, mode: this.playModeSummaryLabel, chaining })
    },
    playModeSummaryLabel() {
      if (this.playMode === 'manual') return this.t('memorisation.common.manualAdvance')
      if (this.playMode === 'follow') return this.t('memorisation.common.reciterFollowAdvance')
      return this.t('memorisation.common.autoAdvance')
    },
    activePracticeTechniques() {
      const items = []
      if (this.focusModeEnabled) {
        items.push({
          key: 'focus',
          icon: 'bi bi-bullseye',
          label: this.t('memorisation.focus_mode'),
          description: this.t('memorisation.techniques.focusActiveDescription')
        })
      }
      if (this.blurModeEnabled) {
        items.push({
          key: 'blur',
          icon: 'bi bi-cloud-haze2',
          label: this.t('memorisation.blur_mode'),
          description: this.t('memorisation.techniques.blurActiveDescription', { px: this.blurIntensity })
        })
      }
      if (this.chainingEnabled) {
        items.push({
          key: 'chaining',
          icon: 'bi bi-link-45deg',
          label: this.chainingMethod === 'cumulative'
            ? this.t('memorisation.techniques.cumulativeChaining')
            : this.t('memorisation.techniques.linkingChaining'),
          description: this.t('memorisation.techniques.chainingActiveDescription', { count: this.chainingRepetitions })
        })
      }
      if (this.anchorModeEnabled) {
        items.push({
          key: 'anchor',
          icon: 'bi bi-pin-angle-fill',
          label: this.t('memorisation.anchor_mode'),
          description: this.anchorModeDescription
        })
      }
      return items
    },
    hifzJourneyDailyTarget() {
      const dailyNewAyahs = this.hifzPlan?.goalSettings?.dailyNewAyahs || {}
      const label = dailyNewAyahs.label || ''
      if (label) return label
      const min = Number(dailyNewAyahs.min)
      const max = Number(dailyNewAyahs.max)
      if (Number.isFinite(min) && Number.isFinite(max)) return `${min}-${max} ayahs/day`
      if (Number.isFinite(max)) return `${max} ayahs/day`
      return 'Set your target'
    },
    hifzJourneyLearningStyle() {
      const labels = {
        light: 'Light',
        balanced: 'Balanced',
        intensive: 'Intensive'
      }
      return labels[this.hifzPlan?.learningStyle] || 'Balanced'
    },
    hifzJourneyMode() {
      const labels = {
        newPriority: 'New first',
        revisionPriority: 'Review first',
        mixed: 'Mixed',
        weakAyahFocus: 'Strengthen weak ayahs'
      }
      return labels[this.hifzPlan?.focusMode] || 'Mixed'
    },
    hifzJourneyFeatureIcons() {
      const features = []
      const ai = this.hifzPlan?.aiEvaluation || {}
      const retention = this.hifzPlan?.spacedRetention || {}
      if (ai.recitationChecker) features.push({ key: 'recitation', icon: 'bi-soundwave', label: 'Gentle recitation feedback' })
      if (ai.memorisationChecker) features.push({ key: 'memory', icon: 'bi-gem', label: 'Recall feedback' })
      if (retention.enabled !== false) features.push({ key: 'review', icon: 'bi-calendar-check', label: 'Review reminders' })
      if (ai.precisionMode) features.push({ key: 'precision', icon: 'bi-shield-check', label: 'Careful checking' })
      if (this.blurModeEnabled) features.push({ key: 'blur', icon: 'bi-cloud-haze2', label: 'Recall view' })
      if (this.chainingEnabled) features.push({ key: 'chain', icon: 'bi-link-45deg', label: 'Ayah linking' })
      if (this.anchorModeEnabled) features.push({ key: 'anchor', icon: 'bi-pin-angle-fill', label: 'Memory anchors' })
      if (!features.length) features.push({ key: 'standard', icon: 'bi-stars', label: 'Standard support' })
      return features.slice(0, 7)
    },
    hifzLastSilentEvaluation() {
      return this.mutqinState?.sessionState?.lastSilentEvaluation || null
    },
    hifzRecitationFeedback() {
      return this.hifzLastSilentEvaluation?.recitation?.feedback || 'Recite calmly when ready.'
    },
    hifzMemoryStrengthTone() {
      const strength = this.hifzLastSilentEvaluation?.memorisation?.strength || ''
      if (strength === 'strong') return 'strong'
      if (strength === 'steady') return 'steady'
      if (strength === 'needsPractice') return 'review'
      return 'idle'
    },
    hifzMemoryStrengthLabel() {
      const labels = {
        strong: 'Strong memory',
        steady: 'Steady memory',
        needsPractice: 'Needs gentle review'
      }
      return labels[this.hifzLastSilentEvaluation?.memorisation?.strength] || 'Recall check ready'
    },
    hifzAnalyticsSnapshot() {
      return buildHifzAnalyticsSnapshot({
        hifzPlan: this.hifzPlan,
        ayahProgress: this.hifzAyahProgress,
        todayQueue: this.hifzTodayQueue,
        savedSessions: this.savedSessions,
        recordingsLibrary: this.recordingsLibrary,
        mutqinState: this.mutqinState,
        analytics: this.analytics,
        currentSession: {
          currentPosition: this.currentPosition,
          queueIndex: this.queueIndex,
          totalVerses: this.totalVerses,
          completedAyahs: Math.max(0, Number(this.currentPosition || 0) - 1)
        }
      })
    },
    simpleAnalyticsCards() {
      const simple = this.hifzAnalyticsSnapshot.simple || {}
      return [
        { key: 'today', icon: 'bi-calendar2-check', ...simple.todayProgress },
        { key: 'memory', icon: 'bi-gem', ...simple.memoryStrength },
        { key: 'streak', icon: 'bi-fire', ...simple.streak },
        { key: 'completed', icon: 'bi-check2-circle', ...simple.completedAyahs }
      ]
    },
    detailedAnalyticsSections() {
      const detailed = this.hifzAnalyticsSnapshot.detailed || {}
      const memory = detailed.memoryBreakdown || {}
      const spaced = detailed.spacedHealth || {}
      const recitation = detailed.recitationQuality || {}
      const load = spaced.reviewLoad || 'light'
      return [
        {
          key: 'memory',
          title: this.t('memorisation.analytics.memoryBreakdown'),
          icon: 'bi-grid-3x3-gap',
          rows: [
            { label: this.t('memorisation.analytics.rowNew'), value: memory.new || 0, detail: this.t('memorisation.analytics.rowQueuedToday') },
            { label: this.t('memorisation.analytics.rowDue'), value: memory.due || 0, detail: this.t('memorisation.analytics.rowReviewNow') },
            { label: this.t('memorisation.analytics.rowWeak'), value: memory.weak || 0, detail: this.t('memorisation.analytics.rowNeedsCare') },
            { label: this.t('memorisation.analytics.rowMastered'), value: memory.mastered || 0, detail: this.t('memorisation.analytics.rowSteadyAyahs') }
          ]
        },
        {
          key: 'spaced',
          title: this.t('memorisation.analytics.spacedHealth'),
          icon: 'bi-calendar-heart',
          rows: [
            { label: this.t('memorisation.analytics.rowDueNow'), value: spaced.dueNow || 0, detail: this.t('memorisation.analytics.rowReviews') },
            { label: this.t('memorisation.analytics.rowUpcoming'), value: spaced.upcoming || 0, detail: this.t('memorisation.analytics.rowScheduled') },
            { label: this.t('memorisation.analytics.rowAvgRetention'), value: `${Math.round((spaced.averageMastery || 0) * 100)}%`, detail: this.t('memorisation.analytics.rowLoad', { load }) }
          ]
        },
        {
          key: 'recitation',
          title: this.t('memorisation.analytics.recitationQuality'),
          icon: 'bi-soundwave',
          rows: [
            { label: this.t('memorisation.analytics.rowAvgQuality'), value: recitation.label || this.t('memorisation.analytics.rowReady'), detail: recitation.summary || '' },
            { label: this.t('memorisation.analytics.rowChecks'), value: recitation.checksCompleted || 0, detail: this.t('memorisation.analytics.rowCompleted') }
          ]
        }
      ].map(section => ({
        ...section,
        rows: section.rows?.length ? section.rows : [{
          label: this.t('memorisation.analytics.noDataYet'),
          value: '-',
          detail: this.t('memorisation.analytics.noDataDetail')
        }]
      }))
    },
    hifzInsightSummaries() {
      return this.hifzAnalyticsSnapshot.insights || [this.t('memorisation.analytics.defaultInsight')]
    },
    isPlannerModeActive() {
      return this.appState?.mode === 'planner' || this.currentMode === 'planner'
    },
    plannerSessionState() {
      return buildHifzPlannerSessionState({
        plan: this.hifzPlan,
        progress: this.hifzAyahProgress,
        appState: this.appState,
        todaySession: this.hifzTodayQueue
      })
    },
    plannerWorkspaceReady() {
      return this.currentMode === 'planner' && this.hasVerses && Array.isArray(this.queue) && this.queue.length > 0
    },
    plannerGuidanceTitle() {
      return this.plannerSessionState.nextAction || 'Today: Memorise your ayahs'
    },
    plannerGuidanceWhy() {
      return this.plannerSessionState.why || 'We will guide today’s session step by step.'
    },
    plannerMemoryReviewLine() {
      return this.plannerSessionState.retentionLabel || 'Retention system active'
    },
    plannerConfidenceLine() {
      return `${this.plannerSessionState.memoryConfidence || 'Low'} confidence`
    },
    plannerNextReviewHumanLabel() {
      return this.toFriendlyReviewLabel(this.plannerSessionState.nextReviewLabel)
    },
    plannerTopCardSummary() {
      return `${this.plannerActiveGuidance.title} ${this.plannerActiveGuidance.body}`.trim()
    },
    plannerProgressLine() {
      if (!this.plannerSessionState.todaySession?.length) return 'No ayahs scheduled yet'
      const total = this.plannerSessionState.todaySession.length
      const current = this.hasVerses ? Math.min(total, Math.max(1, this.currentPosition || 1)) : 0
      return `${current}/${total} ayahs`
    },
    plannerPrimaryActionLabel() {
      if (!this.hifzPlanExists) return this.t('hifzPlan.wizard.createPlan')
      if (this.isPlaying) return this.t('memorisation.sessionType.pause')
      if (this.hasSessionStarted) return this.t('common.continue')
      return this.t('common.startSession')
    },
    plannerGuidanceBadge() {
      if (!this.hasSessionStarted) return this.t('memorisation.guided.beforeBegin')
      if (this.guidedUiStep === 'recall') return this.t('memorisation.guided.duringSession')
      if (this.guidedUiStep === 'practice') return this.t('memorisation.guided.duringSession')
      if (this.guidedUiStep === 'review') return this.t('memorisation.guided.afterEachAyah')
      if (this.isPlaying) return this.t('memorisation.guided.duringSession')
      return this.t('memorisation.guided.keepGoing')
    },
    plannerGuidanceTone() {
      if (!this.hasSessionStarted) return 'start'
      if (this.guidedUiStep === 'review') return 'after'
      if (this.guidedUiStep === 'recall' || this.guidedUiStep === 'practice') return 'during'
      if (this.isPlaying) return 'start'
      return 'after'
    },
    plannerActiveGuidance() {
      if (!this.hasSessionStarted) {
        return {
          title: 'Listen carefully and follow along.',
          body: 'Mutqin will start the timer, audio, and ayah highlighting together.'
        }
      }
      if (this.guidedUiStep === 'recall') {
        return {
          title: 'Try reciting without looking.',
          body: 'Say the ayah first from memory, then check only what you need.'
        }
      }
      if (this.guidedUiStep === 'practice' || this.isPlaying) {
        return {
          title: 'Listen carefully and follow along.',
          body: 'Watch the highlighted words and keep a steady rhythm before the next ayah.'
        }
      }
      if (this.guidedUiStep === 'review') {
        return {
          title: 'Great job. Continue to the next ayah.',
          body: 'Refresh what is due today, then move forward while the memory is still warm.'
        }
      }
      return {
        title: 'Great job. Continue to the next ayah.',
        body: 'Stay calm, keep the pace light, and move on when the current ayah feels steady.'
      }
    },
    plannerBeginnerGuidance() {
      if (!this.hasSessionStarted) {
        return 'Press start and Mutqin will begin with a countdown, then play the audio automatically.'
      }
      if (this.guidedUiStep === 'recall') {
        return 'Try the ayah from memory first, then check the text only when you need it.'
      }
      if (this.guidedUiStep === 'practice' || this.isPlaying) {
        return 'Listen and follow the highlighted words. Move on when the ayah feels steady.'
      }
      return 'Mutqin is guiding the order for you. Keep going one ayah at a time.'
    },
    topCardSessionLabel() {
      if (!this.hasVerses) {
        return this.t('memorisation.workspaceEmpty.title')
      }
      const surah = this.currentChapter?.name_simple || this.activeChapterName || 'Casual Session'
      return surah
    },
    topCardMetadataPills() {
      if (!this.hasVerses) return []

      const surahName = this.currentChapter?.name_simple || this.activeChapterName || this.topCardSessionLabel
      const start = Math.max(1, Number(this.rangeStart || 1))
      const end = Math.max(start, Number(this.rangeEnd || start))
      const reciter = this.reciters.find(item => String(item.id) === String(this.reciterId || ''))
      const repeatCount = Math.max(1, Number(this.repetitionsPerStep || 1))
      const delaySeconds = Number.isFinite(Number(this.delay)) ? Math.max(0, Number(this.delay)) : 0
      const activeTechniqueLabels = this.activePracticeTechniques
        .map(item => item?.label)
        .filter(Boolean)
      const rangeValue = start === end ? `Ayah ${start}` : `Ayahs ${start}-${end}`
      const delayValue = `${delaySeconds}s`
      const techniqueValue = activeTechniqueLabels.length
        ? activeTechniqueLabels.join(', ')
        : this.t('common.none')

      return [
        { key: 'surah', label: 'Surah', value: surahName },
        { key: 'range', label: 'Ayah range', value: rangeValue },
        { key: 'reciter', label: 'Reciter', value: reciter?.name || 'Alafasy' },
        { key: 'repetition', label: 'Repetition', value: `${repeatCount}x` },
        { key: 'delay', label: 'Delay', value: delayValue },
        { key: 'technique', label: 'Memorisation technique', value: techniqueValue }
      ]
    },
    workspaceProgressSummary() {
      const sessionTotal = Math.max(0, Number(this.totalVerses || 0))
      const sessionCovered = this.hasVerses
        ? Math.max(0, Math.min(sessionTotal || 0, Number(this.currentPosition || 0)))
        : 0
      const sessionPercent = sessionTotal
        ? Math.min(100, Math.round((sessionCovered / sessionTotal) * 100))
        : 0

      if (this.hasVerses && sessionTotal) {
        const remaining = Math.max(0, sessionTotal - sessionCovered)
        return {
          kicker: 'Progress',
          title: 'Session progress',
          badge: sessionPercent >= 100 ? 'Complete' : `${remaining} left`,
          value: `${sessionPercent}%`,
          meter: sessionPercent,
          detail: `${sessionCovered} of ${sessionTotal} ayahs covered in this range.`,
          meta: [
            { key: 'covered', label: 'Covered', value: `${sessionCovered}/${sessionTotal}` },
            { key: 'remaining', label: 'Remaining', value: `${remaining} ayah${remaining === 1 ? '' : 's'}` }
          ]
        }
      }

      if (this.hifzPlanExists) {
        const totalPlan = Math.max(1, Number(this.hifzPlannerForecast.totalAyahs || 1))
        const completed = Math.max(0, Number(this.hifzCompletedAyahCount || 0))
        return {
          kicker: 'Progress',
          title: 'Plan progress',
          badge: this.hifzPlanHealth.label,
          value: `${this.hifzPlannerProgressPercent}%`,
          meter: this.hifzPlannerProgressPercent,
          detail: `${completed} of ${totalPlan} ayahs completed in the current plan.`,
          meta: [
            { key: 'forecast', label: 'Forecast', value: this.hifzPlannerForecast.estimatedCompletionDate || 'Pending' },
            { key: 'active', label: 'Days active', value: this.hifzDaysActive || 0 }
          ]
        }
      }

      return {
        kicker: 'Progress',
        title: 'Session progress',
        badge: 'Ready',
        value: '0%',
        meter: 0,
        detail: 'Start a session to see live memorisation progress here.',
        meta: [
          { key: 'covered', label: 'Covered', value: '0/0' },
          { key: 'remaining', label: 'Remaining', value: 'Choose a range' }
        ]
      }
    },
    workspaceTargetSummary() {
      if (this.hifzPlanExists) {
        const plannerTotal = Math.max(
          1,
          Number(this.plannerSessionState.todaySession?.length || this.plannerSessionState.newCount || this.plannerSessionState.dueCount || 1)
        )
        const plannerCovered = this.hasVerses
          ? Math.max(0, Math.min(plannerTotal, Number(this.currentPosition || 0)))
          : 0
        const plannerMeter = this.hasVerses
          ? Math.min(100, Math.round((plannerCovered / plannerTotal) * 100))
          : 0
        const nextReview = this.plannerNextReviewHumanLabel || this.plannerSessionState.nextReviewLabel || 'Tomorrow'
        return {
          kicker: 'Target',
          title: 'Today\'s target',
          badge: this.hifzPlanHealth.label,
          headline: this.plannerSessionState.todayGoalLabel || this.hifzJourneyDailyTarget,
          subline: this.plannerGuidanceTitle,
          note: `Next review ${nextReview}. ${this.plannerGuidanceWhy}`,
          meter: plannerMeter,
          meta: [
            { key: 'review', label: 'Review load', value: this.plannerMemoryReviewLine },
            { key: 'confidence', label: 'Confidence', value: this.plannerConfidenceLine }
          ]
        }
      }

      const total = Math.max(0, Number(this.totalVerses || 0))
      const current = this.hasVerses
        ? Math.max(0, Math.min(total || 0, Number(this.currentPosition || 0)))
        : 0
      const meter = total
        ? Math.min(100, Math.round((current / total) * 100))
        : 0
      const start = Math.max(1, Number(this.rangeStart || 1))
      const end = Math.max(start, Number(this.rangeEnd || start))
      const rangeLabel = this.hasVerses
        ? (start === end ? `Ayah ${start}` : `Ayahs ${start}-${end}`)
        : 'Select a range'
      return {
        kicker: 'Target',
        title: 'Current target',
        badge: this.hasVerses && total ? `${total} ayahs` : 'Pending',
        headline: rangeLabel,
        subline: this.hasVerses && total
          ? `${Math.max(0, total - current)} ayahs left in this range`
          : 'No active session yet',
        note: this.hasVerses
          ? 'Use the selected range as the session target and move through it at a steady pace.'
          : 'Open session setup to choose a target range and start tracking it live.',
        meter,
        meta: [
          { key: 'mode', label: 'Mode', value: this.playModeSummaryLabel },
          { key: 'repeat', label: 'Repeats', value: `${Math.max(1, Number(this.repetitionsPerStep || 1))}x per ayah` }
        ]
      }
    },
    showHeaderSessionAction() {
      return this.hasVerses
    },
    headerSessionActionLabel() {
      if (this.isPlaying) return 'Pause session'
      return 'Start session'
    },
    headerSessionActionIcon() {
      return this.isPlaying ? 'bi-pause-fill' : 'bi-play-fill'
    },
    sessionExitModalTitle() {
      if (this.showSessionExitModal && !this.hasSessionStarted && this.sessionExitPreviewSnapshot) {
        return this.sessionExitPreviewSnapshot.completedAll
          ? this.t('memorisation.sessionComplete.title')
          : this.t('memorisation.sessionEnded.title')
      }
      return this.t('sessionStatus.end')
    },
    sessionExitModalBadge() {
      if (this.showSessionExitModal && !this.hasSessionStarted && this.sessionExitPreviewSnapshot) {
        const chapter = this.sessionExitPreviewSnapshot.chapterName || this.currentChapter?.name_simple || this.activeChapterName || 'Session'
        const range = this.sessionExitPreviewSnapshot.rangeLabel || ''
        return range ? `${chapter} · ${range}` : chapter
      }
      return this.sessionContextBadge
    },
    canContinueCurrentSession() {
      return !!(this.showSessionExitModal && this.hasSessionStarted && this.sessionExitSnapshot?.activeVerseKey)
    },
    sessionExitStatusPills() {
      const snapshot = this.sessionExitPreviewSnapshot || {}
      const pills = []
      pills.push({
        key: 'status',
        tone: this.canContinueCurrentSession ? 'active' : (snapshot.completedAll ? 'complete' : 'paused'),
        label: this.canContinueCurrentSession ? 'In progress' : (snapshot.completedAll ? 'Completed' : 'Stopped')
      })
      if (snapshot.progressLabel) {
        pills.push({ key: 'progress', tone: 'neutral', label: snapshot.progressLabel })
      }
      if (snapshot.durationLabel) {
        pills.push({ key: 'duration', tone: 'neutral', label: snapshot.durationLabel })
      }
      if (snapshot.repeatShortLabel) {
        pills.push({ key: 'repeat', tone: 'neutral', label: `${snapshot.repeatShortLabel} repeats` })
      }
      return pills
    },
    sessionExitSummaryCopy() {
      const snapshot = this.sessionExitPreviewSnapshot || {}
      if (snapshot.detailMessage) return snapshot.detailMessage
      if (snapshot.summaryMessage) return snapshot.summaryMessage
      if (!this.hasSessionStarted && this.isSessionCompleted) {
        return this.t('memorisation.summary.default')
      }
      return `You covered ${snapshot.coveredAyahCount || 0} of ${snapshot.totalAyahs || 0} ayahs before ending.`
    },
    sessionExitDismissLabel() {
      return this.showSessionExitModal && this.hasSessionStarted
        ? this.t('common.continue')
        : this.t('common.close')
    },
    canResumePreviousSession() {
      return !!(this.continueSessionPayload?.config?.chapterId)
    },
    canSaveSessionFromResumeChoice() {
      return !!(this.continueSessionPayload?.config?.chapterId || this.hasVerses)
    },
    canViewSavedSessions() {
      return this.sortedSavedSessions.length > 0
    },
    shouldGateWorkspaceForResumeChoice() {
      return !!(this.isLoggedIn && this.showResumeModal && this.returningUserChoicePending)
    },
    resumeSessionDetailItems() {
      if (!this.canResumePreviousSession) return []
      const payload = this.continueSessionPayload || {}
      const config = payload.config || {}
      const chapter = this.chapters.find(item => Number(item.id) === Number(config.chapterId))
      const reciter = this.reciters.find(item => String(item.id) === String(config.reciterId || ''))
      const activeAyah = payload.activeVerseKey
        ? String(payload.activeVerseKey).split(':')[1]
        : String(config.rangeStart || 1)
      return [
        { key: 'surah', label: 'Surah', value: chapter?.name_simple || `Surah ${config.chapterId || ''}`.trim() },
        { key: 'range', label: 'Range', value: `Ayahs ${config.rangeStart || 1}-${config.rangeEnd || config.rangeStart || 1}` },
        { key: 'stopped', label: 'Stopped at', value: `Ayah ${activeAyah}` },
        { key: 'reciter', label: 'Reciter', value: reciter?.name || 'Alafasy' },
        { key: 'speed', label: 'Speed', value: `${Number(config.speed || 1)}x` },
        { key: 'repeats', label: 'Repeats', value: `${Math.max(1, Number(config.repetitionsPerStep || 1))}x per ayah` }
      ]
    },
    readyToBeginSummary() {
      if (!this.canResumePreviousSession) return null
      const payload = this.continueSessionPayload || {}
      const config = payload.config || {}
      const chapter = this.chapters.find(item => Number(item.id) === Number(config.chapterId))
      const chapterName = chapter?.name_simple || this.currentChapter?.name_simple || 'Previous session'
      const start = Number(config.rangeStart || 1)
      const end = Number(config.rangeEnd || start)
      const ayah = payload.activeVerseKey ? String(payload.activeVerseKey).split(':')[1] : start
      return {
        chapterName,
        rangeLabel: `Ayahs ${start}-${end}`,
        resumeLabel: `Stopped near ayah ${ayah}`,
        summary: this.continueSessionMeta,
        savedAt: this.resumeSavedAtLabel || this.smartResumeDetails.saved
      }
    },
    plannerCompletionStats() {
      const snapshot = this.plannerCompletionSnapshot || {}
      const memorisedAyahs = Math.max(0, Number(snapshot.memorisedAyahs || 0))
      const newAyahs = Math.max(0, Number(snapshot.newAyahs || memorisedAyahs || 0))
      const todayGoalCompleted = Math.max(0, Number(snapshot.todayGoalCompleted || 0))
      const todayGoalTarget = Math.max(1, Number(snapshot.todayGoalTarget || 1))
      return {
        memorised: memorisedAyahs,
        memorisedLabel: memorisedAyahs === 1 ? 'ayah memorised today' : 'ayahs memorised today',
        newAyahs,
        newAyahsLabel: newAyahs === 1 ? 'new ayah added' : 'new ayahs added',
        goalProgress: `${todayGoalCompleted}/${todayGoalTarget}`,
        goalStatus: 'Progress',
        nextReview: snapshot.nextReview || 'Tomorrow',
        nextReviewHint: snapshot.nextReviewHint || 'Your next review is already scheduled.'
      }
    },
    plannerCompletionTimelineItems() {
      return [
        ...this.buildPlannerReviewSchedule(),
        ...this.buildPlannerFutureSessions()
      ].slice(0, 6)
    },
    plannerCompletionSummaryMessage() {
      return this.plannerCompletionSnapshot?.summaryMessage
        || 'Your plan is ready and your next review has already been scheduled.'
    },
    plannerCompletionConfettiPieces() {
      return Array.from({ length: 90 }, (_, index) => ({
        id: `planner-confetti-${index}`,
        style: {
          '--planner-confetti-left': `${(index * 1.1) % 100}%`,
          '--planner-confetti-delay': `${(index % 18) * 28}ms`,
          '--planner-confetti-duration': `${2200 + ((index % 7) * 120)}ms`,
          '--planner-confetti-rotate': `${(index % 2 === 0 ? 1 : -1) * (24 + (index * 7))}deg`,
          '--planner-confetti-color': ['#2f6f58', '#d4a24f', '#ef8d62', '#7aa7ff'][index % 4]
        }
      }))
    },
    sessionQuizConfettiPieces() {
      return Array.from({ length: 54 }, (_, index) => ({
        id: `session-quiz-confetti-${index}`,
        style: {
          '--session-quiz-confetti-left': `${(index * 1.85) % 100}%`,
          '--session-quiz-confetti-delay': `${(index % 14) * 24}ms`,
          '--session-quiz-confetti-duration': `${1400 + ((index % 6) * 90)}ms`,
          '--session-quiz-confetti-rotate': `${(index % 2 === 0 ? 1 : -1) * (18 + (index * 6))}deg`,
          '--session-quiz-confetti-color': ['rgba(244, 206, 157, 0.9)', 'rgba(255, 241, 220, 0.92)', 'rgba(194, 235, 214, 0.88)', 'rgba(255, 255, 255, 0.94)'][index % 4]
        }
      }))
    },
    sessionCompletionSnapshot() {
      if (this.isOnboardingExperienceActive) return null
      if (this.sessionEndedSnapshot && Object.keys(this.sessionEndedSnapshot).length) {
        return this.sessionEndedSnapshot
      }
      return null
    },
    isOnboardingExperienceActive() {
      return !!this.showPostLoginOnboarding
    },
    hasMeaningfulSessionCompletionData() {
      if (!this.isSessionCompleted || !this.hasVerses) return false
      if (this.sessionEndedSnapshot && Object.keys(this.sessionEndedSnapshot).length) return true

      const hasCompletedAt = !!(this.sessionCompletedAt || this.centralSession?.sessionCompletedAt || this.mutqinState?.sessionState?.completed_at)
      const hasPlaybackEvidence = Number(this.duration || 0) > 0 || Number(this.currentTime || 0) > 0 || Number(this.sessionStartedAt || 0) > 0
      const hasQueueEvidence = Number(this.queueIndex || 0) > 0 || Number(this.currentPosition || 0) > 0
      const hasMutqinCompletion = !!this.mutqinState?.sessionState?.completed
      const hasCentralCompletion = this.centralSession?.sessionStatus === 'completed'

      return hasCompletedAt && (hasPlaybackEvidence || hasQueueEvidence || hasMutqinCompletion || hasCentralCompletion)
    },
    sessionEndedStats() {
      const snapshot = this.sessionCompletionSnapshot || {}
      return {
        surah: snapshot.chapterName || '',
        range: snapshot.rangeLabel || '',
        progress: snapshot.progressLabel || '',
        duration: snapshot.durationLabel || '',
        repeats: snapshot.repeatShortLabel || ''
      }
    },
    sessionEndedMetaCards() {
      const snapshot = this.sessionCompletionSnapshot || {}
      if (!snapshot || !Object.keys(snapshot).length) return []
      const coveredAyahs = Number(snapshot.coveredAyahCount || 0)
      const totalAyahs = Number(snapshot.totalAyahs || 0)
      const nextSteps = Array.isArray(snapshot.nextSteps) ? snapshot.nextSteps : []
      return [
        {
          key: 'happened',
          kicker: this.t('memorisation.meta.graceKicker'),
          calligraphy: 'الحمد لله على التمام',
          title: snapshot.completedAll ? this.t('memorisation.meta.completedTitle') : this.t('memorisation.meta.forwardTitle'),
          body: snapshot.completedAll
            ? `${coveredAyahs}/${totalAyahs} ayahs completed in ${snapshot.durationLabel || 'this session'}.`
            : `Reached ayah ${snapshot.lastAyahLabel || coveredAyahs || 1} with ${snapshot.progressPercent || 0}% completed.`,
          points: [
            snapshot.rangeLabel && snapshot.chapterName ? `${snapshot.chapterName} · ${snapshot.rangeLabel}` : '',
            snapshot.modeSummary || ''
          ].filter(Boolean)
        },
        {
          key: 'done',
          kicker: this.t('memorisation.meta.steadinessKicker'),
          calligraphy: 'زادك الله ثباتا',
          title: this.t('memorisation.meta.studiedTitle'),
          body: snapshot.repeatSummary || 'Current session settings were applied.',
          points: [
            snapshot.displaySummary || '',
            snapshot.pacingSummary || ''
          ].filter(Boolean)
        },
        {
          key: 'next',
          kicker: this.t('memorisation.meta.nextKicker'),
          calligraphy: 'اللهم زدني علما',
          title: snapshot.completedAll ? this.t('memorisation.meta.advanceTitle') : this.t('memorisation.meta.continueTitle'),
          body: snapshot.completedAll
            ? 'Start a new session if this range felt stable, or repeat the same range once more to strengthen recall.'
            : 'Repeat this range now if recall felt weak, or start a fresh session when you are ready to continue.',
          points: (nextSteps.length
            ? nextSteps
            : [
                'Use Repeat Range for another clean pass.',
                'Use New Session to move into the next selected range.'
              ]).slice(0, 2)
        }
      ]
    },
    sessionEndedSummaryMessage() {
      const snapshot = this.sessionCompletionSnapshot || {}
      return snapshot.summaryMessage || this.t('memorisation.summary.default')
    },
    sessionEndedDetailMessage() {
      const snapshot = this.sessionCompletionSnapshot || {}
      return snapshot.detailMessage || ''
    },
    sessionEndedNextStepMessage() {
      const snapshot = this.sessionCompletionSnapshot || {}
      return Array.isArray(snapshot.nextSteps) && snapshot.nextSteps.length ? snapshot.nextSteps[0] : ''
    },
    hifzPlanLifecycleStatus() {
      return this.hifzPlan?.lifecycle?.status || this.hifzPlan?.status || 'draft'
    },
    hifzProgressEntries() {
      return getProgressEntries(this.hifzAyahProgress || {})
    },
    hifzCompletedAyahCount() {
      return this.hifzProgressEntries.length
    },
    hifzPlannerForecast() {
      if (!this.hifzPlan) return calculatePlanForecast({}, { completedAyahs: 0 })
      return calculatePlanForecast(this.hifzPlan, { completedAyahs: this.hifzCompletedAyahCount })
    },
    hifzPlannerProgressPercent() {
      const total = Math.max(1, Number(this.hifzPlannerForecast.totalAyahs || QURAN_TOTALS.ayahs))
      return Math.min(100, Math.round((this.hifzCompletedAyahCount / total) * 100))
    },
    hifzDaysActive() {
      if (!this.hifzPlan) return 0
      const startedAt = this.hifzPlan.lifecycle?.startedAt || this.hifzPlan.startedAt || this.hifzPlan.createdAt
      const start = new Date(startedAt || Date.now())
      if (Number.isNaN(start.getTime())) return 0
      const end = this.hifzPlanLifecycleStatus === 'paused'
        ? new Date(this.hifzPlan.lifecycle?.pausedAt || this.hifzPlan.pausedAt || Date.now())
        : new Date()
      const diff = Math.max(0, end.getTime() - start.getTime())
      return Math.max(1, Math.floor(diff / 86400000) + 1)
    },
    hifzCurrentPlanPosition() {
      const forecast = this.hifzPlannerForecast
      const progressRatio = Math.min(1, this.hifzCompletedAyahCount / Math.max(1, forecast.totalAyahs || 1))
      const rangeFrom = Number(this.hifzPlan?.selectedRange?.from || this.hifzPlan?.range?.from || 1)
      const nextAyah = Math.min(
        Number(this.hifzPlan?.selectedRange?.to || rangeFrom + forecast.totalAyahs - 1 || forecast.totalAyahs),
        Math.max(rangeFrom, rangeFrom + this.hifzCompletedAyahCount)
      )
      return {
        juz: Math.max(1, Math.ceil(progressRatio * (forecast.totalJuz || QURAN_TOTALS.juz))),
        hizb: Math.max(1, Math.ceil(progressRatio * (forecast.totalHizb || QURAN_TOTALS.hizb))),
        page: Math.max(1, Math.ceil(progressRatio * (forecast.totalPages || QURAN_TOTALS.pages))),
        ayah: nextAyah,
        label: this.hifzPlan?.selectedSurah ? `${this.hifzPlan.selectedSurah} ${nextAyah}` : `Ayah ${this.hifzCompletedAyahCount + 1}`
      }
    },
    hifzMemorySchedule() {
      const today = new Date()
      const todayToken = this.getHifzDateToken(today)
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const tomorrowToken = this.getHifzDateToken(tomorrow)
      const week = new Date(today)
      week.setDate(today.getDate() + 7)
      const weekToken = this.getHifzDateToken(week)
      const recent = new Date(today)
      recent.setDate(today.getDate() - 14)

      const entries = this.hifzProgressEntries
      const withReview = entries
        .map(entry => ({
          ...entry,
          nextToken: this.getHifzDateToken(entry.progress?.nextReview),
          lastReviewedTime: Date.parse(entry.progress?.lastReviewed || '')
        }))
      const dueToday = withReview.filter(entry => entry.nextToken && entry.nextToken <= todayToken)
      const overdue = withReview.filter(entry => entry.nextToken && entry.nextToken < todayToken)
      const tomorrowDue = withReview.filter(entry => entry.nextToken === tomorrowToken)
      const thisWeek = withReview.filter(entry => entry.nextToken && entry.nextToken > todayToken && entry.nextToken <= weekToken)
      const recentlyMastered = withReview.filter(entry => {
        const mastery = Number(entry.progress?.masteryScore || 0)
        return mastery >= 0.85 && Number.isFinite(entry.lastReviewedTime) && entry.lastReviewedTime >= recent.getTime()
      })
      return {
        dueToday,
        overdue,
        tomorrow: tomorrowDue,
        thisWeek,
        recentlyMastered,
        upcoming: withReview
          .filter(entry => entry.nextToken)
          .sort((a, b) => String(a.nextToken).localeCompare(String(b.nextToken)))
      }
    },
    hifzMemoryScheduleCards() {
      const schedule = this.hifzMemorySchedule
      return [
        { key: 'due', label: 'Due Today', value: schedule.dueToday.length },
        { key: 'tomorrow', label: 'Tomorrow', value: schedule.tomorrow.length },
        { key: 'week', label: 'This Week', value: schedule.thisWeek.length },
        { key: 'overdue', label: 'Overdue Reviews', value: schedule.overdue.length },
        { key: 'mastered', label: 'Recently Mastered', value: schedule.recentlyMastered.length }
      ]
    },
    hifzNextReviewDates() {
      const upcoming = this.hifzMemorySchedule.upcoming.slice(0, 4).map(entry => ({
        key: entry.key,
        label: `${entry.surah}:${entry.ayah}`,
        date: entry.nextToken ? entry.nextToken.replaceAll('-', '/') : 'Not scheduled'
      }))
      return upcoming.length ? upcoming : [{ key: 'empty', label: 'Next review', date: 'After today’s new ayahs' }]
    },
    hifzPlanHealth() {
      if (!this.hifzPlanExists) {
        return { status: 'onTrack', label: 'On Track', icon: 'bi-check-circle', missedDays: 0, detail: 'Create a plan to begin tracking.' }
      }
      if (this.hifzPlanLifecycleStatus === 'paused') {
        return { status: 'paused', label: 'Paused', icon: 'bi-pause-circle', missedDays: 0, detail: 'Progress calculations are paused until you resume.' }
      }
      if (!this.hifzCompletedAyahCount && !this.hifzPlan?.progressSummary?.firstSessionCompletedAt) {
        return { status: 'onTrack', label: 'Ready to begin', icon: 'bi-check-circle', missedDays: 0, detail: 'Your plan is ready. Missed days start after your first completed session.' }
      }

      const dailyTarget = normalizeDailyNewAyahCount(this.hifzPlan)
      const plannedAyahs = this.hifzDaysActive * dailyTarget
      const behindAyahs = Math.max(0, plannedAyahs - this.hifzCompletedAyahCount)
      const missedDays = Math.max(0, Math.ceil(behindAyahs / Math.max(1, dailyTarget)))
      const overdueCount = this.hifzMemorySchedule.overdue.length
      const revisionPressure = overdueCount >= dailyTarget ? 'high' : (overdueCount > 0 ? 'medium' : 'clear')

      if (missedDays >= 3 || revisionPressure === 'high') {
        return {
          status: 'fallingBehind',
          label: 'Falling Behind',
          icon: 'bi-exclamation-triangle',
          missedDays,
          detail: overdueCount ? `${overdueCount} reviews are overdue.` : 'Planned memorisation is ahead of completed progress.'
        }
      }
      if (missedDays >= 1 || revisionPressure === 'medium') {
        return {
          status: 'slightlyBehind',
          label: 'Slightly Behind',
          icon: 'bi-dash-circle',
          missedDays,
          detail: overdueCount ? `${overdueCount} review${overdueCount === 1 ? ' is' : 's are'} overdue.` : 'A small adjustment will bring the plan back on track.'
        }
      }
      return {
        status: 'onTrack',
        label: 'On Track',
        icon: 'bi-check-circle',
        missedDays: 0,
        detail: 'Progress and revision are matching the plan.'
      }
    },
    hifzRecoveryRequired() {
      return ['slightlyBehind', 'fallingBehind'].includes(this.hifzPlanHealth.status)
    },
    hifzPlannerStatusMessage() {
      if (this.hifzPlanLifecycleStatus === 'paused') return 'Your plan is paused. Resume when you are ready to continue.'
      return `${this.hifzPlannerProgressPercent}% complete. Forecast finish: ${this.hifzPlannerForecast.estimatedCompletionDate}.`
    },
    hifzPlannerMetricCards() {
      const forecast = this.hifzPlannerForecast
      const position = this.hifzCurrentPlanPosition
      return [
        { key: 'streak', icon: 'bi-fire', value: this.analytics?.currentStreak || 0, label: 'Current Streak' },
        { key: 'active', icon: 'bi-calendar2-check', value: this.hifzDaysActive, label: 'Days Active' },
        { key: 'remaining', icon: 'bi-hourglass-split', value: forecast.estimatedDays, label: 'Days Remaining' },
        { key: 'progress', icon: 'bi-pie-chart', value: `${this.hifzPlannerProgressPercent}%`, label: 'Current Progress' },
        { key: 'juz', icon: 'bi-journal-bookmark', value: position.juz, label: 'Current Juz' },
        { key: 'hizb', icon: 'bi-bookmarks', value: position.hizb, label: 'Current Hizb' },
        { key: 'page', icon: 'bi-file-earmark-text', value: position.page, label: 'Current Page' },
        { key: 'ayah', icon: 'bi-book', value: position.label, label: 'Current Ayah' },
        { key: 'forecast', icon: 'bi-calendar-check', value: forecast.estimatedCompletionDate, label: 'Completion Forecast' }
      ]
    },
    hifzRetentionInsights() {
      const entries = this.hifzProgressEntries
      if (!entries.length) return ['Your memory schedule will begin after the first completed ayah.']
      const averageMastery = entries.reduce((sum, entry) => sum + Number(entry.progress?.masteryScore || 0), 0) / entries.length
      const weakCount = entries.filter(entry => Number(entry.progress?.masteryScore || 0) < 0.55).length
      const strongCount = entries.filter(entry => Number(entry.progress?.masteryScore || 0) >= 0.85).length
      const insights = []
      insights.push(averageMastery >= 0.75 ? 'Your retention strength is improving.' : 'Your retention needs more steady review.')
      if (strongCount) insights.push(`You consistently remember ${strongCount} recently learned ayah${strongCount === 1 ? '' : 's'}.`)
      if (weakCount) insights.push(`${weakCount} ayah${weakCount === 1 ? ' requires' : 's require'} additional revision.`)
      if (this.hifzMemorySchedule.overdue.length) insights.push('Revision backlog detected. Clearing overdue reviews will stabilise the plan.')
      else insights.push('Spaced repetition is active and reviews are staying under control.')
      return insights.slice(0, 4)
    },
    hifzPlannerSimpleAnalytics() {
      const dueCount = this.hifzMemorySchedule.dueToday.length
      const overdueCount = this.hifzMemorySchedule.overdue.length
      const target = normalizeDailyNewAyahCount(this.hifzPlan || {})
      const todayCompleted = Math.min(target, (this.hifzTodayQueue || []).filter(item => item.type === 'new').length)
      return [
        { key: 'progress', icon: 'bi-pie-chart', value: `${this.hifzPlannerProgressPercent}%`, label: 'Progress', detail: `${this.hifzCompletedAyahCount}/${this.hifzPlannerForecast.totalAyahs} ayahs` },
        { key: 'streak', icon: 'bi-fire', value: this.analytics?.currentStreak || 0, label: 'Streak', detail: 'active days' },
        { key: 'target', icon: 'bi-bullseye', value: `${todayCompleted}/${target}`, label: 'Daily Target', detail: 'queued today' },
        { key: 'retention', icon: 'bi-gem', value: overdueCount ? 'Needs Review' : 'Steady', label: 'Retention', detail: dueCount ? `${dueCount} due today` : 'clear today' }
      ]
    },
    hifzPlannerDetailedAnalytics() {
      const entries = this.hifzProgressEntries
      const weak = entries.filter(entry => Number(entry.progress?.masteryScore || 0) < 0.55)
      const strong = entries.filter(entry => Number(entry.progress?.masteryScore || 0) >= 0.85)
      const forecast = this.hifzPlannerForecast
      return [
        {
          key: 'surah',
          title: 'Surah Progress',
          icon: 'bi-book-half',
          rows: [
            { label: this.hifzPlan?.selectedSurah || 'Current plan', value: `${this.hifzPlannerProgressPercent}%`, detail: `${this.hifzCompletedAyahCount} ayahs completed` }
          ]
        },
        {
          key: 'juz-hizb',
          title: 'Juz and Hizb Progress',
          icon: 'bi-bookmarks',
          rows: [
            { label: 'Juz', value: this.hifzCurrentPlanPosition.juz, detail: `${forecast.totalJuz} total in plan` },
            { label: 'Hizb', value: this.hifzCurrentPlanPosition.hizb, detail: `${forecast.totalHizb} total in plan` }
          ]
        },
        {
          key: 'memory',
          title: 'Weak and Strong Ayahs',
          icon: 'bi-gem',
          rows: [
            { label: 'Weak Ayahs', value: weak.length, detail: weak.slice(0, 4).map(entry => entry.key).join(', ') || 'None flagged' },
            { label: 'Strong Ayahs', value: strong.length, detail: strong.slice(0, 4).map(entry => entry.key).join(', ') || 'Build through reviews' }
          ]
        },
        {
          key: 'revision',
          title: 'Revision Performance',
          icon: 'bi-calendar-heart',
          rows: [
            { label: 'Due Today', value: this.hifzMemorySchedule.dueToday.length, detail: 'scheduled reviews' },
            { label: 'Overdue', value: this.hifzMemorySchedule.overdue.length, detail: 'needs attention' },
            { label: 'This Week', value: this.hifzMemorySchedule.thisWeek.length, detail: 'upcoming reviews' }
          ]
        },
        {
          key: 'completion',
          title: 'Completion Trends',
          icon: 'bi-graph-up',
          rows: [
            { label: 'Daily Target', value: `${forecast.dailyTarget}/day`, detail: 'current pace' },
            { label: 'Days Remaining', value: forecast.estimatedDays, detail: forecast.estimatedDuration },
            { label: 'Missed Day History', value: this.hifzPlanHealth.missedDays, detail: this.hifzPlanHealth.detail }
          ]
        }
      ]
    },

    appStyleVars() {
      return {
        '--ui-scale': this.uiScale,
        '--en-scale': this.enScale,
        '--text-scale': this.fontScale,
        '--recall-blur': `${this.blurIntensity}px`,
        '--focus-dim-opacity': `${Math.max(0.25, Math.min(0.85, Number(this.focusDimPercent || 54) / 100))}`
      }
    },
    chainingMethodDescription() {
      if (!this.chainingEnabled) return this.t('memorisation.techniques.chainingOffSub')
      if (!this.hasChainingMethodSelected) return 'Choose linking or cumulative before starting.'
      if (this.chainingMethod === 'cumulative') return this.t('memorisation.techniques.chainingCumulativeSub')
      return this.t('memorisation.techniques.chainingLinkingSub')
    },
    chainingMethodLabel() {
      const count = this.chainingRepetitions
      if (!this.chainingEnabled) return this.t('memorisation.techniques.chainingOffLabel', { count })
      if (!this.hasChainingMethodSelected) return 'Choose chaining method'
      if (this.chainingMethod === 'cumulative') return this.t('memorisation.techniques.chainingCumulativeLabel', { count })
      return this.t('memorisation.techniques.chainingLinkingLabel', { count })
    },
    chainingMethodPreview() {
      const count = this.chainingRepetitions
      if (!this.chainingEnabled) return this.t('memorisation.techniques.chainingOffPreview', { count })
      if (!this.hasChainingMethodSelected) return 'Select linking or cumulative to preview the chaining queue.'
      if (this.chainingMethod === 'cumulative') return this.t('memorisation.techniques.chainingCumulativePreview', { count })
      return this.t('memorisation.techniques.chainingLinkingPreview', { count })
    },
    quranFontOptions() {
      return (this.quranFontOptionDefs || []).map(font => ({
        ...font,
        label: this.t(`memorisation.fonts.${font.value}`)
      }))
    },
    onboardingSteps() {
      const defs = [
        { key: 'setup', icon: 'bi-journal-text' },
        { key: 'reading', icon: 'bi-layout-text-window-reverse' },
        { key: 'practice', icon: 'bi-stars' },
        { key: 'review', icon: 'bi-clock-history' }
      ]
      return defs.map(({ key, icon }) => this.buildOnboardingStep(key, icon))
    },
    currentConfig() {
      return this.getModeStore(this.currentMode)
    },
    activeAyahNumber() {
      const key = this.activeVerseKey
      if (!key) return null
      const verse = this.verses.find(v => v.key === key)
      if (verse && typeof verse.number !== 'undefined') return verse.number
      const parts = String(key).split(':')
      const n = Number(parts[1])
      return Number.isFinite(n) ? n : null
    },
    activeAyahLabel() {
      const n = this.activeAyahNumber
      return n ? this.t('memorisation.sessionType.ayah', { n }) : this.t('memorisation.sessionType.ayahLabel')
    },
    effectiveActiveVerseKey() {
      if (this.activeVerseKey) return this.activeVerseKey
      if (this.activeKey) return this.activeKey
      const queued = this.queue?.[this.queueIndex]
      return queued?.verse?.key || queued?.key || null
    },

    activeVerseRef() {
      return this.mushafDisplayVerses.find(v => v.key === this.effectiveActiveVerseKey) || null
    },
    recitationCheckVisible() {
      return (this.recitationCheckPreparing && !!this.recitationCheckStartedAt && !this.recitationCheckRecording)
        || !!this.recitationCheckError
        || !!this.recitationCheckResult
    },
    selfCheckReviewVisible() {
      if (this.recitationCheckRecording) return false
      return (this.recitationCheckPreparing && !!this.recitationCheckStartedAt)
        || !!this.recitationCheckResult
        || !!this.recitationCheckError
        || this.isSelfCheckRecording
        || this.selfCheckPreparing
        || !!this.selfCheckActiveDraft
        || !!this.selfCheckError
        || this.selfCheckLastSavedAyahKey === this.selfCheckModalVerse?.key
        || this.selfCheckSavedAttemptsVisible
    },
    recitationCheckTitle() {
      const targets = this.getRecitationCheckTargetVerses()
      if (!targets.length) return 'Current ayah'
      const first = targets[0]?.number
      const last = targets[targets.length - 1]?.number
      const surah = this.currentChapter?.name_simple || this.activeChapterName || 'Session'
      return first === last ? `${surah} · Ayah ${first}` : `${surah} · Ayahs ${first}-${last}`
    },
    recitationCheckPromptLabel() {
      if (this.recitationCheckScope === 'session') return 'Session AI Recite'
      return 'Ayah AI Recite'
    },
    activeMutqinAyah() {
      return this.effectiveActiveVerseKey ? this.mutqinState.ayahs?.[this.effectiveActiveVerseKey] || null : null
    },

    currentLearningPrompt() {
      const item = this.mutqinState?.sessionState?.queue?.[this.mutqinState?.sessionState?.current_index || 0]
      if (!item) return this.t('memorisation.guided.listenAndFollow')
      if (item.phase === 'Retention') {
        return this.dueCount
          ? this.t('memorisation.guided.versesDueCount', { count: this.dueCount })
          : this.t('memorisation.guided.reviewVersesDue')
      }
      if (this.guidedUiStep === 'recall') return this.t('memorisation.guided.reciteFirstReveal')
      if (this.guidedUiStep === 'practice') return this.t('memorisation.guided.tryRecitingMinimal')
      return this.t('memorisation.guided.listenAndFollow')
    },

    activeQueueEntry() {
      return this.queue?.[Math.max(0, Number(this.queueIndex || 0))] || null
    },
    sortedSavedSessions() {
      return [...this.savedSessions].sort((left, right) => {
        const leftTs = left?.savedAt ? Date.parse(left.savedAt) : 0
        const rightTs = right?.savedAt ? Date.parse(right.savedAt) : 0
        return rightTs - leftTs
      })
    },
    hasRecordingsLibraryEntries() {
      return this.recordingsLibrary.length > 0
    },
    filteredRecordingsAyahGroups() {
      const grouped = new Map()
      const query = String(this.recordingsLibrarySearch || '').trim().toLowerCase()

      this.recordingsLibrary.forEach(recording => {
        if (!recording?.ayahKey) return
        const searchHaystack = [
          recording.chapterName,
          `ayah ${recording.ayahNumber}`,
          `${recording.chapterId}:${recording.ayahNumber}`
        ].join(' ').toLowerCase()
        if (query && !searchHaystack.includes(query)) return

        if (!grouped.has(recording.ayahKey)) {
          grouped.set(recording.ayahKey, {
            ayahKey: recording.ayahKey,
            ayahNumber: recording.ayahNumber,
            chapterId: recording.chapterId,
            chapterName: recording.chapterName,
            recordings: []
          })
        }

        grouped.get(recording.ayahKey).recordings.push(recording)
      })

      const chapterMap = new Map()
      grouped.forEach(group => {
        const sorted = [...group.recordings].sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
        const total = sorted.length
        group.recordings = sorted.map((recording, index) => ({
          ...recording,
          attemptNumber: total - index
        }))
      })

      Array.from(grouped.values())
        .sort((left, right) => {
          if (Number(left.chapterId || 0) !== Number(right.chapterId || 0)) {
            return Number(left.chapterId || 0) - Number(right.chapterId || 0)
          }
          return Number(left.ayahNumber || 0) - Number(right.ayahNumber || 0)
        })
        .forEach(group => {
          if (!chapterMap.has(group.chapterId)) {
            chapterMap.set(group.chapterId, {
              chapterId: group.chapterId,
              chapterName: group.chapterName,
              ayahs: []
            })
          }
          chapterMap.get(group.chapterId).ayahs.push(group)
        })

      return Array.from(chapterMap.values())
    },
    filteredRecordingsAyahCount() {
      return this.filteredRecordingsAyahGroups.reduce((sum, group) => sum + group.ayahs.length, 0)
    },
    selectedRecordingsAyahGroup() {
      for (const surahGroup of this.filteredRecordingsAyahGroups) {
        const match = surahGroup.ayahs.find(ayah => ayah.ayahKey === this.selectedRecordingsAyahKey)
        if (match) return match
      }
      return null
    },
    selectedRecordingsAyahHistory() {
      const group = this.selectedRecordingsAyahGroup
      if (!group) return []
      const sorted = [...group.recordings].sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
      const total = sorted.length
      return sorted.map((recording, index) => ({
        ...recording,
        attemptNumber: total - index
      }))
    },
    selfCheckModalVerse() {
      if (!this.selfCheckVerseKey) return null
      const liveVerse = this.verses.find(verse => verse.key === this.selfCheckVerseKey) || null
      if (liveVerse) {
        return {
          ...this.selfCheckVerseRef,
          ...liveVerse,
          chapterName: liveVerse.chapterName
            || this.selfCheckVerseRef?.chapterName
            || this.currentChapter?.name_simple
            || this.activeChapterName
            || `Surah ${liveVerse.chapterId || ''}`.trim()
        }
      }
      return this.selfCheckVerseRef || null
    },
    selfCheckModalTitle() {
      const targets = this.recitationCheckScope === 'session' && this.recitationCheckPendingTargets.length
        ? this.recitationCheckPendingTargets
        : (this.selfCheckModalVerse ? [this.selfCheckModalVerse] : [])
      const prefix = this.recitationCheckPanelOpen || this.recitationCheckRecording || this.recitationCheckPreparing || this.recitationCheckResult
        ? 'AI Recite'
        : 'Self-Check'
      if (targets.length > 1) {
        const first = targets[0]?.number || String(targets[0]?.key || '').split(':')[1] || ''
        const last = targets[targets.length - 1]?.number || String(targets[targets.length - 1]?.key || '').split(':')[1] || ''
        return `${prefix} for Ayahs ${first}-${last}`
      }
      return `${prefix} for Ayah ${this.selfCheckModalVerse?.number || ''}`.trim()
    },
    aiMemorisationCheckerVerse() {
      if (!this.aiMemorisationCheckerVerseKey) return null
      const liveVerse = this.verses.find(verse => verse.key === this.aiMemorisationCheckerVerseKey) || null
      const displayVerse = (this.mushafDisplayVerses || []).find(verse => verse.key === this.aiMemorisationCheckerVerseKey) || null
      if (liveVerse) {
        return {
          ...this.aiMemorisationCheckerVerseRef,
          ...displayVerse,
          ...liveVerse,
          chapterName: liveVerse.chapterName
            || this.aiMemorisationCheckerVerseRef?.chapterName
            || this.currentChapter?.name_simple
            || this.activeChapterName
            || `Surah ${liveVerse.chapterId || ''}`.trim()
        }
      }
      return this.aiMemorisationCheckerVerseRef || null
    },
    aiMemorisationCheckerTargets() {
      if (Array.isArray(this.aiMemorisationCheckerTargetVerses) && this.aiMemorisationCheckerTargetVerses.length) {
        return this.aiMemorisationCheckerTargetVerses
      }
      return this.aiMemorisationCheckerVerse ? [this.aiMemorisationCheckerVerse] : []
    },
    aiMemorisationCheckerTitle() {
      const surah = this.currentChapter?.name_simple || this.activeChapterName || 'Session'
      if (this.aiMemorisationCheckerScope === 'session') return `AI Memorisation Checker · ${surah} · ${this.aiMemorisationCheckerTargetLabel}`
      const number = this.aiMemorisationCheckerVerse?.number || ''
      return `AI Memorisation Checker · Ayah ${number}`
    },
    aiMemorisationCheckerTargetLabel() {
      const targets = this.aiMemorisationCheckerTargets
      if (!targets.length) return 'Selected ayah'
      const first = targets[0]?.number
      const last = targets[targets.length - 1]?.number
      return first === last ? `Ayah ${first}` : `Ayahs ${first}-${last}`
    },
    aiMemorisationCheckerDisplayWords() {
      const hidden = new Set(this.aiMemorisationCheckerHiddenIndexes || [])
      return this.aiMemorisationCheckerLiveWords.map((word, index) => ({
        ...word,
        hidden: hidden.has(index)
      }))
    },
    isAiMemorisationCheckerReviewActive() {
      return this.aiMemorisationCheckerRecording
        || this.aiMemorisationCheckerPreparing
        || !!this.aiMemorisationCheckerResult
    },
    aiMemorisationCheckerVisibleLiveWords() {
      return this.buildVisibleLiveWordWindow(this.aiMemorisationCheckerLiveWords, 42, 'memory-live')
    },
    aiMemorisationCheckerLiveSummary() {
      const total = this.aiMemorisationCheckerLiveWords.length
      if (!total) return 'Preparing ayah words...'
      if (this.aiMemorisationCheckerResult) return 'Assessment complete. Review the analysis below.'
      const checked = this.aiMemorisationCheckerLiveWords.filter(word => word.status !== 'pending').length
      return checked ? `${checked} of ${total} words recognized` : 'Start reciting when the microphone is active'
    },
    aiMemorisationCheckerStageDescription() {
      if (this.aiMemorisationCheckerResult) return 'Review the word colours, then save, reset, or retry the same target.'
      if (this.aiMemorisationCheckerPreparing) return 'Analysing your recording and preparing the word review.'
      if (this.aiMemorisationCheckerRecording) return 'Listening now. Recite at your natural pace, then stop when finished.'
      if (this.aiMemorisationCheckerError) return 'Check the message below, then retry when your microphone is ready.'
      return 'Start the check only when you are ready to recite from memory.'
    },
    aiMemorisationCheckerStatusLabel() {
      if (this.aiMemorisationCheckerRecording) return 'Listening now'
      if (this.aiMemorisationCheckerPreparing) return 'Analysing recitation'
      if (this.aiMemorisationCheckerResult) return 'Results ready'
      return ''
    },
    selfCheckActiveDraft() {
      return this.selfCheckVerseKey ? this.getSelfCheckDraftForVerse(this.selfCheckVerseKey) : null
    },
    selfCheckModalAttempts() {
      if (!this.selfCheckVerseKey) return []
      const sorted = this.getAyahRecordingHistory(this.selfCheckVerseKey)
        .filter(recording => !this.isAiCheckRecording(recording))
      const total = sorted.length
      return sorted.map((recording, index) => ({
        ...recording,
        attemptNumber: total - index
      }))
    },
    selfCheckModalAiChecks() {
      if (!this.selfCheckVerseKey) return []
      const sorted = this.getAyahRecordingHistory(this.selfCheckVerseKey)
        .filter(recording => this.isAiCheckRecording(recording))
      const total = sorted.length
      return sorted.map((recording, index) => ({
        ...recording,
        attemptNumber: total - index
      }))
    },
    selfCheckModalHistory() {
      if (!this.selfCheckVerseKey) return []
      const sorted = this.getAyahRecordingHistory(this.selfCheckVerseKey)
      const totals = { ai: 0, recording: 0 }
      sorted.forEach(recording => {
        if (this.isAiCheckRecording(recording)) totals.ai += 1
        else totals.recording += 1
      })
      const seen = { ai: 0, recording: 0 }
      return sorted.map(recording => {
        const key = this.isAiCheckRecording(recording) ? 'ai' : 'recording'
        seen[key] += 1
        return {
          ...recording,
          attemptNumber: Math.max(1, totals[key] - seen[key] + 1)
        }
      })
    },
    displayedSelfCheckModalHistory() {
      if (this.selfCheckSavedAttemptsFilter === 'recordings') return this.selfCheckModalAttempts
      if (this.selfCheckSavedAttemptsFilter === 'ai') return this.selfCheckModalAiChecks
      return this.selfCheckModalHistory
    },
    selfCheckLatestAttempt() {
      return this.selfCheckModalAttempts[0] || null
    },
    getSessionPrimaryLabel() {
      return (session = {}) => {
        const config = session?.config || {}
        const chapterName = config?.chapterName || (config?.chapterId ? `Surah ${config.chapterId}` : 'Session')
        const start = Number(config?.rangeStart || 0)
        const end = Number(config?.rangeEnd || 0)
        const rangeLabel = start && end ? `Ayahs ${start}\u2013${end}` : (start ? `Ayah ${start}` : '')
        return rangeLabel ? `${chapterName} \u00b7 ${rangeLabel}` : chapterName
      }
    },
    selectedStatsSessionRecord() {
      if (!this.sortedSavedSessions.length) return null
      return this.sortedSavedSessions.find(session => session.id === this.selectedStatsSessionId) || this.sortedSavedSessions[0] || null
    },
    activeExportErrorSessionId() {
      return this.exportSessionState.errorSessionId || ''
    },
    exportErrorMessage() {
      return this.exportSessionState.errorMessage || 'Unable to export this session right now.'
    },
    analyticsModalRecord() {
      if (!this.analyticsModalRecordId) return null
      return this.savedSessions.find(session => session.id === this.analyticsModalRecordId) || null
    },
    analyticsModalSessionLabel() {
      const session = this.analyticsModalRecord
      if (!session) return ''
      return this.getSessionPrimaryLabel(session)
    },
    analyticsModalSessionMeta() {
      const session = this.analyticsModalRecord
      if (!session) return ''
      const stats = this.normalizeSessionStats(session.stats || {}, session.config || {})
      return `Saved ${this.formatDate(session.savedAt)} · Duration ${this.formatTime(stats.time_spent_seconds || 0)}`
    },
    analyticsReportLabel() {
      if (this.analyticsReportState.loading) return 'Generating report...'
      if (this.analyticsReportState.success) return 'Download ready ✓'
      if (this.analyticsReportState.error) return 'Export failed, retry'
      return 'Download Report'
    },
    analyticsReportIcon() {
      if (this.analyticsReportState.loading) return 'bi-arrow-repeat spin'
      if (this.analyticsReportState.success) return 'bi-check2-circle'
      if (this.analyticsReportState.error) return 'bi-exclamation-triangle'
      return 'bi-download'
    },
    analyticsSummaryCards() {
      const data = this.analyticsModalData
      if (!data) return []
      return [
        { key: 'verses', label: 'Ayahs reviewed', value: `${data.metrics.verses_read}`, description: 'Distinct ayahs covered in this session.' },
        { key: 'time', label: 'Time memorising', value: this.formatTime(data.metrics.time_spent_seconds), description: 'Focused study time recorded for this session.' },
        { key: 'verse_plays', label: 'Verse plays', value: `${data.metrics.total_verse_play_count || 0}`, description: 'Total ayah audio starts across the selected range.' },
        { key: 'recall_strength', label: 'Recall strength', value: `${data.metrics.recall_strength || 'Low'}`, description: 'Simple snapshot of how strong this session felt overall.' }
      ]
    },
    analyticsAiCheckSummary() {
      const record = this.analyticsModalRecord
      if (!record) return null
      const config = record.config || {}
      const chapterId = Number(config.chapterId || this.chapterId || 0)
      const start = Number(config.rangeStart || this.rangeStart || 0)
      const end = Number(config.rangeEnd || this.rangeEnd || start)
      const checks = this.recordingsLibrary.filter(item => {
        if (!this.isAiCheckRecording(item)) return false
        if (chapterId && Number(item.chapterId || 0) !== chapterId) return false
        const ayah = Number(item.ayahNumber || 0)
        return ayah >= start && ayah <= end
      })
      if (!checks.length) return null
      const latest = [...checks].sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))[0]
      const average = Math.round(checks.reduce((sum, item) => sum + Number(item.accuracyScore || 0), 0) / checks.length)
      const stats = this.getRecitationResultStats({ ...latest, accuracyScore: average })
      const validation = buildValidationAggregate(checks.map(item => this.getRecitationValidationReport(item)).filter(Boolean))
      stats.unshift({
        key: 'checks',
        label: 'Recite checks',
        value: checks.length,
        description: 'Saved checks in this range.',
        tone: 'tone-neutral'
      })
      return {
        stats,
        validation,
        recommendation: latest.recommendation || this.getRecitationRecommendation(average, latest.mistakeBreakdown || latest.mistakes || {}),
        nextStep: this.getRecitationNextStep(latest)
      }
    },
    recitationLiveSummary() {
      const total = this.recitationLiveWords.length
      if (!total) return 'Preparing ayah words...'
      const checked = this.recitationLiveWords.filter(word => word.status !== 'pending').length
      return checked ? `${checked} of ${total} spoken words matched` : 'Waiting for your first recognized word'
    },
    recallCurrentWordIndex() {
      // The committed (finalized) alignment lags the user's voice because it
      // waits for end-of-utterance finals. recitationLiveWords already merges
      // the interim/preview alignment, so deriving the cursor from it lets the
      // reveal keep pace with what the reciter is actually saying. We take the
      // furthest-forward of the two so the cursor never rewinds when a final
      // transcript arrives slightly behind the live preview.
      const live = Array.isArray(this.recitationLiveWords) ? this.recitationLiveWords : []
      const committedRaw = Number(this.recitationAlignmentState?.currentIndex)
      const committed = Number.isFinite(committedRaw) && committedRaw >= 0 ? committedRaw : 0
      if (!live.length) return committed
      let liveIndex = live.findIndex(word => word?.status !== 'correct')
      if (liveIndex < 0) liveIndex = live.length
      return Math.max(committed, liveIndex)
    },
    aiRecallModeStatus() {
      if (!this.recitationCheckPanelOpen) {
        return { tone: 'idle', icon: 'bi-eye-fill', title: '', message: '' }
      }
      if (!this.aiRecallModeEnabled) {
        return {
          tone: 'setup',
          icon: 'bi-eye-fill',
          title: this.t('memorisation.recall_mode'),
          message: this.t('memorisation.recall_mode_enable_hint'),
        }
      }
      if (this.recitationCheckResult) {
        return {
          tone: 'complete',
          icon: 'bi-check-circle-fill',
          title: this.t('memorisation.recall_mode_complete_title'),
          message: this.t('memorisation.recall_mode_complete_message'),
        }
      }
      if (this.recitationCheckPreparing) {
        return {
          tone: 'preparing',
          icon: 'bi-arrow-repeat',
          title: this.t('memorisation.recall_mode_preparing_title'),
          message: this.t('memorisation.recall_mode_preparing_message'),
        }
      }
      if (this.recitationCheckRecording) {
        const total = this.recitationLiveWords.length
        const revealed = Math.max(0, this.recallCurrentWordIndex)
        const issue = (this.recitationLiveWords || []).find(word => ['incorrect', 'partial'].includes(word?.status))
        if (issue && this.aiRecitationStrictProgression) {
          return {
            tone: 'mistake',
            icon: 'bi-exclamation-triangle-fill',
            title: this.t('memorisation.recall_mode_mistake_title'),
            message: this.t('memorisation.recall_mode_mistake_message'),
          }
        }
        if (this.recallRevealCurrentIndex >= 0 && this.recallRevealCurrentIndex === this.recallCurrentWordIndex) {
          return {
            tone: 'peek',
            icon: 'bi-eye-fill',
            title: this.t('memorisation.recall_mode_peek_title'),
            message: this.t('memorisation.recall_mode_peek_message'),
          }
        }
        if (this.recitationAlignmentState?.complete) {
          return {
            tone: 'complete',
            icon: 'bi-check-circle-fill',
            title: this.t('memorisation.recall_mode_complete_title'),
            message: this.t('memorisation.recall_mode_complete_message'),
          }
        }
        if (revealed > 0 && total) {
          return {
            tone: 'progress',
            icon: 'bi-mic-fill',
            title: this.t('memorisation.recall_mode_listening_title'),
            message: this.t('memorisation.recall_mode_progress_message', { revealed, total }),
          }
        }
        return {
          tone: 'listening',
          icon: 'bi-mic-fill',
          title: this.t('memorisation.recall_mode_listening_title'),
          message: this.t('memorisation.recall_mode_listening_message'),
        }
      }
      return {
        tone: 'ready',
        icon: 'bi-eye-slash-fill',
        title: this.t('memorisation.recall_mode_ready_title'),
        message: this.t('memorisation.recall_mode_ready_message'),
      }
    },
    analyticsTotalAyahs() {
      return Math.max(1, Number(this.analyticsModalData?.metrics?.total_ayahs || 1))
    },
    analyticsCurrentProgressPercent() {
      const reviewed = Math.max(0, Number(this.analyticsModalData?.metrics?.verses_read || 0))
      return Math.max(0, Math.min(100, Math.round((reviewed / this.analyticsTotalAyahs) * 100)))
    },
    analyticsRemainingProgressPercent() {
      return Math.max(0, 100 - this.analyticsCurrentProgressPercent)
    },
    analyticsProgressSummary() {
      const reviewed = Math.max(0, Number(this.analyticsModalData?.metrics?.verses_read || 0))
      return `${reviewed} of ${this.analyticsTotalAyahs} ayahs covered`
    },
    analyticsRemainingSummary() {
      const remaining = Math.max(0, this.analyticsTotalAyahs - Number(this.analyticsModalData?.metrics?.verses_read || 0))
      return `${remaining} ayah${remaining === 1 ? '' : 's'} left to complete the range`
    },
    analyticsVerseSeries() {
      return this.analyticsModalData?.charts?.verseSeries || []
    },
    analyticsLineDots() {
      const series = this.analyticsVerseSeries
      if (!series.length) return []
      const width = 320
      const height = 160
      const innerWidth = 280
      const innerHeight = 112
      const left = 20
      const bottom = 132
      const maxValue = Math.max(1, ...series.map(item => Number(item.value || 0)))
      return series.map((item, index) => {
        const x = left + ((innerWidth * index) / Math.max(1, series.length - 1))
        const y = bottom - ((Number(item.value || 0) / maxValue) * innerHeight)
        return { ...item, x, y }
      })
    },
    analyticsLinePath() {
      const dots = this.analyticsLineDots
      if (!dots.length) return ''
      return dots.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    },
    analyticsLineAreaPath() {
      const dots = this.analyticsLineDots
      if (!dots.length) return ''
      const first = dots[0]
      const last = dots[dots.length - 1]
      return `${this.analyticsLinePath} L ${last.x} 132 L ${first.x} 132 Z`
    },
    analyticsYAxisTicks() {
      const series = this.analyticsVerseSeries
      const maxValue = Math.max(1, ...series.map(item => Number(item.value || 0)))
      const steps = 4
      return Array.from({ length: steps + 1 }).map((_, index) => {
        const value = Math.round((maxValue * (steps - index)) / steps)
        const y = 20 + ((112 * index) / steps)
        return { value, y, label: `${value}` }
      })
    },
    analyticsReplayLeaders() {
      const series = this.analyticsVerseSeries.filter(item => Number(item.value || 0) > 0)
      const maxValue = Math.max(1, ...series.map(item => Number(item.value || 0)))
      return series
        .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
        .slice(0, 6)
        .map(item => ({
          ...item,
          percent: Math.max(12, Math.round((Number(item.value || 0) / maxValue) * 100))
        }))
    },
    analyticsPlaybackBuckets() {
      const series = this.analyticsVerseSeries
      if (!series.length) return []
      const played = series.filter(item => Number(item.value || 0) > 0)
      const strong = series.filter(item => Number(item.value || 0) >= 3)
      const maxValue = Math.max(0, ...series.map(item => Number(item.value || 0)))
      return [
        {
          key: 'played',
          label: 'Ayahs touched',
          value: `${played.length}/${series.length}`,
          description: 'Ayahs that received at least one play.'
        },
        {
          key: 'repeat-heavy',
          label: 'Repeat-heavy ayahs',
          value: `${strong.length}`,
          description: 'Ayahs receiving deeper repetition.'
        },
        {
          key: 'peak',
          label: 'Highest replay',
          value: `${maxValue}x`,
          description: 'Most repeated ayah in this saved session.'
        },
        {
          key: 'average',
          label: 'Average plays',
          value: `${played.length ? (series.reduce((sum, item) => sum + Number(item.value || 0), 0) / played.length).toFixed(1) : '0.0'}x`,
          description: 'Average plays across ayahs that were used.'
        }
      ]
    },
    sliderRepetitionValue() {
      return Math.min(10, Math.max(1, Number(this.repetitionsPerStep || 1)))
    },
    repetitionDisplayValue() {
      return `${this.repetitionsPerStep}x`
    },
    sessionPlayCountValue() {
      return Math.max(0, Number(this.mutqinState?.sessionState?.play_count || 0))
    },
    totalVersePlayCountValue() {
      const counts = this.mutqinState?.sessionState?.verse_play_counts || {}
      return Object.values(counts).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0)
    },
    sessionVersePlaySummary() {
      const counts = this.mutqinState?.sessionState?.verse_play_counts || {}
      const sourceVerses = Array.isArray(this.verses) && this.verses.length
        ? this.verses
        : Object.keys(counts).map(key => ({ key, number: String(key).split(':')[1] || key }))
      return sourceVerses
        .map(verse => ({
          key: verse.key,
          label: verse.number ? `Ayah ${verse.number}` : String(verse.key || 'Ayah'),
          count: Math.max(0, Number(counts?.[verse.key] || 0))
        }))
        .filter(item => item.count > 0)
        .slice(0, 6)
    },
    onboardingStepContent() {
      return this.onboardingSteps[this.onboardingStepIndex] || this.onboardingSteps[0]
    },
    chainingProgressLabel() {
      if (!this.chainingEnabled) return ''
      const entry = this.activeQueueEntry
      if (!entry) return 'Ready'
      const total = Math.max(1, Number(entry?.totalRepeats || 1))
      const current = Math.max(1, Number(entry?.repeatCount || 1))
      const repeatSuffix = total > 1 ? `repeat ${current}/${total}` : 'single pass'

      if (entry?.phase === 'Linking') {
        const pos = Math.max(1, Number(entry.sequencePosition || 1))
        const all = Math.max(1, Number(entry.sequenceTotal || 1))
        const label = all > 1 ? `pair ${pos}/${all}` : 'single ayah'
        return `${label} · ${repeatSuffix}`
      }
      if (entry?.phase === 'Cumulative') {
        const pos = Math.max(1, Number(entry.sequencePosition || 1))
        const all = Math.max(1, Number(entry.sequenceTotal || 1))
        return `block ${pos}/${all} · ${repeatSuffix}`
      }
      return repeatSuffix
    },
    loopCountOptions() {
      return [
        { value: 1, shortLabel: '1x', label: 'Play once' },
        { value: 3, shortLabel: '3x', label: 'Repeat 3 times' },
        { value: 5, shortLabel: '5x', label: 'Repeat 5 times' },
        { value: 10, shortLabel: '10x', label: 'Repeat 10 times' },
        { value: 'infinite', shortLabel: 'Inf', label: 'Infinite loop' }
      ]
    },
    chainingNextStepLabel() {
      if (!this.chainingEnabled) return ''
      if (this.chainingMethod === 'cumulative') return this.t('memorisation.techniques.chainingNextCumulative')
      return this.t('memorisation.techniques.chainingNextLinking')
    },
    chainingWhyHint() {
      if (!this.chainingEnabled) return ''
      if (this.chainingMethod === 'cumulative') return this.t('memorisation.techniques.chainingWhyCumulative')
      return this.t('memorisation.techniques.chainingWhyLinking')
    },
    currentActionLabel() {
      if (!this.hasVerses) return 'Choose a surah and ayah range to begin.'
      if (!this.effectiveActiveVerseKey) return 'Start the session to build your memorisation queue.'
      if (this.guidedUiStep === 'review') return 'Review this ayah, then continue.'
      if (this.guidedUiStep === 'recall') return 'Recite from memory, then reveal to confirm.'
      if (this.isPlaying) return 'Listen to the active ayah and follow calmly.'
      return 'Press play, then recite and repeat at your pace.'
    },
    reviewPriorityLabel() {
      return ''
    },
    feedbackCounts() {
      const ayahs = Object.values(this.mutqinState?.ayahs || {})
      let mastered = 0
      let weak = 0
      let repeat = 0
      ayahs.forEach(ayah => {
        if (Number(ayah?.mastery_level || 0) >= 5 || ayah?.status === 'mastered') mastered += 1
        if (Number(ayah?.weak_count || 0) > 0 || ayah?.status === 'weak') weak += 1
        if (Number(ayah?.repetition_count || 0) > 0 && Number(ayah?.mastery_level || 0) < 5) repeat += 1
      })
      return { mastered, weak, repeat }
    },
    sessionFeedback() {
      const queue = this.queue || []
      const total = Math.max(1, queue.length)
      const done = Math.max(0, Number(this.queueIndex || 0))
      const repetitionProgress = Math.max(0, Math.min(100, Math.round((done / total) * 100)))
      const chainTotal = Math.max(1, queue.filter(item => ['Linking', 'Cumulative'].includes(item?.phase)).length || total)
      const chainDone = Math.max(0, queue.slice(0, done).filter(item => ['Linking', 'Cumulative'].includes(item?.phase)).length)
      const chainProgress = Math.max(0, Math.min(100, Math.round((chainDone / chainTotal) * 100)))
      const retentionTotal = Math.max(1, queue.filter(item => item?.phase === 'Retention').length)
      const retentionDone = Math.max(0, queue.slice(0, done).filter(item => item?.phase === 'Retention').length)
      const retentionProgress = Math.max(0, Math.min(100, Math.round((retentionDone / retentionTotal) * 100)))
      return { chainProgress, repetitionProgress, retentionProgress }
    },
    hasSessionFeedback() {
      return Array.isArray(this.queue) && this.queue.length > 0
    },
    hasSessionStarted() {
      return this.isSessionLive
    },
    isSessionLive() {
      return !!this.mutqinState?.sessionState?.active && this.hasSessionFeedback && !this.sessionCompleted
    },
    isSessionCompleted() {
      return !!this.sessionCompleted || this.centralSession?.sessionStatus === 'completed'
    },
    shouldShowReadingWorkspace() {
      return this.hasVerses
    },
    resumeFeedback() {
      const payload = this.continueSessionPayload
      const queue = payload?.queue || this.queue || []
      const current = Math.max(0, Number(payload?.queueIndex || this.queueIndex || 0))
      const total = Math.max(1, queue.length)
      const repetitionProgress = Math.max(0, Math.min(100, Math.round((current / total) * 100)))
      const chainTotal = Math.max(1, queue.filter(item => ['Linking', 'Cumulative'].includes(item?.phase)).length || total)
      const chainDone = Math.max(0, queue.slice(0, current).filter(item => ['Linking', 'Cumulative'].includes(item?.phase)).length)
      const chainProgress = Math.max(0, Math.min(100, Math.round((chainDone / chainTotal) * 100)))
      const retentionTotal = Math.max(1, queue.filter(item => item?.phase === 'Retention').length || 1)
      const retentionDone = Math.max(0, queue.slice(0, current).filter(item => item?.phase === 'Retention').length)
      const retentionProgress = Math.max(0, Math.min(100, Math.round((retentionDone / retentionTotal) * 100)))
      return { chainProgress, repetitionProgress, retentionProgress }
    },

    guidedUiStep() {
      const item = this.mutqinState?.sessionState?.queue?.[this.mutqinState?.sessionState?.current_index || 0]
      if (item?.phase === 'Retention') return 'review'
      return 'learn'
    },
    reciterFollowModeActive() {
      return this.playMode === 'follow' && this.recitationWindowActive
    },
    reciterFollowPrompt() {
      if (!this.reciterFollowModeActive) return ''
      return this.t('memorisation.recite_now_window', { seconds: Math.max(0, Number(this.recitationWindowRemaining || 0)) })
    },
    talqinRecitationTurnActive() {
      return this.talqinModeActive && this.recitationWindowActive
    },
    talqinRecitationPrompt() {
      if (!this.talqinRecitationTurnActive) return ''
      const seconds = Math.max(0, Number(this.recitationWindowRemaining || 0))
      return `Talqin is active. Your turn to recite now${seconds ? ` · ${seconds}s left` : ''}.`
    },
    practiceTurnCalloutVisible() {
      return this.talqinRecitationTurnActive || this.reciterFollowModeActive
    },
    practiceTurnCalloutMessage() {
      if (this.talqinRecitationTurnActive) return this.talqinRecitationPrompt
      if (this.reciterFollowModeActive) return this.reciterFollowPrompt
      return ''
    },
    talqinModeActive() {
      if (this.mutqinState?.sessionState?.active) {
        return !!this.mutqinState?.sessionState?.config?.talqinModeEnabled
      }
      return !!this.currentConfig?.talqinModeEnabled
    },

    sessionConfig() {
      return this.buildSessionConfig(this.currentMode)
    },

    hasVerses() {
      const config = this.currentConfig
      return config.verses?.length > 0
    },
    continueSessionMeta() {
      const payload = this.continueSessionPayload
      if (!payload) return 'Your last study session is ready to continue with the same setup.'
      const ayah = payload.activeVerseKey ? String(payload.activeVerseKey).split(':')[1] : null
      const minutesAgo = Math.max(0, Math.round((Date.now() - Number(payload.timestamp || 0)) / 60000))
      const timeLabel = minutesAgo < 1 ? 'saved just now' : `saved ${minutesAgo} min ago`
      return `Your ayah, progress, audio position, and memorisation settings are ready to restore from ayah ${ayah || payload.config?.rangeStart || 1}; ${timeLabel}.`
    },
    smartResumeDetails() {
      const payload = this.continueSessionPayload || {}
      const config = payload.config || {}
      const start = Number(config.rangeStart || 1)
      const end = Number(config.rangeEnd || start)
      const activeAyah = payload.activeVerseKey ? String(payload.activeVerseKey).split(':')[1] : ''
      const total = Math.max(1, end - start + 1)
      const current = Math.max(start, Math.min(end, Number(activeAyah || start)))
      const covered = Math.max(0, Math.min(total, current - start))
      const fallbackPercent = Math.round((covered / total) * 100)
      const queue = Array.isArray(payload.queue) ? payload.queue : []
      const queueTotal = Math.max(1, queue.length || total)
      const queueIndex = Math.max(0, Math.min(queueTotal, Number(payload.queueIndex ?? payload.mutqinSessionIndex ?? covered)))
      const progressPercent = Math.max(0, Math.min(100, queue.length ? Math.round((queueIndex / queueTotal) * 100) : fallbackPercent))
      const minutesAgo = Math.max(0, Math.round((Date.now() - Number(payload.timestamp || 0)) / 60000))
      const saved = minutesAgo < 1
        ? 'Saved just now'
        : minutesAgo < 60
          ? `Saved ${minutesAgo} min ago`
          : `Saved ${Math.round(minutesAgo / 60)} hr ago`
      return {
        focus: `Resume at ayah ${activeAyah || start} of ${end}`,
        saved,
        progressPercent,
        progressLabel: progressPercent > 0 ? 'Previous progress' : 'Ready to begin this range'
      }
    },

    resumeModalTitle() {
      if (!this.canResumePreviousSession) return 'Welcome back'
      const c = this.continueSessionPayload.config
      const chapter = this.chapters.find(item => Number(item.id) === Number(c.chapterId))
      return chapter?.name_simple || 'Previous session'
    },

    resumeWhatNext() {
      if (!this.canResumePreviousSession) {
        return 'Choose how you want to begin. Start a fresh session now, or continue after you save a session snapshot later.'
      }
      if (this.dueCount) return `You have ${this.dueCount} verses due for review. Start fresh, repeat the range, continue from your last ayah, or save this session first.`
      return 'Choose how you want to continue. You can start fresh, repeat the range from the beginning, continue from your last ayah, or save this session first.'
    },

    resumeSavedAtLabel() {
      const ts = Number(this.continueSessionPayload?.timestamp || 0)
      if (!ts || !Number.isFinite(ts)) return ''
      return new Date(ts).toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    hasSelectedSurah() {
      const chapterId = this.currentConfig.chapterId
      return chapterId && chapterId > 0
    },

    activeChapter() {
      const id = Number(this.chapterId || 0)
      if (!id || !Array.isArray(this.chapters) || !this.chapters.length) return null
      return this.chapters.find(c => Number(c.id) === id) || null
    },

    activeChapterName() {
      return this.activeChapter?.name_simple || 'Choose surah'
    },

    versesMasteredDeltaThisWeek() {
      try {
        const data = this.readScopedStorageValue('masteredWeekly', 'telawa.masteredWeekly', null)
        if (!data || !Array.isArray(data.series)) return 0
        return data.series.reduce((a, b) => a + Number(b || 0), 0)
      } catch {
        return 0
      }
    },

    chapterId: {
      get() { return this.currentConfig.chapterId || 0 },
      set(val) {
        const numVal = Number(val) || 0
        const store = this.getModeStore(this.currentMode)
        if (store) store.chapterId = numVal
      }
    },

    rangeStart: {
      get() { return this.currentConfig.rangeStart },
      set(val) {
        const store = this.getModeStore(this.currentMode)
        if (store) store.rangeStart = val
      }
    },

    rangeEnd: {
      get() { return this.currentConfig.rangeEnd },
      set(val) {
        const store = this.getModeStore(this.currentMode)
        if (store) store.rangeEnd = val
      }
    },

    reciterId: {
      get() { return this.currentConfig.reciterId },
      set(val) {
        const store = this.getModeStore(this.currentMode)
        if (store) store.reciterId = val
      }
    },

    speed: {
      get() { return this.currentConfig.speed },
      set(val) {
        const safeSpeed = this.normalizePlaybackSpeed(val)
        const store = this.getModeStore(this.currentMode)
        if (store) store.speed = safeSpeed
      }
    },

    delay: {
      get() { return this.currentConfig.delay },
      set(val) {
        const safeDelay = Math.max(0, Number.isFinite(Number(val)) ? Number(val) : 0)
        const store = this.getModeStore(this.currentMode)
        if (store) store.delay = safeDelay
      }
    },

    playMode: {
      get() { return this.currentConfig.playMode },
      set(val) {
        const safeMode = ['auto', 'manual', 'follow'].includes(val) ? val : 'auto'
        const store = this.getModeStore(this.currentMode)
        if (store) store.playMode = safeMode
      }
    },
    talqinModeEnabled: {
      get() { return !!this.currentConfig.talqinModeEnabled },
      set(val) {
        const store = this.getModeStore(this.currentMode)
        if (store) store.talqinModeEnabled = !!val
      }
    },
    recitationWindowSeconds: {
      get() { return this.currentConfig.recitationWindowSeconds },
      set(val) {
        const safeSeconds = Math.max(5, Math.min(30, Number.isFinite(Number(val)) ? Number(val) : 8))
        const store = this.getModeStore(this.currentMode)
        if (store) store.recitationWindowSeconds = safeSeconds
      }
    },

    order: {
      get() { return this.currentConfig.order },
      set(val) {
        const store = this.getModeStore(this.currentMode)
        if (store) store.order = val
      }
    },

    visualMode() {
      return 'standard'
    },

    verses: {
      get() { return this.currentConfig.verses },
      set(val) {
        const store = this.getModeStore(this.currentMode)
        if (store) store.verses = val
      }
    },

    activeKey: {
      get() { return this.currentConfig.activeKey },
      set(val) {
        const store = this.getModeStore(this.currentMode)
        if (store) store.activeKey = val
      }
    },

    queue: {
      get() { return this.currentConfig.queue },
      set(val) {
        const store = this.getModeStore(this.currentMode)
        if (store) store.queue = val
      }
    },

    queueIndex: {
      get() { return this.currentConfig.queueIndex },
      set(val) {
        const store = this.getModeStore(this.currentMode)
        if (store) store.queueIndex = val
      }
    },

    totalVerses() {
      return Math.max(0, this.rangeEnd - this.rangeStart + 1)
    },

    currentPosition() {
      const key = this.effectiveActiveVerseKey || this.activeKey
      if (!key) return 1
      const num = parseInt(String(key).split(':')[1])
      return Math.max(1, num - this.rangeStart + 1)
    },

    sessionContextBadge() {
      const chapterName = this.currentChapter?.name_simple || this.activeChapterName || 'Session'
      const total = Math.max(1, Number(this.totalVerses || 1))
      const ayah = Math.max(1, Math.min(total, Number(this.currentPosition || 1)))
      return `Memorising - ${chapterName} - Ayah ${ayah}/${total}`
    },

    remainingAyahs() {
      return Math.max(0, this.totalVerses - this.currentPosition)
    },

    progressPercent() {
      if (!this.totalVerses) return 0
      return Math.round((this.currentPosition / this.totalVerses) * 100)
    },

    canPrev() {
      return this.queueIndex > 0
    },

    canNext() {
      return this.queueIndex < this.queue.length - 1
    },

    seekPercent() {
      if (!this.duration) return 0
      return (this.currentTime / this.duration) * 100
    },

    plannerEstimatedDays() {
      const perDay = Math.max(1, this.plannerConfig.versesPerDay || 1)
      const total = this.plannerConfig.totalVersesInSurah || 1
      return Math.ceil(total / perDay)
    },

    plannerEstimatedTimePerDay() {
      const perDay = Math.max(1, this.plannerConfig.versesPerDay || 1)
      const minutesPerVerse = this.plannerConfig.minutesPerVerse || 2
      return perDay * minutesPerVerse
    },

    plannerTotalVerses() {
      return this.plannerConfig.totalVersesInSurah || 0
    },

    plannerCompletionDateFormatted() {
      const days = this.plannerEstimatedDays
      if (!days || days === 0) return '—'
      const d = new Date()
      d.setDate(d.getDate() + days)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    },

    plannerCompletionDateFull() {
      const days = this.plannerEstimatedDays
      if (!days || days === 0) return '—'
      const d = new Date()
      d.setDate(d.getDate() + days)
      return d.toDateString()
    },

    isLoggedIn() {
      return !!this.auth?.check
    },

    sessionTypeInfo() {
      return { key: 'session', label: this.t('memorisation.sessionType.session'), tone: 'session' }
    },

    quranFontFamily() {
      const fonts = {
        amiri: "'Amiri', 'Noto Naskh Arabic', serif",
        naskh: "'Noto Naskh Arabic', 'Amiri', serif",
        scheherazade: "'Scheherazade New', 'Noto Naskh Arabic', serif",
        lateef: "'Lateef', 'Amiri', serif",
        uthmanic: "'UthmanicHafs', 'Amiri', 'Noto Naskh Arabic', serif"
      }
      return fonts[this.quranFont] || fonts.uthmanic
    },

    collapsedPlayerTitle() {
      const verse = this.verses.find(v => v.key === this.activeKey)
      if (!verse) return this.currentChapter?.name_simple || this.t('memorisation.sessionType.nowPlaying')
      return `${this.currentChapter?.name_simple || this.t('memorisation.sessionType.session')} · ${this.t('memorisation.sessionType.ayah', { n: verse.number })}`
    },

    collapsedPlayerSubtitle() {
      if (!this.activeKey) return `${this.sessionTypeInfo.label} · 0% complete`
      return `${this.sessionTypeInfo.label} · ${this.queueIndex + 1}/${this.queue.length} · ${this.formatTime(this.currentTime)} / ${this.formatTime(this.duration)}`
    },

    railPrimaryLabel() {
      return this.isPlaying ? this.t('memorisation.sessionType.pause') : this.t('memorisation.sessionType.startSession')
    },
    guidedPhaseLabel() {
      if (this.guidedUiStep === 'review') return this.t('memorisation.guided.review')
      if (this.guidedUiStep === 'recall') return this.t('memorisation.guided.recall')
      if (this.guidedUiStep === 'practice') return this.t('memorisation.guided.practice')
      return this.t('memorisation.guided.learn')
    },
    guidedPrimaryCta() {
      if (this.guidedUiStep === 'learn') return this.t('memorisation.guided.listenFollow')
      if (this.guidedUiStep === 'practice') return this.t('memorisation.guided.tryReciting')
      return this.t('memorisation.guided.continue')
    },
    guidedInstruction() {
      if (this.guidedUiStep === 'learn') return this.t('memorisation.guided.learnInstruction')
      if (this.guidedUiStep === 'practice') return this.t('memorisation.guided.practiceInstruction')
      if (this.guidedUiStep === 'recall') return this.t('memorisation.guided.recallInstruction')
      if (this.guidedUiStep === 'review') return this.t('memorisation.guided.reviewInstruction')
      return this.t('memorisation.guided.defaultInstruction')
    },
    activeCardKicker() {
      if (this.guidedUiStep === 'review') return this.t('memorisation.guided.kickerReview')
      if (this.isPlaying) return this.t('memorisation.guided.kickerPlaying')
      return this.t('memorisation.guided.kickerDefault')
    },
    activeCardBody() {
      if (this.guidedUiStep === 'review') {
        return this.dueCount
          ? this.t('memorisation.guided.reviewBodyDue', { count: this.dueCount })
          : this.t('memorisation.guided.reviewBodyDefault')
      }
      return `${this.currentLearningPrompt} ${this.t('memorisation.guided.reviewBodySuffix')}`
    },

    plannerKeyboardActive() {
      return this.showPlannerModal
    },

    hasChainingMethodSelected() {
      return ['linking', 'cumulative'].includes(this.chainingMethod)
    },

    canStartSession() {
      const config = this.sessionConfig
      return this.appReady &&
        // Allow starting when verses are already loaded, even if a background refresh is in progress.
        (this.isDataReady || (!!this.verses.length || !!this.currentConfig.verses.length)) &&
        !!config.chapterId &&
        config.rangeStart > 0 &&
        config.rangeEnd >= config.rangeStart &&
        (!!this.verses.length || !!this.currentConfig.verses.length) &&
        (!this.chainingEnabled || this.hasChainingMethodSelected)
    },

    currentSessionExplanation() {
      const modeLabel = this.currentMode === 'advanced'
        ? this.t('memorisation.sessionType.advanced')
        : this.t('memorisation.sessionType.beginner')
      const chaining = this.chainingMethodLabel.toLowerCase()
      return this.t('memorisation.sessionType.sessionExplanation', { mode: modeLabel, chaining })
    },
    currentControlInfo() {
      const labels = []
      labels.push(this.t('memorisation.common.fontLabel', { font: this.getCurrentFontLabel() }))
      if (this.showTranslation) labels.push(this.t('memorisation.common.translationOn'))
      if (this.showTransliteration) labels.push(this.t('memorisation.common.transliterationOn'))
      if (this.showWordByWord) labels.push(this.t('memorisation.common.wordByWordOn'))
      if (this.wordByWordAudioEnabled) labels.push(this.t('memorisation.common.wordAudioOn'))
      if (this.tajweedEnabled) labels.push(this.t('memorisation.common.tajweedOn'))
      return labels.length ? labels.join(' • ') : this.t('memorisation.common.noReadingAids')
    },
    appliedFeaturePills() {
      const pills = [`${this.guidedPhaseLabel} mode`, `Font: ${this.getCurrentFontLabel()}`]
      if (this.showTranslation) pills.push('Translation')
      if (this.showTransliteration) pills.push('Transliteration')
      if (this.showWordByWord) pills.push('Word by word')
      if (this.wordByWordAudioEnabled) pills.push('Word audio')
      if (this.tajweedEnabled) pills.push('Tajweed')
      return pills
    },

    setupReadinessHint() {
      if (!this.chapters.length) return 'Loading surah list...'
      if (!this.hasSelectedSurah) return 'Choose a surah and verse range.'
      const range = `${this.rangeStart}-${this.rangeEnd}`
      return `${this.activeChapterName} ayahs ${range}. Start when ready.`
    },

    startButtonHelp() {
      if (!this.hasSelectedSurah) return 'Choose a surah first'
      if (!this.isDataReady) return 'Verses are still loading'
      if (!this.canStartSession) return 'Check the ayah range and optional tools'
      return 'Start guided memorisation'
    },

    etaSubtext() {
      if (!this.remainingAyahs) return 'Ready to complete'
      return `Review + repetition included`
    },

    etaLabel() {
      const remainingItems = (this.queue || []).slice(this.queueIndex)
      if (!remainingItems.length) return '0 min'

      const reviewTimePerAyah = 5
      let totalSeconds = 0

      remainingItems.forEach((item, index) => {
        totalSeconds += this.getQueueItemAudioSeconds(item, index === 0) + reviewTimePerAyah
      })

      const configuredDelay = Number.isFinite(Number(this.delay)) ? Math.max(0, Number(this.delay)) : 0
      const delaySeconds = configuredDelay * Math.max(0, remainingItems.length - 1)
      totalSeconds += delaySeconds
      const minutes = Math.max(0, Math.ceil(totalSeconds / 60))
      return `≈ ${minutes} min`
    },

    etaLabelAudioOnly() {
      const remainingItems = (this.queue || []).slice(this.queueIndex)
      if (!remainingItems.length) return '0 min'

      let totalAudioSeconds = 0
      remainingItems.forEach((item, index) => {
        totalAudioSeconds += this.getQueueItemAudioSeconds(item, index === 0)
      })

      const minutes = Math.max(0, Math.ceil(totalAudioSeconds / 60))
      return `≈ ${minutes} min`
    },

    currentChainPhase() {
      return 0
    },

    toolsHeaderTitle() {
      if (this.tab === 'stats') return 'Insights'
      if (this.tab === 'settings') return 'Settings'
      if (this.tab === 'advanced') return 'Advanced session'
      return 'Guided session setup'
    },

    contextLabel() {
      const surah = this.currentChapter?.name_simple || 'No surah selected'
      const range = this.chapterId ? `${this.rangeStart}-${this.rangeEnd}` : ''
      return `${surah}${range ? ` • ${range}` : ''} • ${this.sessionTypeInfo.label}`
    },

    activeVerseIndex() {
      if (!this.activeVerseKey || !this.verses.length) return -1
      return this.verses.findIndex(v => v.key === this.activeVerseKey)
    },

    canGoPrev() {
      return this.activeVerseIndex > 0
    },

    canGoNext() {
      return this.activeVerseIndex >= 0 && this.activeVerseIndex < this.verses.length - 1
    },

    mushafPageSize() {
      if (typeof window !== 'undefined' && window.innerWidth < 680) return 3
      if (typeof window !== 'undefined' && window.innerWidth < 980) return 4
      return 5
    },

    mushafDisplayVerses() {
      const modeVerses = Array.isArray(this.currentConfig?.verses) ? this.currentConfig.verses : []
      const localVerses = Array.isArray(this.verses) ? this.verses : []
      return modeVerses.length ? modeVerses : localVerses
    },

    mushafPages() {
      const sourceVerses = this.mushafDisplayVerses
      if (!sourceVerses.length) return []
      const pageSize = Math.max(1, Number(this.mushafPageSize || 5))
      const pages = []
      for (let index = 0; index < sourceVerses.length; index += pageSize) {
        const verses = sourceVerses.slice(index, index + pageSize)
        pages.push({
          id: `mushaf-${verses[0].key}-${verses[verses.length - 1].key}`,
          verses,
          startNumber: verses[0].number,
          endNumber: verses[verses.length - 1].number
        })
      }
      return pages
    },

    mushafSurahTitle() {
      const chapterId = Number(this.chapterId || this.currentChapter?.id || this.currentConfig?.chapterId || 0)
      const fallbackTitles = {
        1: 'سُورَةُ الْفَاتِحَةِ',
        112: 'سُورَةُ الْإِخْلَاصِ',
        113: 'سُورَةُ الْفَلَقِ',
        114: 'سُورَةُ النَّاسِ'
      }
      return this.currentChapter?.name_arabic || fallbackTitles[chapterId] || `سُورَةُ ${this.currentChapter?.name_simple || this.activeChapterName || ''}`
    },

    showMushafBismillah() {
      const chapterId = Number(this.chapterId || this.currentChapter?.id || this.currentConfig?.chapterId || 0)
      return chapterId !== 9
    },

    mushafTrackStyle() {
      const pageIndex = this.safeMushafPageIndex
      return {
        transform: `translateX(${-pageIndex * 100}%)`
      }
    },

    safeMushafPageIndex() {
      if (!this.mushafPages.length) return 0
      return Math.max(0, Math.min(Number(this.mushafPageIndex || 0), this.mushafPages.length - 1))
    },

    canGoPreviousMushafPage() {
      return this.safeMushafPageIndex > 0
    },

    canGoNextMushafPage() {
      return this.safeMushafPageIndex < this.mushafPages.length - 1
    },

    quizAccuracy() {
      const stats = this.quizSessionStats
      if (stats?.total) {
        return Math.round((Number(stats.correct || 0) / Number(stats.total)) * 100)
      }
      if (!this.quizQueue.length) return 0
      return Math.round((this.quizScore / this.quizQueue.length) * 100)
    },

    quizSummary() {
      const stats = this.quizSessionStats || { total: 0, correct: 0, qualitySum: 0, mistakes: [] }
      const total = Math.max(0, Number(stats.total || 0))
      const correct = Math.max(0, Number(stats.correct || 0))
      const accuracy = total ? Math.round((correct / total) * 100) : 0
      const avgQuality = total ? Math.round((Number(stats.qualitySum || 0) / total) * 10) / 10 : 0
      const durationMs = Math.max(0, Number(stats.durationMs || 0))
      const timeSpent = this.formatTime(Math.round(durationMs / 1000))
      const perSkill = Object.entries(stats.skillTotals || {}).map(([key, value]) => {
        const totalAnswers = Math.max(0, Number(value?.total || 0))
        const skillCorrect = Math.max(0, Number(value?.correct || 0))
        const skillAccuracy = totalAnswers ? Math.round((skillCorrect / totalAnswers) * 100) : 0
        const labels = {
          recite_text: this.t('memorisation.quiz.skills.recite_text'),
          audio_recall: this.t('memorisation.quiz.skills.audio_recall'),
          meaning: this.t('memorisation.quiz.skills.meaning')
        }
        return { key, label: labels[key] || key, total: totalAnswers, correct: skillCorrect, accuracy: skillAccuracy }
      })
      const bestSkill = perSkill.slice().sort((a, b) => b.accuracy - a.accuracy || b.correct - a.correct)[0]?.label
        || this.t('memorisation.quiz.skills.none')
      const planTarget = this.todayPlan?.quizKeys?.length || this.todayPlan?.reviewKeys?.length || total
      const planProgress = `${Math.min(total, planTarget)} / ${planTarget}`
      const explanation = accuracy >= 85
        ? this.t('memorisation.quiz.summary.strong')
        : accuracy >= 60
          ? this.t('memorisation.quiz.summary.moderate')
          : this.t('memorisation.quiz.summary.weak')
      const engineLink = this.todayPlan
        ? this.t('memorisation.quiz.summary.enginePlan')
        : (this.chainingEnabled || this.order === 'chain')
          ? this.t('memorisation.quiz.summary.engineChain')
          : this.t('memorisation.quiz.summary.engineDefault')
      return {
        total,
        correct,
        accuracy,
        avgQuality,
        mistakes: stats.mistakes || [],
        skills: perSkill,
        bestSkill,
        timeSpent,
        planProgress,
        explanation,
        engineLink
      }
    },

    quizContextLabel() {
      if (this.todayPlan) {
        return this.t('memorisation.quiz.contextPlan', { mode: this.sessionTypeInfo.label })
      }
      if (this.chainingEnabled || this.order === 'chain') {
        return this.t('memorisation.quiz.contextChain')
      }
      return this.t('memorisation.quiz.contextFocused')
    },

    quizCardTypeLabel() {
      const type = this.quizCard?.type || 'question'
      const key = `memorisation.quiz.types.${type}`
      const translated = this.t(key)
      return translated === key ? this.t('memorisation.quiz.types.question') : translated
    },

    quizModeOptions() {
      return [
        { value: 'mixed', label: this.t('memorisation.quiz.types.mixed') },
        { value: 'flashcard', label: this.t('memorisation.quiz.types.flashcard') },
        { value: 'mcq', label: this.t('memorisation.quiz.types.mcq') },
        { value: 'audio_mcq', label: this.t('memorisation.quiz.types.audio_mcq') },
        { value: 'blank', label: this.t('memorisation.quiz.types.blank') }
      ]
    },

    quizFocusOptions() {
      return [
        { value: 'adaptive', label: this.t('memorisation.quiz.skills.adaptive') },
        { value: 'recite_text', label: this.t('memorisation.quiz.skills.recite_text') },
        { value: 'audio_recall', label: this.t('memorisation.quiz.skills.audio_recall') },
        { value: 'meaning', label: this.t('memorisation.quiz.skills.meaning') }
      ]
    },

    quizLengthOptions() {
      return [4, 6, 8, 10, 12]
    },

    nextActionDescription() {
      return 'Select a surah and verses to start memorising'
    }
  },

  async mounted() {
    document.addEventListener('click', this.handleClickOutside);
    this.activeLocale = this.$i18n?.locale?.value || 'en'
    this.appReady = true

    try {
      const authenticatedWorkspace = this.learningBackendEnabled()
      const justRegistered = authenticatedWorkspace && !!this.auth?.just_registered
      this.syncWorkspaceStorageBridge()
      this.hydrateAuthenticatedWorkspaceStateFromLocalStorage()

      if (this.auth?.locale && this.$setLocale) {
        await this.$setLocale(this.auth.locale)
        this.activeLocale = this.auth.locale
      }
      this.handleLocaleChange = (event) => {
        this.activeLocale = event?.detail?.locale || this.$i18n?.locale?.value || 'en'
      }
      this.handleGlobalThemeChange = (event) => {
        const nextTheme = event?.detail?.theme || document.documentElement.getAttribute('data-theme') || 'light'
        this.theme = this.normalizeThemeToken(nextTheme)
      }
      this.handleThemeStorageSync = (event) => {
        if (event?.key === HIFZ_PLAN_STORAGE_KEY || event?.key === AYAH_PROGRESS_STORAGE_KEY) {
          this.refreshHifzJourneyState()
          return
        }
        if (event?.key && event.key !== 'mutqin-theme') return
        const nextTheme = event?.newValue || document.documentElement.getAttribute('data-theme') || 'light'
        this.theme = this.normalizeThemeToken(nextTheme)
      }
      window.addEventListener('mutqin:theme-change', this.handleGlobalThemeChange)
      window.addEventListener('mutqin:locale-change', this.handleLocaleChange)
      window.addEventListener('storage', this.handleThemeStorageSync)
      this.themeObserver = new MutationObserver(() => {
        const nextTheme = document.documentElement.getAttribute('data-theme') || 'light'
        if (nextTheme !== this.theme) this.theme = this.normalizeThemeToken(nextTheme)
      })
      this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
      this.watchActiveVerse()
      this.$nextTick(() => {
        const navbar = document.querySelector('.navbar')
        if (navbar) {
          const navbarHeight = navbar.offsetHeight
          document.documentElement.style.setProperty('--navbar-height', `${navbarHeight}px`)
        }
      })
      // Re-apply highlights when word-by-word toggles
      this.$watch('showWordByWord', () => {
        if (this.anchorModeEnabled) {
          this.scheduleAnchorHighlights()
        }
      })

      // Re-apply when tajweed toggles
      this.$watch('tajweedEnabled', () => {
        if (this.anchorModeEnabled) {
          this.scheduleAnchorHighlights()
        }
      })
      this.$watch('effectiveActiveVerseKey', () => {
        if (this.readingViewMode === 'mushaf') this.syncMushafPageToActiveVerse()
      })
      this.$watch(() => this.mushafPages.length, () => {
        this.syncMushafPageToActiveVerse()
      })
      this.unwatchMutqinState = watchMutqinState(this.mutqinState, undefined, () => this.scheduleLearningSync())
      this.refreshHifzJourneyState()
      this.loadVerseFontSizes()
      if (authenticatedWorkspace) {
        await this.initLearningBackend()
      } else {
        this.loadSavedSessions()
        this.migrateLocalStorage()
      }
      this.loadUiState()
      if (this.auth?.check && this.auth.ai_recall_mode_enabled !== undefined) {
        this.aiRecallModeEnabled = !!this.auth.ai_recall_mode_enabled
      }
      this.loadCentralSessionState()
      this.restoreSessionState()
      await this.loadChapters()
      await this.loadReciters()
      this.loadOfflineCatalog()
      this.loadSm2()
      this.loadEvents()
      this.loadPlanner()
      this.loadMetrics()
      this.loadAnalytics()
      this.initAudio()
      this.restoreAudioState()
      this.theme = document.documentElement.getAttribute('data-theme') || this.theme || 'light'
      this.syncGlobalTheme(this.theme)
      this.loadBookmarksPins()
      this.setupWordClickHandler()
      this.loadSavedSessions()
      this.loadContinueSessionPrompt()
      this.updateMasteredWeekly()
      this.loadRecordingsLibrary()

      const shouldAutoRestorePersistedSession = !justRegistered
        && !this.auth?.just_logged_in
        && this.canResumePreviousSession

      if (shouldAutoRestorePersistedSession) {
        await this.hydrateSessionFromPayload(this.continueSessionPayload, {
          banner: false
        })
        this.showResumeModal = false
        this.returningUserChoicePending = false
        this.showTools = false
        this.isDataReady = true
      }

      if (this.isLoggedIn && !justRegistered) {
        this.maybeShowReadyToBeginModal()
      }

      if (shouldAutoRestorePersistedSession) {
        this.isDataReady = true
      } else if (justRegistered) {
        this.applyDefaultWorkspaceSessionConfig({ openSetup: false, silent: true })
        this.openOnboardingModal()
        this.isDataReady = true
      } else if (this.currentMode === 'advanced' && this.advanced.chapterId) {
        this.currentMode = 'advanced'
        this.tab = 'tools'
        this.showTools = false
        await this.loadVerses()
      } else if (this.beginner.chapterId) {
        this.currentMode = 'beginner'
        this.tab = 'tools'
        this.showTools = false
        await this.loadVerses()
        } else {
          this.tab = 'tools'
          this.showTools = false
          this.isDataReady = true
        }

      } catch (error) {
      console.error('Memorisation bootstrap failed:', error)
      this.tab = 'tools'
      this.showTools = false
      this.isDataReady = true
      this.showBanner(this.t('toasts.theMemorisationWorkspaceRecoveredFromA'), 'error', 5000)
    } finally {
      this.isBootstrapping = false
      this.reconcilePersistedSessionCompletion()
    }

    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    window.addEventListener('beforeunload', this.persistAllState)
    window.addEventListener('keydown', this.handleGlobalKeydown)
    window.addEventListener('keyup', this.handleGlobalKeyup)
    window.addEventListener('scroll', this.handleWindowScroll, { passive: true })
    document.addEventListener('click', this.handleClickOutside)
    this.queueStatsVisualTick()
    if (this.showTools) {
      this.$nextTick(() => {
        this.focusToolsPanel()
      })
    }
    // Close Mushaf toolbar dropdowns from one removable document listener.
    this.handleMushafToolbarDocumentClick = (e) => {
      if (this.fontOpen && !e.target.closest('.font-dropdown-region')) {
        this.fontOpen = false
      }
      if (this.bgOpen && !e.target.closest('.bg-dropdown-region')) {
        this.bgOpen = false
      }
      if (this.borderOpen && !e.target.closest('.border-dropdown-region')) {
        this.borderOpen = false
      }
    }
    document.addEventListener('click', this.handleMushafToolbarDocumentClick)
  },

  beforeUnmount() {
    if (this.anchorHighlightObserver) {
      this.anchorHighlightObserver.disconnect()
    }
    this.cancelAnchorHighlightFrame()
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    window.removeEventListener('mutqin:theme-change', this.handleGlobalThemeChange)
    window.removeEventListener('mutqin:locale-change', this.handleLocaleChange)
    window.removeEventListener('storage', this.handleThemeStorageSync)
    if (this.themeObserver) this.themeObserver.disconnect()
    window.removeEventListener('beforeunload', this.persistAllState)
    window.removeEventListener('keydown', this.handleGlobalKeydown)
    window.removeEventListener('keyup', this.handleGlobalKeyup)
    window.removeEventListener('scroll', this.handleWindowScroll)
    this.syncBodyScrollLock(false)
    this.clearTouchPeek()
    this.blurPeekHoldingSpace = false
    if (this.bannerTimer) clearTimeout(this.bannerTimer)
    if (this.scrollFrame) {
      if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(this.scrollFrame)
      window.clearTimeout(this.scrollFrame)
      this.scrollFrame = null
    }
    if (this.loadVersesTimer) clearTimeout(this.loadVersesTimer)
    if (this.workspaceSyncTimer) clearTimeout(this.workspaceSyncTimer)
    if (this.playbackAdvanceTimer) clearTimeout(this.playbackAdvanceTimer)
    if (this.segmentPlaybackTimer) clearTimeout(this.segmentPlaybackTimer)
    if (this.sessionQuizConfettiTimer) clearTimeout(this.sessionQuizConfettiTimer)
    this.clearRecitationWindowTimer()
    this.flushPlaybackTime()
    this.stopWordHighlighting()
    if (this.wordSyncEngine) {
      this.wordSyncEngine.destroy()
      this.wordSyncEngine = null
    }
    this.stopRecordingsPlayback({ clearSource: true })
    if (this.selfCheckMediaRecorder && ['recording', 'paused'].includes(this.selfCheckMediaRecorder.state)) {
      this.selfCheckDiscardOnStop = true
      try { this.selfCheckMediaRecorder.stop() } catch { }
    }
    if (this.recitationCheckMediaRecorder && ['recording', 'paused'].includes(this.recitationCheckMediaRecorder.state)) {
      try { this.recitationCheckMediaRecorder.stop() } catch { }
    }
    if (this.aiMemorisationCheckerMediaRecorder && ['recording', 'paused'].includes(this.aiMemorisationCheckerMediaRecorder.state)) {
      this.aiMemorisationCheckerDiscardOnStop = true
      try { this.aiMemorisationCheckerMediaRecorder.stop() } catch { }
    }
    this.cleanupRecitationCheckMedia()
    this.cleanupSelfCheckMedia()
    this.persistAllState()
    saveMutqinState(this.mutqinState)
    if (this.unwatchMutqinState) this.unwatchMutqinState()
    document.removeEventListener('click', this.handleClickOutside)
    if (this.handleMushafToolbarDocumentClick) {
      document.removeEventListener('click', this.handleMushafToolbarDocumentClick)
      this.handleMushafToolbarDocumentClick = null
    }
    this.cancelStatsVisualTick()
    this.cancelLiveWordDomPatchFrame()
    if (this.wordClickHandler) {
      document.removeEventListener('click', this.wordClickHandler)
      this.wordClickHandler = null
    }
    if (typeof globalThis !== 'undefined' && globalThis.__MUTQIN_STORAGE_BRIDGE_OWNER__ === this) {
      delete globalThis.__MUTQIN_STORAGE_BRIDGE__
      delete globalThis.__MUTQIN_STORAGE_BRIDGE_OWNER__
    }
  },

  watch: {
    analyticsModalRecord: {
      handler() {
        if (this.analyticsModalRecord) {
          this.loadAnalyticsHeatmapData()
        }
      },
      immediate: true
    },
    theme(newVal) {
      this.persistUiState()
      if (this.readingViewMode === 'mushaf') this.applyMushafThemeDefault(newVal)
    },
    readingViewMode(newVal) {
      if (newVal === 'mushaf') this.applyMushafThemeDefault(this.theme)
      this.persistUiState()
    },
    showTools(newVal) {
      this.syncBodyScrollLock(newVal)
      this.persistUiState()
    },
    showHifzPlanModal(newVal) {
      this.syncBodyScrollLock(newVal)
    },
    showPlannerCompletionModal(newVal) {
      this.syncBodyScrollLock(newVal)
    },
    showSessionEndedModal(newVal) {
      this.syncBodyScrollLock(newVal)
    },
    showHelpLearningModal(newVal) {
      this.syncBodyScrollLock(newVal)
    },
    'mutqinState.sessionState.lastSilentEvaluation': {
      handler() {
        this.refreshHifzJourneyState()
      },
      deep: true
    },
    '$route'() {
      if (this.showTools) {
        this.closeToolsPanel()
      }
    },

    beforeUnmount() {
      window.removeEventListener('mutqin:theme-change', this.handleGlobalThemeChange)
      window.removeEventListener('storage', this.handleThemeStorageSync)
    },
    tab(newVal) {
      if (!['tools', 'techniques', 'saved', 'stats', 'settings'].includes(newVal)) {
        this.tab = 'tools'
        return
      }
      this.persistUiState()
      this.persistCentralSessionState()
    },
    fadingVerseEnabled(newVal) {
      if (newVal && this.showWordByWord) {
        this.showWordByWord = false;
        this.showBanner(this.t('toasts.fadingModeWordByWordDisabled'), 'info', 2000);
      }
    },
    showWordByWord(newVal) {
      if (newVal && this.fadingVerseEnabled) {
        this.fadingVerseEnabled = false;
        this.showBanner(this.t('toasts.wordByWordModeFadingDisabled'), 'info', 2000);
      }
    },
    focusModeEnabled(newVal) {
      if (newVal && this.blurModeEnabled) {
        this.blurModeEnabled = false;
        this.showBanner(this.t('toasts.focusModeOnBlurModeOff'), 'info', 2000);
      }
      this.persistUiState();
    },

    blurModeEnabled(newVal) {
      if (newVal && this.focusModeEnabled) {
        this.focusModeEnabled = false;
        this.showBanner(this.t('toasts.blurModeOnFocusModeOff'), 'info', 2000);
      }
      // 🔥 NEW: Auto-disable Chaining when Blur turns on
      if (newVal && this.chainingEnabled) {
        this.chainingEnabled = false;
        this.showBanner(this.t('toasts.blurModeOnChainingOffBlur'), 'warning', 3000);
      }
      this.persistUiState();
    },

    // 🔥 NEW: Auto-disable Blur when Chaining turns on
    chainingEnabled(newVal) {
      if (newVal && this.blurModeEnabled) {
        this.blurModeEnabled = false;
        this.showBanner(this.t('toasts.chainingOnBlurModeOffYou'), 'warning', 3000);
      }
      if (newVal && !this.anchorModeEnabled) {
        this.showBanner(this.t('toasts.tipEnableAnchorModeWithChaining'), 'info', 2000);
      }
      this.persistUiState();
      this.persistCentralSessionState();
      this.applyChainingQueueChange(this.currentMode);
    },
    chapterId(val) {
      this.persistUiState()
      const id = Number(val || 0)
      this.currentChapter = id ? (this.chapters.find(c => Number(c.id) === id) || null) : null
    },
    rangeStart() {
      this.persistUiState()
    },
    rangeEnd() {
      this.persistUiState()
    },
    reciterId() {
      this.persistUiState()
    },
    speed() {
      this.applySpeed()
      this.persistUiState()
      this.persistCentralSessionState()
    },
    delay: 'persistUiState',
    playMode(newVal) {
      if (newVal !== 'follow') this.clearRecitationWindowTimer()
      this.persistUiState()
    },
    recitationWindowSeconds: 'persistUiState',
    order: 'persistUiState',
    chainingEnabled() {
      this.persistUiState()
      this.persistCentralSessionState()
      this.applyChainingQueueChange(this.currentMode)
    },

    chainingMethod() {
      this.persistUiState()
      this.persistCentralSessionState()
      this.applyChainingQueueChange(this.currentMode)
    },

    chainingRepetitions(newVal) {
      const safeValue = Math.max(1, Math.min(5, Number(newVal || 1)))
      if (safeValue !== Number(this.chainingRepetitions)) {
        this.chainingRepetitions = safeValue
      }
      this.persistUiState()
      this.persistCentralSessionState()
      this.applyChainingQueueChange(this.currentMode)
    },

    showWordByWord: 'persistUiState',
    defaultFontSize: 'persistUiState',
    tajweedEnabled: 'persistUiState',
    aiRecallModeEnabled: 'persistUiState',
    showTranslation: 'persistUiState',
    showTransliteration: 'persistUiState',
    showWordByWord(newVal) {
      this.persistUiState()
      if (newVal) this.restoreWordScroll(this.effectiveActiveVerseKey)
    },
    wordByWordAudioEnabled: 'persistUiState',
    fontScale: 'persistUiState',
    quranFont: 'persistUiState',
    script: 'persistUiState',
    repetitionsPerStep(newVal) {
      const safeValue = Math.max(1, Math.min(50, Number(newVal || 1)))
      if (safeValue !== Number(this.repetitionsPerStep)) {
        this.repetitionsPerStep = safeValue
        return
      }
      this.persistUiState()
      this.persistCentralSessionState()
      if (this.hasVerses && !this.chainingEnabled) this.rebuildQueue(this.currentMode)
    },
    selectedLoopCount: 'persistUiState',
    gapBetweenVerses: 'persistUiState',
    customGapSeconds: 'persistUiState',
    focusDimPercent: 'persistUiState',
    activeKey: 'persistSessionState',
    queueIndex: 'persistSessionState',
    playerVisible: 'persistAudioState',
    isPlaying: 'persistAudioState',
    currentTime: 'persistAudioState',
    flowStep: 'persistUiState',
    sectionOpen: { handler: 'persistUiState', deep: true },
    isSelfCheckRecording: 'handleStatsVisualTickerStateChange',
    selfCheckPreparing: 'handleStatsVisualTickerStateChange',
    recitationCheckRecording(val) {
      this.handleStatsVisualTickerStateChange()
      this.handleRecallModeRecordingChange(val)
    },
    recitationCheckPreparing: 'handleStatsVisualTickerStateChange',
    aiMemorisationCheckerRecording: 'handleStatsVisualTickerStateChange',
    aiMemorisationCheckerPreparing: 'handleStatsVisualTickerStateChange',
    showSessionAnalyticsModal: 'handleStatsVisualTickerStateChange',
    analyticsModalRecordId: 'handleStatsVisualTickerStateChange',
    recallCurrentWordIndex(newVal, oldVal) {
      if (newVal !== oldVal && this.recallRevealCurrentIndex >= 0 && newVal !== this.recallRevealCurrentIndex) {
        this.recallRevealCurrentIndex = -1
      }
      this.$nextTick(() => {
        if (this.aiRecallModeEnabled && this.recitationCheckRecording) this.applyRecallVisibility()
      })
    },
    aiRecallModeEnabled(newVal) {
      if (!newVal) {
        this.recallRevealCurrentIndex = -1
        this.$nextTick(() => this.clearRecallVisibility())
        return
      }
      this.$nextTick(() => {
        if (this.recitationCheckRecording) this.applyRecallVisibility()
      })
    },
    statsTick() {
      if (!this.showSessionAnalyticsModal) return
      const now = Date.now()
      if (now - Number(this.analyticsModalLastRefreshedAt || 0) < 1500) return
      this.analyticsModalLastRefreshedAt = now
      this.refreshAnalyticsModalData()
    },

    tajweedEnabled() {
      this.persistUiState()
      this.persistCentralSessionState()
    },

    activeVerseKey(newVal) {
      this.persistSessionState()
      if (this.showWordByWord) this.restoreWordScroll(newVal)
    },

    focusModeEnabled: 'persistControlState',
    blurModeEnabled: 'persistControlState',
    blurIntensity: 'persistControlState',
    defaultFontSize: 'persistUiState'
  },

  methods: {
    normalizeThemeToken(value = 'light') {
      const theme = String(value || 'light').toLowerCase()
      if (theme === 'dark' || theme === 'dark-mode') return 'dark'
      if (theme === 'sepia' || theme === 'sepia-mode') return 'sepia'
      return 'light'
    },

    toThemePreference(value = 'light') {
      const theme = this.normalizeThemeToken(value)
      if (theme === 'dark') return 'dark-mode'
      if (theme === 'sepia') return 'sepia-mode'
      return 'light-mode'
    },

    syncGlobalTheme(theme = this.theme) {
      const normalizedTheme = this.normalizeThemeToken(theme)
      this.theme = normalizedTheme
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', this.theme)
        document.cookie = `mutqin_theme=${this.toThemePreference(normalizedTheme)};path=/;max-age=31536000;samesite=lax`
      }
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('mutqin-theme', normalizedTheme)
          localStorage.setItem('mutqin-theme-preference', this.toThemePreference(normalizedTheme))
        } catch {}
      }
    },

    translateOrFallback(key, fallback, params = {}) {
      const translated = this.t(key, params)
      return translated && translated !== key ? translated : fallback
    },

    hydrateWorkspaceStateValueFromLocalStorage(workspaceKey, localKey) {
      if (!this.learningBackendEnabled()) return false
      if (this.readWorkspaceStateValue(workspaceKey, null) !== null) return false
      try {
        const raw = localStorage.getItem(localKey)
        if (!raw) return false
        this.writeWorkspaceStateValue(workspaceKey, JSON.parse(raw))
        return true
      } catch {
        try {
          const raw = localStorage.getItem(localKey)
          if (!raw) return false
          this.writeWorkspaceStateValue(workspaceKey, raw)
          return true
        } catch {
          return false
        }
      }
    },

    hydrateAuthenticatedWorkspaceStateFromLocalStorage() {
      if (!this.learningBackendEnabled()) return
      this.hydrateWorkspaceStateValueFromLocalStorage('uiState', 'telawa.uiState')
      this.hydrateWorkspaceStateValueFromLocalStorage('continueSession', 'telawa.continueSession')
      this.hydrateWorkspaceStateValueFromLocalStorage('audioState', 'telawa.audioState')
      this.hydrateWorkspaceStateValueFromLocalStorage('centralSession', CENTRAL_SESSION_STORAGE_KEY)
      ;['beginner', 'advanced', 'planner'].forEach(mode => {
        this.hydrateWorkspaceStateValueFromLocalStorage(`modeState:${mode}`, MODE_STORAGE_KEYS[mode])
        this.hydrateWorkspaceStateValueFromLocalStorage(`sessionState:${mode}`, SESSION_STORAGE_KEYS[mode])
      })
    },

    maybeShowReadyToBeginModal() {
      if (!this.isLoggedIn) return
      if (!this.getReadyToBeginLoginEventId()) return
      if (this.hasShownReadyToBeginModalForCurrentLogin()) return
      this.markReadyToBeginModalShownForCurrentLogin()
      this.returningUserChoicePending = true
      this.showTools = false
      this.topCardMenuOpen = false
      this.showResumeModal = true
    },

    getReadyToBeginLoginEventId() {
      return String(this.auth?.login_event_id || '').trim()
    },

    hasShownReadyToBeginModalForCurrentLogin() {
      const loginEventId = this.getReadyToBeginLoginEventId()
      if (!loginEventId) return false
      return this.readReadyToBeginModalLoginEventId() === loginEventId
    },

    markReadyToBeginModalShownForCurrentLogin() {
      const loginEventId = this.getReadyToBeginLoginEventId()
      if (!loginEventId) return
      this.writeReadyToBeginModalLoginEventId(loginEventId)
    },

    getReadyToBeginModalStorageKey() {
      return this.userStorageKey('readyToBeginLoginEventId')
    },

    readReadyToBeginModalLoginEventId() {
      const storageKey = this.getReadyToBeginModalStorageKey()
      if (!storageKey) return ''
      if (this.learningBackendEnabled()) {
        return String(this.readWorkspaceStateValue('readyToBeginLoginEventId', '') || '').trim()
      }
      try {
        return String(localStorage.getItem(storageKey) || '').trim()
      } catch {
        return ''
      }
    },

    writeReadyToBeginModalLoginEventId(loginEventId) {
      const storageKey = this.getReadyToBeginModalStorageKey()
      if (!storageKey || !loginEventId) return
      if (this.learningBackendEnabled()) {
        this.writeWorkspaceStateValue('readyToBeginLoginEventId', loginEventId)
        return
      }
      try {
        localStorage.setItem(storageKey, loginEventId)
      } catch {}
    },

    getWorkspacePersistenceBucket() {
      if (!this.learningBackendEnabled() || !this.mutqinState || typeof this.mutqinState !== 'object') return null
      if (!this.mutqinState.workspaceState || typeof this.mutqinState.workspaceState !== 'object') {
        this.mutqinState.workspaceState = {}
      }
      return this.mutqinState.workspaceState
    },

    readWorkspaceStateValue(key, fallback = null) {
      const bucket = this.getWorkspacePersistenceBucket()
      if (!bucket || !Object.prototype.hasOwnProperty.call(bucket, key)) return fallback
      return deepClone(bucket[key])
    },

    writeWorkspaceStateValue(key, value) {
      const bucket = this.getWorkspacePersistenceBucket()
      if (!bucket) return false
      bucket[key] = deepClone(value)
      bucket.updatedAt = new Date().toISOString()
      return true
    },

    deleteWorkspaceStateValue(key) {
      const bucket = this.getWorkspacePersistenceBucket()
      if (!bucket || !Object.prototype.hasOwnProperty.call(bucket, key)) return false
      delete bucket[key]
      bucket.updatedAt = new Date().toISOString()
      return true
    },

    readScopedStorageValue(workspaceKey, localKey, fallback = null) {
      if (this.learningBackendEnabled()) {
        return this.readWorkspaceStateValue(workspaceKey, fallback)
      }
      try {
        const raw = localStorage.getItem(localKey)
        return raw ? JSON.parse(raw) : fallback
      } catch {
        return fallback
      }
    },

    writeScopedStorageValue(workspaceKey, localKey, value) {
      if (this.learningBackendEnabled()) {
        return this.writeWorkspaceStateValue(workspaceKey, value)
      }
      try {
        localStorage.setItem(localKey, JSON.stringify(value))
        return true
      } catch {
        return false
      }
    },

    deleteScopedStorageValue(workspaceKey, localKey) {
      if (this.learningBackendEnabled()) {
        return this.deleteWorkspaceStateValue(workspaceKey)
      }
      try {
        localStorage.removeItem(localKey)
        return true
      } catch {
        return false
      }
    },

    getWorkspaceBridgeKey(storageKey = '') {
      const keyMap = {
        [HIFZ_PLAN_STORAGE_KEY]: 'hifzPlan',
        [HIFZ_APP_STATE_STORAGE_KEY]: 'hifzAppState',
        [HIFZ_PLAN_ARCHIVE_STORAGE_KEY]: 'hifzPlanArchives',
        [AYAH_PROGRESS_STORAGE_KEY]: 'ayahProgress',
        mutqin_spaced_repetition_memory: 'ayahProgressLegacy'
      }
      return keyMap[storageKey] || ''
    },

    syncWorkspaceStorageBridge() {
      if (typeof globalThis === 'undefined') return
      if (!this.learningBackendEnabled()) {
        if (globalThis.__MUTQIN_STORAGE_BRIDGE_OWNER__ === this) {
          delete globalThis.__MUTQIN_STORAGE_BRIDGE__
          delete globalThis.__MUTQIN_STORAGE_BRIDGE_OWNER__
        }
        return
      }
      globalThis.__MUTQIN_STORAGE_BRIDGE_OWNER__ = this
      globalThis.__MUTQIN_STORAGE_BRIDGE__ = {
        getItem: (storageKey) => {
          const workspaceKey = this.getWorkspaceBridgeKey(storageKey)
          if (!workspaceKey) return null
          const value = this.readWorkspaceStateValue(workspaceKey, null)
          return value === null || typeof value === 'undefined' ? null : JSON.stringify(value)
        },
        setItem: (storageKey, rawValue) => {
          const workspaceKey = this.getWorkspaceBridgeKey(storageKey)
          if (!workspaceKey) return
          try {
            this.writeWorkspaceStateValue(workspaceKey, JSON.parse(rawValue))
          } catch {
            this.writeWorkspaceStateValue(workspaceKey, rawValue)
          }
        },
        removeItem: (storageKey) => {
          const workspaceKey = this.getWorkspaceBridgeKey(storageKey)
          if (!workspaceKey) return
          this.deleteWorkspaceStateValue(workspaceKey)
        }
      }
    },

    buildDefaultWorkspaceSessionConfig() {
      return {
        chapterId: 1,
        rangeStart: 1,
        rangeEnd: 7,
        reciterId: DEFAULT_ALQURAN_RECITER,
        speed: 1,
        repetitionsPerStep: 3,
        selectedLoopCount: 3,
        playMode: 'auto',
        talqinModeEnabled: false,
        gapBetweenVerses: '1x',
        customGapSeconds: 2,
        recitationWindowSeconds: 8,
        chainingEnabled: false,
        chainingMethod: '',
        chainingRepetitions: 1,
        focusModeEnabled: false,
        blurModeEnabled: false,
        blurIntensity: 10,
        anchorModeEnabled: false,
        anchorCount: 2,
        tajweedEnabled: false,
        showTranslation: false,
        showTransliteration: false,
        showWordByWord: false,
        wordByWordAudioEnabled: false,
        readingViewMode: 'stacked'
      }
    },

    applyDefaultWorkspaceSessionConfig(options = {}) {
      const { openSetup = true, silent = false } = options
      const defaults = this.buildDefaultWorkspaceSessionConfig()
      this.currentMode = 'advanced'
      this.chapterId = defaults.chapterId
      this.rangeStart = defaults.rangeStart
      this.rangeEnd = defaults.rangeEnd
      this.reciterId = defaults.reciterId
      this.speed = defaults.speed
      this.repetitionsPerStep = defaults.repetitionsPerStep
      this.selectedLoopCount = defaults.selectedLoopCount
      this.playMode = defaults.playMode
      this.talqinModeEnabled = defaults.talqinModeEnabled
      this.gapBetweenVerses = defaults.gapBetweenVerses
      this.customGapSeconds = defaults.customGapSeconds
      this.recitationWindowSeconds = defaults.recitationWindowSeconds
      this.chainingEnabled = defaults.chainingEnabled
      this.chainingMethod = defaults.chainingMethod
      this.chainingRepetitions = defaults.chainingRepetitions
      this.focusModeEnabled = defaults.focusModeEnabled
      this.blurModeEnabled = defaults.blurModeEnabled
      this.blurIntensity = defaults.blurIntensity
      this.anchorModeEnabled = defaults.anchorModeEnabled
      this.anchorCount = defaults.anchorCount
      this.tajweedEnabled = defaults.tajweedEnabled
      this.showTranslation = defaults.showTranslation
      this.showTransliteration = defaults.showTransliteration
      this.showWordByWord = defaults.showWordByWord
      this.wordByWordAudioEnabled = defaults.wordByWordAudioEnabled
      this.readingViewMode = defaults.readingViewMode
      this.tab = 'tools'
      this.showTools = !!openSetup
      this.syncSettingsDraft()
      this.persistUiState()
      this.persistCentralSessionState()
      if (!silent) {
        this.showBanner('Default session loaded: Al-Fatihah 1-7, Alafasy, standard speed, 3 repeats, no memorisation techniques.', 'info', 3200)
      }
    },

    buildOnboardingStep(key, icon) {
      const base = `memorisation.onboarding.steps.${key}`
      const tm = typeof this.$tm === 'function' ? this.$tm.bind(this) : (path) => this.t(path)
      const points = tm(`${base}.points`)
      const previewItems = tm(`${base}.previewItems`)
      const step = {
        key,
        icon,
        title: this.t(`${base}.title`),
        stepLabel: this.t(`${base}.stepLabel`),
        body: this.t(`${base}.body`),
        points: Array.isArray(points) ? points : [],
        preview: {
          icon,
          title: this.t(`${base}.previewTitle`),
          subtitle: this.t(`${base}.previewSubtitle`),
          items: Array.isArray(previewItems) ? previewItems : []
        }
      }
      if (key === 'practice') {
        step.title = 'Master Verse Retention with Talqin'
        step.body = 'Once your session is submitted, this mode guides you step-by-step: it plays an Ayah, pauses automatically so you can repeat it, and extends your memory stack. Real-time banner alerts will prompt you exactly when to listen and when to recite.'
        step.targetSelector = '#talqin-mode-toggle'
        step.targetSection = 'advanced_playback'
      }
      return step
    },

    selectSessionFromDropdown(sessionId) {
      this.selectedSessionId = sessionId;
      this.dropdownOpen = false; // Close dropdown
    },

    getSelectedSessionLabel() {
      if (!this.selectedSessionId) return '';
      const session = this.savedSessions.find(s => s.id === this.selectedSessionId);
      return session ? this.getSessionPrimaryLabel(session) : '';
    },

    async loadSelectedSession() {
      if (!this.selectedSessionId) {
        this.showBanner(this.t('toasts.pleaseSelectASessionFirst'), 'info', 2000);
        return;
      }
      await this.loadSavedSession(this.selectedSessionId);
      this.showBanner(this.t('toasts.sessionLoadedSuccessfully'), 'success', 2000);
    },
    
    // Close dropdown when clicking outside
    handleClickOutside(event) {
      const dropdown = event.target.closest('.custom-dropdown');
      if (!dropdown && this.dropdownOpen) {
        this.dropdownOpen = false;
      }
    },
  
    getSelectedSessionLabel() {
      if (!this.selectedSessionId) return '';
      const session = this.savedSessions.find(s => s.id === this.selectedSessionId);
      return session ? this.getSessionPrimaryLabel(session) : '';
    },

    async loadSelectedSession() {
      if (!this.selectedSessionId) {
        this.showBanner(this.t('toasts.pleaseSelectASessionFirst'), 'info', 2000);
        return;
      }
      await this.loadSavedSession(this.selectedSessionId);
      this.showBanner(this.t('toasts.sessionLoadedSuccessfully'), 'success', 2000);
    },
    selectSessionFromDropdown(sessionId) {
      this.selectedSessionId = sessionId;
      // Close dropdown
      const dropdown = document.querySelector('.btn-select-session');
      if (dropdown) dropdown.click();
    },

    getSelectedSessionLabel() {
      const session = this.savedSessions.find(s => s.id === this.selectedSessionId);
      return session ? this.getSessionPrimaryLabel(session) : '';
    },

	    async loadSelectedSession() {
	      if (!this.selectedSessionId) return;
	      await this.loadSavedSession(this.selectedSessionId);
	      // Show success feedback
	      this.showBanner(this.t('toasts.sessionLoadedSuccessfully'), 'success', 2000);
	    },
	    // Modify your existing recitation check to respect hidden reveal mode
	    checkRecitationWithHiddenReveal(recitedWords, targetVerse) {
      if (!this.hiddenRevealModeEnabled) {
        // Use existing recitation check
        return this.assessRecitationRecognitionWords(recitedWords, [targetVerse]);
      }
      
      // Get current expected word
      const currentIdx = this.hiddenRevealSession.currentWordIndex;
      const expectedWords = this.tokenizeRecitationDisplayWords(
        this.getPlainVerseArabicForCheck(targetVerse)
      );
      const expectedWord = expectedWords[currentIdx];
      const recitedWord = recitedWords[0] || '';
      
      // Check only the current word
      const similarity = this.getRecitationWordSimilarity(recitedWord, expectedWord);
      const isCorrect = similarity >= 0.85;
      
      if (isCorrect) {
        // Reveal and move to next
        this.revealNextWord(targetVerse.key);
        return {
          accuracyScore: 100,
          wordStatuses: [{ status: 'correct', text: expectedWord }],
          recommendation: 'Correct! Moving to next word.'
        };
      } else {
        // Trigger error and Luqmah
        this.playErrorFeedback();
        return {
          accuracyScore: 0,
          wordStatuses: [{ status: 'incorrect', text: expectedWord, actual: recitedWord }],
          recommendation: `Try again. Focus on "${expectedWord}"`
        };
      }
    },
    async revealNextWord(verseKey) {
      if (!this.hiddenRevealModeEnabled) return false;
      
      const verse = this.verses.find(v => v.key === verseKey);
      if (!verse) return false;
      
      const words = this.tokenizeRecitationDisplayWords(this.getPlainVerseArabicForCheck(verse));
      const revealed = this.hiddenRevealSession.revealedWordIndexes;
      const nextIndex = revealed.size;
      
      if (nextIndex >= words.length) {
        // Complete verse revealed
        this.playUiTone('complete');
        this.showBanner(this.t('toasts.ayahCompletedMovingToNext'), 'success', 1500);
        return true;
      }
      
      // Reveal the next word with animation
      revealed.add(nextIndex);
      this.hiddenRevealSession.currentWordIndex = nextIndex;
      this.hiddenRevealSession.lastCorrectWordTime = Date.now();
      this.hiddenRevealSession.errorCount = 0;
      
      // Reset Luqmah state on success
      this.resetLuqmahState();
      
      // Apply visual reveal
      this.$nextTick(() => {
        this.applyWordRevealAnimation(verseKey, nextIndex);
      });
      
      return true;
    },
    checkWordRecitation(wordText, expectedWord, wordIndex, verseKey) {
      if (!this.hiddenRevealModeEnabled) return { correct: false, locked: true };
      
      const expectedIndex = this.hiddenRevealSession.currentWordIndex;
      
      // Strict sequential: can only attempt current word
      if (wordIndex !== expectedIndex) {
        return { 
          correct: false, 
          locked: true, 
          message: `Please recite the highlighted word first.` 
        };
      }
      
      // Check similarity (reuse existing recitation matching)
      const similarity = this.getRecitationWordSimilarity(wordText, expectedWord);
      const isCorrect = similarity >= 0.85;
      
      if (isCorrect) {
        return { correct: true, locked: false, message: 'Correct!' };
      }
      
      // Track failure for Luqmah
      this.trackLuqmahFailure(wordText, expectedWord, wordIndex);
      
      return { 
        correct: false, 
        locked: true, 
        message: 'Incorrect. Try again.',
        similarity 
      };
    },
    trackLuqmahFailure(recitedWord, expectedWord, wordIndex) {
      const now = Date.now();
      const { failWindow, failCount, currentLevel } = this.luqmahState;
      
      // Clean old failures (within 30 second window)
      const recentFails = failWindow.filter(t => now - t < 30000);
      recentFails.push(now);
      this.luqmahState.failWindow = recentFails;
      this.luqmahState.failCount = recentFails.length;
      this.luqmahState.lastFailTime = now;
      
      // Debounce: don't trigger on every single failure
      if (recentFails.length < 2) return;
      
      // Determine escalation level
      let newLevel = currentLevel;
      if (recentFails.length >= 5 && currentLevel < 3) newLevel = 3;
      else if (recentFails.length >= 3 && currentLevel < 2) newLevel = 2;
      else if (recentFails.length >= 2 && currentLevel < 1) newLevel = 1;
      
      if (newLevel > currentLevel) {
        this.showLuqmahHint(newLevel, expectedWord);
        this.luqmahState.currentLevel = newLevel;
      }
    },

    showLuqmahHint(level, targetWord) {
      // Clear any pending timeout
      if (this.luqmahState.hintTimeout) {
        clearTimeout(this.luqmahState.hintTimeout);
      }
      
      let message = '';
      let duration = 3000;
      
      switch(level) {
        case 1:
          message = '🌙 Take a breath and try again slowly.';
          break;
        case 2:
          const firstLetters = targetWord.slice(0, 3);
          message = `💡 Hint: The word starts with "${firstLetters}". Focus on the beginning.`;
          break;
        case 3:
          message = `📖 Full word: "${targetWord}". Listen and repeat carefully.`;
          duration = 5000;
          break;
      }
      
      this.showBanner(message, 'info', duration);
      
      // Auto-reset Luqmah after 10 seconds of no activity
      this.luqmahState.hintTimeout = setTimeout(() => {
        this.resetLuqmahState();
      }, 10000);
    },

    resetLuqmahState() {
      this.luqmahState = {
        active: false,
        currentLevel: 0,
        failCount: 0,
        lastFailTime: null,
        failWindow: [],
        hintTimeout: null
      };
    },
    getHiddenRevealArabic(verse) {
      if (!this.hiddenRevealModeEnabled || !this.hiddenRevealSession.sessionStarted) {
        return this.getDisplayArabic(verse);
      }
      
      const words = this.tokenizeRecitationDisplayWords(this.getPlainVerseArabicForCheck(verse));
      const revealed = this.hiddenRevealSession.revealedWordIndexes;
      
      return words.map((word, idx) => {
        if (revealed.has(idx)) {
          // Revealed word with green highlight
          const isCurrent = idx === this.hiddenRevealSession.currentWordIndex;
          const correctClass = isCurrent ? 'word-current' : 'word-revealed';
          return `<word class="wbw-word ${correctClass} word-correct-revealed" data-word-index="${idx}">${this.escapeHtml(word)}</word>`;
        } else {
          // Hidden word
          const hiddenLength = Math.max(4, Math.min(12, word.length));
          const hiddenPlaceholder = '█'.repeat(hiddenLength);
          return `<word class="wbw-word word-hidden" data-word-index="${idx}" data-hidden="true">${this.escapeHtml(hiddenPlaceholder)}</word>`;
        }
      }).join(' ');
    },
    playErrorFeedback() {
      // Play error sound
      this.playUiTone('error');
      
      // Highlight current word in red
      const verseKey = this.effectiveActiveVerseKey;
      const currentIdx = this.hiddenRevealSession.currentWordIndex;
      
      const selector = `.verse-card[data-verse-key="${verseKey}"] .wbw-word[data-word-index="${currentIdx}"]`;
      const element = document.querySelector(selector);
      
      if (element) {
        element.classList.add('word-error-flash');
        setTimeout(() => {
          element.classList.remove('word-error-flash');
        }, 500);
      }
      
      // Increment error count
      this.hiddenRevealSession.errorCount++;
    },
    applyWordRevealAnimation(verseKey, wordIndex) {
      const selector = `.verse-card[data-verse-key="${verseKey}"] .wbw-word[data-word-index="${wordIndex}"]`;
      const element = document.querySelector(selector);
      if (!element) return;
      
      // Smooth fade-in animation
      element.classList.add('word-reveal-animate');
      element.classList.remove('word-hidden');
      
      // Remove animation class after completion
      setTimeout(() => {
        element.classList.remove('word-reveal-animate');
      }, 400);
    },
    // FIX: Update the loadAnalyticsHeatmapData method to handle missing data
    async loadAnalyticsHeatmapData() {
      const session = this.analyticsModalRecord
      if (!session?.config) return
      
      const chapterId = session.config.chapterId || this.chapterId
      const start = session.config.rangeStart || this.rangeStart || 1
      const end = session.config.rangeEnd || this.rangeEnd || 7
      const data = []
      
      for (let ayahNum = start; ayahNum <= end; ayahNum++) {
        const ayahKey = `${chapterId}:${ayahNum}`
        const recordings = (this.recordingsLibrary || []).filter(r => r.ayahKey === ayahKey && this.isAiCheckRecording(r))
        
        if (!recordings.length) {
          data.push({
            ayahNumber: ayahNum,
            confidenceScore: 0,
            accuracyPercentage: 0,
            mistakeCount: 0,
            tajweedIssueCount: 0,
            attemptCount: 0,
            history: []
          })
          continue
        }
        
        const scores = recordings.map(r => r.accuracyScore || 0)
        const avgScore = scores.reduce((a,b) => a + b, 0) / scores.length
        const mistakes = recordings.flatMap(r => r.mistakeBreakdown?.missing || [])
        const tajweed = recordings.flatMap(r => r.tajweedRules || []).filter(r => r.issueCount).length
        
        data.push({
          ayahNumber: ayahNum,
          confidenceScore: Math.round(avgScore),
          accuracyPercentage: Math.round(avgScore * 0.9),
          mistakeCount: mistakes.length,
          tajweedIssueCount: tajweed,
          attemptCount: recordings.length,
          history: recordings.slice(0, 3).map(r => ({ score: Math.round(r.accuracyScore || 0), date: r.recordedAt }))
        })
      }
      
      this.analyticsHeatmapData = data
      this.calculateHeatmapTrends(data)
      this.heatmapFocusAreas = (data || []).filter(d => d.confidenceScore < 60 && d.attemptCount > 0)
    },
    calculateHeatmapTrends(data) {
      const improved = []
      const declined = []
      
      data.forEach(ayah => {
        if (ayah.history.length >= 2) {
          const first = ayah.history[ayah.history.length - 1].score
          const last = ayah.history[0].score
          const change = last - first
          if (change > 5) improved.push({ ...ayah, change })
          if (change < -5) declined.push({ ...ayah, change: Math.abs(change) })
        }
      })
      
      this.heatmapTrends = {
        improved: improved.sort((a,b) => b.change - a.change).slice(0, 3),
        declined: declined.sort((a,b) => b.change - a.change).slice(0, 3)
      }
    },
  
    getHeatmapClass(score) {
      if (score >= 90) return 'heat-excellent'
      if (score >= 75) return 'heat-strong'
      if (score >= 60) return 'heat-needs'
      if (score >= 40) return 'heat-weak'
      return 'heat-critical'
    },
    
    showHeatmapTooltip(event, ayah) {
      if (!ayah) return // Add this guard
      this.heatmapTooltip = {
        visible: true,
        x: event.clientX + 15,
        y: event.clientY - 10,
        data: ayah
      }
    },
    
    openAyahDetailFromHeatmap(ayah) {
      const verse = this.verses.find(v => v.number === ayah.ayahNumber)
      if (verse) {
        this.openAiRecitationCheckForVerse(verse)
      }
    },
    isVerseVisuallyActive(verseKey) {
      if (!verseKey) return false
      const hasStarted = this.hasSessionStarted || this.isPlaying || this.manualOnlyPlayback
      const hasActiveReview = this.shouldShowRecitationReviewHighlights(verseKey)
      return (hasStarted && this.effectiveActiveVerseKey === verseKey) || hasActiveReview
    },
    getControlsInsightPercent(item = {}) {
      if (item.key === 'progress') return Math.max(0, Math.min(100, Number(this.progressPercent || 0)))
      if (item.key === 'plays') return Math.max(8, Math.min(100, Number(this.totalVersePlayCountValue || 0) * 12))
      if (item.key === 'checks') {
        const checks = this.recordingsLibrary.filter(recording => this.isAiCheckRecording(recording)).length
        return Math.max(8, Math.min(100, checks * 18))
      }
      if (item.key === 'time') {
        const started = this.sessionStartedAt ? Math.max(0, (Number(this.statsTick || Date.now()) - Number(this.sessionStartedAt)) / 1000) : 0
        return Math.max(8, Math.min(100, Math.round((started / 900) * 100)))
      }
      return 35
    },
    t(key, params = {}) {
      const translator = this.$t
      if (typeof translator !== 'function') return key
      return translator(key, params)
    },

    openQuranSearchModal() {
      this.showQuranSearchModal = true
      this.syncBodyScrollLock(true)
      this.$nextTick(() => {
        if (this.$refs.quranSearchInput) this.$refs.quranSearchInput.focus({ preventScroll: true })
      })
    },

    closeQuranSearchModal() {
      this.stopQuranVoiceSearch()
      this.showQuranSearchModal = false
      this.syncBodyScrollLock(false)
    },

    normalizeQuranSearchText(value) {
      return String(value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
        .replace(/[إأآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    },

    async ensureQuranSearchIndex() {
      if (this.quranSearchIndex.length) return
      this.quranSearchLoading = true
      this.quranSearchError = ''
      try {
        const [arabicRes, translationRes] = await Promise.all([
          getQuranEdition('quran-uthmani'),
          getQuranEdition('en.asad')
        ])
        const arabicSurahs = arabicRes.data?.data?.surahs || []
        const translationSurahs = translationRes.data?.data?.surahs || []
        const translationMap = new Map()
        translationSurahs.forEach(surah => {
          ;(surah.ayahs || []).forEach(ayah => {
            translationMap.set(`${surah.number}:${ayah.numberInSurah}`, this.cleanTranslationText(ayah.text || ''))
          })
        })

        this.quranSearchIndex = arabicSurahs.flatMap(surah => {
          const chapter = this.chapters.find(item => Number(item.id) === Number(surah.number))
          return (surah.ayahs || []).map(ayah => {
            const key = `${surah.number}:${ayah.numberInSurah}`
            const arabic = this.removeBasmala(ayah.text || '')
            const translation = translationMap.get(key) || ''
            return {
              key,
              surah: Number(surah.number),
              surahName: chapter?.name_simple || surah.englishName || `Surah ${surah.number}`,
              ayah: Number(ayah.numberInSurah),
              juz: Number(ayah.juz || 0),
              page: Number(ayah.page || 0),
              hizb: Math.max(1, Math.ceil(Number(ayah.hizbQuarter || 1) / 4)),
              arabic,
              translation,
              arabicNormalized: this.normalizeQuranSearchText(arabic),
              translationNormalized: this.normalizeQuranSearchText(translation)
            }
          })
        })
      } catch (error) {
        console.error('Failed to load Quran search index:', error)
        this.quranSearchError = 'Unable to load Quran search right now. Please check your connection and try again.'
      } finally {
        this.quranSearchLoading = false
      }
    },

    async runQuranSearch() {
      this.quranSearchHasRun = true
      this.quranSearchError = ''
      const query = this.normalizeQuranSearchText(this.quranSearchQuery)
      const words = query.split(/\s+/).filter(Boolean)
      if (words.length < 3) {
        this.quranSearchResults = []
        this.quranSearchError = 'Please enter at least 3 words before searching.'
        return
      }
      await this.ensureQuranSearchIndex()
      if (this.quranSearchError) return

      const phrase = words.join(' ')
      const results = []
      for (const item of this.quranSearchIndex) {
        const arabicIndex = item.arabicNormalized.indexOf(phrase)
        const translationIndex = item.translationNormalized.indexOf(phrase)
        if (arabicIndex === -1 && translationIndex === -1) continue
        const matchSource = arabicIndex !== -1 ? 'arabic' : 'translation'
        const sourceText = matchSource === 'arabic' ? item.arabicNormalized : item.translationNormalized
        const beforeMatch = sourceText.slice(0, matchSource === 'arabic' ? arabicIndex : translationIndex).trim()
        results.push({
          ...item,
          matchSource,
          firstWordIndex: beforeMatch ? beforeMatch.split(/\s+/).length + 1 : 1
        })
        if (results.length >= 150) break
      }
      this.quranSearchResults = results
    },

    highlightQuranSearchMatch(text, shouldHighlight) {
      const escaped = escapeHtml(text)
      if (!shouldHighlight) return escaped
      const normalizedQuery = this.normalizeQuranSearchText(this.quranSearchQuery)
      const firstNeedle = normalizedQuery.split(/\s+/).filter(Boolean)[0]
      if (!firstNeedle) return escaped
      const originalWords = String(text || '').split(/(\s+)/)
      let marked = false
      return originalWords.map(part => {
        if (marked || !part.trim()) return escapeHtml(part)
        const normalizedPart = this.normalizeQuranSearchText(part)
        if (!normalizedPart || normalizedPart !== firstNeedle) return escapeHtml(part)
        marked = true
        return `<mark>${escapeHtml(part)}</mark>`
      }).join('')
    },

    adjustQuranSearchFont(delta) {
      const next = Number(this.quranSearchFontSize || 34) + Number(delta || 0)
      this.quranSearchFontSize = Math.max(24, Math.min(58, next))
    },

    toggleQuranVoiceSearch() {
      if (!this.supportsQuranVoiceSearch) {
        this.quranSearchError = 'Voice search is not supported in this browser.'
        return
      }
      if (this.quranSearchVoiceActive) {
        this.stopQuranVoiceSearch()
        return
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = this.activeLocale === 'ar' ? 'ar-SA' : 'en-US'
      recognition.interimResults = true
      recognition.continuous = false
      recognition.onresult = event => {
        const transcript = Array.from(event.results || [])
          .map(result => result[0]?.transcript || '')
          .join(' ')
          .trim()
        if (transcript) this.quranSearchQuery = transcript
      }
      recognition.onerror = event => {
        this.quranSearchError = event?.error ? `Voice search stopped: ${event.error}` : 'Voice search stopped.'
        this.quranSearchVoiceActive = false
      }
      recognition.onend = () => {
        this.quranSearchVoiceActive = false
      }
      this.quranSearchRecognition = recognition
      this.quranSearchVoiceActive = true
      recognition.start()
    },

    stopQuranVoiceSearch() {
      if (this.quranSearchRecognition) {
        try { this.quranSearchRecognition.stop() } catch { }
      }
      this.quranSearchRecognition = null
      this.quranSearchVoiceActive = false
    },

    playUiTone(kind = 'tap') {
      if (typeof window === 'undefined') return
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      try {
        const context = this.uiAudioContext || new AudioContext()
        this.uiAudioContext = context
        if (context.state === 'suspended') context.resume()
        const tones = {
          open: [520, 0.04],
          complete: [660, 0.055],
          save: [740, 0.06],
          error: [240, 0.055],
          tap: [460, 0.035]
        }
        const [frequency, duration] = tones[kind] || tones.tap
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const now = context.currentTime
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequency, now)
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(0.018, now + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(now)
        oscillator.stop(now + duration + 0.02)
      } catch (error) {
        console.warn('UI audio feedback failed:', error)
      }
    },

    async onLanguageChange(locale) {
      if (!this.$setLocale) return
      await this.$setLocale(locale)
      this.activeLocale = this.$i18n?.locale?.value || locale
    },

    syncBodyScrollLock(locked) {
      if (typeof document === 'undefined') return
      document.body.classList.toggle('tools-panel-open', !!locked)
      const hasBlockingOverlay = this.showRecordingsLibrary
        || this.showSelfCheckModal
        || this.showQuranSearchModal
        || this.showConfirmModal
        || this.showSessionExitModal
        || this.showPlannerCompletionModal
        || this.showSessionEndedModal
        || this.showResumeModal
        || this.showPlannerModal
        || this.showSessionAnalyticsModal
        || this.showHelpLearningModal
        || this.showPostLoginOnboarding
        || this.showHifzPlanModal
        || this.showAiMemorisationCheckerModal
      const shouldMarkPanelOpen = !!locked
        || this.showTools
        || this.showRecordingsLibrary
        || this.showSelfCheckModal
        || this.showQuranSearchModal
        || this.showConfirmModal
        || this.showSessionExitModal
        || this.showPlannerCompletionModal
        || this.showSessionEndedModal
        || this.showResumeModal
        || this.showPlannerModal
        || this.showSessionAnalyticsModal
        || this.showHelpLearningModal
        || this.showPostLoginOnboarding
        || this.showHifzPlanModal
        || this.showAiMemorisationCheckerModal
      document.body.classList.toggle('tools-panel-open', shouldMarkPanelOpen)
      document.body.style.overflow = hasBlockingOverlay ? 'hidden' : ''
    },

    focusToolsPanel() {
      this.$nextTick(() => {
        const panel = this.$refs.toolsPanel
        if (!panel) return
        panel.scrollTop = 0
        panel.focus({ preventScroll: true })
      })
    },

    restoreToolsFocus() {
      const fallback = document.querySelector('[aria-controls="memorisationToolsPanel"]')
      const target = this.toolsReturnFocusEl && typeof this.toolsReturnFocusEl.focus === 'function'
        ? this.toolsReturnFocusEl
        : fallback
      this.toolsReturnFocusEl = null
      if (target && typeof target.focus === 'function') {
        target.focus({ preventScroll: true })
      }
    },

    getGapDurationForVerse(verseDurationInSeconds) {
      if (this.gapBetweenVerses === "1x") {
        return verseDurationInSeconds;
      }
      return this.actualGapDelay;
    },
    getCurrentPlaybackGapSeconds() {
      const selectedDelay = Number(this.delay)
      if (Number.isFinite(selectedDelay)) return Math.max(0, selectedDelay)
      if (this.gapBetweenVerses === '1x') {
        const fullDuration = Math.max(0, Number(this.duration || this.audioElement?.duration || 0))
        const speedFactor = Math.max(0.25, Number(this.speed || this.audioElement?.playbackRate || 1))
        return fullDuration > 0 ? fullDuration / speedFactor : 0
      }
      return Math.max(0, Number(this.actualGapDelay || 0))
    },
    clearRecitationWindowTimer() {
      if (this.recitationWindowTimer) {
        window.clearInterval(this.recitationWindowTimer)
        this.recitationWindowTimer = null
      }
      this.recitationWindowActive = false
      this.recitationWindowRemaining = 0
    },
    startRecitationWindow(onComplete = null) {
      this.clearRecitationWindowTimer()
      const seconds = Math.max(5, Math.min(30, Number(this.recitationWindowSeconds || 8)))
      this.recitationWindowActive = true
      this.recitationWindowRemaining = seconds
      this.recitationWindowTimer = window.setInterval(() => {
        const nextRemaining = Math.max(0, Number(this.recitationWindowRemaining || 0) - 1)
        this.recitationWindowRemaining = nextRemaining
        if (nextRemaining > 0) return
        this.clearRecitationWindowTimer()
        if (typeof onComplete === 'function') onComplete()
      }, 1000)
    },

    // Example method showing how to use repetitions in playback
    playVerseWithRepetitions(verseIndex, verseDuration) {
      let currentRepetition = 0;
      const repeatVerse = () => {
        if (currentRepetition < this.repetitionsPerStep) {
          // Play the verse
          this.playVerse(verseIndex);
          currentRepetition++;

          // After verse finishes, apply gap delay
          const gapDelay = this.getGapDurationForVerse(verseDuration);

          setTimeout(() => {
            repeatVerse();
          }, (verseDuration + gapDelay) * 1000);
        } else {
          // Move to next verse
          this.nextVerse();
        }
      };

      repeatVerse();
    },
    closeSaveModal() {
      this.showSaveNameModal = false
      this.saveSessionName = ''
      this.nameError = ''
    },

    clearNameError() {
      if (this.nameError) this.nameError = ''
    },

    getReciterName() {
      const reciter = this.reciters.find(r => r.id === this.reciterId)
      return reciter ? reciter.name : 'Alafasy'
    },

    buildCurrentSessionStatsSnapshot() {
      const queue = Array.isArray(this.queue) ? this.queue : []
      const currentIndex = Math.max(0, Number(this.queueIndex || 0))
      const completedEntries = queue.slice(0, currentIndex)
      const completedVerseKeys = new Set(completedEntries.map(item => item?.verse?.key || item?.key).filter(Boolean))
      const activeVerseKey = this.effectiveActiveVerseKey || this.activeVerseKey || null
      if (activeVerseKey) completedVerseKeys.add(activeVerseKey)
      const versesRead = completedVerseKeys.size
      const elapsedSeconds = this.sessionStartedAt
        ? Math.max(0, Math.round((Number(this.statsTick || Date.now()) - Number(this.sessionStartedAt)) / 1000))
        : 0
      const repetitionsCompleted = Math.max(
        Number(this.centralSession?.repetitionTimes || 0),
        currentIndex
      )
      const weakVerses = Math.max(0, Number(this.sessionErrorCount || 0))
      const versePlayCounts = { ...(this.mutqinState?.sessionState?.verse_play_counts || {}) }
      const totalVersePlays = Object.values(versePlayCounts).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0)
      return {
        verses_read: versesRead,
        time_spent_seconds: elapsedSeconds,
        repetitions_completed: repetitionsCompleted,
        sessions_completed: Number(this.sessionCompleted ? 1 : 0),
        session_flow_steps: Math.max(1, queue.length || (this.verses?.length || 0) || 1),
        average_time_per_verse_seconds: versesRead > 0 ? Math.round(elapsedSeconds / versesRead) : 0,
        weak_verses_encountered: weakVerses,
        session_play_count: Math.max(0, Number(this.mutqinState?.sessionState?.play_count || 0)),
        verse_play_counts: versePlayCounts,
        total_verse_play_count: totalVersePlays,
        generated_at: new Date().toISOString()
      }
    },

    normalizeSessionStats(stats = {}, fallbackConfig = {}) {
      const rangeStart = Number(fallbackConfig?.rangeStart || 0)
      const rangeEnd = Number(fallbackConfig?.rangeEnd || 0)
      const totalVerses = rangeEnd >= rangeStart && rangeStart > 0 ? (rangeEnd - rangeStart + 1) : 0
      const versePlayCounts = (stats?.verse_play_counts && typeof stats.verse_play_counts === 'object') ? stats.verse_play_counts : {}
      const derivedVersePlayTotal = Object.values(versePlayCounts).reduce((sum, value) => sum + Math.max(0, Number(value || 0)), 0)
      const normalized = {
        verses_read: Math.max(0, Number(stats?.verses_read || 0)),
        time_spent_seconds: Math.max(0, Number(stats?.time_spent_seconds || 0)),
        repetitions_completed: Math.max(0, Number(stats?.repetitions_completed || 0)),
        sessions_completed: Math.max(0, Number(stats?.sessions_completed || 0)),
        session_flow_steps: Math.max(1, Number(stats?.session_flow_steps || totalVerses || 1)),
        average_time_per_verse_seconds: Math.max(0, Number(stats?.average_time_per_verse_seconds || 0)),
        weak_verses_encountered: Math.max(0, Number(stats?.weak_verses_encountered || 0)),
        session_play_count: Math.max(0, Number(stats?.session_play_count || 0)),
        verse_play_counts: versePlayCounts,
        total_verse_play_count: Math.max(derivedVersePlayTotal, Number(stats?.total_verse_play_count || 0)),
        generated_at: stats?.generated_at || null
      }
      if (!normalized.average_time_per_verse_seconds && normalized.verses_read > 0 && normalized.time_spent_seconds > 0) {
        normalized.average_time_per_verse_seconds = Math.round(normalized.time_spent_seconds / normalized.verses_read)
      }
      return normalized
    },

    normalizeSavedSessionRecord(session) {
      if (!session || typeof session !== 'object') return null
      const normalized = {
        ...session,
        config: { ...(session.config || {}) }
      }
      normalized.stats = this.normalizeSessionStats(session.stats || {}, normalized.config)
      return normalized
    },

    buildSessionRecord(name, options = {}) {
      const { archived = false, autoSaved = false } = options
      return {
        id: Date.now().toString(),
        name,
        archived: !!archived,
        autoSaved: !!autoSaved,
        savedAt: new Date().toISOString(),
        stats: this.buildCurrentSessionStatsSnapshot(),
        config: {
          chapterId: this.chapterId,
          chapterName: this.currentChapter?.name_simple,
          rangeStart: this.rangeStart,
          rangeEnd: this.rangeEnd,
          reciterId: this.reciterId,
          speed: this.speed,
          playMode: this.playMode,
          talqinModeEnabled: this.talqinModeEnabled,
          recitationWindowSeconds: this.recitationWindowSeconds,
          repetitionsPerStep: this.repetitionsPerStep,
          selectedLoopCount: this.selectedLoopCount,
          gapBetweenVerses: this.gapBetweenVerses,
          customGapSeconds: this.customGapSeconds,
          chainingEnabled: this.chainingEnabled,
          chainingMethod: this.chainingMethod,
          chainingRepetitions: this.chainingRepetitions,
          tajweedEnabled: this.tajweedEnabled,
          showTranslation: this.showTranslation,
          showTransliteration: this.showTransliteration,
          showWordByWord: this.showWordByWord,
          wordByWordAudioEnabled: this.wordByWordAudioEnabled,
          focusModeEnabled: this.focusModeEnabled,
          focusDimPercent: this.focusDimPercent,
          blurModeEnabled: this.blurModeEnabled,
          blurIntensity: this.blurIntensity,
          anchorModeEnabled: this.anchorModeEnabled,
          anchorCount: this.anchorCount,
          quranFont: this.quranFont,
          activeVerseKey: this.effectiveActiveVerseKey || this.activeVerseKey || null,
          queueIndex: Math.max(0, Number(this.queueIndex || 0)),
          currentTime: Number(this.currentTime || 0),
          playerVisible: !!this.playerVisible,
          audioSrc: this.audioElement?.currentSrc || ''
        },
        restore: {
          version: 1,
          exportedAt: new Date().toISOString(),
          continueSession: this.buildContinueSessionPayload(),
          sessionExitSnapshot: this.buildSessionExitSnapshot(),
          centralSession: deepClone(this.centralSession),
          currentMode: this.currentMode,
          theme: this.theme
        }
      }
    },

    addSavedSession(session) {
      this.savedSessions.unshift(this.normalizeSavedSessionRecord(session))
      if (this.savedSessions.length > 20) this.savedSessions = this.savedSessions.slice(0, 20)
      if (!this.selectedStatsSessionId && this.savedSessions[0]?.id) this.selectedStatsSessionId = this.savedSessions[0].id
      this.persistSavedSessions()
      return session
    },

    buildAutoSaveSessionName() {
      const chapter = this.currentChapter?.name_simple || 'Session'
      const ayah = Math.max(1, Number(this.currentPosition || 1))
      const stamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      let candidate = `${chapter} ${this.rangeStart}-${this.rangeEnd} · Ayah ${ayah} · ${stamp}`
      let suffix = 2
      while (this.savedSessions.some(session => session.name.toLowerCase() === candidate.toLowerCase())) {
        candidate = `${chapter} ${this.rangeStart}-${this.rangeEnd} · Ayah ${ayah} (${suffix})`
        suffix += 1
      }
      return candidate
    },

    saveCurrentSessionSilently(name = this.buildAutoSaveSessionName()) {
      if (!this.hasVerses) return null
      const session = this.buildSessionRecord(name, { archived: true, autoSaved: true })
      this.addSavedSession(session)
      return session
    },

    confirmSaveSession() {
      const trimmedName = this.saveSessionName.trim()

      if (!trimmedName) {
        this.nameError = 'Please enter a session name'
        return
      }

      if (trimmedName.length > 50) {
        this.nameError = 'Session name must be 50 characters or less'
        return
      }

      // Check for duplicate names
      const duplicate = this.savedSessions.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())
      if (duplicate) {
        this.nameError = 'A session with this name already exists'
        return
      }

      const session = this.addSavedSession(this.buildSessionRecord(trimmedName))

      this.showBanner(this.t('toasts.sessionSaved', { name: session.name }), 'success', 2000)
      this.closeSaveModal()
    },
    toggleWordAudio() {
      this.wordByWordAudioEnabled = !this.wordByWordAudioEnabled
      this.persistUiState()
      this.persistCentralSessionState()
      this.showBanner(this.wordByWordAudioEnabled ? 'Word audio enabled' : 'Word audio disabled', 'info', 1000)
    },
    applyRecommendedSetup() {
      this.playMode = 'auto'
      this.repetitionsPerStep = 5
      this.gapBetweenVerses = '1x'
      this.customGapSeconds = 2
      this.focusModeEnabled = true
      this.blurModeEnabled = false
      this.chainingEnabled = true
      this.chainingMethod = ''
      this.chainingRepetitions = 1
      this.anchorModeEnabled = false
      this.sectionOpen.advanced_setup = true
      this.sectionOpen.advanced_playback = false
      this.sectionOpen.repetitions = false
      this.sectionOpen.gap_between = false
      this.persistUiState()
      this.showBanner(this.t('toasts.recommendedSetupApplied'), 'success', 1500)
    },
    addToggleRipple(event) {
      const button = event.currentTarget;
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.classList.add('toggle-chip-ripple');

      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 400);
    },

    // Update your toggle methods to include ripple
    toggleFocusMode(event) {
      this.addToggleRipple(event);
      this.focusModeEnabled = !this.focusModeEnabled;
    },
    applyPreset(type) {
      this.focusModeEnabled = false;
      this.blurModeEnabled = false;
      this.chainingEnabled = false;
      this.chainingMethod = '';
      this.anchorModeEnabled = false;

      switch (type) {
        case 'guided':
          this.focusModeEnabled = true;
          this.chainingEnabled = true;
          this.chainingRepetitions = 1;
          this.showBanner(this.t('toasts.presetGuidedStart'), 'success', 2000);
          break;
        case 'chain':
          this.chainingEnabled = true;
          this.anchorModeEnabled = true;
          this.focusModeEnabled = true;
          this.showBanner(this.t('toasts.presetChainingAnchorModeWithFocus'), 'success', 2000);
          break;
        case 'blur':
          this.blurModeEnabled = true;
          this.chainingEnabled = false;
          this.showBanner(this.t('toasts.presetPureRecallWithBlurMode'), 'success', 2000);
          break;
        case 'focus':
          this.focusModeEnabled = true;
          this.anchorModeEnabled = true;
          this.showBanner(this.t('toasts.presetFocusModeAnchorHooks'), 'success', 2000);
          break;
      }

      this.enforceMemorisationRules();
      this.persistUiState();
      this.persistCentralSessionState();
    },
    enforceMemorisationRules() {
      if (this.focusModeEnabled && this.blurModeEnabled) {
        this.blurModeEnabled = false;
      }
      if (this.blurModeEnabled && this.chainingEnabled) {
        this.chainingEnabled = false;
        this.showBanner(this.t('toasts.blurModeWorksBestWithoutChaining'), 'info', 2500);
      }
      if (this.fadingVerseEnabled && this.showWordByWord) {
        this.showWordByWord = false;
        this.showBanner(this.t('toasts.fadingModeWordByWordDisabled'), 'info', 2000);
      }
    },
    removeBasmala(arabicText) {
      if (!arabicText) return ''
      const basmala = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
      // Also handle common variations
      const basmalaVariants = [
        'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'
      ]

      for (const variant of basmalaVariants) {
        if (arabicText.startsWith(variant)) {
          return arabicText.slice(variant.length).trim()
        }
      }
      return arabicText
    },
    toggleAnchorMode() {
      this.anchorModeEnabled = !this.anchorModeEnabled

      if (this.anchorModeEnabled) {
        this.scheduleAnchorHighlights()
        this.showBanner(this.t('toasts.anchorModeKeyWordsWillBe'), 'info', 3000)
        // Watch for verse changes
        this.setupAnchorObserver()
      } else {
        this.cancelAnchorHighlightFrame()
        this.clearAnchorHighlights()
        if (this.anchorHighlightObserver) {
          this.anchorHighlightObserver.disconnect()
          this.anchorHighlightObserver = null
        }
        this.showBanner(this.t('toasts.anchorModeDisabled'), 'info', 1500)
      }

      this.persistUiState()
      this.persistCentralSessionState()
    },

    // Handle anchor count change dynamically
    onAnchorCountChange() {
      if (this.anchorModeEnabled) {
        this.scheduleAnchorHighlights()
        const anchorText = { 1: '1 anchor (center)', 2: '2 anchors (start+end)', 3: '3 anchors (strategic)' }
        this.showBanner(this.t('toasts.anchorModeUsing', { anchorCount: anchorText[this.anchorCount] }), 'info', 2000)
      }
      this.persistUiState()
      this.persistCentralSessionState()
    },

    scheduleAnchorHighlights() {
      if (!this.anchorModeEnabled || this.anchorHighlightFrame || typeof window === 'undefined') return
      const schedule = typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : callback => window.setTimeout(() => callback(Date.now()), 16)

      this.anchorHighlightFrame = schedule(() => {
        this.anchorHighlightFrame = null
        this.applyAnchorHighlights()
      })
    },

    cancelAnchorHighlightFrame() {
      if (!this.anchorHighlightFrame || typeof window === 'undefined') return
      if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(this.anchorHighlightFrame)
      window.clearTimeout(this.anchorHighlightFrame)
      this.anchorHighlightFrame = null
    },

    // Main function to apply anchor highlights to all verses
    applyAnchorHighlights() {
      if (!this.anchorModeEnabled) return

      this.$nextTick(() => {
        const activeTargets = document.querySelectorAll('.verse-card.active, .mushaf-ayah.active')
        if (activeTargets.length) {
          activeTargets.forEach(card => {
            this.highlightAnchorsForCard(card)
          })
          return
        }
        const verseCards = document.querySelectorAll('.verse-card')
        verseCards.forEach(card => {
          this.highlightAnchorsForCard(card)
        })
        const mushafAyahs = document.querySelectorAll('.mushaf-ayah')
        mushafAyahs.forEach(ayah => {
          this.highlightAnchorsForCard(ayah)
        })
      })


    },



    highlightAnchorsForCard(card) {
      if (!this.anchorModeEnabled) return

      // Get all word elements (supports both word-by-word modes)
      const arabicDiv = card.querySelector('.verse-arabic, .mushaf-ayah-text')
      if (!arabicDiv) return

      // Get words - handles both tajweed and non-tajweed modes
      let words = arabicDiv.querySelectorAll('.wbw-word, word')

      // If no word elements, try to get from word-by-word section
      if (!words.length) {
        const wordItems = card.querySelectorAll('.word-item')
        if (wordItems.length) {
          words = wordItems
        }
      }

      if (!words.length) return

      // Calculate which indices to highlight
      const totalWords = words.length
      const anchorIndices = this.getAnchorIndices(totalWords)

      // Remove existing highlights
      words.forEach(word => {
        word.classList.remove('anchor-highlight')
        word.classList.remove('anchor-pulse')
      })

      // Apply new highlights with animation
      anchorIndices.forEach((index, i) => {
        if (words[index]) {
          words[index].classList.add('anchor-highlight')
          // Add sequential animation delay
          setTimeout(() => {
            if (words[index]) words[index].classList.add('anchor-pulse')
          }, i * 100)
        }
      })
    },

    getAnchorIndices(totalWords) {
      if (totalWords === 0) return []
      if (totalWords === 1) return [0]
      if (totalWords === 2) return [0, 1]

      if (this.anchorCount === 1) {
        // Center word
        return [Math.floor(totalWords / 2)]
      }
      else if (this.anchorCount === 2) {
        // First and last
        return [0, totalWords - 1]
      }
      else {
        // 3 anchors: strategic positions (20%, 50%, 80%)
        const positions = [
          Math.floor(totalWords * 0.2),    // ~20% in
          Math.floor(totalWords * 0.5),    // Middle
          Math.floor(totalWords * 0.8)     // ~80% in
        ]
        // Remove duplicates and sort
        return [...new Set(positions)].sort((a, b) => a - b)
      }
    },

    // Clear all anchor highlights
    clearAnchorHighlights() {
      const allWords = document.querySelectorAll('.wbw-word, word, .word-item, .mushaf-ayah-text .wbw-word')
      allWords.forEach(word => {
        word.classList.remove('anchor-highlight')
        word.classList.remove('anchor-pulse')
      })
    },

    // Watch for DOM changes (verse navigation, new verses loading)
    setupAnchorObserver() {
      if (this.anchorHighlightObserver) {
        this.anchorHighlightObserver.disconnect()
        this.anchorHighlightObserver = null
      }
      if (!this.anchorModeEnabled) return

      this.anchorHighlightObserver = new MutationObserver((mutations) => {
        let shouldReapply = false
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length) {
            shouldReapply = true
          }
          if (mutation.type === 'attributes' &&
            mutation.attributeName === 'class' &&
            (mutation.target.classList?.contains('verse-card') || mutation.target.classList?.contains('mushaf-ayah'))) {
            shouldReapply = true
          }
        })

        if (shouldReapply) {
          this.scheduleAnchorHighlights()
        }
      })

      // Watch the workspace for changes
      const workspace = document.querySelector('.workspace')
      if (workspace) {
        this.anchorHighlightObserver.observe(workspace, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class']
        })
      }
    },

    // Watch for active verse changes to highlight anchors in new content
    watchActiveVerse() {
      // Re-apply highlights when active verse changes
      this.$watch('effectiveActiveVerseKey', () => {
        if (this.anchorModeEnabled) this.scheduleAnchorHighlights()
      })

      // Also watch for verse data loading
      this.$watch('isDataReady', (newVal) => {
        if (newVal && this.anchorModeEnabled) {
          this.scheduleAnchorHighlights()
        }
      })
    },

    // Update the getDisplayArabic method to preserve anchor classes
    // Add this to your existing getDisplayArabic method or override
    preserveAnchorClasses() {
      // This ensures highlights persist when verses re-render
      if (this.anchorModeEnabled) {
        this.scheduleAnchorHighlights()
      }
    },
    showCountdown(callback) {
      this.showCountdownOverlay = true
      this.countdownValue = 3

      if (this.countdownInterval) {
        clearInterval(this.countdownInterval)
      }

      this.countdownInterval = setInterval(() => {
        this.countdownValue--

        if (this.countdownValue < 0) {
          clearInterval(this.countdownInterval)
          this.countdownInterval = null
          this.showCountdownOverlay = false
          if (callback) callback()
        }
      }, 1000)
    },

    getTalqinModeToggleValue() {
      if (typeof document === 'undefined') return !!this.talqinModeEnabled
      const toggle = document.getElementById('talqin-mode-toggle')
      if (toggle && 'checked' in toggle) return !!toggle.checked
      if (toggle && typeof toggle.getAttribute === 'function') {
        return toggle.getAttribute('aria-pressed') === 'true'
      }
      return !!this.talqinModeEnabled
    },

    clearTalqinPauseTimer() {
      if (this.talqinPauseTimer) {
        window.clearTimeout(this.talqinPauseTimer)
        this.talqinPauseTimer = null
      }
    },

    getTalqinPauseDelayMs() {
      const verseDurationSeconds = Math.max(0, Number(this.duration || this.audioElement?.duration || 0))
      const configuredDelayMs = Math.max(0, Number(this.getCurrentPlaybackGapSeconds() || 0) * 1000)
      const talqinDelayMs = verseDurationSeconds > 0 ? verseDurationSeconds * 1.5 * 1000 : 0
      return Math.max(configuredDelayMs, talqinDelayMs)
    },

    scheduleTalqinAdvance(onComplete = null) {
      this.clearTalqinPauseTimer()
      const delayMs = this.getTalqinPauseDelayMs()
      this.talqinPauseTimer = window.setTimeout(() => {
        this.talqinPauseTimer = null
        window.setTimeout(() => {
          if (!this.talqinModeActive) {
            return
          }
          if (typeof onComplete === 'function') onComplete()
        }, 300)
      }, delayMs)
    },

    beginTalqinRecitationTurn(onComplete = null) {
      this.clearTalqinPauseTimer()
      this.clearRecitationWindowTimer()
      this.recitationWindowActive = true
      this.startRecitationWindow(() => {
        if (typeof onComplete === 'function') onComplete()
      })
    },

    startSessionAfterUserGesture() {
      if (!this.canStartSession) {
        this.showTools = true
        this.showBanner(this.t('toasts.chooseAValidSurahAndAyah'), 'info', 3600)
        return
      }
      this.showPlannerCompletionModal = false
      this.showPlannerCompletionConfetti = false
      this.showSessionEndedModal = false
      this.startSession()
    },

    startSessionWithCountdown() {
      if (!this.canStartSession) {
        this.showTools = true
        this.showBanner(this.t('toasts.chooseAValidSurahAndAyah'), 'info', 3600)
        return
      }

      this.showPlannerCompletionModal = false
      this.showPlannerCompletionConfetti = false
      this.showSessionEndedModal = false
      const self = this
      this.showCountdown(function () {
        self.startSession()
      })
    },
    async startSessionAndClose() {
      if (!this.canStartSession) {
        this.showTools = true
        this.showBanner(this.t('toasts.pleaseSelectAValidSurahAnd'), 'info', 3600)
        return
      }
      this.talqinModeEnabled = this.getTalqinModeToggleValue()
      this.applySessionConfig(this.buildSessionConfig(this.currentMode))
      this.persistModeState(this.currentMode)
      this.persistUiState()
      this.persistCentralSessionState()
      await this.applyWorkspaceControls({ mode: this.currentMode })
      this.closeToolsPanel()
      setTimeout(() => {
        this.startSessionWithCountdown()
      }, 100)
    },
    handlePrimaryAction() {
      if (this.isPlaying) {
        if (this.audioElement) this.audioElement.pause()
        this.isPlaying = false
        return
      }
      this.startSessionWithCountdown()
    },
    saveCurrentSessionWithName() {
      const defaultName = `${this.currentChapter?.name_simple || 'Session'} ${this.rangeStart}-${this.rangeEnd}`
      this.saveSessionName = defaultName
      this.showSaveNameModal = true
      this.closeToolsPanel()
    },
    toggleFullScreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log(`Full-screen error: ${err.message}`)
        })
      } else {
        document.exitFullscreen()
      }
    },

    getDisplayArabic(verse) {
      if (!verse || !verse.arabic) return ''

      // Word-aware rendering supports both plain and tajweed-marked Arabic.
      if (this.showWordByWord || this.anchorModeEnabled || this.wordByWordAudioEnabled) {
        return this.splitArabicIntoWords(verse)
      }

      // Fallback to plain Arabic
      return this.stripTajweedMarkup(verse.arabic || '')
    },

    // Fix banner positioning - update CSS
    toggleKeyboardShortcuts() {
      this.showKeyboardShortcuts = !this.showKeyboardShortcuts
    },
    closeKeyboardShortcuts() {
      this.showKeyboardShortcuts = false
    },

    saveCurrentSession() {
      if (!this.hasVerses) {
        this.showBanner(this.t('toasts.noActiveSessionToSave'), 'warning', 2000)
        return
      }

      this.addSavedSession(this.buildSessionRecord(`${this.currentChapter?.name_simple || 'Session'} ${this.rangeStart}-${this.rangeEnd}`))
      this.showBanner(this.t('toasts.sessionSaved2'), 'success', 1500)
    },

    setRepetitionsFromSlider(value) {
      this.repetitionsPerStep = Math.max(1, Math.min(10, Number(value || 1)))
    },

    isLoadingSession(sessionId) {
      return this.loadingSessionId === sessionId
    },

    isSessionExportSuccessful(sessionId, format) {
      return this.exportSessionState.successSessionId === sessionId && this.exportSessionState.successFormat === format
    },

    getSessionExportIcon(sessionId, format, fallbackIcon) {
      if (this.isExportingSession(sessionId, format)) return 'bi-arrow-repeat spin'
      if (this.isSessionExportSuccessful(sessionId, format)) return 'bi-check2-circle'
      return fallbackIcon
    },

    getSessionExportLabel(sessionId, format, fallbackLabel) {
      if (this.isExportingSession(sessionId, format)) return 'Preparing…'
      return fallbackLabel
    },

    buildSessionResumeSummary(session) {
      const stats = this.normalizeSessionStats(session?.stats || {}, session?.config || {})
      const verse = session?.config?.activeVerseKey ? String(session.config.activeVerseKey).split(':')[1] : (session?.config?.rangeStart || 1)
      const reads = Math.max(0, Number(stats.verses_read || 0))
      return `Resume from ayah ${verse} · ${reads} ayah${reads === 1 ? '' : 's'} covered`
    },

    getSavedSessionState(session) {
      if (this.isLoadingSession(session?.id)) return { label: 'Opening', tone: 'loading' }
      if (this.sessionMatchesCurrentLiveConfig(session)) {
        return this.isPlaying
          ? { label: 'Playing', tone: 'active' }
          : { label: 'Paused', tone: 'paused' }
      }
      if (session?.archived) return { label: 'Auto-saved', tone: 'muted' }
      return { label: 'Ready to resume', tone: 'idle' }
    },

    async hydrateSessionFromPayload(payload, options = {}) {
      if (!payload?.config?.chapterId) return false
      const mode = payload.mode || this.currentMode || 'beginner'
      const target = mode === 'planner' ? 'planner' : (mode === 'beginner' ? 'beginner' : 'advanced')

      this.currentMode = mode
      this.tab = 'tools'
      this.applySessionConfig({ ...(payload.config || {}), mode })
      this[target] = {
        ...(target === 'planner' ? createPlannerState() : (target === 'beginner' ? createBeginnerState() : createAdvancedState())),
        ...this.cloneModeState(payload.config || {})
      }

      await this.loadChapter(mode)
      this.buildQueue(mode)

      const store = this.getModeStore(mode)
      const targetKey = payload.activeVerseKey || payload.activeKey || payload.config?.activeVerseKey || null
      let restoredQueueIndex = Math.max(0, Number(payload.queueIndex ?? payload.config?.queueIndex ?? 0))

      if (targetKey) {
        const exactIndex = store.queue?.findIndex(item => (item?.verse?.key || item?.key) === targetKey)
        if (exactIndex >= 0) restoredQueueIndex = exactIndex
      }

      store.queueIndex = Math.min(restoredQueueIndex, Math.max((store.queue?.length || 1) - 1, 0))
      this.queueIndex = store.queueIndex
      this.syncMutqinAyahs(store.verses || this.verses)
      this.syncMutqinSession(store.queue || [], mode)
      moveMutqinSession(this.mutqinState, this.queueIndex + 1)

      const restoredKey = store.queue?.[this.queueIndex]?.verse?.key || store.queue?.[this.queueIndex]?.key || targetKey
      if (restoredKey) {
        this.setActiveVerse(restoredKey, { mode, queueIndex: this.queueIndex, scroll: false })
      }

      this.sessionCompleted = false
      this.sessionCompletedAt = null
      this.sessionStartedAt = Date.now()
      this.playerVisible = payload.playerVisible ?? payload.config?.playerVisible ?? true
      const shouldResumePlayback = options.forcePlayback ?? payload.isPlaying ?? true
      this.restoredAudioState = {
        src: payload.audioSrc || payload.config?.audioSrc || '',
        currentTime: Number(payload.currentTime ?? payload.config?.currentTime ?? 0),
        playerVisible: !!(payload.playerVisible ?? payload.config?.playerVisible ?? true),
        speed: Number(payload.config?.speed || this.speed || 1),
        isPlaying: !!shouldResumePlayback
      }
      this.$nextTick(() => {
        if (this.restoredAudioState?.src) {
          this.applyRestoredAudioState()
          return
        }
        if (shouldResumePlayback) {
          const entry = store.queue?.[this.queueIndex]
          if (entry) this.playQueueEntry(entry, { force: true, queueIndex: this.queueIndex })
        }
      })
      this.persistAllState()
      if (options.banner !== false) this.showBanner(options.bannerText || 'Session restored', 'success', 2200)
      return true
    },

    async loadSavedSession(sessionId) {
      const session = this.savedSessions.find(s => s.id === sessionId)
      if (!session) return
      this.loadingSessionId = sessionId
      try {
        const restorePayload = session.restore?.continueSession
          ? { ...session.restore.continueSession, config: { ...(session.config || {}), ...(session.restore.continueSession.config || {}) } }
          : {
            mode: session.restore?.currentMode || this.currentMode,
            config: session.config || {},
            activeVerseKey: session.config?.activeVerseKey || null,
            queueIndex: Number(session.config?.queueIndex || 0),
            currentTime: Number(session.config?.currentTime || 0),
            audioSrc: session.config?.audioSrc || '',
            playerVisible: !!session.config?.playerVisible,
            isPlaying: false
          }
        await this.hydrateSessionFromPayload(restorePayload, { bannerText: `Loaded: ${session.name}`, forcePlayback: false })
        this.showTools = false
        this.$nextTick(() => {
          this.startSessionWithCountdown()
        })
      } finally {
        this.loadingSessionId = ''
      }
    },

    // Update deleteSavedSession method
    deleteSavedSession(sessionId) {
      const session = this.savedSessions.find(s => s.id === sessionId)
      const label = session ? (session.name || this.getSessionPrimaryLabel(session)) : 'this session'
      this.openConfirmModal({
        title: 'Delete saved session?',
        message: `This will permanently remove "${label}" and its export snapshot from this device.`,
        confirmLabel: 'Delete session',
        cancelLabel: 'Keep session',
        tone: 'danger',
        action: 'delete-saved-session',
        data: { sessionId }
      })
    },

    performDeleteSavedSession(sessionId) {
      this.savedSessions = this.savedSessions.filter(s => s.id !== sessionId)
      if (this.selectedStatsSessionId === sessionId) {
        this.selectedStatsSessionId = this.savedSessions[0]?.id || ''
      }
      this.persistSavedSessions()
      this.showBanner(this.t('toasts.sessionDeleted'), 'info', 1500)
    },

    savedSessionsStorageKey() {
      return this.userStorageKey('savedSessions')
    },

    buildSeededSession(name, config = {}, position = 0) {
      const baseId = `${this.auth?.id || 'guest'}-${position + 1}`
      return {
        id: `seeded-${baseId}`,
        name,
        archived: false,
        autoSaved: false,
        savedAt: new Date(Date.UTC(2026, 4, 20 - Math.min(position, 10), 8 + (position % 8), 15, 0)).toISOString(),
        config: {
          chapterId: 1,
          chapterName: 'Al-Fatihah',
          rangeStart: 1,
          rangeEnd: 7,
          reciterId: DEFAULT_ALQURAN_RECITER,
          speed: 1,
          playMode: 'auto',
          talqinModeEnabled: false,
          recitationWindowSeconds: 8,
          chainingEnabled: false,
          chainingMethod: '',
          chainingRepetitions: 1,
          tajweedEnabled: false,
          showTranslation: true,
          showTransliteration: false,
          showWordByWord: false,
          wordByWordAudioEnabled: false,
          focusModeEnabled: false,
          blurModeEnabled: false,
          blurIntensity: 10,
          anchorModeEnabled: false,
          anchorCount: 2,
          quranFont: 'uthmani',
          activeVerseKey: null,
          queueIndex: 0,
          currentTime: 0,
          playerVisible: false,
          audioSrc: '',
          ...config
        }
      }
    },

    getSeededSessionsForCurrentUser() {
      const email = String(this.auth?.email || '').toLowerCase()
      const match = email.match(/^practice(\d{2})@example\.com$/)
      if (!match) return []

      const presetGroups = [
        [
          this.buildSeededSession('Focused Start', {
            chapterId: 112,
            chapterName: 'Al-Ikhlas',
            rangeStart: 1,
            rangeEnd: 4,
            focusModeEnabled: true,
            showTranslation: true,
            showWordByWord: true
          }, 0),
          this.buildSeededSession('Linking Review', {
            chapterId: 87,
            chapterName: 'Al-Ala',
            rangeStart: 1,
            rangeEnd: 7,
            chainingEnabled: true,
            chainingMethod: 'linking',
            chainingRepetitions: 2,
            tajweedEnabled: true
          }, 1)
        ],
        [
          this.buildSeededSession('Pure Recall Drill', {
            chapterId: 75,
            chapterName: 'Al-Qiyamah',
            rangeStart: 1,
            rangeEnd: 10,
            blurModeEnabled: true,
            blurIntensity: 14,
            chainingEnabled: false,
            showTranslation: false
          }, 0),
          this.buildSeededSession('Anchor Pass', {
            chapterId: 78,
            chapterName: 'An-Naba',
            rangeStart: 31,
            rangeEnd: 40,
            anchorModeEnabled: true,
            anchorCount: 2,
            showWordByWord: true
          }, 1)
        ],
        [
          this.buildSeededSession('Cumulative Build', {
            chapterId: 73,
            chapterName: 'Al-Muzzammil',
            rangeStart: 1,
            rangeEnd: 8,
            chainingEnabled: true,
            chainingMethod: 'cumulative',
            chainingRepetitions: 3,
            speed: 0.75
          }, 0),
          this.buildSeededSession('Translation Support', {
            chapterId: 55,
            chapterName: 'Ar-Rahman',
            rangeStart: 1,
            rangeEnd: 6,
            showTranslation: true,
            showTransliteration: true,
            tajweedEnabled: true
          }, 1)
        ]
      ]

      const index = Math.max(0, Number.parseInt(match[1], 10) - 1)
      return (presetGroups[index % presetGroups.length] || []).map((session, sessionIndex) => ({
        ...session,
        id: `seeded-${match[1]}-${sessionIndex + 1}`
      }))
    },

    ensureSeededSavedSessions() {
      if (!this.auth?.check) return
      const seededFlagKey = this.userStorageKey('savedSessionsSeeded')
      const storageKey = this.savedSessionsStorageKey()

      try {
        if (localStorage.getItem(seededFlagKey) === '1') return

        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]')
        if (Array.isArray(existing) && existing.length > 0) {
          localStorage.setItem(seededFlagKey, '1')
          return
        }

        const seededSessions = this.getSeededSessionsForCurrentUser()
        if (!seededSessions.length) return

        localStorage.setItem(storageKey, JSON.stringify(seededSessions))
        localStorage.setItem(seededFlagKey, '1')
      } catch (error) {
        console.error('Failed to seed demo saved sessions:', error)
      }
    },

    persistSavedSessions() {
      try {
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue('savedSessions', this.savedSessions)
        } else {
          localStorage.setItem(this.savedSessionsStorageKey(), JSON.stringify(this.savedSessions))
        }
      } catch (e) {
        console.error('Failed to save sessions:', e)
      }
    },

    loadSavedSessions() {
      try {
        this.ensureSeededSavedSessions()
        const saved = localStorage.getItem(this.savedSessionsStorageKey())
        if (saved) {
          this.savedSessions = JSON.parse(saved).map(session => this.normalizeSavedSessionRecord(session)).filter(Boolean)
          if (!this.savedSessions.some(session => session.id === this.selectedStatsSessionId)) {
            this.selectedStatsSessionId = this.savedSessions[0]?.id || ''
          }
        }
      } catch (e) {
        console.error('Failed to load saved sessions:', e)
        this.savedSessions = []
        this.selectedStatsSessionId = ''
      }
    },

    selectStatsSession(sessionId) {
      this.selectedStatsSessionId = sessionId
    },
    getSavedSessionName(session) {
      return String(session?.name || this.getSessionPrimaryLabel(session) || 'Saved session')
    },
    getSavedSessionSurah(session) {
      if (session?.config?.chapterName) return `Surah ${session.config.chapterName}`
      if (session?.chapterName) return `Surah ${session.chapterName}`
      if (session?.config?.chapterId) return `Surah ${session.config.chapterId}`
      return 'Surah not set'
    },
    getOnboardingChoiceValue(choiceKey) {
      if (choiceKey === 'path') return this.onboardingPath
      if (choiceKey === 'goal') return this.onboardingGoal
      return ''
    },
    setOnboardingChoice(choiceKey, value) {
      if (choiceKey === 'path') this.onboardingPath = value
      if (choiceKey === 'goal') this.onboardingGoal = value
      this.applyOnboardingStep(this.onboardingStepIndex)
    },
    applyOnboardingGoalPreset() {
      if (this.onboardingGoal === 'steady') {
        this.rangeStart = 1
        this.rangeEnd = 5
        this.repetitionsPerStep = 4
        return
      }
      if (this.onboardingGoal === 'revision') {
        this.rangeStart = 1
        this.rangeEnd = 4
        this.repetitionsPerStep = 3
        this.showTranslation = false
        return
      }

      this.rangeStart = 1
      this.rangeEnd = 3
      this.repetitionsPerStep = 5
    },
    getOnboardingStorageKey() {
      const userId = this.auth?.id ? String(this.auth.id) : 'guest'
      return `mutqin.onboardingCompleted.${userId}`
    },
    hasCompletedOnboarding() {
      if (this.learningBackendEnabled()) {
        return !!this.readWorkspaceStateValue('onboardingCompleted', false)
      }
      try {
        return localStorage.getItem(this.getOnboardingStorageKey()) === 'true'
      } catch {
        return false
      }
    },
    markOnboardingCompleted() {
      if (this.learningBackendEnabled()) {
        this.writeWorkspaceStateValue('onboardingCompleted', true)
        return
      }
      try {
        localStorage.setItem(this.getOnboardingStorageKey(), 'true')
      } catch { }
    },
    openOnboardingModal(force = false) {
      if (!this.isLoggedIn && !force) return
      this.onboardingManualLaunch = !!force
      this.onboardingStepIndex = 0
      if (!force && !this.auth?.just_registered && this.hasCompletedOnboarding()) return
      this.sessionEndedSnapshot = null
      if (!this.onboardingDemoActive) this.prepareOnboardingDemo()
      this.showTools = false
      this.tab = 'tools'
      window.setTimeout(() => {
        this.showPostLoginOnboarding = true
        this.applyOnboardingStep(0)
      }, 50)
    },
    openOnboardingFromTopMenu() {
      this.topCardMenuOpen = false
      this.openOnboardingModal(true)
    },
    nextOnboardingStep() {
      this.onboardingStepIndex = Math.min(this.onboardingSteps.length - 1, this.onboardingStepIndex + 1)
      this.applyOnboardingStep(this.onboardingStepIndex)
    },
    skipOnboarding() {
      this.markOnboardingCompleted()
      this.showPostLoginOnboarding = false
      this.onboardingStepIndex = 0
      this.sessionEndedSnapshot = null
      this.restoreOnboardingDemo()
      if (!this.onboardingManualLaunch && this.auth?.just_registered) {
        this.applyDefaultWorkspaceSessionConfig({ openSetup: false })
      }
      this.onboardingManualLaunch = false
    },
    async completeOnboardingAndStart() {
      this.markOnboardingCompleted()
      this.showPostLoginOnboarding = false
      this.onboardingStepIndex = 0
      this.sessionEndedSnapshot = null
      this.applyOnboardingStep(this.onboardingSteps.length - 1)
      if (this.onboardingManualLaunch) {
        this.restoreOnboardingDemo()
        this.onboardingManualLaunch = false
        return
      }
      this.restoreOnboardingDemo({ keepCurrentSession: true })
      this.onboardingManualLaunch = false
      this.applyOnboardingGoalPreset()
      this.currentMode = 'advanced'
      this.tab = 'tools'
      this.showTools = false
      if (this.chapterId) {
        this.focusModeEnabled = false
        this.blurModeEnabled = false
        this.chainingEnabled = false
        this.anchorModeEnabled = false
        await this.loadChapter(this.currentMode)
        this.$nextTick(() => {
          this.startSessionWithCountdown()
        })
      }
    },
    async completeOnboardingWithDefaultSession() {
      this.markOnboardingCompleted()
      this.showPostLoginOnboarding = false
      this.onboardingStepIndex = 0
      this.sessionEndedSnapshot = null
      this.restoreOnboardingDemo({ keepCurrentSession: true })
      this.onboardingManualLaunch = false
      this.applyDefaultWorkspaceSessionConfig({ openSetup: false })
      await this.loadChapter(this.currentMode)
      this.isDataReady = true
      this.$nextTick(() => {
        this.startSessionWithCountdown()
      })
    },
    prepareOnboardingDemo() {
      const snapshot = {
        tab: this.tab,
        showTools: this.showTools,
        currentMode: this.currentMode,
        chapterId: this.chapterId,
        rangeStart: this.rangeStart,
        rangeEnd: this.rangeEnd,
        reciterId: this.reciterId,
        speed: this.speed,
        playMode: this.playMode,
        talqinModeEnabled: this.talqinModeEnabled,
        recitationWindowSeconds: this.recitationWindowSeconds,
        repetitionsPerStep: this.repetitionsPerStep,
        selectedLoopCount: this.selectedLoopCount,
        gapBetweenVerses: this.gapBetweenVerses,
        customGapSeconds: this.customGapSeconds,
        chainingEnabled: this.chainingEnabled,
        chainingMethod: this.chainingMethod,
        chainingRepetitions: this.chainingRepetitions,
        focusModeEnabled: this.focusModeEnabled,
        focusDimPercent: this.focusDimPercent,
        blurModeEnabled: this.blurModeEnabled,
        blurIntensity: this.blurIntensity,
        anchorModeEnabled: this.anchorModeEnabled,
        anchorCount: this.anchorCount,
        readingViewMode: this.readingViewMode,
        sectionOpen: deepClone(this.sectionOpen || {})
      }
      this.onboardingDemoSnapshot = snapshot
      this.onboardingDemoActive = true
      this.currentMode = 'advanced'
      const demoChapter = this.chapters.find(chapter => Number(chapter.id) === 112) || this.chapters[0] || null
      if (demoChapter) {
        this.chapterId = Number(demoChapter.id)
        this.currentChapter = demoChapter
      }
      this.rangeStart = 1
      this.rangeEnd = 4
      this.reciterId = this.reciters[0]?.id || this.reciterId
      this.speed = 1
      this.playMode = 'auto'
      this.talqinModeEnabled = false
      this.repetitionsPerStep = 5
      this.chainingEnabled = false
      this.chainingMethod = ''
      this.chainingRepetitions = 1
      this.focusModeEnabled = false
      this.focusDimPercent = 54
      this.blurModeEnabled = false
      this.blurIntensity = 10
      this.anchorModeEnabled = false
      this.anchorCount = 2
      this.readingViewMode = 'stacked'
      this.tab = 'tools'
      this.showTools = true
    },
    restoreOnboardingDemo(options = {}) {
      const snapshot = this.onboardingDemoSnapshot
      if (!snapshot) return
      this.onboardingDemoActive = false
      this.onboardingDemoSnapshot = null
      if (options.keepCurrentSession) return
      this.tab = snapshot.tab
      this.showTools = snapshot.showTools
      this.currentMode = snapshot.currentMode
      this.chapterId = snapshot.chapterId
      this.rangeStart = snapshot.rangeStart
      this.rangeEnd = snapshot.rangeEnd
      this.reciterId = snapshot.reciterId
      this.speed = snapshot.speed
      this.playMode = snapshot.playMode
      this.talqinModeEnabled = !!snapshot.talqinModeEnabled
      this.recitationWindowSeconds = snapshot.recitationWindowSeconds || this.recitationWindowSeconds
      this.repetitionsPerStep = snapshot.repetitionsPerStep || this.repetitionsPerStep
      this.selectedLoopCount = snapshot.selectedLoopCount ?? this.selectedLoopCount
      this.gapBetweenVerses = snapshot.gapBetweenVerses || this.gapBetweenVerses
      this.customGapSeconds = snapshot.customGapSeconds || this.customGapSeconds
      this.chainingEnabled = snapshot.chainingEnabled
      this.chainingMethod = snapshot.chainingMethod
      this.chainingRepetitions = snapshot.chainingRepetitions
      this.focusModeEnabled = snapshot.focusModeEnabled
      this.focusDimPercent = snapshot.focusDimPercent || this.focusDimPercent
      this.blurModeEnabled = snapshot.blurModeEnabled
      this.blurIntensity = snapshot.blurIntensity || this.blurIntensity
      this.anchorModeEnabled = snapshot.anchorModeEnabled
      this.anchorCount = snapshot.anchorCount
      this.readingViewMode = ['stacked', 'mushaf'].includes(snapshot.readingViewMode)
        ? snapshot.readingViewMode
        : this.readingViewMode
      this.sectionOpen = deepClone(snapshot.sectionOpen || this.sectionOpen)
      this.persistUiState()
    },
    applyOnboardingStep(stepIndex) {
      if (!this.onboardingDemoActive) return
      const step = Math.max(0, Math.min(this.onboardingSteps.length - 1, Number(stepIndex || 0)))
      const stepMeta = this.onboardingSteps[step] || {}
      this.applyOnboardingGoalPreset()
      const stepConfig = [
        { tab: 'tools', section: 'advanced_setup', mode: 'stacked', blur: false, chaining: false, anchor: false },
        { tab: 'settings', section: 'reading_settings', mode: 'mushaf', blur: false, chaining: false, anchor: false },
        { tab: 'tools', section: 'advanced_playback', mode: 'stacked', blur: false, chaining: false, anchor: false },
        { tab: 'saved', section: null, mode: 'stacked', blur: false, chaining: false, anchor: false }
      ][step] || { tab: 'tools', section: 'advanced_setup' }
      if (stepMeta.targetSection) stepConfig.section = stepMeta.targetSection
      this.tab = stepConfig.tab
      this.showTools = true
      if (stepConfig.mode) this.readingViewMode = stepConfig.mode
      this.blurModeEnabled = !!stepConfig.blur
      this.chainingEnabled = stepConfig.chaining !== false
      this.anchorModeEnabled = !!stepConfig.anchor
      if (stepConfig.section) {
        const openMap = {
          advanced_setup: true,
          advanced_playback: false,
          reading_settings: true,
          display_settings: false,
          focus_mode: false,
          blur_mode: false,
          chaining: false,
          anchor_mode: false
        }
        Object.keys(openMap).forEach(key => {
          if (this.sectionOpen[key] !== undefined) this.sectionOpen[key] = false
        })
        if (this.sectionOpen[stepConfig.section] !== undefined) this.sectionOpen[stepConfig.section] = true
      }
      this.$nextTick(() => {
        const target = stepMeta.targetSelector
          ? this.$refs.toolsBody?.querySelector?.(stepMeta.targetSelector)
          : null
        const section = target || this.$refs.toolsBody?.querySelector?.(`.sheet-section .sheet-toggle`) || null
        if (section?.scrollIntoView) section.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    openSessionAnalyticsModal(session) {
      if (!session?.id) return
      this.analyticsModalRecordId = session.id
      this.analyticsModalLoaded = false
      this.analyticsModalData = null
      this.analyticsReportState = { loading: false, success: false, error: '' }
      this.showSessionAnalyticsModal = true

      window.requestAnimationFrame(() => {
        this.refreshAnalyticsModalData(session)
      })
    },
    openHelpLearningModal() {
      this.topCardMenuOpen = false
      this.helpLearningActiveKey = this.helpLearningSections[0]?.key || 'tajweed'
      this.showHelpLearningModal = true
    },
    closeHelpLearningModal() {
      this.showHelpLearningModal = false
    },
    selectHelpLearningSection(sectionKey) {
      if (!this.helpLearningSections.some(section => section.key === sectionKey)) return
      this.helpLearningActiveKey = sectionKey
    },
    closeSessionAnalyticsModal() {
      this.showSessionAnalyticsModal = false
      this.analyticsModalLoaded = false
      this.analyticsModalRecordId = ''
      this.analyticsModalData = null
      this.analyticsReportState = { loading: false, success: false, error: '' }
    },
    refreshAnalyticsModalData(session = null) {
      const sourceSession = session || this.analyticsModalRecord
      if (!sourceSession?.id) return
      this.analyticsModalData = this.buildSessionAnalyticsDataset(sourceSession)
      this.analyticsModalLoaded = true
    },
    sessionMatchesCurrentLiveConfig(session) {
      if (!session?.config || !this.isSessionLive) return false
      return Number(session.config.chapterId || 0) === Number(this.chapterId || 0)
        && Number(session.config.rangeStart || 0) === Number(this.rangeStart || 0)
        && Number(session.config.rangeEnd || 0) === Number(this.rangeEnd || 0)
    },
    getAnalyticsSessionStats(session) {
      if (this.sessionMatchesCurrentLiveConfig(session)) {
        return this.normalizeSessionStats(this.buildCurrentSessionStatsSnapshot(), session?.config || {})
      }
      return this.normalizeSessionStats(session?.stats || {}, session?.config || {})
    },
    buildSessionAnalyticsDataset(session) {
      const stats = this.getAnalyticsSessionStats(session)
      const rangeStart = Math.max(1, Number(session?.config?.rangeStart || 1))
      const rangeEnd = Math.max(rangeStart, Number(session?.config?.rangeEnd || rangeStart))
      const totalAyahs = Math.max(1, rangeEnd - rangeStart + 1)
      const versePlayCounts = { ...(stats.verse_play_counts || {}) }
      const versesRead = Math.max(0, Number(stats.verses_read || 0))
      const repetitions = Math.max(0, Number(stats.repetitions_completed || 0))
      const weakVerses = Math.max(0, Number(stats.weak_verses_encountered || 0))
      const selfChecks = Math.max(0, Math.round(repetitions * 0.35))
      const strongVerses = Math.max(0, versesRead - weakVerses)
      const recallRatio = versesRead > 0 ? ((strongVerses / versesRead) * 100) : 0
      const recallStrength = recallRatio >= 75 ? 'High' : recallRatio >= 45 ? 'Medium' : 'Low'
      const verseSeries = Array.from({ length: totalAyahs }).map((_, index) => {
        const ayahNumber = rangeStart + index
        const verseKey = `${Number(session?.config?.chapterId || this.chapterId || 0)}:${ayahNumber}`
        const inferredValue = ayahNumber < (rangeStart + versesRead) ? 1 : 0
        const value = Math.max(0, Number(versePlayCounts[verseKey] || inferredValue))
        return {
          key: verseKey,
          ayahNumber,
          label: `Ayah ${ayahNumber}`,
          shortLabel: `${ayahNumber}`,
          value
        }
      })
      const maxHeatValue = Math.max(1, ...verseSeries.map(item => Number(item.value || 0)))

      return {
        generatedAt: new Date().toISOString(),
        session: {
          id: session.id,
          name: session.name,
          label: this.getSessionPrimaryLabel(session),
          savedAt: session.savedAt,
          config: { ...(session.config || {}) }
        },
        metrics: {
          verses_read: versesRead,
          total_ayahs: totalAyahs,
          time_spent_seconds: Math.max(0, Number(stats.time_spent_seconds || 0)),
          repetitions_completed: repetitions,
          self_checks: selfChecks,
          weak_verses: weakVerses,
          strong_verses: strongVerses,
          recall_strength: recallStrength,
          session_play_count: Math.max(0, Number(stats.session_play_count || 0)),
          total_verse_play_count: Math.max(0, Number(stats.total_verse_play_count || 0)),
          verse_play_counts: { ...(stats.verse_play_counts || {}) },
          playback_total_seconds: Math.max(0, Number(stats.time_spent_seconds || 0)),
          playback_average_seconds_per_verse: Math.max(0, Number(stats.average_time_per_verse_seconds || 0))
        },
        charts: {
          verseSeries,
          timeSeries: verseSeries,
          topRepeated: verseSeries.filter(item => item.value > 0),
          weakStrong: { weak: weakVerses, strong: strongVerses },
          activityBreakdown: []
        },
        heatmap: verseSeries.map(item => ({
          ...item,
          intensity: item.value <= 0 ? 0.06 : Math.max(0.18, Math.min(1, Math.pow(Number(item.value || 0) / maxHeatValue, 0.72)))
        }))
      }
    },
    validateAnalyticsReportPayload(payload) {
      const metrics = payload?.metrics || {}
      if (!payload?.session?.id) return { ok: false, message: 'Missing session id.' }
      if (!payload?.session?.savedAt) return { ok: false, message: 'Missing session date.' }
      if (!Number.isFinite(Number(metrics.verses_read))) return { ok: false, message: 'Missing verses read.' }
      return { ok: true, message: '' }
    },
    async downloadSessionAnalyticsReport() {
      if (!this.analyticsModalRecord || !this.analyticsModalData) return
      this.analyticsReportState = { loading: true, success: false, error: '' }
      try {
        await new Promise(resolve => window.setTimeout(resolve, 120))
        const reportPayload = {
          version: 1,
          app: 'mutqin',
          exportedAt: new Date().toISOString(),
          summary: {
            title: this.analyticsModalData.session.label,
            saved_on: this.analyticsModalData.session.savedAt,
            duration: this.formatTime(this.analyticsModalData.metrics.time_spent_seconds),
            ayahs_reviewed: this.analyticsModalData.metrics.verses_read,
            repeats_completed: this.analyticsModalData.metrics.repetitions_completed,
            session_plays: this.analyticsModalData.metrics.session_play_count || 0,
            verse_plays: this.analyticsModalData.metrics.total_verse_play_count || 0,
            recall_strength: this.analyticsModalData.metrics.recall_strength,
            ai_check_results: this.analyticsAiCheckSummary
          },
          session: {
            id: this.analyticsModalData.session.id,
            name: this.analyticsModalData.session.name,
            label: this.analyticsModalData.session.label,
            savedAt: this.analyticsModalData.session.savedAt
          },
          metadata: {
            date: this.analyticsModalData.session.savedAt,
            duration: this.formatTime(this.analyticsModalData.metrics.time_spent_seconds),
            session_name: this.analyticsModalData.session.name,
            surah: this.analyticsModalData.session.config?.chapterName || '',
            ayah_range: `${this.analyticsModalData.session.config?.rangeStart || ''}-${this.analyticsModalData.session.config?.rangeEnd || ''}`
          },
          metrics: {
            verses_read: this.analyticsModalData.metrics.verses_read,
            total_ayahs: this.analyticsModalData.metrics.total_ayahs || 0,
            time_spent_seconds: this.analyticsModalData.metrics.time_spent_seconds,
            repetitions_completed: this.analyticsModalData.metrics.repetitions_completed,
            session_play_count: this.analyticsModalData.metrics.session_play_count || 0,
            total_verse_play_count: this.analyticsModalData.metrics.total_verse_play_count || 0,
            weak_verses: this.analyticsModalData.metrics.weak_verses,
            recall_strength: this.analyticsModalData.metrics.recall_strength
          },
          verse_play_counts: this.analyticsModalData.metrics.verse_play_counts || {},
          charts: {
            verse_series: this.analyticsModalData.charts?.verseSeries || []
          },
          heatmap: this.analyticsModalData.heatmap || []
        }
        const validation = this.validateAnalyticsReportPayload(reportPayload)
        if (!validation.ok) throw new Error(validation.message)

        const safeName = slugifySessionFilePart(this.analyticsModalData.session?.name || this.analyticsModalData.session?.label || 'session')
        const stamp = new Date(this.analyticsModalData.session?.savedAt || Date.now()).toISOString().slice(0, 10)
        const filename = `mutqin-session_${safeName}_${stamp}.json`
        const blob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        window.setTimeout(() => URL.revokeObjectURL(url), 500)
        this.analyticsReportState = { loading: false, success: true, error: '' }
      } catch (error) {
        console.error('Analytics report export failed:', error)
        this.analyticsReportState = { loading: false, success: false, error: String(error?.message || 'Export failed') }
      }
    },

    buildStatsBreakdown(session) {
      const stats = this.normalizeSessionStats(session?.stats || {}, session?.config || {})
      return [
        { key: 'verses_read', label: 'Ayahs you reviewed', value: `${stats.verses_read}`, icon: 'bi-book' },
        { key: 'time_spent', label: 'Time memorising', value: this.formatTime(stats.time_spent_seconds), icon: 'bi-clock-history' },
        { key: 'repetitions_completed', label: 'Repeats completed', value: `${stats.repetitions_completed}`, icon: 'bi-arrow-repeat' },
        { key: 'sessions_completed', label: 'Runs completed', value: `${stats.sessions_completed}`, icon: 'bi-check2-circle' }
      ]
    },

    buildStatsSummary(session) {
      const stats = this.normalizeSessionStats(session?.stats || {}, session?.config || {})
      const verses = Number(stats.verses_read || 0)
      const time = Number(stats.time_spent_seconds || 0)
      const reps = Number(stats.repetitions_completed || 0)
      const struggled = Number(stats.weak_verses_encountered || 0)
      const parts = []

      if (verses > 0) parts.push(`You reviewed ${verses} ayah${verses === 1 ? '' : 's'}`)
      if (time > 0) parts.push(`in ${this.formatTime(time)}`)
      if (reps > 0) parts.push(`with ${reps} repeat${reps === 1 ? '' : 's'}`)
      if (!parts.length) return 'Practice and save your session to build your progress summary.'

      const base = parts.join(' ')
      if (struggled > 0) return `${base}. ${struggled} ayah${struggled === 1 ? '' : 's'} needed extra attention.`
      return `${base}.`
    },

    getSessionStatDisplay(session, key) {
      const stats = this.normalizeSessionStats(session?.stats || {}, session?.config || {})
      if (key === 'verses_read') return `${stats.verses_read} verses read`
      if (key === 'time_spent') return `${this.formatTime(stats.time_spent_seconds)} spent`
      return ''
    },
    isExportingSession(sessionId, format = '') {
      if (this.exportSessionState.activeSessionId !== sessionId) return false
      if (!format) return true
      return this.exportSessionState.activeFormat === format
    },
    incrementSessionPlayCount() {
      const current = Math.max(0, Number(this.mutqinState?.sessionState?.play_count || 0))
      if (!this.mutqinState?.sessionState) return
      this.mutqinState.sessionState.play_count = current + 1
      saveMutqinState(this.mutqinState)
      this.persistCentralSessionState()
    },
    incrementVersePlayCount(verseKey) {
      if (!verseKey || !this.mutqinState?.sessionState) return
      const currentMap = this.mutqinState.sessionState.verse_play_counts || {}
      const current = Math.max(0, Number(currentMap[verseKey] || 0))
      this.mutqinState.sessionState.verse_play_counts = {
        ...currentMap,
        [verseKey]: current + 1
      }
      saveMutqinState(this.mutqinState)
      this.persistCentralSessionState()
    },

    validateSessionForExport(session) {
      const errors = []
      if (!session?.id) errors.push('Missing session id.')
      if (!session?.name) errors.push('Missing session name.')
      if (!session?.config?.chapterId) errors.push('Missing surah selection.')
      if (!Number(session?.config?.rangeStart) || !Number(session?.config?.rangeEnd)) errors.push('Missing ayah range.')
      if (!session?.savedAt) errors.push('Missing saved timestamp.')
      return {
        ok: errors.length === 0,
        message: errors[0] || ''
      }
    },

    buildSessionExportPayload(session) {
      const normalizedSession = this.normalizeSavedSessionRecord(session)
      return {
        version: 1,
        app: 'mutqin',
        exportedAt: new Date().toISOString(),
        session: normalizedSession,
        restore: {
          ...(normalizedSession?.restore || {}),
          savedSession: normalizedSession,
          uiState: {
            theme: this.theme
          }
        }
      }
    },

    buildSessionExportFilename(session, format = 'csv') {
      const safeName = slugifySessionFilePart(session?.name || 'session')
      const stamp = new Date(session?.savedAt || Date.now()).toISOString().slice(0, 10)
      const suffix = `${safeName}_${stamp}_mutqin`
      if (format === 'word') return `${suffix}.doc`
      if (format === 'pdf') return `${suffix}.pdf`
      return `${suffix}.csv`
    },

    buildSessionExportCsv(payload) {
      const session = payload?.session || {}
      const config = session?.config || {}
      const stats = this.normalizeSessionStats(session?.stats || {}, config)
      const rows = [
        ['Session Name', session?.name || ''],
        ['Surah', config?.chapterName || (config?.chapterId ? `Surah ${config.chapterId}` : '')],
        ['Ayah Range', (config?.rangeStart && config?.rangeEnd) ? `${config.rangeStart}-${config.rangeEnd}` : ''],
        ['Saved At', session?.savedAt ? new Date(session.savedAt).toISOString() : ''],
        ['Exported At', payload?.exportedAt || ''],
        ['Verses Read', `${stats.verses_read || 0}`],
        ['Time Spent', this.formatTime(stats.time_spent_seconds)],
        ['Repetitions Completed', `${stats.repetitions_completed || 0}`],
        ['Session Plays', `${stats.session_play_count || 0}`],
        ['Total Verse Plays', `${stats.total_verse_play_count || 0}`],
        ['Average Time Per Verse', this.formatTime(stats.average_time_per_verse_seconds)],
        ['Struggled Ayahs', `${stats.weak_verses_encountered || 0}`]
      ]

      return rows
        .map(row => row.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(','))
        .join('\n')
    },

    triggerCsvDownload(filename, payload) {
      const blob = new Blob([this.buildSessionExportCsv(payload)], { type: 'text/csv;charset=utf-8' })
      this.triggerFileDownloadBlob(blob, filename)
    },

    triggerWordDownload(filename, payload) {
      // Lightweight "Word" export: an HTML document wrapped with a .doc extension.
      // This stays dependency-free and is good enough for sharing/backup.
      const html = this.buildSessionExportHtml(payload)
      const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' })
      this.triggerFileDownloadBlob(blob, filename)
    },

    triggerPdfExport(filename, payload) {
      // PDF export uses browser print pipeline with a stable Blob preview.
      const html = this.buildSessionExportHtml(payload)
      const blob = new Blob([html.replace('{{__TITLE__}}', this.escapeHtml(filename.replace(/\\.pdf$/i, '')))], { type: 'text/html;charset=utf-8' })
      const previewUrl = URL.createObjectURL(blob)
      const w = window.open(previewUrl, '_blank', 'noopener,noreferrer')
      if (!w) throw new Error('Popup blocked')
      window.setTimeout(() => {
        try {
          w.focus()
          w.print()
        } finally {
          window.setTimeout(() => {
            URL.revokeObjectURL(previewUrl)
            w.close()
          }, 600)
        }
      }, 420)
    },

    triggerFileDownloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.rel = 'noopener'
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      window.requestAnimationFrame(() => {
        anchor.click()
        document.body.removeChild(anchor)
        window.setTimeout(() => URL.revokeObjectURL(url), 1200)
      })
    },

    escapeHtml(value) {
      return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
    },

    buildSessionExportHtml(payload) {
      const session = payload?.session || {}
      const config = session?.config || {}
      const stats = this.normalizeSessionStats(session?.stats || {}, config)

      const title = this.escapeHtml(session?.name || 'Session Export')
      const subtitleParts = [
        config?.chapterName || (config?.chapterId ? `Surah ${config.chapterId}` : ''),
        (config?.rangeStart && config?.rangeEnd) ? `Ayahs ${config.rangeStart}-${config.rangeEnd}` : ''
      ].filter(Boolean)
      const subtitle = this.escapeHtml(subtitleParts.join(' · '))

      const rows = [
        { label: 'Verses read', value: `${stats.verses_read}` },
        { label: 'Time spent', value: this.formatTime(stats.time_spent_seconds) },
        { label: 'Repetitions completed', value: `${stats.repetitions_completed}` },
        { label: 'Session plays', value: `${stats.session_play_count || 0}` },
        { label: 'Total verse plays', value: `${stats.total_verse_play_count || 0}` },
        { label: 'Average time per verse', value: this.formatTime(stats.average_time_per_verse_seconds) },
        { label: 'Struggled ayahs', value: `${stats.weak_verses_encountered}` }
      ]

      const meta = [
        { label: 'Saved', value: session?.savedAt ? new Date(session.savedAt).toLocaleString('en-GB') : '' },
        { label: 'Exported', value: payload?.exportedAt ? new Date(payload.exportedAt).toLocaleString('en-GB') : '' }
      ].filter(r => r.value)

      const rowsHtml = rows.map(r => `<tr><td>${this.escapeHtml(r.label)}</td><td>${this.escapeHtml(r.value)}</td></tr>`).join('')
      const metaHtml = meta.map(r => `<span><strong>${this.escapeHtml(r.label)}:</strong> ${this.escapeHtml(r.value)}</span>`).join('')

      return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{__TITLE__}}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 32px; color: #1d1d1d; }
      h1 { margin: 0; font-size: 22px; letter-spacing: -0.01em; }
      p { margin: 6px 0 0 0; color: #555; }
      .meta { margin-top: 10px; color: #666; font-size: 12px; display: flex; gap: 12px; flex-wrap: wrap; }
      .card { margin-top: 18px; border: 1px solid #e7e1d9; border-radius: 14px; padding: 16px; background: #fffaf3; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      td { padding: 10px 8px; border-bottom: 1px solid #eee7df; vertical-align: top; }
      td:first-child { width: 55%; color: #444; }
      td:last-child { text-align: right; font-weight: 600; }
      .foot { margin-top: 18px; font-size: 11px; color: #777; }
      @media print { body { margin: 14mm; } .foot { display: none; } }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
    ${metaHtml ? `<div class="meta">${metaHtml}</div>` : ''}
    <div class="card">
      <table aria-label="Session stats">
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
    <div class="foot">Mutqin session export</div>
  </body>
</html>`
    },

    async exportSavedSession(sessionId, format = 'csv') {
      const session = this.savedSessions.find(item => item.id === sessionId)
      if (!session) return
      const validation = this.validateSessionForExport(session)
      if (!validation.ok) {
        this.exportSessionState = {
          activeSessionId: '',
          activeFormat: '',
          successSessionId: '',
          successFormat: '',
          errorSessionId: sessionId,
          errorFormat: format,
          errorMessage: validation.message
        }
        this.showBanner(this.t('toasts.sessionExportBlockedIncompleteSessionData'), 'error', 2600)
        return
      }

      this.exportSessionState = {
        activeSessionId: sessionId,
        activeFormat: format,
        successSessionId: '',
        successFormat: '',
        errorSessionId: '',
        errorFormat: '',
        errorMessage: ''
      }

      try {
        await new Promise(resolve => window.setTimeout(resolve, 120))
        const payload = this.buildSessionExportPayload(session)
        if (format === 'word') {
          this.triggerWordDownload(this.buildSessionExportFilename(session, 'word'), payload)
        } else if (format === 'pdf') {
          this.triggerPdfExport(this.buildSessionExportFilename(session, 'pdf'), payload)
        } else {
          this.triggerCsvDownload(this.buildSessionExportFilename(session, 'csv'), payload)
        }
        this.exportSessionState = {
          activeSessionId: '',
          activeFormat: '',
          successSessionId: sessionId,
          successFormat: format,
          errorSessionId: '',
          errorFormat: '',
          errorMessage: ''
        }
        this.showBanner(this.t('toasts.downloadReady'), 'success', 1800)
      } catch (error) {
        console.error('Failed to export session:', error)
        this.exportSessionState = {
          activeSessionId: '',
          activeFormat: '',
          successSessionId: '',
          successFormat: '',
          errorSessionId: sessionId,
          errorFormat: format,
          errorMessage: 'Something went wrong. Please retry.'
        }
        this.showBanner(this.t('toasts.exportFailedRetry'), 'error', 2600)
      }
    },

    retryFailedExport() {
      if (!this.exportSessionState.errorSessionId) return
      this.exportSavedSession(this.exportSessionState.errorSessionId, this.exportSessionState.errorFormat || 'csv')
    },

    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
      if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    },
    recordingsLibraryStorageKey() {
      return this.userStorageKey('recordings')
    },
    recordingsLibraryCandidateKeys() {
      const uid = this.auth?.id || 'guest'
      return [...new Set([
        this.recordingsLibraryStorageKey(),
        this.userStorageKey('recordingsLibrary'),
        `telawa.recordings.${uid}`,
        `telawa.recordingsLibrary.${uid}`,
        'telawa.recordings',
        'telawa.recordingsLibrary'
      ])]
    },
    normalizeRecordingEntry(entry, index = 0) {
      if (!entry || typeof entry !== 'object') return null

      const rawAyahRange = entry.ayahRange || entry.ayah_range || {}
      const rangeKeys = Array.isArray(rawAyahRange?.keys)
        ? rawAyahRange.keys.filter(Boolean)
        : Array.isArray(entry.ayahKeys)
          ? entry.ayahKeys.filter(Boolean)
          : []
      const directAyahKey = entry.ayahKey || entry.verseKey || entry.key || rangeKeys[0] || ''
      const keyParts = String(directAyahKey).match(/^(\d+):(\d+)$/)
      const chapterId = Number(
        entry.chapterId ||
        entry.surahId ||
        entry.chapter_id ||
        entry.surah_id ||
        entry.chapter?.id ||
        keyParts?.[1] ||
        0
      )
      const ayahNumber = Number(
        entry.ayahNumber ||
        entry.verseNumber ||
        entry.numberInSurah ||
        entry.ayah_index ||
        keyParts?.[2] ||
        0
      )
      const ayahKey = chapterId > 0 && ayahNumber > 0 ? `${chapterId}:${ayahNumber}` : ''
      const chapterName = entry.chapterName ||
        entry.surahName ||
        entry.chapter_name ||
        entry.surah_name ||
        entry.chapter?.name_simple ||
        this.chapters.find(chapter => Number(chapter.id) === chapterId)?.name_simple ||
        (chapterId ? `Surah ${chapterId}` : 'Surah')
      const audioSrc = String(
        entry.audioSrc ||
        entry.audioUrl ||
        entry.audio_url ||
        entry.url ||
        entry.src ||
        entry.blobUrl ||
        entry.dataUrl ||
        ''
      ).trim()
      const isAiCheck = entry.source === 'ai-check'
        || entry.type === 'ai-check'
        || entry.type === 'ai-memorisation-check'
        || entry.kind === 'ai-check'

      if (!ayahKey || (!audioSrc && !isAiCheck)) return null

      const recordedAt = parseRecordingDate(entry.recordedAt || entry.createdAt || entry.timestamp || entry.date)
      const durationSeconds = parseRecordingDurationSeconds(
        entry.durationSeconds ??
        entry.duration_seconds ??
        entry.duration ??
        entry.length_seconds ??
        entry.length
      )
      const ayahRange = {
        start: Number(rawAyahRange?.start || entry.sessionRangeStart || entry.session_range_start || ayahNumber || 0),
        end: Number(rawAyahRange?.end || entry.sessionRangeEnd || entry.session_range_end || ayahNumber || 0),
        keys: rangeKeys.length ? rangeKeys : (ayahKey ? [ayahKey] : [])
      }

      return {
        id: String(entry.id || `${ayahKey}-${Date.parse(recordedAt) || Date.now()}-${index}`),
        title: String(entry.title || entry.name || entry.label || '').trim(),
        chapterId,
        chapterName,
        ayahNumber,
        ayahKey,
        recordedAt,
        durationSeconds,
        result: normalizeRecordingResult(entry.result || entry.selfCheckResult || entry.checkResult || entry.status || entry.score),
        audioSrc,
        source: isAiCheck ? 'ai-check' : (entry.source || 'self-check'),
        type: entry.type === 'ai-memorisation-check' ? 'ai-memorisation-check' : (isAiCheck ? 'ai-check' : (entry.type || 'recording')),
        accuracyScore: Number(entry.accuracyScore ?? entry.accuracy_score ?? entry.score ?? 0),
        transcript: String(entry.transcript || ''),
        targetText: String(entry.targetText || entry.target_text || ''),
        wordStatuses: Array.isArray(entry.wordStatuses || entry.word_statuses) ? (entry.wordStatuses || entry.word_statuses) : [],
        recommendation: String(entry.recommendation || ''),
        mistakeBreakdown: entry.mistakeBreakdown || entry.mistakes || null,
        reviewMetadata: entry.reviewMetadata || entry.review || null,
        validationReport: entry.validationReport || entry.validation_report || null,
        analysisVersion: String(entry.analysisVersion || entry.analysis_version || ''),
        sessionId: String(entry.sessionId || entry.session_id || ''),
        audioHash: String(entry.audioHash || entry.audio_hash || ''),
        ayahRange,
        sessionRangeStart: Number(entry.sessionRangeStart || entry.session_range_start || ayahRange.start || ayahNumber || 0),
        sessionRangeEnd: Number(entry.sessionRangeEnd || entry.session_range_end || ayahRange.end || ayahNumber || 0)
      }
    },
    persistRecordingsLibrary() {
      try {
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue('recordingsLibrary', this.recordingsLibrary)
          return true
        }
        localStorage.setItem(this.recordingsLibraryStorageKey(), JSON.stringify(this.recordingsLibrary))
        return true
      } catch (error) {
        if (this.learningBackendEnabled()) {
          console.error('Failed to persist recordings library:', error)
          return false
        }
        try {
          const compact = this.recordingsLibrary.map(recording => this.pruneAiCheckRecordingForStorage(recording))
          localStorage.setItem(this.recordingsLibraryStorageKey(), JSON.stringify(compact))
          this.recordingsLibrary = compact
          console.warn('Persisted compact recordings library after storage pressure:', error)
          return true
        } catch (compactError) {
          console.error('Failed to persist recordings library:', compactError)
          return false
        }
      }
    },
    pruneAiCheckRecordingForStorage(recording = {}) {
      if (!this.isAiCheckRecording(recording)) return recording
      return {
        ...recording,
        audioSrc: '',
        transcript: String(recording.transcript || '').slice(0, 2400)
      }
    },
    ensureSelectedRecordingsAyah() {
      const matches = this.filteredRecordingsAyahGroups.flatMap(group => group.ayahs)
      if (matches.some(item => item.ayahKey === this.selectedRecordingsAyahKey)) return
      this.selectedRecordingsAyahKey = matches[0]?.ayahKey || ''
    },
    getRecitationValidationReport(recording = null) {
      return recording?.validationReport || recording?.reviewMetadata?.validationReport || null
    },
    getRecitationValidationTone(recording = null) {
      const report = this.getRecitationValidationReport(recording)
      if (!report) return 'tone-neutral'
      return report.passed ? 'tone-excellent' : 'tone-review'
    },
    getRecitationValidationLabel(recording = null) {
      const report = this.getRecitationValidationReport(recording)
      if (!report) return 'Validation pending'
      if (report.passed) return `Replay stable (${report.replayPassCount}/${report.replayCount})`
      return `Replay mismatch (${report.replayPassCount}/${report.replayCount})`
    },
    getRecitationValidationSummary(recording = null) {
      const report = this.getRecitationValidationReport(recording)
      if (!report) return 'No deterministic replay audit is stored for this result yet.'
      const variantSummary = `${report.variantPassCount}/${(report.variants || []).length} stream variants matched`
      if (report.passed) return `${variantSummary}. Baseline hash ${report.baselineHash}.`
      return (report.warnings || []).join(' ') || `${variantSummary}. Deterministic audit failed.`
    },
    canRerunRecordingValidationAudit(recording = null) {
      return !!(recording?.sessionId && recording?.audioHash)
    },
    isRecordingValidationAuditRunning(recordingId = '') {
      return !!this.recordingValidationAuditState?.[recordingId]
    },
    getAiMemorisationCheckerAuditRecording() {
      const result = this.aiMemorisationCheckerResult
      if (!result?.sessionId || !result?.audioHash) return null
      return {
        id: result.id || `memorisation-check-${result.audioHash}`,
        sessionId: result.sessionId,
        audioHash: result.audioHash,
        type: 'memorisation',
        source: result.transcriptionSource || ''
      }
    },
    canRerunAiMemorisationCheckerAudit() {
      return this.canRerunRecordingValidationAudit(this.getAiMemorisationCheckerAuditRecording())
    },
    isAiMemorisationCheckerAuditRunning() {
      const recording = this.getAiMemorisationCheckerAuditRecording()
      return recording ? this.isRecordingValidationAuditRunning(recording.id) : false
    },
    async rerunAiMemorisationCheckerAudit() {
      const recording = this.getAiMemorisationCheckerAuditRecording()
      if (!recording) {
        this.showBanner(this.t('toasts.thisResultDoesNotHaveEnough'), 'info', 2200)
        return null
      }
      return this.rerunRecordingValidationAudit(recording)
    },
    loadRecordingsLibrary() {
      if (this.learningBackendEnabled()) {
        const persisted = this.readWorkspaceStateValue('recordingsLibrary', [])
        this.recordingsLibrary = (Array.isArray(persisted) ? persisted : [])
          .map((item, index) => this.normalizeRecordingEntry(item, index))
          .filter(Boolean)
          .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
        this.ensureSelectedRecordingsAyah()
        return
      }

      const entries = []
      const seen = new Set()

      this.recordingsLibraryCandidateKeys().forEach((key, keyIndex) => {
        try {
          const raw = localStorage.getItem(key)
          if (!raw) return
          const parsed = JSON.parse(raw)
          const collected = collectRecordingEntries(parsed)
          collected.forEach((item, itemIndex) => {
            const normalized = this.normalizeRecordingEntry(item, (keyIndex * 10000) + itemIndex)
            if (!normalized) return
            const signature = `${normalized.ayahKey}:${normalized.recordedAt}:${normalized.audioSrc}`
            if (seen.has(signature)) return
            seen.add(signature)
            entries.push(normalized)
          })
        } catch (error) {
          console.warn(`Failed to read recordings from ${key}:`, error)
        }
      })

      this.recordingsLibrary = entries.sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
      this.ensureSelectedRecordingsAyah()
    },
    openRecordingsLibrary(options = {}) {
      const targetAyahKey = options?.ayahKey
        || (this.showSelfCheckModal ? this.selfCheckVerseKey : '')
        || this.effectiveActiveVerseKey
        || ''
      const schedule = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : callback => callback()
      this.showTools = false
      this.showConfirmModal = false
      this.showSessionExitModal = false
      this.showResumeModal = false
      this.showSelfCheckModal = false
      this.recordingsLibraryReturnToSelfCheckKey = options?.returnToSelfCheck ? targetAyahKey : ''
      this.selfCheckPeekActive = false
      this.stopRecordingsPlayback({ clearSource: true })
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause()
        this.isPlaying = false
      }
      this.recordingsLibrarySearch = ''
      this.pendingRecordingDeleteId = ''
      this.recordingsNavExpanded = true
      this.showRecordingsLibrary = true
      this.isRecordingsLibraryLoading = true
      this.syncBodyScrollLock(true)

      schedule(() => {
        this.loadRecordingsLibrary()
        if (targetAyahKey) {
          this.selectedRecordingsAyahKey = targetAyahKey
          this.ensureSelectedRecordingsAyah()
        }
        this.isRecordingsLibraryLoading = false
      })
    },
    closeRecordingsLibrary() {
      this.pendingRecordingDeleteId = ''
      this.recordingsLibrarySearch = ''
      this.showRecordingsLibrary = false
      this.recordingsLibraryReturnToSelfCheckKey = ''
      this.stopRecordingsPlayback({ clearSource: true })
      this.syncBodyScrollLock(false)
    },
    backToSelfCheckFromLibrary() {
      const ayahKey = this.recordingsLibraryReturnToSelfCheckKey || this.selectedRecordingsAyahKey
      const verse = this.verses.find(item => item.key === ayahKey) || this.selfCheckVerseRef
      this.pendingRecordingDeleteId = ''
      this.recordingsLibrarySearch = ''
      this.showRecordingsLibrary = false
      this.recordingsLibraryReturnToSelfCheckKey = ''
      this.stopRecordingsPlayback({ clearSource: true })
      if (verse?.key) {
        this.openSelfCheckModal(verse)
      } else {
        this.syncBodyScrollLock(false)
      }
    },
    toggleRecordingsNav() {
      this.recordingsNavExpanded = !this.recordingsNavExpanded
    },
    selectRecordingsAyah(ayahKey) {
      this.selectedRecordingsAyahKey = ayahKey
      this.pendingRecordingDeleteId = ''
    },
    initRecordingsAudio() {
      if (this.recordingsAudioBound || !this.recordingsAudioElement) return
      this.recordingsAudioElement.addEventListener('pause', () => {
        if (!this.recordingsAudioElement?.ended) {
          this.activeRecordingPlaybackId = ''
          this.activeSelfCheckPreviewKey = ''
          this.activeSelfCheckAyahPlaybackKey = ''
        }
      })
      this.recordingsAudioElement.addEventListener('ended', () => {
        this.activeRecordingPlaybackId = ''
        this.activeSelfCheckPreviewKey = ''
        this.activeSelfCheckAyahPlaybackKey = ''
      })
      this.recordingsAudioElement.addEventListener('error', error => {
        console.error('Recordings playback error:', error)
        this.activeRecordingPlaybackId = ''
        this.activeSelfCheckPreviewKey = ''
        this.activeSelfCheckAyahPlaybackKey = ''
        this.showBanner(this.t('toasts.unableToPlayThisRecordingRight'), 'error', 2200)
      })
      this.recordingsAudioBound = true
    },
    ensureRecordingsAudioElement() {
      if (!this.recordingsAudioElement) {
        this.recordingsAudioElement = this.$refs.recordingsAudio || null
      }
      this.initRecordingsAudio()
      return this.recordingsAudioElement
    },
    stopRecordingsPlayback(options = {}) {
      const { clearSource = false } = options
      const audio = this.ensureRecordingsAudioElement()
      if (!audio) return
      try {
        audio.pause()
        if (clearSource) {
          audio.removeAttribute('src')
          audio.load()
        }
      } catch (error) {
        console.warn('Failed to stop recordings playback:', error)
      }
      this.activeRecordingPlaybackId = ''
      this.activeSelfCheckPreviewKey = ''
      this.activeSelfCheckAyahPlaybackKey = ''
    },
    async toggleRecordingPlayback(recording) {
      if (!recording?.audioSrc) return

      const audio = this.ensureRecordingsAudioElement()
      if (!audio) {
        this.showBanner(this.t('toasts.audioSystemNotReady'), 'error', 2200)
        return
      }

      if (this.activeRecordingPlaybackId === recording.id && !audio.paused) {
        audio.pause()
        this.activeRecordingPlaybackId = ''
        this.activeSelfCheckPreviewKey = ''
        return
      }

      this.pendingRecordingDeleteId = ''
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause()
        this.isPlaying = false
      }

      if (audio.currentSrc !== recording.audioSrc) {
        audio.src = recording.audioSrc
        audio.load()
      }

      try {
        await audio.play()
        this.activeRecordingPlaybackId = recording.id
        this.activeSelfCheckPreviewKey = ''
      } catch (error) {
        console.error('Failed to play recording:', error)
        this.activeRecordingPlaybackId = ''
        this.showBanner(this.t('toasts.unableToPlayThisRecordingRight'), 'error', 2200)
      }
    },
    promptDeleteRecording(recordingId) {
      this.pendingRecordingDeleteId = recordingId
      const target = this.recordingsLibrary.find(recording => recording.id === recordingId) || null
      this.openConfirmModal({
        title: this.isAiCheckRecording(target) ? 'Delete Recite Check?' : 'Delete recording?',
        message: target
          ? `This removes ${this.isAiCheckRecording(target) ? 'the Recite Check' : 'the recording'} for ayah ${target.ayahNumber} from the recording library.`
          : 'This item will be removed from the recording library.',
        confirmLabel: 'Delete',
        cancelLabel: 'Keep',
        tone: 'danger',
        action: 'delete-recording',
        data: { recordingId }
      })
    },
    openRenameRecordingModal(recordingId) {
      const target = this.recordingsLibrary.find(recording => recording.id === recordingId) || null
      if (!target) return
      this.renameRecordingId = recordingId
      this.renameRecordingName = String(target.title || this.getRecordingAttemptLabel(target) || '').trim()
      this.renameRecordingError = ''
      this.showRenameRecordingModal = true
    },
    closeRenameRecordingModal() {
      this.showRenameRecordingModal = false
      this.renameRecordingId = ''
      this.renameRecordingName = ''
      this.renameRecordingError = ''
    },
    confirmRenameRecording() {
      const trimmedName = String(this.renameRecordingName || '').trim()
      if (!trimmedName) {
        this.renameRecordingError = 'Enter a recording name.'
        return
      }
      this.recordingsLibrary = this.recordingsLibrary.map(recording => (
        recording.id === this.renameRecordingId
          ? { ...recording, title: trimmedName }
          : recording
      ))
      this.persistRecordingsLibrary()
      this.closeRenameRecordingModal()
      this.showBanner(`Recording renamed to "${trimmedName}".`, 'success', 1800)
    },
    cancelDeleteRecording() {
      this.pendingRecordingDeleteId = ''
    },
    deleteRecording(recordingId) {
      if (!recordingId) return
      const target = this.recordingsLibrary.find(recording => recording.id === recordingId) || null
      if (this.activeRecordingPlaybackId === recordingId) {
        this.stopRecordingsPlayback({ clearSource: true })
      }
      this.recordingsLibrary = this.recordingsLibrary.filter(recording => recording.id !== recordingId)
      this.persistRecordingsLibrary()
      if (target && this.isAiCheckRecording(target)) this.deleteAiCheckFromMutqinSessions(recordingId)
      this.pendingRecordingDeleteId = ''
      this.ensureSelectedRecordingsAyah()
      if (!this.recordingsLibrary.length) {
        this.selectedRecordingsAyahKey = ''
      }
      this.showBanner(
        target ? `Deleted ayah ${target.ayahNumber} ${this.isAiCheckRecording(target) ? 'Recite Check' : 'recording'}` : 'Recording deleted',
        'info',
        1600
      )
    },
    openRecordingsLibraryForHistory(recording) {
      if (!recording?.ayahKey) return
      this.openRecordingsLibrary({ ayahKey: recording.ayahKey, returnToSelfCheck: true })
    },
    deleteAiCheckFromMutqinSessions(attemptId) {
      if (!attemptId) return
      const sessions = this.loadMutqinSessionsForRecitation()
        .map(session => ({
          ...session,
          attempts: Array.isArray(session.attempts)
            ? session.attempts.filter(attempt => attempt?.id !== attemptId)
            : []
        }))
        .filter(session => session.attempts.length)
      this.writeScopedStorageValue('mutqinSessions', this.mutqinSessionsStorageKey(), sessions)
    },
    getRecordingAttemptLabel(recording) {
      if (recording?.title) return recording.title
      if (this.isAiCheckRecording(recording)) {
        const attempt = Number(recording?.attemptNumber || 0)
        const label = this.getRecordingTypeLabel(recording)
        return attempt > 0 ? `${label} ${attempt}` : label
      }
      const attempt = Number(recording?.attemptNumber || 0)
      return attempt > 0 ? `Attempt ${attempt}` : 'Attempt'
    },
    isAiCheckRecording(recording) {
      return recording?.source === 'ai-check' || recording?.type === 'ai-check' || recording?.type === 'ai-memorisation-check'
    },
    getRecordingTypeLabel(recording) {
      return recording?.type === 'ai-memorisation-check' ? 'AI memorisation' : 'AI recitation'
    },
    getRecitationScoreTone(score) {
      const value = Number(score || 0)
      if (value >= 100) return 'tone-excellent'
      if (value >= 85) return 'tone-good'
      return 'tone-review'
    },
    formatAiMistakeList(items) {
      const list = Array.isArray(items) ? items.filter(Boolean) : []
      return list.length ? list.join('، ') : 'None'
    },
    formatAiIncorrectList(items) {
      const list = Array.isArray(items) ? items.filter(Boolean) : []
      if (!list.length) return 'None'
      return list.map(item => {
        if (typeof item === 'string') return item
        return `${item.expected || ''} -> ${item.actual || ''}`.trim()
      }).join('، ')
    },
    getRecitationMistakeSummary(mistakes = {}) {
      const missing = Array.isArray(mistakes?.missing) ? mistakes.missing.length : 0
      const extra = Array.isArray(mistakes?.extra) ? mistakes.extra.length : 0
      const incorrect = Array.isArray(mistakes?.incorrect) ? mistakes.incorrect.length : 0
      const wordSkips = Array.isArray(mistakes?.wordSkips || mistakes?.skippedWords)
        ? (mistakes.wordSkips || mistakes.skippedWords).reduce((sum, group) => sum + Number(group?.count || 1), 0)
        : 0
      const ayahSkips = Array.isArray(mistakes?.skippedAyahs) ? mistakes.skippedAyahs.length : 0
      const verseJumps = Array.isArray(mistakes?.verseJumps) ? mistakes.verseJumps.length : 0
      const total = missing + extra + incorrect + wordSkips + ayahSkips + verseJumps
      return total ? `${total} detected issue${total === 1 ? '' : 's'}` : 'No word issues'
    },
    saveAiCheckToRecordingsLibrary(attempt, result) {
      if (!attempt || !result) return false
      this.loadRecordingsLibrary()
      const savedEntry = {
        id: attempt.id,
        source: 'ai-check',
        type: 'ai-check',
        chapterId: attempt.surah?.id,
        chapterName: attempt.surah?.name,
        ayahNumber: attempt.ayahRange?.start,
        ayahKey: attempt.ayahRange?.keys?.[0] || `${attempt.surah?.id}:${attempt.ayahRange?.start}`,
        recordedAt: attempt.timestamp,
        durationSeconds: 0,
        result: result.accuracyScore >= 100 ? 'Excellent' : result.accuracyScore >= 85 ? 'Good' : 'Needs Review',
        accuracyScore: result.accuracyScore,
        transcript: result.transcript,
        targetText: result.targetText,
        wordStatuses: result.wordStatuses,
        tajweedRules: result.tajweedRules || [],
        recommendation: result.recommendation,
        mistakeBreakdown: result.mistakes,
        reviewMetadata: result.reviewMetadata,
        validationReport: result.validationReport || null,
        analysisVersion: result.analysisVersion || RECITATION_ANALYSIS_VERSION,
        sessionId: result.sessionId || attempt.sessionId || '',
        audioHash: result.audioHash || attempt.audioHash || '',
        audioSrc: result.audioSrc || attempt.audioSrc || '',
        sessionRangeStart: Number(this.rangeStart || attempt.ayahRange?.start || 1),
        sessionRangeEnd: Number(this.rangeEnd || attempt.ayahRange?.end || attempt.ayahRange?.start || 1)
      }
      this.recordingsLibrary = [
        savedEntry,
        ...this.recordingsLibrary.filter(recording => recording.id !== savedEntry.id)
      ]
      const persisted = this.persistRecordingsLibrary()
      this.ensureSelectedRecordingsAyah()
      return persisted
    },
    getRecordingResultTone(result) {
      if (result === 'Excellent') return 'tone-excellent'
      if (result === 'Good') return 'tone-good'
      return 'tone-review'
    },
    getSelfCheckResultLabel(option) {
      const labels = {
        Excellent: this.t('memorisation.selfCheckRatings.excellent'),
        Good: this.t('memorisation.selfCheckRatings.good'),
        'Needs Review': this.t('memorisation.selfCheckRatings.review')
      }
      return labels[option] || option
    },
    getSelfCheckResultHint(option) {
      const hints = {
        Excellent: this.t('memorisation.selfCheckRatings.excellentHint'),
        Good: this.t('memorisation.selfCheckRatings.goodHint'),
        'Needs Review': this.t('memorisation.selfCheckRatings.reviewHint')
      }
      return hints[option] || ''
    },
    getSelfCheckRecorderDescription() {
      if (this.recitationCheckPanelOpen && !this.recitationCheckRecording && !this.recitationCheckPreparing && !this.recitationCheckResult) {
        return this.recitationCheckScope === 'session'
          ? 'Review the selected range, choose the reciter you want to hear, then start AI Recite when you are ready.'
          : 'Set the reciter if needed, then start AI Recite when you are ready to recite this ayah.'
      }
      if (this.isSelfCheckRecording) {
        return 'Your microphone is active. Recite the ayah aloud, then stop when you are finished.'
      }
      if (this.selfCheckActiveDraft) {
        return 'Listen to your recording, rate your confidence, then save it to your library or try again.'
      }
      if (this.selfCheckPreparing) {
        return 'Setting up microphone access for a clear recording.'
      }
      if (!this.supportsSelfCheckRecording()) {
        return 'Recording requires a browser with microphone support.'
      }
      return 'Record yourself reciting this ayah, then compare your attempt against the text above.'
    },
    getAyahTranslation(ayahKey) {
      if (!ayahKey) return ''
      const verse = this.verses.find(item => item.key === ayahKey)
      return verse?.translation || ''
    },
    formatRecordingDuration(seconds) {
      return this.formatTime(Number(seconds || 0))
    },
    formatRecordingDate(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    },
    formatRecordingTimestamp(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    buildSelfCheckVerseRef(verse) {
      if (!verse?.key) return null
      return {
        ...verse,
        chapterName: verse.chapterName
          || this.currentChapter?.name_simple
          || this.activeChapterName
          || (verse.chapterId ? `Surah ${verse.chapterId}` : 'Current surah')
      }
    },
    getSelfCheckInitialFontSize(verse) {
      const verseFont = Number(this.getVerseFontSize(verse?.key) || this.defaultFontSize || 120)
      return Math.max(280, Math.min(420, verseFont + 120))
    },
    openSelfCheckModal(verse) {
      if (!verse?.key) return
      
      if (this.isSelfCheckRecording && this.selfCheckVerseKey && this.selfCheckVerseKey !== verse.key) {
        this.showBanner(this.t('toasts.stopTheCurrentSelfCheckBefore'), 'info', 2200)
        return
      }
      if (this.selfCheckDraft?.ayahKey && this.selfCheckDraft.ayahKey !== verse.key) {
        this.showBanner(this.t('toasts.saveOrDiscardTheCurrentSelf'), 'info', 2400)
        return
      }

      this.loadRecordingsLibrary()
      this.showTools = false
      this.selfCheckVerseRef = this.buildSelfCheckVerseRef(verse)
      this.selfCheckVerseKey = verse.key
      this.selfCheckFontSize = this.getSelfCheckInitialFontSize(verse)
      this.selfCheckTajweedEnabled = !!this.tajweedEnabled
      this.showSelfCheckModal = true
      this.selfCheckError = ''
      this.selfCheckLastSavedAyahKey = ''
      this.pendingRecordingDeleteId = ''
      this.selfCheckPeekActive = false
      this.selfCheckModeChoiceVisible = false
      this.selfCheckSavedAttemptsVisible = false
      this.recitationCheckPanelOpen = false
      this.syncBodyScrollLock(true)
    },
    closeSelfCheckModal() {
      if (this.isSelfCheckRecording) {
        this.showBanner(this.t('toasts.stopOrDiscardTheCurrentRecording'), 'info', 2200)
        return
      }
      this.showSelfCheckModal = false
      this.selfCheckPeekActive = false
      this.pendingRecordingDeleteId = ''
      this.selfCheckError = ''
      this.selfCheckLastSavedAyahKey = ''
      this.selfCheckSavedAttemptsVisible = false
      this.clearRecitationReviewState()
      this.stopRecordingsPlayback({ clearSource: true })
      this.selfCheckVerseRef = null
      this.selfCheckVerseKey = ''
      this.syncBodyScrollLock(false)
    },
    openRecordingsLibraryFromSelfCheck() {
      const ayahKey = this.selfCheckVerseKey || this.selfCheckModalVerse?.key || ''
      if (!ayahKey && !this.hasRecordingsLibraryEntries) {
        this.showBanner(this.t('toasts.selectAnAyahBeforeOpeningThe'), 'info', 2200)
        return
      }
      if (this.isSelfCheckRecording) {
        this.showBanner(this.t('toasts.stopTheCurrentRecordingBeforeOpening'), 'info', 2200)
        return
      }
      this.showSelfCheckModal = false
      this.selfCheckPeekActive = false
      this.pendingRecordingDeleteId = ''
      this.stopRecordingsPlayback({ clearSource: true })
      this.syncBodyScrollLock(false)
      this.openRecordingsLibrary({ ayahKey, returnToSelfCheck: true })
    },
    adjustSelfCheckFont(delta) {
      const next = Math.max(280, Math.min(420, Number(this.selfCheckFontSize || 320) + Number(delta || 0)))
      this.selfCheckFontSize = next
    },
    resetSelfCheckFont() {
      this.selfCheckFontSize = this.getSelfCheckInitialFontSize(this.selfCheckModalVerse || this.selfCheckVerseRef)
    },
    showRecitationChoicePanel(verse = null) {
      if (verse?.key && (!this.showSelfCheckModal || this.selfCheckVerseKey !== verse.key)) {
        this.openSelfCheckModal(verse)
      }
      this.recitationCheckError = ''
      this.selfCheckModeChoiceVisible = true
    },
    toggleSelfCheckBlurMode() {
      this.selfCheckBlurEnabled = !this.selfCheckBlurEnabled
      if (!this.selfCheckBlurEnabled) {
        this.selfCheckPeekActive = false
      }
    },
    toggleSelfCheckTajweed() {
      this.selfCheckTajweedEnabled = !this.selfCheckTajweedEnabled
    },
    startSelfCheckPeek() {
      if (!this.selfCheckBlurEnabled) return
      this.selfCheckPeekActive = true
    },
    stopSelfCheckPeek() {
      this.selfCheckPeekActive = false
    },
    getSelfCheckModalArabic(verse) {
      if (!verse?.arabic) return ''
      if (this.shouldShowRecitationReviewHighlights(verse.key)) {
        return this.splitRecitationDisplayIntoWords(verse)
      }
      if (this.selfCheckTajweedEnabled && verse.arabic_tajweed) {
        return this.renderWordLevelTajweedMarkup(verse)
      }
      return this.cleanRecitationDisplayText(verse.arabic)
    },
    getSelfCheckDisplayArabic(verse) {
      const targets = this.recitationCheckScope === 'session' && this.recitationCheckPendingTargets.length
        ? this.recitationCheckPendingTargets
        : (verse ? [verse] : [])
      const showMarkers = targets.length > 1
      const rendered = []
      for (let index = 0; index < targets.length; index += 1) {
        const item = targets[index]
        const canonical = { ...(this.getCanonicalVerseForCheck(item) || item), ...item }
        const html = this.getSelfCheckModalArabic(canonical)
        if (!html) continue
        const number = canonical?.number || String(canonical?.key || '').split(':')[1] || ''
        const marker = showMarkers ? `<span class="self-check-ayah-number-marker" dir="ltr">(${this.escapeHtml(number)})</span> ` : ''
        const state = this.getSessionAyahHighlightState('recitation', canonical, index)
        rendered.push(`<span class="session-evaluation-ayah session-evaluation-${this.escapeHtml(state)}" dir="rtl" lang="ar" data-session-target-key="${this.escapeHtml(this.getSessionTargetKey(canonical, index))}" data-ayah-key="${this.escapeHtml(canonical?.key || '')}">${marker}${html}</span>`)
      }
      return rendered.join(' ')
    },
    getSelfCheckDisplayTargets() {
      return this.recitationCheckScope === 'session' && this.recitationCheckPendingTargets.length
        ? this.recitationCheckPendingTargets
        : (this.selfCheckModalVerse || this.selfCheckVerseRef ? [this.selfCheckModalVerse || this.selfCheckVerseRef] : [])
    },
    getSelfCheckTargetWordCount() {
      return this.tokenizeRecitationDisplayWords(this.getRecitationTargetText(this.getSelfCheckDisplayTargets())).length
    },
    getSelfCheckDisplayFontRem() {
      const wordCount = this.getSelfCheckTargetWordCount()
      const targetCount = this.getSelfCheckDisplayTargets().length
      if (targetCount > 6 || wordCount > 110) return 1.12
      if (targetCount > 4 || wordCount > 72) return 1.32
      if (targetCount > 2 || wordCount > 42) return 1.65
      if (wordCount > 24) return 2.25
      if (wordCount > 12) return 2.75
      return 3.35
    },
    getSelfCheckAyahDisplayStyle() {
      return {
        'font-family': this.quranFontFamily
      }
    },
    async toggleSelfCheckAyahPlayback(verse) {
      if (!verse?.audio) {
        this.showBanner(this.t('toasts.audioNotAvailableForVerse', { number: verse?.number || '' }).trim(), 'info', 2000)
        return
      }

      const audio = this.ensureRecordingsAudioElement()
      if (!audio) {
        this.showBanner(this.t('toasts.audioSystemNotReady'), 'error', 2200)
        return
      }

      if (this.activeSelfCheckAyahPlaybackKey === verse.key && !audio.paused) {
        audio.pause()
        this.activeSelfCheckAyahPlaybackKey = ''
        return
      }

      this.stopRecordingsPlayback({ clearSource: true })
      if (this.audioElement) {
        try { this.audioElement.pause() } catch { }
      }
      this.isPlaying = false
      this.manualOnlyPlayback = false

      audio.src = this.normalizeAudioUrl(verse.audio)
      audio.load()

      try {
        await audio.play()
        this.activeSelfCheckAyahPlaybackKey = verse.key
        this.activeRecordingPlaybackId = ''
        this.activeSelfCheckPreviewKey = ''
      } catch (error) {
        console.error('Failed to play self-check ayah audio:', error)
        this.activeSelfCheckAyahPlaybackKey = ''
        this.showBanner(this.t('toasts.unableToPlayAyahNow'), 'error', 2200)
      }
    },
    supportsSelfCheckRecording() {
      return typeof navigator !== 'undefined'
        && !!navigator.mediaDevices?.getUserMedia
        && typeof MediaRecorder !== 'undefined'
    },
    getAyahRecordingHistory(ayahKey) {
      return this.recordingsLibrary
        .filter(recording => recording.ayahKey === ayahKey || recording?.ayahRange?.keys?.includes(ayahKey))
        .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))
    },
    getAyahRecordingCount(ayahKey) {
      if (!ayahKey) return 0
      return this.recordingsLibrary.filter(recording => recording.ayahKey === ayahKey || recording?.ayahRange?.keys?.includes(ayahKey)).length
    },
    getSessionTargetKey(verse = {}, fallbackIndex = 0) {
      return verse?.sessionTargetKey || (verse?.key ? `${verse.key}::${Number.isFinite(Number(verse.sessionQueueIndex)) ? Number(verse.sessionQueueIndex) : fallbackIndex}` : `session-target::${fallbackIndex}`)
    },
    getEvaluationStateFromWords(words = [], finalised = false) {
      const list = Array.isArray(words) ? words : []
      if (!list.length) return finalised ? 'skipped' : 'notAttempted'
      let correct = 0
      let partial = 0
      let incorrect = 0
      let pending = 0
      for (const word of list) {
        const status = String(word?.status || 'pending')
        if (status === 'correct') correct += 1
        else if (status === 'partial') partial += 1
        else if (status === 'incorrect') incorrect += 1
        else pending += 1
      }
      if (correct === list.length) return 'correct'
      if (incorrect > 0) return 'incorrect'
      if (partial > 0 || correct > 0) return 'partial'
      return finalised ? 'skipped' : 'notAttempted'
    },
    syncSessionEvaluationMaps(kind = 'recitation', targetVerses = [], wordStatuses = [], finalised = false) {
      const targets = Array.isArray(targetVerses) ? targetVerses : []
      const statuses = Array.isArray(wordStatuses) ? wordStatuses : []
      const evaluationMap = {}
      const highlightMap = {}
      let offset = 0
      for (let index = 0; index < targets.length; index += 1) {
        const verse = targets[index]
        const key = this.getSessionTargetKey(verse, index)
        const wordCount = this.tokenizeRecitationDisplayWords(this.getPlainVerseArabicForCheck(verse)).length
        const words = []
        for (let wordIndex = 0; wordIndex < wordCount; wordIndex += 1) {
          words.push(statuses[offset + wordIndex] || { status: 'pending' })
        }
        const state = this.getEvaluationStateFromWords(words, finalised)
        evaluationMap[key] = {
          state,
          ayahKey: verse?.key || '',
          sessionTargetKey: key,
          sessionQueueIndex: Number.isFinite(Number(verse?.sessionQueueIndex)) ? Number(verse.sessionQueueIndex) : index,
          wordOffset: offset,
          wordCount
        }
        highlightMap[key] = state
        offset += wordCount
      }
      if (kind === 'memorisation') {
        this.aiMemorisationCheckerEvaluationMap = evaluationMap
        this.aiMemorisationCheckerHighlightMap = highlightMap
        return
      }
      this.recitationSessionEvaluationMap = evaluationMap
      this.recitationSessionHighlightMap = highlightMap
    },
    getSessionAyahHighlightState(kind = 'recitation', verse = {}, fallbackIndex = 0) {
      const key = this.getSessionTargetKey(verse, fallbackIndex)
      const map = kind === 'memorisation' ? this.aiMemorisationCheckerHighlightMap : this.recitationSessionHighlightMap
      return map?.[key] || 'notAttempted'
    },
    getWordVisualStatus(word = {}, active = false, finalised = false) {
      const status = String(word?.status || 'pending')
      if (['correct', 'partial', 'incorrect', 'skipped', 'notAttempted'].includes(status)) return status
      if (status === 'pending') return finalised ? 'skipped' : (active ? 'notAttempted' : 'notAttempted')
      return 'notAttempted'
    },
    shouldShowRecitationReviewHighlights(ayahKey) {
      if (!this.isRecitationCheckTargetVerse(ayahKey)) return false
      if (this.recitationCheckRecording || this.recitationCheckPreparing || this.recitationCheckResult) return true
      if (this.aiMemorisationCheckerRecording || this.aiMemorisationCheckerPreparing || this.aiMemorisationCheckerResult) return true
      return false
    },
    isRecitationCheckTargetVerse(ayahKey) {
      if (!ayahKey) return false
      if (this.recitationCheckTargetVerseKey === ayahKey) return true
      if (this.aiMemorisationCheckerVerseKey === ayahKey) return true
      return (this.recitationCheckPendingTargets || []).some(verse => verse?.key === ayahKey)
        || (this.aiMemorisationCheckerTargets || []).some(verse => verse?.key === ayahKey)
    },
    getRecitationWordOffsetForVerse(ayahKey, targets = null, sessionTargetKey = '') {
      const list = Array.isArray(targets) && targets.length
        ? targets
        : (this.recitationCheckPendingTargets?.length ? this.recitationCheckPendingTargets : this.aiMemorisationCheckerTargets)
      if (!ayahKey || !list?.length) return 0
      let offset = 0
      for (let index = 0; index < list.length; index += 1) {
        const verse = list[index]
        const targetKey = this.getSessionTargetKey(verse, index)
        if (sessionTargetKey && targetKey === sessionTargetKey) return offset
        if (!sessionTargetKey && verse?.key === ayahKey) return offset
        offset += this.tokenizeRecitationDisplayWords(this.getPlainVerseArabicForCheck(verse)).length
      }
      return 0
    },
    isLiveRecitationDomPatchModeForVerse(ayahKey) {
      if (!this.isRecitationCheckTargetVerse(ayahKey)) return false
      if (this.recitationCheckRecording || this.recitationCheckPreparing) return true
      if (this.aiMemorisationCheckerRecording || this.aiMemorisationCheckerPreparing) return true
      return false
    },
    getRenderedRecitationWordStatusForVerse(ayahKey, index, sessionTargetKey = '') {
      if (this.isLiveRecitationDomPatchModeForVerse(ayahKey)) return 'notAttempted'
      return this.getRecitationWordStatusForVerse(ayahKey, index, sessionTargetKey)
    },
    getRecitationWordStatusForVerse(ayahKey, index, sessionTargetKey = '') {
      if (!this.isRecitationCheckTargetVerse(ayahKey)) return ''
      const isMemoryTarget = (this.aiMemorisationCheckerTargets || []).some((verse, targetIndex) => {
        const targetKey = this.getSessionTargetKey(verse, targetIndex)
        return sessionTargetKey ? targetKey === sessionTargetKey : verse?.key === ayahKey
      })
      const liveSource = isMemoryTarget
        ? this.aiMemorisationCheckerLiveWords
        : this.recitationLiveWords
      const result = isMemoryTarget
        ? (this.aiMemorisationCheckerResult || null)
        : (this.recitationCheckResult || null)
      const modeActive = isMemoryTarget
        ? (this.aiMemorisationCheckerRecording || this.aiMemorisationCheckerPreparing)
        : (this.recitationCheckRecording || this.recitationCheckPreparing)
      const source = modeActive
        ? liveSource
        : (result ? this.getRecitationWordStatuses(result) : [])
      if (!source?.length) return ''
      const offsetTargets = isMemoryTarget ? this.aiMemorisationCheckerTargets : this.recitationCheckPendingTargets
      const offset = this.getRecitationWordOffsetForVerse(ayahKey, offsetTargets, sessionTargetKey)
      const status = source?.[offset + index]?.status || ''
      if (['correct', 'partial', 'incorrect'].includes(status)) return status
      if (status === 'pending') return modeActive ? 'notAttempted' : 'skipped'
      if (['skipped', 'notAttempted'].includes(status)) return status
      return modeActive ? 'notAttempted' : ''
    },
    toggleAiRecitationStrictProgression() {
      this.aiRecitationStrictProgression = !this.aiRecitationStrictProgression
      this.persistUiState()
    },
    setAiRecitationProgressionMode(mode = 'strict') {
      this.aiRecitationStrictProgression = mode !== 'end'
      this.persistUiState()
    },
    toggleAiRecitationPersistMistakes() {
      this.aiRecitationPersistMistakes = !this.aiRecitationPersistMistakes
      if (!this.aiRecitationPersistMistakes) this.persistentAiRecitationReviews = {}
      this.persistUiState()
    },
    toggleAiRecallMode() {
      this.aiRecallModeEnabled = !this.aiRecallModeEnabled
      this.persistUiState()
      this.persistAiRecallModeToServer()
      if (!this.aiRecallModeEnabled) {
        this.recallRevealCurrentIndex = -1
        this.$nextTick(() => this.clearRecallVisibility())
      } else {
        this.$nextTick(() => {
          if (this.recitationCheckRecording) this.applyRecallVisibility()
        })
      }
    },
    async persistAiRecallModeToServer() {
      if (typeof window === 'undefined' || !window.mutqinAuthCheck) return
      try {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        await fetch('/api/profile/ai-recall-mode', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
          },
          credentials: 'same-origin',
          body: JSON.stringify({ ai_recall_mode_enabled: this.aiRecallModeEnabled }),
        })
      } catch (e) {
        // non-blocking: local preference still persists
      }
    },
    revealCurrentRecallWord() {
      const idx = this.recallCurrentWordIndex
      if (!Number.isFinite(idx) || idx < 0) return
      this.recallRevealCurrentIndex = idx
      this.$nextTick(() => this.applyRecallVisibility(true))
    },
    handleRecallModeRecordingChange(isRecording) {
      // Force a fresh node cache: the ayah HTML is re-rendered when recording
      // starts/stops, so any previously cached word nodes are now stale.
      this._recallContainerEl = null
      this._recallNodeCache = null
      this._lastRecallIndex = -2
      this._lastRecallRevealIndex = -2
      if (!isRecording) {
        this.recallRevealCurrentIndex = -1
        this.$nextTick(() => this.clearRecallVisibility())
        return
      }
      this.recallRevealCurrentIndex = -1
      this.$nextTick(() => {
        if (this.aiRecallModeEnabled) this.applyRecallVisibility(true)
      })
    },
    getRecallGlobalWordIndexFromNode(node) {
      if (!node?.getAttribute) return -1
      const localIndex = Number(node.getAttribute('data-word-index'))
      if (!Number.isFinite(localIndex)) return -1
      const verseKey = node.getAttribute('data-verse-key')
        || node.closest('[data-ayah-key]')?.getAttribute('data-ayah-key')
        || ''
      const sessionTargetKey = node.getAttribute('data-session-target-key')
        || node.closest('[data-session-target-key]')?.getAttribute('data-session-target-key')
        || ''
      const offset = this.getRecitationWordOffsetForVerse(
        verseKey,
        this.recitationCheckPendingTargets,
        sessionTargetKey
      )
      return offset + localIndex
    },
    applyRecallWordHidden(node, isCurrent = false) {
      if (!node?.classList) return
      node.classList.add('recall-hidden')
      node.classList.toggle('recall-current', !!isCurrent)
      node.dataset.recallHidden = 'true'
      if (node.style?.setProperty) {
        node.style.setProperty('color', 'transparent', 'important')
        node.style.setProperty('box-shadow', 'none', 'important')
        node.style.setProperty('text-shadow', 'none', 'important')
      }
    },
    clearRecallWordNode(node) {
      if (!node?.classList) return
      node.classList.remove('recall-hidden', 'recall-current')
      if (node.dataset.recallHidden === 'true') {
        delete node.dataset.recallHidden
        node.style?.removeProperty('color')
        node.style?.removeProperty('box-shadow')
        node.style?.removeProperty('text-shadow')
      }
    },
    getRecallWordEntries() {
      // Cache the ayah word nodes so the per-frame recall pass does not run a
      // fresh querySelector + querySelectorAll on every recognition tick. The
      // cache is invalidated when the ayah HTML is re-rendered (v-html replaces
      // the nodes, so the previously cached nodes become disconnected).
      let container = this._recallContainerEl
      if (!container || !container.isConnected) {
        container = document.querySelector('.self-check-modal-ayah')
        this._recallContainerEl = container
        this._recallNodeCache = null
      }
      if (!container) {
        this._recallCacheRebuilt = false
        return []
      }
      const nodes = container.querySelectorAll('.wbw-word, word')
      const cache = this._recallNodeCache
      const stale = !cache
        || cache.length !== nodes.length
        || (cache[0] && !cache[0].node.isConnected)
      if (!stale) {
        this._recallCacheRebuilt = false
        return cache
      }
      const entries = []
      nodes.forEach(node => {
        const globalIndex = this.getRecallGlobalWordIndexFromNode(node)
        if (Number.isFinite(globalIndex) && globalIndex >= 0) entries.push({ node, globalIndex })
      })
      this._recallNodeCache = entries
      this._recallCacheRebuilt = true
      return entries
    },
    applyRecallVisibility(force = false) {
      if (typeof document === 'undefined') return
      if (!this.aiRecallModeEnabled || !this.recitationCheckRecording) {
        this.clearRecallVisibility()
        return
      }
      const currentIndex = this.recallCurrentWordIndex
      const revealedIndex = this.recallRevealCurrentIndex
      const entries = this.getRecallWordEntries()
      if (!entries.length) return
      // Skip the whole pass when nothing changed (cheap guard for the rAF loop),
      // unless the node cache was just rebuilt (fresh nodes need styling).
      if (!force && !this._recallCacheRebuilt
        && currentIndex === this._lastRecallIndex
        && revealedIndex === this._lastRecallRevealIndex) {
        return
      }
      this._recallCacheRebuilt = false
      this._lastRecallIndex = currentIndex
      this._lastRecallRevealIndex = revealedIndex
      for (let i = 0; i < entries.length; i += 1) {
        const { node, globalIndex } = entries[i]
        const hide = globalIndex >= currentIndex && globalIndex !== revealedIndex
        const isCurrent = hide && globalIndex === currentIndex
        const state = hide ? (isCurrent ? 'current' : 'hidden') : 'visible'
        // Only touch the DOM for nodes whose recall state actually changed.
        if (node.dataset.recallState === state) continue
        node.dataset.recallState = state
        if (hide) this.applyRecallWordHidden(node, isCurrent)
        else this.clearRecallWordNode(node)
      }
    },
    clearRecallVisibility() {
      if (typeof document === 'undefined') return
      this._lastRecallIndex = -2
      this._lastRecallRevealIndex = -2
      this._recallCacheRebuilt = false
      const container = this._recallContainerEl && this._recallContainerEl.isConnected
        ? this._recallContainerEl
        : document.querySelector('.self-check-modal-ayah')
      if (!container) return
      container.querySelectorAll('.wbw-word, word').forEach(node => {
        this.clearRecallWordNode(node)
        if (node.dataset) delete node.dataset.recallState
      })
      if (this.recitationCheckRecording && Array.isArray(this.recitationLiveWords) && this.recitationLiveWords.length) {
        const changedWords = this.recitationLiveWords.map((word, index) => ({ index, word }))
        this.queueLiveWordDomPatches('recitationLiveWords', changedWords)
      }
    },
    getAiRecitationLiveGuidance(words = []) {
      const list = Array.isArray(words) ? words : []
      const issue = list.find(word => ['incorrect', 'partial'].includes(word.status))
      if (this.aiRecitationStrictProgression && issue) {
        return `Mistake detected at ${issue.text}. Recite it correctly before moving on.`
      }
      if (this.aiRecitationStrictProgression) {
        return 'Listening now. Each word must turn green before the next word unlocks.'
      }
      return 'Listening now. Recite to the end; final colours are confirmed after you stop.'
    },
    rebuildRecitationResultFromStatuses(result = null) {
      if (!result) return null
      const statuses = this.getRecitationWordStatuses(result).map(word => ({ ...word }))
      const mistakes = this.buildRecitationMistakesFromStatuses(
        statuses,
        this.tokenizeRecitationWords(result.transcript || ''),
        statuses.map(word => this.tokenizeRecitationWords(word.text)[0] || ''),
        result?.mistakeBreakdown?.extra || result?.mistakes?.extra || [],
        result?.mistakeBreakdown || result?.mistakes || {}
      )
      const total = Math.max(1, statuses.length)
      const correctScore = statuses.filter(word => word.status === 'correct').length
      const partialScore = statuses
        .filter(word => word.status === 'partial')
        .reduce((sum, word) => {
          const confidence = Number.isFinite(Number(word?.confidence)) ? Number(word.confidence) : 1
          return sum + (0.45 * Math.max(0.35, Math.min(1, confidence)))
        }, 0)
      const wrongOrderPenalty = statuses.filter(word => word.outOfOrder).length * 0.35
      const extraPenalty = (mistakes.extra.length || 0) * 0.35
      result.wordStatuses = statuses
      result.mistakes = mistakes
      result.mistakeBreakdown = mistakes
      result.accuracyScore = Math.max(0, Math.min(100, Math.round(((correctScore + partialScore - wrongOrderPenalty - extraPenalty) / total) * 100)))
      result.recommendation = this.getRecitationRecommendation(result.accuracyScore, mistakes)
      result.reviewMetadata = this.buildRecitationReviewMetadata(result.accuracyScore, mistakes, result.tajweedRules || [])
      result.skippedWords = mistakes.skippedWords || []
      result.wordSkips = mistakes.wordSkips || []
      result.skippedAyahs = mistakes.skippedAyahs || []
      result.verseJumps = mistakes.verseJumps || []
      result.verseJumpDetected = (mistakes.verseJumps?.length || 0) > 0
      result.sequenceErrors = mistakes.sequenceErrors || []
      return result
    },
    markAiRecitationWordAsCorrect(result = null, index = -1) {
      if (!result || index < 0) return
      const statuses = this.getRecitationWordStatuses(result).map(word => ({ ...word }))
      if (!statuses[index] || statuses[index].status === 'correct') return
      statuses[index] = {
        ...statuses[index],
        status: 'correct',
        note: 'Marked correct after user review.',
        actual: statuses[index].actual || ''
      }
      result.wordStatuses = statuses
      this.rebuildRecitationResultFromStatuses(result)
      this.recitationLiveWords = this.recitationCheckResult === result ? statuses : this.recitationLiveWords
      this.aiMemorisationCheckerLiveWords = this.aiMemorisationCheckerResult === result ? statuses : this.aiMemorisationCheckerLiveWords
      if (this.recitationCheckResult === result) this.syncSessionEvaluationMaps('recitation', this.recitationCheckPendingTargets, statuses, true)
      if (this.aiMemorisationCheckerResult === result) this.syncSessionEvaluationMaps('memorisation', this.aiMemorisationCheckerTargets, statuses, true)
      this.persistAiRecitationReviewHighlights(result, this.getRecitationTargetVersesForResult(result))
      this.persistAiMemorisationCheckerSession()
      this.showBanner(this.t('toasts.aiHighlightMarkedCorrectResultsUpdated'), 'success', 1400)
    },
    handleRecitationReviewWordClick(event, result = null) {
      const target = event?.target?.closest?.('[data-recitation-word-index]')
      if (!target) return
      this.markAiRecitationWordAsCorrect(result, Number(target.dataset.recitationWordIndex))
    },
    persistAiRecitationReviewHighlights(result = null, targetVerses = []) {
      if (!this.aiRecitationPersistMistakes || !result) return
      const statuses = this.getRecitationWordStatuses(result)
      const targets = Array.isArray(targetVerses) && targetVerses.length
        ? targetVerses
        : this.getRecitationTargetVersesForResult(result)
      let offset = 0
      const next = { ...this.persistentAiRecitationReviews }
      targets.forEach(verse => {
        const count = this.tokenizeRecitationDisplayWords(this.getPlainVerseArabicForCheck(verse)).length
        const verseStatuses = statuses.slice(offset, offset + count)
        if (verse?.key && verseStatuses.some(word => word.status && word.status !== 'correct')) {
          next[verse.key] = {
            ...result,
            wordStatuses: verseStatuses,
            targetText: this.getPlainVerseArabicForCheck(verse),
            ayahKey: verse.key,
            ayahRange: this.buildRecitationAyahRangePayload([verse])
          }
        } else if (verse?.key) {
          delete next[verse.key]
        }
        offset += count
      })
      this.persistentAiRecitationReviews = next
      this.persistUiState()
    },
    focusSelfCheckSavedAttempts(kind = '') {
      this.selfCheckSavedAttemptsVisible = true
      this.selfCheckSavedAttemptsFilter = ['recordings', 'ai'].includes(kind) ? kind : 'all'
      this.$nextTick(() => {
        const panel = this.$refs.selfCheckSavedAttemptsPanel
        if (panel?.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
      if (kind === 'ai' && !this.selfCheckModalAiChecks.length) {
        this.showBanner(this.t('toasts.noSavedReciteChecksForThis'), 'info', 1600)
      }
    },
    openAiRecitationCheckForVerse(verse) {
      if (!verse?.key) return
      this.recitationCheckScope = 'ayah'
      this.openSelfCheckModal(verse)
      const target = this.buildSelfCheckVerseRef(verse)
      this.recitationCheckPendingTargets = target ? [target] : []
      this.selfCheckBlurEnabled = false
      this.recitationCheckPanelOpen = true
      this.recitationCheckError = ''
      this.recitationCheckResult = null
      this.syncSessionEvaluationMaps('recitation', this.recitationCheckPendingTargets, [], false)
      this.seedRecitationLiveWords(this.recitationCheckPendingTargets)
    },
    openAiRecitationCheckForSession() {
      if (this.recitationCheckRecording || this.recitationCheckPreparing) return
      const targets = this.getSessionCheckTargetVerses()
      if (!targets.length) {
        this.showBanner(this.t('toasts.chooseASessionRangeBeforeStarting'), 'info', 2200)
        return
      }
      this.recitationCheckScope = 'session'
      this.selfCheckModeChoiceVisible = false
      this.selfCheckVerseRef = this.buildSelfCheckVerseRef(targets[0])
      this.selfCheckVerseKey = targets[0].key
      this.recitationCheckPendingTargets = targets
      this.selfCheckBlurEnabled = false
      this.selfCheckSavedAttemptsVisible = false
      this.recitationCheckPanelOpen = true
      this.recitationCheckError = ''
      this.recitationCheckResult = null
      this.syncSessionEvaluationMaps('recitation', this.recitationCheckPendingTargets, [], false)
      this.seedRecitationLiveWords(this.recitationCheckPendingTargets)
      this.showSelfCheckModal = true
      this.syncBodyScrollLock(true)
    },
    openAiMemorisationCheckerForVerse(verse) {
      if (!verse?.key) return
      if (this.aiMemorisationCheckerRecording) {
        this.showBanner(this.t('toasts.stopTheCurrentMemorisationCheckBefore'), 'info', 2200)
        return
      }
      this.showTools = false
      this.aiMemorisationCheckerScope = 'ayah'
      this.aiMemorisationCheckerVerseRef = this.buildSelfCheckVerseRef(verse)
      this.aiMemorisationCheckerVerseKey = verse.key
      this.aiMemorisationCheckerTargetVerses = this.aiMemorisationCheckerVerseRef ? [this.aiMemorisationCheckerVerseRef] : []
      this.aiMemorisationCheckerMode = 'ayah'
      this.aiMemorisationCheckerTajweedEnabled = false
      this.aiMemorisationCheckerBlurEnabled = true
      this.aiMemorisationCheckerPeekActive = false
      this.aiMemorisationCheckerError = ''
      this.aiMemorisationCheckerResult = null
      this.aiMemorisationCheckerSavedNotice = false
      this.aiMemorisationCheckerDiscardOnStop = false
      this.selfCheckFontSize = this.getSelfCheckInitialFontSize(verse)
      this.syncSessionEvaluationMaps('memorisation', this.aiMemorisationCheckerTargetVerses, [], false)
      this.prepareAiMemorisationCheckerWords()
      this.loadAiMemorisationCheckerHistory()
      this.showAiMemorisationCheckerModal = true
      this.playUiTone('open')
      this.syncBodyScrollLock(true)
      this.persistAiMemorisationCheckerSession()
    },
    openAiMemorisationCheckerForSession() {
      if (this.aiMemorisationCheckerRecording || this.aiMemorisationCheckerPreparing) return
      const targets = this.getSessionCheckTargetVerses()
      if (!targets.length) {
        this.showBanner(this.t('toasts.chooseASessionRangeBeforeOpening'), 'info', 2200)
        return
      }
      const builtTargets = targets
      const first = builtTargets[0]
      this.showTools = false
      this.aiMemorisationCheckerScope = builtTargets.length > 1 ? 'session' : 'ayah'
      this.aiMemorisationCheckerVerseRef = first
      this.aiMemorisationCheckerVerseKey = first.key
      this.aiMemorisationCheckerTargetVerses = builtTargets
      this.aiMemorisationCheckerMode = builtTargets.length > 1 ? 'session' : 'ayah'
      this.aiMemorisationCheckerTajweedEnabled = false
      this.aiMemorisationCheckerBlurEnabled = true
      this.aiMemorisationCheckerPeekActive = false
      this.aiMemorisationCheckerError = ''
      this.aiMemorisationCheckerResult = null
      this.aiMemorisationCheckerSavedNotice = false
      this.aiMemorisationCheckerDiscardOnStop = false
      this.selfCheckFontSize = this.getSelfCheckInitialFontSize(first)
      this.syncSessionEvaluationMaps('memorisation', this.aiMemorisationCheckerTargetVerses, [], false)
      this.prepareAiMemorisationCheckerWords()
      this.loadAiMemorisationCheckerHistory()
      this.showAiMemorisationCheckerModal = true
      this.playUiTone('open')
      this.syncBodyScrollLock(true)
      this.persistAiMemorisationCheckerSession()
    },
    closeAiMemorisationCheckerModal() {
      if (this.aiMemorisationCheckerRecording || this.aiMemorisationCheckerPreparing) {
        this.aiMemorisationCheckerDiscardOnStop = true
        if (['recording', 'paused'].includes(this.aiMemorisationCheckerMediaRecorder?.state)) {
          try { this.aiMemorisationCheckerMediaRecorder.stop() } catch { }
        }
        this.aiMemorisationCheckerRecording = false
        this.aiMemorisationCheckerPreparing = false
        this.cleanupAiMemorisationCheckerMedia()
      }
      this.showAiMemorisationCheckerModal = false
      this.aiMemorisationCheckerPeekActive = false
      this.aiMemorisationCheckerError = ''
      if (!this.aiRecitationPersistMistakes) this.aiMemorisationCheckerTargetVerses = []
      this.aiMemorisationCheckerEvaluationMap = {}
      this.aiMemorisationCheckerHighlightMap = {}
      this.aiMemorisationCheckerScope = 'ayah'
      this.stopRecordingsPlayback({ clearSource: true })
      this.syncBodyScrollLock(false)
      this.persistAiMemorisationCheckerSession()
    },
    prepareAiMemorisationCheckerWords() {
      this.cancelLiveWordDomPatchFrame()
      this.clearRecitationDisplayHtmlCache()
      const words = this.tokenizeRecitationDisplayWords(this.getRecitationTargetText(this.aiMemorisationCheckerTargets))
      const liveWords = []
      for (const text of words) {
        liveWords.push({ text, status: 'pending', note: 'Waiting for this word.' })
      }
      this.aiMemorisationCheckerLiveWords = liveWords
      this.aiMemorisationCheckerHiddenIndexes = []
      this.aiMemorisationCheckerLiveAlignmentSignature = ''
      this.syncSessionEvaluationMaps('memorisation', this.aiMemorisationCheckerTargets, this.aiMemorisationCheckerLiveWords, false)
    },
    toggleAiMemorisationCheckerTajweed() {
      this.aiMemorisationCheckerTajweedEnabled = !this.aiMemorisationCheckerTajweedEnabled
      this.persistAiMemorisationCheckerSession()
    },
    async toggleAiMemorisationCheckerRecording() {
      if (this.aiMemorisationCheckerRecording) {
        this.stopAiMemorisationCheckerRecording()
        return
      }
      await this.startAiMemorisationCheckerRecording()
    },
    toggleAiMemorisationCheckerBlur() {
      this.aiMemorisationCheckerBlurEnabled = !this.aiMemorisationCheckerBlurEnabled
      if (!this.aiMemorisationCheckerBlurEnabled) this.aiMemorisationCheckerPeekActive = false
      this.persistAiMemorisationCheckerSession()
    },
    startAiMemorisationCheckerPeek() {
      this.aiMemorisationCheckerPeekActive = true
    },
    stopAiMemorisationCheckerPeek() {
      this.aiMemorisationCheckerPeekActive = false
    },
    getAiMemorisationCheckerArabic(verse) {
      const targets = this.aiMemorisationCheckerTargets.length ? this.aiMemorisationCheckerTargets : (verse ? [verse] : [])
      if (!targets.length) return ''
      const showMarkers = targets.length > 1
      const rendered = []
      for (let index = 0; index < targets.length; index += 1) {
        const item = targets[index]
        const liveVerse = { ...(this.getCanonicalVerseForCheck(item) || item), ...item }
        const marker = showMarkers
          ? `<span class="self-check-ayah-number-marker" dir="ltr">(${this.escapeHtml(liveVerse?.number || String(liveVerse?.key || '').split(':')[1] || '')})</span> `
          : ''
        let html = ''
        if (showMarkers || this.aiMemorisationCheckerScope === 'session' || this.aiMemorisationCheckerTargets.length > 1) {
          html = this.splitRecitationDisplayIntoWords(liveVerse)
        } else if (this.isAiMemorisationCheckerReviewActive) {
          html = this.splitRecitationDisplayIntoWords(liveVerse)
        } else if (this.aiMemorisationCheckerTajweedEnabled && liveVerse.arabic_tajweed) {
          html = this.renderWordLevelTajweedMarkup(liveVerse)
        } else {
          html = this.cleanRecitationDisplayText(liveVerse.arabic || liveVerse.arabic_tajweed || '')
        }
        if (!html) continue
        const state = this.getSessionAyahHighlightState('memorisation', liveVerse, index)
        rendered.push(`<span class="session-evaluation-ayah session-evaluation-${this.escapeHtml(state)}" dir="rtl" lang="ar" data-session-target-key="${this.escapeHtml(this.getSessionTargetKey(liveVerse, index))}" data-ayah-key="${this.escapeHtml(liveVerse?.key || '')}">${marker}${html}</span>`)
      }
      return rendered.join(' ')
    },
    getAiMemorisationCheckerAyahStyle(verse) {
      return {
        'font-family': this.quranFontFamily,
        'line-height': 1.9,
        'letter-spacing': 0
      }
    },
    isAiMemorisationCheckerLiveComplete() {
      const words = Array.isArray(this.aiMemorisationCheckerLiveWords) ? this.aiMemorisationCheckerLiveWords : []
      if (!words.length) return false
      const classified = words.filter(word => ['correct', 'partial', 'incorrect'].includes(word.status)).length
      if (classified < words.length) return false
      return words.some(word => word.status !== 'correct')
        || words.every(word => word.status === 'correct')
    },
    startAiMemorisationCheckerSpeechRecognition() {
      const SpeechRecognition = this.getSpeechRecognitionConstructor()
      this.aiMemorisationCheckerSpeechRecognition = null
      if (!SpeechRecognition) return false
      try {
        const recognition = new SpeechRecognition()
        recognition.lang = 'ar-SA'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.maxAlternatives = 3
        recognition.onresult = event => {
          const entries = this.extractSpeechRecognitionEntries(event)
          const finalEntries = entries.filter(entry => entry.final)
          const interimEntries = entries.filter(entry => !entry.final)
          if (finalEntries.length) this.applyRecognizedEntries('memorisation', finalEntries, true, { provider: 'web-speech' })
          if (interimEntries.length) this.applyRecognizedEntries('memorisation', interimEntries, false, { provider: 'web-speech' })
        }
        recognition.onerror = event => console.warn('Memorisation checker speech recognition error:', event?.error || event)
        recognition.start()
        this.aiMemorisationCheckerSpeechRecognition = recognition
        return true
      } catch (error) {
        console.warn('Failed to start memorisation checker speech recognition:', error)
        return false
      }
    },
    stopAiMemorisationCheckerSpeechRecognition() {
      if (!this.aiMemorisationCheckerSpeechRecognition) return
      try {
        this.aiMemorisationCheckerSpeechRecognition.onresult = null
        this.aiMemorisationCheckerSpeechRecognition.onerror = null
        this.aiMemorisationCheckerSpeechRecognition.stop()
      } catch (error) {
        console.warn('Failed to stop memorisation checker speech recognition:', error)
      }
      this.aiMemorisationCheckerSpeechRecognition = null
    },
    getAiMemorisationCheckerSpeechTranscript() {
      return `${this.aiMemorisationCheckerSpeechTranscript || ''} ${this.aiMemorisationCheckerSpeechInterim || ''}`.replace(/\s+/g, ' ').trim()
    },
    cleanupAiMemorisationCheckerMedia() {
      this.stopAiMemorisationCheckerSpeechRecognition()
      this.stopTranscriptionRecognition('memorisation')
      this.resetTranscriptionMeta('memorisation')
      this.stopTranscriptionAudioBridge('memorisation')
      this.stopRecitationVad()
      if (this.aiMemorisationCheckerMediaStream) {
        try { this.aiMemorisationCheckerMediaStream.getTracks().forEach(track => track.stop()) } catch { }
      }
      this.aiMemorisationCheckerMediaStream = null
      this.aiMemorisationCheckerMediaRecorder = null
      this.aiMemorisationCheckerChunks = []
      this.aiMemorisationCheckerStartedAt = 0
      this.aiMemorisationCheckerLiveChunkInFlight = false
      this.aiMemorisationCheckerLiveChunkQueue = []
      this.aiMemorisationCheckerStableWords = []
    },
    resetAiMemorisationCheckerLiveTranscription() {
      this.aiMemorisationCheckerLiveTranscript = ''
      this.aiMemorisationCheckerLiveChunkInFlight = false
      this.aiMemorisationCheckerLiveChunkQueue = []
    },
    async startAiMemorisationCheckerRecording() {
      const targets = this.aiMemorisationCheckerTargets
      const verse = targets[0]
      if (!verse?.key || !targets.length) return
      if (!this.supportsSelfCheckRecording()) {
        this.aiMemorisationCheckerError = 'Recording is not supported in this browser.'
        return
      }
      if (this.aiMemorisationCheckerRecording || this.aiMemorisationCheckerPreparing) return
	      this.aiMemorisationCheckerError = ''
	      this.aiMemorisationCheckerResult = null
	      this.prepareAiMemorisationCheckerWords()
	      this.resetAiMemorisationCheckerLiveTranscription()
	      this.resetRecognitionPipelineState('memorisation')
      this.aiMemorisationCheckerPreparing = true
      this.stopRecordingsPlayback({ clearSource: true })
      if (this.audioElement && !this.audioElement.paused) {
        try { this.audioElement.pause() } catch { }
        this.isPlaying = false
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          }
        })
        const mimeType = this.chooseRecorderMimeType()
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        this.aiMemorisationCheckerMediaStream = stream
        this.aiMemorisationCheckerMediaRecorder = recorder
        this.aiMemorisationCheckerChunks = []
        const bridgeReady = this.startTranscriptionAudioBridge('memorisation', stream)
        const transcriptionReady = bridgeReady && await this.startTranscriptionRecognition('memorisation')
        if (!transcriptionReady) {
          this.stopTranscriptionAudioBridge('memorisation')
          this.startAiMemorisationCheckerSpeechRecognition()
        }
        recorder.ondataavailable = event => {
          if (event.data?.size) {
            this.aiMemorisationCheckerChunks.push(event.data)
            this.streamTranscriptionAudioChunk('memorisation', event.data)
          }
        }
        recorder.onerror = () => {
          this.aiMemorisationCheckerError = 'The microphone stopped unexpectedly.'
          this.aiMemorisationCheckerPreparing = false
          this.aiMemorisationCheckerRecording = false
          this.cleanupAiMemorisationCheckerMedia()
        }
        recorder.onstop = async () => {
          const chunks = [...this.aiMemorisationCheckerChunks]
          await this.finalizeTranscriptionRecognition('memorisation')
          this.stopAiMemorisationCheckerSpeechRecognition()
          if (this.aiMemorisationCheckerDiscardOnStop) {
            this.aiMemorisationCheckerDiscardOnStop = false
            this.aiMemorisationCheckerRecording = false
            this.aiMemorisationCheckerPreparing = false
            this.cleanupAiMemorisationCheckerMedia()
            return
          }
          this.aiMemorisationCheckerRecording = false
          this.aiMemorisationCheckerPreparing = true
          try {
            if (!chunks.length) throw new Error('No audio was captured.')
            const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
            const audioSrc = await this.blobToDataUrl(blob)
            await this.submitAiMemorisationChecker(blob, targets, audioSrc)
          } catch (error) {
            console.error('Failed to process memorisation check:', error)
            this.aiMemorisationCheckerError = error?.response?.data?.message || error?.message || 'The memorisation check could not be completed.'
          } finally {
            this.aiMemorisationCheckerPreparing = false
            this.cleanupAiMemorisationCheckerMedia()
          }
        }
        recorder.start(RECITATION_CHUNK_TIMESLICE_MS)
        this.startRecitationVad(stream)
        this.aiMemorisationCheckerStartedAt = Date.now()
        this.aiMemorisationCheckerRecording = true
        this.aiMemorisationCheckerPreparing = false
        this.persistAiMemorisationCheckerSession()
      } catch (error) {
        console.error('Failed to start memorisation check:', error)
        this.aiMemorisationCheckerPreparing = false
        this.aiMemorisationCheckerRecording = false
        this.aiMemorisationCheckerError = 'Microphone access was blocked. Allow microphone permission, then try again.'
        this.cleanupAiMemorisationCheckerMedia()
      }
    },
    stopAiMemorisationCheckerRecording() {
      if (!this.aiMemorisationCheckerMediaRecorder || !['recording', 'paused'].includes(this.aiMemorisationCheckerMediaRecorder.state)) return
      this.aiMemorisationCheckerPreparing = true
      this.aiMemorisationCheckerMediaRecorder.stop()
    },
    async submitAiMemorisationChecker(blob, targetVerses, audioSrc = '') {
      const sessionId = this.getCurrentRecitationSessionId()
      const audioHash = await this.hashAudioBlob(blob)
      const cached = await this.readRecitationSessionCache(sessionId, audioHash)
      if (cached?.analysisResult) {
        this.completeAiMemorisationCheckerFromCachedResult(cached.analysisResult, targetVerses, audioSrc || cached.audioSrc || '')
        return
      }
      const committedWords = this.getCommittedRecognitionWords('memorisation')
      const transcript = wordsToTranscript(committedWords)
      if (!committedWords.length) {
        throw new Error('No clear Arabic words were detected. Record again closer to the microphone.')
      }
      const provider = this.getDominantRecognitionProvider(committedWords)
      const result = this.completeAiMemorisationCheckerFromRecognitionWords(
        committedWords,
        targetVerses,
        provider === 'speechmatics' ? 'speechmatics streaming' : 'browser speech recognition',
        audioSrc,
        { sessionId, audioHash, id: `memorisation-check-${audioHash.slice(0, 16)}` }
      )
      const validationReport = this.buildRecognitionValidationForResult('memorisation', targetVerses, result, {
        sessionId,
        audioHash,
        provider
      })
      if (result) {
        result.validationReport = validationReport
        result.analysisVersion = RECITATION_ANALYSIS_VERSION
        result.sessionId = sessionId
        result.audioHash = audioHash
      }
      const cachePayload = {
        analysisVersion: RECITATION_ANALYSIS_VERSION,
        sessionId,
        audioHash,
        audioBlob: blob,
        audioSrc,
        rawTranscriptStream: this.aiMemorisationCheckerRawTranscriptStream,
        stabilizedWords: committedWords,
        wordBuffer: this.aiMemorisationCheckerWordBuffer,
        recognizedWords: committedWords,
        transcript,
        confidenceValues: committedWords.map(word => word.confidence),
        alignmentState: result?.alignmentState || result?.wordStatuses || [],
        analysisResult: result,
        validationReport,
        targetText: this.getRecitationTargetText(targetVerses),
        targetAyahs: this.buildRecitationTargetAyahMetadata(targetVerses),
        metadata: {
          kind: 'memorisation',
          provider,
          sessionId,
          audioHash,
          analysisVersion: RECITATION_ANALYSIS_VERSION,
          targetVerses: this.buildRecitationAyahRangePayload(targetVerses),
          targetAyahs: this.buildRecitationTargetAyahMetadata(targetVerses)
        },
        provider
      }
      await this.writeRecitationSessionCache(cachePayload)
      await this.writeRecitationSessionHistory({
        ...cachePayload,
        id: `memorisation-${sessionId}-${audioHash}`,
        kind: 'memorisation'
      })
    },
    completeAiMemorisationCheckerFromCachedResult(cachedResult, targetVerses, audioSrc = '') {
      if (!cachedResult) return null
      this.cancelLiveWordDomPatchFrame()
      this.clearRecitationDisplayHtmlCache()
      const result = {
        ...cachedResult,
        id: cachedResult.id || `memorisation-check-${Date.now()}`,
        audioSrc,
        transcriptionSource: 'indexeddb cache'
      }
      this.aiMemorisationCheckerResult = result
      this.aiMemorisationCheckerLiveWords = Array.isArray(result.wordStatuses) ? result.wordStatuses : []
      this.syncSessionEvaluationMaps('memorisation', targetVerses, this.aiMemorisationCheckerLiveWords, true)
      this.persistAiRecitationReviewHighlights(result, targetVerses)
      this.aiMemorisationCheckerError = ''
      this.aiMemorisationCheckerSavedNotice = false
      this.playUiTone('complete')
      this.persistAiMemorisationCheckerSession()
      this.scrollToAiMemorisationCheckerResults()
      this.showBanner(this.t('toasts.loadedCachedMemorisationAnalysis'), 'success', 1800)
      return result
    },
    completeAiMemorisationCheckerFromRecognitionWords(recognitionWords = [], targetVerses, source = 'stabilised speech input', audioSrc = '', options = {}) {
      if (!recognitionWords.length) {
        this.aiMemorisationCheckerError = 'No clear Arabic words were detected. Record again closer to the microphone.'
        return null
      }
      this.cancelLiveWordDomPatchFrame()
      this.clearRecitationDisplayHtmlCache()
      const result = {
        ...this.assessRecitationRecognitionWords(recognitionWords, targetVerses, options),
        id: options.id || `memorisation-check-${Date.now()}`,
        type: 'ai-memorisation-check',
        audioSrc,
        mode: this.aiMemorisationCheckerMode,
        hiddenWordIndexes: [...this.aiMemorisationCheckerHiddenIndexes],
        selectedAyah: this.buildAiMemorisationCheckerSelectedAyah(targetVerses[0]),
        transcriptionSource: source
      }
      this.aiMemorisationCheckerResult = result
      this.aiMemorisationCheckerLiveWords = Array.isArray(result.wordStatuses) ? result.wordStatuses : []
      this.syncSessionEvaluationMaps('memorisation', targetVerses, this.aiMemorisationCheckerLiveWords, true)
      this.persistAiRecitationReviewHighlights(result, targetVerses)
      this.aiMemorisationCheckerError = ''
      this.aiMemorisationCheckerSavedNotice = false
      this.playUiTone('complete')
      this.persistAiMemorisationCheckerSession()
      this.scrollToAiMemorisationCheckerResults()
      return result
    },
    scrollToAiMemorisationCheckerResults() {
      this.$nextTick(() => {
        const el = this.$refs.aiMemorisationCheckerResults || document.querySelector('.memorisation-checker-modal .memorisation-checker-results')
        if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    },
    buildAiMemorisationCheckerSelectedAyah(verse) {
      return {
        key: verse?.key || '',
        number: verse?.number || '',
        chapterId: verse?.chapterId || this.currentChapter?.id || this.chapterId,
        chapterName: verse?.chapterName || this.currentChapter?.name_simple || this.activeChapterName || '',
        arabic: this.getPlainVerseArabicForCheck(verse)
      }
    },
    getAiMemorisationCheckerResultStats(result) {
      return this.getRecitationResultStats(result)
    },
    getResolvedRecitationScore(result = null) {
      if (!result) return 0
      const statuses = this.getRecitationWordStatuses(result)
      if (!statuses.length) return Math.max(0, Math.min(100, Math.round(Number(result?.accuracyScore || 0))))
      const mistakes = result?.mistakeBreakdown || result?.mistakes || {}
      const total = Math.max(1, statuses.length)
      const correctScore = statuses.filter(word => word.status === 'correct').length
      const partialScore = statuses
        .filter(word => word.status === 'partial')
        .reduce((sum, word) => {
          const confidence = Number.isFinite(Number(word?.confidence)) ? Number(word.confidence) : 1
          return sum + (0.45 * Math.max(0.35, Math.min(1, confidence)))
        }, 0)
      const wrongOrderPenalty = statuses.filter(word => word.outOfOrder).length * 0.35
      const extraPenalty = (Array.isArray(mistakes.extra) ? mistakes.extra.length : 0) * 0.35
      return Math.max(0, Math.min(100, Math.round(((correctScore + partialScore - wrongOrderPenalty - extraPenalty) / total) * 100)))
    },
    getAiMemorisationScoreFromPercent(score = 0) {
      const value = Math.max(0, Math.min(100, Number(score || 0)))
      if (value >= 90) return 1
      if (value >= 65) return 0.5
      return 0
    },
    getAiMemorisationVerseProgressScore(result = null, verse = null, targetIndex = 0, targets = []) {
      if (!result || !verse) return 0
      const statuses = this.getRecitationWordStatuses(result)
      if (!statuses.length) return this.getAiMemorisationScoreFromPercent(result.accuracyScore)

      let offset = 0
      for (let index = 0; index < targetIndex; index += 1) {
        offset += this.tokenizeRecitationDisplayWords(this.getPlainVerseArabicForCheck(targets[index])).length
      }

      const count = this.tokenizeRecitationDisplayWords(this.getPlainVerseArabicForCheck(verse)).length
      const verseStatuses = statuses.slice(offset, offset + count)
      if (!verseStatuses.length) return this.getAiMemorisationScoreFromPercent(result.accuracyScore)

      const correctScore = verseStatuses.filter(word => word.status === 'correct').length
      const partialScore = verseStatuses
        .filter(word => word.status === 'partial')
        .reduce((sum, word) => {
          const confidence = Number.isFinite(Number(word?.confidence)) ? Number(word.confidence) : 1
          return sum + (0.45 * Math.max(0.35, Math.min(1, confidence)))
        }, 0)
      const wrongOrderPenalty = verseStatuses.filter(word => word.outOfOrder).length * 0.35
      const percent = Math.max(0, Math.min(100, Math.round(((correctScore + partialScore - wrongOrderPenalty) / Math.max(1, verseStatuses.length)) * 100)))
      return this.getAiMemorisationScoreFromPercent(percent)
    },
    parseAiMemorisationProgressTarget(verse = null) {
      const key = String(verse?.key || '').trim()
      const match = key.match(/^(\d+):(\d+)$/)
      if (match) {
        return {
          surah: Number(match[1]),
          ayah: Number(match[2])
        }
      }
      const surah = Number(verse?.chapterId || this.chapterId || this.currentChapter?.id)
      const ayah = Number(verse?.number || verse?.ayahNumber)
      if (!Number.isFinite(surah) || !Number.isFinite(ayah) || surah <= 0 || ayah <= 0) return null
      return { surah, ayah }
    },
    persistAiMemorisationAyahProgress(result = null, targetVerses = []) {
      if (!result) return []
      const targets = Array.isArray(targetVerses) && targetVerses.length
        ? targetVerses
        : this.aiMemorisationCheckerTargets
      const updates = []

      targets.forEach((verse, index) => {
        const ref = this.parseAiMemorisationProgressTarget(verse)
        if (!ref) return
        const lastScore = this.getAiMemorisationVerseProgressScore(result, verse, index, targets)
        const progress = updateAyahProgress(ref.surah, ref.ayah, lastScore)
        updates.push({
          key: `${ref.surah}:${ref.ayah}`,
          ...progress
        })
      })

      if (updates.length) this.refreshHifzJourneyState()
      return updates
    },
    getAiMemorisationCheckerScoreLabel(result) {
      const score = this.getResolvedRecitationScore(result)
      if (score >= 90) return 'Good recall'
      if (score >= 70) return 'Close recall'
      return 'Needs slow review'
    },
    getAiMemorisationCheckerNextStep(result) {
      const statuses = this.getRecitationWordStatuses(result)
      const partial = statuses.filter(word => word.status === 'partial').slice(0, 3).map(word => word.text)
      const review = statuses.filter(word => word.status === 'incorrect' || word.status === 'pending').slice(0, 3).map(word => word.text)
      if (review.length) return `Replay and drill: ${review.join('، ')}. Then retry the checker for the same target.`
      if (partial.length) return `Slow down and sharpen: ${partial.join('، ')}. These were close but not clean.`
      if (this.getResolvedRecitationScore(result) >= 100) return 'Save this attempt to the recordings library, then run one clean recall without peeking.'
      return this.getRecitationNextStep(result)
    },
    getAiRecitationPostReviewMessage(result) {
      const statuses = this.getRecitationWordStatuses(result || {})
      const red = statuses.filter(word => ['incorrect', 'pending'].includes(word.status)).length
      const amber = statuses.filter(word => word.status === 'partial').length
      const outOfOrder = statuses.filter(word => word.outOfOrder).length
      if (!red && !amber) return 'AI did not detect a word-level mistake. Still verify the ayah yourself before saving.'
      if (outOfOrder) return `AI detected ${outOfOrder} word order issue${outOfOrder === 1 ? '' : 's'}. Tap any false highlight to mark it correct and update the results.`
      return `AI detected ${red + amber} possible issue${red + amber === 1 ? '' : 's'}. Tap any amber or red word that AI got wrong to turn it green and update the analysis.`
    },
    aiMemorisationCheckerStorageKey() {
      return 'mutqin_ai_memorisation_checker'
    },
    loadAiMemorisationCheckerHistory() {
      try {
        const parsed = this.readScopedStorageValue('aiMemorisationChecker', this.aiMemorisationCheckerStorageKey(), {})
        this.aiMemorisationCheckerHistory = Array.isArray(parsed?.savedAssessments) ? parsed.savedAssessments : []
      } catch {
        this.aiMemorisationCheckerHistory = []
      }
    },
    persistAiMemorisationCheckerSession(savedAssessments = this.aiMemorisationCheckerHistory) {
      try {
        const transcript = this.aiMemorisationCheckerResult?.transcript || wordsToTranscript(this.getCommittedRecognitionWords('memorisation'))
        const payload = {
          currentSession: {
            selectedAyah: this.buildAiMemorisationCheckerSelectedAyah(this.aiMemorisationCheckerVerse),
            mode: this.aiMemorisationCheckerMode,
            transcript,
            accuracyScore: this.aiMemorisationCheckerResult?.accuracyScore ?? null,
            wordLevelResults: this.aiMemorisationCheckerResult?.wordStatuses || this.aiMemorisationCheckerLiveWords,
            timestamps: {
              openedAt: this.aiMemorisationCheckerResult?.timestamp || new Date().toISOString(),
              startedAt: this.aiMemorisationCheckerStartedAt ? new Date(this.aiMemorisationCheckerStartedAt).toISOString() : null
            },
            recommendations: this.aiMemorisationCheckerResult?.recommendation || '',
            hiddenWordIndexes: this.aiMemorisationCheckerHiddenIndexes
          },
          savedAssessments
        }
        this.writeScopedStorageValue('aiMemorisationChecker', this.aiMemorisationCheckerStorageKey(), payload)
      } catch (error) {
        console.warn('Failed to persist memorisation checker state:', error)
      }
    },
    saveAiMemorisationCheckerAssessment() {
      if (!this.aiMemorisationCheckerResult) return
      this.loadAiMemorisationCheckerHistory()
      const targets = this.aiMemorisationCheckerTargets
      const entry = {
        ...this.aiMemorisationCheckerResult,
        selectedAyah: this.buildAiMemorisationCheckerSelectedAyah(this.aiMemorisationCheckerVerse),
        ayahRange: this.buildRecitationAyahRangePayload(targets),
        savedAt: new Date().toISOString(),
        timestamps: {
          recordedAt: this.aiMemorisationCheckerResult.timestamp,
          savedAt: new Date().toISOString()
        },
        recommendations: this.aiMemorisationCheckerResult.recommendation
      }
      this.aiMemorisationCheckerHistory = [
        entry,
        ...this.aiMemorisationCheckerHistory.filter(item => item.id !== entry.id)
      ]
      const progressUpdates = this.persistAiMemorisationAyahProgress(entry, targets)
      if (progressUpdates.length) {
        entry.ayahProgressUpdates = progressUpdates
        this.aiMemorisationCheckerHistory = [
          entry,
          ...this.aiMemorisationCheckerHistory.filter(item => item.id !== entry.id)
        ]
      }
      this.persistAiMemorisationCheckerSession(this.aiMemorisationCheckerHistory)
      const saved = this.saveAiMemorisationCheckToRecordingsLibrary(entry, targets)
      if (!saved) {
        this.aiMemorisationCheckerSavedNotice = false
        this.showBanner(this.t('toasts.memorisationAssessmentCouldNotBeSaved'), 'error', 2600)
        return
      }
      this.aiMemorisationCheckerSavedNotice = true
      this.playUiTone('save')
      this.showBanner(this.t('toasts.memorisationAssessmentSavedToRecordingsLibrary'), 'success', 2800, {
        key: 'open-recordings-library',
        label: 'Go to recording library',
        payload: {
          ayahKey: this.aiMemorisationCheckerVerseKey || this.aiMemorisationCheckerTargets?.[0]?.key || '',
          returnToSelfCheck: false
        }
      })
    },
    openAiMemorisationCheckerRecordingsLibrary() {
      const ayahKey = this.aiMemorisationCheckerVerseKey || this.aiMemorisationCheckerVerse?.key || ''
      this.showAiMemorisationCheckerModal = false
      this.aiMemorisationCheckerPeekActive = false
      this.syncBodyScrollLock(false)
      this.openRecordingsLibrary({ ayahKey, returnToSelfCheck: false })
    },
    buildRecitationAyahRangePayload(targetVerses = []) {
      const targets = Array.isArray(targetVerses) ? targetVerses.filter(Boolean) : []
      const first = targets[0] || {}
      const last = targets[targets.length - 1] || first
      return {
        start: Number(first?.number || this.rangeStart || 0),
        end: Number(last?.number || first?.number || this.rangeEnd || this.rangeStart || 0),
        keys: targets.map(verse => verse?.key).filter(Boolean)
      }
    },
    saveAiMemorisationCheckToRecordingsLibrary(result, targetVerses = this.aiMemorisationCheckerTargets) {
      if (!result) return false
      this.loadRecordingsLibrary()
      const targets = targetVerses?.length ? targetVerses : this.aiMemorisationCheckerTargets
      const first = targets[0] || this.aiMemorisationCheckerVerse
      const last = targets[targets.length - 1] || first
      const chapterId = Number(first?.chapterId || this.chapterId || this.currentChapter?.id || 0)
      const savedEntry = {
        id: result.id,
        source: 'ai-check',
        type: 'ai-memorisation-check',
        chapterId,
        chapterName: first?.chapterName || this.currentChapter?.name_simple || this.activeChapterName || `Surah ${chapterId}`,
        ayahNumber: Number(first?.number || 0),
        ayahKey: first?.key || '',
        recordedAt: result.timestamp || result.savedAt || new Date().toISOString(),
        durationSeconds: 0,
        result: Number(result.accuracyScore || 0) >= 100 ? 'Excellent' : Number(result.accuracyScore || 0) >= 85 ? 'Good' : 'Needs Review',
        accuracyScore: Number(result.accuracyScore || 0),
        transcript: result.transcript || '',
        targetText: result.targetText || this.getRecitationTargetText(targets),
        wordStatuses: result.wordStatuses || [],
        tajweedRules: result.tajweedRules || [],
        recommendation: result.recommendation || '',
        mistakeBreakdown: result.mistakes || result.mistakeBreakdown || null,
        reviewMetadata: result.reviewMetadata || null,
        validationReport: result.validationReport || null,
        analysisVersion: result.analysisVersion || RECITATION_ANALYSIS_VERSION,
        sessionId: result.sessionId || '',
        audioHash: result.audioHash || '',
        audioSrc: result.audioSrc || '',
        sessionRangeStart: Number(first?.number || this.rangeStart || 1),
        sessionRangeEnd: Number(last?.number || first?.number || this.rangeEnd || 1),
        ayahRange: {
          start: Number(first?.number || 0),
          end: Number(last?.number || first?.number || 0),
          keys: targets.map(verse => verse.key).filter(Boolean)
        }
      }
      this.recordingsLibrary = [
        savedEntry,
        ...this.recordingsLibrary.filter(recording => recording.id !== savedEntry.id)
      ]
      const persisted = this.persistRecordingsLibrary()
      this.selectedRecordingsAyahKey = savedEntry.ayahKey
      this.ensureSelectedRecordingsAyah()
      return persisted
    },
    deleteAiMemorisationCheckerAssessment() {
      const id = this.aiMemorisationCheckerResult?.id
      if (id) {
        this.loadAiMemorisationCheckerHistory()
        this.aiMemorisationCheckerHistory = this.aiMemorisationCheckerHistory.filter(item => item.id !== id)
      }
      this.aiMemorisationCheckerResult = null
      this.aiMemorisationCheckerSavedNotice = false
      this.resetRecognitionPipelineState('memorisation')
      this.prepareAiMemorisationCheckerWords()
      this.syncSessionEvaluationMaps('memorisation', this.aiMemorisationCheckerTargets, this.aiMemorisationCheckerLiveWords, false)
      this.persistAiMemorisationCheckerSession(this.aiMemorisationCheckerHistory)
      this.showBanner(this.t('toasts.memorisationAssessmentDeleted'), 'info', 1400)
    },
    resetAiMemorisationCheckerAssessment() {
      this.aiMemorisationCheckerResult = null
      this.aiMemorisationCheckerError = ''
      this.aiMemorisationCheckerSavedNotice = false
      this.aiMemorisationCheckerSpeechTranscript = ''
      this.aiMemorisationCheckerSpeechInterim = ''
      this.resetRecognitionPipelineState('memorisation')
      this.prepareAiMemorisationCheckerWords()
      this.syncSessionEvaluationMaps('memorisation', this.aiMemorisationCheckerTargets, this.aiMemorisationCheckerLiveWords, false)
      this.resetAiMemorisationCheckerLiveTranscription()
      this.persistAiMemorisationCheckerSession()
      this.showBanner(this.t('toasts.memorisationCheckerReset'), 'info', 1400)
    },
    discardAiMemorisationCheckerAssessment() {
      this.aiMemorisationCheckerResult = null
      this.aiMemorisationCheckerSavedNotice = false
      this.prepareAiMemorisationCheckerWords()
      this.syncSessionEvaluationMaps('memorisation', this.aiMemorisationCheckerTargets, this.aiMemorisationCheckerLiveWords, false)
      this.persistAiMemorisationCheckerSession()
      this.showBanner(this.t('toasts.memorisationAssessmentDiscarded'), 'info', 1400)
    },
    getLatestRecordingForAyah(ayahKey) {
      return this.getAyahRecordingHistory(ayahKey)[0] || null
    },
    getSelfCheckDraftForVerse(verseKey) {
      return this.selfCheckDraft?.ayahKey === verseKey ? this.selfCheckDraft : null
    },
    getSelfCheckLiveDurationLabel() {
      if (!this.selfCheckStartedAt) return '00:00'
      const seconds = Math.max(0, Math.round((Number(this.statsTick || Date.now()) - Number(this.selfCheckStartedAt || 0)) / 1000))
      return this.formatRecordingDuration(seconds)
    },
    getRecitationLiveProgressPercent() {
      if (!this.recitationLiveWords.length) return 0
      const checked = this.recitationLiveWords.filter(word => word.status !== 'pending').length
      return Math.max(0, Math.min(100, Math.round((checked / this.recitationLiveWords.length) * 100)))
    },
    getVisibleRecitationLiveWords(limit = 36) {
      return this.buildVisibleLiveWordWindow(this.recitationLiveWords, limit, 'recitation-live')
    },
    seedRecitationLiveWords(targetVerses = this.getRecitationCheckTargetVerses()) {
      this.cancelLiveWordDomPatchFrame()
      this.clearRecitationDisplayHtmlCache()
      const targetWords = this.tokenizeRecitationDisplayWords(this.getRecitationTargetText(targetVerses))
      const liveWords = []
      for (const text of targetWords) {
        liveWords.push({ text, status: 'pending', note: 'Waiting for this word.' })
      }
      this.recitationLiveWords = liveWords
      this.recitationLiveAlignmentSignature = ''
      this.syncSessionEvaluationMaps('recitation', targetVerses, this.recitationLiveWords, false)
    },
    buildVisibleLiveWordWindow(sourceWords = [], limit = 36, keyPrefix = 'live') {
      const words = Array.isArray(sourceWords) ? sourceWords : []
      if (!words.length) return []
      const safeLimit = keyPrefix === 'memory-live'
        ? words.length
        : Math.max(12, Number(limit || 36))
      let focusIndex = words.findIndex(word => !['correct', 'partial', 'incorrect', 'skipped'].includes(String(word?.status || 'pending')))
      if (focusIndex < 0) {
        focusIndex = words.length - 1
      } else if (focusIndex > 0) {
        focusIndex -= 1
      }
      let start = 0
      let end = words.length
      if (words.length > safeLimit) {
        const trailingCount = Math.max(8, Math.floor(safeLimit * 0.34))
        const leadingCount = Math.max(3, safeLimit - trailingCount - 1)
        start = Math.max(0, focusIndex - leadingCount)
        end = Math.min(words.length, start + safeLimit)
        if (end - start < safeLimit) {
          start = Math.max(0, end - safeLimit)
        }
      }
      const visible = []
      for (let index = start; index < end; index += 1) {
        const word = words[index]
        visible.push({
          ...word,
          index,
          visualStatus: this.getWordVisualStatus(word, true, false),
          key: `${keyPrefix}-${index}`
        })
      }
      return visible
    },
    getRecognitionWordsForLiveAlignment(kind = 'recitation', targetText = '') {
      const state = this.getRecognitionPipelineState(kind)
      const committedWords = Array.isArray(state?.committedWords) ? state.committedWords : []
      const displayWords = getRecognitionDisplayWords(state)
      return {
        committedWords,
        displayWords: Array.isArray(displayWords) && displayWords.length ? displayWords : committedWords
      }
    },
    mergeLiveRecitationStatuses(committedStatuses = [], displayStatuses = []) {
      const committed = Array.isArray(committedStatuses) ? committedStatuses : []
      const display = Array.isArray(displayStatuses) ? displayStatuses : []
      const maxLength = Math.max(committed.length, display.length)
      return Array.from({ length: maxLength }, (_, index) => {
        const confirmed = committed[index] || null
        if (confirmed && confirmed.status && confirmed.status !== 'pending') return confirmed
        const live = display[index] || confirmed || null
        if (!live) return { status: 'pending', note: 'Waiting for this word.' }
        if (['correct', 'partial', 'incorrect'].includes(live.status)) return live
        return { ...live, status: 'pending', note: confirmed?.note || 'Waiting for confirmation.' }
      })
    },
    getLiveWordTargetsForPatch(targetKey = '') {
      if (targetKey === 'aiMemorisationCheckerLiveWords') {
        return this.aiMemorisationCheckerTargets?.length
          ? this.aiMemorisationCheckerTargets
          : (this.aiMemorisationCheckerVerse ? [this.aiMemorisationCheckerVerse] : [])
      }
      return this.recitationCheckPendingTargets?.length
        ? this.recitationCheckPendingTargets
        : this.getRecitationCheckTargetVerses(this.selfCheckModalVerse || null)
    },
    getLiveWordKindForTarget(targetKey = '') {
      return targetKey === 'aiMemorisationCheckerLiveWords' ? 'memorisation' : 'recitation'
    },
    resolveLiveWordPatchTarget(targetKey = '', globalIndex = 0) {
      const targets = this.getLiveWordTargetsForPatch(targetKey)
      let offset = 0
      for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
        const verse = targets[targetIndex]
        const count = this.tokenizeRecitationDisplayWords(this.getPlainVerseArabicForCheck(verse)).length
        if (globalIndex >= offset && globalIndex < offset + count) {
          return {
            verse,
            verseKey: verse?.key || '',
            localIndex: globalIndex - offset,
            globalIndex,
            sessionTargetKey: this.getSessionTargetKey(verse, targetIndex),
            kind: this.getLiveWordKindForTarget(targetKey)
          }
        }
        offset += count
      }
      return null
    },
    escapeCssAttributeValue(value = '') {
      return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    },
    queueLiveWordDomPatches(targetKey = '', changedWords = []) {
      if (!Array.isArray(changedWords) || !changedWords.length || typeof window === 'undefined') return
      const nextPatches = { ...(this.pendingLiveWordDomPatches || {}) }
      changedWords.forEach(change => {
        const target = this.resolveLiveWordPatchTarget(targetKey, change.index)
        if (!target?.verseKey && !Number.isFinite(Number(change.index))) return
        const word = change.word || {}
        const status = this.getWordVisualStatus(word, true, false)
        const key = `${target?.kind || this.getLiveWordKindForTarget(targetKey)}:${target?.verseKey || 'live'}:${target?.localIndex ?? change.index}:${change.index}`
        nextPatches[key] = {
          ...target,
          targetKey,
          status,
          note: word.note || '',
          text: word.text || '',
          word
        }
      })
      this.pendingLiveWordDomPatches = nextPatches
      this.scheduleLiveWordDomPatchFlush()
    },
    scheduleLiveWordDomPatchFlush() {
      if (this.liveWordDomPatchFrame || typeof window === 'undefined') return
      const schedule = typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : callback => window.setTimeout(() => callback(Date.now()), 16)
      this.liveWordDomPatchFrame = schedule(() => {
        this.liveWordDomPatchFrame = null
        this.flushLiveWordDomPatches()
      })
    },
    cancelLiveWordDomPatchFrame() {
      if (this.liveWordDomPatchFrame && typeof window !== 'undefined') {
        if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(this.liveWordDomPatchFrame)
        window.clearTimeout(this.liveWordDomPatchFrame)
      }
      this.liveWordDomPatchFrame = null
      this.pendingLiveWordDomPatches = {}
    },
    resetLiveWordPresentation(node) {
      if (!node?.style?.removeProperty) return
      delete node.dataset.liveWordStatus
      node.style.removeProperty('color')
      node.style.removeProperty('background')
      node.style.removeProperty('border-color')
      node.style.removeProperty('box-shadow')
      node.style.removeProperty('opacity')
      node.style.removeProperty('border-radius')
      node.style.removeProperty('padding-inline')
      node.style.removeProperty('padding-block')
      node.style.removeProperty('transition')
    },
    clearLiveWordDomRegistry() {
      const resetRegistryNodes = registry => {
        if (!registry?.values) return
        for (const nodes of registry.values()) {
          ;(Array.isArray(nodes) ? nodes : []).forEach(node => this.resetLiveWordPresentation(node))
        }
      }
      resetRegistryNodes(this.liveWordVerseNodeRegistry)
      resetRegistryNodes(this.liveWordChipNodeRegistry)
      if (this.liveWordVerseNodeRegistry?.clear) this.liveWordVerseNodeRegistry.clear()
      if (this.liveWordChipNodeRegistry?.clear) this.liveWordChipNodeRegistry.clear()
    },
    buildLiveWordVerseRegistryKey(verseKey = '', localIndex = 0, sessionTargetKey = '') {
      return `${sessionTargetKey || verseKey || 'live'}::${Number(localIndex)}`
    },
    buildLiveWordChipRegistryKey(kind = '', globalIndex = 0) {
      return `${kind || 'recitation'}::${Number(globalIndex)}`
    },
    getLiveWordRegistryNodes(registry = null, key = '', selector = '') {
      const cached = Array.isArray(registry?.get?.(key))
        ? registry.get(key).filter(node => node?.isConnected)
        : []
      if (cached.length) return cached
      if (!selector || typeof document === 'undefined') {
        registry?.delete?.(key)
        return []
      }
      const nodes = Array.from(document.querySelectorAll(selector)).filter(node => node?.isConnected)
      if (nodes.length) {
        registry?.set?.(key, nodes)
      } else {
        registry?.delete?.(key)
      }
      return nodes
    },
    clearRecitationDisplayHtmlCache() {
      if (this.recitationDisplayHtmlCache?.clear) this.recitationDisplayHtmlCache.clear()
      this.clearLiveWordDomRegistry()
    },
    flushLiveWordDomPatches() {
      if (typeof document === 'undefined') return
      const patches = Object.values(this.pendingLiveWordDomPatches || {})
      this.pendingLiveWordDomPatches = {}
      patches.forEach(patch => this.applyLiveWordDomPatch(patch))
      if (this.aiRecallModeEnabled && this.recitationCheckRecording) {
        this.applyRecallVisibility()
      }
    },
    applyLiveWordDomPatch(patch = {}) {
      const status = patch.status || 'notAttempted'
      const title = patch.note || ''
      const targetNodes = new Set()
      if (patch.verseKey) {
        if (patch.sessionTargetKey) {
          const sessionSelector = `[data-session-target-key="${this.escapeCssAttributeValue(patch.sessionTargetKey)}"][data-word-index="${Number(patch.localIndex)}"]`
          const sessionRegistryKey = `${this.buildLiveWordVerseRegistryKey(patch.verseKey, patch.localIndex, patch.sessionTargetKey)}::session`
          this.getLiveWordRegistryNodes(this.liveWordVerseNodeRegistry, sessionRegistryKey, sessionSelector).forEach(node => {
            targetNodes.add(node)
          })
        }
        const verseSelector = `[data-verse-key="${this.escapeCssAttributeValue(patch.verseKey)}"][data-word-index="${Number(patch.localIndex)}"]`
        const verseRegistryKey = `${this.buildLiveWordVerseRegistryKey(patch.verseKey, patch.localIndex, '')}::verse`
        this.getLiveWordRegistryNodes(this.liveWordVerseNodeRegistry, verseRegistryKey, verseSelector).forEach(node => {
          targetNodes.add(node)
        })
      }
      targetNodes.forEach(node => this.setLiveWordNodeStatus(node, status, title))

      const chipSelector = `.recitation-word-chip.word-live[data-live-kind="${this.escapeCssAttributeValue(patch.kind || '')}"][data-live-word-index="${Number(patch.globalIndex)}"]`
      const chipRegistryKey = this.buildLiveWordChipRegistryKey(patch.kind, patch.globalIndex)
      this.getLiveWordRegistryNodes(this.liveWordChipNodeRegistry, chipRegistryKey, chipSelector).forEach(node => {
        this.setLiveWordChipStatus(node, status, title)
      })
    },
    setLiveWordNodeStatus(node, status = 'notAttempted', title = '') {
      if (!node?.classList) return
      RECITATION_WORD_STATUS_CLASSES.forEach(className => node.classList.remove(className))
      node.classList.add(`recitation-word-${status || 'notAttempted'}`)
      this.applyLiveWordPresentation(node, status, 'verse')
      if (title) node.setAttribute('title', title)
      else node.removeAttribute('title')
    },
    setLiveWordChipStatus(node, status = 'notAttempted', title = '') {
      if (!node?.classList) return
      Array.from(node.classList).forEach(className => {
        if (className.startsWith('word-')) node.classList.remove(className)
      })
      node.classList.add(`word-${status || 'notAttempted'}`)
      this.applyLiveWordPresentation(node, status, 'chip')
      if (title) node.setAttribute('title', title)
      else node.removeAttribute('title')
    },
    getLiveWordPresentation(status = 'notAttempted', mode = 'verse') {
      // Subtle palette: coloured text + a thin underline. No background fills,
      // borders, padding or opacity changes on the ayah words, so a status
      // update is paint-only and never reflows the RTL line (this is what keeps
      // the live colouring in lock-step with the voice instead of lagging).
      const palette = {
        correct: { color: '#15724c', underline: 'rgba(26, 133, 79, 0.85)' },
        partial: { color: '#9a6207', underline: 'rgba(204, 138, 11, 0.85)' },
        incorrect: { color: '#a83327', underline: 'rgba(193, 63, 45, 0.85)' },
        pending: { color: 'inherit', underline: 'rgba(116, 126, 141, 0.42)' },
        skipped: { color: 'inherit', underline: 'rgba(116, 126, 141, 0.32)' },
        notAttempted: { color: 'inherit', underline: 'transparent' }
      }
      const resolved = palette[status] || palette.notAttempted
      if (mode === 'chip') {
        // The live word-stream chips are standalone pills; a light tint reads
        // better there than an underline.
        const chipTint = {
          correct: 'rgba(34, 166, 98, 0.16)',
          partial: 'rgba(237, 179, 71, 0.18)',
          incorrect: 'rgba(226, 96, 77, 0.16)',
          pending: 'rgba(116, 126, 141, 0.10)',
          skipped: 'rgba(116, 126, 141, 0.10)',
          notAttempted: 'transparent'
        }
        return { color: resolved.color, background: chipTint[status] || 'transparent' }
      }
      return resolved
    },
    applyLiveWordPresentation(node, status = 'notAttempted', mode = 'verse') {
      if (!node?.style?.setProperty) return
      const presentation = this.getLiveWordPresentation(status, mode)
      node.dataset.liveWordStatus = status || 'notAttempted'
      if (mode === 'chip') {
        node.style.setProperty('color', presentation.color, 'important')
        node.style.setProperty('background', presentation.background, 'important')
        node.style.setProperty('transition', 'background-color 90ms ease, color 90ms ease', 'important')
        return
      }
      // Verse words: only colour + underline change → compositor-friendly,
      // zero layout reflow.
      const underline = presentation.underline === 'transparent'
        ? 'none'
        : `inset 0 -0.085em 0 ${presentation.underline}`
      node.style.setProperty('color', presentation.color, 'important')
      node.style.setProperty('box-shadow', underline, 'important')
      node.style.setProperty('background', 'transparent', 'important')
      node.style.setProperty('border-color', 'transparent', 'important')
      node.style.setProperty('transition', 'color 90ms linear, box-shadow 90ms linear', 'important')
    },
    hasLiveWordChanged(currentWord = {}, nextWord = {}) {
      return currentWord.status !== nextWord.status
        || currentWord.note !== nextWord.note
        || currentWord.confidence !== nextWord.confidence
        || currentWord.actual !== nextWord.actual
        || currentWord.similarity !== nextWord.similarity
    },
    applyLiveStatusUpdate(targetKey, statuses = []) {
      const current = Array.isArray(this[targetKey]) ? this[targetKey] : []
      if (!current.length) return false
      let next = current
      const changedWords = []
      for (let index = 0; index < current.length; index += 1) {
        const word = current[index] || {}
        const status = statuses[index] || {}
        const nextWord = {
          ...word,
          status: status.status || 'pending',
          note: status.note || 'Waiting for this word.',
          confidence: status.confidence ?? word.confidence,
          actual: status.actual ?? word.actual,
          similarity: status.similarity ?? word.similarity
        }
        if (!this.hasLiveWordChanged(word, nextWord)) continue
        if (next === current) next = current.slice()
        next[index] = nextWord
        changedWords.push({ index, word: nextWord })
      }
      if (next === current) return false
      this[targetKey] = next
      this.queueLiveWordDomPatches(targetKey, changedWords)
      return true
    },
    getLiveAlignmentInputSignature(kind = 'recitation', targetVerses = [], committedWords = [], displayWords = []) {
      const targetKeys = (Array.isArray(targetVerses) ? targetVerses : [])
        .map(verse => verse?.key || `${verse?.chapterId || ''}:${verse?.number || ''}`)
        .join(',')
      const wordKey = words => (Array.isArray(words) ? words : [])
        .map(word => `${word?.text || word?.word || ''}:${word?.final ? 1 : 0}:${Number(word?.confidence || 0).toFixed(2)}`)
        .join(' ')
      return `${kind}|${targetKeys}|${wordKey(committedWords)}|${wordKey(displayWords)}`
    },
    getCommittedAlignmentCacheKey(kind = 'recitation') {
      return kind === 'memorisation'
        ? 'aiMemorisationCheckerCommittedAlignment'
        : 'recitationCommittedAlignment'
    },
    getCachedCommittedAlignment(kind = 'recitation', signature = '', targetText = '', committedWords = [], targetVerses = [], options = {}) {
      const signatureField = `${this.getCommittedAlignmentCacheKey(kind)}Signature`
      const cacheField = `${this.getCommittedAlignmentCacheKey(kind)}Cache`
      if (this[signatureField] === signature && this[cacheField]) {
        return this[cacheField]
      }
      const alignment = buildQuranAlignment(targetText, committedWords, {
        ...options,
        targetAyahs: this.buildRecitationTargetAyahMetadata(targetVerses)
      })
      this[signatureField] = signature
      this[cacheField] = alignment
      return alignment
    },
    areRecognitionWordListsEquivalent(left = [], right = []) {
      if (!Array.isArray(left) || !Array.isArray(right)) return false
      if (left.length !== right.length) return false
      for (let index = 0; index < left.length; index += 1) {
        const leftWord = left[index] || {}
        const rightWord = right[index] || {}
        if ((leftWord.word || leftWord.text || '') !== (rightWord.word || rightWord.text || '')) return false
        if (Number(leftWord.confidence || 0).toFixed(3) !== Number(rightWord.confidence || 0).toFixed(3)) return false
      }
      return true
    },
    updateLiveWordsFromCommittedRecognition(kind = 'recitation') {
      const targetVerses = kind === 'memorisation'
        ? this.aiMemorisationCheckerTargets
        : (this.recitationCheckPendingTargets?.length ? this.recitationCheckPendingTargets : this.getRecitationCheckTargetVerses())
      const targetText = this.getRecitationTargetText(targetVerses)
      if (!targetText) return
      const { committedWords, displayWords } = this.getRecognitionWordsForLiveAlignment(kind, targetText)
      const signatureKey = kind === 'memorisation' ? 'aiMemorisationCheckerLiveAlignmentSignature' : 'recitationLiveAlignmentSignature'
      const signature = this.getLiveAlignmentInputSignature(kind, targetVerses, committedWords, displayWords)
      if (this[signatureKey] === signature) return
      this[signatureKey] = signature
      const liveAlignmentOptions = {
        strictProgression: true,
        metadata: {
          sessionId: this.getCurrentRecitationSessionId(),
          audioHash: kind === 'recitation' ? this.recitationInputAudioHash : ''
        }
      }
      const livePreviewAlignmentOptions = {
        ...liveAlignmentOptions,
        strictProgression: false
      }
      if (this.hiddenRevealModeEnabled) {
        liveAlignmentOptions.strictProgression = true
        livePreviewAlignmentOptions.strictProgression = true
      }
      const committedSignature = this.getLiveAlignmentInputSignature(kind, targetVerses, committedWords, committedWords)
      const committedAlignment = this.getCachedCommittedAlignment(
        kind,
        committedSignature,
        targetText,
        committedWords,
        targetVerses,
        liveAlignmentOptions
      )
      const liveAlignment = this.areRecognitionWordListsEquivalent(displayWords, committedWords)
        ? committedAlignment
        : buildRealtimePreviewAlignment(targetText, displayWords, {
          ...livePreviewAlignmentOptions,
          targetAyahs: this.buildRecitationTargetAyahMetadata(targetVerses)
        })
      const statuses = this.mergeLiveRecitationStatuses(
        committedAlignment.wordStatuses || committedAlignment.progression?.visibleStatuses || [],
        liveAlignment.wordStatuses || liveAlignment.progression?.visibleStatuses || []
      )
      if (kind === 'memorisation') {
	        this.aiMemorisationCheckerAlignmentState = committedAlignment.progression
	        this.applyLiveStatusUpdate('aiMemorisationCheckerLiveWords', statuses)
          this.syncSessionEvaluationMaps('memorisation', targetVerses, statuses, false)
	        if (this.aiMemorisationCheckerRecording && committedAlignment.progression?.complete) {
	          this.stopAiMemorisationCheckerRecording()
	        }
        return
      }
	      this.recitationAlignmentState = committedAlignment.progression
	      this.applyLiveStatusUpdate('recitationLiveWords', statuses)
        this.syncSessionEvaluationMaps('recitation', targetVerses, statuses, false)
	      if (this.shouldAutoStopRecitationCheckFromAlignment(committedAlignment)) {
	        this.stopRecitationCheckRecording()
	      }
    },
    handleAiRecitationSilenceAutoStop() {
      const recitationReadyToStop = this.shouldAutoStopRecitationCheckFromSilence()
      const memorisationReadyToStop = this.aiMemorisationCheckerRecording && this.getCommittedRecognitionWords('memorisation').length > 0
      if (recitationReadyToStop) {
        this.stopRecitationCheckRecording()
        return
      }
      if (memorisationReadyToStop) {
        this.stopAiMemorisationCheckerRecording()
      }
    },
    isSessionRecitationCheckActive() {
      return this.recitationCheckScope === 'session' && (this.recitationCheckPendingTargets || []).length > 1
    },
    shouldAutoStopRecitationCheckFromAlignment(alignment = null) {
      if (!this.recitationCheckRecording || !alignment?.progression?.complete) return false
      if (!this.isSessionRecitationCheckActive()) return true
      const targetWordCount = this.tokenizeRecitationDisplayWords(this.getRecitationTargetText(this.recitationCheckPendingTargets)).length
      return targetWordCount > 0 && this.getCommittedRecognitionWords('recitation').length >= targetWordCount
    },
    shouldAutoStopRecitationCheckFromSilence() {
      if (!this.recitationCheckRecording || !this.getCommittedRecognitionWords('recitation').length) return false
      if (!this.isSessionRecitationCheckActive()) return true
      return !!this.recitationAlignmentState?.complete
    },
    chooseRecorderMimeType() {
      if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return ''
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
      return candidates.find(type => MediaRecorder.isTypeSupported(type)) || ''
    },
    openRecitationSessionDb() {
      if (typeof indexedDB === 'undefined') return Promise.resolve(null)
      if (this.recitationSessionCacheDb) return Promise.resolve(this.recitationSessionCacheDb)
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(RECITATION_IDB_NAME, RECITATION_IDB_VERSION)
        request.onupgradeneeded = event => {
          const db = event.target.result
          if (!db.objectStoreNames.contains(RECITATION_IDB_STORE)) {
            const store = db.createObjectStore(RECITATION_IDB_STORE, { keyPath: 'cacheKey' })
            store.createIndex('sessionId', 'sessionId', { unique: false })
            store.createIndex('audioHash', 'audioHash', { unique: false })
          }
          if (!db.objectStoreNames.contains(RECITATION_HISTORY_IDB_STORE)) {
            const history = db.createObjectStore(RECITATION_HISTORY_IDB_STORE, { keyPath: 'id' })
            history.createIndex('sessionId', 'sessionId', { unique: false })
            history.createIndex('audioHash', 'audioHash', { unique: false })
            history.createIndex('recordedAt', 'recordedAt', { unique: false })
          }
        }
        request.onsuccess = event => {
          this.recitationSessionCacheDb = event.target.result
          resolve(this.recitationSessionCacheDb)
        }
        request.onerror = () => reject(request.error || new Error('Unable to open recitation session cache.'))
      })
    },
    recitationSessionCacheKey(sessionId = '', audioHash = '') {
      return `${String(sessionId || 'session')}::${String(audioHash || 'no-audio')}`
    },
    async readRecitationSessionCache(sessionId = '', audioHash = '') {
      const db = await this.openRecitationSessionDb()
      if (!db || !sessionId || !audioHash) return null
      return await new Promise(resolve => {
        const request = db.transaction(RECITATION_IDB_STORE, 'readonly')
          .objectStore(RECITATION_IDB_STORE)
          .get(this.recitationSessionCacheKey(sessionId, audioHash))
        request.onsuccess = () => {
          const cached = request.result || null
          if (!cached) {
            resolve(null)
            return
          }
          resolve(cached.analysisVersion === RECITATION_ANALYSIS_VERSION ? cached : null)
        }
        request.onerror = () => resolve(null)
      })
    },
    async writeRecitationSessionCache(entry = {}) {
      const db = await this.openRecitationSessionDb()
      if (!db || !entry?.sessionId || !entry?.audioHash) return null
      const payload = prepareIndexedDbPayload({
        ...entry,
        cacheKey: this.recitationSessionCacheKey(entry.sessionId, entry.audioHash),
        analysisVersion: entry.analysisVersion || RECITATION_ANALYSIS_VERSION,
        cachedAt: new Date().toISOString()
      })
      return await new Promise(resolve => {
        try {
          const request = db.transaction(RECITATION_IDB_STORE, 'readwrite')
            .objectStore(RECITATION_IDB_STORE)
            .put(payload)
          request.onsuccess = () => resolve(payload)
          request.onerror = () => resolve(null)
        } catch (error) {
          console.error('Failed to persist recitation session cache:', error)
          resolve(null)
        }
      })
    },
    async writeRecitationSessionHistory(entry = {}) {
      const db = await this.openRecitationSessionDb()
      if (!db || !entry?.sessionId) return null
      const payload = prepareIndexedDbPayload({
        ...entry,
        id: entry.id || `${entry.sessionId}-${entry.audioHash || 'no-audio'}-${entry.kind || 'recitation'}`,
        analysisVersion: entry.analysisVersion || RECITATION_ANALYSIS_VERSION,
        recordedAt: entry.recordedAt || entry.analysisResult?.timestamp || new Date().toISOString(),
        savedAt: new Date().toISOString()
      })
      return await new Promise(resolve => {
        try {
          const request = db.transaction(RECITATION_HISTORY_IDB_STORE, 'readwrite')
            .objectStore(RECITATION_HISTORY_IDB_STORE)
            .put(payload)
          request.onsuccess = () => resolve(payload)
          request.onerror = () => resolve(null)
        } catch (error) {
          console.error('Failed to persist recitation session history:', error)
          resolve(null)
        }
      })
    },
    buildRecognitionValidationForResult(kind = 'recitation', targetVerses = [], result = null, options = {}) {
      if (!result) return null
      const rawEvents = kind === 'memorisation'
        ? (this.aiMemorisationCheckerRawTranscriptStream || [])
        : (this.recitationRawTranscriptStream || [])
      const stabilizedWords = kind === 'memorisation'
        ? this.getCommittedRecognitionWords('memorisation')
        : this.getCommittedRecognitionWords('recitation')
      return buildRecognitionValidationReport({
        rawEvents,
        targetText: this.getRecitationTargetText(targetVerses),
        targetAyahs: this.buildRecitationTargetAyahMetadata(targetVerses),
        stabilizedWords,
        analysisResult: result,
        replays: DEFAULT_REPLAY_VALIDATION_COUNT,
        timestamp: result.timestamp,
        metadata: {
          sessionId: options.sessionId || '',
          audioHash: options.audioHash || '',
          provider: options.provider || '',
          kind,
          timestamp: result.timestamp,
          analysisVersion: RECITATION_ANALYSIS_VERSION
        }
      })
    },
    async rerunRecordingValidationAudit(recording = null) {
      if (!this.canRerunRecordingValidationAudit(recording)) {
        this.showBanner(this.t('toasts.thisRecordingDoesNotHaveEnough'), 'info', 2200)
        return null
      }
      const recordingId = String(recording.id || '')
      this.recordingValidationAuditState = {
        ...this.recordingValidationAuditState,
        [recordingId]: true
      }
      try {
        const cached = await this.readRecitationSessionCache(recording.sessionId, recording.audioHash)
        if (!cached?.analysisResult || !Array.isArray(cached?.rawTranscriptStream) || !cached.rawTranscriptStream.length) {
          throw new Error('No stored raw transcript stream is available for this recording.')
        }
        const report = buildRecognitionValidationReport({
          rawEvents: cached.rawTranscriptStream,
          targetText: cached.targetText || recording.targetText || '',
          targetAyahs: cached.targetAyahs || cached.metadata?.targetAyahs || [],
          stabilizedWords: cached.stabilizedWords || [],
          analysisResult: cached.analysisResult,
          replays: DEFAULT_REPLAY_VALIDATION_COUNT,
          timestamp: cached.analysisResult?.timestamp,
          metadata: {
            sessionId: recording.sessionId,
            audioHash: recording.audioHash,
            provider: cached.provider || recording.source || '',
            kind: cached.metadata?.kind || recording.type || '',
            timestamp: cached.analysisResult?.timestamp,
            analysisVersion: RECITATION_ANALYSIS_VERSION
          }
        })
        const updatedResult = {
          ...cached.analysisResult,
          validationReport: report
        }
        await this.writeRecitationSessionCache({
          ...cached,
          analysisVersion: RECITATION_ANALYSIS_VERSION,
          analysisResult: updatedResult,
          validationReport: report
        })
        const updatedRecordings = this.recordingsLibrary.map(item => item?.id === recording.id
          ? {
            ...item,
            validationReport: report,
            analysisVersion: RECITATION_ANALYSIS_VERSION
          }
          : item)
        this.recordingsLibrary = updatedRecordings
        this.persistRecordingsLibrary()
        if (this.recitationCheckResult?.id === recording.id) {
          this.recitationCheckResult = {
            ...this.recitationCheckResult,
            validationReport: report
          }
        }
        if (this.aiMemorisationCheckerResult?.id === recording.id) {
          this.aiMemorisationCheckerResult = {
            ...this.aiMemorisationCheckerResult,
            validationReport: report
          }
        }
        this.showBanner(report.passed ? 'Deterministic replay audit passed.' : 'Deterministic replay audit found a mismatch.', report.passed ? 'success' : 'error', 2600)
        return report
      } catch (error) {
        console.error('Failed to rerun deterministic validation audit:', error)
        this.showBanner(error?.message || 'Unable to re-run the deterministic audit for this recording.', 'error', 2600)
        return null
      } finally {
        const nextState = { ...this.recordingValidationAuditState }
        delete nextState[recordingId]
        this.recordingValidationAuditState = nextState
      }
    },
    async hashAudioBlob(blob) {
      if (!blob?.size) return ''
      try {
        const buffer = await blob.arrayBuffer()
        if (crypto?.subtle?.digest) {
          const digest = await crypto.subtle.digest('SHA-256', buffer)
          return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
        }
        let hash = 0
        const bytes = new Uint8Array(buffer)
        for (const byte of bytes) hash = ((hash << 5) - hash + byte) | 0
        return `fallback-${blob.size}-${Math.abs(hash)}`
      } catch {
        return `fallback-${blob.size}-${Date.now()}`
      }
    },
    getRecognitionPipelineState(kind = 'recitation') {
      return kind === 'memorisation'
        ? (this.aiMemorisationCheckerRecognitionState || createRecognitionState())
        : (this.recitationRecognitionState || createRecognitionState())
    },
    setRecognitionPipelineState(kind = 'recitation', state = createRecognitionState()) {
      const rawEvents = Array.isArray(state.rawEvents) ? state.rawEvents.slice(-120) : []
      if (kind === 'memorisation') {
        this.aiMemorisationCheckerRecognitionState = { ...state, rawEvents }
        this.aiMemorisationCheckerRawTranscriptStream = rawEvents
        this.aiMemorisationCheckerWordBuffer = state.committedWords || []
        this.aiMemorisationCheckerStableWords = state.committedWords || []
        this.aiMemorisationCheckerSpeechTranscript = wordsToTranscript(state.committedWords || [])
        this.aiMemorisationCheckerSpeechInterim = wordsToTranscript(state.interimWords || [])
        return
      }
      this.recitationRecognitionState = { ...state, rawEvents }
      this.recitationRawTranscriptStream = rawEvents
      this.recitationWordBuffer = state.committedWords || []
      this.recitationSpeechStableWords = state.committedWords || []
      this.recitationSpeechTranscript = wordsToTranscript(state.committedWords || [])
      this.recitationSpeechInterim = wordsToTranscript(state.interimWords || [])
    },
    resetRecognitionPipelineState(kind = 'recitation') {
      this.cancelLiveWordsUpdate(kind)
      this.setRecognitionPipelineState(kind, createRecognitionState())
      if (kind === 'memorisation') {
        this.aiMemorisationCheckerAlignmentState = null
        this.aiMemorisationCheckerCommittedAlignmentSignature = ''
        this.aiMemorisationCheckerCommittedAlignmentCache = null
      } else {
        this.recitationAlignmentState = null
        this.recitationCommittedAlignmentSignature = ''
        this.recitationCommittedAlignmentCache = null
      }
    },
    applyRecognitionEvent(kind = 'recitation', event = {}) {
      const nextState = stabilizeRecognitionEvent(this.getRecognitionPipelineState(kind), event, {
        confidenceThreshold: Number.isFinite(Number(event?.confidenceThreshold))
          ? Number(event.confidenceThreshold)
          : RECITATION_CONFIDENCE_THRESHOLD
      })
      this.setRecognitionPipelineState(kind, nextState)
      this.scheduleLiveWordsUpdate(kind)
      return nextState
    },
    scheduleLiveWordsUpdate(kind = 'recitation') {
      const timerKey = kind === 'memorisation' ? 'aiMemorisationCheckerLiveUpdateTimer' : 'recitationLiveUpdateTimer'
      if (this[timerKey]) return
      const schedule = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : callback => window.setTimeout(callback, 16)
      const run = () => {
        this[timerKey] = null
        this.updateLiveWordsFromCommittedRecognition(kind)
      }
      this[timerKey] = schedule(run)
    },
    cancelLiveWordsUpdate(kind = 'recitation') {
      const timerKey = kind === 'memorisation' ? 'aiMemorisationCheckerLiveUpdateTimer' : 'recitationLiveUpdateTimer'
      if (!this[timerKey]) {
        this[timerKey] = null
        return
      }
      if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(this[timerKey])
      } else if (typeof window !== 'undefined') {
        window.clearTimeout(this[timerKey])
      }
      this[timerKey] = null
    },
    getCommittedRecognitionWords(kind = 'recitation') {
      const state = this.getRecognitionPipelineState(kind)
      return Array.isArray(state.committedWords) ? state.committedWords : []
    },
    transcriptFromStableWords(words = []) {
      return wordsToTranscript(words)
    },
    extractSpeechRecognitionEntries(event) {
      const entries = []
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const alternatives = Array.from(result || []).slice(0, 1)
        alternatives.forEach(item => {
          const words = this.tokenizeRecitationWords(item?.transcript || '')
          words.forEach(word => entries.push({
            word,
            confidence: Number.isFinite(Number(item?.confidence)) ? Number(item.confidence) : (result?.isFinal ? 1 : 0.72),
            final: !!result?.isFinal,
            provider: 'web-speech'
          }))
        })
      }
      return entries
    },
    getTranscriptionProvider(kind = 'recitation') {
      return kind === 'memorisation' ? this.aiMemorisationCheckerTranscriptionProvider : this.recitationTranscriptionProvider
    },
    setTranscriptionProvider(kind = 'recitation', provider = null) {
      if (kind === 'memorisation') this.aiMemorisationCheckerTranscriptionProvider = provider
      else this.recitationTranscriptionProvider = provider
    },
    getTranscriptionAudioBridge(kind = 'recitation') {
      return kind === 'memorisation' ? this.aiMemorisationCheckerTranscriptionAudioBridge : this.recitationTranscriptionAudioBridge
    },
    setTranscriptionAudioBridge(kind = 'recitation', bridge = null) {
      if (kind === 'memorisation') this.aiMemorisationCheckerTranscriptionAudioBridge = bridge
      else this.recitationTranscriptionAudioBridge = bridge
    },
    startTranscriptionAudioBridge(kind = 'recitation', stream = null) {
      this.stopTranscriptionAudioBridge(kind)
      const bridge = createTranscriptionAudioBridge(stream)
      if (!bridge) return false
      this.setTranscriptionAudioBridge(kind, bridge)
      return true
    },
    flushTranscriptionAudioBridge(kind = 'recitation') {
      const bridge = this.getTranscriptionAudioBridge(kind)
      return bridge?.flush?.() || null
    },
    stopTranscriptionAudioBridge(kind = 'recitation') {
      const bridge = this.getTranscriptionAudioBridge(kind)
      if (!bridge) return null
      const remaining = bridge.stop?.() || null
      this.setTranscriptionAudioBridge(kind, null)
      return remaining
    },
    getTranscriptionMeta(kind = 'recitation') {
      return kind === 'memorisation'
        ? (this.aiMemorisationCheckerTranscriptionMeta || createRealtimeTranscriptionMeta())
        : (this.recitationTranscriptionMeta || createRealtimeTranscriptionMeta())
    },
    setTranscriptionMeta(kind = 'recitation', meta = createRealtimeTranscriptionMeta()) {
      if (kind === 'memorisation') this.aiMemorisationCheckerTranscriptionMeta = meta
      else this.recitationTranscriptionMeta = meta
    },
    resetTranscriptionMeta(kind = 'recitation') {
      this.setTranscriptionMeta(kind, createRealtimeTranscriptionMeta())
    },
    markTranscriptionMessage(kind = 'recitation', { isFinal = false, endOfTranscript = false } = {}) {
      const previous = this.getTranscriptionMeta(kind)
      const now = Date.now()
      this.setTranscriptionMeta(kind, {
        ...previous,
        lastMessageAt: now,
        lastFinalAt: isFinal ? now : Number(previous.lastFinalAt || 0),
        endOfTranscriptAt: endOfTranscript ? now : Number(previous.endOfTranscriptAt || 0),
        messageCount: Number(previous.messageCount || 0) + 1
      })
    },
    async waitForTranscriptionSettlement(kind = 'recitation', options = {}) {
      const timeoutMs = Number(options.timeoutMs || RECITATION_TRANSCRIPTION_SETTLE_TIMEOUT_MS)
      const quietMs = Number(options.quietMs || RECITATION_TRANSCRIPTION_SETTLE_QUIET_MS)
      const startedAt = Date.now()
      return await new Promise(resolve => {
        const check = () => {
          const meta = this.getTranscriptionMeta(kind)
          const now = Date.now()
          const silenceDuration = Number(meta.lastMessageAt || 0) ? now - Number(meta.lastMessageAt || 0) : now - startedAt
          const sawEndOfTranscript = Number(meta.endOfTranscriptAt || 0) >= startedAt
          if (!this.getTranscriptionProvider(kind) || sawEndOfTranscript || silenceDuration >= quietMs || now - startedAt >= timeoutMs) {
            resolve(meta)
            return
          }
          window.setTimeout(check, 120)
        }
        check()
      })
    },
    setTranscriptionClosing(kind = 'recitation', closing = false) {
      if (kind === 'memorisation') this.aiMemorisationCheckerTranscriptionClosing = closing
      else this.recitationTranscriptionClosing = closing
    },
    isTranscriptionClosing(kind = 'recitation') {
      return kind === 'memorisation' ? this.aiMemorisationCheckerTranscriptionClosing : this.recitationTranscriptionClosing
    },
    describeTranscriptionTokenFailure(error) {
      const source = error?.response ? error : (error?.cause?.response ? error.cause : error)
      const status = Number(source?.response?.status || 0)
      const data = source?.response?.data || {}
      const message = String(data?.message || error?.message || source?.message || '').trim()
      const providerMessage = String(data?.speechmatics_message || '').trim()
      const keySuffix = String(data?.configured_key_suffix || '').trim()
      const lowered = `${message} ${providerMessage}`.toLowerCase()

      if (status === 422 && lowered.includes('api key is not configured')) {
        return 'Speechmatics is not configured on the server. Add SPEECHMATICS_API_KEY, then run php artisan config:clear and restart the app.'
      }

      if (status === 422 && lowered.includes('region is not configured')) {
        return 'Speechmatics region is not configured on the server. Add SPEECHMATICS_REGION, then run php artisan config:clear and restart the app.'
      }

      if ([401, 403].includes(status) || lowered.includes('not author')) {
        const suffixNote = keySuffix ? ` Laravel is currently using the key ending in ${keySuffix}.` : ''
        return `Speechmatics rejected the server key for live token creation.${suffixNote} Use a key that can create realtime temporary keys, then run php artisan config:clear and restart the app.`
      }

      if (message) return message
      return 'Unable to start live streaming right now.'
    },
    async fetchTranscriptionAccessToken() {
      try {
        const response = await axios.post('/memorisation/transcription-token')
        return {
          accessToken: String(response?.data?.access_token || '').trim(),
          websocketHost: String(response?.data?.websocket_host || '').trim()
        }
      } catch (error) {
        const wrapped = new Error(this.describeTranscriptionTokenFailure(error))
        wrapped.cause = error
        throw wrapped
      }
    },
    async startTranscriptionRecognition(kind = 'recitation') {
      this.stopTranscriptionRecognition(kind)
      if (typeof WebSocket === 'undefined') return false

      const bridge = this.getTranscriptionAudioBridge(kind)
      if (!bridge?.sampleRate) return false

      try {
        const provider = createSpeechmaticsRealtimeProvider({
          getAccessToken: () => this.fetchTranscriptionAccessToken(),
          getSampleRate: () => Number(bridge.sampleRate || 0),
          handshakeTimeoutMs: 3500
        })
          .onTranscript(payload => this.handleTranscriptionProviderMessage(kind, payload))
          .onError(error => {
            console.warn('Speechmatics streaming error:', error)
          })
          .onDisconnect(() => {
            this.setTranscriptionProvider(kind, null)
            if (!this.isTranscriptionClosing(kind)) this.startSpeechRecognitionFallbackForKind(kind)
            this.setTranscriptionClosing(kind, false)
          })

        this.setTranscriptionClosing(kind, false)
        this.resetTranscriptionMeta(kind)
        this.setTranscriptionProvider(kind, provider)
        const ready = await provider.connect()
        if (!ready) this.stopTranscriptionRecognition(kind)
        return !!ready
      } catch (error) {
        const message = this.describeTranscriptionTokenFailure(error)
        console.warn('Unable to start Speechmatics streaming:', message, error)
        this.showBanner(message, 'error', 5600)
        this.stopTranscriptionRecognition(kind)
        return false
      }
    },
    startSpeechRecognitionFallbackForKind(kind = 'recitation') {
      if (kind === 'memorisation') {
        if (this.aiMemorisationCheckerRecording && !this.aiMemorisationCheckerSpeechRecognition) {
          this.startAiMemorisationCheckerSpeechRecognition()
        }
        return
      }
      if (this.recitationCheckRecording && !this.recitationSpeechRecognition) {
        this.startRecitationSpeechRecognition()
      }
    },
    streamTranscriptionAudioChunk(kind = 'recitation', blob = null) {
      if (blob && !blob.size) return
      const provider = this.getTranscriptionProvider(kind)
      if (!provider?.isOpen?.()) return
      const pendingAudio = this.flushTranscriptionAudioBridge(kind)
      if (!pendingAudio?.byteLength) return
      provider.streamAudioChunk(pendingAudio)
    },
    async finalizeTranscriptionRecognition(kind = 'recitation') {
      const provider = this.getTranscriptionProvider(kind)
      if (!provider) {
        this.stopTranscriptionAudioBridge(kind)
        return wordsToTranscript(this.getCommittedRecognitionWords(kind))
      }

      this.setTranscriptionClosing(kind, true)
      const trailingAudio = this.stopTranscriptionAudioBridge(kind)
      if (trailingAudio?.byteLength) provider.streamAudioChunk(trailingAudio)
      provider.endStream()
      await this.waitForTranscriptionSettlement(kind)
      this.stopTranscriptionRecognition(kind)
      return wordsToTranscript(this.getCommittedRecognitionWords(kind))
    },
    stopTranscriptionRecognition(kind = 'recitation') {
      const provider = this.getTranscriptionProvider(kind)
      this.setTranscriptionClosing(kind, true)
      if (provider) {
        try { provider.disconnect() } catch { }
      }
      this.setTranscriptionProvider(kind, null)
    },
    handleTranscriptionProviderMessage(kind = 'recitation', payload = {}) {
      if (payload?.type === 'end-of-transcript') {
        this.markTranscriptionMessage(kind, { endOfTranscript: true })
        return
      }

      const rawWords = Array.isArray(payload?.words) && payload.words.length
        ? payload.words
        : this.tokenizeRecitationWords(payload?.transcript || '').map(word => ({
          word,
          confidence: payload?.isFinal ? 1 : SPEECHMATICS_PARTIAL_CONFIDENCE
        }))
      const entries = rawWords.map(item => ({
        word: item.word || '',
        confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : (payload?.isFinal ? 1 : SPEECHMATICS_PARTIAL_CONFIDENCE),
        start: item.start,
        end: item.end,
        provider: 'speechmatics'
      })).filter(item => item.word)
      const isFinal = !!payload?.isFinal
      this.markTranscriptionMessage(kind, { isFinal })
      this.applyRecognizedEntries(kind, entries, isFinal, {
        provider: 'speechmatics',
        speechFinal: !!payload?.speechFinal,
        transcript: payload?.transcript || '',
        confidence: payload?.confidence,
        start: payload?.start,
        duration: payload?.duration,
        segmentId: payload?.segmentId || '',
        raw: payload?.raw || null
      })
    },
    applyRecognizedEntries(kind = 'recitation', entries = [], isFinal = false, metadata = {}) {
      this.applyRecognitionEvent(kind, {
        provider: metadata.provider || entries.find(entry => entry?.provider)?.provider || 'web-speech',
        isFinal,
        speechFinal: !!metadata.speechFinal,
        words: entries,
        transcript: metadata.transcript || wordsToTranscript(entries),
        confidence: metadata.confidence,
        start: metadata.start,
        duration: metadata.duration,
        segmentId: metadata.segmentId,
        confidenceThreshold: isFinal ? RECITATION_CONFIDENCE_THRESHOLD : RECITATION_LIVE_INTERIM_CONFIDENCE_THRESHOLD,
        receivedAt: metadata.receivedAt || null,
        raw: metadata.raw || null
      })
    },
    getDominantRecognitionProvider(words = []) {
      const counts = (Array.isArray(words) ? words : []).reduce((carry, word) => {
        const provider = word?.provider || 'web-speech'
        carry[provider] = Number(carry[provider] || 0) + 1
        return carry
      }, {})
      return Number(counts.speechmatics || 0) >= Number(counts['web-speech'] || 0) && Number(counts.speechmatics || 0) > 0
        ? 'speechmatics'
        : 'web-speech'
    },
    startRecitationVad(stream) {
      this.stopRecitationVad()
      const AudioContextCtor = typeof window !== 'undefined'
        ? (window.AudioContext || window.webkitAudioContext)
        : null
      if (!stream || !AudioContextCtor) return
      try {
        const audioContext = new AudioContextCtor()
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 1024
        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)
        const samples = new Uint8Array(analyser.fftSize)
        const vad = {
          audioContext,
          analyser,
          source,
          frame: null,
          silenceStartedAt: 0,
          lastSpeechAt: 0,
          active: true,
          throttled: false
        }
        const tick = () => {
          if (!vad.active) return
          analyser.getByteTimeDomainData(samples)
          let sum = 0
          for (const value of samples) {
            const centered = value - 128
            sum += centered * centered
          }
          const rms = Math.sqrt(sum / samples.length) / 128
          const speaking = rms > 0.035
          const now = Date.now()
          if (speaking) {
            vad.lastSpeechAt = now
            vad.silenceStartedAt = 0
            vad.throttled = false
          } else {
            if (!vad.silenceStartedAt) vad.silenceStartedAt = now
            if (!vad.throttled && vad.lastSpeechAt && now - vad.silenceStartedAt >= RECITATION_SILENCE_THROTTLE_MS) {
              vad.throttled = true
              this.handleAiRecitationSilenceAutoStop()
            }
          }
          vad.frame = window.requestAnimationFrame(tick)
        }
        this.recitationVadState = vad
        vad.frame = window.requestAnimationFrame(tick)
      } catch (error) {
        console.warn('Failed to start recitation VAD:', error)
      }
    },
    stopRecitationVad() {
      const vad = this.recitationVadState || {}
      vad.active = false
      if (vad.frame) {
        try { window.cancelAnimationFrame(vad.frame) } catch { }
      }
      try { vad.source?.disconnect?.() } catch { }
      try { vad.audioContext?.close?.() } catch { }
      this.recitationVadState = {
        audioContext: null,
        analyser: null,
        source: null,
        frame: null,
        silenceStartedAt: 0,
        lastSpeechAt: 0,
        active: false,
        throttled: false
      }
    },
    async blobToDataUrl(blob) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error || new Error('FileReader failed'))
        reader.readAsDataURL(blob)
      })
    },
    cleanupRecitationCheckMedia() {
      this.stopRecitationSpeechRecognition()
      this.stopTranscriptionRecognition('recitation')
      this.resetTranscriptionMeta('recitation')
      this.stopTranscriptionAudioBridge('recitation')
      this.stopRecitationVad()
      if (this.recitationCheckMediaStream) {
        try {
          this.recitationCheckMediaStream.getTracks().forEach(track => track.stop())
        } catch (error) {
          console.warn('Failed to stop recitation check media tracks:', error)
        }
      }
      this.recitationCheckMediaStream = null
      this.recitationCheckMediaRecorder = null
      this.recitationCheckChunks = []
      this.recitationCheckStartedAt = 0
      this.recitationCheckAutoStopArmed = false
      this.recitationInputSessionId = ''
      this.recitationInputAudioHash = ''
    },
    getSpeechRecognitionConstructor() {
      if (typeof window === 'undefined') return null
      return window.SpeechRecognition || window.webkitSpeechRecognition || null
    },
    startRecitationSpeechRecognition() {
      const SpeechRecognition = this.getSpeechRecognitionConstructor()
      this.recitationSpeechRecognition = null
      if (!SpeechRecognition) return false

      try {
        const recognition = new SpeechRecognition()
        recognition.lang = 'ar-SA'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.maxAlternatives = 3
        recognition.onresult = event => {
          const entries = this.extractSpeechRecognitionEntries(event)
          const finalEntries = entries.filter(entry => entry.final)
          const interimEntries = entries.filter(entry => !entry.final)
          if (finalEntries.length) this.applyRecognizedEntries('recitation', finalEntries, true, { provider: 'web-speech' })
          if (interimEntries.length) this.applyRecognizedEntries('recitation', interimEntries, false, { provider: 'web-speech' })
        }
        recognition.onerror = event => {
          console.warn('Speech recognition error:', event?.error || event)
        }
        recognition.start()
        this.recitationSpeechRecognition = recognition
        return true
      } catch (error) {
        console.warn('Failed to start speech recognition fallback:', error)
        this.recitationSpeechRecognition = null
        return false
      }
    },
    stopRecitationSpeechRecognition() {
      if (!this.recitationSpeechRecognition) return
      try {
        this.recitationSpeechRecognition.onresult = null
        this.recitationSpeechRecognition.onerror = null
        this.recitationSpeechRecognition.stop()
      } catch (error) {
        console.warn('Failed to stop speech recognition fallback:', error)
      }
      this.recitationSpeechRecognition = null
    },
    getRecitationSpeechFallbackTranscript() {
      return `${this.recitationSpeechTranscript || ''} ${this.recitationSpeechInterim || ''}`.replace(/\s+/g, ' ').trim()
    },
    completeRecitationCheckFromRecognitionWords(recognitionWords = [], targetVerses, source = 'stabilised speech input', audioSrc = '', options = {}) {
      if (!recognitionWords.length) return null
      this.cancelLiveWordDomPatchFrame()
      this.clearRecitationDisplayHtmlCache()
      const result = {
        ...this.assessRecitationRecognitionWords(recognitionWords, targetVerses, options),
        transcriptionSource: source,
        audioSrc
      }
      this.recitationCheckResult = result
      this.recitationLiveWords = Array.isArray(result.wordStatuses) ? result.wordStatuses : []
      this.syncSessionEvaluationMaps('recitation', targetVerses, this.recitationLiveWords, true)
      this.persistAiRecitationReviewHighlights(result, targetVerses)
      this.recitationCheckAutoStopArmed = false
      this.recitationCheckError = ''
      this.playUiTone('complete')
      this.showBanner(this.t('toasts.reciteCheckComplete'), 'success', 2200)
      this.scrollToRecitationResults()
      return result
    },
    dismissRecitationCheckResult() {
      this.clearRecitationReviewState()
    },
    resetDisplayedRecitationAyah() {
      const targets = this.recitationCheckPendingTargets?.length
        ? this.recitationCheckPendingTargets
        : this.getRecitationCheckTargetVerses(this.selfCheckModalVerse || null)
      this.recitationCheckResult = null
      this.recitationCheckError = ''
      this.recitationCheckPanelOpen = true
      this.recitationSpeechTranscript = ''
      this.recitationSpeechInterim = ''
      this.recitationSpeechStableWords = []
      this.resetRecognitionPipelineState('recitation')
      this.seedRecitationLiveWords(targets)
      this.syncSessionEvaluationMaps('recitation', targets, this.recitationLiveWords, false)
      this.showBanner(this.t('toasts.displayedAyahReviewReset'), 'info', 1400)
    },
    clearRecitationReviewState() {
      this.recitationCheckResult = null
      this.recitationCheckError = ''
      this.recitationCheckPanelOpen = false
      this.recitationLiveWords = []
      this.recitationCheckAutoStopArmed = false
      this.recitationSpeechTranscript = ''
      this.recitationSpeechInterim = ''
      this.resetRecognitionPipelineState('recitation')
      this.recitationCheckPendingTargets = []
      this.recitationSessionEvaluationMap = {}
      this.recitationSessionHighlightMap = {}
      this.recitationCheckTargetVerseKey = ''
      this.recitationCheckScope = 'ayah'
    },
    savePendingRecitationCheckAttempt() {
      if (!this.recitationCheckResult) return
      const saved = this.saveRecitationCheckAttempt(this.recitationCheckResult, this.recitationCheckPendingTargets)
      if (!saved) {
        this.showBanner(this.t('toasts.reciteCheckCouldNotBeSaved'), 'error', 2600)
        return
      }
      const ayahKey = this.recitationCheckTargetVerseKey || this.selfCheckVerseKey
      if (ayahKey) this.selectedRecordingsAyahKey = ayahKey
      this.playUiTone('save')
      this.showBanner(this.t('toasts.reciteCheckSavedToSavedAttempts'), 'success', 2800, {
        key: 'open-recordings-library',
        label: 'Go to recording library',
        payload: { ayahKey, returnToSelfCheck: true }
      })
      this.selfCheckLastSavedAyahKey = ayahKey || this.selfCheckVerseKey
      this.selfCheckSavedAttemptsVisible = false
    },
    discardRecitationCheckAttempt() {
      this.dismissRecitationCheckResult()
      this.selfCheckSavedAttemptsVisible = false
      this.showBanner(this.t('toasts.reciteCheckDiscarded'), 'info', 1400)
    },
    deleteRecitationCheckAttempt() {
      if (!this.recitationCheckResult) return
      this.openConfirmModal({
        title: 'Delete Recite Check?',
        message: 'This removes the current Recite Check result. Saved recordings are not affected unless this result was already saved.',
        confirmLabel: 'Delete',
        cancelLabel: 'Keep',
        tone: 'danger',
        action: 'delete-pending-recitation-check',
        data: { attemptId: this.recitationCheckResult.id || '' }
      })
    },
    performDeleteRecitationCheckAttempt(attemptId = '') {
      const id = attemptId || this.recitationCheckResult?.id
      if (id) this.deleteAiCheckFromMutqinSessions(id)
      this.dismissRecitationCheckResult()
      this.showBanner(this.t('toasts.reciteCheckDeleted'), 'info', 1400)
    },
    async toggleRecitationCheck() {
      if (this.recitationCheckRecording) {
        this.stopRecitationCheckRecording()
        return
      }
      await this.startRecitationCheckRecording()
    },
    toggleRecitationCheckForVerse(verse) {
      if (this.recitationCheckRecording) {
        this.stopRecitationCheckRecording()
        return
      }
      this.recitationCheckScope = 'ayah'
      this.startRecitationCheckRecording(verse)
    },
    toggleRecitationCheckForCurrentModal() {
      if (this.recitationCheckRecording) {
        this.stopRecitationCheckRecording()
        return
      }
      if (this.recitationCheckScope === 'session') {
        this.startRecitationCheckRecording()
        return
      }
      this.toggleRecitationCheckForVerse(this.selfCheckModalVerse)
    },
    toggleManualSelfCheckRecording(verse) {
      if (this.isSelfCheckRecording) {
        this.stopSelfCheckRecording()
        return
      }
      this.startSelfCheckRecording(verse)
    },
    async startRecitationCheckRecording(targetVerse = null) {
      if (!this.supportsSelfCheckRecording()) {
        this.recitationCheckError = 'Recording is not supported in this browser.'
        return
      }
      this.selfCheckModeChoiceVisible = false
      const targets = this.getRecitationCheckTargetVerses(targetVerse)
      if (!targets.length) {
        this.recitationCheckError = 'Choose an ayah before starting Recite Check.'
        return
      }
      if (this.recitationCheckRecording || this.recitationCheckPreparing) return

      this.recitationCheckError = ''
      this.recitationCheckResult = null
      this.recitationCheckPendingTargets = targets
      this.recitationCheckTargetVerseKey = targets[0]?.key || ''
      this.recitationCheckAutoStopArmed = false
      this.recitationCheckPanelOpen = true
	      this.selfCheckSavedAttemptsVisible = false
	      this.seedRecitationLiveWords(targets)
	      this.resetRecognitionPipelineState('recitation')
      this.recitationCheckPreparing = true
      this.stopRecordingsPlayback({ clearSource: true })
      if (this.audioElement && !this.audioElement.paused) {
        try { this.audioElement.pause() } catch { }
        this.isPlaying = false
      }
      this.scrollToRecitationTarget()

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          }
        })
        const mimeType = this.chooseRecorderMimeType()
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        this.recitationCheckMediaStream = stream
        this.recitationCheckMediaRecorder = recorder
        this.recitationCheckChunks = []
        this.recitationInputSessionId = this.getCurrentRecitationSessionId()
        const bridgeReady = this.startTranscriptionAudioBridge('recitation', stream)
        const transcriptionReady = bridgeReady && await this.startTranscriptionRecognition('recitation')
        if (!transcriptionReady) {
          this.stopTranscriptionAudioBridge('recitation')
          this.startRecitationSpeechRecognition()
        }

        recorder.ondataavailable = event => {
          if (event.data?.size) {
            this.recitationCheckChunks.push(event.data)
            this.streamTranscriptionAudioChunk('recitation', event.data)
          }
        }
        recorder.onerror = () => {
          this.recitationCheckError = 'The microphone stopped unexpectedly.'
          this.recitationCheckPreparing = false
          this.recitationCheckRecording = false
          this.cleanupRecitationCheckMedia()
        }
        recorder.onstop = async () => {
          const chunks = [...this.recitationCheckChunks]
          await this.finalizeTranscriptionRecognition('recitation')
          let audioSrc = ''
          this.stopRecitationSpeechRecognition()
          this.recitationCheckRecording = false
          this.recitationCheckPreparing = true

          try {
            if (!chunks.length) throw new Error('No audio was captured.')
            const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
            audioSrc = await this.blobToDataUrl(blob)
            await this.submitRecitationCheck(blob, targets, audioSrc)
          } catch (error) {
            console.error('Failed to process recitation check:', error)
            const serverMessage = error?.response?.data?.message
            const providerUnavailable = error?.response?.status === 422 && /transcription|api key is not configured/i.test(String(serverMessage || ''))
            this.recitationCheckError = providerUnavailable
              ? 'Browser speech recognition did not return a transcript. Try again and allow speech recognition if prompted.'
              : (serverMessage || error?.message || 'The recitation check could not be completed.')
            if (serverMessage && !providerUnavailable) this.showBanner(serverMessage, 'error', 3600)
          } finally {
            this.recitationCheckPreparing = false
            this.cleanupRecitationCheckMedia()
          }
        }

        recorder.start(RECITATION_CHUNK_TIMESLICE_MS)
        this.startRecitationVad(stream)
        this.recitationCheckStartedAt = Date.now()
        this.recitationCheckRecording = true
        this.recitationCheckPreparing = false
      } catch (error) {
        console.error('Failed to start recitation check:', error)
        this.recitationCheckPreparing = false
        this.recitationCheckRecording = false
        this.recitationCheckError = 'Microphone access was blocked. Allow microphone permission, then try again.'
        this.recitationCheckAutoStopArmed = false
        this.cleanupRecitationCheckMedia()
      }
    },
    stopRecitationCheckRecording() {
      if (!this.recitationCheckMediaRecorder || !['recording', 'paused'].includes(this.recitationCheckMediaRecorder.state)) return
      this.recitationCheckAutoStopArmed = false
      this.recitationCheckPreparing = true
      this.recitationCheckMediaRecorder.stop()
    },
    scrollToRecitationTarget() {
      this.$nextTick(() => {
        const key = this.recitationCheckTargetVerseKey
        const el = key ? document.querySelector(`.verse-card[data-verse-key="${key}"], .mushaf-ayah[data-verse-key="${key}"]`) : this.$refs.workspaceMain
        if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    scrollToRecitationResults() {
      this.$nextTick(() => {
        const el = document.querySelector('.recitation-check-results') || document.querySelector('.recitation-check-panel')
        if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    },
    async submitRecitationCheck(blob, targetVerses = this.getRecitationCheckTargetVerses(), audioSrc = '') {
      const sessionId = this.recitationInputSessionId || this.getCurrentRecitationSessionId()
      const audioHash = await this.hashAudioBlob(blob)
      this.recitationInputAudioHash = audioHash
      const cached = await this.readRecitationSessionCache(sessionId, audioHash)
      if (cached?.analysisResult) {
        const cachedResult = {
          ...cached.analysisResult,
          audioSrc: audioSrc || cached.audioSrc || '',
          transcriptionSource: 'indexeddb cache'
        }
        this.recitationCheckResult = cachedResult
        this.recitationLiveWords = Array.isArray(cachedResult.wordStatuses) ? cachedResult.wordStatuses : []
        this.syncSessionEvaluationMaps('recitation', targetVerses, this.recitationLiveWords, true)
        this.persistAiRecitationReviewHighlights(cachedResult, targetVerses)
        this.recitationCheckAutoStopArmed = false
        this.playUiTone('complete')
        this.showBanner(this.t('toasts.loadedCachedReciteCheck'), 'success', 2200)
        this.scrollToRecitationResults()
        return
      }
      const committedWords = this.getCommittedRecognitionWords('recitation')
      const transcript = wordsToTranscript(committedWords)
      if (!committedWords.length) {
        throw new Error('No clear Arabic words were detected. Record again closer to the microphone.')
      }
      const result = this.assessRecitationRecognitionWords(committedWords, targetVerses, {
        sessionId,
        audioHash,
        id: `recitation-${audioHash.slice(0, 16)}`
      })
      result.audioSrc = audioSrc
      const provider = this.getDominantRecognitionProvider(committedWords)
      result.transcriptionSource = provider === 'speechmatics' ? 'speechmatics streaming' : 'browser speech recognition'
      result.validationReport = this.buildRecognitionValidationForResult('recitation', targetVerses, result, {
        sessionId,
        audioHash,
        provider
      })
      result.analysisVersion = RECITATION_ANALYSIS_VERSION
      result.sessionId = sessionId
      result.audioHash = audioHash
      this.recitationCheckResult = result
      this.recitationLiveWords = Array.isArray(result.wordStatuses) ? result.wordStatuses : []
      this.syncSessionEvaluationMaps('recitation', targetVerses, this.recitationLiveWords, true)
      this.persistAiRecitationReviewHighlights(result, targetVerses)
      this.recitationCheckAutoStopArmed = false
      this.playUiTone('complete')
      this.showBanner(this.t('toasts.reciteCheckComplete'), 'success', 2200)
      this.scrollToRecitationResults()
      const cachePayload = {
        analysisVersion: RECITATION_ANALYSIS_VERSION,
        sessionId,
        audioHash,
        audioBlob: blob,
        audioSrc,
        rawTranscriptStream: this.recitationRawTranscriptStream,
        stabilizedWords: committedWords,
        wordBuffer: this.recitationWordBuffer,
        recognizedWords: committedWords,
        transcript,
        confidenceValues: committedWords.map(word => word.confidence),
        alignmentState: result.alignmentState || result.wordStatuses || [],
        analysisResult: result,
        validationReport: result.validationReport,
        targetText: this.getRecitationTargetText(targetVerses),
        targetAyahs: this.buildRecitationTargetAyahMetadata(targetVerses),
        metadata: {
          kind: 'recitation',
          provider,
          sessionId,
          audioHash,
          analysisVersion: RECITATION_ANALYSIS_VERSION,
          targetVerses: this.buildRecitationAyahRangePayload(targetVerses),
          targetAyahs: this.buildRecitationTargetAyahMetadata(targetVerses)
        },
        provider
      }
      await this.writeRecitationSessionCache(cachePayload)
      await this.writeRecitationSessionHistory({
        ...cachePayload,
        id: `recitation-${sessionId}-${audioHash}`,
        kind: 'recitation'
      })
    },
    getRecitationCheckTargetVerses(targetVerse = null) {
      if (targetVerse?.key) return [targetVerse]
      if (this.recitationCheckScope === 'session' && this.recitationCheckPendingTargets?.length) return this.recitationCheckPendingTargets
      if (this.recitationCheckScope === 'session') return this.getSessionCheckTargetVerses()
      if (this.showSelfCheckModal && this.selfCheckModalVerse?.key) return [this.selfCheckModalVerse]
      if (this.activeVerseRef?.key) return [this.activeVerseRef]
      return this.getSessionCheckTargetVerses()
    },
    getActiveSessionQueueForCheck() {
      if (Array.isArray(this.queue) && this.queue.length) return this.queue
      const centralQueue = this.mutqinState?.sessionState?.queue
      if (Array.isArray(centralQueue) && centralQueue.length) return centralQueue
      return []
    },
    buildSelectedSessionRangeCheckTargets() {
      const chapterId = Number(this.chapterId || this.currentChapter?.id || 0)
      const rangeStart = Number(this.rangeStart || 0)
      const rangeEnd = Number(this.rangeEnd || rangeStart || 0)
      const source = (this.mushafDisplayVerses?.length ? this.mushafDisplayVerses : this.verses || [])
        .filter(verse => {
          const verseNumber = Number(verse?.number || 0)
          if (!verse?.key || !verseNumber) return false
          if (chapterId && Number(verse?.chapterId || chapterId) !== chapterId) return false
          if (rangeStart && verseNumber < rangeStart) return false
          if (rangeEnd && verseNumber > rangeEnd) return false
          return true
        })
        .sort((left, right) => Number(left?.number || 0) - Number(right?.number || 0))

      return source.map((verse, index) => {
        const canonical = this.getCanonicalVerseForCheck(verse) || verse
        return {
          ...this.buildSelfCheckVerseRef(canonical || verse),
          ...canonical,
          key: canonical?.key || verse?.key || '',
          sessionQueueIndex: index,
          sessionTargetKey: `${canonical?.key || verse?.key || `session-target-${index}`}::${index}`
        }
      }).filter(verse => verse?.key)
    },
    dedupeSessionCheckTargets(targets = []) {
      const seen = new Set()
      const deduped = []
      targets.forEach((target, index) => {
        const canonical = this.getCanonicalVerseForCheck(target) || target
        const key = canonical?.key || target?.key || ''
        if (!key || seen.has(key)) return
        seen.add(key)
        deduped.push({
          ...this.buildSelfCheckVerseRef(canonical || target),
          ...canonical,
          key,
          sessionQueueIndex: deduped.length,
          sessionTargetKey: `${key}::${deduped.length}`
        })
      })
      return deduped
    },
    resolveSessionQueueTarget(queueItem = null, sessionIndex = 0) {
      const sourceVerse = queueItem?.verse || queueItem || null
      const ayahKey = sourceVerse?.key || queueItem?.ayahId || queueItem?.key || ''
      if (!ayahKey) return null
      const canonical = this.getCanonicalVerseForCheck(sourceVerse?.key ? sourceVerse : { key: ayahKey }) || sourceVerse
      if (!canonical?.key && !ayahKey) return null
      const verse = {
        ...this.buildSelfCheckVerseRef(canonical || { key: ayahKey }),
        ...canonical,
        key: canonical?.key || ayahKey,
        sessionQueueIndex: sessionIndex,
        sessionTargetKey: `${ayahKey}::${sessionIndex}`,
        sessionPhase: queueItem?.phase || '',
        sessionChainKey: queueItem?.chainKey || '',
        sessionSequencePosition: Number(queueItem?.sequencePosition || 1),
        sessionSequenceTotal: Number(queueItem?.sequenceTotal || 1),
        sessionRepeatCount: Number(queueItem?.repeatCount || 1)
      }
      return verse.key ? verse : null
    },
    getSessionCheckTargetVerses() {
      const selectedRangeTargets = this.buildSelectedSessionRangeCheckTargets()
      if (selectedRangeTargets.length) return selectedRangeTargets
      const sourceQueue = this.getActiveSessionQueueForCheck()
      const targets = []
      for (let index = 0; index < sourceQueue.length; index += 1) {
        const target = this.resolveSessionQueueTarget(sourceQueue[index], index)
        if (target) targets.push(target)
      }
      return this.dedupeSessionCheckTargets(targets)
    },
    getCanonicalVerseForCheck(verse) {
      if (!verse?.key) return verse || null
      return (this.mushafDisplayVerses || []).find(candidate => candidate?.key === verse.key)
        || (this.verses || []).find(candidate => candidate?.key === verse.key)
        || verse
    },
    getPlainVerseArabicForCheck(verse) {
      const source = this.getCanonicalVerseForCheck(verse)
      return this.cleanRecitationDisplayText(source?.arabic || source?.arabic_tajweed || '')
    },
    getRecitationTargetText(targetVerses = this.getRecitationCheckTargetVerses()) {
      const parts = []
      const targets = Array.isArray(targetVerses) ? targetVerses : []
      for (const verse of targets) {
        const text = this.getPlainVerseArabicForCheck(verse)
        if (text) parts.push(text)
      }
      return parts.join(' ')
    },
    buildRecitationTargetAyahMetadata(targetVerses = this.getRecitationCheckTargetVerses()) {
      const metadata = []
      const targets = Array.isArray(targetVerses) ? targetVerses : []
      for (let index = 0; index < targets.length; index += 1) {
        const verse = targets[index]
        const text = this.getPlainVerseArabicForCheck(verse)
        if (!text) continue
        metadata.push({
          key: verse?.sessionTargetKey || verse?.key || '',
          ayahKey: verse?.key || '',
          number: Number.isFinite(Number(verse?.number)) ? Number(verse.number) : index + 1,
          sessionTargetKey: verse?.sessionTargetKey || '',
          sessionQueueIndex: Number.isFinite(Number(verse?.sessionQueueIndex)) ? Number(verse.sessionQueueIndex) : index,
          text
        })
      }
      return metadata
    },
    normalizeArabicForRecitation(text) {
      return normalizeArabicForRecitationEngine(text)
    },
    cleanRecitationDisplayText(text) {
      return cleanRecitationDisplayTextEngine(text)
    },
    tokenizeRecitationDisplayWords(text) {
      return tokenizeRecitationDisplayWordsEngine(text)
    },
    tokenizeRecitationWords(text) {
      return tokenizeRecitationWordsEngine(text)
    },
    getSequentialTranscriptCoverage(candidateWords = [], targetWords = [], threshold = 0.86) {
      if (!candidateWords.length || !targetWords.length) return 0
      let candidateIndex = 0
      let matched = 0
      for (const targetWord of targetWords) {
        while (candidateIndex < candidateWords.length) {
          const candidateWord = candidateWords[candidateIndex]
          candidateIndex += 1
          if (targetWord === candidateWord || this.getRecitationWordSimilarity(targetWord, candidateWord) >= threshold) {
            matched += 1
            break
          }
        }
        if (candidateIndex >= candidateWords.length) break
      }
      return matched / Math.max(1, targetWords.length)
    },
    mergeRecitationTranscripts(primary = '', fallback = '', targetVerses = []) {
      const first = String(primary || '').trim()
      const second = String(fallback || '').trim()
      if (!first) return second
      if (!second) return first
      const firstWords = this.tokenizeRecitationWords(first)
      const secondWords = this.tokenizeRecitationWords(second)
      const targetWords = this.tokenizeRecitationWords(this.getRecitationTargetText(targetVerses || []))
      if (targetWords.length >= 6) {
        const firstCoverage = this.getSequentialTranscriptCoverage(firstWords, targetWords)
        const secondCoverage = this.getSequentialTranscriptCoverage(secondWords, targetWords)
        const firstLooksCompleted = firstCoverage >= 0.92 && firstWords.length >= targetWords.length * 0.86
        const secondLooksPartial = secondWords.length >= 2
          && secondWords.length < firstWords.length * 0.72
          && secondCoverage < firstCoverage - 0.12
        if (firstLooksCompleted && secondLooksPartial) return first
      }
      if (secondWords.length > firstWords.length + 2) return second
      if (firstWords.length <= 2 && secondWords.length > firstWords.length) return second
      return first
    },
    buildRecitationWordDiffParts(targetWords, transcriptWords) {
      const vocabulary = new Map()
      const reverseVocabulary = new Map()
      const encodeWord = word => {
        if (!vocabulary.has(word)) {
          const token = String.fromCodePoint(0xE000 + vocabulary.size)
          vocabulary.set(word, token)
          reverseVocabulary.set(token, word)
        }
        return vocabulary.get(word)
      }
      return diff(targetWords.map(encodeWord).join(''), transcriptWords.map(encodeWord).join(''))
        .map(([operation, text]) => ({
          operation,
          words: Array.from(text).map(token => reverseVocabulary.get(token)).filter(Boolean)
        }))
        .filter(chunk => chunk.words.length)
    },
    buildWordFeedbackFromDiff(chunks) {
      const feedback = { correct: [], missing: [], extra: [], incorrect: [] }
      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index]
        if (chunk.operation === 0) {
          feedback.correct.push(...chunk.words)
          continue
        }
        if (chunk.operation === -1 && chunks[index + 1]?.operation === 1) {
          const inserted = chunks[index + 1].words
          const max = Math.max(chunk.words.length, inserted.length)
          for (let wordIndex = 0; wordIndex < max; wordIndex += 1) {
            const expected = chunk.words[wordIndex]
            const actual = inserted[wordIndex]
            if (expected && actual) feedback.incorrect.push({ expected, actual })
            else if (expected) feedback.missing.push(expected)
            else if (actual) feedback.extra.push(actual)
          }
          index += 1
          continue
        }
        if (chunk.operation === -1) feedback.missing.push(...chunk.words)
        if (chunk.operation === 1) feedback.extra.push(...chunk.words)
      }
      return feedback
    },
    getRecitationWordSimilarity(left, right) {
      return getRecitationWordSimilarityEngine(left, right)
    },
    getRecitationElapsedSeconds(result = null) {
      const started = Number(result?.startedAt || this.recitationCheckStartedAt || this.aiMemorisationCheckerStartedAt || 0)
      const ended = Number(result?.endedAt || Date.now())
      if (!started || !ended || ended <= started) return 0
      return Math.max(0, Math.round((ended - started) / 1000))
    },
    getRecitationSpeedReview(result = null) {
      const statuses = this.getRecitationWordStatuses(result || {})
      const seconds = Number(result?.durationSeconds || this.getRecitationElapsedSeconds(result) || 0)
      if (!statuses.length || !seconds) return { tone: 'unknown', label: 'Pace not measured', wordsPerMinute: 0 }
      const wordsPerMinute = Math.round((statuses.length / seconds) * 60)
      if (wordsPerMinute > 125) return { tone: 'fast', label: `Fast pace (${wordsPerMinute} wpm)`, wordsPerMinute }
      if (wordsPerMinute < 45) return { tone: 'slow', label: `Slow pace (${wordsPerMinute} wpm)`, wordsPerMinute }
      return { tone: 'steady', label: `Steady pace (${wordsPerMinute} wpm)`, wordsPerMinute }
    },
    classifyRecitationWordMatch(displayText, targetWord, actualWord, similarity = null) {
      const expected = String(targetWord || '')
      const actual = String(actualWord || '')
      const score = similarity === null ? this.getRecitationWordSimilarity(expected, actual) : Number(similarity || 0)
      if (expected && (expected === actual || score >= 0.9)) {
        return { text: displayText, status: 'correct', note: 'Correct.', actual, similarity: 1 }
      }
      if (expected && actual && score >= 0.35) {
        return {
          text: displayText,
          status: 'partial',
          note: `Close. Expected ${displayText}; heard ${actual}.`,
          actual,
          similarity: score
        }
      }
      const outOfOrderIndex = arguments.length > 4 ? arguments[4] : -1
      return {
        text: displayText,
        status: 'incorrect',
        note: outOfOrderIndex >= 0
          ? `Wrong order. ${displayText} was heard later or earlier than expected.`
          : (actual ? `Expected ${displayText}; heard ${actual}.` : 'Incorrect word.'),
        actual,
        similarity: score,
        outOfOrder: outOfOrderIndex >= 0
      }
    },
    findRecitationWordLaterIndex(words = [], word = '', fromIndex = 0) {
      if (!word) return -1
      for (let index = Math.max(0, fromIndex); index < words.length; index += 1) {
        if (words[index] === word) return index
      }
      return -1
    },
    buildRecitationWordStatuses(targetWords, mistakes) {
      const missing = new Map()
      const incorrect = new Map()
        ; (mistakes?.missing || []).forEach(word => {
          missing.set(word, Number(missing.get(word) || 0) + 1)
        })
        ; (mistakes?.incorrect || []).forEach(item => {
          const expected = item?.expected || ''
          if (!expected) return
          if (!incorrect.has(expected)) incorrect.set(expected, [])
          incorrect.get(expected).push(item?.actual || '')
        })
      return targetWords.map(word => {
        if (incorrect.has(word) && incorrect.get(word).length) {
          const actual = incorrect.get(word).shift()
          return {
            text: word,
            status: 'incorrect',
            note: actual ? `Expected ${word}; heard ${actual}.` : 'Incorrect word.'
          }
        }
        if (missing.get(word) > 0) {
          missing.set(word, missing.get(word) - 1)
          return { text: word, status: 'pending', note: 'Not heard yet.' }
        }
        return { text: word, status: 'correct', note: 'Correct.' }
      })
    },
    buildRecitationAlignment(displayWords, normalizedTargetWords, transcriptWords) {
      const targetCount = normalizedTargetWords.length
      const heardCount = transcriptWords.length
      const matrix = Array.from({ length: targetCount + 1 }, () => Array(heardCount + 1).fill(null))
      matrix[0][0] = { cost: 0, prev: null, op: 'start' }

      for (let targetIndex = 1; targetIndex <= targetCount; targetIndex += 1) {
        matrix[targetIndex][0] = { cost: matrix[targetIndex - 1][0].cost + 1, prev: [targetIndex - 1, 0], op: 'missing' }
      }
      for (let heardIndex = 1; heardIndex <= heardCount; heardIndex += 1) {
        matrix[0][heardIndex] = { cost: matrix[0][heardIndex - 1].cost + 0.72, prev: [0, heardIndex - 1], op: 'extra' }
      }

      for (let targetIndex = 1; targetIndex <= targetCount; targetIndex += 1) {
        for (let heardIndex = 1; heardIndex <= heardCount; heardIndex += 1) {
          const targetWord = normalizedTargetWords[targetIndex - 1]
          const heardWord = transcriptWords[heardIndex - 1]
          const similarity = this.getRecitationWordSimilarity(targetWord, heardWord)
          const matchCost = targetWord === heardWord ? 0 : similarity >= 0.9 ? 0.16 : similarity >= 0.35 ? 0.68 : 1.34
          const candidates = [
            { cost: matrix[targetIndex - 1][heardIndex - 1].cost + matchCost, prev: [targetIndex - 1, heardIndex - 1], op: 'match', similarity },
            { cost: matrix[targetIndex - 1][heardIndex].cost + 1.02, prev: [targetIndex - 1, heardIndex], op: 'missing' },
            { cost: matrix[targetIndex][heardIndex - 1].cost + 0.78, prev: [targetIndex, heardIndex - 1], op: 'extra' }
          ]
          matrix[targetIndex][heardIndex] = candidates.sort((left, right) => left.cost - right.cost)[0]
        }
      }

      const statuses = displayWords.map(text => ({ text, status: 'pending', note: 'Not heard yet.', actual: '' }))
      const extra = []
      let targetIndex = targetCount
      let heardIndex = heardCount
      while (targetIndex > 0 || heardIndex > 0) {
        const cell = matrix[targetIndex][heardIndex]
        if (!cell) break
        if (cell.op === 'match') {
          const displayText = displayWords[targetIndex - 1] || normalizedTargetWords[targetIndex - 1]
          const actual = transcriptWords[heardIndex - 1] || ''
          const laterIndex = actual && normalizedTargetWords[targetIndex - 1] !== actual
            ? this.findRecitationWordLaterIndex(normalizedTargetWords, actual, targetIndex)
            : -1
          statuses[targetIndex - 1] = this.classifyRecitationWordMatch(
            displayText,
            normalizedTargetWords[targetIndex - 1],
            actual,
            cell.similarity,
            laterIndex
          )
        } else if (cell.op === 'extra') {
          extra.unshift(transcriptWords[heardIndex - 1])
        }
        ;[targetIndex, heardIndex] = cell.prev || [0, 0]
      }

      const sameWordsDifferentOrder = targetCount === heardCount
        && normalizedTargetWords.length > 1
        && normalizedTargetWords.some((word, index) => word !== transcriptWords[index])
        && [...normalizedTargetWords].sort().join('|') === [...transcriptWords].sort().join('|')
      if (sameWordsDifferentOrder) {
        normalizedTargetWords.forEach((word, index) => {
          if (word === transcriptWords[index]) return
          statuses[index] = {
            text: displayWords[index] || word,
            status: 'incorrect',
            note: `Wrong order. Expected ${displayWords[index] || word}; heard ${transcriptWords[index] || ''}.`,
            actual: transcriptWords[index] || '',
            similarity: this.getRecitationWordSimilarity(word, transcriptWords[index] || ''),
            outOfOrder: true
          }
        })
      }

      return { statuses, extra }
    },
    buildSequentialRecitationWordStatuses(displayWords, normalizedTargetWords, transcriptWords) {
      const alignment = this.buildRecitationAlignment(displayWords, normalizedTargetWords, transcriptWords).statuses
      if (!this.aiRecitationStrictProgression) return alignment
      const firstNonGreen = alignment.findIndex(word => word.status !== 'correct')
      if (firstNonGreen < 0) return alignment
      return alignment.map((word, index) => {
        if (index <= firstNonGreen) return word
        return { ...word, status: 'pending', note: 'Locked until the previous word is green.' }
      })
    },
    buildSkippedWordGroupsFromStatuses(statuses = []) {
      const groups = []
      statuses
        .map((word, index) => ({ word, index }))
        .filter(item => item.word?.status === 'pending')
        .forEach(item => {
          const last = groups[groups.length - 1]
          const sameAyah = last
            && (last.ayahKey || '') === (item.word?.ayahKey || '')
            && Number(last.ayahNumber ?? -1) === Number(item.word?.ayahNumber ?? -1)
          const contiguous = last && Number(last.endIndex) + 1 === Number(item.index)
          if (sameAyah && contiguous) {
            last.words.push(item.word.text)
            last.endIndex = item.index
            last.count = last.words.length
            return
          }
          groups.push({
            ayahKey: item.word?.ayahKey || '',
            ayahNumber: item.word?.ayahNumber ?? null,
            startIndex: item.index,
            endIndex: item.index,
            ayahWordIndex: item.word?.ayahWordIndex ?? null,
            count: 1,
            words: [item.word?.text || '']
          })
        })
      return groups
    },
    buildSkippedAyahsFromStatuses(statuses = []) {
      const grouped = new Map()
      statuses.forEach((word, index) => {
        const ayahKey = word?.ayahKey || ''
        const ayahNumber = Number.isFinite(Number(word?.ayahNumber)) ? Number(word.ayahNumber) : null
        const key = ayahKey || `ayah-${ayahNumber ?? index}`
        if (!grouped.has(key)) {
          grouped.set(key, {
            ayahKey,
            ayahNumber,
            ayahIndex: Number.isFinite(Number(word?.ayahIndex)) ? Number(word.ayahIndex) : grouped.size,
            wordCount: 0,
            heardCount: 0,
            words: []
          })
        }
        const entry = grouped.get(key)
        entry.wordCount += 1
        if (word?.status !== 'pending') entry.heardCount += 1
        if (word?.text) entry.words.push(word.text)
      })
      return Array.from(grouped.values())
        .filter(item => item.wordCount > 0 && item.heardCount === 0)
        .map(({ heardCount, ...item }) => item)
    },
    buildRecitationMistakesFromStatuses(statuses, transcriptWords, normalizedTargetWords, extraWords = [], previousMistakes = {}) {
      const skippedWords = this.buildSkippedWordGroupsFromStatuses(statuses)
      const skippedAyahs = this.buildSkippedAyahsFromStatuses(statuses)
      return {
        correct: statuses.filter(word => word.status === 'correct').map(word => word.text),
        missing: statuses.filter(word => word.status === 'pending').map(word => word.text),
        extra: extraWords,
        partial: statuses
          .map((word, index) => ({ word, index }))
          .filter(item => item.word.status === 'partial')
          .map(item => ({
            expected: item.word.text,
            actual: item.word.actual || transcriptWords[item.index] || normalizedTargetWords[item.index] || ''
          })),
        incorrect: statuses
          .map((word, index) => ({ word, index }))
          .filter(item => item.word.status === 'incorrect')
          .map(item => ({
            expected: item.word.text,
            actual: item.word.actual || transcriptWords[item.index] || normalizedTargetWords[item.index] || ''
          })),
        skippedWords,
        wordSkips: skippedWords,
        skippedAyahs,
        verseJumps: Array.isArray(previousMistakes?.verseJumps) ? previousMistakes.verseJumps : [],
        sequenceErrors: Array.isArray(previousMistakes?.sequenceErrors) ? previousMistakes.sequenceErrors : []
      }
    },
    buildDeterministicRecitationAnalysis(wordStatuses = [], transcriptWords = [], extraWords = []) {
      const statuses = Array.isArray(wordStatuses) ? wordStatuses : []
      const repetitions = []
      for (let index = 1; index < transcriptWords.length; index += 1) {
        if (transcriptWords[index] === transcriptWords[index - 1]) {
          repetitions.push({ word: transcriptWords[index], heardIndex: index })
        }
      }
      const omissions = statuses
        .map((word, index) => ({ word, index }))
        .filter(item => item.word.status === 'pending')
        .map(item => ({ word: item.word.text, expectedIndex: item.index }))
      const substitutions = statuses
        .map((word, index) => ({ word, index }))
        .filter(item => ['partial', 'incorrect'].includes(item.word.status))
        .map(item => ({
          expected: item.word.text,
          actual: item.word.actual || '',
          expectedIndex: item.index,
          similarity: Number(item.word.similarity || 0)
        }))
      const weakWords = statuses
        .map((word, index) => ({ word, index }))
        .filter(item => item.word.status !== 'correct')
        .map(item => ({
          word: item.word.text,
          index: item.index,
          status: item.word.status === 'pending' ? 'omission' : item.word.status,
          confidence: Number(item.word.confidence ?? 1),
          similarity: Number(item.word.similarity || 0)
        }))
      const completed = statuses.length > 0 && statuses.every(word => word.status === 'correct') && !extraWords.length
      const matchedCount = statuses.filter(word => ['correct', 'partial'].includes(word.status)).length
      return {
        sourceOfTruth: 'selected-ayah',
        completion: statuses.length ? Math.round((matchedCount / statuses.length) * 100) : 0,
        completed,
        omissions,
        substitutions,
        repetitions,
        repeatedWords: repetitions,
        skippedWords: omissions,
        extraWords,
        weakWords,
        recovery: {
          pauseSafe: true,
          restartSafe: true,
          strategy: 'sliding-window dynamic Quran alignment',
          matchedWords: matchedCount,
          expectedWords: statuses.length,
          heardWords: transcriptWords.length
        }
      }
    },
    getRecitationWordStatuses(result) {
      if (Array.isArray(result?.wordStatuses)) return result.wordStatuses
      const targetText = result?.targetText || this.getRecitationTargetText()
      const displayWords = this.tokenizeRecitationDisplayWords(targetText)
      const targetWords = displayWords.map(word => this.tokenizeRecitationWords(word)[0] || '').filter(Boolean)
      const statuses = this.buildRecitationWordStatuses(targetWords, result?.mistakeBreakdown || result?.mistakes || {})
      return statuses.map((word, index) => ({ ...word, text: displayWords[index] || word.text }))
    },
    getVerseForRecitationReview(result = null, fallbackVerse = null) {
      if (fallbackVerse?.key) return fallbackVerse
      const ayahKey = result?.ayahKey || result?.ayahRange?.keys?.[0] || this.recitationCheckTargetVerseKey || this.selfCheckVerseKey
      if (!ayahKey) return null
      return (this.mushafDisplayVerses || this.verses || []).find(verse => verse?.key === ayahKey) || null
    },
    getRecitationReviewArabic(result = null, fallbackVerse = null) {
      const verse = this.getVerseForRecitationReview(result, fallbackVerse)
      const isRangeReview = (result?.ayahRange?.keys || []).length > 1
        || (this.recitationCheckPendingTargets || []).length > 1
      const sourceText = isRangeReview
        ? (result?.targetText || this.getRecitationTargetText(this.recitationCheckPendingTargets))
        : (this.getPlainVerseArabicForCheck(verse) || result?.targetText || '')
      if (!sourceText) return ''
      const words = this.tokenizeRecitationDisplayWords(sourceText)
      const statuses = this.getRecitationWordStatuses(result || {})
      if (!words.length) return ''
      return words.map((word, index) => {
        const rawStatus = statuses[index]?.status || 'pending'
        const status = this.getWordVisualStatus(statuses[index] || { status: rawStatus }, false, !!result)
        const note = statuses[index]?.note || ''
        const canCorrect = status && status !== 'correct' ? ' can-correct-ai' : ''
        const title = status && status !== 'correct' ? `${note} Mark as AI mistake.` : note
        return `<word class="wbw-word recitation-word-${this.escapeHtml(status)}${canCorrect}" data-recitation-word-index="${index}" title="${this.escapeHtml(title)}">${this.escapeHtml(word)}</word>`
      }).join(' ')
    },
    getRecitationIssueReviewArabic(result = null, fallbackVerse = null) {
      const statuses = this.getRecitationWordStatuses(result || {})
      const issueWords = statuses
        .filter(word => ['pending', 'partial', 'incorrect'].includes(word.status))
        .map(word => {
          const status = word.status === 'pending' ? 'pending' : word.status
          const note = word.note || (word.status === 'pending' ? 'Missed word.' : '')
          return `<word class="wbw-word recitation-word-${this.escapeHtml(status)}" title="${this.escapeHtml(note)}">${this.escapeHtml(word.text)}</word>`
        })
      if (issueWords.length) return issueWords.join(' ')
      return '<span class="recitation-review-clean">No incorrect section detected.</span>'
    },
    getRecitationDetectionCounts(result = null) {
      const statuses = this.getRecitationWordStatuses(result)
      const mistakes = result?.mistakeBreakdown || result?.mistakes || {}
      const missingWords = Array.isArray(mistakes.missing) ? mistakes.missing.length : statuses.filter(word => word.status === 'pending').length
      const extraWords = Array.isArray(mistakes.extra) ? mistakes.extra.length : 0
      const incorrectWords = Array.isArray(mistakes.incorrect) ? mistakes.incorrect.length : statuses.filter(word => word.status === 'incorrect').length
      const wordSkipGroups = mistakes.wordSkips || mistakes.skippedWords || result?.wordSkips || result?.skippedWords || []
      const wordSkips = wordSkipGroups.reduce((sum, group) => sum + Number(group?.count || 1), 0)
      const ayahSkips = Array.isArray(mistakes.skippedAyahs) ? mistakes.skippedAyahs.length : Array.isArray(result?.skippedAyahs) ? result.skippedAyahs.length : 0
      const verseJumps = Array.isArray(mistakes.verseJumps) ? mistakes.verseJumps.length : Array.isArray(result?.verseJumps) ? result.verseJumps.length : (result?.verseJumpDetected ? 1 : 0)
      return {
        accuracy: this.getResolvedRecitationScore(result),
        missingWords,
        extraWords,
        incorrectWords,
        wordSkips,
        ayahSkips,
        verseJumps
      }
    },
    getRecitationResultStats(result) {
      const statuses = this.getRecitationWordStatuses(result)
      const counts = this.getRecitationDetectionCounts(result)
      const greenCount = statuses.filter(word => word.status === 'correct').length
      const amberCount = statuses.filter(word => word.status === 'partial').length
      const greyCount = statuses.filter(word => word.status === 'pending').length
      const redCount = Math.max(0, statuses.filter(word => word.status === 'incorrect').length)
      return [
        { key: 'green', label: 'Green', value: `${greenCount}`, description: 'Clear words heard correctly.', tone: 'tone-green' },
        { key: 'amber', label: 'Amber', value: `${amberCount}`, description: 'Close words to repeat slowly.', tone: 'tone-amber' },
        { key: 'red', label: 'Red', value: `${redCount}`, description: 'Words to stop and fix.', tone: 'tone-red' },
        { key: 'grey', label: 'Grey', value: `${greyCount}`, description: 'Words not heard yet.', tone: 'tone-grey' }
      ]
    },
    getTajweedRuleCatalog() {
      return {
        noon_idhaar: { label: 'Idhaar', group: 'Noon Sakinah & Tanween', order: 10, description: 'Clear noon sakinah or tanween before throat letters.' },
        noon_idghaam: { label: 'Idghaam', group: 'Noon Sakinah & Tanween', order: 20, description: 'Merged noon sakinah or tanween.' },
        noon_iqlaab: { label: 'Iqlaab', group: 'Noon Sakinah & Tanween', order: 30, description: 'Noon sakinah or tanween converted before baa.' },
        noon_ikhfaa: { label: 'Ikhfaa', group: 'Noon Sakinah & Tanween', order: 40, description: 'Hidden noon sakinah or tanween.' },
        ghunnah: { label: 'Noon & Meem Mushaddad', group: 'Ghunnah', order: 50, description: 'Held nasal sound on noon or meem mushaddad.' },
        meem_ikhfaa_shafawy: { label: 'Ikhfaa Shafawy', group: 'Meem Sakinah', order: 60, description: 'Hidden meem sakinah before baa.' },
        meem_idghaam_shafawy: { label: 'Idghaam Shafawy', group: 'Meem Sakinah', order: 70, description: 'Merged meem sakinah before meem.' },
        meem_izhaar_shafawy: { label: 'Izhaar Shafawy', group: 'Meem Sakinah', order: 80, description: 'Clear meem sakinah before other letters.' },
        qalqalah: { label: 'Qalqalah', group: 'Qalqalah', order: 90, description: 'Echoing articulation on qalqalah letters.' },
        madd_two: { label: 'Two Beat Madd', group: 'Al-Madd', order: 100, description: 'Natural two-count elongation.' },
        madd_flexible: { label: 'Flexible Madd', group: 'Al-Madd', order: 110, description: 'Madd that may be held two, four, or six counts.' },
        madd_four: { label: 'Four Beat Madd', group: 'Al-Madd', order: 120, description: 'Required four-count elongation.' },
        madd_six: { label: 'Six Beat Madd', group: 'Al-Madd', order: 130, description: 'Required six-count elongation.' },
        quranic_symbols: { label: 'Quranic Symbols', group: 'Mushaf marks', order: 140, description: 'Hamzatul-wasl, silent marks, small letters, or stopping symbols affecting reading.' }
      }
    },
    getTajweedClassRuleKey(className) {
      const key = String(className || '').replace(/^tajweed-/, '')
      const map = {
        ham_wasl: 'quranic_symbols',
        slnt: 'quranic_symbols',
        madda_normal: 'madd_two',
        madda_permissible: 'madd_flexible',
        madda_obligatory: 'madd_four',
        madda_pbligatory: 'madd_four',
        madda_necessary: 'madd_six',
        qlq: 'qalqalah',
        lqlq: 'qalqalah',
        ikhf_shfw: 'meem_ikhfaa_shafawy',
        ikhf: 'noon_ikhfaa',
        idghm_shfw: 'meem_idghaam_shafawy',
        idgh_shfw: 'meem_idghaam_shafawy',
        iqlb: 'noon_iqlaab',
        idgh_ghn: 'noon_idghaam',
        idgh_w_ghn: 'noon_idghaam',
        idgh_mus: 'noon_idghaam',
        ghn: 'ghunnah'
      }
      return map[key] || ''
    },
    extractTajweedRuleUnits(node, inheritedRules = []) {
      if (!node) return []
      if (node.nodeType === 3) {
        return splitArabicGraphemes(node.textContent || '').map(char => ({
          text: char,
          rules: [...new Set(inheritedRules)]
        }))
      }
      if (node.nodeType !== 1) return []
      const ownRules = Array.from(node.classList || [])
        .map(className => this.getTajweedClassRuleKey(className))
        .filter(Boolean)
      const rules = [...new Set([...inheritedRules, ...ownRules])]
      return Array.from(node.childNodes || []).flatMap(child => this.extractTajweedRuleUnits(child, rules))
    },
    extractMarkedTajweedRuleOccurrencesForVerse(verse, wordOffset = 0) {
      if (!verse?.arabic_tajweed || typeof document === 'undefined') return []
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = this.normalizeTajweedMarkup(verse.arabic_tajweed)
      const units = Array.from(tempDiv.childNodes).flatMap(node => this.extractTajweedRuleUnits(node))
      const words = this.tokenizeRecitationDisplayWords(this.getPlainVerseArabicForCheck(verse))
      const occurrences = []
      let cursor = 0

      words.forEach((word, wordIndex) => {
        while (cursor < units.length && /^\s$/.test(units[cursor].text || '')) cursor += 1
        const targetChars = splitArabicGraphemes(this.normalizeArabicForRecitation(word)).filter(char => this.isArabicBaseLetterForTajweed(char))
        const ruleKeys = new Set()
        let collected = 0

        while (cursor < units.length && collected < targetChars.length) {
          const unit = units[cursor]
          cursor += 1
          if (/^\s$/.test(unit.text || '')) continue
          ;(unit.rules || []).forEach(rule => ruleKeys.add(rule))
          if (this.isArabicBaseLetterForTajweed(unit.text)) collected += 1
        }

        ruleKeys.forEach(ruleKey => {
          occurrences.push({
            ruleKey,
            verseKey: verse.key,
            wordIndex,
            globalWordIndex: wordOffset + wordIndex,
            word
          })
        })
      })

      return occurrences
    },
    getFirstArabicBaseLetter(word) {
      const match = String(word || '').match(/[\u0621-\u064A\u0671]/u)
      return match ? match[0] : ''
    },
    getNoonTanweenRuleKey(word, nextWord) {
      const current = String(word || '')
      const hasNoonSakinah = /ن[\u0652ْ]/u.test(current)
      const hasTanween = /[\u064B-\u064D]/u.test(current)
      if (!hasNoonSakinah && !hasTanween) return ''
      const sameWordNext = current.match(/ن[\u0652ْ][\u0610-\u061A\u064B-\u065F\u0670]*([\u0621-\u064A\u0671])/u)?.[1] || ''
      const nextLetter = sameWordNext || this.getFirstArabicBaseLetter(nextWord)
      if (!nextLetter) return ''
      if (/[ءأإآؤئههعحغخ]/u.test(nextLetter)) return 'noon_idhaar'
      if (/ب/u.test(nextLetter)) return 'noon_iqlaab'
      if (/[يرملون]/u.test(nextLetter)) return 'noon_idghaam'
      if (/[تثجدذزسشصضطظفقك]/u.test(nextLetter)) return 'noon_ikhfaa'
      return ''
    },
    getMeemSakinahRuleKey(word, nextWord) {
      const current = String(word || '')
      if (!/م[\u0652ْ]/u.test(current)) return ''
      const sameWordNext = current.match(/م[\u0652ْ][\u0610-\u061A\u064B-\u065F\u0670]*([\u0621-\u064A\u0671])/u)?.[1] || ''
      const nextLetter = sameWordNext || this.getFirstArabicBaseLetter(nextWord)
      if (!nextLetter) return ''
      if (/ب/u.test(nextLetter)) return 'meem_ikhfaa_shafawy'
      if (/م/u.test(nextLetter)) return 'meem_idghaam_shafawy'
      return 'meem_izhaar_shafawy'
    },
    extractHeuristicTajweedRuleOccurrencesForVerse(verse, wordOffset = 0) {
      const rawText = this.stripTajweedMarkup(verse?.arabic_tajweed || verse?.arabic || '')
      const rawWords = rawText ? rawText.split(/\s+/).filter(Boolean) : []
      const displayWords = this.tokenizeRecitationDisplayWords(this.getPlainVerseArabicForCheck(verse))
      const count = Math.max(rawWords.length, displayWords.length)
      const occurrences = []
      const addRule = (ruleKey, index) => {
        if (!ruleKey) return
        occurrences.push({
          ruleKey,
          verseKey: verse.key,
          wordIndex: index,
          globalWordIndex: wordOffset + index,
          word: displayWords[index] || this.cleanRecitationDisplayText(rawWords[index] || '')
        })
      }

      for (let index = 0; index < count; index += 1) {
        const word = rawWords[index] || displayWords[index] || ''
        const nextWord = rawWords[index + 1] || displayWords[index + 1] || ''
        addRule(this.getNoonTanweenRuleKey(word, nextWord), index)
        addRule(this.getMeemSakinahRuleKey(word, nextWord), index)
        if (/[نم][\u0610-\u061A\u064B-\u065F\u0670]*[\u0651ّ]/u.test(word)) addRule('ghunnah', index)
        if (/[قطبجد][\u0610-\u061A\u064B-\u065F\u0670]*[\u0652ْ]/u.test(word)) addRule('qalqalah', index)
        if (/[\u0670\u06D6-\u06EDٱۥۦ]/u.test(word)) addRule('quranic_symbols', index)
      }

      return occurrences
    },
    extractTajweedRuleOccurrencesForVerse(verse, wordOffset = 0) {
      const occurrences = [
        ...this.extractMarkedTajweedRuleOccurrencesForVerse(verse, wordOffset),
        ...this.extractHeuristicTajweedRuleOccurrencesForVerse(verse, wordOffset)
      ]
      const seen = new Set()
      return occurrences.filter(item => {
        const signature = `${item.ruleKey}:${item.globalWordIndex}`
        if (seen.has(signature)) return false
        seen.add(signature)
        return true
      })
    },
    buildRecitationTajweedReview(targetVerses = [], wordStatuses = []) {
      const catalog = this.getTajweedRuleCatalog()
      const verses = Array.isArray(targetVerses) ? targetVerses.filter(Boolean) : []
      const statuses = Array.isArray(wordStatuses) ? wordStatuses : []
      const grouped = new Map()
      let wordOffset = 0

      verses.forEach(verse => {
        const words = this.tokenizeRecitationDisplayWords(this.getPlainVerseArabicForCheck(verse))
        this.extractTajweedRuleOccurrencesForVerse(verse, wordOffset).forEach(item => {
          if (!catalog[item.ruleKey]) return
          if (!grouped.has(item.ruleKey)) {
            grouped.set(item.ruleKey, {
              key: item.ruleKey,
              ...catalog[item.ruleKey],
              count: 0,
              issueCount: 0,
              issueWords: []
            })
          }
          const entry = grouped.get(item.ruleKey)
          const status = statuses[item.globalWordIndex]?.status || ''
          const isIssue = status && status !== 'correct'
          entry.count += 1
          if (isIssue) {
            entry.issueCount += 1
            if (item.word) entry.issueWords.push(item.word)
          }
        })
        wordOffset += words.length
      })

      return Array.from(grouped.values())
        .map(item => ({
          ...item,
          issueWords: [...new Set(item.issueWords)].slice(0, 4),
          tone: item.issueCount ? 'tone-review' : 'tone-excellent'
        }))
        .sort((left, right) => (left.order || 999) - (right.order || 999))
    },
    getRecitationTargetVersesForResult(result = null) {
      const keys = Array.isArray(result?.ayahRange?.keys) ? result.ayahRange.keys : []
      const pool = [...(this.mushafDisplayVerses || []), ...(this.verses || [])]
      if (keys.length) {
        return keys
          .map(key => pool.find(verse => verse?.key === key))
          .filter(Boolean)
      }
      const resultKey = result?.ayahKey || result?.selectedAyah?.key || ''
      if (resultKey) {
        const match = pool.find(verse => verse?.key === resultKey)
        if (match) return [match]
      }
      if (this.recitationCheckPendingTargets?.length) return this.recitationCheckPendingTargets
      if (this.aiMemorisationCheckerTargets?.length) return this.aiMemorisationCheckerTargets
      const verse = this.getVerseForRecitationReview(result, this.selfCheckModalVerse)
      return verse ? [verse] : []
    },
    getRecitationTajweedSummary(result = null) {
      if (Array.isArray(result?.tajweedRules)) return result.tajweedRules
      const targets = this.getRecitationTargetVersesForResult(result)
      return this.buildRecitationTajweedReview(targets, this.getRecitationWordStatuses(result || {}))
    },
    getRecitationTajweedSummaryLabel(result = null) {
      const rules = this.getRecitationTajweedSummary(result)
      const issueCount = rules.reduce((sum, rule) => sum + Number(rule.issueCount || 0), 0)
      if (issueCount) return `${issueCount} rule-linked issue${issueCount === 1 ? '' : 's'}`
      const markerCount = rules.reduce((sum, rule) => sum + Number(rule.count || 0), 0)
      return `${markerCount} checked marker${markerCount === 1 ? '' : 's'}`
    },
    getRecitationNextStep(result) {
      const mistakes = result?.mistakeBreakdown || result?.mistakes || {}
      const reviewCount = (mistakes.incorrect?.length || 0) + (mistakes.missing?.length || 0)
      const extraCount = mistakes.extra?.length || 0
      const tajweedIssues = this.getRecitationTajweedSummary(result).filter(rule => rule.issueCount).slice(0, 2)
      if (reviewCount && tajweedIssues.length) {
        return `Review ${reviewCount} word${reviewCount === 1 ? '' : 's'}, then recite again slowly.`
      }
      if (reviewCount) return `Review ${reviewCount} word${reviewCount === 1 ? '' : 's'}, replay the ayah, then try again.`
      if (extraCount) return 'Remove the extra wording, slow down, then try again.'
      if (this.getResolvedRecitationScore(result) >= 100) return 'Save this attempt, then recite once more from memory.'
      return 'Repeat once slowly, then save or retry.'
    },
    getRecitationRecommendationDisplay(result) {
      return String(result?.recommendation || '')
        .replace(/\s*Transcription source:.*$/i, '')
        .trim()
    },
    assessRecitationRecognitionWords(recognitionWords = [], targetVerses = this.getRecitationCheckTargetVerses(), options = {}) {
      const targetText = this.getRecitationTargetText(targetVerses)
      const timestamp = options.timestamp || new Date().toISOString()
	      const result = buildDeterministicRecitationResult(targetText, recognitionWords, {
	        strictProgression: true,
        id: options.id,
        timestamp,
        ayahRange: this.buildRecitationAyahRangePayload(targetVerses),
        targetAyahs: this.buildRecitationTargetAyahMetadata(targetVerses),
        metadata: {
          sessionId: options.sessionId || this.getCurrentRecitationSessionId(),
          audioHash: options.audioHash || '',
          timestamp
        }
      })
      const wordStatuses = result.wordStatuses || []
      const mistakes = result.mistakes || result.mistakeBreakdown || {}
      const tajweedRules = this.buildRecitationTajweedReview(targetVerses, wordStatuses)
      const endedAt = options.endedAt || Date.now()
      const startedAt = options.startedAt || this.recitationCheckStartedAt || this.aiMemorisationCheckerStartedAt || 0
      const speedReview = this.getRecitationSpeedReview({ wordStatuses, startedAt, endedAt })
      return {
        ...result,
        mistakes,
        mistakeBreakdown: mistakes,
        wordStatuses,
        tajweedRules,
        startedAt: this.recitationCheckStartedAt || this.aiMemorisationCheckerStartedAt || 0,
        endedAt,
        durationSeconds: this.getRecitationElapsedSeconds({ startedAt, endedAt }),
        speedReview,
        recommendation: this.getRecitationRecommendation(result.accuracyScore, mistakes),
        reviewMetadata: this.buildRecitationReviewMetadata(result.accuracyScore, mistakes, tajweedRules, timestamp)
      }
    },
    getRecitationRecommendation(score, mistakes) {
      const verseJumps = mistakes.verseJumps?.length || 0
      const wordSkips = mistakes.wordSkips?.reduce((sum, group) => sum + Number(group.count || 1), 0) || 0
      const skippedAyahs = mistakes.skippedAyahs?.length || 0
      const sequenceErrors = mistakes.sequenceErrors?.length || 0
      const missing = mistakes.missing?.length || 0
      const incorrect = mistakes.incorrect?.length || 0
      const partial = mistakes.partial?.length || 0
      const extra = mistakes.extra?.length || 0
      if (skippedAyahs) return `Skipped ${skippedAyahs} ayah${skippedAyahs === 1 ? '' : 's'}. Review the selected range in order.`
      if (verseJumps) return `Verse jump detected ${verseJumps === 1 ? 'once' : `${verseJumps} times`}. Restart from the last complete ayah.`
      if (sequenceErrors) return 'Ayahs were recited out of order. Restart from the first selected ayah.'
      if (wordSkips) return `Skipped ${wordSkips} word${wordSkips === 1 ? '' : 's'}. Slow down and complete each ayah before moving on.`
      if (missing) return `Missing ${missing} word${missing === 1 ? '' : 's'}. Recite that section slowly before retrying.`
      if (partial) return `Clarify ${partial} close word${partial === 1 ? '' : 's'}, then check again.`
      if (incorrect) return `Review ${incorrect} changed word${incorrect === 1 ? '' : 's'} and compare with the displayed ayah.`
      if (extra) return 'Extra wording detected. Slow down and keep the ayah boundary tight.'
      if (score >= 100) return 'Clean match. Save it and keep this ayah on light review.'
      if (score >= 85) return 'Mostly clean. Recheck once before saving.'
      return 'Replay the ayah once, recite without looking, then run another Recite Check.'
    },
    buildRecitationReviewMetadata(score, mistakes, tajweedRules = [], baseIso = '') {
      const issueCount = (mistakes.missing?.length || 0) + (mistakes.extra?.length || 0) + (mistakes.incorrect?.length || 0) + (mistakes.partial?.length || 0)
        + (mistakes.wordSkips?.reduce((sum, group) => sum + Number(group.count || 1), 0) || 0)
        + (mistakes.skippedAyahs?.length || 0)
        + (mistakes.verseJumps?.length || 0)
        + (mistakes.sequenceErrors?.length || 0)
      const tajweedIssueCount = Array.isArray(tajweedRules)
        ? tajweedRules.reduce((sum, rule) => sum + Number(rule.issueCount || 0), 0)
        : 0
      const totalIssueCount = issueCount + tajweedIssueCount
      const intervalDays = score >= 100 && totalIssueCount === 0 ? 7 : score >= 85 ? 3 : 1
      const dueAt = baseIso ? new Date(baseIso) : new Date()
      if (Number.isNaN(dueAt.getTime())) dueAt.setTime(Date.now())
      dueAt.setDate(dueAt.getDate() + intervalDays)
      return {
        priority: score >= 100 && totalIssueCount === 0 ? 'low' : score >= 85 ? 'medium' : 'high',
        intervalDays,
        dueAt: dueAt.toISOString(),
        mistakeCount: totalIssueCount,
        tajweedIssueCount,
        reason: score >= 100 && totalIssueCount === 0 ? 'high-accuracy' : score >= 85 ? 'partial-review' : 'needs-review'
      }
    },
    mutqinSessionsStorageKey() {
      return 'mutqin_sessions'
    },
    getCurrentRecitationSessionId() {
      const chapter = Number(this.chapterId || this.currentChapter?.id || 0)
      const start = Number(this.rangeStart || 0)
      const end = Number(this.rangeEnd || start)
      const user = this.auth?.id ? `user-${this.auth.id}` : 'guest'
      return `${user}-surah-${chapter}-ayahs-${start}-${end}`
    },
    loadMutqinSessionsForRecitation() {
      try {
        const parsed = this.readScopedStorageValue('mutqinSessions', this.mutqinSessionsStorageKey(), [])
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    },
    saveRecitationCheckAttempt(result, targetVerses = this.getRecitationCheckTargetVerses()) {
      if (!result) return false
      const targets = targetVerses?.length ? targetVerses : this.getRecitationCheckTargetVerses()
      const sessionId = this.getCurrentRecitationSessionId()
      const chapterId = Number(this.chapterId || this.currentChapter?.id || targets[0]?.chapterId || 0)
      const rangeStart = targets[0]?.number || this.rangeStart
      const rangeEnd = targets[targets.length - 1]?.number || this.rangeEnd
      const attempt = {
        id: result.id,
        sessionId,
        surah: {
          id: chapterId,
          name: this.currentChapter?.name_simple || this.activeChapterName || `Surah ${chapterId}`
        },
        ayahRange: {
          start: rangeStart,
          end: rangeEnd,
          keys: targets.map(verse => verse.key).filter(Boolean)
        },
        timestamp: result.timestamp,
        transcript: result.transcript,
        targetText: result.targetText,
        accuracyScore: result.accuracyScore,
        mistakeBreakdown: result.mistakes,
        wordStatuses: result.wordStatuses,
        tajweedRules: result.tajweedRules || [],
        reviewMetadata: result.reviewMetadata,
        audioSrc: result.audioSrc || ''
      }

      const sessions = this.loadMutqinSessionsForRecitation()
      let session = sessions.find(item => item?.sessionId === sessionId)
      if (!session) {
        session = {
          sessionId,
          surah: attempt.surah,
          ayahRange: attempt.ayahRange,
          attempts: [],
          reviewMetadata: null,
          createdAt: new Date().toISOString()
        }
        sessions.push(session)
      }
      session.surah = attempt.surah
      session.ayahRange = attempt.ayahRange
      session.updatedAt = attempt.timestamp
      session.reviewMetadata = result.reviewMetadata
      session.attempts = Array.isArray(session.attempts) ? session.attempts : []
      session.attempts.push(attempt)
      this.writeScopedStorageValue('mutqinSessions', this.mutqinSessionsStorageKey(), sessions)
      return this.saveAiCheckToRecordingsLibrary(attempt, result)
    },
    cleanupSelfCheckMedia() {
      if (this.selfCheckMediaStream) {
        try {
          this.selfCheckMediaStream.getTracks().forEach(track => track.stop())
        } catch (error) {
          console.warn('Failed to stop self-check media tracks:', error)
        }
      }
      this.selfCheckMediaStream = null
      this.selfCheckMediaRecorder = null
      this.selfCheckChunks = []
      this.selfCheckStartedAt = 0
    },
    async startSelfCheckRecording(verse) {
      if (!verse?.key) return
      if (!this.supportsSelfCheckRecording()) {
        this.selfCheckError = 'Recording is not supported in this browser.'
        return
      }
      if (this.isSelfCheckRecording) return

      this.loadRecordingsLibrary()
      this.selfCheckModeChoiceVisible = false
      this.selfCheckVerseRef = this.buildSelfCheckVerseRef(verse)
      this.selfCheckVerseKey = verse.key
      this.selfCheckFontSize = this.getSelfCheckInitialFontSize(verse)
      this.showSelfCheckModal = true
      this.selfCheckError = ''
      this.selfCheckLastSavedAyahKey = ''
      this.selfCheckDraft = null
      this.clearRecitationReviewState()
      this.selfCheckPreparing = true
      this.selfCheckPreparingLabel = 'Preparing microphone…'
      this.selfCheckSavedAttemptsVisible = false
      this.selfCheckSavedAttemptsFilter = 'all'
      this.selfCheckPermissionState = 'prompt'
      this.selfCheckDiscardOnStop = false
      this.selfCheckPeekActive = false
      this.stopRecordingsPlayback({ clearSource: true })
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause()
        this.isPlaying = false
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = this.chooseRecorderMimeType()
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        this.selfCheckMediaStream = stream
        this.selfCheckMediaRecorder = recorder
        this.selfCheckChunks = []
        this.selfCheckPermissionState = 'granted'

        recorder.ondataavailable = event => {
          if (event.data?.size) this.selfCheckChunks.push(event.data)
        }
        recorder.onerror = () => {
          this.selfCheckError = 'The microphone stopped unexpectedly.'
          this.selfCheckPreparing = false
          this.isSelfCheckRecording = false
          this.cleanupSelfCheckMedia()
        }
        recorder.onstop = async () => {
          const durationSeconds = Math.max(1, Math.round((Date.now() - Number(this.selfCheckStartedAt || Date.now())) / 1000))
          const chunks = [...this.selfCheckChunks]
          const discard = this.selfCheckDiscardOnStop
          this.selfCheckPreparing = false
          this.isSelfCheckRecording = false
          this.selfCheckDiscardOnStop = false

          try {
            if (!discard && chunks.length) {
              this.selfCheckPreparing = true
              this.selfCheckPreparingLabel = 'Processing recording…'
              const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
              const dataUrl = await this.blobToDataUrl(blob)
              this.selfCheckDraft = {
                id: `draft-${verse.key}-${Date.now()}`,
                ayahKey: verse.key,
                ayahNumber: verse.number,
                chapterId: verse.chapterId,
                chapterName: this.currentChapter?.name_simple || this.activeChapterName || `Surah ${verse.chapterId}`,
                recordedAt: new Date().toISOString(),
                durationSeconds,
                result: 'Needs Review',
                audioSrc: dataUrl
              }
              this.selfCheckSavedAttemptsVisible = false
              this.showBanner(this.t('toasts.recordingReadyForAyah', { number: verse.number }), 'success', 1800)
            }
          } catch (error) {
            console.error('Failed to process self-check recording:', error)
            this.selfCheckError = 'The recording could not be prepared for review.'
          } finally {
            this.selfCheckPreparing = false
            this.selfCheckPreparingLabel = ''
            this.cleanupSelfCheckMedia()
          }
        }

        recorder.start()
        this.selfCheckStartedAt = Date.now()
        this.isSelfCheckRecording = true
        this.selfCheckPreparing = false
        this.selfCheckPreparingLabel = ''
      } catch (error) {
        console.error('Failed to start self-check recording:', error)
        this.selfCheckPermissionState = 'denied'
        this.selfCheckPreparing = false
        this.selfCheckPreparingLabel = ''
        this.selfCheckError = 'Microphone access was blocked. Allow microphone permission, then try again.'
        this.cleanupSelfCheckMedia()
      }
    },
    stopSelfCheckRecording() {
      if (!this.selfCheckMediaRecorder || this.selfCheckMediaRecorder.state !== 'recording') return
      this.selfCheckPreparing = true
      this.selfCheckPreparingLabel = 'Finalising recording…'
      this.selfCheckMediaRecorder.stop()
    },
    discardSelfCheckRecording() {
      if (this.isSelfCheckRecording && this.selfCheckMediaRecorder) {
        this.selfCheckDiscardOnStop = true
        this.selfCheckPreparing = true
        this.selfCheckPreparingLabel = 'Discarding recording…'
        this.selfCheckMediaRecorder.stop()
        return
      }
      if (this.selfCheckDraft?.ayahKey && this.activeSelfCheckPreviewKey === this.selfCheckDraft.ayahKey) {
        this.stopRecordingsPlayback({ clearSource: true })
      }
      this.selfCheckDraft = null
      this.selfCheckError = ''
      this.selfCheckPreparing = false
      this.selfCheckPreparingLabel = ''
      this.pendingRecordingDeleteId = ''
    },
    restartSelfCheckRecording(verse) {
      this.discardSelfCheckRecording()
      window.setTimeout(() => {
        this.startSelfCheckRecording(verse)
      }, 40)
    },
    setSelfCheckDraftResult(result) {
      if (!this.selfCheckDraft) return
      this.selfCheckDraft = {
        ...this.selfCheckDraft,
        result: normalizeRecordingResult(result)
      }
    },
    async toggleSelfCheckPreview(verseKey) {
      const draft = this.getSelfCheckDraftForVerse(verseKey)
      if (!draft?.audioSrc) return

      const audio = this.ensureRecordingsAudioElement()
      if (!audio) {
        this.showBanner(this.t('toasts.audioSystemNotReady'), 'error', 2200)
        return
      }

      if (this.activeSelfCheckPreviewKey === verseKey && !audio.paused) {
        audio.pause()
        this.activeSelfCheckPreviewKey = ''
        return
      }

      this.stopRecordingsPlayback({ clearSource: true })
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause()
        this.isPlaying = false
      }

      audio.src = draft.audioSrc
      audio.load()

      try {
        await audio.play()
        this.activeSelfCheckPreviewKey = verseKey
      } catch (error) {
        console.error('Failed to preview self-check recording:', error)
        this.activeSelfCheckPreviewKey = ''
        this.showBanner(this.t('toasts.unableToPlayThisRecordingRight'), 'error', 2200)
      }
    },
    saveSelfCheckRecording(verse) {
      const draft = this.getSelfCheckDraftForVerse(verse?.key)
      if (!draft) return

      this.loadRecordingsLibrary()
      if (this.activeSelfCheckPreviewKey === verse?.key) {
        this.stopRecordingsPlayback({ clearSource: true })
      }
      const savedEntry = {
        ...draft,
        id: `recording-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sessionRangeStart: Number(this.rangeStart || verse?.number || 1),
        sessionRangeEnd: Number(this.rangeEnd || verse?.number || 1),
        reciterId: this.reciterId,
        source: 'self-check'
      }

      this.recordingsLibrary = [savedEntry, ...this.recordingsLibrary]
      this.persistRecordingsLibrary()
      this.selfCheckLastSavedAyahKey = savedEntry.ayahKey
      this.selfCheckDraft = null
      this.ensureSelectedRecordingsAyah()
      this.selfCheckSavedAttemptsVisible = false
      this.showBanner(this.t('toasts.savedSelfCheckForAyah', { ayahNumber: savedEntry.ayahNumber }), 'success', 1800)
    },

    runConfirmAction() {
      const action = this.confirmModal.action
      const actionData = this.confirmModal.data
      this.closeConfirmModal()
      if (action === 'reset-session') this.performResetControls()
      if (action === 'switch-mode') this.performToggleMode()
      if (action === 'delete-offline' && this.pendingDeleteId) this.performDeleteOffline()
      if (action === 'discard-continue') this.clearContinueSession()
      if (action === 'delete-saved-session' && actionData?.sessionId)
        this.performDeleteSavedSession(actionData.sessionId)
      if (action === 'delete-pending-recitation-check') this.performDeleteRecitationCheckAttempt(actionData?.attemptId)
    },



    async downloadVerseAudio(verse) {
      const audioUrl = this.normalizeAudioUrl(verse?.audio || '')
      if (!audioUrl) {
        this.showBanner(this.t('toasts.audioNotAvailableForThisAyah'), 'info', 2200)
        return
      }

      try {
        const filename = `surah-${this.chapterId}-ayah-${verse.number}.mp3`
        const downloadUrl = `/memorisation/audio-download?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}`
        const anchor = document.createElement('a')
        anchor.href = downloadUrl
        anchor.download = filename
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        this.showBanner(this.t('toasts.downloadedAyahAudio', { number: verse.number }), 'success', 1800)
      } catch (error) {
        console.error('Verse download failed:', error)
        this.showBanner(this.t('toasts.failedToDownloadAyahAudio'), 'error', 2600)
      }
    },
    syncSettingsDraft() {
      this.settingsDraft = {
        tajweedEnabled: !!this.tajweedEnabled,
        showTranslation: !!this.showTranslation,
        showTransliteration: !!this.showTransliteration,
        showWordByWord: !!this.showWordByWord,
        wordByWordAudioEnabled: !!this.wordByWordAudioEnabled,
        defaultFontSize: Math.max(
          this.minFontSize,
          Math.min(this.maxFontSize, Number(this.defaultFontSize || 100))
        )
      }
    },

    persistControlState() {
      this.persistUiState()
      this.persistCentralSessionState()
    },

    toggleSettingsOption(key) {
      this.updateSettingsValue(key, !this.settingsDraft[key])
    },

    updateSettingsValue(key, value) {
      this.settingsDraft = {
        ...this.settingsDraft,
        [key]: value
      }
      this.applySettingsChanges({ silent: true })
    },

    parseVerseNumber(value) {
      const rawKey = typeof value === 'string'
        ? value
        : (value && typeof value === 'object' ? (value.key || value.ayahId || value.id || '') : '')
      if (!rawKey || typeof rawKey !== 'string' || !rawKey.includes(':')) return null
      const versePart = rawKey.split(':')[1]
      const number = Number.parseInt(String(versePart), 10)
      return Number.isFinite(number) ? number : null
    },

    isVerseBlurred(verseKey) {
      if (!this.blurModeEnabled) return false
      const activeNumber = this.parseVerseNumber(this.effectiveActiveVerseKey)
      const verseNumber = this.parseVerseNumber(verseKey)
      if (activeNumber === null || verseNumber === null) return false
      return verseNumber > activeNumber
    },
    isVersePeekRevealed(verseKey) {
      if (!this.blurModeEnabled || !this.isVerseBlurred(verseKey)) return false
      return this.blurPeekHoldingSpace || this.hoverPeekVerseKey === verseKey || this.touchPeekVerseKey === verseKey
    },

    refreshHifzPlanState() {
      try {
        this.hifzPlan = this.readScopedStorageValue('hifzPlan', HIFZ_PLAN_STORAGE_KEY, null)
        this.hifzPlanExists = !!this.hifzPlan
      } catch {
        this.hifzPlan = null
        this.hifzPlanExists = false
      }
    },

    loadHifzAppState() {
      try {
        const parsed = this.readScopedStorageValue('hifzAppState', HIFZ_APP_STATE_STORAGE_KEY, null)
        const defaults = createHifzAppState()
        this.appState = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? { ...defaults, ...parsed }
          : defaults
      } catch {
        this.appState = createHifzAppState()
      }
    },

    persistHifzAppState(updates = {}) {
      const nextState = {
        ...createHifzAppState(),
        ...(this.appState || {}),
        ...(updates || {}),
        updatedAt: new Date().toISOString()
      }
      this.appState = nextState
      this.writeScopedStorageValue('hifzAppState', HIFZ_APP_STATE_STORAGE_KEY, nextState)
      return nextState
    },

    refreshHifzJourneyState() {
      this.refreshHifzPlanState()
      this.loadHifzAppState()
      try {
        const parsedProgress = this.readScopedStorageValue('ayahProgress', AYAH_PROGRESS_STORAGE_KEY, {})
        this.hifzAyahProgress = parsedProgress && typeof parsedProgress === 'object' && !Array.isArray(parsedProgress)
          ? parsedProgress
          : {}
      } catch {
        this.hifzAyahProgress = {}
      }
      try {
        this.hifzTodayQueue = generateTodaySession()
      } catch {
        this.hifzTodayQueue = []
      }
    },

    openHifzPlanModal() {
      this.showHifzPlanModal = false
    },

    closeHifzPlanModal() {
      this.showHifzPlanModal = false
    },

    async handleHifzPlanSaved() {
      this.refreshHifzJourneyState()
      this.wordByWordAudioEnabled = true
      this.persistUiState()
      await this.activatePlannerMode({ startPlayback: true })
    },

    async activatePlannerMode(options = {}) {
      if (!this.hifzPlan) return false
      const plannerState = this.plannerSessionState
      const sessionRange = plannerState.sessionRange
      if (!plannerState.plannerReady || !sessionRange?.chapterId) {
        this.persistHifzAppState({
          mode: 'planner',
          sessionActive: false,
          activePlanId: this.hifzPlan.id || null,
          todaySession: plannerState.todaySession,
          plannerReady: false,
          lastEvent: 'PLAN_READY_EMPTY'
        })
        return false
      }

      this.currentMode = 'planner'
      this.persistHifzAppState({
        mode: 'planner',
        sessionActive: false,
        activePlanId: this.hifzPlan.id || null,
        todaySession: plannerState.todaySession,
        progress: {
          completedAyahs: this.hifzCompletedAyahCount,
          dueCount: plannerState.dueCount
        },
        plannerReady: true,
        lastEvent: 'SESSION_READY'
      })

      this.applySessionConfig({
        ...this.buildSessionConfig('planner'),
        mode: 'planner',
        chapterId: sessionRange.chapterId,
        rangeStart: sessionRange.rangeStart,
        rangeEnd: sessionRange.rangeEnd,
        reciterId: String(this.hifzPlan?.playback?.reciterId || this.reciterId || DEFAULT_ALQURAN_RECITER),
        speed: Number(this.hifzPlan?.playback?.speed || 1),
        repetitionsPerStep: Math.max(1, Math.min(10, Number(this.hifzPlan?.playback?.repetitionsPerAyah || 5))),
        selectedLoopCount: Math.max(1, Math.min(10, Number(this.hifzPlan?.playback?.repetitionsPerAyah || 5))),
        showTranslation: false,
        showTransliteration: false,
        showWordByWord: false,
        wordByWordAudioEnabled: true,
        tajweedEnabled: true,
        focusModeEnabled: false,
        blurModeEnabled: false,
        anchorModeEnabled: false,
        chainingEnabled: false
      })

      await this.loadChapter('planner')
      this.buildQueue('planner')
      this.syncMutqinAyahs(this.planner.verses || [])
      this.syncMutqinSession(this.planner.queue || [], 'planner')
      this.syncActiveVerseState('planner')
      this.showTools = false
      this.topCardMenuOpen = false
      this.persistUiState()
      this.persistModeState('planner')
      this.persistSessionState()

      if (options.startPlayback) {
        this.startSessionWithCountdown()
      } else if (options.bannerText) {
        this.showBanner(options.bannerText, 'success', 1800)
      }
      return true
    },

    async startPlannerPrimaryAction() {
      if (!this.hifzPlanExists) {
        this.openHifzPlanModal()
        return
      }
      if (!this.plannerWorkspaceReady) {
        this.wordByWordAudioEnabled = true
        await this.activatePlannerMode({ startPlayback: true })
        return
      }
      if (this.isPlaying) {
        this.togglePlay()
        return
      }
      if (this.hasSessionStarted && this.audioElement?.src) {
        this.togglePlay()
        return
      }
      this.startSessionWithCountdown()
    },

    persistHifzPlan(nextPlan, message = '') {
      if (!nextPlan || typeof nextPlan !== 'object') return
      const now = new Date().toISOString()
      const forecast = calculatePlanForecast(nextPlan, { completedAyahs: this.hifzCompletedAyahCount })
      const payload = {
        ...nextPlan,
        status: nextPlan.lifecycle?.status || nextPlan.status || 'active',
        lifecycle: {
          ...(nextPlan.lifecycle || {}),
          status: nextPlan.lifecycle?.status || nextPlan.status || 'active',
          updatedAt: now
        },
        forecast,
        updatedAt: now
      }
      this.writeScopedStorageValue('hifzPlan', HIFZ_PLAN_STORAGE_KEY, payload)
      this.refreshHifzJourneyState()
      if (message) this.showBanner(message, 'success', 1600)
    },

    async startOrResumeHifzPlan() {
      const now = new Date().toISOString()
      const basePlan = this.hifzPlan || {}
      this.persistHifzPlan({
        ...basePlan,
        status: 'active',
        lifecycle: {
          ...(basePlan.lifecycle || {}),
          status: 'active',
          startedAt: basePlan.lifecycle?.startedAt || basePlan.startedAt || basePlan.createdAt || now,
          resumedAt: now,
          pausedAt: null
        }
      }, this.hifzPlanLifecycleStatus === 'paused' ? 'Hifz plan resumed' : 'Hifz plan started')
      await this.activatePlannerMode({ startPlayback: false })
    },

    pauseHifzPlan() {
      if (!this.hifzPlan) return
      const now = new Date().toISOString()
      this.persistHifzPlan({
        ...this.hifzPlan,
        status: 'paused',
        lifecycle: {
          ...(this.hifzPlan.lifecycle || {}),
          status: 'paused',
          pausedAt: now
        }
      }, 'Hifz plan paused')
      this.persistHifzAppState({
        mode: 'planner',
        sessionActive: false,
        activePlanId: this.hifzPlan?.id || null,
        todaySession: this.hifzTodayQueue,
        plannerReady: true,
        lastEvent: 'SESSION_PAUSED'
      })
    },

    createNewHifzPlan() {
      if (this.hifzPlan) {
        try {
          const archives = this.readScopedStorageValue('hifzPlanArchives', HIFZ_PLAN_ARCHIVE_STORAGE_KEY, [])
          const nextArchives = Array.isArray(archives) ? archives : []
          nextArchives.unshift({
            ...this.hifzPlan,
            archivedAt: new Date().toISOString(),
            archivedProgress: {
              completedAyahs: this.hifzCompletedAyahCount,
              progressPercent: this.hifzPlannerProgressPercent,
              planHealth: this.hifzPlanHealth.label
            }
          })
          this.writeScopedStorageValue('hifzPlanArchives', HIFZ_PLAN_ARCHIVE_STORAGE_KEY, nextArchives.slice(0, 12))
        } catch {}
      }
      this.deleteScopedStorageValue('hifzPlan', HIFZ_PLAN_STORAGE_KEY)
      this.deleteScopedStorageValue('hifzAppState', HIFZ_APP_STATE_STORAGE_KEY)
      this.refreshHifzJourneyState()
      this.openHifzPlanModal()
    },

    deleteHifzPlan() {
      if (typeof window !== 'undefined' && !window.confirm('Delete this Hifz plan and its planner progress from this browser?')) return
      this.deleteScopedStorageValue('hifzPlan', HIFZ_PLAN_STORAGE_KEY)
      this.deleteScopedStorageValue('ayahProgress', AYAH_PROGRESS_STORAGE_KEY)
      this.deleteScopedStorageValue('hifzAppState', HIFZ_APP_STATE_STORAGE_KEY)
      this.hifzPlannerAnalyticsOpen = false
      this.currentMode = 'beginner'
      this.refreshHifzJourneyState()
      this.showBanner(this.t('toasts.hifzPlanDeleted'), 'info', 1600)
    },

    applyHifzRecovery(strategy) {
      if (!this.hifzPlan) return
      const dailyTarget = normalizeDailyNewAyahCount(this.hifzPlan)
      const nextPlan = {
        ...this.hifzPlan,
        recovery: {
          strategy,
          appliedAt: new Date().toISOString(),
          previousDailyTarget: dailyTarget,
          missedDays: this.hifzPlanHealth.missedDays
        }
      }

      if (strategy === 'catchUp') {
        const nextTarget = Math.min(10, dailyTarget + Math.max(1, Math.ceil(this.hifzPlanHealth.missedDays / 2)))
        nextPlan.goalSettings = {
          ...(nextPlan.goalSettings || {}),
          dailyNewAyahs: {
            min: nextTarget,
            max: nextTarget,
            exact: nextTarget,
            label: `${nextTarget} ayahs/day`
          }
        }
      } else if (strategy === 'reduce') {
        const nextTarget = Math.max(1, dailyTarget - 1)
        nextPlan.goalSettings = {
          ...(nextPlan.goalSettings || {}),
          dailyNewAyahs: {
            min: nextTarget,
            max: nextTarget,
            exact: nextTarget,
            label: `${nextTarget} ayahs/day`
          }
        }
      } else if (strategy === 'extend') {
        nextPlan.recovery.extendedByDays = Math.max(1, this.hifzPlanHealth.missedDays)
        nextPlan.completionAdjustmentDays = Number(nextPlan.completionAdjustmentDays || 0) + nextPlan.recovery.extendedByDays
      }

      this.persistHifzPlan(nextPlan, 'Recovery plan applied')
    },

    focusLinkedAyah(verseKey, options = {}) {
      if (!verseKey) return null
      return this.setActiveVerse(verseKey, options)
    },

    openToolsPanel(options = {}) {
      const { verseKey = null, mode = this.currentMode, scroll = false, tab = 'tools', preserveFreshSelection = false } = options
      this.toolsReturnFocusEl = document.activeElement instanceof HTMLElement ? document.activeElement : null
      this.startingFreshSessionSelection = !!preserveFreshSelection
      this.currentMode = mode
      this.tab = ['tools', 'techniques', 'saved', 'stats', 'settings'].includes(tab) ? tab : 'tools'
      this.syncSettingsDraft()
      if (this.tab === 'saved' || this.tab === 'stats') {
        this.loadSavedSessions()
        if (this.tab === 'stats' && !this.selectedStatsSessionId && this.savedSessions[0]?.id) {
          this.selectedStatsSessionId = this.savedSessions[0].id
        }
      }

      if (verseKey) {
        this.focusLinkedAyah(verseKey, { mode, scroll })
      }

      this.showPlannerModal = false
      this.showConfirmModal = false
      this.showResumeModal = false
      this.showTools = true
      this.persistUiState()
      this.$nextTick(() => {
        const panelBody = this.$refs.toolsBody
        if (panelBody) panelBody.scrollTop = 0
        this.focusToolsPanel()
      })
    },

    closeToolsPanel() {
      if (!this.showTools) return
      this.showTools = false
      this.persistUiState()
      this.restoreToolsFocus()
    },

    closeResumeModal() {
      this.showResumeModal = false
      this.returningUserChoicePending = false
    },

    openResumeNewSession() {
      this.startingFreshSessionSelection = true
      this.showResumeModal = false
      this.returningUserChoicePending = false
      this.openToolsPanel({ tab: 'tools', preserveFreshSelection: true })
    },

    async repeatLastSessionFromStart() {
      const payload = this.continueSessionPayload
      if (!payload?.config?.chapterId) return
      this.startingFreshSessionSelection = false
      this.showResumeModal = false
      this.returningUserChoicePending = false
      await this.hydrateSessionFromPayload(payload, {
        banner: false,
        forcePlayback: false
      })
      this.prepareRangeRestart()
      this.showBanner('Session restarted from the beginning.', 'success', 2200)
      this.$nextTick(() => {
        this.startSessionAfterUserGesture()
      })
    },

    async saveSessionFromResumeChoice() {
      this.startingFreshSessionSelection = false
      this.showResumeModal = false
      this.returningUserChoicePending = false

      if (this.canResumePreviousSession) {
        await this.hydrateSessionFromPayload(this.continueSessionPayload, {
          banner: false,
          forcePlayback: false
        })
      }

      const session = this.saveCurrentSessionSilently()
      if (session?.name) {
        this.showBanner(this.t('toasts.sessionSaved', { name: session.name }), 'success', 2200)
        return
      }

      this.showBanner('Nothing is ready to save yet.', 'info', 2200)
    },

    openResumeSavedSessions() {
      if (!this.canViewSavedSessions) return
      this.showResumeModal = false
      this.returningUserChoicePending = false
      this.openToolsPanel({ tab: 'saved' })
    },

    openAdvancedControls() {
      // Keep power features accessible, but behind a tertiary surface.
      this.openToolsPanel()
    },
    handleHeaderSessionAction() {
      if (!this.hasVerses) return
      this.startingFreshSessionSelection = false
      if (this.isPlaying) {
        this.togglePlay()
        return
      }
      if (this.hasSessionStarted && this.audioElement?.src) {
        this.togglePlay()
        return
      }
      this.startSessionWithCountdown()
    },
    promptTapToPlay(message = 'Playback is ready. Tap to play.') {
      this.showBanner(message, 'warning', 5200, {
        key: 'resume-playback',
        label: 'Tap to play'
      })
    },
    async resumePlaybackAfterGesture() {
      const audio = this.audioElement || this.$refs.audio
      if (audio?.src) {
        try {
          const safeSpeed = this.normalizePlaybackSpeed(this.speed)
          audio.defaultPlaybackRate = safeSpeed
          audio.playbackRate = safeSpeed
          await audio.play()
          this.isPlaying = true
          this.playerVisible = true
          this.markPlaybackStart()
          return
        } catch (error) {
          console.error('Playback resume after gesture failed:', error)
        }
      }
      const entry = this.queue?.[this.queueIndex]
      if (entry) {
        await this.playQueueEntry(entry, { force: true, queueIndex: this.queueIndex })
      }
    },
    openInsightsPanel() {
      this.openToolsPanel({ tab: 'stats' })
    },
    openAdvancedMetricsModal() {
      if (this.selectedStatsSessionRecord) {
        this.openSessionAnalyticsModal(this.selectedStatsSessionRecord)
        return
      }
      this.showAdvancedMetricsModal = true
    },
    closeAdvancedMetricsModal() {
      this.showAdvancedMetricsModal = false
    },
    saveSessionFromHomeCard() {
      if (this.hasVerses) {
        this.saveCurrentSessionWithName()
        return
      }
      this.openSavedSessionsPanel()
    },
    resetRangeFromHomeCard() {
      if (this.hasVerses) {
        this.performResetControls()
        return
      }
      this.openNewSessionSetup()
    },
    openNewSessionSetup() {
      this.openToolsPanel({ tab: 'tools' })
    },
    openSavedSessionsPanel() {
      this.openToolsPanel({ tab: 'saved' })
    },
    setLoopCount(value) {
      const nextValue = value === 'infinite' ? 'infinite' : Math.max(1, Number(value || 1))
      this.selectedLoopCount = nextValue
      if (nextValue !== 'infinite') {
        this.repetitionsPerStep = nextValue
      }
      if (this.hasVerses && !this.chainingEnabled) {
        this.applyChainingQueueChange(this.currentMode, { restart: true })
      } else {
        this.persistUiState()
        this.persistCentralSessionState()
      }
      this.showBanner(
        nextValue === 'infinite' ? 'Infinite loop enabled for the current ayah' : `Loop count set to ${nextValue}x`,
        'info',
        1200
      )
    },
    isReviewPriorityAyah(verseKey) {
      if (!verseKey) return false
      if (this.isDueHifzAyah(verseKey)) return true
      const currentEntry = this.activeQueueEntry
      if (currentEntry?.phase === 'Retention' && (currentEntry?.ayahId === verseKey || currentEntry?.verse?.key === verseKey || currentEntry?.key === verseKey)) {
        return true
      }
      const retentionDue = (this.queue || []).some(item => item?.phase === 'Retention' && (item?.ayahId === verseKey || item?.verse?.key === verseKey || item?.key === verseKey))
      if (retentionDue) return true
      const ayah = this.mutqinState?.ayahs?.[verseKey]
      return ayah?.status === 'weak'
    },
    getHifzQueueType(verseKey) {
      const item = (this.hifzTodayQueue || []).find(entry => entry?.key === verseKey)
      return item?.type || ''
    },
    getHifzAyahProgress(verseKey) {
      return this.hifzAyahProgress?.[verseKey] || null
    },
    getHifzDateToken(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    toFriendlyReviewLabel(value) {
      const token = String(value || '').replaceAll('/', '-')
      if (!token) return 'Tomorrow'
      const today = new Date()
      const todayToken = this.getHifzDateToken(today)
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const tomorrowToken = this.getHifzDateToken(tomorrow)
      if (token === todayToken) return 'Today'
      if (token === tomorrowToken) return 'Tomorrow'
      const parsed = new Date(token)
      if (Number.isNaN(parsed.getTime())) return String(value || '')
      return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    },
    buildPlannerReviewSchedule() {
      const grouped = new Map()
      this.hifzMemorySchedule.upcoming.forEach(entry => {
        if (!entry.nextToken) return
        grouped.set(entry.nextToken, (grouped.get(entry.nextToken) || 0) + 1)
      })
      const schedule = Array.from(grouped.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .slice(0, 3)
        .map(([token, count], index) => ({
          key: `planner-review-${token}-${index}`,
          label: this.toFriendlyReviewLabel(token),
          value: `${count} ayah${count === 1 ? '' : 's'}`
        }))
      return schedule.length
        ? schedule
        : [{ key: 'planner-review-fallback', label: 'Tomorrow', value: 'Your first review is ready.' }]
    },
    buildPlannerFutureSessions() {
      const plan = this.hifzPlan || {}
      const scope = resolvePlanScope(plan)
      const dailyTarget = Math.max(1, normalizeDailyNewAyahCount(plan))
      const completedAyahs = Math.max(0, Number(this.hifzCompletedAyahCount || 0))
      const sessionLabels = ['Tomorrow', 'After that', 'Later this week']
      if (!scope?.surah) {
        return sessionLabels.map((label, index) => ({
          key: `planner-future-generic-${index}`,
          label,
          value: `${dailyTarget} new ayah${dailyTarget === 1 ? '' : 's'}`
        }))
      }

      const sessions = []
      let cursor = scope.startAyah + completedAyahs
      for (let index = 0; index < sessionLabels.length && cursor <= scope.endAyah; index += 1) {
        const startAyah = cursor
        const endAyah = Math.min(scope.endAyah, startAyah + dailyTarget - 1)
        sessions.push({
          key: `planner-future-${index}-${startAyah}-${endAyah}`,
          label: sessionLabels[index],
          value: startAyah === endAyah ? `Ayah ${startAyah}` : `Ayahs ${startAyah}-${endAyah}`
        })
        cursor = endAyah + 1
      }

      return sessions.length
        ? sessions
        : [{ key: 'planner-future-maintenance', label: 'Next session', value: 'Revision only until the next ayahs are due.' }]
    },
    buildPlannerCompletionSnapshot(options = {}) {
      const todayGoalTarget = Math.max(1, normalizeDailyNewAyahCount(this.hifzPlan || {}))
      const memorisedAyahs = Math.max(0, Number(options.memorisedAyahs || 0))
      const todayGoalCompleted = Math.min(todayGoalTarget, memorisedAyahs)
      const reviewSchedule = this.buildPlannerReviewSchedule()
      const nextReview = reviewSchedule[0]?.label || 'Tomorrow'
      return {
        memorisedAyahs,
        newAyahs: memorisedAyahs,
        todayGoalCompleted,
        todayGoalTarget,
        nextReview,
        nextReviewHint: nextReview === 'Tomorrow'
          ? 'Due tomorrow'
          : 'Already scheduled',
        summaryMessage: todayGoalCompleted >= todayGoalTarget
          ? `Today you memorised ${memorisedAyahs} ayah${memorisedAyahs === 1 ? '' : 's'}.`
          : `Today you memorised ${todayGoalCompleted} of ${todayGoalTarget} planned ayah${todayGoalTarget === 1 ? '' : 's'}.`
      }
    },
    getPlannerCompletionCounts() {
      const todaySession = Array.isArray(this.appState?.todaySession) ? this.appState.todaySession : []
      const coveredCount = Math.max(0, Math.min(todaySession.length, Number(this.currentPosition || 0)))
      const coveredItems = todaySession.slice(0, coveredCount)
      const memorisedAyahs = coveredItems.filter(item => item?.type === 'new').length
      return {
        coveredAyahs: coveredCount,
        memorisedAyahs: memorisedAyahs || coveredCount
      }
    },
    showPlannerCompletionCelebration(snapshot = null) {
      void snapshot
      this.showPlannerCompletionModal = false
      this.showPlannerCompletionConfetti = false
    },
    closePlannerCompletionModal() {
      this.showPlannerCompletionModal = false
    },
    openHifzPlanFromCompletionModal() {
      this.closePlannerCompletionModal()
    },
    isDueHifzAyah(verseKey) {
      if (this.getHifzQueueType(verseKey) === 'due') return true
      const progress = this.getHifzAyahProgress(verseKey)
      if (!progress?.nextReview) return false
      const reviewDate = this.getHifzDateToken(progress.nextReview)
      return !!reviewDate && reviewDate <= this.getHifzDateToken(new Date())
    },
    isNewHifzAyah(verseKey) {
      if (this.getHifzQueueType(verseKey) === 'new') return true
      return !this.getHifzAyahProgress(verseKey)
    },
    onVersePeekEnter(verseKey) {
      if (!this.blurModeEnabled || !this.isVerseBlurred(verseKey)) return
      this.hoverPeekVerseKey = verseKey
    },
    onVersePeekLeave(verseKey) {
      if (this.hoverPeekVerseKey === verseKey) this.hoverPeekVerseKey = null
    },
    clearTouchPeek() {
      if (this.longPressPeekTimer) {
        clearTimeout(this.longPressPeekTimer)
        this.longPressPeekTimer = null
      }
      this.longPressPeekTriggered = false
      this.touchPeekVerseKey = null
    },
    onVerseTouchStart(event, verseKey = null) {
      const touch = event?.changedTouches?.[0]
      if (!touch) return
      this.touchStartX = Number(touch.clientX || 0)
      this.touchStartY = Number(touch.clientY || 0)
      this.clearTouchPeek()
      if (!this.blurModeEnabled || !this.isVerseBlurred(verseKey)) return
      this.longPressPeekTimer = window.setTimeout(() => {
        this.longPressPeekTriggered = true
        this.touchPeekVerseKey = verseKey
      }, 320)
    },
    onVerseTouchEnd(event, verseKey = null) {
      const touch = event?.changedTouches?.[0]
      if (!touch) return
      const dx = Number(touch.clientX || 0) - Number(this.touchStartX || 0)
      const dy = Number(touch.clientY || 0) - Number(this.touchStartY || 0)
      const longPressTriggered = this.longPressPeekTriggered
      this.clearTouchPeek()
      if (longPressTriggered) {
        this.suppressNextVerseClick = true
        window.setTimeout(() => {
          this.suppressNextVerseClick = false
        }, 260)
        return
      }
      if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) return
      if (dx < 0) this.next()
      else this.prev()
    },
    onVerseCardClick(verse) {
      if (!verse?.key) return
      if (this.suppressNextVerseClick) {
        this.suppressNextVerseClick = false
        return
      }
      const wasActive = this.effectiveActiveVerseKey === verse.key
      this.focusLinkedAyah(verse.key)
      // If the user clicks the active ayah card, treat it as an intent to play/pause.
      if (wasActive && verse.audio) {
        this.playVerse(verse)
      }
    },
    onMushafAyahClick(verse) {
      if (!verse?.key) return
      if (this.suppressNextVerseClick) {
        this.suppressNextVerseClick = false
        return
      }
      this.focusLinkedAyah(verse.key)
      this.playFullAyah(verse)
    },
    playFullAyah(verse) {
      if (!verse?.audio) return
      return this.playVerse(verse, { manualOnly: true })
    },
    getMushafAyahNumberStyle(number) {
      const digits = Math.min(3, String(number || '').length || 1)
      const sizes = {
        1: { width: '1.9em', height: '1.9em', fontSize: '0.92em' },
        2: { width: '2.35em', height: '2.35em', fontSize: '0.74em' },
        3: { width: '2.95em', height: '2.95em', fontSize: '0.62em' }
      }
      return sizes[digits] || sizes[3]
    },
    setReadingViewMode(mode) {
      const allowedModes = ['stacked', 'mushaf']
      const nextMode = allowedModes.includes(mode) ? mode : 'stacked'
      if (this.readingViewMode === nextMode) {
        this.topCardMenuOpen = false
        this.fontDropdownOpen = false
        return
      }
      this.readingViewMode = nextMode
      if (nextMode === 'mushaf') {
        this.applyMushafThemeDefault(this.theme)
        this.syncMushafPageToActiveVerse()
      } else {
        this.fontOpen = false
        this.bgOpen = false
        this.borderOpen = false
      }
      this.topCardMenuOpen = false
      this.fontDropdownOpen = false
      this.persistUiState()
    },
    getDefaultMushafBackgroundForTheme(theme = this.theme) {
      return theme === 'dark' ? 'night' : 'paper'
    },
    applyMushafThemeDefault(theme = this.theme) {
      const nextBackground = this.getDefaultMushafBackgroundForTheme(theme)
      if (this.mushafBackground !== nextBackground) {
        this.mushafBackground = nextBackground
      }
    },
    syncMushafPageToActiveVerse() {
      if (!this.mushafPages.length) {
        this.mushafPageIndex = 0
        return
      }
      const activeKey = this.effectiveActiveVerseKey || this.activeVerseKey
      const pageIndex = this.mushafPages.findIndex(page => page.verses.some(verse => verse.key === activeKey))
      if (pageIndex >= 0) {
        this.mushafPageIndex = pageIndex
        return
      }
      this.mushafPageIndex = this.safeMushafPageIndex
    },
    goToMushafPage(index) {
      if (!this.mushafPages.length) {
        this.mushafPageIndex = 0
        return
      }
      this.mushafPageIndex = Math.max(0, Math.min(Number(index || 0), this.mushafPages.length - 1))
    },
    goToPreviousMushafPage() {
      this.goToMushafPage(this.safeMushafPageIndex - 1)
    },
    goToNextMushafPage() {
      this.goToMushafPage(this.safeMushafPageIndex + 1)
    },
    onMushafAyahEnter(verse) {
      if (!verse?.key) return
      this.hoveredMushafVerseKey = verse.key
      this.onVersePeekEnter(verse.key)
    },
    onMushafAyahLeave(verse) {
      this.hoveredMushafVerseKey = ''
      this.onVersePeekLeave(verse?.key)
    },
    increaseMushafFontSize() {
      this.defaultFontSize = Math.min(this.maxFontSize, Number(this.defaultFontSize || 120) + this.fontSizeStep)
      this.updateDefaultFontSize()
    },
    decreaseMushafFontSize() {
      this.defaultFontSize = Math.max(this.minFontSize, Number(this.defaultFontSize || 120) - this.fontSizeStep)
      this.updateDefaultFontSize()
    },
    setMushafBackground(value) {
      if (!this.mushafBackgroundOptions.some(option => option.value === value)) return
      this.mushafBackground = value
      this.persistUiState()
    },
    setMushafBorder(value) {
      if (!this.mushafBorderOptions.some(option => option.value === value)) return
      this.mushafBorder = value
      this.persistUiState()
    },
    runGuidedAction(verse) {
      // Single visible flow: Learn -> Practice -> Recall -> Continue
      if (!this.hasVerses) {
        this.startSession()
        return
      }
      if (this.guidedUiStep === 'learn') {
        this.flowStep = 'learn'
        this.flowListenPlays = 0
        this.playVerse(verse)
        this.persistUiState()
        return
      }
      if (this.guidedUiStep === 'practice') {
        this.flowStep = 'recall'
        this.persistUiState()
        if (this.audioElement) {
          try { this.audioElement.pause() } catch { }
        }
        this.isPlaying = false
        return
      }
      this.flowStep = 'learn'
      this.flowListenPlays = 0
      this.persistUiState()
      this.next()
    },
    setModeAndExplain(mode) {
      this.currentMode = mode
      if (mode !== 'planner') {
        this.persistHifzAppState({ mode: 'casual', sessionActive: false, lastEvent: 'CASUAL_MODE' })
      }

      const store = this.getModeStore(mode)
      const isFreshMode = !store.chapterId && !store.verses?.length

      this.applySessionConfig(this.buildSessionConfig(mode))
      this.syncActiveVerseState(mode)
      this.openToolsPanel({ mode })
    },

    startNewSetup(mode) {
      this.setModeAndExplain(mode)
      this.showTools = true
    },
    cloneModeState(modeState) {
      return deepClone(modeState)
    },

    getModeStore(mode = this.currentMode) {
      if (mode === 'planner') return this.planner
      return mode === 'beginner' ? this.beginner : this.advanced
    },

    getConfigFingerprint(config = {}) {
      return JSON.stringify({
        chapterId: Number(config.chapterId || 0),
        rangeStart: Number(config.rangeStart || 1),
        rangeEnd: Number(config.rangeEnd || config.rangeStart || 1),
        reciterId: typeof config.reciterId === 'string' && config.reciterId
          ? config.reciterId
          : DEFAULT_ALQURAN_RECITER,
        showWordByWord: !!config.showWordByWord,
        tajweedEnabled: !!this.tajweedEnabled  // Add this line
      })
    },

    modeDataMatchesConfig(mode = this.currentMode, config = null) {
      const store = this.getModeStore(mode)
      if (!store?.verses?.length || !store.loadedConfig) return false
      const targetConfig = config || this.buildSessionConfig(mode)
      return this.getConfigFingerprint(store.loadedConfig) === this.getConfigFingerprint(targetConfig)
    },

    getVerseCacheKey(mode = this.currentMode, config = null) {
      const targetConfig = config || this.buildSessionConfig(mode)
      return `${mode}:${this.getConfigFingerprint(targetConfig)}`
    },

    getCachedVerses(mode = this.currentMode, config = null) {
      const key = this.getVerseCacheKey(mode, config)
      const memoryHit = this.verseDataCache[key]
      if (memoryHit) return this.cloneModeState(memoryHit)
      try {
        const raw = localStorage.getItem(`telawa.verseCache.${key}`)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        const ts = Number(parsed?.ts || 0)
        if (ts && Date.now() - ts > 6 * 60 * 60 * 1000) return null
        this.verseDataCache[key] = parsed
        return this.cloneModeState(parsed)
      } catch (e) {
        return null
      }
    },

    setCachedVerses(mode = this.currentMode, config = null, payload = null) {
      if (!payload) return
      const key = this.getVerseCacheKey(mode, config)
      const wrapped = { ...payload, ts: Date.now() }
      this.verseDataCache[key] = this.cloneModeState(wrapped)
      try {
        localStorage.setItem(`telawa.verseCache.${key}`, JSON.stringify(wrapped))
      } catch (e) { }
    },

    scheduleLoadVerses(mode = this.currentMode) {
      if (this.loadVersesTimer) clearTimeout(this.loadVersesTimer)
      this.loadVersesTimer = setTimeout(() => {
        this.loadVerses(mode)
      }, 200)
    },

    syncWorkspaceFromControls(options = {}) {
      if (this.isBootstrapping) return
      const mode = options.mode || this.currentMode
      const store = this.getModeStore(mode)
      const chapterId = Number(store?.chapterId || 0)

      if (this.workspaceSyncTimer) clearTimeout(this.workspaceSyncTimer)
      this.persistUiState()

      if (!chapterId) {
        this.currentChapter = null
        this.clearWorkspaceForConfigChange(mode)
        this.isDataReady = true
        return
      }

      const matchedChapter = this.chapters.find(chapter => Number(chapter.id) === chapterId) || null
      this.currentChapter = matchedChapter || (this.chapters.length ? null : this.currentChapter)
      this.clampControlRange(mode)
      this.clearWorkspaceForConfigChange(mode)

      if (options.immediate) {
        this.loadVerses(mode)
        return
      }

      this.workspaceSyncTimer = setTimeout(() => {
        this.loadVerses(mode)
      }, 160)
    },

    async applyWorkspaceControls(options = {}) {
      if (this.isBootstrapping) return
      const mode = options.mode || this.currentMode
      if (this.workspaceSyncTimer) clearTimeout(this.workspaceSyncTimer)
      this.persistUiState()
      this.syncWorkspaceFromControls({ ...options, mode, immediate: true })
      await this.$nextTick()
    },

    clampControlRange(mode = this.currentMode) {
      const store = this.getModeStore(mode)
      const max = this.currentChapter?.verses_count || 286
      store.rangeStart = Math.max(1, Math.min(Number(store.rangeStart || 1), max))
      store.rangeEnd = Math.max(store.rangeStart, Math.min(Number(store.rangeEnd || store.rangeStart || 1), max))
    },

    clearWorkspaceForConfigChange(mode = this.currentMode) {
      const store = this.getModeStore(mode)
      if (!store) return
      this.stopWordHighlighting()
      if (this.audioElement) {
        try { this.audioElement.pause() } catch { }
      }
      this.isPlaying = false
      this.currentTime = 0
      store.verses = []
      store.queue = []
      store.queueIndex = 0
      store.activeKey = null
      store.loadedConfig = null
      if (mode === this.currentMode) {
        this.activeVerseKey = null
        this.activeKey = null
        this.queueIndex = 0
        this.isDataReady = false
      }
    },

    setActiveVerse(verseKey, options = {}) {
      if (!verseKey) return null
      const mode = options.mode || this.currentMode
      const store = this.getModeStore(mode)
      const queue = Array.isArray(store.queue) ? store.queue : []
      const requestedQueueIndex = Number.isFinite(options.queueIndex) ? Number(options.queueIndex) : null

      store.activeKey = verseKey
      if (requestedQueueIndex !== null) {
        store.queueIndex = requestedQueueIndex
      } else {
        const foundQueueIndex = queue.findIndex(item => (item?.verse?.key || item?.key) === verseKey)
        if (foundQueueIndex >= 0) store.queueIndex = foundQueueIndex
      }

      if (mode === this.currentMode) {
        this.activeKey = verseKey
        this.activeVerseKey = verseKey
        this.queueIndex = store.queueIndex || 0
      }

      if (options.scroll !== false) {
        this.$nextTick(() => {
          const el = document.querySelector(`.verse-card[data-verse-key="${verseKey}"], .mushaf-ayah[data-verse-key="${verseKey}"]`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
      }

      return verseKey
    },

    syncActiveVerseState(mode = this.currentMode, requestedKey = null) {
      const store = this.getModeStore(mode)
      const verses = Array.isArray(store?.verses) ? store.verses : []
      const queue = Array.isArray(store?.queue) ? store.queue : []

      if (!verses.length) {
        store.activeKey = null
        store.queueIndex = 0
        if (mode === this.currentMode) {
          this.activeKey = null
          this.activeVerseKey = null
          this.queueIndex = 0
        }
        return null
      }

      let resolvedKey = requestedKey || store.activeKey || (queue[store.queueIndex]?.verse?.key || queue[store.queueIndex]?.key) || verses[0]?.key
      if (!verses.some(verse => verse.key === resolvedKey)) {
        resolvedKey = verses[0].key
      }

      const storedQueueIndex = Math.max(0, Math.min(Number(store.queueIndex || 0), Math.max(queue.length - 1, 0)))
      const storedQueueKey = queue[storedQueueIndex]?.verse?.key || queue[storedQueueIndex]?.key
      let resolvedQueueIndex = storedQueueKey === resolvedKey
        ? storedQueueIndex
        : queue.findIndex(item => (item?.verse?.key || item?.key) === resolvedKey)
      if (resolvedQueueIndex < 0) {
        resolvedQueueIndex = storedQueueIndex
        resolvedKey = queue[resolvedQueueIndex]?.verse?.key || queue[resolvedQueueIndex]?.key || resolvedKey
      }

      return this.setActiveVerse(resolvedKey, { mode, queueIndex: resolvedQueueIndex, scroll: false })
    },

    buildSessionConfig(mode = this.currentMode) {
      const config = this.getModeStore(mode)
      return this.cloneModeState({
        ...config,
        mode,
        repetitionsPerStep: Math.max(1, Math.min(50, Number(this.repetitionsPerStep || 1))),
        selectedLoopCount: this.selectedLoopCount,
        talqinModeEnabled: !!this.talqinModeEnabled,
        recitationWindowSeconds: Math.max(5, Math.min(30, Number(this.recitationWindowSeconds || 8))),
        gapBetweenVerses: this.gapBetweenVerses,
        customGapSeconds: Math.max(0.5, Math.min(10, Number(this.customGapSeconds || 2))),
        tajweedEnabled: this.tajweedEnabled,
        quranFont: this.quranFont,
        fontScale: this.fontScale,
        script: this.script,
        showTranslation: this.showTranslation,
        showTransliteration: this.showTransliteration,
        showWordByWord: this.showWordByWord,
        wordByWordAudioEnabled: this.wordByWordAudioEnabled,
        focusModeEnabled: this.focusModeEnabled,
        focusDimPercent: Math.max(30, Math.min(75, Number(this.focusDimPercent || 54))),
        blurModeEnabled: this.blurModeEnabled,
        blurIntensity: this.blurIntensity,
        anchorModeEnabled: this.anchorModeEnabled,
        anchorCount: this.anchorCount,
        chainingEnabled: this.chainingEnabled,
        chainingMethod: this.chainingMethod,
        chainingRepetitions: this.chainingRepetitions,
        theme: this.theme
      })
    },

    applySessionConfig(config) {
      if (!config) return
      const mode = config.mode || this.currentMode
      this.currentMode = mode
      this.tab = 'tools'
      this.chapterId = Number(config.chapterId || 0)
      this.rangeStart = Number(config.rangeStart || 1)
      this.rangeEnd = Number(config.rangeEnd || this.rangeStart || 1)
      this.reciterId = typeof config.reciterId === 'string' && config.reciterId
        ? config.reciterId
        : DEFAULT_ALQURAN_RECITER
      this.speed = Number(config.speed || 1)
      const parsedDelay = Number(config.delay)
      this.delay = Number.isFinite(parsedDelay) && parsedDelay >= 0 ? parsedDelay : 2
      this.playMode = ['auto', 'manual', 'follow'].includes(config.playMode) ? config.playMode : 'auto'
      this.talqinModeEnabled = !!config.talqinModeEnabled
      this.recitationWindowSeconds = Math.max(5, Math.min(30, Number(config.recitationWindowSeconds || this.recitationWindowSeconds || 8)))
      this.order = 'seq'
      this.repetitionsPerStep = Math.max(1, Math.min(50, Number(config.repetitionsPerStep || this.repetitionsPerStep || 5)))
      this.selectedLoopCount = config.selectedLoopCount === 'infinite'
        ? 'infinite'
        : Math.max(1, Math.min(50, Number(config.selectedLoopCount || this.selectedLoopCount || this.repetitionsPerStep || 5)))
      this.gapBetweenVerses = ['none', '1x', '3s', '5s', 'custom'].includes(config.gapBetweenVerses)
        ? config.gapBetweenVerses
        : this.gapBetweenVerses
      this.customGapSeconds = Math.max(0.5, Math.min(10, Number(config.customGapSeconds || this.customGapSeconds || 2)))
      this.chainingEnabled = config.chainingEnabled ?? this.chainingEnabled
      this.chainingMethod = ['linking', 'cumulative'].includes(config.chainingMethod)
        ? config.chainingMethod
        : this.chainingMethod
      this.chainingRepetitions = Math.max(1, Math.min(5, Number(config.chainingRepetitions || this.chainingRepetitions || 1)))
      this.tajweedEnabled = !!config.tajweedEnabled
      this.quranFont = config.quranFont || this.quranFont
      this.fontScale = Number(config.fontScale || 1)
      this.script = config.script || this.script
      this.showTranslation = config.showTranslation ?? this.showTranslation
      this.showTransliteration = config.showTransliteration ?? this.showTransliteration
      this.showWordByWord = config.showWordByWord ?? this.showWordByWord
      this.wordByWordAudioEnabled = config.wordByWordAudioEnabled ?? this.wordByWordAudioEnabled
      this.focusModeEnabled = !!config.focusModeEnabled
      this.focusDimPercent = Math.max(30, Math.min(75, Number(config.focusDimPercent || this.focusDimPercent || 54)))
      this.blurModeEnabled = !!config.blurModeEnabled
      this.blurIntensity = Math.max(4, Math.min(18, Number(config.blurIntensity || this.blurIntensity || 10)))
      this.anchorModeEnabled = !!config.anchorModeEnabled
      this.anchorCount = Math.max(1, Math.min(3, Number(config.anchorCount || this.anchorCount || 2)))
      this.syncGlobalTheme(config.theme || this.theme)
    },

    loadModeState(mode) {
      const defaults = mode === 'planner'
        ? createPlannerState()
        : (mode === 'beginner' ? createBeginnerState() : createAdvancedState())
      try {
        const saved = this.learningBackendEnabled()
          ? this.readWorkspaceStateValue(`modeState:${mode}`, null)
          : (() => {
            const raw = localStorage.getItem(MODE_STORAGE_KEYS[mode])
            return raw ? JSON.parse(raw) : null
          })()
        if (!saved) return this.cloneModeState(defaults)

        const merged = { ...defaults, ...this.cloneModeState(saved) }

        if (typeof merged.reciterId !== 'string' || !merged.reciterId) {
          merged.reciterId = DEFAULT_ALQURAN_RECITER
        }
        merged.speed = [0.5, 1, 1.25, 1.5, 2].includes(Number(merged.speed)) ? Number(merged.speed) : 1
        merged.delay = Math.max(0, Number.isFinite(Number(merged.delay)) ? Number(merged.delay) : 2)
        merged.playMode = ['auto', 'manual', 'follow'].includes(merged.playMode) ? merged.playMode : 'auto'
        merged.recitationWindowSeconds = Math.max(5, Math.min(30, Number(merged.recitationWindowSeconds || 8)))

        if (mode === 'advanced') {
          if (merged.order === 'rand') merged.order = 'seq'
          if (merged.order === 'cum') merged.order = 'seq'
          if (merged.order === 'spaced') merged.order = 'seq'
        }

        return merged
      } catch (e) {
        console.error(`Failed to load ${mode} mode state:`, e)
        return this.cloneModeState(defaults)
      }
    },

    persistSessionState() {
      if (this.isBootstrapping) return
      const mode = this.currentMode
      try {
        const nextState = {
          activeKey: this.activeKey,
          activeVerseKey: this.activeVerseKey,
          queueIndex: this.queueIndex,
          timestamp: Date.now()
        }
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue(`sessionState:${mode}`, nextState)
        } else {
          localStorage.setItem(SESSION_STORAGE_KEYS[mode], JSON.stringify(nextState))
        }
      } catch (e) {
        console.error('Failed to persist session state:', e)
      }
    },
    isEditableElement(target) {
      if (!target) return false
      const tag = target.tagName?.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
    },

    handleGlobalKeydown(event) {
      if (!this.appReady || this.isEditableElement(event.target)) return

      if (event.key === 'Escape') {
        this.blurPeekHoldingSpace = false
        this.clearTouchPeek()
        this.hoverPeekVerseKey = null
        if (this.showSelfCheckModal) {
          event.preventDefault()
          this.closeSelfCheckModal()
          return
        }
        if (this.showAiMemorisationCheckerModal) {
          event.preventDefault()
          this.closeAiMemorisationCheckerModal()
          return
        }
        if (this.showRecordingsLibrary) {
          event.preventDefault()
          this.closeRecordingsLibrary()
          return
        }
        if (this.showHifzPlanModal) {
          event.preventDefault()
          this.closeHifzPlanModal()
          return
        }
        if (this.showHelpLearningModal) {
          event.preventDefault()
          this.closeHelpLearningModal()
          return
        }
        if (this.showTools) {
          event.preventDefault()
          this.closeToolsPanel()
          return
        }
        if (this.showConfirmModal) {
          event.preventDefault()
          this.closeConfirmModal()
          return
        }
        if (this.showSessionExitModal) {
          event.preventDefault()
          this.closeSessionExitModal()
          return
        }
        if (this.showSessionEndedModal) {
          event.preventDefault()
          this.closeSessionEndedModal()
          return
        }
        if (this.showPlannerModal) {
          event.preventDefault()
          this.showPlannerModal = false
          return
        }
      }

      if (event.key === ' ' || event.code === 'Space') {
        if (this.blurModeEnabled) {
          event.preventDefault()
          this.blurPeekHoldingSpace = true
          return
        }
        event.preventDefault()
        if (this.audioElement?.src) this.togglePlay()
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        if (this.plannerKeyboardActive) {
          this.submitPlanner()
          return
        }
        const verse = this.verses[this.activeVerseIndex >= 0 ? this.activeVerseIndex : 0]
        if (verse) this.playVerse(verse)
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        this.navigateKeyboard(1)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        this.navigateKeyboard(-1)
        return
      }

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'j') {
        event.preventDefault()
        this.next()
        return
      }

      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'k') {
        event.preventDefault()
        this.prev()
        return
      }

      if (event.key.toLowerCase() === 'p') {
        event.preventDefault()
        this.playCurrentVerse()
        return
      }

      if (event.key === 'Home') {
        event.preventDefault()
        this.jumpToVerseIndex(0)
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        this.jumpToVerseIndex(this.verses.length - 1)
        return
      }

      if (this.readingViewMode === 'mushaf' && (event.key === 'PageDown' || event.key === ']')) {
        event.preventDefault()
        this.goToNextMushafPage()
        return
      }

      if (this.readingViewMode === 'mushaf' && (event.key === 'PageUp' || event.key === '[')) {
        event.preventDefault()
        this.goToPreviousMushafPage()
        return
      }

      // Add inside handleGlobalKeydown after the existing shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (this.hasVerses) {
          this.saveCurrentSession()
          this.showBanner(this.t('toasts.sessionSavedWithCtrlS'), 'success', 1500)
        }
        return
      }
    },
    handleGlobalKeyup(event) {
      if (event.key === ' ' || event.code === 'Space') {
        this.blurPeekHoldingSpace = false
      }
    },

    navigateKeyboard(direction) {
      if (this.plannerKeyboardActive) {
        const nextValue = Math.max(1, Math.min(this.plannerConfig.totalVersesInSurah || 286, (this.plannerConfig.versesPerDay || 1) + direction))
        this.plannerConfig.versesPerDay = nextValue
        this.validateVersesPerDay()
        return
      }

      const collection = this.verses
      if (!collection.length) return

      let nextIndex = this.activeVerseIndex
      if (nextIndex < 0) nextIndex = 0
      else nextIndex = Math.max(0, Math.min(collection.length - 1, nextIndex + direction))

      const verse = this.verses[nextIndex]
      if (!verse) return
      this.setActiveVerse(verse.key)
    },
    jumpToVerseIndex(index) {
      const collection = this.verses
      if (!collection.length) return
      const targetIndex = Math.max(0, Math.min(collection.length - 1, Number(index || 0)))
      const verse = collection[targetIndex]
      if (!verse) return
      this.setActiveVerse(verse.key)
    },

    handleWindowScroll() {
      if (this.scrollFrame) return
      const schedule = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : callback => window.setTimeout(callback, 16)
      this.scrollFrame = schedule(() => {
        this.scrollFrame = null
        const current = window.scrollY || 0
        const nextCollapsed = current > this.lastScrollY && current > 120
        if (this.playerCollapsed !== nextCollapsed) this.playerCollapsed = nextCollapsed
        this.lastScrollY = current
      })
    },

    buildContinueSessionPayload() {
      const mutqinSession = this.mutqinState?.sessionState || {}
      const mutqinIndex = Math.max(0, Number(mutqinSession.current_index || 0))
      const mutqinItem = mutqinSession.queue?.[mutqinIndex]
      const verse = mutqinItem?.ayahId || this.verses[this.activeVerseIndex >= 0 ? this.activeVerseIndex : this.queueIndex]?.key || this.activeVerseKey
      const source = this.currentMode === 'beginner' ? this.beginner : this.advanced
      return {
        timestamp: Date.now(),
        mode: this.currentMode,
        tab: this.tab,
        activeKey: verse || null,
        activeVerseKey: mutqinItem?.ayahId || this.activeVerseKey || null,
        queueIndex: this.queueIndex || 0,
        mutqinSessionIndex: mutqinIndex,
        mutqinPhase: mutqinItem?.phase || mutqinSession.phase || 'Takrar',
        currentTime: this.currentTime || 0,
        duration: this.duration || 0,
        isPlaying: !!this.isPlaying,
        playerVisible: !!this.playerVisible,
        audioSrc: this.audioElement?.currentSrc || '',
        config: this.cloneModeState(source)
      }
    },

    persistContinueSession() {
      if (this.isBootstrapping) return
      if (this.sessionCompleted || this.mutqinState?.sessionState?.completed || !this.mutqinState?.sessionState?.active) {
        this.clearExitSessionStorage()
        return
      }
      try {
        const payload = this.buildContinueSessionPayload()
        if (!payload?.config?.chapterId || !payload?.activeVerseKey) {
          this.clearExitSessionStorage()
          return
        }
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue('continueSession', payload)
        } else {
          localStorage.setItem('telawa.continueSession', JSON.stringify(payload))
        }
      } catch (e) { console.error(e) }
    },

    readPersistedSessionStateForMode(mode) {
      try {
        return this.learningBackendEnabled()
          ? this.readWorkspaceStateValue(`sessionState:${mode}`, null)
          : (() => {
            const raw = localStorage.getItem(SESSION_STORAGE_KEYS[mode])
            return raw ? JSON.parse(raw) : null
          })()
      } catch {
        return null
      }
    },

    buildFallbackContinueSessionPayload() {
      const audioState = this.learningBackendEnabled()
        ? this.readWorkspaceStateValue('audioState', null)
        : (() => {
          try {
            return JSON.parse(localStorage.getItem('telawa.audioState') || 'null')
          } catch {
            return null
          }
        })()
      const modeOrder = ['planner', 'beginner', 'advanced']
      const candidates = modeOrder.map(mode => {
        const config = this.cloneModeState(this.getModeStore(mode) || {})
        if (!config?.chapterId) return null
        const sessionState = this.readPersistedSessionStateForMode(mode)
        const rangeStart = Math.max(1, Number(config.rangeStart || 1))
        const rangeEnd = Math.max(rangeStart, Number(config.rangeEnd || rangeStart))
        const queueIndex = Math.max(0, Number(sessionState?.queueIndex ?? config.queueIndex ?? 0))
        const fallbackAyah = Math.min(rangeEnd, rangeStart + queueIndex)
        const activeVerseKey = sessionState?.activeVerseKey
          || sessionState?.activeKey
          || config.activeKey
          || `${config.chapterId}:${fallbackAyah}`
        const hasRecoverableProgress = queueIndex > 0
          || !!activeVerseKey
          || Number(audioState?.currentTime || 0) > 0
        if (!hasRecoverableProgress) return null
        return {
          timestamp: Number(sessionState?.timestamp || Date.now()),
          mode,
          tab: 'tools',
          activeKey: activeVerseKey,
          activeVerseKey,
          queueIndex,
          currentTime: Number(audioState?.currentTime || 0),
          duration: Number(this.duration || 0),
          isPlaying: false,
          playerVisible: !!audioState?.playerVisible,
          audioSrc: audioState?.src || '',
          config: {
            ...config,
            chapterId: Number(config.chapterId || 0),
            rangeStart,
            rangeEnd,
            speed: Number(config.speed || audioState?.speed || 1)
          }
        }
      }).filter(Boolean)

      if (!candidates.length) return null
      candidates.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
      return candidates[0]
    },

    loadContinueSessionPrompt() {
      try {
        this.hasContinueSession = false
        this.continueSessionPayload = null
        this.continueSessionLabel = ''
        const persistedContinue = this.learningBackendEnabled()
          ? this.readWorkspaceStateValue('continueSession', null)
          : (() => {
            const raw = localStorage.getItem('telawa.continueSession')
            return raw ? JSON.parse(raw) : null
          })()
        const persistedAudioState = this.learningBackendEnabled()
          ? this.readWorkspaceStateValue('audioState', null)
          : (() => {
            const raw = localStorage.getItem('telawa.audioState')
            return raw ? JSON.parse(raw) : null
          })()
        const mutqinSession = this.mutqinState?.sessionState
        if (mutqinSession?.completed || this.sessionCompleted || this.centralSession?.sessionStatus === 'completed') {
          this.clearExitSessionStorage()
          return
        }
        if (mutqinSession?.active && mutqinSession?.config?.chapterId) {
          const activeItem = mutqinSession.queue?.[mutqinSession.current_index || 0]
          const restoredQueueIndex = Math.max(0, Number(mutqinSession.current_index || 0) - 1)
          this.continueSessionPayload = {
            timestamp: mutqinSession.updated_at ? Date.parse(mutqinSession.updated_at) : Date.now(),
            mode: mutqinSession.mode || 'beginner',
            tab: mutqinSession.mode || 'beginner',
            activeKey: activeItem?.ayahId || null,
            activeVerseKey: activeItem?.ayahId || null,
            queueIndex: restoredQueueIndex,
            mutqinSessionIndex: Number(mutqinSession.current_index || 0),
            mutqinPhase: activeItem?.phase || mutqinSession.phase || 'Takrar',
            currentTime: Number(persistedContinue?.currentTime ?? persistedAudioState?.currentTime ?? 0),
            duration: Number(persistedContinue?.duration ?? this.duration ?? 0),
            isPlaying: typeof persistedContinue?.isPlaying === 'boolean'
              ? persistedContinue.isPlaying
              : !!persistedAudioState?.isPlaying,
            playerVisible: typeof persistedContinue?.playerVisible === 'boolean'
              ? persistedContinue.playerVisible
              : !!persistedAudioState?.playerVisible,
            audioSrc: persistedContinue?.audioSrc || persistedAudioState?.src || '',
            config: mutqinSession.config
          }
          this.hasContinueSession = true
          const chapterName = this.chapters.find(c => Number(c.id) === Number(mutqinSession.config.chapterId))?.name_simple || 'Saved session'
          this.continueSessionLabel = `${chapterName} · Ayahs ${mutqinSession.config.rangeStart}-${mutqinSession.config.rangeEnd}`
          return
        }
        const payload = persistedContinue || this.buildFallbackContinueSessionPayload()
        if (!payload) return
        if (!payload?.config?.chapterId || payload.completed || payload.sessionStatus === 'completed') {
          this.clearExitSessionStorage()
          return
        }
        this.continueSessionPayload = payload
        this.hasContinueSession = true
        const chapterName = this.chapters.find(c => Number(c.id) === Number(payload.config.chapterId))?.name_simple || 'Saved session'
        this.continueSessionLabel = `${chapterName} · Ayahs ${payload.config.rangeStart}-${payload.config.rangeEnd}`
      } catch (e) { console.error(e) }
    },

    async continueLastSession() {
      const payload = this.continueSessionPayload
      if (!payload) return
      this.startingFreshSessionSelection = false
      this.hasContinueSession = false
      this.showResumeModal = false
      this.returningUserChoicePending = false
      if (!payload.config?.chapterId) {
        this.clearContinueSession()
        return
      }
      await this.hydrateSessionFromPayload(payload, {
        bannerText: 'Session restored',
        forcePlayback: false
      })
      this.$nextTick(() => {
        if (this.effectiveActiveVerseKey) {
          const el = document.querySelector(`.verse-card[data-verse-key="${this.effectiveActiveVerseKey}"]`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
      this.showCountdown(() => {
        this.resumePlaybackFromRestoredState()
      })
    },
    toggleSessionEndedMetaCard(key = '') {
      if (!key) return
      this.sessionEndedMetaCollapsed = {
        ...(this.sessionEndedMetaCollapsed || {}),
        [key]: !this.sessionEndedMetaCollapsed?.[key]
      }
    },
    isSessionEndedMetaCardCollapsed(key = '') {
      return !!this.sessionEndedMetaCollapsed?.[key]
    },

    restoreAudioState() {
      try {
        this.restoredAudioState = this.learningBackendEnabled()
          ? this.readWorkspaceStateValue('audioState', null)
          : JSON.parse(localStorage.getItem('telawa.audioState') || 'null')
      } catch (e) { console.error(e) }
    },

    applyRestoredAudioState(options = {}) {
      const state = this.restoredAudioState
      if (!state || !this.audioElement || !state.src) return
      const autoplay = typeof options.autoplay === 'boolean' ? options.autoplay : !!state.isPlaying
      const onAutoplayBlocked = typeof options.onAutoplayBlocked === 'function' ? options.onAutoplayBlocked : null
      const activeAudio = this.activeVerseRef?.audio ? this.normalizeAudioUrl(this.activeVerseRef.audio) : ''
      const restoredAudio = this.normalizeAudioUrl(state.src)
      if (activeAudio && restoredAudio && activeAudio !== restoredAudio) return
      this.audioElement.src = state.src
      this.audioElement.load()
      this.playerVisible = !!state.playerVisible
      this.currentTime = Number(state.currentTime || 0)
      const restoredSpeed = this.normalizePlaybackSpeed(state.speed || this.speed || 1)
      this.speed = restoredSpeed
      const seekOnLoad = () => {
        try {
          this.audioElement.currentTime = Number(state.currentTime || 0)
          this.audioElement.defaultPlaybackRate = restoredSpeed
          this.audioElement.playbackRate = restoredSpeed
          if (autoplay) {
            this.audioElement.play().then(() => {
              this.isPlaying = true
            }).catch(() => {
              if (onAutoplayBlocked) onAutoplayBlocked()
            })
          }
        } catch (e) { }
        this.audioElement.removeEventListener('loadedmetadata', seekOnLoad)
      }
      this.audioElement.addEventListener('loadedmetadata', seekOnLoad)
    },

    buildSessionExitSnapshot() {
      return {
        mode: this.currentMode,
        tab: this.tab,
        activeVerseKey: this.effectiveActiveVerseKey || this.activeVerseKey || null,
        activeKey: this.activeKey || null,
        queueIndex: Math.max(0, Number(this.queueIndex || 0)),
        playerVisible: !!this.playerVisible,
        isPlaying: !!this.isPlaying,
        currentTime: Number(this.audioElement?.currentTime || this.currentTime || 0),
        speed: Number(this.speed || 1),
        audioSrc: this.audioElement?.currentSrc || '',
        blurModeEnabled: !!this.blurModeEnabled,
        blurIntensity: Number(this.blurIntensity || 10),
        blurPeekHoldingSpace: !!this.blurPeekHoldingSpace,
        hoverPeekVerseKey: this.hoverPeekVerseKey || null,
        touchPeekVerseKey: this.touchPeekVerseKey || null
      }
    },

    openSessionExitModal() {
      if (!this.hasVerses && !this.playerVisible) return
      this.flushPlaybackTime()
      this.sessionExitSnapshot = this.buildSessionExitSnapshot()
      this.sessionExitPreviewSnapshot = this.buildSessionEndedSnapshot({ force: true })
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause()
      }
      this.isPlaying = false
      this.showSessionExitModal = true
    },

    restoreSessionFromSnapshot(snapshot, options = {}) {
      if (!snapshot) return
      const { autoplay = true } = options
      this.currentMode = snapshot.mode || this.currentMode
      this.tab = snapshot.tab || this.tab
      this.blurModeEnabled = !!snapshot.blurModeEnabled
      this.blurIntensity = Number(snapshot.blurIntensity || this.blurIntensity || 10)
      this.blurPeekHoldingSpace = !!snapshot.blurPeekHoldingSpace
      this.hoverPeekVerseKey = snapshot.hoverPeekVerseKey || null
      this.touchPeekVerseKey = snapshot.touchPeekVerseKey || null

      if (snapshot.activeVerseKey) {
        this.setActiveVerse(snapshot.activeVerseKey, {
          mode: snapshot.mode || this.currentMode,
          queueIndex: Number(snapshot.queueIndex || 0),
          scroll: false
        })
      }

      this.playerVisible = !!snapshot.playerVisible
      this.currentTime = Number(snapshot.currentTime || 0)
      this.speed = Number(snapshot.speed || this.speed || 1)
      this.restoredAudioState = {
        src: snapshot.audioSrc || '',
        currentTime: Number(snapshot.currentTime || 0),
        playerVisible: !!snapshot.playerVisible,
        speed: Number(snapshot.speed || this.speed || 1),
        isPlaying: !!snapshot.isPlaying
      }
      this.$nextTick(() => {
        this.applyRestoredAudioState({ autoplay })
      })
    },

    restoreSessionExitSnapshot(options = {}) {
      const snapshot = this.sessionExitSnapshot
      if (!snapshot) return
      this.restoreSessionFromSnapshot(snapshot, options)
    },

    resumePlaybackFromRestoredState() {
      if (this.restoredAudioState?.src) {
        this.applyRestoredAudioState({
          autoplay: true,
          onAutoplayBlocked: () => this.promptTapToPlay()
        })
        return
      }
      const entry = this.queue?.[this.queueIndex]
      if (entry) this.playQueueEntry(entry, { force: true, queueIndex: this.queueIndex })
    },

    continueSessionFromExitModal() {
      const snapshot = this.sessionExitSnapshot
      this.showSessionExitModal = false
      this.sessionExitPreviewSnapshot = null
      if (!snapshot) return
      this.restoreSessionFromSnapshot(snapshot, { autoplay: false })
      this.showCountdown(() => {
        this.resumePlaybackFromRestoredState()
      })
    },

    prepareRangeRestart() {
      const mode = this.currentMode
      const store = this.getModeStore(mode)
      const firstVerseKey = store?.verses?.[0]?.key || this.verses?.[0]?.key || null
      if (store) {
        store.queueIndex = 0
        store.activeKey = firstVerseKey
      }
      this.queueIndex = 0
      this.activeVerseKey = firstVerseKey
      this.activeKey = firstVerseKey
      this.currentTime = 0
      this.duration = 0
      this.restoredAudioState = null
      if (this.audioElement) {
        try {
          this.audioElement.pause()
          this.audioElement.currentTime = 0
          this.audioElement.removeAttribute('src')
          this.audioElement.load()
        } catch {}
      }
      if (firstVerseKey) {
        this.setActiveVerse(firstVerseKey, { mode, queueIndex: 0, scroll: false })
      }
    },

    closeSessionExitModal(options = {}) {
      const { restore = true } = options
      this.showSessionExitModal = false
      if (restore) {
        this.restoreSessionExitSnapshot()
      } else {
        this.sessionExitSnapshot = null
      }
      this.sessionExitPreviewSnapshot = null
    },

    clearExitSessionStorage() {
      try {
        if (this.learningBackendEnabled()) {
          this.deleteWorkspaceStateValue('continueSession')
          this.deleteWorkspaceStateValue('audioState')
        } else {
          localStorage.removeItem('telawa.continueSession')
          localStorage.removeItem('telawa.audioState')
        }
      } catch (error) {
        console.error('Failed to clear exit-session storage:', error)
      }
      this.hasContinueSession = false
      this.continueSessionPayload = null
      this.continueSessionLabel = ''
    },
    buildSessionEndedSnapshot(options = {}) {
      const { force = false } = options
      if (!force && !this.hasMeaningfulSessionCompletionData) return null

      const chapterName = this.currentChapter?.name_simple || this.activeChapterName || ''
      const rangeStart = Math.max(1, Number(this.rangeStart || 1))
      const rangeEnd = Math.max(rangeStart, Number(this.rangeEnd || rangeStart))
      const coveredAyah = Math.max(1, Number(this.currentPosition || this.queueIndex || 1))
      const totalAyahs = Math.max(1, Number(this.totalVerses || 1))
      const progressPercent = Math.max(0, Math.min(100, Number(this.progressPercent || 0)))
      const durationSeconds = this.sessionStartedAt
        ? Math.max(0, Math.round((Number(this.statsTick || Date.now()) - Number(this.sessionStartedAt)) / 1000))
        : Math.max(0, Math.round(Number(this.currentTime || 0)))
      const activeAids = []
      if (this.tajweedEnabled) activeAids.push(this.t('memorisation.common.tajweedOn'))
      if (this.showTranslation) activeAids.push(this.t('memorisation.common.translationOn'))
      if (this.showTransliteration) activeAids.push(this.t('memorisation.common.transliterationOn'))
      if (this.showWordByWord) activeAids.push(this.t('memorisation.common.wordByWordOn'))
      if (this.wordByWordAudioEnabled) activeAids.push(this.t('memorisation.common.wordAudioOn'))
      const activeMethods = []
      if (this.focusModeEnabled) activeMethods.push('Focus mode')
      if (this.blurModeEnabled) activeMethods.push('Blur mode')
      if (this.chainingEnabled) activeMethods.push(this.t('memorisation.common.chainingLabel', { method: this.chainingMethod || 'Standard' }))
      const repeatCount = Number(this.repeatCount || 1)
      const repeatSummary = `${repeatCount}x`
      const repeatShortLabel = `${this.repeatCount || 1}x`
      const displaySummary = activeAids.join(', ')
      const pacingSummary = activeMethods.join(', ')
      const completedAll = coveredAyah >= totalAyahs && progressPercent >= 100
      const durationLabel = this.formatTime(durationSeconds)
      const rangeLabel = chapterName
        ? this.t('memorisation.common.rangeLabel', { start: rangeStart, end: rangeEnd })
        : ''
      const summaryMessage = completedAll
        ? this.t('memorisation.summary.completedAll', { count: totalAyahs })
        : this.t('memorisation.summary.endedPartial', { ayah: coveredAyah, percent: progressPercent })
      const detailMessage = completedAll
        ? this.t('memorisation.summary.completedRangeDetail', { covered: coveredAyah, total: totalAyahs, duration: durationLabel })
        : this.t('memorisation.summary.endedProgress', { covered: coveredAyah, total: totalAyahs })
      return {
        chapterName,
        rangeLabel,
        progressLabel: `${coveredAyah}/${totalAyahs}`,
        progressPercent,
        completedAll,
        durationLabel,
        summaryMessage,
        detailMessage,
        coveredAyahCount: coveredAyah,
        totalAyahs,
        lastAyahLabel: coveredAyah,
        modeSummary: this.sessionTypeInfo?.label ? this.t('memorisation.common.modeLabel', { label: this.sessionTypeInfo.label }) : '',
        repeatSummary,
        repeatShortLabel,
        displaySummary,
        pacingSummary,
        activeAids,
        activeMethods,
        nextSteps: completedAll
          ? [
              this.t('memorisation.summary.nextAdvance'),
              this.t('memorisation.summary.nextRepeat'),
              this.t('memorisation.summary.nextReviewWeak')
            ]
          : [
              this.t('memorisation.summary.nextContinue'),
              this.t('memorisation.summary.nextRepeat'),
              this.t('memorisation.summary.nextReduceAids')
            ]
      }
    },
    showSessionEndedSummary(snapshot = null) {
      this.sessionEndedSnapshot = null
      this.sessionExitSnapshot = null
      this.sessionExitPreviewSnapshot = snapshot || this.buildSessionEndedSnapshot({ force: true })
      if (!this.sessionExitPreviewSnapshot) return
      this.showSessionEndedModal = false
      this.showTools = false
      this.showSessionExitModal = true
    },
    closeSessionEndedModal() {
      this.showSessionEndedModal = false
    },

    finalizePlannerSessionProgress() {
      if (this.currentMode !== 'planner' || !this.hifzPlan || !Array.isArray(this.appState?.todaySession) || !this.appState.todaySession.length) {
        return
      }
      const coveredCount = Math.max(0, Math.min(this.appState.todaySession.length, Number(this.currentPosition || 0)))
      const coveredItems = this.appState.todaySession.slice(0, coveredCount)
      if (!coveredCount) {
        this.persistHifzAppState({
          mode: 'planner',
          sessionActive: false,
          activePlanId: this.hifzPlan?.id || null,
          todaySession: this.appState.todaySession,
          plannerReady: true,
          lastEvent: 'SESSION_ENDED'
        })
        return
      }

      const score = this.queueIndex >= Math.max((this.queue?.length || 1) - 1, 0) ? 1 : 0.5
      coveredItems.forEach(item => {
        updateAyahProgress(item.surah, item.ayah, score)
      })
      const completedNewAyahs = coveredItems.filter(item => item?.type === 'new').length

      const summary = {
        ...(this.hifzPlan.progressSummary || {}),
        firstSessionCompletedAt: this.hifzPlan.progressSummary?.firstSessionCompletedAt || new Date().toISOString(),
        lastSessionCompletedAt: new Date().toISOString(),
        completedSessions: Number(this.hifzPlan.progressSummary?.completedSessions || 0) + 1
      }
      this.persistHifzPlan({
        ...this.hifzPlan,
        progressSummary: summary
      })
      this.persistHifzAppState({
        mode: 'planner',
        sessionActive: false,
        activePlanId: this.hifzPlan?.id || null,
        todaySession: this.appState.todaySession,
        progress: {
          completedAyahs: this.hifzCompletedAyahCount + completedNewAyahs
        },
        plannerReady: true,
        lastEvent: 'SESSION_ENDED'
      })
      this.refreshHifzJourneyState()
    },

    finishSessionCleanup() {
      this.finalizePlannerSessionProgress()
      this.closePlayer()
      this.clearTouchPeek()
      this.blurPeekHoldingSpace = false
      this.hoverPeekVerseKey = null
      this.touchPeekVerseKey = null
      this.stopWordHighlighting()

      const store = this.getModeStore(this.currentMode)
      const firstKey = this.verses[0]?.key || null
      store.queue = []
      store.queueIndex = 0
      store.activeKey = firstKey
      store.sessionActive = false

      this.queue = []
      this.queueIndex = 0
      this.activeVerseKey = null
      this.activeKey = firstKey
      this.playerVisible = false
      this.isPlaying = false
      this.currentTime = 0
      this.duration = 0
      this.sessionStartedAt = 0
      this.sessionCompleted = true
      this.sessionCompletedAt = this.sessionCompletedAt || new Date().toISOString()

      if (this.mutqinState?.sessionState) {
        this.mutqinState.sessionState.active = false
        this.mutqinState.sessionState.queue = []
        this.mutqinState.sessionState.current_index = 0
        this.mutqinState.sessionState.completed = true
        this.mutqinState.sessionState.completed_at = this.sessionCompletedAt
      }

      this.clearExitSessionStorage()
      this.persistModeState(this.currentMode)
      this.persistUiState()
      this.persistCentralSessionState()
    },

    exitSessionAnyway() {
      this.closeSessionExitModal({ restore: false })
      this.finishSessionCleanup()
      this.showSessionEndedSummary(this.buildSessionEndedSnapshot({ force: true }))
    },

    confirmSessionExit(options = {}) {
      const { showSummary = true } = options
      const endedSnapshot = this.sessionExitPreviewSnapshot || this.buildSessionEndedSnapshot({ force: true })
      this.closeSessionExitModal({ restore: false })
      this.centralSession.repetitionTimes = Math.max(0, Number(this.centralSession.repetitionTimes || 0)) + 1
      this.centralSession.sessionStatus = 'completed'
      this.centralSession.sessionCompletedAt = new Date().toISOString()
      completeMutqinSession(this.mutqinState)
      this.addActivityEvent({ ts: Date.now(), type: 'session_complete' })
      this.recomputeAnalytics()
      this.finishSessionCleanup()
      if (showSummary) {
        this.showSessionEndedSummary(endedSnapshot)
      }
      return endedSnapshot
    },
    exitSessionToNewSession() {
      if (!this.hasSessionStarted && this.isSessionCompleted) {
        this.closeSessionExitModal({ restore: false })
        this.openNewSessionSetup()
        return
      }
      this.confirmSessionExit({ showSummary: false })
      this.openNewSessionSetup()
    },
    exitSessionToRepeatRange() {
      if (!this.hasSessionStarted && this.isSessionCompleted) {
        this.closeSessionExitModal({ restore: false })
        this.prepareRangeRestart()
        this.startSessionAfterUserGesture()
        return
      }
      this.confirmSessionExit({ showSummary: false })
      this.prepareRangeRestart()
      this.startSessionAfterUserGesture()
    },
    exitSessionToSaveSession() {
      if (!this.hasSessionStarted && this.isSessionCompleted) {
        this.closeSessionExitModal({ restore: false })
        this.saveCurrentSessionWithName()
        return
      }
      this.confirmSessionExit({ showSummary: false })
      this.saveCurrentSessionWithName()
    },
    exitSessionToRetentionCheck() {
      if (!this.hasSessionStarted && this.isSessionCompleted) {
        this.closeSessionExitModal({ restore: false })
        this.openRetentionQuiz()
        return
      }
      this.confirmSessionExit({ showSummary: false })
      this.openRetentionQuiz()
    },
    openNewSessionFromEndedModal() {
      this.closeSessionEndedModal()
      this.openNewSessionSetup()
    },
    saveSessionFromEndedModal() {
      this.closeSessionEndedModal()
      this.saveCurrentSessionWithName()
    },
    reviewInsightsFromEndedModal() {
      this.closeSessionEndedModal()
      this.openInsightsPanel()
    },
    resetRangeFromEndedModal() {
      this.closeSessionEndedModal()
      this.repeatSessionFromEndedModal()
    },
    runSessionEndedCard(cardKey) {
      if (cardKey === 'review-insights') {
        this.reviewInsightsFromEndedModal()
        return
      }
      if (cardKey === 'save-session') {
        this.saveSessionFromEndedModal()
        return
      }
      if (cardKey === 'reset-range') {
        this.resetRangeFromEndedModal()
        return
      }
      if (cardKey === 'create-session') {
        this.openNewSessionFromEndedModal()
      }
    },
    repeatSessionFromEndedModal() {
      this.closeSessionEndedModal()
      this.prepareRangeRestart()
      this.startSessionAfterUserGesture()
    },

    openConfirmModal(options) {
      this.confirmModal = {
        title: options.title || 'Confirm action',
        message: options.message || '',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        tone: options.tone || 'default',
        action: options.action || '',
        data: options.data || null
      }
      this.showPlannerModal = false
      this.showResumeModal = false
      this.showTools = false
      this.showConfirmModal = true
    },

    closeConfirmModal() {
      this.showConfirmModal = false
      this.confirmModal.action = ''
      this.confirmModal.data = null
      this.pendingDeleteId = ''
      this.pendingRecordingDeleteId = ''
    },

    runConfirmAction() {
      const action = this.confirmModal.action
      const actionData = this.confirmModal.data
      this.closeConfirmModal()
      if (action === 'reset-session') this.performResetControls()
      if (action === 'switch-mode') this.performToggleMode()
      if (action === 'delete-offline' && this.pendingDeleteId) this.performDeleteOffline()
      if (action === 'discard-continue') this.clearContinueSession()
      if (action === 'delete-saved-session' && actionData?.sessionId) this.performDeleteSavedSession(actionData.sessionId)
      if (action === 'delete-recording' && actionData?.recordingId) this.deleteRecording(actionData.recordingId)
      if (action === 'delete-pending-recitation-check') this.performDeleteRecitationCheckAttempt(actionData?.attemptId)
    },

    confirmDiscardContinueSession() {
      this.openConfirmModal({
        title: 'Discard saved session?',
        message: 'This removes the current continue-where-you-left-off snapshot from this device.',
        confirmLabel: 'Discard',
        tone: 'danger',
        action: 'discard-continue'
      })
    },

    clearContinueSession() {
      this.hasContinueSession = false
      this.continueSessionPayload = null
      this.continueSessionLabel = ''
      try {
        if (this.learningBackendEnabled()) {
          this.deleteWorkspaceStateValue('continueSession')
        } else {
          localStorage.removeItem('telawa.continueSession')
        }
      } catch (e) { console.error(e) }
      this.showBanner(this.t('toasts.savedSessionDismissed'), 'info', 1800)
    },

    renderMiniTrend(values = []) {
      const width = 84
      const height = 24
      const max = Math.max(...values, 1)
      const barWidth = 8
      const gap = 4
      return values.map((value, index) => {
        const x = index * (barWidth + gap)
        const h = Math.max(3, (value / max) * height)
        const y = height - h
        return `<span style="left:${x}px;height:${h}px;top:${y}px"></span>`
      }).join('')
    },

    updateMasteredWeekly() {
      const today = new Date()
      const dayKey = today.toISOString().slice(0, 10)
      let state = this.readScopedStorageValue('masteredWeekly', 'telawa.masteredWeekly', null)
      if (!state || !Array.isArray(state.series) || state.series.length !== 7) {
        state = { dayKey, lastTotal: Number(this.analytics.versesMastered || 0), series: [0, 0, 0, 0, 0, 0, 0] }
      }
      if (state.dayKey !== dayKey) {
        state.series.shift()
        state.series.push(0)
        state.dayKey = dayKey
        state.lastTotal = Number(this.analytics.versesMastered || 0)
      }
      const current = Number(this.analytics.versesMastered || 0)
      const delta = Math.max(0, current - Number(state.lastTotal || 0))
      if (delta > 0) {
        state.series[state.series.length - 1] += delta
        state.lastTotal = current
      }
      this.writeScopedStorageValue('masteredWeekly', 'telawa.masteredWeekly', state)
    },

    normalizePlaybackSpeed(value = this.speed) {
      const numeric = Number(value)
      return this.speedOptions.includes(numeric) ? numeric : 1
    },

    setPlaybackSpeed(newSpeed) {
      const safeSpeed = this.normalizePlaybackSpeed(newSpeed)
      const currentTime = Number(this.audioElement?.currentTime || this.currentTime || 0)
      this.speed = safeSpeed
      if (this.audioElement) {
        this.audioElement.defaultPlaybackRate = safeSpeed
        this.audioElement.playbackRate = safeSpeed
        if (Number.isFinite(currentTime)) this.audioElement.currentTime = currentTime
      }
      this.currentTime = currentTime
      this.centralSession.audio.speed = safeSpeed
      this.centralSession.audio.currentTime = currentTime
      if (this.wordByWordAudioEnabled && this.activeVerseRef) {
        this.syncWordHighlightFromAudio(this.activeVerseRef)
        if (this.isPlaying) this.queueWordHighlightFrame(this.activeVerseRef)
      }
      this.persistUiState()
      this.persistCentralSessionState()
      this.showBanner(this.t('toasts.speedChangedToX', { p0: safeSpeed }), 'info', 1000)
    },

    setActiveTab(tabName) {
      // Validate tab name
      const validTabs = ['tools', 'techniques', 'saved', 'stats', 'settings']
      if (!validTabs.includes(tabName)) {
        console.warn(`Invalid tab: ${tabName}, defaulting to tools`)
        this.tab = 'tools'
      } else {
        this.tab = tabName
      }

      // Force re-render if needed
      if (this.tab === 'settings') {
        this.syncSettingsDraft()
      }
      if (this.tab === 'saved') {
        this.loadSavedSessions()
        this.loadRecordingsLibrary()
      }
      if (this.tab === 'stats') {
        this.loadSavedSessions()
        if (!this.selectedStatsSessionId && this.savedSessions[0]?.id) {
          this.selectedStatsSessionId = this.savedSessions[0].id
        }
      }

      // Store and persist
      this.centralSession.activeTab = this.tab
      this.persistCentralSessionState()

      // Scroll to top of panel content
      this.$nextTick(() => {
        const panelBody = this.$refs.toolsBody
        if (panelBody) {
          panelBody.scrollTop = 0
        }
      })
    },

    scrollToWorkspaceMain() {
      const target = this.$refs.workspaceMain || document.getElementById('memorisationWorkspaceMain')
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },

    reconcilePersistedSessionCompletion() {
      if (!this.isSessionCompleted) return
      const hasSnapshot = !!(this.sessionEndedSnapshot && Object.keys(this.sessionEndedSnapshot).length)
      if (hasSnapshot) return

      // A completed flag can survive in localStorage without the in-memory
      // summary that powers the completion screen, which leaves the workspace blank.
      this.sessionCompleted = false
      this.sessionCompletedAt = null
      if (this.centralSession) {
        this.centralSession.sessionStatus = 'idle'
        this.centralSession.sessionCompletedAt = null
      }
      if (this.mutqinState?.sessionState) {
        this.mutqinState.sessionState.completed = false
        this.mutqinState.sessionState.completed_at = null
      }
    },

    loadCentralSessionState() {
      try {
        const saved = this.learningBackendEnabled()
          ? this.readWorkspaceStateValue('centralSession', null)
          : (() => {
            const raw = localStorage.getItem(CENTRAL_SESSION_STORAGE_KEY)
            return raw ? JSON.parse(raw) : null
          })()
        if (!saved) return
        let uiChaining = null
        try {
          const uiState = this.learningBackendEnabled()
            ? this.readWorkspaceStateValue('uiState', null)
            : JSON.parse(localStorage.getItem('telawa.uiState') || 'null')
          if (uiState && ['linking', 'cumulative'].includes(uiState.chainingMethod)) {
            uiChaining = {
              enabled: uiState.chainingEnabled ?? this.chainingEnabled,
              method: uiState.chainingMethod,
              repetitions: Math.max(1, Math.min(5, Number(uiState.chainingRepetitions || this.chainingRepetitions || 1)))
            }
          }
        } catch { }
        this.centralSession = {
          ...createCentralSessionState(),
          ...saved,
          chaining: {
            ...createCentralSessionState().chaining,
            ...(saved.chaining || {}),
            ...(uiChaining || {})
          },
          audio: {
            ...createCentralSessionState().audio,
            ...(saved.audio || {})
          }
        }
        // Update to include 'techniques' as valid tab
        this.tab = ['tools', 'techniques', 'saved', 'stats', 'settings'].includes(this.centralSession.activeTab)
          ? this.centralSession.activeTab
          : 'tools'
        this.tajweedEnabled = !!this.centralSession.tajweedEnabled
        this.focusModeEnabled = !!this.centralSession.focusModeEnabled
        this.blurModeEnabled = !!this.centralSession.blurModeEnabled
        this.blurIntensity = Math.max(4, Math.min(18, Number(this.centralSession.blurIntensity || 10)))
        this.anchorModeEnabled = !!this.centralSession.anchorModeEnabled
        this.anchorCount = Math.max(1, Math.min(2, Number(this.centralSession.anchorCount || 2)))
        if (!uiChaining) {
          this.chainingEnabled = !!this.centralSession.chaining.enabled
          this.chainingMethod = ['linking', 'cumulative'].includes(this.centralSession.chaining.method) ? this.centralSession.chaining.method : ''
          this.chainingRepetitions = Math.max(1, Math.min(5, Number(this.centralSession.chaining.repetitions || 1)))
        }
        this.speed = this.normalizePlaybackSpeed(this.centralSession.audio.speed)
        this.applySpeed()
        this.sessionCompleted = this.centralSession.sessionStatus === 'completed'
        this.sessionCompletedAt = this.centralSession.sessionCompletedAt || null
        this.reconcilePersistedSessionCompletion()
      } catch (e) {
        console.error('Failed to load central session state:', e)
      }
    },

    persistCentralSessionState() {
      if (this.isBootstrapping) return
      try {
        this.centralSession = {
          ...this.centralSession,
          // Update to include 'techniques' as valid tab
          activeTab: ['tools', 'techniques', 'saved', 'stats', 'settings'].includes(this.tab) ? this.tab : 'tools',
          sessionStatus: this.sessionCompleted ? 'completed' : (this.centralSession.sessionStatus || 'idle'),
          sessionCompletedAt: this.sessionCompletedAt || this.centralSession.sessionCompletedAt || null,
          tajweedEnabled: !!this.tajweedEnabled,
          focusModeEnabled: !!this.focusModeEnabled,
          blurModeEnabled: !!this.blurModeEnabled,
          blurIntensity: Number(this.blurIntensity || 10),
          anchorModeEnabled: !!this.anchorModeEnabled,
          anchorCount: Math.max(1, Math.min(2, Number(this.anchorCount || 2))),
          chaining: {
            ...this.centralSession.chaining,
            enabled: !!this.chainingEnabled,
            method: this.chainingMethod,
            repetitions: Math.max(1, Math.min(5, Number(this.chainingRepetitions || 1))),
            index: Math.max(0, Number(this.queueIndex || 0))
          },
          audio: {
            speed: Number(this.speed || 1),
            currentTime: Number(this.audioElement?.currentTime || this.currentTime || 0)
          }
        }
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue('centralSession', this.centralSession)
        } else {
          localStorage.setItem(CENTRAL_SESSION_STORAGE_KEY, JSON.stringify(this.centralSession))
        }
      } catch (e) {
        console.error('Failed to persist central session state:', e)
      }
    },
    // Open mode settings in offcanvas
    openModeSettings() {
      this.openToolsPanel()
    },

    // Alternative: Direct mode toggle with confirmation
    toggleTajweed() {
      this.tajweedEnabled = !this.tajweedEnabled

      this.syncSettingsDraft()
      this.persistUiState()
      this.persistCentralSessionState()

      this.showBanner(
        this.tajweedEnabled ? 'Tajweed text enabled' : 'Tajweed text disabled',
        'info',
        1500
      )
    },
    cycleQuranFontPill() {
      const options = this.quranFontOptions || []
      if (!options.length) return
      const currentIndex = Math.max(0, options.findIndex(f => f.value === this.quranFont))
      const next = options[(currentIndex + 1) % options.length]
      this.selectFont(next.value)
    },

    performToggleMode() {
      if (this.currentMode === 'planner') {
        this.currentMode = 'beginner'
        this.persistHifzAppState({ mode: 'casual', sessionActive: false, lastEvent: 'CASUAL_MODE' })
        this.tab = 'tools'
        this.persistUiState()
        this.showBanner(this.t('toasts.switchedToCasualMode'), 'success', 2000)
        return
      }
      const newMode = this.currentMode === 'beginner' ? 'advanced' : 'beginner'
      this.currentMode = newMode
      this.persistHifzAppState({ mode: 'casual', sessionActive: false, lastEvent: 'CASUAL_MODE' })
      this.tab = 'tools'
      this.persistUiState()
      this.showBanner(this.t('toasts.switchedToMode', { p0: newMode === 'beginner' ? 'Beginner' : 'Advanced' }), 'success', 2000)
    },
    updateTabAndSync(tabName) {
      this.currentMode = tabName === 'advanced' ? 'advanced' : 'beginner'
      this.persistHifzAppState({ mode: 'casual', sessionActive: false, lastEvent: 'CASUAL_MODE' })
      this.tab = 'tools'
      this.persistUiState()
    },
    setupWordClickHandler() {
      if (this.wordClickHandler) {
        document.removeEventListener('click', this.wordClickHandler)
      }
      this.wordClickHandler = (e) => {
        const wordElement = e.target.closest('.wbw-word')
        if (wordElement?.closest('.mushaf-ayah')) return
        if (wordElement) {
          const verseKey = wordElement.dataset.verseKey
          const wordIndex = parseInt(wordElement.dataset.wordIndex)
          const wordAudio = wordElement.dataset.wordAudio

          if (wordAudio) {
            const verse = this.verses.find(item => item.key === verseKey)
            this.playWordAudio(wordAudio, verse, wordIndex)
            return
          }

          const verse = this.verses.find(item => item.key === verseKey)
          this.playWordAudio('', verse, wordIndex)
        }
      }
      document.addEventListener('click', this.wordClickHandler)
    },
    handleStatsVisualTickerStateChange() {
      if (this.shouldRunStatsVisualTicker()) this.queueStatsVisualTick()
    },
    shouldRunStatsVisualTicker() {
      return !!(
        this.isSelfCheckRecording ||
        this.recitationCheckRecording ||
        this.recitationCheckPreparing ||
        this.aiMemorisationCheckerRecording ||
        this.aiMemorisationCheckerPreparing ||
        this.selfCheckPreparing ||
        (this.showSessionAnalyticsModal && this.analyticsModalRecordId)
      )
    },
    queueStatsVisualTick() {
      if (typeof window === 'undefined' || this.statsTickFrame) return

      const schedule = typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : callback => window.setTimeout(() => callback(Date.now()), 16)

      const tick = () => {
        this.statsTickFrame = null
        if (!this.shouldRunStatsVisualTicker()) {
          this.statsTickLastFrameAt = 0
          return
        }

        const now = Date.now()
        if (!this.statsTickLastFrameAt || now - this.statsTickLastFrameAt >= 1000) {
          this.statsTick = now
          this.statsTickLastFrameAt = now
        }
        this.statsTickFrame = schedule(tick)
      }

      this.statsTickFrame = schedule(tick)
    },
    cancelStatsVisualTick() {
      if (!this.statsTickFrame || typeof window === 'undefined') return
      if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(this.statsTickFrame)
      window.clearTimeout(this.statsTickFrame)
      this.statsTickFrame = null
      this.statsTickLastFrameAt = 0
    },
    getRemainingTimeDetails() {
      const remainingItems = (this.queue || []).slice(this.queueIndex)
      if (!remainingItems.length) return null

      const reviewTimePerAyah = 5
      let totalAudioSeconds = 0
      let totalReviewSeconds = 0

      remainingItems.forEach((item, index) => {
        totalAudioSeconds += this.getQueueItemAudioSeconds(item, index === 0)
        totalReviewSeconds += reviewTimePerAyah
      })

      const totalSeconds = totalAudioSeconds + totalReviewSeconds
      const minutes = Math.ceil(totalSeconds / 60)
      const audioMinutes = Math.ceil(totalAudioSeconds / 60)
      const reviewMinutes = Math.ceil(totalReviewSeconds / 60)

      return {
        totalMinutes: minutes,
        audioMinutes: audioMinutes,
        reviewMinutes: reviewMinutes,
        verseCount: remainingItems.length,
        repetitionCount: remainingItems.length
      }
    },

    getEtaTooltip() {
      const details = this.getRemainingTimeDetails()
      if (!details) return ''
      return `${details.audioMinutes} min audio + ${details.reviewMinutes} min review`
    },
    toggleFontDropdown() {
      this.fontDropdownOpen = !this.fontDropdownOpen
      if (this.fontDropdownOpen) {
        this.topCardMenuOpen = false
        this.openVerseActionKey = ''
      }
    },
    toggleTopCardMenu() {
      this.topCardMenuOpen = !this.topCardMenuOpen
      if (this.topCardMenuOpen) {
        this.openVerseActionKey = ''
        this.fontDropdownOpen = false
      }
    },
    toggleVerseActionMenu(verseKey) {
      this.openVerseActionKey = this.openVerseActionKey === verseKey ? '' : verseKey
      if (this.openVerseActionKey) {
        this.topCardMenuOpen = false
        this.fontDropdownOpen = false
      }
    },
    cycleQuranFont() {
      const options = this.quranFontOptions || []
      const index = options.findIndex(font => font.value === this.quranFont)
      const next = options[(index + 1 + options.length) % Math.max(1, options.length)]
      if (next?.value) this.setQuranFont(next.value)
      this.topCardMenuOpen = false
    },
    selectFont(fontValue) {
      this.quranFont = fontValue
      this.fontDropdownOpen = false
      this.syncSettingsDraft()
      this.persistUiState()
    },
    getCurrentFontLabel() {
      const font = this.quranFontOptions.find(f => f.value === this.quranFont)
      return font ? font.label : 'Font'
    },

    increaseTextScale(event) {
      event.stopPropagation()
      const nextScale = Math.min(1.2, Math.round((Number(this.fontScale || 1) + 0.05) * 100) / 100)
      this.fontScale = nextScale
      this.enScale = nextScale
      this.persistUiState()
      this.showBanner(this.t('toasts.textSizePercent', { percent: this.getTextScalePercent() }), 'info', 800)
    },

    decreaseTextScale(event) {
      event.stopPropagation()
      const nextScale = Math.max(0.9, Math.round((Number(this.fontScale || 1) - 0.05) * 100) / 100)
      this.fontScale = nextScale
      this.enScale = nextScale
      this.persistUiState()
      this.showBanner(this.t('toasts.textSizePercent', { percent: this.getTextScalePercent() }), 'info', 800)
    },

    resetTextScale(event) {
      event?.stopPropagation?.()
      this.fontScale = 1
      this.enScale = 1
      this.persistUiState()
      this.showBanner(this.t('toasts.textSizeReset'), 'info', 800)
    },

    resetDefaultFontSize() {
      this.defaultFontSize = 120
      this.updateDefaultFontSize()
    },

    getTextScalePercent() {
      return Math.round(Number(this.fontScale || 1) * 100)
    },

    getFontIcon(fontValue) {
      const font = this.quranFontOptions.find(f => f.value === fontValue)
      return font ? font.icon : 'bi-text-paragraph'
    },
    // Close dropdown when clicking outside
    handleClickOutside(event) {
      if (this.fontDropdownOpen && !event.target.closest('.font-dropdown')) {
        this.fontDropdownOpen = false
      }
      if (this.topCardMenuOpen && !event.target.closest('.top-card-menu-wrap')) {
        this.topCardMenuOpen = false
      }
      if (this.openVerseActionKey && !event.target.closest('.verse-menu-wrap')) {
        this.openVerseActionKey = ''
      }
    },

    adjustVersesPerDay(change) {
      const newValue = this.plannerConfig.versesPerDay + change
      if (newValue >= 1 && newValue <= this.plannerConfig.totalVersesInSurah) {
        this.plannerConfig.versesPerDay = newValue
      }
    },

    validateVersesPerDay() {
      let value = this.plannerConfig.versesPerDay
      if (isNaN(value) || value < 1) {
        this.plannerConfig.versesPerDay = 1
      } else if (value > this.plannerConfig.totalVersesInSurah) {
        this.plannerConfig.versesPerDay = this.plannerConfig.totalVersesInSurah
      }
    },

    submitPlanner() {
      if (!this.plannerConfig.surahId || this.plannerConfig.surahId === 0) {
        this.showBanner(this.t('toasts.pleaseSelectASurah'), 'warning', 2000)
        return
      }

      this.chapterId = this.plannerConfig.surahId
      this.rangeStart = 1
      this.rangeEnd = Math.min(this.plannerConfig.versesPerDay, this.plannerConfig.totalVersesInSurah)
      this.showPlannerModal = false
      this.openToolsPanel({ mode: 'beginner' })
      this.loadChapter()

      this.showBanner(
        `Plan created: ${this.plannerConfig.versesPerDay} verses/day for ${this.plannerEstimatedDays} days`,
        'success',
        3000
      )
    },

    getVerseFontSize(verseKey) {
      const size = this.verseFontSizes[verseKey] || this.defaultFontSize || 120
      // Ensure size is within bounds
      return Math.max(this.minFontSize, Math.min(this.maxFontSize, size))
    },

    updateFontSize(verseKey, newSize) {
      const clampedSize = Math.max(this.minFontSize, Math.min(this.maxFontSize, newSize))
      this.verseFontSizes = {
        ...this.verseFontSizes,
        [verseKey]: clampedSize
      }
      this.persistVerseFontSizes()
    },

    increaseVerseFont(verseKey, event) {
      event.stopPropagation()
      const currentSize = this.getVerseFontSize(verseKey)
      const newSize = Math.min(this.maxFontSize, currentSize + this.fontSizeStep)
      this.verseFontSizes = {
        ...this.verseFontSizes,
        [verseKey]: newSize
      }
      this.persistVerseFontSizes()
    },

    decreaseVerseFont(verseKey, event) {
      event.stopPropagation()
      const currentSize = this.getVerseFontSize(verseKey)
      const newSize = Math.max(this.minFontSize, currentSize - this.fontSizeStep)
      this.verseFontSizes = {
        ...this.verseFontSizes,
        [verseKey]: newSize
      }
      this.persistVerseFontSizes()
    },

    resetVerseFont(verseKey, event) {
      event.stopPropagation()
      const { [verseKey]: _, ...rest } = this.verseFontSizes
      this.verseFontSizes = rest
      this.persistVerseFontSizes()
    },

    persistVerseFontSizes() {
      try {
        this.writeScopedStorageValue('verseFontSizes', 'telawa.verseFontSizes', this.verseFontSizes)
        this.writeScopedStorageValue('defaultFontSize', 'telawa.defaultFontSize', this.defaultFontSize)
      } catch (e) {
        console.error('Failed to save font sizes:', e)
      }
    },

    loadVerseFontSizes() {
      try {
        const savedSizes = this.readScopedStorageValue('verseFontSizes', 'telawa.verseFontSizes', null)
        if (savedSizes && typeof savedSizes === 'object') {
          this.verseFontSizes = savedSizes
        }
        const savedDefault = this.readScopedStorageValue('defaultFontSize', 'telawa.defaultFontSize', null)
        if (savedDefault !== null && typeof savedDefault !== 'undefined') {
          const parsed = Number(savedDefault)
          if (Number.isFinite(parsed) && parsed > 0) {
            this.defaultFontSize = parsed
          }
        } else {
          this.defaultFontSize = 120
          this.writeScopedStorageValue('defaultFontSize', 'telawa.defaultFontSize', 120)
        }
      } catch (e) {
        console.error('Failed to load font sizes:', e)
      }
    },

    // Helper methods
    isAdjacentVerse(verse) {
      if (!verse?.key || !this.activeVerseKey) return false
      const targetParts = this.activeVerseKey.split(':')
      const verseParts = verse.key.split(':')

      if (targetParts[0] !== verseParts[0]) return false

      const targetNumber = parseInt(targetParts[1])
      const verseNumber = parseInt(verseParts[1])

      return Math.abs(verseNumber - targetNumber) === 1
    },

    async downloadOfflineVerses() {
      if (!this.verses || !this.verses.length) {
        this.showBanner(this.t('toasts.loadASurahFirstBeforeDownloading'), 'info', 3000)
        this.showTools = true
        return
      }

      try {
        let surahId = this.chapterId
        let surahName = this.currentChapter?.name_simple

        if (!surahId && this.verses[0]?.key) {
          surahId = parseInt(this.verses[0].key.split(':')[0])
          const found = this.chapters.find(c => c.id === surahId)
          surahName = found?.name_simple || 'Selected surah'
        }

        if (!surahId) {
          this.showBanner(this.t('toasts.couldNotIdentifySurah'), 'error', 3000)
          return
        }

        const storageKey = `offline_surah_${surahId}_${this.rangeStart}_${this.rangeEnd}`
        const offlineData = {
          metadata: {
            surah: surahName,
            surahId: surahId,
            rangeStart: this.rangeStart,
            rangeEnd: this.rangeEnd,
            reciterId: this.reciterId,
            downloadedAt: new Date().toISOString(),
            totalVerses: this.verses.length
          },
          verses: this.verses
        }

        this.writeScopedStorageValue(`offlineSurah:${storageKey}`, storageKey, offlineData)

        // Update catalog
        const catalogKey = 'offline_surah_catalog'
        let catalog = this.readScopedStorageValue('offlineSurahCatalog', catalogKey, [])
        if (!Array.isArray(catalog)) catalog = []

        const entry = {
          id: storageKey,
          surah: surahName,
          surahId: surahId,
          range: `${this.rangeStart}-${this.rangeEnd}`,
          count: this.verses.length,
          date: new Date().toLocaleDateString()
        }

        const filtered = catalog.filter(c => c.id !== storageKey)
        filtered.push(entry)
        this.writeScopedStorageValue('offlineSurahCatalog', catalogKey, filtered)
        this.offlineSurahs = filtered

        this.showBanner(this.t('toasts.savedVersesFromForOfflineReading', { length: this.verses.length, p0: surahName }), 'success', 3000)
      } catch (err) {
        console.error('Download failed:', err)
        this.showBanner(this.t('toasts.failedToDownloadVerses'), 'error', 3000)
      }
    },

    loadOfflineCatalog() {
      try {
        const catalog = this.readScopedStorageValue('offlineSurahCatalog', 'offline_surah_catalog', [])
        this.offlineSurahs = Array.isArray(catalog) ? catalog : []
      } catch (e) {
        this.offlineSurahs = []
      }
    },

    loadOfflineSurah(entry) {
      try {
        const data = this.readScopedStorageValue(`offlineSurah:${entry.id}`, entry.id, null)
        if (!data) throw new Error('No data')

        // Load into current view
        if (this.currentMode === 'beginner') {
          this.beginner.chapterId = data.metadata.surahId
          this.beginner.rangeStart = data.metadata.rangeStart
          this.beginner.rangeEnd = data.metadata.rangeEnd
          this.beginner.verses = data.verses
        } else {
          this.advanced.chapterId = data.metadata.surahId
          this.advanced.rangeStart = data.metadata.rangeStart
          this.advanced.rangeEnd = data.metadata.rangeEnd
          this.advanced.verses = data.verses
        }

        this.currentChapter = this.chapters.find(c => c.id === data.metadata.surahId)
        this.showTools = false
        this.showBanner(this.t('toasts.loadedFromOfflineStorage', { surah: data.metadata.surah }), 'success', 2000)
        this.buildQueue()
      } catch (e) {
        console.error('Offline load error:', e)
        this.showBanner(this.t('toasts.failedToLoadOfflineSurah'), 'error', 3000)
      }
    },

    deleteOfflineSurah(id) {
      this.pendingDeleteId = id
      this.openConfirmModal({
        title: 'Remove offline surah?',
        message: 'This deletes the saved verses from this device.',
        confirmLabel: 'Remove',
        tone: 'danger',
        action: 'delete-offline'
      })
    },

    performDeleteOffline() {
      const id = this.pendingDeleteId
      this.deleteScopedStorageValue(`offlineSurah:${id}`, id)
      const catalog = this.offlineSurahs.filter(s => s.id !== id)
      this.writeScopedStorageValue('offlineSurahCatalog', 'offline_surah_catalog', catalog)
      this.offlineSurahs = catalog
      this.pendingDeleteId = ''
      this.showBanner(this.t('toasts.offlineSurahRemoved'), 'info', 2000)
    },

    async downloadVerseAudio(verse) {
      const audioUrl = this.normalizeAudioUrl(verse?.audio || '')
      if (!audioUrl) {
        this.showBanner(this.t('toasts.audioNotAvailableForThisAyah'), 'info', 2200)
        return
      }

      try {
        const filename = `surah-${this.chapterId}-ayah-${verse.number}.mp3`
        const downloadUrl = `/memorisation/audio-download?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(filename)}`
        const anchor = document.createElement('a')
        anchor.href = downloadUrl
        anchor.download = filename
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        this.showBanner(this.t('toasts.downloadedAyahAudio', { number: verse.number }), 'success', 1800)
      } catch (error) {
        console.error('Verse download failed:', error)
        this.showBanner(this.t('toasts.failedToDownloadAyahAudio'), 'error', 2600)
      }
    },

    getDisplayArabic(verse) {
      if (!verse?.arabic) return ''
      if (this.shouldShowRecitationReviewHighlights(verse.key)) {
        return this.splitRecitationDisplayIntoWords(verse)
      }
      if (this.tajweedEnabled && verse.arabic_tajweed) {
        return this.renderWordLevelTajweedMarkup(verse, {
          wrapWords: this.wordByWordAudioEnabled || this.showWordByWord || this.anchorModeEnabled
        })
      }
      if (this.showWordByWord || this.anchorModeEnabled || this.wordByWordAudioEnabled) return this.splitArabicIntoWords(verse)
      return this.stripTajweedMarkup(verse.arabic)
    },

    escapeHtml(str) {
      if (!str) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },

    buildWordTokenHtml(verse, word, idx, innerHtml) {
      const wordData = typeof word === 'string' ? { ar: word, en: '', audio: null } : (word || {})
      const isActive = this.currentHighlightedVerseKey === verse.key && this.currentWordIndex === idx
      const activeClass = isActive ? ' highlighted phrase-highlighted' : ''
      const weakClass = this.isWeakAyah(verse.key) ? ' weak-word' : ''
      const masteredClass = this.isMasteredAyah(verse.key) ? ' mastered-word' : ''
      const recitationStatus = this.getRenderedRecitationWordStatusForVerse(verse.key, idx, verse.sessionTargetKey || '')
      const recitationClass = recitationStatus ? ` recitation-word-${recitationStatus}` : ''
      const tajweedClass = wordData?.tajweedClass ? ` ${this.escapeHtml(wordData.tajweedClass)}` : ''
      const sessionTargetAttr = verse?.sessionTargetKey
        ? ` data-session-target-key="${this.escapeHtml(verse.sessionTargetKey)}"`
        : ''
      const tajweedAttr = wordData?.tajweedWord ? ' data-tajweed-word="true"' : ''
      const wordAudio = this.wordByWordAudioEnabled && wordData.audio
        ? `<button class="word-audio-btn" data-word-index="${idx}" data-word-audio="${this.escapeHtml(wordData.audio)}"><i class="bi bi-volume-up"></i></button>`
        : ''

      return `<word class="wbw-word${activeClass}${weakClass}${masteredClass}${recitationClass}${tajweedClass}" data-word-index="${idx}" data-verse-key="${verse.key}"${sessionTargetAttr}${tajweedAttr} data-word-audio="${this.escapeHtml(wordData.audio || '')}">${innerHtml}${wordAudio}</word>`
    },

    isArabicBaseLetterForTajweed(char) {
      return /[\u0621-\u064A\u0671]/.test(String(char || ''))
    },

    // Add sanitize method
    sanitizeHtml(html) {
      if (!html) return ''
      let cleaned = String(html)
      // Remove scripts entirely.
      cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Drop inline handlers/styles.
      cleaned = cleaned.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
      cleaned = cleaned.replace(/\sstyle\s*=\s*(['"]).*?\1/gi, '')
      // Allow only the tags we intentionally render.
      cleaned = cleaned.replace(/<(?!\/?(?:span|word|br)\b)[^>]*>/gi, '')
      return cleaned
    },

    normalizeTajweedMarkup(text) {
      if (!text) return ''

      const markerMap = {
        '[h': 'ham_wasl',
        '[s': 'slnt',
        '[l': 'slnt',
        '[n': 'madda_normal',
        '[p': 'madda_permissible',
        '[m': 'madda_necessary',
        '[q': 'qlq',
        '[o': 'madda_obligatory',
        '[c': 'ikhf_shfw',
        '[f': 'ikhf',
        '[w': 'idghm_shfw',
        '[i': 'iqlb',
        '[a': 'idgh_ghn',
        '[u': 'idgh_w_ghn',
        '[d': 'idgh_mus',
        '[b': 'idgh_mus',
        '[g': 'ghn'
      }

      let normalized = this.sanitizeHtml(String(text))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<\s*tajweed\b([^>]*)class=['"]?([a-zA-Z0-9_-]+)['"]?([^>]*)>/gi, '<span class="tajweed-mark tajweed-$2"$1$3>')
        .replace(/<\s*\/\s*tajweed\s*>/gi, '</span>')

      Object.entries(markerMap).forEach(([marker, className]) => {
        const escapedMarker = marker.replace('[', '\\[')
        normalized = normalized.replace(new RegExp(escapedMarker, 'g'), `<span class="tajweed-mark tajweed-${className}" data-tajweed="`)
      })

      normalized = normalized
        .replace(/\[/g, '">')
        .replace(/\]/g, '</span>')
        .replace(/<\/?tajweed[^>]*>/gi, '')
        .replace(/data-tajweed="([^"]*)">/g, (fullMatch, meta) => {
          const cleanMeta = String(meta || '').replace(/"/g, '&quot;')
          return `data-tajweed="${cleanMeta}">`
        })
        .replace(/<\/span><\/span>/g, '</span>')
        .replace(/(?:class=|data-tajweed=)&quot;[^&]*&quot;/g, '')

      return normalized
    },

    stripTajweedMarkup(text) {
      if (!text) return ''
      return String(text)
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<\s*\/?\s*tajweed[^>]*>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\[(?:[a-z]|\/)[^\]]*\]/gi, '')
        .trim()
    },
    splitTajweedMarkupIntoWordHtml(markup = '') {
      if (!markup) return []
      const segments = []
      let buffer = ''
      let inTag = false
      for (const char of String(markup)) {
        if (char === '<') {
          inTag = true
          buffer += char
          continue
        }
        if (char === '>') {
          inTag = false
          buffer += char
          continue
        }
        if (!inTag && /\s/.test(char)) {
          if (buffer.trim()) segments.push(buffer.trim())
          buffer = ''
          continue
        }
        buffer += char
      }
      if (buffer.trim()) segments.push(buffer.trim())
      return segments
    },
    getTajweedClassesForMarkupToken(token = '') {
      const matches = String(token || '').match(/\btajweed-[a-zA-Z0-9_]+\b/g) || []
      return [...new Set(matches)]
    },
    renderWordLevelTajweedMarkup(verse = {}, options = {}) {
      if (!verse?.arabic_tajweed) return this.cleanRecitationDisplayText(verse?.arabic || '')
      const normalizedMarkup = this.normalizeTajweedMarkup(verse.arabic_tajweed || '')
      const tokens = this.splitTajweedMarkupIntoWordHtml(normalizedMarkup)
      if (!tokens.length) return this.cleanRecitationDisplayText(verse.arabic || verse.arabic_tajweed || '')
      const useInteractiveWords = !!options.wrapWords
      return tokens.map((token, idx) => {
        const wordText = this.cleanRecitationDisplayText(this.stripTajweedMarkup(token))
        if (!wordText) return ''
        const tajweedClass = this.getTajweedClassesForMarkupToken(token).join(' ')
        if (useInteractiveWords) {
          return this.buildWordTokenHtml(
            verse,
            { ar: wordText, en: '', audio: null, tajweedWord: true, tajweedClass },
            idx,
            this.escapeHtml(wordText)
          )
        }
        const className = ['tajweed-word', tajweedClass].filter(Boolean).join(' ')
        return `<span class="${this.escapeHtml(className)}" data-tajweed-word="true">${this.escapeHtml(wordText)}</span>`
      }).filter(Boolean).join(' ')
    },
    shouldUseTajweedWordMarkup(verse) {
      if (!verse?.arabic_tajweed) return false
      const verseKey = verse?.key || ''
      const isSelfCheckTarget = verseKey === this.selfCheckVerseKey
        || verseKey === this.recitationCheckTargetVerseKey
        || (this.recitationCheckPendingTargets || []).some(item => item?.key === verseKey)
      const isMemorisationTarget = verseKey === this.aiMemorisationCheckerVerseKey
        || (this.aiMemorisationCheckerTargets || []).some(item => item?.key === verseKey)
      if (isMemorisationTarget && this.aiMemorisationCheckerTajweedEnabled) return true
      if (isSelfCheckTarget && this.selfCheckTajweedEnabled) return true
      return !!this.tajweedEnabled
    },

    // Arabic text word splitting and highlighting
    getHighlightedArabic(verse) {
      if (!verse || !verse.arabic) return ''
      if (!this.wordByWordAudioEnabled) return verse.arabic

      const highlightedHtml = this.splitArabicIntoWords(verse.arabic, verse.key)
      return highlightedHtml
    },

    escapeRegex(str) {
      return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    },

    splitArabicIntoWords(verse) {
      if (!verse || !verse.arabic) return ''

      // Get words from the verse object or tokenize
      let words = []
      if (verse.words && verse.words.length) {
        words = verse.words
      } else {
        const arabicWords = tokenizeArabicText(verse.arabic)
        words = arabicWords.map((w, idx) => ({
          ar: w,
          en: '',
          transliteration: '',
          audio: null
        }))
      }

      if (!words.length) return this.stripTajweedMarkup(verse.arabic || verse.arabic_tajweed || '')

      let html = ''

      // Regular mode (without tajweed)
      words.forEach((word, idx) => {
        const wordText = typeof word === 'string' ? word : word.ar
        html += `${this.buildWordTokenHtml(verse, word, idx, this.escapeHtml(wordText))} `
      })

      return html
    },
    splitRecitationDisplayIntoWords(verse) {
      if (!verse?.key) return ''
      const sourceText = this.getPlainVerseArabicForCheck(verse)
      const useTajweedMarkup = this.shouldUseTajweedWordMarkup(verse)
      const tajweedMarkup = useTajweedMarkup ? this.renderWordLevelTajweedMarkup(verse, { wrapWords: true }) : ''
      const livePatchMode = this.isLiveRecitationDomPatchModeForVerse(verse.key)
      const cacheSeed = useTajweedMarkup ? tajweedMarkup : sourceText
      const cacheKey = livePatchMode ? `${verse.sessionTargetKey || verse.key}|${useTajweedMarkup ? 'tajweed' : 'plain'}|${cacheSeed}|live` : ''
      if (cacheKey && this.recitationDisplayHtmlCache?.has?.(cacheKey)) return this.recitationDisplayHtmlCache.get(cacheKey)
      if (useTajweedMarkup) {
        if (cacheKey) this.recitationDisplayHtmlCache.set(cacheKey, tajweedMarkup)
        return tajweedMarkup || this.cleanRecitationDisplayText(verse.arabic || verse.arabic_tajweed || '')
      }
      const words = this.tokenizeRecitationDisplayWords(sourceText)
      if (!words.length) return this.cleanRecitationDisplayText(verse.arabic || verse.arabic_tajweed || '')
      const html = words
        .map((word, idx) => this.buildWordTokenHtml(verse, { ar: word, en: '', audio: null }, idx, this.escapeHtml(word)))
        .join(' ')
      if (cacheKey) {
        this.recitationDisplayHtmlCache.set(cacheKey, html)
      }
      return html
    },

    async getWordTimings(verse, actualDuration = null) {
      if (!verse || !verse.key) {
        console.warn('getWordTimings: no verse')
        return []
      }

      // Get words from the verse object directly (not from HTML)
      let sourceWords = []
      if (verse.words && verse.words.length) {
        sourceWords = verse.words.map(word => String(word?.ar || '').trim()).filter(Boolean)
      } else {
        // If no pre-parsed words, tokenize the Arabic text
        const arabicText = verse.arabic || ''
        sourceWords = tokenizeArabicText(arabicText)
      }

      if (!sourceWords.length) {
        console.warn('getWordTimings: no words for verse', verse.key)
        return []
      }

      // Get actual audio duration or estimate
      let safeDuration = 0
      if (Number.isFinite(Number(actualDuration)) && Number(actualDuration) > 0) {
        safeDuration = Number(actualDuration)
      } else if (verse.duration && Number(verse.duration) > 0) {
        safeDuration = Number(verse.duration)
      } else {
        safeDuration = this.estimateVerseDuration(verse)
      }

      // Keep timestamps in media-time because audioElement.currentTime is also media-time.
      const cacheKey = `${verse.key}_${this.reciterId}_${Math.round(safeDuration * 10)}`

      if (this.wordTimestampsMap.has(cacheKey)) {
        return this.wordTimestampsMap.get(cacheKey)
      }

      // Build a normalized timing track so highlight end time always matches audio end time.
      const cleanedWords = sourceWords.map(word => word.replace(/<[^>]+>/g, '').replace(/[^\u0621-\u064A]/g, ''))
      const weightedUnits = cleanedWords.map((cleanWord, index) => {
        const charCount = Math.max(1, cleanWord.length)
        const leadInBoost = index === 0 ? 1.14 : 1
        const shortWordLift = charCount <= 2 ? 1.18 : 1
        return (charCount + 0.75) * leadInBoost * shortWordLift
      })
      const totalUnits = weightedUnits.reduce((sum, unit) => sum + unit, 0) || 1
      const timestamps = []
      let currentTime = 0

      weightedUnits.forEach((unit, index) => {
        const wordDuration = index === weightedUnits.length - 1
          ? Math.max(0, safeDuration - currentTime)
          : safeDuration * (unit / totalUnits)

        timestamps.push({
          index,
          start: currentTime,
          end: currentTime + wordDuration
        })
        currentTime += wordDuration
      })

      this.wordTimestampsMap.set(cacheKey, timestamps)
      return timestamps
    },

    calculateWordTimings(verse, audioDuration = null) {
      return new Promise((resolve) => {
        if (!verse.words || verse.words.length === 0) {
          resolve([])
          return
        }

        const wordCount = verse.words.length
        const totalDuration = audioDuration || this.estimateVerseDuration(verse)
        const durationPerWord = totalDuration / wordCount

        const timestamps = []
        let currentTime = 0

        for (let i = 0; i < wordCount; i++) {
          timestamps.push({
            index: i,
            start: currentTime,
            end: currentTime + durationPerWord
          })
          currentTime += durationPerWord
        }

        resolve(timestamps)
      })
    },

    estimateVerseDuration(verse) {
      // Estimate based on verse length
      const arabicLength = verse.arabic?.length || 100
      const baseDuration = Math.min(45, Math.max(5, arabicLength / 10))
      return baseDuration
    },

    ensureWordSyncEngine() {
      if (this.wordSyncEngine) return this.wordSyncEngine
      this.wordSyncEngine = markRaw(new WordSyncEngine({
        getClock: () => {
          const el = this.audioElement
          if (!el) return null
          return {
            time: el.currentTime,
            paused: el.paused,
            ended: el.ended,
            seeking: el.seeking,
            rate: el.playbackRate
          }
        },
        onRender: ({ index, context }) => {
          const verseKey = context || this.currentHighlightedVerseKey
          this.updateWordHighlight(verseKey, index)
        }
      }))
      return this.wordSyncEngine
    },

    async startWordHighlighting(verse, options = {}) {
      if (!verse?.key || !this.wordByWordAudioEnabled) return
      const timestamps = await this.ensureWordHighlightTrack(verse, options)
      if (!timestamps.length) return
      this.queueWordHighlightFrame(verse)
    },
    updateWordHighlight(verseKey, activeIndex) {
      this.currentHighlightedVerseKey = verseKey || null
      this.currentWordIndex = Number.isFinite(Number(activeIndex)) ? Number(activeIndex) : -1
      this.currentPhraseIndex = this.currentWordIndex
      this.scheduleWordHighlightDomUpdate(verseKey, this.currentWordIndex)
    },

    scheduleWordHighlightDomUpdate(verseKey, activeIndex) {
      const nextState = {
        verseKey: verseKey || null,
        activeIndex: Number.isFinite(Number(activeIndex)) ? Number(activeIndex) : -1
      }
      this.pendingWordHighlightState = nextState

      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        this.flushWordHighlightDomUpdate()
        return
      }
      if (this.wordHighlightFrame) return
      this.wordHighlightFrame = window.requestAnimationFrame(() => {
        this.wordHighlightFrame = null
        this.flushWordHighlightDomUpdate()
      })
    },

    flushWordHighlightDomUpdate() {
      const pending = this.pendingWordHighlightState
      this.pendingWordHighlightState = null
      this.applyWordHighlightClasses(pending?.verseKey || null, pending?.activeIndex ?? -1)
    },

    getWordHighlightNodes(verseKey, activeIndex) {
      if (!verseKey || activeIndex < 0) return []

      const cacheKey = `${verseKey}:${activeIndex}`
      const registry = this.wordHighlightNodeRegistry
      const cachedNodes = registry.get(cacheKey)
      if (Array.isArray(cachedNodes) && cachedNodes.length && cachedNodes.every(node => node?.isConnected)) {
        return cachedNodes
      }

      const nextNodes = []
      document.querySelectorAll(`[data-verse-key="${verseKey}"][data-word-index="${activeIndex}"]`).forEach(node => {
        if (node?.isConnected) nextNodes.push(node)
      })

      const verseCard = document.querySelector(`.verse-card[data-verse-key="${verseKey}"]`)
      const activeWordItem = verseCard?.querySelectorAll('.word-item')?.[activeIndex]
      if (activeWordItem?.isConnected) nextNodes.push(activeWordItem)

      registry.set(cacheKey, nextNodes)
      return nextNodes
    },

    applyWordHighlightClasses(verseKey, activeIndex) {
      const previousNodes = Array.isArray(this.lastHighlightedWordNodes) ? this.lastHighlightedWordNodes : []
      previousNodes.forEach(node => {
        if (node?.classList) {
          node.classList.remove('highlighted')
          node.classList.remove('phrase-highlighted')
        }
      })
      this.lastHighlightedWordNodes = []

      if (!verseKey || activeIndex < 0) return

      const nextNodes = new Set()
      this.getWordHighlightNodes(verseKey, activeIndex).forEach(node => {
        node.classList.add('highlighted')
        node.classList.add('phrase-highlighted')
        nextNodes.add(node)
      })
      this.lastHighlightedWordNodes = Array.from(nextNodes)
    },

    findWordTimingIndex(currentTime, timestamps = this.wordHighlightTimestamps) {
      if (!Array.isArray(timestamps) || !timestamps.length) return -1
      const time = Math.max(0, Number(currentTime || 0))
      const epsilon = 0.045
      let low = 0
      let high = timestamps.length - 1

      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const item = timestamps[mid]
        if (time < Number(item.start || 0) - epsilon) {
          high = mid - 1
        } else if (time > Number(item.end || 0) + epsilon) {
          low = mid + 1
        } else {
          return Number(item.index)
        }
      }

      if (time >= Number(timestamps[timestamps.length - 1]?.start || 0) - epsilon) {
        return Number(timestamps[timestamps.length - 1]?.index ?? -1)
      }

      return -1
    },

    queueWordHighlightFrame(verse = this.activeVerseRef) {
      // Legacy entry point retained for the audio event handlers. The rAF loop,
      // interpolation, and drift correction are now owned by WordSyncEngine.
      if (!verse?.key || !this.audioElement || this.audioElement.paused || this.audioElement.ended) return
      const engine = this.ensureWordSyncEngine()
      if (this.currentHighlightedVerseKey !== verse.key || !engine.hasTimeline()) {
        engine.setTimeline(this.wordHighlightTimestamps, verse.key)
      }
      // Re-sync from currentTime before resuming the loop so a resume after a
      // pause/buffering stall never starts from a stale word.
      engine.resync()
      engine.start()
    },

    async ensureWordHighlightTrack(verse, options = {}) {
      const { force = false } = options
      if (!verse?.key || !this.wordByWordAudioEnabled) return []
      if (!force && this.currentHighlightedVerseKey === verse.key && this.wordHighlightTimestamps?.length) {
        return this.wordHighlightTimestamps
      }

      const requestId = ++this.wordHighlightRequestId
      this.wordHighlightLoading = true
      this.currentHighlightedVerseKey = verse.key
      this.currentWordIndex = -1
      this.currentPhraseIndex = -1

      const duration = Number(this.audioElement?.duration)
      const timestamps = await this.getWordTimings(verse, Number.isFinite(duration) && duration > 0 ? duration : null)
      if (requestId !== this.wordHighlightRequestId) return []

      this.wordHighlightLoading = false
      this.wordHighlightTimestamps = Array.isArray(timestamps) ? timestamps : []
      this.wordHighlightNodeRegistry.clear()
      // Feed the normalised timeline into the sync engine (Timestamp Map Layer).
      this.ensureWordSyncEngine().setTimeline(this.wordHighlightTimestamps, verse.key)
      this.syncWordHighlightFromAudio(verse)
      return this.wordHighlightTimestamps
    },

    syncWordHighlightFromAudio(verse = this.activeVerseRef) {
      if (!verse || !verse.key || this.currentHighlightedVerseKey !== verse.key || !this.wordHighlightTimestamps?.length || !this.audioElement) return
      const engine = this.ensureWordSyncEngine()
      if (!engine.hasTimeline()) engine.setTimeline(this.wordHighlightTimestamps, verse.key)
      // Immediate authoritative re-sync from currentTime (no hysteresis delay).
      engine.resync()
    },

    restoreWordScroll(verseKey) {
      this.$nextTick(() => {
        if (!verseKey) return
        const verseCard = document.querySelector(`.verse-card[data-verse-key="${verseKey}"]`)
        const wordsWrap = verseCard?.querySelector('.verse-words')
        const remembered = this.verseScrollMemory[verseKey]
        if (!wordsWrap || !remembered) return
        wordsWrap.scrollTop = Number(remembered.top || 0)
        wordsWrap.scrollLeft = Number(remembered.left || 0)
      })
    },

    onVerseWordsScroll(verseKey, event) {
      const el = event?.target
      if (!verseKey || !el) return
      this.verseScrollMemory[verseKey] = {
        top: el.scrollTop,
        left: el.scrollLeft
      }
    },

    updateWordHighlightInDOM(verseKey, activeWordIndex) {
      this.updateWordHighlight(verseKey, activeWordIndex)
    },

    stopWordHighlighting() {
      this.wordHighlightRequestId += 1
      if (this.wordHighlightFrame) window.cancelAnimationFrame(this.wordHighlightFrame)
      this.wordHighlightFrame = null
      this.pendingWordHighlightState = null
      if (this.wordSyncEngine) this.wordSyncEngine.reset()
      this.wordHighlightHandler = null
      this.wordHighlightLoading = false
      this.wordHighlightNodeRegistry.clear()
      this.applyWordHighlightClasses(null, -1)
      this.currentWordIndex = -1
      this.currentPhraseIndex = -1
      this.currentHighlightedVerseKey = null
      this.wordHighlightTimestamps = []
    },

    // Audio methods
    initAudio() {
      this.audioElement = this.$refs.audio
      if (!this.audioElement) return

      this.audioElement.removeEventListener('timeupdate', this.audioTimeUpdate)
      this.audioElement.removeEventListener('ended', this.audioEnded)
      this.audioElement.removeEventListener('error', this.audioError)
      this.audioElement.removeEventListener('seeking', this.audioSeeking)
      this.audioElement.removeEventListener('seeked', this.audioSeeked)
      this.audioElement.removeEventListener('pause', this.audioPaused)
      this.audioElement.removeEventListener('playing', this.audioPlaying)
      this.audioElement.removeEventListener('ratechange', this.audioRateChange)
      this.audioElement.removeEventListener('loadstart', this.audioLoadStart)

      this.audioTimeUpdate = () => {
        this.currentTime = this.audioElement.currentTime
        this.duration = this.audioElement.duration
        this.centralSession.audio.currentTime = Number(this.currentTime || 0)
        this.centralSession.audio.speed = Number(this.speed || 1)

        if (this.segmentEndTime > 0 && Number(this.currentTime || 0) >= this.segmentEndTime - 0.04) {
          this.handleSegmentBoundary()
          return
        }

        if (this.wordByWordAudioEnabled) {
          const verse = this.activeVerseRef
          if (verse && verse.key) {
            if ((!this.wordHighlightTimestamps?.length || this.currentHighlightedVerseKey !== verse.key) && !this.wordHighlightLoading) {
              this.startWordHighlighting(verse)
            } else if (!this.wordHighlightLoading) {
              const engine = this.wordSyncEngine
              if (engine && engine.hasTimeline()) {
                engine.observe(this.currentTime)
                if (!engine.running && this.audioElement && !this.audioElement.paused) {
                  engine.resume()
                }
              }
            }
          }
        }

        // Waveform - separate from word highlighting (works even if word-by-word is off)
        const verse = this.activeVerseRef
        if (verse && verse.key !== this.currentWaveVerseKey) {
          this.currentWaveVerseKey = verse.key;
        }
      }

      this.audioEnded = () => {
        if (this.advanceLocked) return
        this.advanceLocked = true
        this.isPlaying = false
        this.stopWordHighlighting()
        if (this.guidedUiStep === 'learn') {
          this.flowListenPlays += 1
          this.persistUiState()
        }
        if (this.manualOnlyPlayback) {
          this.manualOnlyPlayback = false
          this.advanceLocked = false
          return
        }
        const gapSeconds = this.getCurrentPlaybackGapSeconds()
        const gapDelayMs = Math.max(0, gapSeconds * 1000)
        if (this.playbackAdvanceTimer) clearTimeout(this.playbackAdvanceTimer)
        this.playbackAdvanceTimer = null
        if (this.talqinModeActive && this.playMode !== 'manual') {
          this.advanceLocked = false
          this.beginTalqinRecitationTurn(() => {
            if (this.canNext) {
              this.next()
              return
            }
            this.handleSessionComplete()
          })
          return
        }
        if (this.playMode === 'follow') {
          this.advanceLocked = false
          this.startRecitationWindow(() => {
            if (this.canNext) {
              this.next()
              return
            }
            this.handleSessionComplete()
          })
          return
        }
        if (this.playMode === 'auto') {
          if (!this.chainingEnabled && this.selectedLoopCount === 'infinite' && this.activeQueueEntry) {
            this.playbackAdvanceTimer = window.setTimeout(() => {
              this.playbackAdvanceTimer = null
              const entry = this.activeQueueEntry
              this.advanceLocked = false
              if (entry) {
                this.playQueueEntry(entry, { force: true, queueIndex: this.queueIndex })
              }
            }, gapDelayMs)
            return
          }
          this.playbackAdvanceTimer = window.setTimeout(() => {
            this.playbackAdvanceTimer = null
            this.advanceLocked = false
            this.next()
          }, gapDelayMs)
        } else {
          this.advanceLocked = false
        }
      }

      this.audioSeeking = () => {
        // Park the engine loop while scrubbing; clear the stale highlight so no
        // wrong word lingers during a long/scrubbed seek.
        if (this.wordSyncEngine) this.wordSyncEngine.pause()
        if (this.currentHighlightedVerseKey) this.updateWordHighlight(this.currentHighlightedVerseKey, -1)
      }

      this.audioSeeked = () => {
        const verse = this.activeVerseRef
        if (!verse) return
        if (this.wordByWordAudioEnabled) {
          this.ensureWordHighlightTrack(verse).then(() => {
            // Snap instantly to the word at the new position (no hysteresis lag).
            if (this.wordSyncEngine) this.wordSyncEngine.seek()
            if (!this.audioElement?.paused) this.queueWordHighlightFrame(verse)
          })
        }
      }

      this.audioPaused = () => {
        this.isPlaying = false
        // Freeze state: stop the loop but retain the active word.
        if (this.wordSyncEngine) this.wordSyncEngine.pause()
      }

      this.audioPlaying = () => {
        this.isPlaying = true
        if (this.audioElement) {
          const safeSpeed = this.normalizePlaybackSpeed(this.speed)
          this.audioElement.defaultPlaybackRate = safeSpeed
          this.audioElement.playbackRate = safeSpeed
        }
        const verse = this.activeVerseRef
        if (verse && this.wordByWordAudioEnabled) {
          this.startWordHighlighting(verse)
        }
      }

      this.audioRateChange = () => {
        this.centralSession.audio.speed = Number(this.audioElement?.playbackRate || this.speed || 1)
        const verse = this.activeVerseRef
        if (verse && this.wordByWordAudioEnabled && this.wordHighlightTimestamps?.length) {
          this.syncWordHighlightFromAudio(verse)
          if (!this.audioElement?.paused) this.queueWordHighlightFrame(verse)
        }
      }

      this.audioLoadStart = () => {
        this.stopWordHighlighting()
      }

      this.audioError = (e) => {
        console.error('Audio error:', e)
        this.isPlaying = false
        this.sessionErrorCount += 1
        this.stopWordHighlighting()
        this.showBanner(this.t('toasts.audioPlaybackError'), 'error', 3000)
      }

      this.audioElement.addEventListener('timeupdate', this.audioTimeUpdate)
      this.audioElement.addEventListener('ended', this.audioEnded)
      this.audioElement.addEventListener('error', this.audioError)
      this.audioElement.addEventListener('seeking', this.audioSeeking)
      this.audioElement.addEventListener('seeked', this.audioSeeked)
      this.audioElement.addEventListener('pause', this.audioPaused)
      this.audioElement.addEventListener('playing', this.audioPlaying)
      this.audioElement.addEventListener('ratechange', this.audioRateChange)
      this.audioElement.addEventListener('loadstart', this.audioLoadStart)
    },

    async playVerse(verse, options = {}) {
      if (this.playRequestLocked && !options.force) return
      this.playRequestLocked = true
      this.clearRecitationWindowTimer()
      this.clearTalqinPauseTimer()
      this.stopRecordingsPlayback({ clearSource: true })
      if (this.segmentPlaybackTimer) {
        clearTimeout(this.segmentPlaybackTimer)
        this.segmentPlaybackTimer = null
      }
      if (this.playbackAdvanceTimer) {
        clearTimeout(this.playbackAdvanceTimer)
        this.playbackAdvanceTimer = null
      }
      this.segmentEndTime = 0
      this.segmentPlaybackKind = ''

      if (!verse) {
        console.error('No verse provided')
        this.playRequestLocked = false
        return
      }

      if (!verse.audio) {
        this.showBanner(this.t('toasts.audioNotAvailableForVerse', { number: verse.number }), 'info', 2000)
        this.playRequestLocked = false
        return
      }

      const audioUrl = this.normalizeAudioUrl(verse.audio)
      this.manualOnlyPlayback = !!options.manualOnly
      const currentSrc = this.audioElement?.currentSrc ? this.normalizeAudioUrl(this.audioElement.currentSrc) : ''
      const isSameSource = !!currentSrc && currentSrc === audioUrl

      // Toggle if same verse is playing
      if (!options.force && this.activeKey === verse.key && isSameSource) {
        this.togglePlay()
        this.playRequestLocked = false
        return
      }

      // Stop current playback and highlighting
      this.stopWordHighlighting()
      if (this.audioElement) {
        try {
          this.audioElement.pause()
        } catch (e) {
          console.warn('Error pausing audio:', e)
        }
      }

      this.setActiveVerse(verse.key, {
        scroll: false,
        queueIndex: Number.isFinite(options.queueIndex) ? Number(options.queueIndex) : undefined
      })

      if (!this.audioElement) {
        this.audioElement = this.$refs.audio
        if (!this.audioElement) {
          this.showBanner(this.t('toasts.audioSystemNotReady'), 'error', 3000)
          this.playRequestLocked = false
          return
        }
        this.initAudio()
      }

      if (!isSameSource) {
        this.audioElement.src = audioUrl
        this.audioElement.load()
      }
      this.playerVisible = true

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Audio load timeout'))
        }, 10000)

        const startPlayback = async () => {
          clearTimeout(timeout)
          const safeSpeed = this.normalizePlaybackSpeed(this.speed)
          this.audioElement.defaultPlaybackRate = safeSpeed
          this.audioElement.playbackRate = safeSpeed
          const segment = options.segment || null
          const segmentTotal = Math.max(1, Number(segment?.sequenceTotal || segment?.total || 1))
          const segmentIndex = Math.max(0, Math.min(segmentTotal - 1, Number(segment?.index || 0)))
          let segmentEnd = 0

          if (segment && Number.isFinite(this.audioElement.duration) && this.audioElement.duration > 0 && segmentTotal > 1) {
            const duration = Number(this.audioElement.duration || 0)
            const segmentStart = Math.max(0, duration * (segmentIndex / segmentTotal))
            segmentEnd = Math.min(duration, duration * ((segmentIndex + 1) / segmentTotal))
            this.segmentEndTime = segmentEnd
            this.audioElement.currentTime = segmentStart
          }

          try {
            await this.audioElement.play()
            this.incrementVersePlayCount(verse.key)
            this.markPlaybackStart()
            this.addActivityEvent({ ts: Date.now(), type: 'play', verseKey: verse.key })
            this.recomputeAnalytics()
            if (this.wordByWordAudioEnabled) {
              this.ensureWordHighlightTrack(verse, { force: true }).then(() => {
                this.syncWordHighlightFromAudio(verse)
                if (!this.audioElement?.paused) this.queueWordHighlightFrame(verse)
              }).catch(err => {
                console.warn('Word highlight bootstrap failed:', err)
              })
            }
            this.playRequestLocked = false
            resolve()
          } catch (err) {
            this.isPlaying = false
            this.playRequestLocked = false
            reject(err)
          }
        }

        const canPlayHandler = async () => {
          await startPlayback()
          this.audioElement.removeEventListener('canplay', canPlayHandler)
        }

        const errorHandler = (err) => {
          clearTimeout(timeout)
          this.isPlaying = false
          this.playRequestLocked = false
          reject(err)
          this.audioElement.removeEventListener('error', errorHandler)
        }

        this.audioElement.addEventListener('error', errorHandler, { once: true })
        if (isSameSource && this.audioElement.readyState >= 2) {
          startPlayback()
        } else {
          this.audioElement.addEventListener('canplay', canPlayHandler)
        }
      }).catch(err => {
        console.error('playVerse failed:', err)
        this.isPlaying = false
        this.playRequestLocked = false
        this.showBanner(this.t('toasts.failedToPlayAudio'), 'error', 3000, {
          key: 'resume-playback',
          label: 'Tap to play'
        })
      })
    },

    playQueueEntry(entry, options = {}) {
      if (!entry) return Promise.resolve()
      const verse = entry.verse || entry
      return this.playVerse(verse, { ...options, segment: null })
    },

    handleSegmentBoundary() {
      if (!this.segmentEndTime || this.advanceLocked) return
      this.segmentEndTime = 0
      const playbackKind = this.segmentPlaybackKind
      this.segmentPlaybackKind = ''
      this.stopWordHighlighting()
      if (playbackKind !== 'word' && this.playMode === 'auto') {
        this.next()
        return
      }
      if (this.audioElement) {
        try { this.audioElement.pause() } catch { }
      }
      this.isPlaying = false
    },

    togglePlay() {
      if (this.recitationWindowActive && this.activeQueueEntry) {
        this.playQueueEntry(this.activeQueueEntry, { force: true, queueIndex: this.queueIndex })
        return
      }
      if (!this.audioElement?.src) return

      if (this.audioElement.paused) {
        const safeSpeed = this.normalizePlaybackSpeed(this.speed)
        this.audioElement.defaultPlaybackRate = safeSpeed
        this.audioElement.playbackRate = safeSpeed
        this.audioElement.play()
          .then(() => {
            this.isPlaying = true
            const verse = this.activeVerseRef
            if (verse && this.wordByWordAudioEnabled) {
              this.ensureWordHighlightTrack(verse, { force: true }).then(() => {
                this.syncWordHighlightFromAudio(verse)
                if (!this.audioElement?.paused) this.queueWordHighlightFrame(verse)
              }).catch(err => {
                console.warn('Word highlight resume failed:', err)
              })
            }
          })
          .catch(err => {
            console.error('Failed to play:', err)
            this.showBanner(this.t('toasts.playbackFailed'), 'error', 2400, {
              key: 'resume-playback',
              label: 'Tap to play'
            })
          })
      } else {
        this.audioElement.pause()
        this.isPlaying = false
      }
    },

    applySpeed() {
      const safeSpeed = this.normalizePlaybackSpeed(this.speed)
      if (this.audioElement) {
        this.audioElement.defaultPlaybackRate = safeSpeed
        this.audioElement.playbackRate = safeSpeed
      }
      this.centralSession.audio.speed = safeSpeed
    },

    next() {
      if (this.advanceLocked) return
      this.clearRecitationWindowTimer()
      this.clearTalqinPauseTimer()
      this.advanceLocked = true

      if (this.canNext) {
        this.sessionCompleted = false
        this.queueIndex++
        moveMutqinSession(this.mutqinState, this.queueIndex + 1)
        this.centralSession.chaining.index = this.queueIndex
        this.persistCentralSessionState()
        this.recomputeAnalytics()

        const entry = this.queue[this.queueIndex]
        const verseKey = entry?.verse?.key || entry?.key

        if (verseKey) {
          this.setActiveVerse(verseKey, { queueIndex: this.queueIndex })
        }

        const v = this.queue[this.queueIndex]
        if (v) {
          this.playQueueEntry(v, { force: true, queueIndex: this.queueIndex })
            .finally(() => {
              this.advanceLocked = false
            })
        } else {
          this.advanceLocked = false
        }
        return
      }

      this.advanceLocked = false
      this.handleSessionComplete()
    },

    prev() {
      if (!this.canPrev) return
      if (this.advanceLocked) return

      this.clearRecitationWindowTimer()
      this.clearTalqinPauseTimer()
      this.advanceLocked = true
      this.sessionCompleted = false
      this.queueIndex--
      moveMutqinSession(this.mutqinState, this.queueIndex + 1)
      this.centralSession.chaining.index = this.queueIndex
      this.persistCentralSessionState()
      this.recomputeAnalytics()

      const entry = this.queue[this.queueIndex]
      const verseKey = entry?.verse?.key || entry?.key

      if (verseKey) {
        this.setActiveVerse(verseKey, { scroll: false, queueIndex: this.queueIndex })
      }

      const v = this.queue[this.queueIndex]
      if (v) {
        this.playQueueEntry(v, { force: true, queueIndex: this.queueIndex })
          .finally(() => {
            this.advanceLocked = false
          })
      } else {
        this.advanceLocked = false
      }
    },

    closePlayer() {
      this.flushPlaybackTime()
      this.stopWordHighlighting()
      this.clearRecitationWindowTimer()
      if (this.segmentPlaybackTimer) {
        clearTimeout(this.segmentPlaybackTimer)
        this.segmentPlaybackTimer = null
      }
      if (this.playbackAdvanceTimer) {
        clearTimeout(this.playbackAdvanceTimer)
        this.playbackAdvanceTimer = null
      }
      this.segmentEndTime = 0
      this.segmentPlaybackKind = ''
      this.advanceLocked = false
      this.playRequestLocked = false
      if (this.audioElement) {
        this.audioElement.pause()
        this.audioElement.src = ''
      }
      this.playerVisible = false
      this.isPlaying = false
      this.playerMenuOpen = false
      this.persistAudioState()
    },

    async loadVerses(mode = this.currentMode) {
      const target = this.getModeStore(mode)
      const chapterId = Number(target.chapterId || 0)
      if (!chapterId) return

      const rangeStart = Number(target.rangeStart || 1)
      const rangeEnd = Number(target.rangeEnd || rangeStart || 1)
      const reciterId = target.reciterId || DEFAULT_ALQURAN_RECITER
      const requestId = ++this.verseRequestId
      const targetConfig = this.buildSessionConfig(mode)

      this.isDataReady = false

      try {
        const cached = this.getCachedVerses(mode, targetConfig)
        if (cached?.verses?.length) {
          target.verses = cached.verses
          target.loadedConfig = cached.loadedConfig
          this.buildQueue(mode)
          this.syncActiveVerseState(mode)
          this.syncMutqinAyahs(cached.verses)
          this.isDataReady = true
          return
        }

        const [audioRes, translationRes, translitRes, arabicRes, tajweedRes] = await Promise.all([
          getSurahEdition(chapterId, reciterId),
          getSurahEdition(chapterId, 'en.asad'),
          getSurahEdition(chapterId, 'en.transliteration'),
          getSurahEdition(chapterId, 'quran-uthmani'),
          getSurahEditions(chapterId, reciterId)
        ])

        if (requestId !== this.verseRequestId) return

        const audioSurah = audioRes.data?.data
        const translationSurah = translationRes.data?.data
        const translitSurah = translitRes.data?.data
        const arabicSurah = arabicRes.data?.data
        const tajweedEdition = (tajweedRes.data?.data || []).find(entry => entry?.edition?.identifier === 'quran-tajweed')

        const audioAyahs = audioSurah?.ayahs || []
        const arabicByNumber = new Map((arabicSurah?.ayahs || []).map(ayah => [ayah.numberInSurah, ayah.text || '']))
        const translationByNumber = new Map((translationSurah?.ayahs || []).map(ayah => [ayah.numberInSurah, ayah.text || '']))
        const translitByNumber = new Map((translitSurah?.ayahs || []).map(ayah => [ayah.numberInSurah, ayah.text || '']))
        const tajweedByNumber = new Map((tajweedEdition?.ayahs || []).map(ayah => [ayah.numberInSurah, ayah.text || '']))

        const start = rangeStart
        const end = rangeEnd

        const mappedVerses = audioAyahs
          .filter(ayah => ayah.numberInSurah >= start && ayah.numberInSurah <= end)
          .map(ayah => {
            const key = `${chapterId}:${ayah.numberInSurah}`
            let arabic = arabicByNumber.get(ayah.numberInSurah) || ayah.text || ''
            let tajweed = tajweedByNumber.get(ayah.numberInSurah) || ''

            // Remove Basmala from Arabic text
            arabic = this.removeBasmala(arabic)
            tajweed = this.removeBasmala(tajweed)

            const transliteration = translitByNumber.get(ayah.numberInSurah) || ''
            const translation = translationByNumber.get(ayah.numberInSurah) || ''

            const arabicWords = tokenizeArabicText(arabic)
            const translitWords = String(transliteration).split(/\s+/).filter(Boolean)
            const translationWords = String(translation).split(/\s+/).filter(Boolean)

            return {
              key,
              number: ayah.numberInSurah,
              chapterId,
              arabic,
              arabic_tajweed: tajweed,
              translation: this.cleanTranslationText(translation),
              transliteration,
              audio: this.resolveAyahAudioUrl(ayah),
              words: arabicWords.map((word, index) => ({
                ar: word,
                en: translationWords[index] || '',
                transliteration: translitWords[index] || '',
                audio: null
              }))
            }
          })

        target.verses = mappedVerses
        target.loadedConfig = {
          chapterId,
          rangeStart: start,
          rangeEnd: end,
          reciterId,
          showWordByWord: this.showWordByWord,
          tajweedEnabled: this.tajweedEnabled
        }
        this.syncMutqinAyahs(mappedVerses)

        this.setCachedVerses(mode, targetConfig, {
          verses: mappedVerses,
          loadedConfig: target.loadedConfig
        })

        this.buildQueue(mode)
        this.syncActiveVerseState(mode)

        // Set ready after data loads
        this.isDataReady = true

      } catch (e) {
        console.error('Error loading verses:', e)
        this.showBanner(this.t('toasts.failedToLoadVerses'), 'error', 3000)
        this.isDataReady = true
      }
    },

    cleanTranslationText(text) {
      if (!text) return ''
      let cleaned = text
      cleaned = cleaned.replace(/<sup>foot_note=\d+><\/sup>/gi, '')
      cleaned = cleaned.replace(/<sup>.*?<\/sup>/gi, '')
      cleaned = cleaned.replace(/<[^>]*>/g, '')
      cleaned = cleaned.replace(/\[\d+\]/g, '')
      cleaned = cleaned.replace(/\s+/g, ' ').trim()
      return cleaned
    },

    buildQueue(mode = this.currentMode) {
      const config = this.getModeStore(mode)
      const verses = config.verses
      const previousActiveKey = config.activeKey
      const previousEntry = Array.isArray(config.queue) ? config.queue[Math.max(0, Number(config.queueIndex || 0))] : null
      const previousEntryKey = previousEntry?.verse?.key || previousEntry?.key || null

      if (!verses || verses.length === 0) {
        if (mode === this.currentMode) {
          this.queue = []
          this.queueIndex = 0
        }
        config.queue = []
        config.queueIndex = 0
        return
      }

      const q = []
      const safePreviousQueueIndex = Math.max(0, Number(config.queueIndex || 0))

      if (mode === 'planner') {
        const todayMap = new Map((this.appState?.todaySession || []).map(item => [item.key, item]))
        verses.forEach((verse, index) => {
          const sessionItem = todayMap.get(verse.key) || {}
          q.push({
            verse,
            phase: sessionItem.type === 'new' ? 'Memorise' : 'Retention',
            chainKey: `planner:${sessionItem.type || 'memorise'}:${verse.key}`,
            sequencePosition: index + 1,
            sequenceTotal: verses.length,
            repeatCount: 1,
            totalRepeats: 1,
            plannerType: sessionItem.type || 'new'
          })
        })

        const restoredQueueIndex = Math.min(safePreviousQueueIndex, Math.max(q.length - 1, 0))
        if (mode === this.currentMode) {
          this.queue = q
          this.queueIndex = restoredQueueIndex
        }
        config.queue = q
        config.queueIndex = restoredQueueIndex
        this.syncActiveVerseState(mode, previousActiveKey)
        return
      }

      const chainingEnabled = this.chainingEnabled
      const chainingMethod = this.chainingMethod
      const repetitions = chainingEnabled
        ? Math.max(1, Math.min(5, Number(this.chainingRepetitions || 1)))
        : Math.max(1, Math.min(50, Number(this.repetitionsPerStep || 1)))

      const decorateQueueEntry = (entry, repeatIndex) => ({
        ...entry,
        repeatCount: repeatIndex,
        totalRepeats: repetitions,
        phase: entry.phase,
        chainKey: entry.chainKey,
        sequencePosition: entry.sequencePosition,
        sequenceTotal: entry.sequenceTotal
      })

      const pushQueueEntry = (entry) => {
        for (let repeatIndex = 1; repeatIndex <= repetitions; repeatIndex++) {
          q.push(decorateQueueEntry(entry, repeatIndex))
        }
      }

      const pushQueueGroup = (entries) => {
        for (let repeatIndex = 1; repeatIndex <= repetitions; repeatIndex++) {
          entries.forEach(entry => q.push(decorateQueueEntry(entry, repeatIndex)))
        }
      }

      if (!chainingEnabled) {
        // Simple sequential order without chaining
        verses.forEach(verse => {
          pushQueueEntry({
            verse,
            phase: 'Memorise',
            chainKey: null,
            sequencePosition: 1,
            sequenceTotal: 1
          })
        })
      } else if (chainingMethod === 'cumulative') {
        // Cumulative method: 1, then 1-2, then 1-2-3, etc.
        for (let endIndex = 0; endIndex < verses.length; endIndex++) {
          const chain = verses.slice(0, endIndex + 1)
          pushQueueGroup(chain.map((verse, chainIndex) => ({
            verse: chain[chainIndex],
            phase: 'Cumulative',
            chainKey: `cumulative:${endIndex + 1}`,
            sequencePosition: chainIndex + 1,
            sequenceTotal: chain.length
          })))
        }
      } else if (chainingMethod === 'linking') {
        // Linking method: practice ayahs individually, then adjacent ayah pairs.
        for (let index = 0; index < verses.length; index++) {
          const verse = verses[index]
          pushQueueEntry({
            verse,
            phase: 'Linking',
            chainKey: `linking:single:${verse.key}`,
            sequencePosition: 1,
            sequenceTotal: 1
          })

          const nextVerse = verses[index + 1]
          if (nextVerse) {
            pushQueueGroup([
              {
                verse,
                phase: 'Linking',
                chainKey: `linking:${verse.key}->${nextVerse.key}`,
                sequencePosition: 1,
                sequenceTotal: 2
              },
              {
                verse: nextVerse,
                phase: 'Linking',
                chainKey: `linking:${verse.key}->${nextVerse.key}`,
                sequencePosition: 2,
                sequenceTotal: 2
              }
            ])
          }
        }
      }

      // Restore previous position if possible
      let previousQueueIndex = Math.min(safePreviousQueueIndex, Math.max(q.length - 1, 0))
      if (previousEntryKey) {
        const exactIndex = q.findIndex(item =>
          (item?.verse?.key || item?.key) === previousEntryKey &&
          item.phase === previousEntry?.phase &&
          item.chainKey === previousEntry?.chainKey &&
          Number(item.sequencePosition || 1) === Number(previousEntry?.sequencePosition || 1) &&
          Number(item.repeatCount || 1) === Number(previousEntry?.repeatCount || 1)
        )
        if (exactIndex >= 0) {
          previousQueueIndex = exactIndex
        } else {
          const firstIndex = q.findIndex(item => (item?.verse?.key || item?.key) === previousEntryKey)
          if (firstIndex >= 0) previousQueueIndex = firstIndex
        }
      }

      // Update queue in appropriate store
      if (mode === this.currentMode) {
        this.queue = q
        this.queueIndex = previousQueueIndex
      }

      config.queue = q
      config.queueIndex = previousQueueIndex

      this.syncActiveVerseState(mode, previousActiveKey)
    },

    estimateQueueDuration(queue) {
      const avgVerseDuration = 45
      return Math.ceil(queue.length * avgVerseDuration / 60)
    },

    rebuildQueue(mode = this.currentMode) {
      this.buildQueue(mode)
    },

    setChainingEnabled(enabled) {
      const nextEnabled = !!enabled
      if (this.chainingEnabled === nextEnabled) return
      this.chainingEnabled = nextEnabled
      if (!nextEnabled) {
        this.chainingMethod = ''
      }
      this.applyChainingQueueChange(this.currentMode, { restart: true })
    },
    toggleFocusModeRadio() {
      this.focusModeEnabled = !this.focusModeEnabled
      this.persistUiState()
    },
    toggleBlurModeRadio() {
      this.blurModeEnabled = !this.blurModeEnabled
      this.persistUiState()
    },
    toggleChainingRadio() {
      this.setChainingEnabled(!this.chainingEnabled)
    },
    toggleAnchorModeRadio() {
      this.setAnchorMode(!this.anchorModeEnabled)
    },

    setAnchorMode(enabled) {
      const nextEnabled = !!enabled
      if (this.anchorModeEnabled === nextEnabled) return
      this.toggleAnchorMode()
    },

    setChainingMethod(method) {
      const nextMethod = method === 'cumulative' ? 'cumulative' : 'linking'
      if (this.chainingMethod === nextMethod) return
      this.chainingMethod = nextMethod
      this.applyChainingQueueChange(this.currentMode, { restart: true })
    },

    escapeHtml(str) { return String(str || '').replace(/[&<>]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] }) },
    escapeRegex(str) { return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') },

    setChainingRepetitions(value) {
      this.chainingRepetitions = Math.max(1, Math.min(5, Number(value || 1)))
      this.applyChainingQueueChange(this.currentMode, { restart: true })
    },

    applyChainingQueueChange(mode = this.currentMode, options = {}) {
      if (!this.hasVerses) {
        this.persistUiState()
        this.persistCentralSessionState()
        return
      }
      if (this.audioElement && options.restart) {
        try { this.audioElement.pause() } catch { }
      }
      if (options.restart) {
        this.isPlaying = false
        this.currentTime = 0
        this.stopWordHighlighting()
        this.getModeStore(mode).queueIndex = 0
      }
      this.buildQueue(mode)
      const store = this.getModeStore(mode)
      if (mode === this.currentMode && Array.isArray(store.queue) && store.queue.length) {
        if (options.restart) store.queueIndex = 0
        this.syncMutqinSession(store.queue, mode)
        const nextEntry = store.queue[Math.max(0, Number(store.queueIndex || 0))]
        const nextKey = nextEntry?.verse?.key || nextEntry?.key || store.activeKey
        if (nextKey) {
          this.setActiveVerse(nextKey, { mode, queueIndex: Math.max(0, Number(store.queueIndex || 0)), scroll: false })
        }
        if (options.restart) moveMutqinSession(this.mutqinState, 0)
      }
      this.persistSessionState()
      this.persistCentralSessionState()
    },

    persistModeState(mode) {
      const source = this.getModeStore(mode)
      try {
        const snapshot = this.cloneModeState(source)
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue(`modeState:${mode}`, snapshot)
        } else {
          localStorage.setItem(MODE_STORAGE_KEYS[mode], JSON.stringify(snapshot))
        }
      } catch (e) {
        console.error(`Failed to persist ${mode} mode state:`, e)
      }
    },

    async startSession() {
      const config = this.sessionConfig
      const mode = config.mode || this.currentMode

      if (!config.chapterId || config.chapterId === 0) {
        this.showTools = true
        this.showBanner(this.t('toasts.pleaseSelectASurahFirst'), 'info', 3600)
        return
      }

      if (!this.validateSettings()) {
        return
      }

      this.applySessionConfig(config)
      this.persistModeState(mode)
      this.persistUiState()

      this.sessionCompleted = false
      this.sessionCompletedAt = null
      this.sessionStartedAt = Date.now()
      this.sessionErrorCount = 0
      this.statsTick = Date.now()
      this.centralSession.sessionStatus = 'active'
      this.centralSession.sessionCompletedAt = null

      const currentStore = this.getModeStore(mode)
      const currentVerses = currentStore?.verses || []
      const modeNeedsReload = !currentVerses || !currentVerses.length || !this.modeDataMatchesConfig(mode, config)

      if (modeNeedsReload) {
        await this.loadVerses(mode)
      }

      const updatedVerses = this.getModeStore(mode)?.verses || []

      if (!updatedVerses || updatedVerses.length === 0) {
        this.showBanner(this.t('toasts.noVersesLoadedCheckYourNetwork'), 'error')
        return
      }

      if (!this.audioElement) {
        this.initAudio()
      }

      // Rebuild queue with current chaining settings
      console.log('[startSession] Building queue with settings:', {
        enabled: this.chainingEnabled,
        method: this.chainingMethod,
        repetitions: this.chainingRepetitions
      })

      this.buildQueue(mode)

      const builtQueue = this.getModeStore(mode)?.queue || []

      if (!builtQueue || builtQueue.length === 0) {
        this.showBanner(this.t('toasts.nothingToPlayCheckTheSelected'), 'error')
        return
      }

      this.syncMutqinAyahs(updatedVerses)
      const sessionState = this.syncMutqinSession(builtQueue, mode)
      this.incrementSessionPlayCount()
      const canonicalIndex = Math.max(0, Number(sessionState?.current_index || 0))
      let playbackIndex = canonicalIndex > 0
        ? Math.min(canonicalIndex - 1, builtQueue.length - 1)
        : 0

      this.queueIndex = playbackIndex
      this.getModeStore(mode).queueIndex = playbackIndex

      const nextCanonicalIndex = canonicalIndex > 0 ? canonicalIndex : 1
      moveMutqinSession(this.mutqinState, nextCanonicalIndex)

      const first = builtQueue[playbackIndex]

      if (first && first.verse) {
        this.setActiveVerse(first.verse.key, { mode, queueIndex: playbackIndex, scroll: false })
        await this.$nextTick()

        if (this.audioElement) {
          this.audioElement.defaultPlaybackRate = this.normalizePlaybackSpeed(this.speed)
          this.audioElement.playbackRate = this.normalizePlaybackSpeed(this.speed)
        }

        await this.playQueueEntry(first, { force: true, queueIndex: playbackIndex })
      }

      this.showTools = false
      this.flowStep = 'learn'
      if (mode === 'planner') {
        this.persistHifzAppState({
          mode: 'planner',
          sessionActive: true,
          activePlanId: this.hifzPlan?.id || null,
          todaySession: this.hifzTodayQueue,
          progress: {
            completedAyahs: this.hifzCompletedAyahCount,
            dueCount: this.plannerSessionState.dueCount
          },
          plannerReady: true,
          lastEvent: 'SESSION_STARTED'
        })
      }

      const chainingStatus = this.chainingEnabled
        ? `${this.chainingMethod} chaining (${this.chainingRepetitions}x)`
        : 'no chaining'
      const sessionStartedMessage = this.playMode === 'follow'
        ? `Session started with ${builtQueue.length} guided repetitions. Listen to the reciter, then use your recitation window before the next ayah begins.`
        : mode === 'planner'
          ? `Hifz session started. Follow the highlighted words and move one ayah at a time.`
          : `Session started with ${builtQueue.length} guided repetitions using ${chainingStatus}`

      this.showBanner(
        sessionStartedMessage,
        'success',
        3000
      )
    },

    // Utility methods
    formatTime(sec) {
      const t = Math.max(0, Math.floor(sec || 0))
      return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
    },

    normalizeAudioUrl(url) {
      if (!url) return ''
      if (url.startsWith('http://') || url.startsWith('https://')) return url
      if (url.startsWith('//')) return `https:${url}`
      if (url.startsWith('/')) return `https://verses.quran.com${url}`
      if (url.includes('mp3')) return `https://verses.quran.com/${url}`
      return url
    },
    resolveAyahAudioUrl(ayah = {}) {
      const direct = typeof ayah.audio === 'string' ? ayah.audio : ''
      const nested = ayah.audio && typeof ayah.audio === 'object'
        ? (ayah.audio.url || ayah.audio.audio || ayah.audio.src || '')
        : ''
      const secondary = Array.isArray(ayah.audioSecondary) ? ayah.audioSecondary[0] : ''
      const secondaryUrl = typeof secondary === 'string'
        ? secondary
        : (secondary?.url || secondary?.audio || secondary?.src || '')
      const fallback = ayah.audioUrl || ayah.audio_url || ayah.url || ''
      return this.normalizeAudioUrl(direct || nested || secondaryUrl || fallback || '')
    },

    getQueueItemAudioSeconds(item = {}, allowCurrentProgress = false) {
      const verse = item.verse || item
      const speedFactor = Math.max(0.25, Number(this.speed || 1))

      if (allowCurrentProgress && this.duration > 0) {
        return Math.max(0, Number(this.duration || 0) - Number(this.currentTime || 0)) / speedFactor
      }

      const explicitDuration = Number(verse.duration || verse.audioDuration || 0)
      if (Number.isFinite(explicitDuration) && explicitDuration > 0) {
        return explicitDuration / speedFactor
      }

      const arabicLength = String(verse.arabic || verse.text || '').replace(/[^ء-ي]/g, '').length || 80
      return Math.max(5, Math.min(45, arabicLength * 0.12)) / speedFactor
    },

    showBanner(message, kind = 'info', ttlMs = 3500, action = null) {
      if (this.bannerTimer) clearTimeout(this.bannerTimer)
      this.banner = {
        message,
        kind,
        at: Date.now(),
        actionKey: action?.key || '',
        actionLabel: action?.label || '',
        actionPayload: action?.payload || null
      }
      this.bannerTimer = setTimeout(() => {
        if (this.banner && Date.now() - this.banner.at >= ttlMs) this.banner = null
      }, ttlMs + 50)
    },

    runBannerAction() {
      const actionKey = this.banner?.actionKey
      const actionPayload = this.banner?.actionPayload || null
      this.banner = null
      if (actionKey === 'restart-session') {
        this.startSessionWithCountdown()
        return
      }
      if (actionKey === 'resume-playback') {
        this.resumePlaybackAfterGesture()
        return
      }
      if (actionKey === 'open-setup') {
        this.openModeSettings()
        return
      }
      if (actionKey === 'open-recordings-library') {
        this.openRecordingsLibrary(actionPayload || {})
      }
      if (actionKey === 'start-quiz') {
        this.openRetentionQuiz()
      }
    },

    syncMutqinAyahs(verses = this.verses) {
      if (!Array.isArray(verses) || !verses.length) return
      seedAyahs(this.mutqinState, verses)
    },

    syncMutqinSession(queue = this.queue, mode = this.currentMode) {
      const playbackQueue = (queue || []).map(item => {
        const verse = item?.verse || item
        return {
          phase: item?.phase || 'Takrar',
          ayahId: verse?.key || item?.ayahId || null,
          verse,
          segment: item?.segment || null,
          chainKey: item?.chainKey || null,
          sequencePosition: item?.sequencePosition || 1,
          sequenceTotal: item?.sequenceTotal || 1,
          repeatCount: item?.repeatCount || 1,
          totalRepeats: item?.totalRepeats || 1
        }
      }).filter(item => item.ayahId)
      const uniqueVerses = []
      const seen = new Set()
      playbackQueue.forEach(item => {
        if (seen.has(item.ayahId)) return
        seen.add(item.ayahId)
        if (item.verse) uniqueVerses.push(item.verse)
      })
      const planner = createDailyPlan(this.mutqinState, uniqueVerses, {
        repetitions: 1,
        audioDurations: uniqueVerses.reduce((map, verse) => {
          map[verse.key] = Number(verse.duration || this.duration || 0)
          return map
        }, {}),
        reviewSeconds: 18
      })
      const plannerQueue = uniqueVerses.slice(0, 1).map(verse => ({
        phase: 'Planner',
        ayahId: verse.key,
        verse,
        prompt: `${this.currentChapter?.name_simple || 'Session'} ayahs ${this.rangeStart}-${this.rangeEnd}`
      }))
      const recallQueue = uniqueVerses.map(verse => ({
        phase: 'Recall',
        ayahId: verse.key,
        verse,
        prompt: `Recite ayah ${verse.number}`
      }))
      const reviewQueue = planner.reviews.map(ayah => ({ phase: 'Retention', ayahId: ayah.id }))
      const fullQueue = buildSessionQueue({
        planner: plannerQueue,
        takrar: playbackQueue,
        recall: recallQueue,
        review: reviewQueue
      })
      return startMutqinSession(this.mutqinState, {
        mode,
        queue: fullQueue,
        config: this.buildSessionConfig(mode),
        planner: {
          new: planner.new.map(verse => verse.key),
          chains: [],
          reviews: planner.reviews.map(ayah => ayah.id),
          ETA: planner.ETA
        }
      })
    },

    getMutqinAyah(id) {
      return this.mutqinState.ayahs?.[id] || null
    },

    takrarLabel(id) {
      const ayah = this.getMutqinAyah(id)
      if (!ayah) return 'Session progress: ready'
      const step = getTakrarStep(ayah)
      const target = typeof step === 'number' ? `${ayah.repetition_count}/${step}` : step
      return `Session progress: ${target}`
    },

    retentionLabel(id) {
      const ayah = this.getMutqinAyah(id)
      if (!ayah) return 'Review: due soon'
      return `Review: ${ayah.next_review || 'today'}`
    },

    isWeakAyah(key) {
      const ayah = this.mutqinState?.ayahs?.[key]
      const hifzProgress = this.getHifzAyahProgress(key)
      const hifzWeak = !!hifzProgress && Number(hifzProgress.masteryScore || 0) < 0.65
      return Number(ayah?.weak_count || 0) > 0 || ayah?.status === 'weak' || hifzWeak
    },
    isMasteredAyah(key) {
      const ayah = this.mutqinState?.ayahs?.[key]
      const hifzProgress = this.getHifzAyahProgress(key)
      const hifzMastered = !!hifzProgress && Number(hifzProgress.masteryScore || 0) >= 0.9 && Number(hifzProgress.repetitionCount || 0) >= 3
      return Number(ayah?.mastery_level || 0) >= 5 || ayah?.status === 'mastered' || hifzMastered
    },
    markTakrarHide(verse) {
      this.syncMutqinAyahs([verse])
      hideAyah(this.mutqinState, verse.key)
    },

    markTakrarDone(verse, score) {
      this.syncMutqinAyahs([verse])
      completeTakrarStep(this.mutqinState, verse.key, score)
      scoreRetention(this.mutqinState, verse.key, score)
      if (score === 'Forgot') this.sessionErrorCount += 1
      const previous = this.queue?.[Math.max(0, this.queueIndex - 1)]
      const fromId = previous?.verse?.key || previous?.key
      this.applyChainingResult(verse, score)
      this.recomputeAnalytics()
      this.showBanner(score === 'Forgot' ? 'Marked for review' : 'Progress saved', score === 'Forgot' ? 'info' : 'success', 1400)
    },

    applyChainingResult(verse, score) {
      if (!this.chainingEnabled || !verse?.key) {
        this.persistCentralSessionState()
        return
      }

      const isFailure = score === 'Forgot' || score === false
      if (this.chainingMethod === 'cumulative') {
        this.applyCumulativeResult(verse, isFailure)
      } else {
        this.applyLinkingResult(verse, isFailure)
      }
      this.persistCentralSessionState()
    },

    applyLinkingResult(verse, isFailure) {
      const chaining = this.centralSession.chaining
      const currentEntry = this.queue?.[Math.max(0, Number(this.queueIndex || 0))]
      const segmentIndex = Math.max(0, Number(currentEntry?.segment?.index || currentEntry?.sequencePosition - 1 || 0))

      if (!isFailure) {
        chaining.consecutiveFailures = 0
        chaining.segmentIndex = segmentIndex + 1
        chaining.index = Math.max(0, Number(this.queueIndex || 0) + 1)
        return
      }

      chaining.consecutiveFailures = Number(chaining.consecutiveFailures || 0) + 1
      if (chaining.consecutiveFailures >= 3) {
        const firstAyahSegment = this.queue.findIndex(item => (item?.verse?.key || item?.key) === verse.key)
        this.queueIndex = Math.max(0, firstAyahSegment)
        this.getModeStore(this.currentMode).queueIndex = this.queueIndex
        moveMutqinSession(this.mutqinState, this.queueIndex + 1)
        chaining.segmentIndex = 0
        chaining.index = this.queueIndex
        chaining.consecutiveFailures = 0
        return
      }

      const rollbackIndex = Math.max(0, Number(this.queueIndex || 0) - 1)
      this.queueIndex = rollbackIndex
      this.getModeStore(this.currentMode).queueIndex = this.queueIndex
      moveMutqinSession(this.mutqinState, this.queueIndex + 1)
      chaining.segmentIndex = Math.max(0, segmentIndex - 1)
      chaining.index = rollbackIndex
    },

    applyCumulativeResult(verse, isFailure) {
      const chaining = this.centralSession.chaining
      const currentIndex = Math.max(0, Number(this.queueIndex || 0))

      if (!Array.isArray(chaining.chain)) chaining.chain = []

      if (isFailure) {
        const lastSuccessfulKey = chaining.lastSuccessfulAyahKey
        if (lastSuccessfulKey) {
          const rollbackIndex = chaining.chain.findIndex(item => item.key === lastSuccessfulKey)
          chaining.chain = rollbackIndex >= 0 ? chaining.chain.slice(0, rollbackIndex + 1) : []
          const targetQueueIndex = this.queue.findIndex(item => (item?.verse?.key || item?.key) === lastSuccessfulKey)
          if (targetQueueIndex >= 0) this.queueIndex = targetQueueIndex
        } else {
          chaining.chain = []
          this.queueIndex = 0
        }
        this.getModeStore(this.currentMode).queueIndex = this.queueIndex
        moveMutqinSession(this.mutqinState, this.queueIndex + 1)
        chaining.index = Math.max(0, Number(this.queueIndex || 0))
        return
      }

      if (!chaining.chain.some(item => item.key === verse.key)) {
        chaining.chain.push({ key: verse.key, number: verse.number, masteredAt: Date.now() })
      }
      chaining.lastSuccessfulAyahKey = verse.key
      chaining.index = currentIndex + 1
    },

    handleOnline() {
      this.networkOnline = true
      this.showBanner(this.t('toasts.backOnlineLiveApisAreAvailable'), 'success', 2400)
      // Push any changes that could not be saved while offline.
      if (this.learningBackendEnabled()) this.pushLearningState(true)
    },

    handleOffline() {
      this.networkOnline = false
      this.showBanner(this.t('toasts.offlineModeActiveReadingFallsBack'), 'info', 3200)
    },

    markPlaybackStart() {
      this.playbackStartedAt = Date.now()
    },

    flushPlaybackTime() {
      if (!this.playbackStartedAt) return
      const seconds = Math.max(0, Math.round((Date.now() - this.playbackStartedAt) / 1000))
      this.playbackStartedAt = 0
      if (seconds > 0) {
        this.addActivityEvent({ ts: Date.now(), type: 'time', seconds })
        this.recomputeAnalytics()
      }
    },

    getChainingDescription() {
      if (!this.chainingEnabled) {
        return 'Play ayahs in order without special chaining patterns.'
      }

      if (this.chainingMethod === 'cumulative') {
        return `Cumulative method: Start with first ayah, then add one more each time. Each ayah is repeated ${this.chainingRepetitions} time(s) per cycle.`
      }

      return `Linking method: Practice ayahs individually, then in pairs. Each ayah is repeated ${this.chainingRepetitions} time(s) per cycle.`
    },

    getQueuePreview() {
      if (!this.queue || this.queue.length === 0) return 'No queue built yet'

      const preview = this.queue.slice(0, 10).map(item => {
        const verseNum = item.verse?.number || '?'
        const phase = item.phase === 'Cumulative' ? `C[${item.sequencePosition}/${item.sequenceTotal}]` :
          item.phase === 'Linking' ? `L[${item.sequencePosition}/${item.sequenceTotal}]` :
            'S'
        const repeat = item.repeatCount > 1 ? `✕${item.repeatCount}` : ''
        return `${verseNum}${phase}${repeat}`
      }).join(' → ')

      if (this.queue.length > 10) {
        return preview + ` … +${this.queue.length - 10} more`
      }
      return preview
    },

    handleSessionComplete() {
      if (!this.verses.length) return

      const endedSnapshot = this.buildSessionEndedSnapshot()
      this.sessionEndedSnapshot = endedSnapshot
      this.sessionCompleted = true
      this.sessionCompletedAt = new Date().toISOString()
      this.centralSession.repetitionTimes = Math.max(0, Number(this.centralSession.repetitionTimes || 0)) + 1
      this.centralSession.sessionStatus = 'completed'
      this.centralSession.sessionCompletedAt = this.sessionCompletedAt
      completeMutqinSession(this.mutqinState)
      this.addActivityEvent({ ts: Date.now(), type: 'session_complete' })
      this.recomputeAnalytics()
      this.finishSessionCleanup()
      this.triggerSessionCompletionQuiz()
    },

    handlePrimaryAction() {
      if (this.isPlaying) {
        if (this.audioElement) this.audioElement.pause()
        this.isPlaying = false
        return
      }
      if (!this.canStartSession) {
        this.showTools = true
        this.showBanner(this.t('toasts.chooseAValidSurahAndAyah'), 'info', 3600, { key: 'open-setup', label: 'Open setup' })
        return
      }
      this.startSessionWithCountdown()
    },

    validateSettings() {
      const config = this.sessionConfig
      const errors = []

      if (!config.chapterId || config.chapterId === 0) {
        errors.push('No surah selected')
      }

      if (!Number.isFinite(Number(config.rangeStart)) || !Number.isFinite(Number(config.rangeEnd))) {
        errors.push('Verse range must be numeric')
      }

      if (config.rangeStart > config.rangeEnd) {
        errors.push('Invalid verse range')
      }

      if (
        config.playMode === 'follow'
        && !Number.isFinite(Number(config.recitationWindowSeconds))
      ) {
        errors.push('Recitation window must be numeric')
      }

      if (errors.length > 0) {
        this.showBanner(this.t('toasts.settingsIssue', { join: errors.join(', ') }), 'warning', 3000)
        return false
      }

      if (this.chainingEnabled && !this.hasChainingMethodSelected) {
        this.showBanner('Choose a chaining method before starting the session.', 'warning', 3200)
        return false
      }

      return true
    },
    updateDefaultFontSize() {
      // Clamp the value
      this.defaultFontSize = Math.max(this.minFontSize, Math.min(this.maxFontSize, this.defaultFontSize))
      this.writeScopedStorageValue('defaultFontSize', 'telawa.defaultFontSize', this.defaultFontSize)
      this.syncSettingsDraft()
      this.persistVerseFontSizes()
      this.persistUiState()
      // Update all verses
      // Show feedback
      this.showBanner(this.t('toasts.fontSize', { defaultFontSize: this.defaultFontSize }), 'info', 600)
    },

    // UI methods
    toggleReadingOption(kind) {
      let nextState = false
      if (kind === 'translation') {
        this.showTranslation = !this.showTranslation
        nextState = this.showTranslation
      }
      if (kind === 'transliteration') {
        this.showTransliteration = !this.showTransliteration
        nextState = this.showTransliteration
      }
      if (kind === 'wbw') {
        this.showWordByWord = !this.showWordByWord
        nextState = this.showWordByWord
      }
      this.syncSettingsDraft()
      this.persistUiState()
      // Show feedback that change was applied
      this.showBanner(this.t('toasts.message', { p0: kind, p1: nextState ? 'enabled' : 'disabled' }), 'info', 800)
    },

    setScriptMode(mode) {
      this.script = mode
      this.scheduleLoadVerses(this.currentMode)
    },

    setQuranFont(font) {
      this.quranFont = font
      this.script = 'uthmani'
      this.fontPickerOpen = false
      this.persistUiState()
    },

    toggleFontPicker() {
      this.fontPickerOpen = !this.fontPickerOpen
    },

    cycleTheme() {
      const themes = ['light', 'dark']
      const idx = themes.indexOf(this.theme)
      this.syncGlobalTheme(themes[(idx + 1) % themes.length])
      this.persistUiState()
    },

    toggleSection(key) {
      const nextValue = !this.sectionOpen[key];
      Object.keys(this.sectionOpen).forEach(sectionKey => {
        if (['session_tools', 'live_stats'].includes(sectionKey)) {
          this.sectionOpen[sectionKey] = false;
        }
      });
      this.sectionOpen[key] = nextValue;

      if (key === 'memorisation_techniques') {
        this.enforceMemorisationRules();
      }

    },

    applySettingsChanges(options = {}) {
      const { silent = false } = options
      const next = this.settingsDraft || {}
      this.tajweedEnabled = !!next.tajweedEnabled
      this.showTranslation = !!next.showTranslation
      this.showTransliteration = !!next.showTransliteration
      this.showWordByWord = !!next.showWordByWord
      this.wordByWordAudioEnabled = !!next.wordByWordAudioEnabled
      this.defaultFontSize = Math.max(this.minFontSize, Math.min(this.maxFontSize, Number(next.defaultFontSize || 100)))
      this.writeScopedStorageValue('defaultFontSize', 'telawa.defaultFontSize', this.defaultFontSize)
      this.persistVerseFontSizes()
      this.persistUiState()
      this.persistCentralSessionState()
      this.syncSettingsDraft()
      if (!silent) this.showBanner(this.t('toasts.settingsSaved'), 'success', 1400)
    },

    // Persistence methods
    loadUiState() {
      let state = null
      try {
        if (this.learningBackendEnabled()) {
          state = this.readWorkspaceStateValue('uiState', null)
        } else {
          const raw = localStorage.getItem('telawa.uiState')
          state = raw ? JSON.parse(raw) : null
        }

        if (state) {
          this.theme = state.theme || this.theme
          this.tab = ['tools', 'techniques', 'saved', 'stats', 'settings'].includes(state.tab) ? state.tab : 'tools'
          this.showTools = !!state.showTools
          this.currentMode = state.currentMode || 'beginner'
          this.flowStep = ['learn', 'practice', 'recall'].includes(state.flowStep)
            ? state.flowStep
            : (state.flowStep === 'read' ? 'learn' : state.flowStep === 'listen' ? 'practice' : 'learn')
          this.flowListenPlays = Math.max(0, Number(state.flowListenPlays || 0))
          this.showTranslation = state.showTranslation ?? this.showTranslation
          this.showTransliteration = state.showTransliteration ?? this.showTransliteration
          this.showWordByWord = state.showWordByWord ?? this.showWordByWord
          this.wordByWordAudioEnabled = state.wordByWordAudioEnabled ?? this.wordByWordAudioEnabled
          this.readingViewMode = ['stacked', 'mushaf'].includes(state.readingViewMode)
            ? state.readingViewMode
            : 'stacked'
          this.mushafPageIndex = 0
          this.aiRecitationStrictProgression = state.aiRecitationStrictProgression !== false
          this.aiRecitationPersistMistakes = false
          this.persistentAiRecitationReviews = {}
          this.hiddenRevealModeEnabled = false
          this.aiRecallModeEnabled = !!state.aiRecallModeEnabled
          this.mushafBackground = ['warm', 'paper', 'contrast', 'mist', 'night'].includes(state.mushafBackground) ? state.mushafBackground : this.mushafBackground
          this.mushafBorder = ['classic', 'fine', 'layered', 'emerald', 'ink'].includes(state.mushafBorder) ? state.mushafBorder : this.mushafBorder
          this.focusModeEnabled = !!state.focusModeEnabled
          this.blurModeEnabled = !!state.blurModeEnabled
          this.blurIntensity = Math.max(4, Math.min(18, Number(state.blurIntensity ?? this.blurIntensity ?? 10)))
          this.chainingEnabled = state.chainingEnabled ?? this.chainingEnabled
          this.chainingMethod = ['linking', 'cumulative'].includes(state.chainingMethod)
            ? state.chainingMethod
            : this.chainingMethod
          this.chainingRepetitions = Math.max(1, Math.min(5, Number(state.chainingRepetitions || this.chainingRepetitions || 1)))
          this.selectedLoopCount = state.selectedLoopCount === 'infinite'
            ? 'infinite'
            : [1, 3, 5, 10].includes(Number(state.selectedLoopCount))
              ? Number(state.selectedLoopCount)
              : this.selectedLoopCount
          this.repetitionsPerStep = this.selectedLoopCount === 'infinite'
            ? 10
            : Math.max(1, Math.min(50, Number(state.repetitionsPerStep || this.selectedLoopCount || this.repetitionsPerStep || 5)))
          this.gapBetweenVerses = ['none', '1x', '3s', '5s', 'custom'].includes(state.gapBetweenVerses)
            ? state.gapBetweenVerses
            : this.gapBetweenVerses
          this.customGapSeconds = Math.max(0.5, Math.min(10, Number(state.customGapSeconds || this.customGapSeconds || 2)))
          this.defaultFontSize = Number(state.defaultFontSize ?? this.defaultFontSize ?? 100)
          this.fontScale = Math.max(0.9, Math.min(1.2, Number(state.fontScale ?? this.fontScale ?? 1)))
          this.enScale = this.fontScale
          this.quizType = ['mixed', 'flashcard', 'mcq', 'audio_mcq', 'blank'].includes(state.quizType)
            ? state.quizType
            : this.quizType
          this.quizFocus = ['adaptive', 'recite_text', 'audio_recall', 'meaning'].includes(state.quizFocus)
            ? state.quizFocus
            : this.quizFocus
          this.quizLength = [4, 6, 8, 10, 12].includes(Number(state.quizLength))
            ? Number(state.quizLength)
            : this.quizLength
          this.anchorModeEnabled = state.anchorModeEnabled ?? false
          this.anchorCount = state.anchorCount ?? 2
          this.settingsDraft = {
            tajweedEnabled: state.tajweedEnabled ?? this.tajweedEnabled ?? false,
            showTranslation: state.showTranslation ?? this.showTranslation,
            showTransliteration: state.showTransliteration ?? this.showTransliteration,
            showWordByWord: state.showWordByWord ?? this.showWordByWord,
            wordByWordAudioEnabled: state.wordByWordAudioEnabled ?? this.wordByWordAudioEnabled,
            defaultFontSize: Number(state.defaultFontSize ?? this.defaultFontSize ?? 100)
          }
          this.uiScale = Number(state.uiScale ?? this.uiScale)
          this.quranFont = state.quranFont || this.quranFont
          this.script = state.script || this.script
          this.sectionOpen = { ...this.sectionOpen, ...(state.sectionOpen || {}) }
          this.tajweedEnabled = state.tajweedEnabled ?? false
          this.mainCardCollapsed = !!state.mainCardCollapsed
          this.feedbackCollapsed = !!state.feedbackCollapsed
        }
      } catch (e) {
        console.error('Error loading UI state:', e)
        // Set defaults if loading fails
        this.anchorModeEnabled = false
        this.anchorCount = 2
      }

      if (!state) this.showTools = false
      this.beginner = this.loadModeState('beginner')
      this.advanced = this.loadModeState('advanced')
      this.planner = this.loadModeState('planner')
      this.syncGlobalTheme(this.theme)
      if (this.readingViewMode === 'mushaf') this.applyMushafThemeDefault(this.theme)
    },

    persistUiState() {
      // Coalesce the many UI mutations (toggles, scrubbing, theme, tabs, etc.)
      // into a single debounced localStorage write instead of writing on every
      // change. The synchronous writer is still used directly on teardown/unload.
      if (this.isBootstrapping) return
      if (!this._uiPersistDebouncer) {
        this._uiPersistDebouncer = createDebouncer(() => this._persistUiStateNow(), 700)
      }
      this._uiPersistDebouncer()
    },

    _persistUiStateNow() {

      if (this.isBootstrapping) return
      try {
        const nextUiState = {
          anchorModeEnabled: this.anchorModeEnabled,
          anchorCount: this.anchorCount,
          theme: this.theme,
          showTools: this.showTools,
          tab: this.tab,
          currentMode: this.currentMode,
          flowStep: this.flowStep,
          flowListenPlays: this.flowListenPlays,
          showTranslation: this.showTranslation,
          showTransliteration: this.showTransliteration,
          showWordByWord: this.showWordByWord,
          wordByWordAudioEnabled: this.wordByWordAudioEnabled,
	          aiRecitationStrictProgression: this.aiRecitationStrictProgression,
	          aiRecitationPersistMistakes: this.aiRecitationPersistMistakes,
	          persistentAiRecitationReviews: this.persistentAiRecitationReviews,
	          hiddenRevealModeEnabled: false,
	          aiRecallModeEnabled: this.aiRecallModeEnabled,
	        readingViewMode: this.readingViewMode,
        mushafBackground: this.mushafBackground,
        mushafBorder: this.mushafBorder,
          focusModeEnabled: this.focusModeEnabled,
          blurModeEnabled: this.blurModeEnabled,
          blurIntensity: this.blurIntensity,
          defaultFontSize: this.defaultFontSize,
          chainingEnabled: this.chainingEnabled,
          chainingMethod: this.chainingMethod,
          chainingRepetitions: this.chainingRepetitions,
          repetitionsPerStep: this.repetitionsPerStep,
          selectedLoopCount: this.selectedLoopCount,
          gapBetweenVerses: this.gapBetweenVerses,
          customGapSeconds: this.customGapSeconds,
          fontScale: this.fontScale,
          uiScale: this.uiScale,
          enScale: this.enScale,
          quranFont: this.quranFont,
          script: this.script,
          quizType: this.quizType,
          quizFocus: this.quizFocus,
          quizLength: this.quizLength,
          sectionOpen: this.sectionOpen,
          tajweedEnabled: this.tajweedEnabled,
          mainCardCollapsed: this.mainCardCollapsed,
          feedbackCollapsed: this.feedbackCollapsed,
        }

        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue('uiState', nextUiState)
        } else {
          localStorage.setItem('telawa.uiState', JSON.stringify(nextUiState))
        }
      } catch (e) {
        console.error('Failed to persist UI state:', e)
      }
      this.persistCentralSessionState()
      this.persistModeState('beginner')
      this.persistModeState('advanced')
      this.persistModeState('planner')
    },

    persistSessionState() {
      if (this.isBootstrapping) return
      const mode = this.currentMode
      try {
        const nextState = {
          activeKey: this.activeKey,
          activeVerseKey: this.activeVerseKey,
          queueIndex: this.queueIndex,
          completed: !!this.sessionCompleted,
          completedAt: this.sessionCompletedAt,
          timestamp: Date.now()
        }
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue(`sessionState:${mode}`, nextState)
        } else {
          localStorage.setItem(SESSION_STORAGE_KEYS[mode], JSON.stringify(nextState))
        }
      } catch (e) { console.error(e) }
    },

    restoreSessionState() {
      ;['beginner', 'advanced', 'planner'].forEach(mode => {
        try {
          const state = this.learningBackendEnabled()
            ? this.readWorkspaceStateValue(`sessionState:${mode}`, null)
            : (() => {
              const saved = localStorage.getItem(SESSION_STORAGE_KEYS[mode])
              return saved ? JSON.parse(saved) : null
            })()
          if (!state) return
          if (state.completed) return
          if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
            const target = this.getModeStore(mode)
            const restoredKey = state.activeVerseKey || state.activeKey || null
            target.activeKey = restoredKey
            target.queueIndex = Number(state.queueIndex || 0)
            if (mode === this.currentMode) {
              this.activeVerseKey = restoredKey
              this.activeKey = restoredKey
              this.queueIndex = target.queueIndex
            }
          }
        } catch (e) {
          console.error('Failed to restore session:', e)
        }
      })
    },

    persistAudioState() {
      // The currentTime watcher fires several times per second during playback;
      // debounce so we are not hammering localStorage on every audio tick.
      if (this.isBootstrapping) return
      if (!this._audioPersistDebouncer) {
        this._audioPersistDebouncer = createDebouncer(() => this._persistAudioStateNow(), 1000)
      }
      this._audioPersistDebouncer()
    },

    _persistAudioStateNow() {
      if (this.isBootstrapping) return
      try {
        const nextState = {
          src: this.audioElement?.currentSrc || '',
          currentTime: this.currentTime || 0,
          playerVisible: this.playerVisible,
          speed: this.speed,
          isPlaying: this.isPlaying
        }
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue('audioState', nextState)
        } else {
          localStorage.setItem('telawa.audioState', JSON.stringify(nextState))
        }
      } catch (e) {
        console.error('Failed to persist audio state:', e)
      }
      this.persistContinueSession()
    },

    persistAllState() {
      // Used on teardown / beforeunload: write everything synchronously and
      // drop any pending debounced writes so nothing is lost.
      this._uiPersistDebouncer?.cancel?.()
      this._audioPersistDebouncer?.cancel?.()
      this._persistUiStateNow()
      this.persistSessionState()
      this.persistCentralSessionState()
      this._persistAudioStateNow()
      this.persistContinueSession()
      this.persistPlanner()
      this.persistTodayPlan()
      this.persistSm2()
      saveMutqinState(this.mutqinState)
      this.flushLearningSync()
    },

    // ---- Backend-driven learning persistence -----------------------------
    // For authenticated users the Laravel backend is the source of truth for the
    // core learning state (sessions, progress, continue position, analytics).
    // localStorage keeps acting as an offline cache so progress is never lost on
    // flaky networks. Guests are unaffected and remain fully localStorage-based.

    learningBackendEnabled() {
      return !!this.auth?.check
    },

    getOrCreateDeviceId() {
      let id = this.readScopedStorageValue('deviceId', 'mutqin.deviceId', null)
      if (!id) {
        id = `web-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
        this.writeScopedStorageValue('deviceId', 'mutqin.deviceId', id)
      }
      return id
    },

    buildLearningStatePayload() {
      let continuePayload = null
      try {
        continuePayload = this.buildContinueSessionPayload?.() || null
      } catch {
        continuePayload = null
      }
      return {
        state: deepClone(this.mutqinState),
        continue: continuePayload,
        meta: {
          device_id: this.getOrCreateDeviceId(),
          device_label: typeof navigator !== 'undefined' ? (navigator.userAgent || '').slice(0, 200) : null,
          local_updated_at: new Date().toISOString(),
        },
      }
    },

    learningPayloadHash(payload) {
      try {
        return `${JSON.stringify(payload.state)}|${JSON.stringify(payload.continue)}`
      } catch {
        return String(Date.now())
      }
    },

    scheduleLearningSync() {
      if (!this.learningBackendEnabled()) return
      if (this.isBootstrapping) return
      if (this.learningSync.applyingRemote) return
      if (!this.learningSync.scheduler) {
        this.learningSync.scheduler = createDebouncer(() => this.pushLearningState(), 1500)
      }
      this.learningSync.scheduler()
    },

    flushLearningSync() {
      if (!this.learningBackendEnabled()) return
      const scheduler = this.learningSync.scheduler
      if (scheduler && scheduler.pending && scheduler.pending()) {
        scheduler.flush()
      }
    },

    scheduleLearningRetry() {
      if (this.learningSync.retryScheduled) return
      this.learningSync.retryScheduled = true
      setTimeout(() => {
        this.learningSync.retryScheduled = false
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return
        this.pushLearningState(true)
      }, 8000)
    },

    async pushLearningState(force = false) {
      if (!this.learningBackendEnabled()) return
      if (this.learningSync.pushing) {
        // A push is already in flight; queue a follow-up so we don't lose changes.
        this.scheduleLearningSync()
        return
      }
      const payload = this.buildLearningStatePayload()
      const hash = this.learningPayloadHash(payload)
      if (!force && hash === this.learningSync.lastPushedHash) return

      this.learningSync.pushing = true
      try {
        await withRetry(() => learningApi.saveState(payload), { retries: 3, baseDelay: 1000 })
        this.learningSync.lastPushedHash = hash
      } catch (error) {
        const status = error?.response?.status
        // Auth/session/CSRF errors: stop silently (e.g. logged out in another tab).
        if (![401, 403, 419].includes(status)) {
          this.scheduleLearningRetry()
        }
      } finally {
        this.learningSync.pushing = false
      }
    },

    async pullLearningState() {
      if (!this.learningBackendEnabled()) return false
      const result = await learningApi.getState()
      if (!result?.meta?.has_state || !result.state) return false

      this.learningSync.applyingRemote = true
      try {
        replaceMutqinState(this.mutqinState, result.state)
        // Mark the freshly pulled state as already-synced to avoid an echo push.
        this.learningSync.lastPushedHash = this.learningPayloadHash(this.buildLearningStatePayload())
        this.loadContinueSessionPrompt()
        if (typeof this.refreshHifzJourneyState === 'function') this.refreshHifzJourneyState()
      } finally {
        this.$nextTick(() => {
          this.learningSync.applyingRemote = false
        })
      }
      return true
    },

    async runLearningMigration() {
      if (!this.learningBackendEnabled()) return
      if (this.auth?.just_registered) return
      if (this.readScopedStorageValue('migrationComplete', 'migration_complete', false) === true) return

      const payload = this.buildLearningStatePayload()
      const state = payload.state || {}
      const hasLocalData =
        (state.ayahs && Object.keys(state.ayahs).length > 0) ||
        !!state.sessionState?.active ||
        Number(state.stats?.sessions_completed || 0) > 0

      if (!hasLocalData) {
        this.writeScopedStorageValue('migrationComplete', 'migration_complete', true)
        return
      }

      try {
        const res = await withRetry(() => learningApi.migrateLocalStorage(payload), { retries: 2, baseDelay: 1500 })
        if (res?.migrated || res?.already_migrated) {
          this.writeScopedStorageValue('migrationComplete', 'migration_complete', true)
          this.learningSync.lastPushedHash = this.learningPayloadHash(payload)
        }
      } catch {
        // Migration must never block the UI; it will be retried on the next load.
      }
    },

    async initLearningBackend() {
      if (!this.learningBackendEnabled()) return
      try {
        const hasRemote = await this.pullLearningState()
        if (hasRemote) {
          this.writeScopedStorageValue('migrationComplete', 'migration_complete', true)
        } else {
          await this.runLearningMigration()
        }
        this.learningSync.ready = true
      } catch {
        // Backend unreachable: keep using the local cache and retry when online.
        this.scheduleLearningRetry()
      }
    },

    readApiCache(key, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
      try {
        const parsed = this.readScopedStorageValue(`apiCache:${key}`, `mutqin.apiCache.${key}`, null)
        if (!parsed || typeof parsed.t !== 'number') return null
        if (Date.now() - parsed.t > maxAgeMs) return null
        return parsed.v
      } catch {
        return null
      }
    },

    writeApiCache(key, value) {
      try {
        this.writeScopedStorageValue(`apiCache:${key}`, `mutqin.apiCache.${key}`, { t: Date.now(), v: value })
      } catch { /* storage full / disabled: non-critical */ }
    },

    async loadChapters() {
      // The chapter list is effectively static; serve it from a short-lived
      // cache so startup does not block on a network round-trip every visit.
      const cached = this.readApiCache('chapters.en')
      if (Array.isArray(cached) && cached.length) {
        this.chapters = cached
        if (this.chapterId) await this.loadChapter()
        return
      }
      try {
        const res = await axios.get('https://api.quran.com/api/v4/chapters', { params: { language: 'en' } })
        this.chapters = res.data?.chapters || []
        if (this.chapters.length) this.writeApiCache('chapters.en', this.chapters)
        if (this.chapterId) await this.loadChapter()
      } catch (e) {
        console.error('Failed to load chapters:', e)
        this.showBanner(this.t('toasts.failedToLoadSurahList'), 'error', 3000)
      }
    },

    async loadChapter(mode = this.currentMode) {
      const target = this.getModeStore(mode)
      const chapterId = Number(target.chapterId || 0)
      if (!chapterId) {
        this.currentChapter = null
        return
      }
      this.startingFreshSessionSelection = false
      this.currentChapter = this.chapters.find(c => c.id === chapterId)
      const max = this.currentChapter?.verses_count || 286

      target.rangeEnd = Math.min(target.rangeEnd, max)
      target.rangeStart = Math.max(1, target.rangeStart)
      await this.loadVerses(mode)
    },

    async loadReciters() {
      const cachedReciters = this.readApiCache('reciters')
      if (Array.isArray(cachedReciters) && cachedReciters.length) {
        this.reciters = cachedReciters
        if (!this.reciters.some(reciter => reciter.id === this.reciterId)) {
          this.reciterId = this.reciters[0]?.id || DEFAULT_ALQURAN_RECITER
        }
        return
      }
      try {
        const res = await getEditions({ format: 'audio' })
        const list = res.data?.data || []
        if (!list.length) return

        const allow = [
          { id: 'ar.alafasy', label: 'Alafasy' },
          { id: 'ar.abdulbasitmurattal', label: 'Abdul basit' },
          { id: 'ar.abdurrahmaansudais', label: 'al sudais' },
          { id: 'ar.hanirifai', label: 'hani rifai' },
          { id: 'ar.husary', label: 'husari' },
          { id: 'ar.minshawi', label: 'minshawi' },
          { id: 'ar.saoodshuraym', label: 'ash-shuraym' }
        ]

        const available = new Map(list.map(edition => [edition.identifier, edition]))
        const filtered = allow
          .filter(entry => available.has(entry.id))
          .map(entry => ({ id: entry.id, name: entry.label }))

        this.reciters = filtered.length
          ? filtered
          : list
            .filter(edition => edition.format === 'audio')
            .map(edition => ({
              id: edition.identifier,
              name: edition.englishName || edition.name || edition.identifier
            }))

        if (this.reciters.length) this.writeApiCache('reciters', this.reciters)

        if (!this.reciters.some(reciter => reciter.id === this.reciterId)) {
          this.reciterId = this.reciters[0]?.id || DEFAULT_ALQURAN_RECITER
        }
      } catch (e) { console.error(e) }
    },

    loadSavedSessions() {
      try {
        let sessions = []
        if (this.learningBackendEnabled()) {
          sessions = this.readWorkspaceStateValue('savedSessions', [])
        } else {
          this.ensureSeededSavedSessions()
          sessions = JSON.parse(localStorage.getItem(this.savedSessionsStorageKey()) || '[]')
        }
        this.savedSessions = (Array.isArray(sessions) ? sessions : [])
          .map(session => this.normalizeSavedSessionRecord(session))
          .filter(Boolean)
        if (!this.savedSessions.some(session => session.id === this.selectedStatsSessionId)) {
          this.selectedStatsSessionId = this.savedSessions[0]?.id || ''
        }
      } catch {
        this.savedSessions = []
        this.selectedStatsSessionId = ''
      }
    },

    loadSm2() {
      try {
        this.sm2 = this.learningBackendEnabled()
          ? (this.readWorkspaceStateValue('sm2', {}) || {})
          : JSON.parse(localStorage.getItem('telawa.sm2') || '{}')
      } catch { this.sm2 = {} }
    },

    persistSm2() {
      try {
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue('sm2', this.sm2)
        } else {
          localStorage.setItem('telawa.sm2', JSON.stringify(this.sm2))
        }
      } catch (e) { console.error(e) }
    },

    loadEvents() {
      try {
        const list = this.readScopedStorageValue('events', 'telawa.events', [])
        this.events = Array.isArray(list) ? list : []
      } catch { this.events = [] }
    },

    loadPlanner() {
      try {
        this.plannerState = this.learningBackendEnabled()
          ? (this.readWorkspaceStateValue('plannerState', null))
          : JSON.parse(localStorage.getItem('telawa.planner') || 'null')
      } catch { this.plannerState = null }
      if (!this.plannerState) {
        this.plannerState = { settings: { dailyMinutes: 20, newAyat: 5, reviewCards: 15 } }
      }
      this.loadTodayPlan()
    },

    loadTodayPlan() {
      try {
        this.todayPlan = this.learningBackendEnabled()
          ? (this.readWorkspaceStateValue('todayPlan', null))
          : JSON.parse(localStorage.getItem('telawa.todayPlan') || 'null')
      } catch { this.todayPlan = null }
    },

    persistPlanner() {
      try {
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue('plannerState', this.plannerState)
        } else {
          localStorage.setItem('telawa.planner', JSON.stringify(this.plannerState))
        }
      } catch (e) { console.error(e) }
    },

    persistTodayPlan() {
      try {
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue('todayPlan', this.todayPlan)
        } else {
          localStorage.setItem('telawa.todayPlan', JSON.stringify(this.todayPlan))
        }
      } catch (e) { console.error(e) }
    },

    loadMetrics() {
      try {
        this.metrics = this.readScopedStorageValue('metrics', 'telawa.metrics', null)
      } catch { this.metrics = null }
      if (!this.metrics) this.metrics = { avgAyahSeconds: 10, durationsByVerse: {} }
    },

    loadAnalytics() {
      try {
        const saved = this.learningBackendEnabled()
          ? this.readWorkspaceStateValue('analytics', null)
          : JSON.parse(localStorage.getItem('telawa.analytics') || 'null')
        if (saved && typeof saved === 'object') {
          this.analytics = { ...this.analytics, ...saved }
        }
      } catch { }
      this.recomputeAnalytics()
    },

    persistAnalytics() {
      try {
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue('analytics', this.analytics)
        } else {
          localStorage.setItem('telawa.analytics', JSON.stringify(this.analytics))
        }
      } catch { }
    },

    getActivityDayKey(ts = Date.now()) {
      return new Date(ts).toISOString().slice(0, 10)
    },

    addActivityEvent(event) {
      try {
        const list = this.learningBackendEnabled()
          ? (this.readWorkspaceStateValue('activity', []) || [])
          : JSON.parse(localStorage.getItem('telawa.activity') || '[]')
        if (!Array.isArray(list)) return
        list.push(event)
        // cap to keep it lightweight
        while (list.length > 5000) list.shift()
        if (this.learningBackendEnabled()) {
          this.writeWorkspaceStateValue('activity', list)
        } else {
          localStorage.setItem('telawa.activity', JSON.stringify(list))
        }
      } catch { }
    },

    readActivityEvents() {
      try {
        const list = this.learningBackendEnabled()
          ? (this.readWorkspaceStateValue('activity', []) || [])
          : JSON.parse(localStorage.getItem('telawa.activity') || '[]')
        return Array.isArray(list) ? list : []
      } catch {
        return []
      }
    },

    recomputeAnalytics() {
      const events = this.readActivityEvents()
      const now = Date.now()
      const dayKeys = []
      for (let i = 6; i >= 0; i--) {
        dayKeys.push(this.getActivityDayKey(now - i * 86400000))
      }

      const weeklyVerses = new Array(7).fill(0)
      const weeklyMinutes = new Array(7).fill(0)
      const versesReadSet = new Set()
      let totalSeconds = 0
      let totalPlays = 0
      let sessionsCompleted = 0
      const daysWithAny = new Set()

      for (const ev of events) {
        const ts = Number(ev?.ts || 0)
        if (!ts) continue
        const dayKey = this.getActivityDayKey(ts)
        daysWithAny.add(dayKey)
        const idx = dayKeys.indexOf(dayKey)

        if (ev.type === 'play') {
          totalPlays += 1
          if (ev.verseKey) versesReadSet.add(String(ev.verseKey))
          if (idx >= 0) weeklyVerses[idx] += 1
        }

        if (ev.type === 'time') {
          const sec = Math.max(0, Number(ev.seconds || 0))
          totalSeconds += sec
          if (idx >= 0) weeklyMinutes[idx] += sec / 60
        }

        if (ev.type === 'session_complete') {
          sessionsCompleted += 1
        }
      }

      // streak: consecutive days ending today with any activity
      const todayKey = this.getActivityDayKey(now)
      let streak = 0
      for (let i = 0; i < 365; i++) {
        const key = this.getActivityDayKey(now - i * 86400000)
        if (daysWithAny.has(key)) streak += 1
        else break
      }

      this.analytics.totalVersesRead = versesReadSet.size
      this.analytics.totalRepetitions = totalPlays
      this.analytics.sessionsCompleted = sessionsCompleted
      this.analytics.totalTimeSpent = Math.round(totalSeconds / 60)
      this.analytics.currentStreak = todayKey && streak ? streak : 0
      this.analytics.weeklyVerses = weeklyVerses
      this.analytics.weeklyMinutes = weeklyMinutes.map(m => Math.round(m))
      const mutqinStats = this.mutqinState?.stats || {}
      this.analytics.versesMastered = Number(mutqinStats.ayahs_memorised || this.analytics.versesMastered || 0)
      this.analytics.totalRepetitions = Math.max(this.analytics.totalRepetitions, Number(mutqinStats.repetitions || 0))
      this.analytics.sessionsCompleted = Math.max(this.analytics.sessionsCompleted, Number(mutqinStats.sessions_completed || 0))
      // Chaining-related stat removed (weak_transitions). Keep field stable.
      this.simpleStats.weak = 0
      this.weakVersesList = Object.values(this.mutqinState?.ayahs || {}).filter(ayah => Number(ayah.weak_count || 0) > 0)
      this.persistAnalytics()
      this.updateMasteredWeekly()
    },

    estimateKeysSeconds(keys = []) {
      return keys.length * 10
    },

    migrateLocalStorage() {
      const key = 'telawa.schemaVersion'
      if (!localStorage.getItem(key)) localStorage.setItem(key, '2')
      if (localStorage.getItem(key) === '1') {
        try {
          const raw = localStorage.getItem('telawa.uiState')
          if (raw) {
            const state = JSON.parse(raw)
            if (state.beginner && !localStorage.getItem(MODE_STORAGE_KEYS.beginner)) {
              localStorage.setItem(MODE_STORAGE_KEYS.beginner, JSON.stringify(this.cloneModeState({
                ...createBeginnerState(),
                ...state.beginner
              })))
            }
            if (state.advanced && !localStorage.getItem(MODE_STORAGE_KEYS.advanced)) {
              localStorage.setItem(MODE_STORAGE_KEYS.advanced, JSON.stringify(this.cloneModeState({
                ...createAdvancedState(),
                ...state.advanced
              })))
            }
          }
          localStorage.setItem(key, '2')
        } catch (e) { console.error(e) }
      }
    },

    loadBookmarksPins() {
      try {
        this.bookmarks = this.learningBackendEnabled()
          ? (this.readWorkspaceStateValue('bookmarks', []) || [])
          : JSON.parse(localStorage.getItem(this.userStorageKey('bookmarks')) || '[]')
      } catch { this.bookmarks = [] }
      try {
        this.pins = this.learningBackendEnabled()
          ? (this.readWorkspaceStateValue('pins', []) || [])
          : JSON.parse(localStorage.getItem(this.userStorageKey('pins')) || '[]')
      } catch { this.pins = [] }
    },

    userStorageKey(suffix) {
      const uid = this.auth?.id || 'guest'
      return `telawa.${suffix}.${uid}`
    },

    resetControls() {
      this.openConfirmModal({
        title: 'Reset Session Controls?',
        message: 'This will reset all session settings to defaults. Your progress will not be lost.',
        confirmLabel: 'Reset',
        cancelLabel: 'Cancel',
        tone: 'warning',
        action: 'reset-session'
      })
    },

    performResetControls() {
      // Reset all session settings
      this.rangeStart = 1
      this.rangeEnd = 7
      this.speed = 1
      this.delay = 2
      this.recitationWindowSeconds = 8
      this.chainingEnabled = false
      this.chainingMethod = ''
      this.chainingRepetitions = 1
      this.playMode = 'auto'
      this.order = 'seq'
      this.focusModeEnabled = false
      this.blurModeEnabled = false
      this.anchorModeEnabled = false

      // Apply changes
      this.applySpeed()
      this.rebuildQueue()
      this.persistAllState()

      // Show feedback and keep panel open if needed
      this.showBanner(this.t('toasts.sessionControlsResetToDefaults'), 'success', 2000)

      // Don't close panel automatically - let user decide
    },

    adjustRange() {
      this.clampControlRange(this.currentMode)
      this.applyWorkspaceControls({ reason: 'range' })
    },

    onChapterChange(event) {
      const nextChapterId = Number.parseInt(event.target.value, 10) || 0
      this.chapterId = nextChapterId
      const selectedChapter = this.chapters.find(chapter => Number(chapter.id) === nextChapterId) || null
      this.currentChapter = selectedChapter
      if (selectedChapter) {
        this.rangeStart = 1
        this.rangeEnd = Math.min(7, Number(selectedChapter.verses_count || 7))
      }
      this.applyWorkspaceControls({ reason: 'chapter' })
    },

    refreshVerses() {
      this.applyWorkspaceControls({ reason: 'reciter' })
    },

    async handleSelfCheckReciterChange(event) {
      const nextReciterId = String(event?.target?.value || this.reciterId || DEFAULT_ALQURAN_RECITER)
      this.reciterId = nextReciterId
      this.stopRecordingsPlayback({ clearSource: true })
      if (this.audioElement && !this.audioElement.paused) {
        try { this.audioElement.pause() } catch { }
        this.isPlaying = false
      }
      const modalVerseKey = this.selfCheckModalVerse?.key || this.selfCheckVerseKey
      await this.applyWorkspaceControls({ reason: 'reciter', immediate: true })
      await this.$nextTick()
      if (modalVerseKey) {
        const refreshedVerse = (this.mushafDisplayVerses || []).find(verse => verse?.key === modalVerseKey)
          || (this.verses || []).find(verse => verse?.key === modalVerseKey)
        if (refreshedVerse) {
          this.selfCheckVerseRef = this.buildSelfCheckVerseRef(refreshedVerse)
          this.selfCheckVerseKey = refreshedVerse.key
        }
      }
      this.activeSelfCheckAyahPlaybackKey = ''
      this.showBanner(this.t('toasts.reciterUpdatedForThisSession'), 'success', 1400)
    },

    openRetentionQuiz() {
      this.sessionCompleted = false
      this.studyMode = 'quiz'
      this.startQuiz()
    },

    triggerSessionCompletionQuiz() {
      this.showTools = false
      this.topCardMenuOpen = false
      this.showSessionExitModal = false
      this.showSessionEndedModal = false
      this.showSessionQuizConfetti = true
      if (this.sessionQuizConfettiTimer) clearTimeout(this.sessionQuizConfettiTimer)
      this.sessionQuizConfettiTimer = setTimeout(() => {
        this.showSessionQuizConfetti = false
        this.sessionQuizConfettiTimer = null
      }, 2000)
      this.openRetentionQuiz()
    },

    resolveQuizPoolSkill() {
      if (['recite_text', 'audio_recall', 'meaning'].includes(this.quizFocus)) {
        return this.quizFocus
      }
      if (this.quizType === 'audio_mcq') return 'audio_recall'
      if (this.quizType === 'blank') return 'meaning'
      return 'recite_text'
    },

    resolveQuizTypeSequence() {
      if (this.quizType !== 'mixed') return [this.quizType]
      if (this.quizFocus === 'audio_recall') return ['audio_mcq', 'mcq']
      if (this.quizFocus === 'meaning') return ['blank', 'mcq']
      if (this.quizFocus === 'recite_text') return ['flashcard', 'mcq']
      return ['flashcard', 'mcq', 'blank', 'audio_mcq']
    },

    normalizeTextForQuiz(text) {
      return String(text || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[\u064B-\u065F\u0610-\u061A\u06D6-\u06ED]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    },

    quizMakePrompt(verse) {
      const src = this.normalizeTextForQuiz(verse.translation || verse.arabic)
      const words = src.split(' ').filter(Boolean)
      if (words.length < 4) return { prompt: src, missing: '' }
      const idx = Math.max(1, Math.min(words.length - 2, Math.floor(Math.random() * (words.length - 2)) + 1))
      const missing = words[idx] || ''
      const prompt = words.map((word, index) => (index === idx ? '____' : word)).join(' ')
      return { prompt, missing }
    },

    getQuizSourceVerses() {
      const byKey = new Map((this.verses || []).map(verse => [verse.key, verse]))
      const orderedQueue = []
      for (const item of this.queue || []) {
        if (!item?.key || !byKey.has(item.key) || orderedQueue.some(verse => verse.key === item.key)) continue
        orderedQueue.push(byKey.get(item.key))
      }
      if (this.planRun && this.todayPlan?.segments?.length) {
        const segment = this.todayPlan.segments[this.planRun.segmentIndex || 0]
        const segmentVerses = (segment?.keys || []).map(key => byKey.get(key)).filter(Boolean)
        if (segmentVerses.length) return segmentVerses
      }
      if (this.todayPlan?.quizKeys?.length) {
        const planned = this.todayPlan.quizKeys.map(key => byKey.get(key)).filter(Boolean)
        if (planned.length) return planned
      }
      if ((this.chainingEnabled || this.order === 'chain') && orderedQueue.length) return orderedQueue
      return orderedQueue.length ? orderedQueue : [...this.verses]
    },

    buildQuizOptions(verse, { audioLabels = false } = {}) {
      const options = new Set([verse.key])
      const idx = this.verses.findIndex(item => item.key === verse.key)
      const nearby = []
      for (let i = Math.max(0, idx - 6); i <= Math.min(this.verses.length - 1, idx + 6); i += 1) {
        if (i !== idx) nearby.push(this.verses[i].key)
      }
      while (options.size < 4 && nearby.length) {
        const pick = nearby.splice(Math.floor(Math.random() * nearby.length), 1)[0]
        options.add(pick)
      }
      while (options.size < 4 && this.verses.length > 3) {
        const pick = this.verses[Math.floor(Math.random() * this.verses.length)]
        options.add(pick.key)
      }
      return [...options].sort(() => Math.random() - 0.5).map((key) => {
        const item = this.verses.find(entry => entry.key === key)
        const number = item ? item.number : parseInt(String(key).split(':')[1], 10)
        if (audioLabels) {
          return { key, label: `${key} • ${this.t('memorisation.quiz.ayahLabel', { number })}` }
        }
        const snippet = this.normalizeTextForQuiz((item?.arabic || '').replace(/<[^>]+>/g, '')).slice(0, 36)
        return { key, label: `${key} • ${number} • ${snippet}`.trim() }
      })
    },

    // Quiz methods
    startQuiz() {
      if (!this.verses.length) {
        this.showBanner(this.t('toasts.noVersesToQuizOn'), 'info', 3000)
        return
      }
      this.sessionCompleted = false
      const skill = this.resolveQuizPoolSkill()
      this.quizSkill = skill
      const targetCount = [4, 6, 8, 10, 12].includes(Number(this.quizLength)) ? Number(this.quizLength) : 6
      const source = this.getQuizSourceVerses()
      const now = Date.now()
      const due = source.filter(verse => Number(this.sm2?.[this.sm2CardKey(verse.key, skill)]?.due || 0) <= now)
      const rest = source.filter(verse => !due.includes(verse))
      const seen = new Set()
      const pool = []
      for (const verse of [...due, ...rest]) {
        if (seen.has(verse.key)) continue
        seen.add(verse.key)
        pool.push(verse)
        if (pool.length >= targetCount) break
      }
      if (!pool.length) {
        this.showBanner(this.t('toasts.noVersesToQuizOn'), 'info', 3000)
        return
      }
      this.quizQueue = pool
      this.quizIndex = 0
      this.quizScore = 0
      this.quizMistakes = []
      this.quizComplete = false
      this.quizActive = true
      this.quizRevealed = false
      this.quizLastResult = null
      this.quizSummaryActive = false
      this.quizSessionStats = {
        total: pool.length,
        correct: 0,
        qualitySum: 0,
        answers: [],
        mistakes: [],
        skillTotals: {},
        startedAt: Date.now(),
        durationMs: 0
      }
      this.nextQuizCard()
    },

    nextQuizCard() {
      const verse = this.quizQueue[this.quizIndex]
      if (!verse) {
        if (this.quizSessionStats) {
          this.quizSessionStats.durationMs = Math.max(0, Date.now() - Number(this.quizSessionStats.startedAt || Date.now()))
        }
        this.quizComplete = true
        this.quizSummaryActive = true
        this.quizCard = null
        return
      }
      const typeSequence = this.resolveQuizTypeSequence()
      const type = typeSequence[this.quizIndex % typeSequence.length] || 'flashcard'
      const skill = type === 'audio_mcq'
        ? 'audio_recall'
        : type === 'blank'
          ? 'meaning'
          : 'recite_text'
      this.quizSkill = skill
      this.quizCard = { ...verse, type, skill }
      this.quizAnswer = ''
      this.quizOptions = []
      this.quizRevealed = type === 'flashcard' ? false : true
      this.quizLastResult = null
      if (type === 'mcq') {
        this.quizOptions = this.buildQuizOptions(verse)
      }
      if (type === 'audio_mcq') {
        this.quizOptions = this.buildQuizOptions(verse, { audioLabels: true })
        setTimeout(() => this.playVerse(verse), 50)
      }
      if (type === 'blank') {
        const { prompt, missing } = this.quizMakePrompt(verse)
        this.quizCard.prompt = prompt
        this.quizCard.missing = missing
      }
    },

    submitQuiz(qualityOverride = null) {
      const card = this.quizCard
      if (!card) return
      let quality = 4
      if (typeof qualityOverride === 'number') quality = qualityOverride
      else if (card.type === 'mcq' || card.type === 'audio_mcq') quality = this.quizAnswer === card.key ? 4 : 2
      else if (card.type === 'blank') {
        const answer = this.normalizeTextForQuiz(this.quizAnswer).toLowerCase()
        const missing = this.normalizeTextForQuiz(card.missing).toLowerCase()
        if (answer && missing && answer === missing) quality = 4
        else if (answer && missing && (missing.startsWith(answer) || answer.startsWith(missing))) quality = 3
        else quality = 2
      }
      if (this.quizSessionStats) {
        const skillKey = card.skill || this.quizSkill || 'recite_text'
        const skillTotals = { ...(this.quizSessionStats.skillTotals || {}) }
        const currentSkill = skillTotals[skillKey] || { total: 0, correct: 0 }
        this.quizSessionStats.qualitySum += quality
        const isCorrect = quality >= 4
        if (isCorrect) this.quizSessionStats.correct += 1
        else this.quizSessionStats.mistakes.push(card.key)
        this.quizSessionStats.answers.push({ key: card.key, quality, type: card.type })
        currentSkill.total += 1
        if (isCorrect) currentSkill.correct += 1
        skillTotals[skillKey] = currentSkill
        this.quizSessionStats.skillTotals = skillTotals
        this.quizSessionStats.durationMs = Math.max(0, Date.now() - Number(this.quizSessionStats.startedAt || Date.now()))
      }
      if (quality >= 4) this.quizScore += 1
      else this.quizMistakes.push(this.t('memorisation.quiz.mistakeAyah', { number: card.number }))
      this.quizLastResult = { at: Date.now(), key: card.key, quality, skill: card.skill }
      this.quizIndex += 1
      this.nextQuizCard()
      if (this.studyMode === 'hybrid' && this.hybridPendingKey) {
        this.hybridPendingKey = null
        this.quizActive = false
        this.quizCard = null
        this.quizQueue = []
        this.quizIndex = 0
        setTimeout(() => {
          if (this.playMode === 'auto') this.next()
        }, (this.delay || 0) * 1000)
      }
    },

    stopQuiz() {
      this.quizActive = false
      this.quizCard = null
      this.quizQueue = []
      this.quizIndex = 0
      this.quizAnswer = ''
      this.quizOptions = []
      this.quizRevealed = false
      this.quizLastResult = null
      this.quizSummaryActive = false
      this.quizSessionStats = null
      this.quizComplete = false
      this.hybridPendingKey = null
    },

    restartQuiz() {
      this.quizSummaryActive = false
      this.quizIndex = 0
      this.quizSessionStats = null
      this.quizScore = 0
      this.quizMistakes = []
      this.quizComplete = false
      this.startQuiz()
    },

    sm2CardKey(verseKey, skill = 'recite_text') {
      return `${verseKey}:${skill}`
    },

    async playWordAudio(url, verse = null, wordIndex = null) {
      const directUrl = this.normalizeAudioUrl(typeof url === 'string' ? url : '')
      const targetVerse = verse?.key ? verse : (this.activeVerseRef || null)
      const targetIndex = Number.isFinite(Number(wordIndex)) ? Number(wordIndex) : -1

      if (!this.wordByWordAudioEnabled) {
        this.showBanner(this.t('toasts.enableWordAudioToPreviewIndividual'), 'info', 1600)
        return
      }

      if (!this.audioElement) {
        this.audioElement = this.$refs.audio
      }

      if (directUrl) {
        try {
          if (this.audioElement) {
            this.segmentEndTime = 0
            this.segmentPlaybackKind = ''
            this.stopWordHighlighting()
            if (targetVerse?.key) {
              this.setActiveVerse(targetVerse.key, { scroll: false })
              if (targetIndex >= 0) this.updateWordHighlight(targetVerse.key, targetIndex)
            }
            this.audioElement.pause()
            this.audioElement.src = directUrl
            this.audioElement.currentTime = 0
            const safeSpeed = this.normalizePlaybackSpeed(this.speed)
            this.audioElement.defaultPlaybackRate = safeSpeed
            this.audioElement.playbackRate = safeSpeed
            await this.audioElement.play()
            if (targetVerse?.key && targetIndex >= 0) {
              this.updateWordHighlight(targetVerse.key, targetIndex)
            }
            this.playerVisible = true
            this.isPlaying = true
            this.markPlaybackStart()
            return
          }
        } catch { }

        const fallbackAudio = new Audio(directUrl)
        const fallbackSpeed = this.normalizePlaybackSpeed(this.speed)
        fallbackAudio.defaultPlaybackRate = fallbackSpeed
        fallbackAudio.playbackRate = fallbackSpeed
        fallbackAudio.play().catch(() => { })
        return
      }

      if (!targetVerse?.audio || targetIndex < 0) {
        this.showBanner(this.t('toasts.wordAudioIsNotAvailableFor'), 'info', 1800)
        return
      }

      const verseAudioUrl = this.normalizeAudioUrl(targetVerse.audio)
      if (!verseAudioUrl || !this.audioElement) {
        this.showBanner(this.t('toasts.audioSystemNotReady'), 'error', 2200)
        return
      }

      const currentSrc = this.audioElement.currentSrc ? this.normalizeAudioUrl(this.audioElement.currentSrc) : ''

      try {
        this.segmentEndTime = 0
        this.segmentPlaybackKind = ''
        this.stopWordHighlighting()
        this.setActiveVerse(targetVerse.key, { scroll: false })
        this.playerVisible = true

        if (currentSrc !== verseAudioUrl) {
          this.audioElement.pause()
          this.audioElement.src = verseAudioUrl
          this.audioElement.load()
          await new Promise((resolve, reject) => {
            const onLoaded = () => {
              this.audioElement.removeEventListener('loadedmetadata', onLoaded)
              this.audioElement.removeEventListener('error', onError)
              resolve()
            }
            const onError = () => {
              this.audioElement.removeEventListener('loadedmetadata', onLoaded)
              this.audioElement.removeEventListener('error', onError)
              reject(new Error('word-audio-load-failed'))
            }
            this.audioElement.addEventListener('loadedmetadata', onLoaded, { once: true })
            this.audioElement.addEventListener('error', onError, { once: true })
          })
        }

        const timestamps = await this.ensureWordHighlightTrack(targetVerse, { force: true })
        const timing = Array.isArray(timestamps) ? timestamps[targetIndex] : null
        if (!timing) {
          this.showBanner(this.t('toasts.wordTimingUnavailableForThisAyah'), 'info', 1800)
          return
        }

        const segmentStart = Math.max(0, Number(timing.start || 0))
        const segmentEnd = Math.max(segmentStart + 0.12, Number(timing.end || timing.start || 0))

        this.segmentPlaybackKind = 'word'
        this.segmentEndTime = segmentEnd
        this.audioElement.currentTime = segmentStart
        const safeSpeed = this.normalizePlaybackSpeed(this.speed)
        this.audioElement.defaultPlaybackRate = safeSpeed
        this.audioElement.playbackRate = safeSpeed
        this.updateWordHighlight(targetVerse.key, targetIndex)
        await this.audioElement.play()
        this.isPlaying = true
        this.markPlaybackStart()
      } catch (error) {
        console.error('Word playback failed:', error)
        this.segmentEndTime = 0
        this.segmentPlaybackKind = ''
        this.showBanner(this.t('toasts.unableToPlayThisWordRight'), 'error', 2200)
      }
    },
    
  }
}
