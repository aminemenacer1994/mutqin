<template>
  <Teleport to="body">
    <div
      class="modal-overlay mutqin-modal-overlay mr-mutqin-modal-overlay"
      :data-theme="theme"
      @keydown.esc.prevent="close"
    >
      <div class="modal-dialog modal-dialog-centered mutqin-modal-dialog mr-mutqin-modal">
        <div
          ref="dialog"
          class="modal-content mutqin-modal-surface mr-mutqin-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mr-mutqin-title"
          tabindex="-1"
        >
          <header class="mr-mutqin-modal__header">
            <div class="mr-mutqin-modal__title-row">
              <h2 id="mr-mutqin-title">{{ t('mrMutqin.modal.title') }}</h2>
              <span class="mr-mutqin-flagship__beta">{{ t('mrMutqin.sidebar.beta') }}</span>
            </div>
            <button type="button" class="modal-close-btn" :aria-label="t('common.close')" @click="close">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>

          <div class="mr-mutqin-modal__body">
            <p
              v-if="phase === 'idle' && listenError"
              class="mr-mutqin-modal__listen-error"
              role="status"
            >{{ listenError }}</p>

            <div class="mr-mutqin-modal__stage">
              <div class="mr-mutqin-modal__orb-wrap" aria-hidden="true">
                <MrMutqinWaveform
                  variant="flagship"
                  :active="phase === 'listening' || phase === 'understanding'"
                  :idle="phase !== 'listening'"
                  :live="phase === 'listening'"
                  :levels="waveLevels"
                  :bar-count="7"
                />
              </div>
              <button
                v-if="phase === 'idle' && listenError"
                type="button"
                class="mr-mutqin-modal__mic"
                data-testid="mr-mutqin-mic"
                :aria-label="t('mrMutqin.modal.listen')"
                @click="beginListen"
              >
                <i class="bi bi-mic" aria-hidden="true"></i>
              </button>
              <p v-if="phase === 'listening'" class="mr-mutqin-modal__status">{{ t('mrMutqin.modal.listening') }}</p>
            </div>

            <p
              v-if="transcript"
              class="mr-mutqin-modal__transcript"
              :class="{ 'is-interim': interim }"
              role="status"
              aria-live="polite"
            >{{ transcript }}</p>

            <form class="mr-mutqin-modal__text-form" @submit.prevent="submitText">
              <input
                ref="textInput"
                v-model="textCommand"
                type="text"
                class="form-control mr-mutqin-modal__input"
                :placeholder="t('mrMutqin.modal.textPlaceholder')"
                :aria-label="t('mrMutqin.modal.textPlaceholder')"
              />
              <button type="submit" class="btn btn-primary mr-mutqin-modal__send">
                {{ t('mrMutqin.modal.send') }}
              </button>
            </form>

            <div v-if="resultVisible" class="mr-mutqin-modal__result" role="status" aria-live="polite">
              <p v-if="visibleTitle" class="mb-1 fw-semibold">{{ visibleTitle }}</p>
              <p v-if="visibleValue" class="mb-0">{{ visibleValue }}</p>
              <p v-else-if="clarifyMessage" class="mb-0">{{ clarifyMessage }}</p>
              <p v-else-if="spokenPreview" class="mb-0">{{ spokenPreview }}</p>
            </div>

            <div v-if="phase === 'listening'" class="mr-mutqin-modal__listen-actions">
              <button type="button" class="btn btn-primary" @click="finishListen">
                {{ t('mrMutqin.modal.done') }}
              </button>
              <button type="button" class="btn btn-outline-secondary" @click="stopListen">
                {{ t('common.cancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import './MrMutqinAssistantModal.css'
import './MrMutqinSidebarCard.css'
import MrMutqinWaveform from './MrMutqinWaveform.vue'
import { i18nMixin } from '../../mixins/i18nMixin.js'
import { createSessionVoiceListener } from '../../scripts/sessionVoice/listener.js'
import { idleWaveformBarLevels } from '../../scripts/audio/voiceNoteLiveAnalyser.js'
import { cancelMrMutqinInterpret, interpretMrMutqin } from '../../scripts/mrMutqin/client.js'
import { buildMrMutqinContext } from '../../scripts/mrMutqin/context.js'
import { executeMrMutqinResponse } from '../../scripts/mrMutqin/executor.js'
import { speakMrMutqin, stopMrMutqinSpeech } from '../../scripts/mrMutqin/tts.js'
import { acquireAudioSlot, releaseAudioSlot, AUDIO_SLOTS } from '../../scripts/mrMutqin/audioCoordinator.js'
import { capturePostHogProductEvent } from '../../scripts/analytics/posthog.js'

export default {
  name: 'MrMutqinAssistantModal',
  components: { MrMutqinWaveform },
  mixins: [i18nMixin],
  props: {
    theme: { type: String, default: 'light' },
    role: { type: String, default: 'student' },
    shell: { type: String, default: 'dashboard' },
    view: { type: String, default: null },
    phraseHints: { type: Array, default: () => [] },
    bridge: { type: Object, default: () => ({}) },
    memorisationUrl: { type: String, default: '/memorisation' },
  },
  emits: ['close', 'workspace-control'],
  data() {
    const lang = typeof document !== 'undefined' ? String(document.documentElement.lang || 'en') : 'en'
    return {
      phase: 'idle',
      transcript: '',
      textCommand: '',
      interim: false,
      bars: idleWaveformBarLevels(12),
      listener: null,
      generation: 0,
      lastResult: null,
      listenError: '',
      language: lang.startsWith('ar') ? 'ar' : 'en',
      autoListenAttempted: false,
    }
  },
  computed: {
    waveLevels() {
      const raw = Array.isArray(this.bars) ? this.bars : []
      return raw.slice(0, 12)
    },
    resultVisible() {
      return Boolean(this.visibleTitle || this.visibleValue || this.clarifyMessage || this.spokenPreview)
    },
    visibleTitle() {
      return this.lastResult?.visible?.title || null
    },
    visibleValue() {
      const visible = this.lastResult?.visible
      if (!visible) return null
      if (visible.value) return visible.value
      if (Array.isArray(visible.items) && visible.items.length) {
        return visible.items.join(' · ')
      }
      return visible.detail || null
    },
    clarifyMessage() {
      if (this.lastResult?.ok) return null
      return this.lastResult?.clarify || null
    },
    spokenPreview() {
      return this.lastResult?.spoken || null
    },
    clientContext() {
      return buildMrMutqinContext({
        role: this.role,
        shell: this.shell,
        view: this.view,
      })
    },
  },
  mounted() {
    capturePostHogProductEvent('mr_mutqin_opened', { role: this.role, shell: this.shell })
    this.$nextTick(() => {
      this.$refs.dialog?.focus?.()
      this.tryAutoListen()
    })
  },
  beforeUnmount() {
    this.teardownListen()
    cancelMrMutqinInterpret()
    stopMrMutqinSpeech()
  },
  methods: {
    close() {
      this.teardownListen()
      cancelMrMutqinInterpret()
      stopMrMutqinSpeech()
      this.$emit('close')
    },
    tryAutoListen() {
      if (this.autoListenAttempted) return
      this.autoListenAttempted = true
      const reduced = typeof window !== 'undefined'
        && window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return
      this.beginListen()
    },
    async submitText() {
      const text = String(this.textCommand || '').trim()
      if (!text) return
      this.teardownListen()
      await this.interpret(text)
    },
    beginListen() {
      if (this.listener) return
      this.listenError = ''
      if (!acquireAudioSlot(AUDIO_SLOTS.ASSISTANT_MIC)) {
        this.listenError = this.t('mrMutqin.modal.micBusy')
        this.phase = 'idle'
        return
      }
      const generation = ++this.generation
      this.phase = 'listening'
      this.transcript = ''
      capturePostHogProductEvent('mr_mutqin_voice_start', { role: this.role })
      this.listener = createSessionVoiceListener({
        language: this.language,
        phraseHints: this.phraseHints,
        onUpdate: (state) => {
          if (generation !== this.generation || this.phase !== 'listening') return
          this.transcript = state.transcript || ''
          this.interim = !!state.interim
          if (Array.isArray(state.bars)) this.bars = state.bars
        },
        onFinish: (state) => {
          if (generation !== this.generation) return
          void this.onListenFinished(state)
        },
      })
      const started = this.listener.start?.()
      if (started && typeof started.then === 'function') {
        started.catch(() => {
          this.listenError = this.t('mrMutqin.modal.micDenied')
          this.teardownListen()
          this.phase = 'idle'
        })
      }
    },
    finishListen() {
      this.listener?.finishNow?.()
    },
    stopListen() {
      this.teardownListen()
      this.phase = 'idle'
    },
    teardownListen() {
      if (this.listener) {
        void this.listener.cancel?.()
        this.listener = null
      }
      releaseAudioSlot(AUDIO_SLOTS.ASSISTANT_MIC)
    },
    async onListenFinished(state) {
      this.teardownListen()
      this.interim = false
      if (state?.reason === 'error') {
        this.listenError = this.t('mrMutqin.modal.micDenied')
        this.phase = 'idle'
        return
      }
      const text = String(state?.transcript || this.transcript || '').trim()
      if (!text) {
        this.phase = 'idle'
        this.autoListenAttempted = false
        this.$nextTick(() => this.tryAutoListen())
        return
      }
      this.transcript = text
      await this.interpret(text)
    },
    async interpret(transcript) {
      const generation = this.generation
      this.phase = 'understanding'
      this.lastResult = null
      try {
        const result = await interpretMrMutqin({
          transcript,
          context: this.clientContext,
        })
        if (generation !== this.generation) return
        this.lastResult = result
        capturePostHogProductEvent('mr_mutqin_used', {
          intent: result.intent,
          response_mode: result.response_mode,
          ok: Boolean(result.ok),
        })
        if (!result.ok) {
          this.phase = 'clarify'
          return
        }
        const execution = executeMrMutqinResponse(result, {
          ...this.bridge,
          memorisationUrl: this.memorisationUrl,
          onDismiss: () => this.close(),
          onWorkspaceControl: (config) => this.$emit('workspace-control', config),
        })
        if (execution.speak && result.response_mode !== 'NAVIGATE_ONLY') {
          this.phase = 'speaking'
          speakMrMutqin(execution.speak, {
            lang: this.language.startsWith('ar') ? 'ar' : 'en',
            onEnd: () => {
              if (execution.navigated) return
              this.phase = 'completed'
            },
          })
        } else {
          this.phase = execution.navigated ? 'navigating' : 'completed'
        }
      } catch {
        if (generation !== this.generation) return
        this.phase = 'clarify'
        this.lastResult = { ok: false, clarify: this.t('mrMutqin.modal.error') }
      }
    },
  },
}
</script>