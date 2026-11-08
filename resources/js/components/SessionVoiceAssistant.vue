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
          <div>
            <p class="session-voice__kicker">{{ t('dashboard.voice.kicker') }}</p>
            <h2 id="session-voice-title">{{ t('dashboard.voice.title') }}</h2>
          </div>
          <button type="button" class="modal-close-btn session-voice__close" :aria-label="t('dashboard.voice.cancel')" @click="cancel">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div class="session-voice__langs" role="group" :aria-label="t('dashboard.voice.language')">
          <button
            type="button"
            class="session-voice__lang"
            :class="{ 'is-active': language === 'en' }"
            :aria-pressed="language === 'en' ? 'true' : 'false'"
            @click="setLanguage('en')"
          >{{ t('dashboard.voice.langEn') }}</button>
          <button
            type="button"
            class="session-voice__lang"
            :class="{ 'is-active': language === 'ar' }"
            :aria-pressed="language === 'ar' ? 'true' : 'false'"
            @click="setLanguage('ar')"
          >{{ t('dashboard.voice.langAr') }}</button>
        </div>

        <div v-if="phase === 'listening'" class="session-voice__listen">
          <div class="session-voice__status" role="status" aria-live="polite">
            <span class="session-voice__pulse" aria-hidden="true"></span>
            <span>{{ speechSeen ? t('dashboard.voice.listening') : t('dashboard.voice.waiting') }}</span>
          </div>
          <div class="session-voice__wave" aria-hidden="true">
            <span
              v-for="(level, index) in displayBars"
              :key="index"
              :style="{ transform: `scaleY(${level})` }"
            ></span>
          </div>
          <p v-if="transcript" class="session-voice__heard" dir="auto">
            <span>{{ t('dashboard.voice.heard') }}</span>
            {{ transcript }}
          </p>
          <p class="session-voice__hint">{{ t('dashboard.voice.hint') }}</p>
          <p class="session-voice__limit">{{ t('dashboard.voice.limitHint') }}</p>
          <div class="session-voice__actions">
            <button type="button" class="btn btn-primary session-voice__done" @click="finishSpeaking">
              {{ t('dashboard.voice.done') }}
            </button>
            <button type="button" class="btn btn-outline-secondary" @click="cancel">
              {{ t('dashboard.voice.cancel') }}
            </button>
          </div>
        </div>

        <div v-else-if="phase === 'understanding' || phase === 'starting'" class="session-voice__busy" role="status" aria-live="polite">
          <div class="spinner-border session-voice__spinner" role="presentation"></div>
          <p>{{ phase === 'starting' ? t('dashboard.voice.starting') : t('dashboard.voice.understanding') }}</p>
          <p v-if="summary" class="session-voice__summary">{{ summary }}</p>
          <p v-if="limitReached" class="session-voice__limit">{{ t('dashboard.voice.limitReached') }}</p>
        </div>

        <div v-else-if="phase === 'clarify'" class="session-voice__clarify" role="status">
          <p>{{ clarifyMessage }}</p>
          <div v-if="reciterOptions.length" class="session-voice__choices">
            <button
              v-for="option in reciterOptions"
              :key="option.id"
              type="button"
              class="btn btn-outline-secondary session-voice__choice"
              @click="choose({ reciter: option.id })"
            >{{ option.name }}</button>
          </div>
          <div v-else-if="surahOptions.length" class="session-voice__choices">
            <button
              v-for="option in surahOptions"
              :key="option.id"
              type="button"
              class="btn btn-outline-secondary session-voice__choice"
              @click="choose({ surah: option.id })"
            >{{ option.name }}</button>
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
          <div v-else-if="canConfirmRange" class="session-voice__choices">
            <button type="button" class="btn btn-primary session-voice__choice" @click="confirmRange">
              {{ t('dashboard.voice.useRange', { start: clarification.suggested_start, end: clarification.suggested_end }) }}
            </button>
          </div>
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
import { buildSessionVoiceHref } from '../scripts/sessionVoice/href.js'
import { idleWaveformBarLevels } from '../scripts/audio/voiceNoteLiveAnalyser.js'
import { MICROPHONE_ACCESS_KIND } from '../scripts/audio/microphonePermissionHelp.js'

export default {
  name: 'SessionVoiceAssistant',
  props: {
    memorisationUrl: { type: String, default: '/memorisation' },
    theme: { type: String, default: 'light' },
  },
  emits: ['close'],
  data() {
    const lang = typeof document !== 'undefined' ? String(document.documentElement.lang || 'en') : 'en'
    return {
      phase: 'listening',
      language: lang.startsWith('ar') ? 'ar' : 'en',
      transcript: '',
      bars: idleWaveformBarLevels(12),
      speechSeen: false,
      limitReached: false,
      errorKind: '',
      result: null,
      overrides: {},
      listener: null,
      generation: 0,
    }
  },
  computed: {
    displayBars() {
      const bars = Array.isArray(this.bars) && this.bars.length ? this.bars : idleWaveformBarLevels(12)
      return bars.slice(0, 12)
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
    canConfirmRange() {
      return this.result?.reason === 'reversed_range'
        && this.clarification.suggested_start
        && this.clarification.suggested_end
    },
    summary() {
      const command = this.result?.command
      if (!command) return ''
      const parts = [
        this.modeLabel(command.mode),
        command.surah_name,
        this.t('dashboard.voice.ayahRange', { start: command.start_ayah, end: command.end_ayah }),
      ]
      if (command.reciter_label) parts.push(command.reciter_label)
      if (command.repetitions) parts.push(this.t('dashboard.voice.repetitions', { count: command.repetitions }))
      if (command.speed != null) parts.push(`${command.speed}×`)
      return parts.filter(Boolean).join(' · ')
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
      if (this.errorKind === 'transcription') return this.t('dashboard.voice.transcriptionFailed')
      return this.t('dashboard.voice.genericError')
    },
  },
  mounted() {
    this.$nextTick(() => this.$refs.dialog?.focus?.())
    void this.begin()
  },
  beforeUnmount() {
    this.generation += 1
    this.listener?.cancel?.()
    this.listener = null
  },
  methods: {
    modeLabel(mode) {
      if (mode === 'revise') return this.t('dashboard.voice.modeRevise')
      if (mode === 'test') return this.t('dashboard.voice.modeTest')
      if (mode === 'recite') return this.t('dashboard.voice.modeRecite')
      return this.t('dashboard.voice.modeMemorise')
    },
    async setLanguage(language) {
      this.language = language
      try { await this.listener?.setLanguage?.(language) } catch { /* keep the current take */ }
    },
    async begin() {
      const generation = ++this.generation
      this.phase = 'listening'
      this.transcript = ''
      this.speechSeen = false
      this.limitReached = false
      this.errorKind = ''
      this.result = null
      this.listener?.cancel?.()
      this.listener = createSessionVoiceListener({
        language: this.language,
        onUpdate: (state) => {
          if (generation !== this.generation || this.phase !== 'listening') return
          this.transcript = state.transcript || ''
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
      this.listener = null
      this.limitReached = !!state.limitReached
      this.transcript = state.transcript || this.transcript
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
      this.phase = 'understanding'
      try {
        const result = await interpretSessionVoiceCommand({
          transcript: this.transcript,
          overrides: this.overrides,
        })
        this.result = result
        if (result?.ok && result.command?.surah) {
          this.phase = 'starting'
          window.location.assign(buildSessionVoiceHref(this.memorisationUrl, result.command))
          return
        }
        this.phase = 'clarify'
      } catch (error) {
        this.phase = 'error'
        this.errorKind = error?.response?.status === 401 ? 'auth' : 'transcription'
      }
    },
    async choose(patch) {
      this.overrides = { ...this.overrides, ...patch }
      await this.interpret()
    },
    async confirmRange() {
      await this.choose({
        start_ayah: this.clarification.suggested_start,
        end_ayah: this.clarification.suggested_end,
      })
    },
    async tryAgain() {
      this.overrides = {}
      await this.begin()
    },
    cancel() {
      this.generation += 1
      this.listener?.cancel?.()
      this.listener = null
      this.$emit('close')
    },
  },
}
</script>

<style src="./SessionVoiceAssistant.css"></style>
