<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay mutqin-modal-overlay ask-mutqin-overlay"
      :data-theme="themeAttr"
      :class="{ 'is-busy': isBusy }"
      @mousedown.self.prevent
      @click.self.prevent
      @keydown.esc.prevent="onEscape"
    >
      <div class="modal-dialog modal-dialog-centered mutqin-modal-dialog ask-mutqin-dialog">
        <div
          ref="dialog"
          class="modal-content mutqin-modal-surface ask-mutqin-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="askMutqinTitle"
          tabindex="-1"
        >
          <header class="ask-mutqin-header">
            <div class="ask-mutqin-header__copy">
              <span class="ask-mutqin-kicker">{{ t('memorisation.askMutqin.kicker') }}</span>
              <h2 id="askMutqinTitle">{{ title }}</h2>
            </div>
            <div
              v-if="isListening"
              class="ask-mutqin-recording"
              role="status"
              aria-live="polite"
            >
              <span class="ask-mutqin-recording__pulse" aria-hidden="true"></span>
              <span>{{ recordingLabel }}</span>
            </div>
            <button
              type="button"
              class="modal-close-btn ask-mutqin-close"
              :aria-label="t('common.close')"
              @click="requestClose"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>

          <div class="ask-mutqin-body">
            <p v-if="!match && state !== 'error'" class="ask-mutqin-intro">
              {{ t('memorisation.askMutqin.featureBrief') }}
            </p>
            <section
              v-if="state !== 'error'"
              class="ask-mutqin-ayah"
              :class="{
                'is-live': isListening && !match,
                'is-matched': !!match,
              }"
              dir="rtl"
              lang="ar"
              :aria-label="ayahPanelLabel"
            >
              <div class="ask-mutqin-ayah__bar">
                <span class="ask-mutqin-ayah__label">{{ ayahPanelLabel }}</span>
                <span v-if="matchMeta" class="ask-mutqin-ayah__meta">{{ matchMeta }}</span>
              </div>
              <div ref="ayahStage" class="ask-mutqin-ayah__stage">
                <p
                  class="ask-mutqin-ayah__text"
                  :class="{ 'is-frozen': !!match, 'is-searching': isSearching }"
                  :style="arabicTextStyle"
                >
                  <template v-if="panelArabic">
                    <span class="ask-mutqin-ayah__verse">{{ panelArabic }}</span>
                    <span v-if="ayahMark" class="ask-mutqin-ayah__mark">{{ ayahMark }}</span>
                  </template>
                  <span
                    v-else
                    class="ask-mutqin-ayah__placeholder"
                    dir="auto"
                    lang="en"
                  >
                    {{ t('memorisation.askMutqin.heardWaiting') }}
                  </span>
                </p>
                <div
                  v-if="isSearching"
                  class="ask-mutqin-searching"
                  role="status"
                  aria-live="polite"
                >
                  <span class="ask-mutqin-spinner" aria-hidden="true"></span>
                  <span>{{ t('memorisation.quranSearch.searching') }}</span>
                  <span class="ask-mutqin-searching__dots" aria-hidden="true">
                    <i></i><i></i><i></i>
                  </span>
                </div>
              </div>
            </section>

            <section
              v-if="match"
              class="ask-mutqin-aid"
              :aria-label="t('memorisation.askMutqin.aidLabel')"
            >
              <div class="ask-mutqin-aid__toolbar">
                <div class="ask-mutqin-aid__grid" role="tablist">
                  <button
                    v-for="option in aidOptions"
                    :key="option.kind"
                    type="button"
                    class="ask-mutqin-aid__tab"
                    :class="{ 'is-active': aidKind === option.kind }"
                    role="tab"
                    :aria-selected="aidKind === option.kind ? 'true' : 'false'"
                    @click="selectAid(option.kind)"
                  >
                    {{ option.label }}
                  </button>
                </div>
                <button
                  v-if="showFallbackActions"
                  type="button"
                  class="ask-mutqin-primary ask-mutqin-open"
                  @click="openHere"
                >
                  {{ openActionLabel }}
                </button>
              </div>
              <Transition name="ask-mutqin-aid-fade" mode="out-in">
                <div
                  :key="aidKind"
                  class="ask-mutqin-aid__box"
                  :class="{
                    'is-loading': aidLoading,
                  }"
                  role="tabpanel"
                  :dir="aidContent.dir"
                >
                  <p v-if="aidLoading" class="ask-mutqin-aid__status">
                    <span class="ask-mutqin-spinner" aria-hidden="true"></span>
                    {{ t('memorisation.askMutqin.aidLoading') }}
                  </p>
                  <p v-else-if="aidError" class="ask-mutqin-aid__status is-error" role="alert">
                    {{ aidError }}
                  </p>
                  <div v-else-if="aidContent.text || aidContent.sections?.length" class="ask-mutqin-aid__sections">
                    <article class="ask-mutqin-aid__section is-selected">
                      <p class="ask-mutqin-aid__lang" dir="ltr">{{ activeAidOption.label }}</p>
                      <div class="ask-mutqin-aid__body" :dir="aidContent.dir" lang="en">
                        <p
                          v-for="(paragraph, index) in activeAidParagraphs"
                          :key="`${aidKind}-${index}`"
                          class="ask-mutqin-aid__text"
                        >{{ paragraph }}</p>
                      </div>
                      <p v-if="aidContent.reference" class="ask-mutqin-aid__reference" dir="ltr">
                        <span>{{ t('memorisation.reading.sourceLabel') }}</span>
                        {{ aidContent.reference }}
                      </p>
                    </article>
                  </div>
                  <p v-else class="ask-mutqin-aid__status">
                    {{ t('memorisation.askMutqin.aidEmpty') }}
                  </p>
                </div>
              </Transition>
            </section>

            <div
              v-if="commandDisplay"
              class="ask-mutqin-command"
              dir="auto"
              :aria-label="t('memorisation.askMutqin.commandHeard')"
            >
              <span>{{ t('memorisation.askMutqin.commandHeard') }}</span>
              <p>{{ commandDisplay }}</p>
            </div>

            <div v-if="readySummary" class="ask-mutqin-ready">
              <strong>{{ t('memorisation.askMutqin.ready') }}</strong>
              <p>{{ readySummary.range }}</p>
              <p v-if="readySummary.settings">{{ readySummary.settings }}</p>
            </div>

            <p
              v-if="errorMessage"
              class="ask-mutqin-error"
              :class="{ 'is-limit': errorCode === 'usage_cap' }"
              role="alert"
            >{{ errorMessage }}</p>
          </div>

          <footer class="ask-mutqin-footer">
            <button
              v-if="state === 'error' && errorCode === 'usage_cap'"
              type="button"
              class="ask-mutqin-primary"
              @click="requestClose"
            >
              {{ t('common.close') }}
            </button>
            <button
              v-else-if="state === 'error'"
              type="button"
              class="ask-mutqin-primary"
              @click="retryFromError"
            >
              {{ t('common.tryAgain') }}
            </button>
            <div v-else-if="showSessionTools" class="ask-mutqin-actions">
              <button
                type="button"
                class="ask-mutqin-tool"
                @click="retryRecording"
              >
                <i class="bi bi-mic" aria-hidden="true"></i>
                <span>{{ t('memorisation.askMutqin.retryRecording') }}</span>
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import {
  ASK_MUTQIN_STATES,
  ASK_MUTQIN_AID_KINDS,
  createAskMutqinVoiceSession,
  interpretAskMutqinCommand,
  isAskMutqinRecordingState,
  appendHeardPayload,
  createHeardStream,
  heardStreamText,
  tokenizeHeardArabic,
  loadAskMutqinMatchingIndex,
  loadAskMutqinAyahAid,
  matchHeardAyahPrefix,
  resolveAskMutqinRange,
  resolveAskMutqinReciter,
  ASK_MUTQIN_MIN_WORDS,
} from '../scripts/askMutqin/index.js'
import { classifyMicrophoneAccessError, resolveMicrophoneHelp } from '../scripts/audio/recordingResilience.js'

const EMPTY_COMMAND = () => ({
  intent: 'open',
  count: null,
  until_ayah: null,
  after_this: false,
  just_this: false,
  reciter: null,
  reciter_label: null,
  speed: null,
  repetitions: null,
  autoplay: false,
})

const EMPTY_AID = () => ({ kind: 'translation', text: '', html: '', dir: 'ltr', reference: '', sections: [] })

/**
 * Wait after the last new Arabic words before locking a match.
 * Long enough for a cough, a breath, or a stutter without treating that gap as the end.
 */
const ASK_MUTQIN_RECITATION_PAUSE_MS = 2000

export default {
  name: 'AskMutqinModal',
  props: {
    open: { type: Boolean, default: false },
    theme: { type: String, default: 'light' },
    reciters: { type: Array, default: () => [] },
    currentSpeed: { type: [Number, String], default: 1 },
    currentReciterId: { type: String, default: '' },
    quranFontFamily: { type: String, default: '' },
    searchIndex: { type: Array, default: () => [] },
  },
  emits: ['close', 'apply'],
  data() {
    return {
      state: ASK_MUTQIN_STATES.INTRO,
      liveTranscript: '',
      recitationText: '',
      heard: createHeardStream(),
      commandText: '',
      match: null,
      candidates: [],
      command: EMPTY_COMMAND(),
      validatedRange: null,
      errorMessage: '',
      errorCode: '',
      recoverableState: ASK_MUTQIN_STATES.INTRO,
      interpreting: false,
      interpretKey: '',
      voice: null,
      index: [],
      openTimer: null,
      settleTimer: null,
      pendingMatchText: '',
      lastHeardForPause: '',
      clearedTranscript: '',
      speechActive: false,
      speechIdleTimer: null,
      aidKind: ASK_MUTQIN_AID_KINDS[0],
      aidContent: EMPTY_AID(),
      aidLoading: false,
      aidError: '',
      aidRequestKey: '',
    }
  },
  computed: {
    themeAttr() {
      return this.theme || 'light'
    },
    isBusy() {
      return isAskMutqinRecordingState(this.state)
        || this.state === ASK_MUTQIN_STATES.MATCHING
        || this.interpreting
    },
    isListening() {
      return [
        ASK_MUTQIN_STATES.RECITING,
        ASK_MUTQIN_STATES.AMBIGUOUS,
      ].includes(this.state)
    },
    recordingLabel() {
      return this.t('memorisation.askMutqin.recordingOn')
    },
    aidOptions() {
      return [
        { kind: 'translation', label: this.t('memorisation.reading.translation') },
        { kind: 'transliteration', label: this.t('memorisation.reading.transliteration') },
      ]
    },
    activeAidOption() {
      return this.aidOptions.find((option) => option.kind === this.aidKind) || this.aidOptions[0]
    },
    activeAidParagraphs() {
      if (this.aidContent.sections?.length) {
        return this.aidContent.sections.flatMap((section) => section.paragraphs || [])
      }
      return this.aidContent.text ? [this.aidContent.text] : []
    },
    ayahPanelLabel() {
      if (this.match) return this.t('memorisation.askMutqin.matchedLabel')
      return this.t('memorisation.askMutqin.heardLabel')
    },
    streamingText() {
      return String(heardStreamText(this.heard) || this.recitationText || '')
        .replace(/^[.\u06D4،,\s]+/, '')
        .trim()
    },
    panelArabic() {
      if (this.match?.arabic) return this.match.arabic
      return this.streamingText
    },
    isSearching() {
      return this.state === ASK_MUTQIN_STATES.MATCHING && !this.match && !this.voice
    },
    matchMeta() {
      if (!this.match) return ''
      return `${this.match.surahName} · ${this.match.ayah}`
    },
    title() {
      if (this.state === ASK_MUTQIN_STATES.ERROR && this.errorCode === 'usage_cap') {
        return this.t('memorisation.askMutqin.usageCapTitle')
      }
      if (this.state === ASK_MUTQIN_STATES.ERROR) return this.t('memorisation.askMutqin.errorTitle')
      if (this.state === ASK_MUTQIN_STATES.READY || this.state === ASK_MUTQIN_STATES.OPENING) {
        return this.t('memorisation.askMutqin.readyTitle')
      }
      if (this.state === ASK_MUTQIN_STATES.MATCHING) {
        return this.t('memorisation.quranSearch.searching')
      }
      if (this.match) return this.t('memorisation.askMutqin.foundTitle')
      if (this.state === ASK_MUTQIN_STATES.AMBIGUOUS) return this.t('memorisation.askMutqin.keepRecitingTitle')
      return this.t('memorisation.askMutqin.reciteTitle')
    },
    openActionLabel() {
      return this.t('memorisation.askMutqin.openHere')
    },
    showFallbackActions() {
      return [
        ASK_MUTQIN_STATES.FOUND,
        ASK_MUTQIN_STATES.LISTENING_COMMAND,
        ASK_MUTQIN_STATES.AMBIGUOUS,
        ASK_MUTQIN_STATES.INTERPRETING,
      ].includes(this.state) && !!this.match
    },
    showSessionTools() {
      return this.state !== ASK_MUTQIN_STATES.INTRO
        && this.state !== ASK_MUTQIN_STATES.ERROR
        && this.state !== ASK_MUTQIN_STATES.READY
        && this.state !== ASK_MUTQIN_STATES.OPENING
    },
    readySummary() {
      if (this.state !== ASK_MUTQIN_STATES.READY && this.state !== ASK_MUTQIN_STATES.OPENING) return null
      if (!this.match || !this.validatedRange) return null
      const start = this.validatedRange.ayah_start
      const end = this.validatedRange.ayah_end
      const range = end && end !== start
        ? `${this.match.surahName} · ${start}–${end}`
        : `${this.match.surahName} · ${start}`
      const settings = [
        this.command.reciter_label || this.reciterName(this.command.reciter),
        this.command.speed ? `${this.command.speed}×` : '',
        this.command.repetitions ? `${this.command.repetitions}×` : '',
      ].filter(Boolean).join(' · ')
      return { range, settings }
    },
    ayahMark() {
      const ayah = Number(this.match?.ayah || 0)
      if (!ayah || !this.match?.arabic) return ''
      return this.toArabicIndic(ayah)
    },
    commandDisplay() {
      if (!this.match) return ''
      return String(this.commandText || '').trim()
    },
    arabicTextStyle() {
      const family = String(this.quranFontFamily || '').trim()
        || '"KFGQPC Uthmanic Script HAFS", "UthmanicHafs", "Amiri Quran", "Amiri", "Noto Naskh Arabic", serif'
      return { fontFamily: family }
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(open) {
        this.syncBodyLock(open)
        if (open) {
          this.resetSession()
          this.$nextTick(() => {
            this.$refs.dialog?.focus?.()
            this.startSession()
          })
        } else {
          this.teardown()
        }
      },
    },
    match(next) {
      if (next) {
        this.$nextTick(() => this.resetAyahScroll())
        this.loadSelectedAid()
      } else {
        this.resetAidPanel()
      }
    },
  },
  beforeUnmount() {
    this.teardown()
  },
  methods: {
    t(key, params) {
      if (typeof this.$t === 'function') return this.$t(key, params)
      return key
    },
    reciterName(id) {
      return resolveAskMutqinReciter(id, this.reciters)?.name || ''
    },
    containsArabic(text) {
      return /[\u0600-\u06FF]/.test(String(text || ''))
    },
    arabicPauseKey(text) {
      return String(text || '')
        .replace(/[^\u0600-\u06FF\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    },
    toArabicIndic(value) {
      return String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)])
    },
    resetAyahScroll() {
      const stage = this.$refs.ayahStage
      if (!stage) return
      stage.scrollTop = 0
    },
    resetAidPanel() {
      this.aidContent = EMPTY_AID()
      this.aidLoading = false
      this.aidError = ''
      this.aidRequestKey = ''
    },
    selectAid(kind) {
      const next = ASK_MUTQIN_AID_KINDS.includes(kind) ? kind : 'translation'
      if (this.aidKind === next && (this.aidContent.text || this.aidContent.html || this.aidContent.sections?.length || this.aidLoading)) {
        return
      }
      this.aidKind = next
      if (this.match) this.loadSelectedAid()
    },
    async loadSelectedAid() {
      if (!this.match) {
        this.resetAidPanel()
        return
      }
      const kind = ASK_MUTQIN_AID_KINDS.includes(this.aidKind) ? this.aidKind : 'translation'
      this.aidKind = kind
      const requestKey = `${kind}:${this.match.surah}:${this.match.ayah}`
      this.aidRequestKey = requestKey
      this.aidLoading = true
      this.aidError = ''
      try {
        const content = await loadAskMutqinAyahAid(kind, this.match.surah, this.match.ayah)
        if (this.aidRequestKey !== requestKey) return
        this.aidContent = content
      } catch {
        if (this.aidRequestKey !== requestKey) return
        this.aidContent = EMPTY_AID()
        this.aidError = this.t('memorisation.askMutqin.aidError')
      } finally {
        if (this.aidRequestKey === requestKey) this.aidLoading = false
      }
    },
    resetSession() {
      this.teardown({ keepLock: true })
      this.state = ASK_MUTQIN_STATES.INTRO
      this.liveTranscript = ''
      this.recitationText = ''
      this.heard = createHeardStream()
      this.commandText = ''
      this.match = null
      this.candidates = []
      this.command = EMPTY_COMMAND()
      this.validatedRange = null
      this.errorMessage = ''
      this.errorCode = ''
      this.recoverableState = ASK_MUTQIN_STATES.INTRO
      this.interpreting = false
      this.interpretKey = ''
      this.pendingMatchText = ''
      this.lastHeardForPause = ''
      this.clearedTranscript = ''
      this.resetAidPanel()
      this.aidKind = ASK_MUTQIN_AID_KINDS[0]
      this.clearSpeechIdle()
    },
    async startSession() {
      if (this.state !== ASK_MUTQIN_STATES.INTRO && this.state !== ASK_MUTQIN_STATES.ERROR) return
      this.errorMessage = ''
      this.state = ASK_MUTQIN_STATES.RECITING
      try {
        this.index = await loadAskMutqinMatchingIndex(this.searchIndex)
        if (!this.index.length) {
          const error = new Error('matching_index_unavailable')
          error.code = 'transcription_unavailable'
          throw error
        }
        await this.ensureVoice().then((voice) => voice.start('ar'))
      } catch (error) {
        this.fail(error)
      }
    },
    ensureVoice() {
      if (this.voice) return Promise.resolve(this.voice)
      this.voice = createAskMutqinVoiceSession({
        onTranscript: (payload) => this.onTranscript(payload),
        onError: (error) => this.fail(error),
      })
      return Promise.resolve(this.voice)
    },
    onTranscript(payload) {
      if (this.state === ASK_MUTQIN_STATES.MATCHING && !this.match) return
      const filtered = this.transcriptAfterClear(payload)
      if (!filtered) return
      const nextHeard = appendHeardPayload(this.heard, filtered)
      const heardText = heardStreamText(nextHeard)
      const incoming = String(filtered?.transcript || '').trim()
      const isFinal = !!(filtered?.type === 'final' || filtered?.isFinal || filtered?.type === 'end-of-transcript')

      // Skip no-op Vue updates when partials repeat the same text.
      if (heardText !== this.recitationText || heardText !== heardStreamText(this.heard)) {
        this.heard = nextHeard
        if (heardText) {
          this.liveTranscript = heardText
          this.recitationText = heardText
        } else if (incoming && !this.match) {
          this.liveTranscript = incoming
        }
      } else {
        this.heard = nextHeard
      }

      if (!this.match) {
        if (heardText && this.index.length) {
          this.pendingMatchText = heardText
          // Only new Arabic words restart the wait. Coughs, breaths, and
          // repeated finals do not count as the end of the recitation.
          const pauseKey = this.arabicPauseKey(heardText)
          if (pauseKey && pauseKey !== this.lastHeardForPause) {
            this.lastHeardForPause = pauseKey
            this.markSpeechActive(ASK_MUTQIN_RECITATION_PAUSE_MS)
          }
        }
        return
      }
      if (isFinal) {
        const spoken = this.containsArabic(incoming)
          ? this.commandText
          : [this.commandText, incoming].filter(Boolean).join(' ').trim()
        this.commandText = spoken
        this.queueInterpret()
      }
    },
    markSpeechActive(delay = ASK_MUTQIN_RECITATION_PAUSE_MS) {
      this.speechActive = true
      if (this.speechIdleTimer) window.clearTimeout(this.speechIdleTimer)
      if (this.settleTimer) {
        window.clearTimeout(this.settleTimer)
        this.settleTimer = null
      }
      this.speechIdleTimer = window.setTimeout(() => {
        this.speechActive = false
        this.speechIdleTimer = null
        this.settleAfterRecitationPause()
      }, delay)
    },
    clearSpeechIdle() {
      if (this.speechIdleTimer) {
        window.clearTimeout(this.speechIdleTimer)
        this.speechIdleTimer = null
      }
      if (this.settleTimer) {
        window.clearTimeout(this.settleTimer)
        this.settleTimer = null
      }
      this.speechActive = false
    },
    async settleAfterRecitationPause() {
      if (this.match || this.speechActive || !this.index.length) return
      const text = String(this.pendingMatchText || heardStreamText(this.heard) || this.recitationText || '')
        .replace(/[.\u06D4،,]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (!text) return
      const wordTotal = tokenizeHeardArabic(text).length
      // This entry point is intentionally stricter than the low-level matcher:
      // the user must recite at least three words before we reveal a result.
      if (wordTotal < ASK_MUTQIN_MIN_WORDS) return
      // Stop the microphone and flush the final audio before showing the
      // matching spinner. This keeps the UI from implying that recording is
      // still active while the local index is being searched.
      this.state = ASK_MUTQIN_STATES.MATCHING
      this.stopListeningAfterMatch()
      await this.$nextTick()
      // Keep the search state visible long enough for the user to understand
      // that the finished recording is being checked against the Qur'an index.
      await new Promise((resolve) => window.setTimeout(resolve, 360))
      if (this.match || this.state !== ASK_MUTQIN_STATES.MATCHING) return
      const matched = this.applyMatch(text)
      if (!matched) await this.resumeListeningAfterMatchFailure()
    },
    applyMatch(transcript) {
      if (!this.index.length || this.match || this.speechActive) return false
      const text = String(transcript || '').trim()
      if (!text) return false
      const result = matchHeardAyahPrefix(this.index, text)
      if (result.status === 'matched' && result.match) {
        this.match = result.match
        this.candidates = []
        this.pendingMatchText = ''
        this.clearSpeechIdle()
        this.state = ASK_MUTQIN_STATES.FOUND
        this.stopListeningAfterMatch()
        return true
      }
      if (result.status === 'ambiguous') {
        this.state = ASK_MUTQIN_STATES.AMBIGUOUS
        return false
      }
      if (this.state !== ASK_MUTQIN_STATES.RECITING) {
        this.state = ASK_MUTQIN_STATES.RECITING
      }
      return false
    },
    stopListeningAfterMatch() {
      try { this.voice?.stop?.() } catch { /* ignore */ }
      this.voice = null
    },
    async resumeListeningAfterMatchFailure() {
      if (this.match || this.voice || this.state === ASK_MUTQIN_STATES.ERROR) return
      this.state = ASK_MUTQIN_STATES.RECITING
      try {
        await this.ensureVoice().then((voice) => voice.start('ar'))
      } catch (error) {
        this.fail(error)
      }
    },
    clearScreen() {
      const leftover = String(
        this.recitationText
        || this.liveTranscript
        || heardStreamText(this.heard)
        || '',
      ).replace(/\s+/g, ' ').trim()
      this.clearedTranscript = leftover
      this.errorMessage = ''
      this.commandText = ''
      this.interpretKey = ''
      this.validatedRange = null
      this.command = EMPTY_COMMAND()
      this.match = null
      this.candidates = []
      this.liveTranscript = ''
      this.recitationText = ''
      this.heard = createHeardStream()
      this.pendingMatchText = ''
      this.lastHeardForPause = ''
      this.interpreting = false
      this.resetAidPanel()
      this.clearSpeechIdle()
      this.resetAyahScroll()
      if (this.state === ASK_MUTQIN_STATES.FOUND || this.state === ASK_MUTQIN_STATES.LISTENING_COMMAND) {
        this.state = ASK_MUTQIN_STATES.RECITING
      }
      this.restartListeningAfterClear()
    },
    transcriptAfterClear(payload) {
      const blocked = String(this.clearedTranscript || '').trim()
      if (!blocked) return payload
      const incoming = String(payload?.transcript || '').replace(/\s+/g, ' ').trim()
      if (!incoming || incoming === blocked || blocked.startsWith(incoming)) return null
      if (incoming.startsWith(blocked)) {
        const suffix = incoming.slice(blocked.length).trim()
        this.clearedTranscript = ''
        if (!suffix) return null
        return { ...payload, transcript: suffix, words: suffix.split(/\s+/).filter(Boolean) }
      }
      this.clearedTranscript = ''
      return payload
    },
    async restartListeningAfterClear() {
      if (!this.voice && !this.isListening) return
      try {
        try { this.voice?.stop?.() } catch { /* ignore */ }
        this.voice = null
        this.state = ASK_MUTQIN_STATES.RECITING
        await this.ensureVoice().then((voice) => voice.start('ar'))
      } catch (error) {
        this.fail(error)
      }
    },
    async retryRecording() {
      this.errorMessage = ''
      this.clearSpeechIdle()
      this.match = null
      this.candidates = []
      this.heard = createHeardStream()
      this.recitationText = ''
      this.liveTranscript = ''
      this.commandText = ''
      this.command = EMPTY_COMMAND()
      this.validatedRange = null
      this.interpretKey = ''
      this.interpreting = false
      this.pendingMatchText = ''
      this.lastHeardForPause = ''
      this.resetAidPanel()
      this.aidKind = ASK_MUTQIN_AID_KINDS[0]
      this.resetAyahScroll()
      try {
        try { this.voice?.stop?.() } catch { /* ignore */ }
        this.voice = null
        this.state = ASK_MUTQIN_STATES.INTRO
        await this.startSession()
      } catch (error) {
        this.fail(error)
      }
    },
    queueInterpret() {
      const text = String(this.commandText || '').trim()
      if (!text || !this.match || this.interpreting) return
      if (this.interpretKey === text) return
      this.interpretCommand(text)
    },
    async interpretCommand(text) {
      if (!this.match || this.interpreting) return
      this.interpreting = true
      this.interpretKey = text
      this.recoverableState = this.state
      this.state = ASK_MUTQIN_STATES.INTERPRETING
      try {
        const result = await interpretAskMutqinCommand({
          transcript: text,
          surah: this.match.surah,
          ayah_start: this.match.ayah,
          current_speed: this.currentSpeed,
          current_reciter: this.currentReciterId,
          previous_command: this.command,
        })
        if (!result?.ok) {
          this.errorMessage = this.t('memorisation.askMutqin.invalidCommand')
          this.state = ASK_MUTQIN_STATES.LISTENING_COMMAND
          return
        }
        this.command = { ...this.command, ...result.command }
        this.validatedRange = result.range
        this.errorMessage = ''
        if (this.canOpenAutomatically(result.command)) {
          this.markReadyAndOpen()
        } else {
          this.state = ASK_MUTQIN_STATES.LISTENING_COMMAND
        }
      } catch {
        this.errorMessage = this.t('memorisation.askMutqin.networkError')
        this.state = ASK_MUTQIN_STATES.LISTENING_COMMAND
      } finally {
        this.interpreting = false
      }
    },
    canOpenAutomatically(command) {
      if (!command) return false
      return !!(
        command.count
        || command.until_ayah
        || command.just_this
        || command.intent === 'play'
        || command.intent === 'memorize'
        || command.autoplay
      )
    },
    openHere() {
      if (!this.match) return
      const start = Number(this.match.ayah || 0)
      const range = resolveAskMutqinRange({
        surah: this.match.surah,
        ayahStart: start,
        justThis: true,
      })
      if (!range.ok) {
        this.errorMessage = this.t('memorisation.askMutqin.invalidCommand')
        return
      }
      this.command = {
        ...this.command,
        just_this: true,
        until_ayah: null,
        intent: 'open',
      }
      this.validatedRange = {
        surah: range.surah,
        ayah_start: range.ayahStart,
        ayah_end: range.ayahEnd,
        open_ended: range.openEnded,
      }
      this.markReadyAndOpen()
    },
    markReadyAndOpen() {
      this.state = ASK_MUTQIN_STATES.READY
      if (this.openTimer) window.clearTimeout(this.openTimer)
      const reduceMotion = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      this.openTimer = window.setTimeout(() => this.openReader(), reduceMotion ? 0 : 280)
    },
    openReader() {
      if (!this.match || !this.validatedRange) return
      this.state = ASK_MUTQIN_STATES.OPENING
      this.teardown()
      this.$emit('apply', {
        surah: this.validatedRange.surah,
        ayahStart: this.validatedRange.ayah_start,
        ayahEnd: this.validatedRange.ayah_end,
        reciterId: this.command.reciter || '',
        speed: this.command.speed,
        repetitions: this.command.repetitions,
        autoplay: !!this.command.autoplay,
        sessionMode: this.command.session_mode || 'new_learning',
      })
    },
    async retryFromError() {
      this.errorMessage = ''
      this.errorCode = ''
      if (this.match) {
        this.state = ASK_MUTQIN_STATES.FOUND
        return
      }
      this.resetSession()
      await this.startSession()
    },
    fail(error) {
      const code = String(error?.code || '')
      this.errorCode = code
      this.recoverableState = this.state
      const micKind = classifyMicrophoneAccessError(error, {
        unsupported: code === 'unsupported' || code === 'no_get_user_media',
      })
      if (micKind !== 'unknown') {
        const help = resolveMicrophoneHelp((key) => this.t(key), { error, kind: micKind })
        this.errorMessage = [help.explanation, ...help.steps].filter(Boolean).join(' ')
      } else if (code === 'usage_cap') {
        this.errorMessage = this.t('memorisation.aiCheck.usageCapReached')
      } else if (code === 'transcription_unavailable') {
        this.errorMessage = this.t('memorisation.askMutqin.serviceUnavailable')
      } else {
        this.errorMessage = this.t('memorisation.askMutqin.networkError')
      }
      this.state = ASK_MUTQIN_STATES.ERROR
      this.teardown({ keepLock: true })
    },
    onEscape() {
      this.requestClose()
    },
    requestClose() {
      this.teardown()
      this.$emit('close')
    },
    syncBodyLock(open) {
      if (typeof document === 'undefined') return
      document.documentElement.classList.toggle('ask-mutqin-open', open)
      document.body.classList.toggle('ask-mutqin-open', open)
    },
    teardown(options = {}) {
      if (this.openTimer) {
        window.clearTimeout(this.openTimer)
        this.openTimer = null
      }
      this.clearSpeechIdle()
      try { this.voice?.stop?.() } catch { /* ignore */ }
      this.voice = null
      this.interpreting = false
      if (!options.keepLock) this.syncBodyLock(false)
    },
  },
}
</script>

<style src="./AskMutqinModal.css"></style>
