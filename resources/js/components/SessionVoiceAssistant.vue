<template>
  <Teleport to="body">
    <div
      class="modal-overlay mutqin-modal-overlay session-voice-overlay"
      :data-theme="theme"
      @keydown.esc.prevent="cancel"
    >
      <div class="modal-dialog modal-dialog-centered mutqin-modal-dialog session-voice-dialog">
      <div
        ref="dialog"
        class="modal-content mutqin-modal-surface session-voice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-voice-title"
        tabindex="-1"
      >
        <header class="session-voice__header">
          <div class="session-voice__heading">
            <div class="session-voice__title-row">
              <h2 id="session-voice-title">{{ t('dashboard.voice.title') }}</h2>
              <span class="session-voice__beta">{{ t('dashboard.voice.beta') }}</span>
            </div>
            <p class="session-voice__lead">{{ t('dashboard.voice.hint') }}</p>
          </div>
          <button type="button" class="modal-close-btn session-voice__close" :aria-label="t('dashboard.voice.cancel')" @click="cancel">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div v-if="phase === 'idle'" class="session-voice__idle">
          <button type="button" class="session-voice__mic" data-testid="session-voice-start" :aria-label="t('dashboard.voice.ask')" @click="begin">
            <i class="bi bi-mic" aria-hidden="true"></i>
          </button>
          <p class="session-voice__tap">{{ t('dashboard.voice.tap') }}</p>
          <p class="session-voice__example">{{ t('dashboard.voice.exampleLine') }}</p>
        </div>

        <div v-else-if="phase === 'listening'" class="session-voice__listen">
          <div class="session-voice__status" role="status" aria-live="polite">
            <span class="session-voice__pulse" aria-hidden="true"></span>
            <span>{{ t('dashboard.voice.listening') }}</span>
          </div>
          <div class="session-voice__wave" aria-hidden="true">
            <span
              v-for="(level, index) in waveLevels"
              :key="index"
              :style="{ '--sv-level': level }"
            ></span>
          </div>
          <p
            v-if="transcript"
            class="session-voice__transcript"
            :class="{ 'is-interim': interim }"
          >{{ transcript }}</p>
          <div v-if="sessionBrief" class="session-voice__brief" dir="rtl" lang="ar">
            <p class="session-voice__brief-primary">{{ sessionBrief.primary }}</p>
            <p v-if="sessionBrief.secondary" class="session-voice__brief-secondary">{{ sessionBrief.secondary }}</p>
          </div>
          <div class="session-voice__actions">
            <button type="button" class="btn btn-primary session-voice__done" @click="finishSpeaking">
              {{ t('dashboard.voice.done') }}
            </button>
            <button type="button" class="btn btn-outline-secondary" @click="cancel">
              {{ t('dashboard.voice.cancel') }}
            </button>
          </div>
        </div>

        <div v-else-if="phase === 'ready'" class="session-voice__ready" role="status" aria-live="polite">
          <p class="session-voice__ready-title">{{ t('dashboard.voice.ready') }}</p>
          <div v-if="sessionBrief" class="session-voice__brief" dir="rtl" lang="ar">
            <p class="session-voice__brief-primary">{{ sessionBrief.primary }}</p>
            <p v-if="sessionBrief.secondary" class="session-voice__brief-secondary">{{ sessionBrief.secondary }}</p>
          </div>
          <div class="session-voice__actions">
            <button type="button" class="btn btn-outline-secondary" @click="tryAgain">{{ t('dashboard.voice.tryAgain') }}</button>
          </div>
        </div>

        <div v-else-if="phase === 'understanding' || phase === 'preparing'" class="session-voice__busy" role="status" aria-live="polite">
          <div class="spinner-border session-voice__spinner" role="presentation"></div>
          <p>{{ phase === 'preparing' ? t('dashboard.voice.starting') : t('dashboard.voice.understanding') }}</p>
          <div v-if="sessionBrief" class="session-voice__brief" dir="rtl" lang="ar">
            <p class="session-voice__brief-primary">{{ sessionBrief.primary }}</p>
            <p v-if="sessionBrief.secondary" class="session-voice__brief-secondary">{{ sessionBrief.secondary }}</p>
          </div>
        </div>

        <div v-else-if="phase === 'clarify'" class="session-voice__clarify" role="status">
          <p>{{ clarifyMessage }}</p>
          <div v-if="reciterOptions.length" class="session-voice__choices">
            <button
              v-for="option in reciterOptions"
              :key="option.id"
              type="button"
              class="btn btn-outline-secondary session-voice__choice"
              dir="rtl"
              lang="ar"
              @click="choose({ reciter: option.id })"
            >{{ option.name_ar || option.name }}</button>
          </div>
          <div v-else-if="surahOptions.length" class="session-voice__choices">
            <button
              v-for="option in surahOptions"
              :key="option.id"
              type="button"
              class="btn btn-outline-secondary session-voice__choice"
              dir="rtl"
              lang="ar"
              @click="choose({ surah: option.id })"
            >{{ option.name_ar || option.name }}</button>
          </div>
          <div v-else-if="speedOptions.length" class="session-voice__choices">
            <button
              v-for="option in speedOptions"
              :key="option"
              type="button"
              class="btn btn-outline-secondary session-voice__choice"
              @click="choose({ speed: option })"
            >{{ option }}×</button>
          </div>
          <div v-else-if="lowConfidenceOptions.length" class="session-voice__choices">
            <button
              v-for="option in lowConfidenceOptions"
              :key="`${option.id}`"
              type="button"
              class="btn btn-outline-secondary session-voice__choice"
              dir="rtl"
              lang="ar"
              @click="confirmLowConfidence(option)"
            >{{ option.name_ar || option.name }}</button>
          </div>
          <div v-else-if="canConfirmRange" class="session-voice__choices">
            <button type="button" class="btn btn-primary session-voice__choice" @click="confirmRange">
              {{ t('dashboard.voice.useRange', { start: clarification.suggested_start, end: clarification.suggested_end }) }}
            </button>
          </div>
          <p v-if="phase === 'clarify'" class="session-voice__beta-note">{{ t('dashboard.voice.betaNote') }}</p>
          <div class="session-voice__actions">
            <button type="button" class="btn btn-outline-secondary" @click="tryAgain">{{ t('dashboard.voice.tryAgain') }}</button>
            <button type="button" class="btn btn-outline-secondary" @click="cancel">{{ t('dashboard.voice.cancel') }}</button>
          </div>
        </div>

        <div v-else class="session-voice__error" role="alert">
          <p>{{ errorMessage }}</p>
          <div class="session-voice__actions">
            <button type="button" class="btn btn-primary" @click="tryAgain">{{ t('dashboard.voice.tryAgain') }}</button>
            <button type="button" class="btn btn-outline-secondary" @click="cancel">{{ t('dashboard.voice.cancel') }}</button>
          </div>
        </div>
      </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { createSessionVoiceListener } from '../scripts/sessionVoice/listener.js'
import { interpretSessionVoiceCommand } from '../scripts/sessionVoice/interpret.js'
import { reportSessionVoiceMetrics } from '../scripts/sessionVoice/metrics.js'
import { buildSessionVoiceHref } from '../scripts/sessionVoice/href.js'
import { idleWaveformBarLevels } from '../scripts/audio/voiceNoteLiveAnalyser.js'
import { MICROPHONE_ACCESS_KIND } from '../scripts/audio/microphonePermissionHelp.js'
import { i18nMixin } from '../mixins/i18nMixin.js'

export default {
  name: 'SessionVoiceAssistant',
  mixins: [i18nMixin],
  props: {
    memorisationUrl: { type: String, default: '/memorisation' },
    theme: { type: String, default: 'light' },
    phraseHints: { type: Array, default: () => [] },
    workspaceControls: { type: Boolean, default: false },
  },
  emits: ['close', 'control'],
  data() {
    const lang = typeof document !== 'undefined' ? String(document.documentElement.lang || 'en') : 'en'
    return {
      phase: 'idle',
      startTimer: 0,
      language: lang.startsWith('ar') ? 'ar' : 'en',
      transcript: '',
      heardWords: [],
      interim: false,
      bars: idleWaveformBarLevels(12),
      speechSeen: false,
      limitReached: false,
      errorKind: '',
      result: null,
      overrides: {},
      listener: null,
      generation: 0,
      preview: null,
      previewTimer: 0,
      previewToken: 0,
      previewText: '',
    }
  },
  computed: {
    displayBars() {
      const bars = Array.isArray(this.bars) && this.bars.length ? this.bars : idleWaveformBarLevels(12)
      return bars.slice(0, 12)
    },
    waveLevels() {
      const raw = this.displayBars
      const energy = raw.reduce((sum, value) => sum + Number(value || 0), 0) / 12
      const lift = this.speechSeen ? Math.min(1, 0.38 + energy * 1.7) : 0.32
      return Array.from({ length: 12 }, (_, index) => {
        const shape = 0.36 + 0.64 * Math.sin((index / 11) * Math.PI)
        return Math.round(Math.max(0.22, Math.min(1, shape * lift)) * 100) / 100
      })
    },
    sessionBrief() {
      const source = this.result?.command
      if (!source?.surah) return null
      const surah = source.surah_name_ar || source.surah_name || ''
      let range = ''
      if (source.start_ayah && source.end_ayah) {
        range = this.t('dashboard.voice.ayahRange', { start: source.start_ayah, end: source.end_ayah })
      }
      const secondary = []
      const reciter = source.reciter_label_ar || source.reciter_label
      if (reciter) secondary.push(reciter)
      if (source.repetitions) secondary.push(this.t('dashboard.voice.summaryRepetitions', { count: source.repetitions }))
      if (source.speed != null) secondary.push(this.t('dashboard.voice.summarySpeed', { speed: source.speed }))
      return {
        primary: [surah, range].filter(Boolean).join(' · '),
        secondary: secondary.join(' · '),
      }
    },
    clarification() {
      return this.result?.clarification || {}
    },
    reciterOptions() {
      return this.result?.reason === 'ambiguous_reciter' ? (this.clarification.options || []) : []
    },
    surahOptions() {
      return this.result?.reason === 'ambiguous_surah' ? (this.clarification.options || []) : []
    },
    speedOptions() {
      return this.result?.reason === 'unsupported_speed' ? (this.clarification.supported || []) : []
    },
    lowConfidenceOptions() {
      return this.result?.reason === 'low_confidence' ? (this.clarification.options || []) : []
    },
    canConfirmRange() {
      return this.result?.reason === 'reversed_range'
        && this.clarification.suggested_start
        && this.clarification.suggested_end
    },
    clarifyMessage() {
      const reason = this.result?.reason
      if (reason === 'reversed_range') {
        return this.t('dashboard.voice.reversedRange', {
          start: this.clarification.start_ayah,
          end: this.clarification.end_ayah,
          suggestedStart: this.clarification.suggested_start,
          suggestedEnd: this.clarification.suggested_end,
        })
      }
      if (reason === 'invalid_range') {
        return this.t('dashboard.voice.invalidRange', {
          surah: this.clarification.surah_name,
          count: this.clarification.ayah_count,
        })
      }
      if (reason === 'ambiguous_reciter') return this.t('dashboard.voice.ambiguousReciter')
      if (reason === 'ambiguous_surah') return this.t('dashboard.voice.ambiguousSurah')
      if (reason === 'unknown_surah') return this.t('dashboard.voice.unknownSurah')
      if (reason === 'unknown_reciter') return this.t('dashboard.voice.unknownReciter')
      if (reason === 'low_confidence') return this.t('dashboard.voice.lowConfidence')
      if (reason === 'needs_session') return this.t('dashboard.voice.needsSession')
      if (reason === 'unsupported_speed') return this.t('dashboard.voice.unsupportedSpeed')
      if (reason === 'unsupported_repetitions') {
        return this.t('dashboard.voice.unsupportedRepetitions', {
          min: this.clarification.min,
          max: this.clarification.max,
        })
      }
      return this.t('dashboard.voice.genericError')
    },
    errorMessage() {
      if (this.errorKind === 'empty') return this.t('dashboard.voice.empty')
      if (this.errorKind === MICROPHONE_ACCESS_KIND.NOT_ALLOWED || this.errorKind === MICROPHONE_ACCESS_KIND.SECURITY) {
        return this.t('dashboard.voice.permissionDenied')
      }
      if (this.errorKind === MICROPHONE_ACCESS_KIND.NOT_FOUND) return this.t('dashboard.voice.micMissing')
      if (this.errorKind === MICROPHONE_ACCESS_KIND.NOT_READABLE) return this.t('dashboard.voice.micBusy')
      if (this.errorKind === MICROPHONE_ACCESS_KIND.UNSUPPORTED) return this.t('dashboard.voice.unsupported')
      if (this.errorKind === 'auth') return this.t('dashboard.voice.authRequired')
      if (this.errorKind === 'transcription' || this.errorKind === 'network') return this.t('dashboard.voice.transcriptionFailed')
      return this.t('dashboard.voice.genericError')
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.dialog?.focus?.())
  },
  beforeUnmount() {
    this.generation += 1
    this.clearStartTimer()
    this.clearPreview()
    this.listener?.cancel?.()
    this.listener = null
  },
  methods: {
    clearStartTimer() {
      if (this.startTimer) window.clearTimeout(this.startTimer)
      this.startTimer = 0
    },
    clearPreview() {
      if (this.previewTimer) window.clearTimeout(this.previewTimer)
      this.previewTimer = 0
      this.previewToken += 1
    },
    async begin() {
      this.clearStartTimer()
      this.clearPreview()
      const generation = ++this.generation
      this.phase = 'listening'
      this.transcript = ''
      this.heardWords = []
      this.preview = null
      this.previewText = ''
      this.speechSeen = false
      this.limitReached = false
      this.errorKind = ''
      this.result = null
      this.listener?.cancel?.()
      this.listener = createSessionVoiceListener({
        language: this.language,
        phraseHints: this.phraseHints,
        onUpdate: (state) => {
          if (generation !== this.generation || this.phase !== 'listening') return
          this.transcript = state.transcript || ''
          this.interim = !!state.interim
          this.bars = state.bars || this.bars
          this.speechSeen = !!state.speechSeen
        },
        onFinish: (state) => {
          if (generation !== this.generation) return
          void this.onListenFinished(state)
        },
      })
      await this.listener.start()
    },
    finishSpeaking() {
      this.listener?.finishNow?.()
    },
    async onListenFinished(state) {
      this.clearPreview()
      this.listener = null
      this.limitReached = !!state.limitReached
      this.transcript = state.transcript || this.transcript
      this.heardWords = Array.isArray(state.words) ? state.words : []
      if (state.metrics) reportSessionVoiceMetrics({ ...state.metrics, language: this.language })
      if (state.reason === 'error') {
        this.phase = 'error'
        this.errorKind = state.errorKind || 'unknown'
        return
      }
      if (!String(state.transcript || '').trim() || state.reason === 'empty') {
        this.phase = 'error'
        this.errorKind = 'empty'
        return
      }
      this.overrides = {}
      await this.interpret()
    },
    async interpret() {
      const generation = this.generation
      this.phase = 'understanding'
      try {
        const result = await interpretSessionVoiceCommand({
          transcript: this.transcript,
          overrides: this.overrides,
          words: this.heardWords,
        })
        if (generation !== this.generation) return
        this.result = result
        if (result?.ok && result.command?.control) {
          if (this.workspaceControls) {
            this.$emit('control', result.command)
            return
          }
          this.result = { ok: false, reason: 'needs_session', command: result.command }
          this.phase = 'clarify'
          return
        }
        if (result?.ok && result.command?.surah) {
          this.phase = 'ready'
          const generation = this.generation
          this.clearStartTimer()
          this.startTimer = window.setTimeout(() => {
            if (generation !== this.generation || this.phase !== 'ready') return
            this.startSession()
          }, 1400)
          return
        }
        this.phase = 'clarify'
      } catch (error) {
        if (generation !== this.generation) return
        this.phase = 'error'
        this.errorKind = error?.response?.status === 401 ? 'auth' : 'transcription'
      }
    },
    async choose(patch) {
      this.overrides = { ...this.overrides, ...patch }
      await this.interpret()
    },
    confirmLowConfidence(option) {
      if (this.clarification.field === 'reciter') {
        void this.choose({ reciter: option.id })
        return
      }
      void this.choose({ surah: option.id })
    },
    async confirmRange() {
      await this.choose({
        start_ayah: this.clarification.suggested_start,
        end_ayah: this.clarification.suggested_end,
      })
    },
    startSession() {
      const command = this.result?.command
      if (this.phase === 'preparing') return
      if (!command?.surah && !command?.resume) return
      this.clearStartTimer()
      this.generation += 1
      this.phase = 'preparing'
      try {
        const href = command.resume && !command.surah
          ? `${String(this.memorisationUrl || '/memorisation').split('?')[0]}?resume=1`
          : buildSessionVoiceHref(this.memorisationUrl, command)
        window.location.assign(href)
      } catch {
        this.phase = 'error'
        this.errorKind = 'unknown'
      }
    },
    async tryAgain() {
      this.clearStartTimer()
      this.overrides = {}
      this.result = null
      await this.begin()
    },
    cancel() {
      this.generation += 1
      this.clearStartTimer()
      this.clearPreview()
      this.listener?.cancel?.()
      this.listener = null
      this.$emit('close')
    },
  },
}
</script>

<style src="./SessionVoiceAssistant.css"></style>
