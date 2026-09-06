<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay mutqin-modal-overlay ask-mutqin-overlay"
      :data-theme="themeAttr"
      :class="{ 'is-busy': isBusy }"
      @mousedown.self.prevent="onBackdrop"
      @click.self.prevent="onBackdrop"
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
            <p v-if="!match && !errorMessage" class="ask-mutqin-tip">
              {{ t('memorisation.askMutqin.tipShort') }}
            </p>
            <p v-else-if="match && !errorMessage" class="ask-mutqin-tip">
              {{ t('memorisation.askMutqin.listeningHint') }}
            </p>

            <section
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
                  :class="{ 'is-frozen': !!match }"
                  :style="arabicTextStyle"
                >
                  <template v-if="panelArabic">
                    <span class="ask-mutqin-ayah__verse">{{ panelArabic }}</span>
                    <span v-if="ayahMark" class="ask-mutqin-ayah__mark">{{ ayahMark }}</span>
                  </template>
                  <span v-else class="ask-mutqin-ayah__placeholder">…</span>
                </p>
              </div>
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

            <p v-if="errorMessage" class="ask-mutqin-error" role="alert">{{ errorMessage }}</p>
          </div>

          <footer class="ask-mutqin-footer">
            <template v-if="state === 'error'">
              <button type="button" class="ask-mutqin-primary" @click="retryFromError">
                {{ t('common.tryAgain') }}
              </button>
            </template>
            <template v-else-if="showFallbackActions">
              <div class="ask-mutqin-actions">
                <button
                  type="button"
                  class="ask-mutqin-primary"
                  @click="openHere"
                >
                  {{ t('memorisation.askMutqin.openHere') }}
                </button>
                <div class="ask-mutqin-range">
                  <label class="ask-mutqin-range__field">
                    <span>{{ t('memorisation.askMutqin.untilAyah') }}</span>
                    <input
                      v-model.number="rangeEndDraft"
                      type="number"
                      :min="match?.ayah || 1"
                      :max="maxAyah"
                    >
                  </label>
                  <button
                    type="button"
                    class="ask-mutqin-secondary"
                    @click="confirmChosenRange"
                  >
                    {{ t('memorisation.askMutqin.openRange') }}
                  </button>
                </div>
              </div>
              <p class="ask-mutqin-actions__hint">
                {{ t('memorisation.askMutqin.openActionsHint') }}
              </p>
            </template>

            <div v-if="showSessionTools" class="ask-mutqin-tools">
              <button type="button" class="ask-mutqin-tool" @click="clearScreen">
                <i class="bi bi-eraser" aria-hidden="true"></i>
                <span>{{ t('memorisation.askMutqin.clearScreen') }}</span>
              </button>
              <button type="button" class="ask-mutqin-tool" @click="retryRecording">
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
  askMutqinSurahAyahCount,
  createAskMutqinVoiceSession,
  interpretAskMutqinCommand,
  isAskMutqinRecordingState,
  appendHeardPayload,
  createHeardStream,
  heardStreamText,
  heardWordCount,
  loadAskMutqinMatchingIndex,
  matchHeardAyahPrefix,
  resolveAskMutqinRange,
  resolveAskMutqinReciter,
  ASK_MUTQIN_MIN_WORDS,
} from '../scripts/askMutqin/index.js'
import { resolveMicDeniedGuidance } from '../scripts/audio/recordingResilience.js'

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

/** Wait this long after the last new heard text before locking a match. */
const ASK_MUTQIN_RECITATION_PAUSE_MS = 1000

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
      recoverableState: ASK_MUTQIN_STATES.INTRO,
      rangeEndDraft: 1,
      interpreting: false,
      interpretKey: '',
      voice: null,
      index: [],
      openTimer: null,
      settleTimer: null,
      pendingMatchText: '',
      lastHeardForPause: '',
      speechActive: false,
      speechIdleTimer: null,
    }
  },
  computed: {
    themeAttr() {
      return this.theme || 'light'
    },
    isBusy() {
      return isAskMutqinRecordingState(this.state) || this.interpreting
    },
    isListening() {
      return [
        ASK_MUTQIN_STATES.RECITING,
        ASK_MUTQIN_STATES.MATCHING,
        ASK_MUTQIN_STATES.FOUND,
        ASK_MUTQIN_STATES.LISTENING_COMMAND,
        ASK_MUTQIN_STATES.AMBIGUOUS,
      ].includes(this.state)
    },
    recordingLabel() {
      if (this.state === ASK_MUTQIN_STATES.LISTENING_COMMAND || this.state === ASK_MUTQIN_STATES.FOUND) {
        return this.t('memorisation.askMutqin.recordingListening')
      }
      return this.t('memorisation.askMutqin.recordingOn')
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
    matchMeta() {
      if (!this.match) return ''
      const start = this.validatedRange?.ayah_start || this.match.ayah
      const end = this.validatedRange?.ayah_end
      const ayah = end && end !== start ? `${start}–${end}` : String(start)
      return `${this.match.surahName} · ${ayah}`
    },
    title() {
      if (this.state === ASK_MUTQIN_STATES.ERROR) return this.t('memorisation.askMutqin.errorTitle')
      if (this.state === ASK_MUTQIN_STATES.READY || this.state === ASK_MUTQIN_STATES.OPENING) {
        return this.t('memorisation.askMutqin.readyTitle')
      }
      if (this.match) return this.t('memorisation.askMutqin.foundTitle')
      if (this.state === ASK_MUTQIN_STATES.AMBIGUOUS) return this.t('memorisation.askMutqin.keepRecitingTitle')
      return this.t('memorisation.askMutqin.reciteTitle')
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
    maxAyah() {
      return this.match ? askMutqinSurahAyahCount(this.match.surah) : 286
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
        this.rangeEndDraft = next.ayah
        this.$nextTick(() => this.resetAyahScroll())
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
    toArabicIndic(value) {
      return String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)])
    },
    resetAyahScroll() {
      const stage = this.$refs.ayahStage
      if (!stage) return
      stage.scrollTop = 0
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
      this.recoverableState = ASK_MUTQIN_STATES.INTRO
      this.interpreting = false
      this.interpretKey = ''
      this.pendingMatchText = ''
      this.lastHeardForPause = ''
      this.rangeEndDraft = 1
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
      const nextHeard = appendHeardPayload(this.heard, payload)
      const heardText = heardStreamText(nextHeard)
      const incoming = String(payload?.transcript || '').trim()
      const isFinal = !!(payload?.type === 'final' || payload?.isFinal || payload?.type === 'end-of-transcript')

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
          const pauseKey = heardText.replace(/[.\u06D4،,\s]+/g, ' ').trim()
          if (pauseKey !== this.lastHeardForPause || isFinal) {
            this.lastHeardForPause = pauseKey
            this.markSpeechActive()
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
    markSpeechActive() {
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
      }, ASK_MUTQIN_RECITATION_PAUSE_MS)
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
    settleAfterRecitationPause() {
      if (this.match || this.speechActive || !this.index.length) return
      const text = String(this.pendingMatchText || heardStreamText(this.heard) || this.recitationText || '')
        .replace(/[.\u06D4،,]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (!text) return
      const wordTotal = Math.max(
        heardWordCount(this.heard),
        text.split(/\s+/).filter(Boolean).length,
      )
      if (wordTotal < ASK_MUTQIN_MIN_WORDS) return
      this.applyMatch(text)
    },
    applyMatch(transcript) {
      if (!this.index.length || this.match || this.speechActive) return
      const text = String(transcript || '').trim()
      if (!text) return
      const result = matchHeardAyahPrefix(this.index, text)
      if (result.status === 'matched' && result.match) {
        this.match = result.match
        this.candidates = []
        this.pendingMatchText = ''
        this.clearSpeechIdle()
        this.state = ASK_MUTQIN_STATES.FOUND
        this.enterCommandPhase()
        return
      }
      if (result.status === 'ambiguous') {
        this.state = ASK_MUTQIN_STATES.AMBIGUOUS
        return
      }
      if (this.state !== ASK_MUTQIN_STATES.RECITING) {
        this.state = ASK_MUTQIN_STATES.RECITING
      }
    },
    async enterCommandPhase() {
      this.state = ASK_MUTQIN_STATES.LISTENING_COMMAND
      try {
        await this.voice?.setLanguage?.('en')
      } catch (error) {
        this.fail(error)
      }
    },
    clearScreen() {
      this.errorMessage = ''
      this.commandText = ''
      this.interpretKey = ''
      this.validatedRange = null
      this.command = EMPTY_COMMAND()
      if (this.match) {
        this.liveTranscript = ''
        this.rangeEndDraft = this.match.ayah
        return
      }
      this.heard = createHeardStream()
      this.recitationText = ''
      this.liveTranscript = ''
      this.pendingMatchText = ''
      this.lastHeardForPause = ''
      this.clearSpeechIdle()
      this.resetAyahScroll()
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
      this.rangeEndDraft = 1
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
        if (result.range?.ayah_end) this.rangeEndDraft = result.range.ayah_end
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
      const range = resolveAskMutqinRange({
        surah: this.match.surah,
        ayahStart: this.match.ayah,
        justThis: true,
      })
      if (!range.ok) {
        this.errorMessage = this.t('memorisation.askMutqin.invalidCommand')
        return
      }
      this.command = { ...this.command, just_this: true, intent: 'open' }
      this.validatedRange = {
        surah: range.surah,
        ayah_start: range.ayahStart,
        ayah_end: range.ayahEnd,
        open_ended: range.openEnded,
      }
      this.markReadyAndOpen()
    },
    confirmChosenRange() {
      if (!this.match) return
      const range = resolveAskMutqinRange({
        surah: this.match.surah,
        ayahStart: this.match.ayah,
        untilAyah: this.rangeEndDraft,
      })
      if (!range.ok) {
        this.errorMessage = this.t('memorisation.askMutqin.invalidCommand')
        return
      }
      this.command = { ...this.command, until_ayah: range.ayahEnd, intent: 'open' }
      this.validatedRange = {
        surah: range.surah,
        ayah_start: range.ayahStart,
        ayah_end: range.ayahEnd,
        open_ended: false,
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
      if (this.match) {
        this.state = ASK_MUTQIN_STATES.LISTENING_COMMAND
        try {
          await this.ensureVoice().then((voice) => voice.start('en'))
        } catch (error) {
          this.fail(error)
        }
        return
      }
      this.resetSession()
      await this.startSession()
    },
    fail(error) {
      const code = String(error?.code || '')
      this.recoverableState = this.state
      if (code === 'permission_denied') {
        this.errorMessage = resolveMicDeniedGuidance((key) => this.t(key))
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
    onBackdrop() {
      if (this.isBusy) return
      this.requestClose()
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
