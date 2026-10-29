<template>
  <div
    class="voice-note-recording-active"
    :class="[
      `is-${state}`,
      {
        'is-disabled': disabled,
        'voice-note-recording-active--meter-only': showMeter && !showStop,
        'voice-note-recording-active--stop-only': showStop && !showMeter,
      },
    ]"
    role="region"
    :aria-label="regionLabel"
  >
    <div v-if="showMeter" class="voice-note-recording-active__meter">
      <span class="voice-note-recording-active__indicator" aria-hidden="true">
        <i class="bi bi-record-circle-fill"></i>
      </span>
      <time class="voice-note-recording-active__time">{{ timeLabel }}</time>
      <div class="voice-note-recording-active__waveform" aria-hidden="true">
        <span
          v-for="(level, index) in bars"
          :key="index"
          class="voice-note-recording-active__bar"
          :style="{ '--vn-bar-scale': formatBarScale(level) }"
        ></span>
      </div>
      <p v-if="state === 'requesting'" class="voice-note-recording-active__hint">{{ t('teacher.preparing_recording') }}</p>
    </div>
    <button
      v-if="showStop"
      type="button"
      class="voice-note-recording-active__stop"
      :disabled="disabled || state === 'requesting'"
      :aria-label="t('teacher.stop_voice_note')"
      @click="$emit('stop')"
    >
      <i class="bi bi-stop-fill" aria-hidden="true"></i>
      <span>{{ t('teacher.stop_voice_note') }}</span>
    </button>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'VoiceNoteActiveRecording',
  mixins: [i18nMixin],
  props: {
    state: { type: String, default: 'recording' },
    timeLabel: { type: String, default: '0:00' },
    bars: { type: Array, default: () => [] },
    disabled: { type: Boolean, default: false },
    showMeter: { type: Boolean, default: true },
    showStop: { type: Boolean, default: true },
  },
  emits: ['stop'],
  computed: {
    regionLabel() {
      if (!this.showMeter) return this.t('teacher.stop_voice_note')
      if (this.state === 'requesting') return this.t('teacher.preparing_recording')
      return `${this.t('teacher.recording_voice_note')} ${this.timeLabel}`
    },
  },
  methods: {
    formatBarScale(level) {
      const value = Number(level)
      if (!Number.isFinite(value)) return 0.08
      return Math.max(0.08, Math.min(1, value)).toFixed(3)
    },
  },
}
</script>
