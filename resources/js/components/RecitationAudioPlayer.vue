<template>
  <div class="sa-ov__player" :class="{ 'is-playing': playing }">
    <audio
      ref="player"
      :src="src"
      preload="metadata"
      @timeupdate="onTime"
      @loadedmetadata="onTime"
      @ended="onEnded"
      @error="onError"
    ></audio>
    <button
      type="button"
      class="sa-ov__player-toggle"
      :disabled="!src || error"
      :aria-label="playing ? pauseLabel : playLabel"
      @click="toggle"
    >
      <i class="bi" :class="playing ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
    </button>
    <div class="sa-ov__player-body">
      <div class="sa-ov__player-seek-row">
        <input
          class="sa-ov__player-seek"
          type="range"
          min="0"
          max="1000"
          step="1"
          :value="seekValue"
          :disabled="!src || error"
          :aria-label="title || 'Recitation'"
          :aria-valuetext="progressLabel"
          @input="onSeek"
        >
        <button
          type="button"
          class="sa-ov__player-restart"
          :disabled="!src || error"
          :aria-label="restartLabel"
          :title="restartLabel"
          @click="restart"
        >
          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
        </button>
      </div>
      <div class="sa-ov__player-times" aria-live="polite">
        <span>{{ currentLabel }}</span>
        <span>{{ durationLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script>
function formatClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const rest = String(total % 60).padStart(2, '0')
  return `${minutes}:${rest}`
}

export default {
  name: 'RecitationAudioPlayer',
  props: {
    src: { type: String, default: '' },
    durationMs: { type: [Number, String], default: null },
    active: { type: Boolean, default: true },
    title: { type: String, default: '' },
    playLabel: { type: String, default: 'Play' },
    pauseLabel: { type: String, default: 'Pause' },
    restartLabel: { type: String, default: 'Restart' },
  },
  data() {
    return {
      playing: false,
      current: 0,
      duration: 0,
      error: false,
    }
  },
  computed: {
    knownDuration() {
      if (this.duration > 0 && Number.isFinite(this.duration)) return this.duration
      const ms = Number(this.durationMs)
      return Number.isFinite(ms) && ms > 0 ? ms / 1000 : 0
    },
    seekValue() {
      if (this.knownDuration <= 0) return 0
      return Math.round((this.current / this.knownDuration) * 1000)
    },
    currentLabel() {
      return formatClock(this.current)
    },
    durationLabel() {
      return formatClock(this.knownDuration)
    },
    progressLabel() {
      return `${this.currentLabel} / ${this.durationLabel}`
    },
  },
  watch: {
    src() {
      this.resetClock()
    },
    active(isActive) {
      if (!isActive) this.pause()
    },
  },
  beforeUnmount() {
    this.pause()
  },
  methods: {
    player() {
      return this.$refs.player
    },
    toggle() {
      const audio = this.player()
      if (!audio || !this.src || this.error) return
      if (this.playing) {
        this.pause()
        return
      }
      audio.play?.()?.then(() => {
        this.playing = true
      }).catch(() => {
        this.playing = false
      })
    },
    pause() {
      const audio = this.player()
      try { audio?.pause?.() } catch { /* ignore */ }
      this.playing = false
    },
    restart() {
      const audio = this.player()
      if (!audio) return
      audio.currentTime = 0
      this.current = 0
      if (this.src && !this.error) {
        audio.play?.()?.then(() => {
          this.playing = true
        }).catch(() => {
          this.playing = false
        })
      }
    },
    onSeek(event) {
      const audio = this.player()
      if (!audio || this.knownDuration <= 0) return
      const next = (Number(event.target.value) / 1000) * this.knownDuration
      audio.currentTime = next
      this.current = next
    },
    onTime() {
      const audio = this.player()
      if (!audio) return
      this.current = Number(audio.currentTime) || 0
      const mediaDuration = Number(audio.duration)
      if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
        this.duration = mediaDuration
      }
      this.playing = !audio.paused
    },
    onEnded() {
      this.playing = false
    },
    onError() {
      this.error = true
      this.playing = false
    },
    resetClock() {
      this.pause()
      this.current = 0
      this.duration = 0
      this.error = false
    },
  },
}
</script>
