<template>
  <div class="audio-clip" :class="{ 'is-playing': playing, 'is-loading': loading, 'has-error': error }">
    <audio
      ref="audioEl"
      preload="none"
      @timeupdate="onTimeUpdate"
      @playing="onPlaying"
      @pause="onPause"
      @ended="onEnded"
      @error="onError"
      @canplay="onCanPlay"
      @loadstart="loading = true"
    ></audio>
    <button
      type="button"
      class="audio-clip__toggle"
      :disabled="error || (!src && !loadedSrc)"
      :aria-label="toggleAriaLabel"
      :title="toggleAriaLabel"
      @click="toggle"
    >
      <i class="bi" :class="playing ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
    </button>
    <span class="audio-clip__state visually-hidden" aria-live="polite">{{ liveMessage }}</span>
    <span v-if="error" class="audio-clip__error" role="status">{{ errorLabelResolved }}</span>
  </div>
</template>

<script>
import { bindAudioSource, playAudioElement } from '@/scripts/audio/recordingPlayback.js'
import { claimClipPlayback, releaseClipPlayback } from '../scripts/audio/singleClipPlayback.js'

export default {
  name: 'AudioClip',
  props: {
    src: { type: String, default: '' },
    start: { type: Number, default: null },
    end: { type: Number, default: null },
    playLabel: { type: String, default: '' },
    pauseLabel: { type: String, default: '' },
    loadingLabel: { type: String, default: '' },
    errorLabel: { type: String, default: '' },
  },
  data() {
    return {
      playing: false,
      loading: false,
      error: false,
      loadedSrc: '',
      liveMessage: '',
    }
  },
  computed: {
    segmentStart() {
      const value = Number(this.start)
      return Number.isFinite(value) && value >= 0 ? value : 0
    },
    segmentEnd() {
      const value = Number(this.end)
      return Number.isFinite(value) && value > this.segmentStart ? value : null
    },
    toggleAriaLabel() {
      if (this.loading) return this.loadingLabelResolved
      if (this.error) return this.errorLabelResolved
      return this.playing ? this.pauseLabelResolved : this.playLabelResolved
    },
    playLabelResolved() {
      return this.playLabel || 'Play'
    },
    pauseLabelResolved() {
      return this.pauseLabel || 'Pause'
    },
    loadingLabelResolved() {
      return this.loadingLabel || 'Loading audio'
    },
    errorLabelResolved() {
      return this.errorLabel || 'Audio unavailable'
    },
  },
  watch: {
    src() {
      this.resetPlayer()
    },
  },
  beforeUnmount() {
    this.stopPlayback(true)
  },
  methods: {
    resetPlayer() {
      this.stopPlayback(true)
      this.loadedSrc = ''
      this.error = false
      this.loading = false
      const audio = this.$refs.audioEl
      if (audio) {
        audio.removeAttribute('src')
        try {
          audio.load()
        } catch {
          // ignore
        }
      }
    },
    stopPlayback(silent = false) {
      const audio = this.$refs.audioEl
      if (audio && !audio.paused) {
        audio.pause()
      }
      releaseClipPlayback(this.stopPlayback)
      this.playing = false
      if (!silent) {
        this.liveMessage = this.pauseLabelResolved
      }
    },
    async ensureSourceLoaded() {
      if (!this.src) {
        this.error = true
        return false
      }
      if (this.loadedSrc === this.src) return true
      const audio = this.$refs.audioEl
      if (!audio) return false
      this.loading = true
      this.error = false
      try {
        await bindAudioSource(audio, this.src)
        this.loadedSrc = this.src
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
        this.stopPlayback()
        return
      }
      const ready = await this.ensureSourceLoaded()
      if (!ready) return
      const audio = this.$refs.audioEl
      if (!audio) return
      claimClipPlayback(this.stopPlayback)
      try {
        audio.currentTime = this.segmentStart
        await playAudioElement(audio)
        this.playing = true
        this.liveMessage = this.playLabelResolved
      } catch {
        this.error = true
        releaseClipPlayback(this.stopPlayback)
      }
    },
    onTimeUpdate() {
      const audio = this.$refs.audioEl
      if (!audio || !this.playing) return
      const end = this.segmentEnd
      if (end !== null && audio.currentTime >= end) {
        audio.pause()
        audio.currentTime = this.segmentStart
        this.onEnded()
      }
    },
    onPlaying() {
      this.playing = true
      this.loading = false
    },
    onPause() {
      if (!this.$refs.audioEl?.ended) {
        this.playing = false
      }
    },
    onEnded() {
      this.playing = false
      releaseClipPlayback(this.stopPlayback)
      this.liveMessage = this.pauseLabelResolved
    },
    onError() {
      this.error = true
      this.loading = false
      this.playing = false
      releaseClipPlayback(this.stopPlayback)
    },
    onCanPlay() {
      this.loading = false
    },
  },
}
</script>

<style scoped>
.audio-clip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.audio-clip__toggle {
  inline-size: var(--dash-tap, 2.75rem);
  block-size: var(--dash-tap, 2.75rem);
  min-inline-size: 2.75rem;
  min-block-size: 2.75rem;
}

.audio-clip__error {
  font-size: 0.6875rem;
  color: var(--danger, #a84638);
}

.audio-clip.is-loading .audio-clip__toggle {
  opacity: 0.72;
}
</style>
