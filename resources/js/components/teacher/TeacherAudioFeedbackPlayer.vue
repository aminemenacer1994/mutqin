<template>
  <div
    class="teacher-audio-feedback-player"
    :class="{ 'is-playing': playing, 'is-loading': loading, 'has-error': error, 'is-compact': compact }"
  >
    <audio
      ref="audioEl"
      preload="metadata"
      @loadedmetadata="onMeta"
      @durationchange="onMeta"
      @timeupdate="onTime"
      @play="playing = true"
      @pause="playing = false"
      @ended="onEnded"
      @error="onError"
    ></audio>

    <button
      type="button"
      class="teacher-audio-feedback-player__play"
      :disabled="!src || error || loading"
      :aria-label="playing ? pauseLabelResolved : playLabelResolved"
      :title="playing ? pauseLabelResolved : playLabelResolved"
      @click="toggle"
    >
      <i class="bi" :class="playIcon" aria-hidden="true"></i>
    </button>

    <div class="teacher-audio-feedback-player__timeline">
      <input
        type="range"
        class="teacher-audio-feedback-player__scrub"
        min="0"
        :max="scrubMax"
        step="0.05"
        :value="Math.min(currentTime, scrubMax)"
        :aria-label="t('teacher.audio_position')"
        :aria-valuetext="`${formatTime(currentTime)} / ${formatTime(scrubMax)}`"
        :disabled="!src || error || scrubMax <= 0"
        @input="seek"
      >
      <div class="teacher-audio-feedback-player__wave" aria-hidden="true">
        <span
          v-for="(bar, index) in bars"
          :key="index"
          :style="{ height: `${bar}%`, opacity: progressRatio >= (index + 1) / bars.length ? 1 : 0.35 }"
        ></span>
      </div>
      <div class="teacher-audio-feedback-player__times">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(duration || durationHint) }}</span>
      </div>
    </div>

    <button
      type="button"
      class="teacher-audio-feedback-player__speed"
      :aria-label="t('teacher.playback_speed')"
      :title="t('teacher.playback_speed')"
      :disabled="!src || error"
      @click="cycleSpeed"
    >{{ speed }}×</button>

    <p v-if="error" class="teacher-audio-feedback-player__error" role="status">{{ errorLabel }}</p>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { bindAudioSource, playAudioElement } from '@/scripts/audio/recordingPlayback.js'
import { claimClipPlayback, releaseClipPlayback } from '../../scripts/audio/singleClipPlayback.js'

const SPEEDS = [1, 1.25, 1.5, 1.75, 2]

export default {
  name: 'TeacherAudioFeedbackPlayer',
  mixins: [i18nMixin],
  props: {
    src: { type: String, default: '' },
    durationMs: { type: Number, default: null },
    compact: { type: Boolean, default: false },
    playLabel: { type: String, default: '' },
    pauseLabel: { type: String, default: '' },
  },
  data() {
    return {
      playing: false,
      loading: false,
      error: false,
      currentTime: 0,
      duration: 0,
      speed: 1,
      loadedSrc: '',
      bars: [28, 52, 38, 70, 44, 62, 34, 78, 48, 66, 40, 58, 32, 74, 46, 60, 36, 68, 42, 55],
    }
  },
  computed: {
    durationHint() {
      const ms = Number(this.durationMs)
      return Number.isFinite(ms) && ms > 0 ? ms / 1000 : 0
    },
    progressRatio() {
      const total = this.scrubMax
      if (!total) return 0
      return Math.min(1, Math.max(0, this.currentTime / total))
    },
    scrubMax() {
      const known = this.duration || this.durationHint
      return known > 0 ? known : 0
    },
    playIcon() {
      if (this.loading) return 'bi-arrow-repeat'
      return this.playing ? 'bi-pause-fill' : 'bi-play-fill'
    },
    playLabelResolved() {
      return this.playLabel || this.t('teacher.play_recording')
    },
    pauseLabelResolved() {
      return this.pauseLabel || this.t('teacher.pause_recording')
    },
    errorLabel() {
      return this.t('teacher.recording_unavailable')
    },
  },
  created() {
    if (this.durationHint) this.duration = this.durationHint
  },
  watch: {
    src() {
      this.reset()
      if (this.src) this.ensureLoaded()
    },
  },
  mounted() {
    if (this.src) this.ensureLoaded()
  },
  beforeUnmount() {
    this.stop(true)
  },
  methods: {
    formatTime(seconds) {
      const value = Math.max(0, Math.floor(Number(seconds) || 0))
      return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
    },
    reset() {
      this.stop(true)
      this.loadedSrc = ''
      this.error = false
      this.loading = false
      this.currentTime = 0
      this.duration = this.durationHint
      const audio = this.$refs.audioEl
      if (audio) {
        audio.removeAttribute('src')
        try { audio.load() } catch { /* noop */ }
      }
    },
    stop(silent = false) {
      const audio = this.$refs.audioEl
      if (audio && !audio.paused) audio.pause()
      releaseClipPlayback(this.stop)
      this.playing = false
      if (!silent) this.loading = false
    },
    async ensureLoaded() {
      if (!this.src) return false
      if (this.loadedSrc === this.src) return true
      const audio = this.$refs.audioEl
      if (!audio) return false
      this.loading = true
      this.error = false
      try {
        await bindAudioSource(audio, this.src)
        this.loadedSrc = this.src
        audio.playbackRate = this.speed
        this.onMeta()
        return true
      } catch {
        this.error = true
        return false
      } finally {
        this.loading = false
      }
    },
    async toggle() {
      if (this.playing) {
        this.stop()
        return
      }
      const ready = await this.ensureLoaded()
      if (!ready) return
      const audio = this.$refs.audioEl
      if (!audio) return
      claimClipPlayback(this.stop)
      try {
        audio.playbackRate = this.speed
        await playAudioElement(audio)
        this.playing = true
      } catch {
        this.error = true
        releaseClipPlayback(this.stop)
      }
    },
    seek(event) {
      const audio = this.$refs.audioEl
      const raw = Number(event.target.value)
      if (!Number.isFinite(raw)) return
      const limit = this.scrubMax
      const next = limit > 0 ? Math.min(Math.max(0, raw), limit) : 0
      this.currentTime = next
      if (audio) audio.currentTime = next
    },
    cycleSpeed() {
      const index = SPEEDS.indexOf(this.speed)
      this.speed = SPEEDS[(index + 1) % SPEEDS.length]
      const audio = this.$refs.audioEl
      if (audio) audio.playbackRate = this.speed
    },
    onMeta() {
      const audio = this.$refs.audioEl
      const next = Number(audio?.duration)
      if (Number.isFinite(next) && next > 0) this.duration = next
      else if (this.durationHint) this.duration = this.durationHint
    },
    onTime() {
      const audio = this.$refs.audioEl
      this.currentTime = Number(audio?.currentTime) || 0
    },
    onEnded() {
      this.playing = false
      this.currentTime = 0
      releaseClipPlayback(this.stop)
    },
    onError() {
      this.error = true
      this.loading = false
      this.playing = false
      releaseClipPlayback(this.stop)
    },
  },
}
</script>
