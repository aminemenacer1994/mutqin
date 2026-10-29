<template>
  <section class="learner-playback-track" :aria-label="label">
    <audio
      ref="audioEl"
      preload="none"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="syncDuration"
      @durationchange="syncDuration"
      @playing="onPlaying"
      @pause="onPause"
      @ended="onEnded"
      @error="onError"
      @canplay="onCanPlay"
    ></audio>

    <div class="learner-playback-track__head">
      <h3 class="learner-playback-track__title">{{ label }}</h3>
      <button
        type="button"
        class="dash-icon-btn learner-playback-track__toggle"
        :disabled="unavailable || loading"
        :aria-label="toggleLabel"
        @click="toggle"
      >
        <i class="bi" :class="playing ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
      </button>
    </div>

    <p v-if="unavailable" class="learner-playback-track__unavailable" role="status">{{ unavailableLabel }}</p>
    <p v-else-if="error" class="learner-playback-track__error" role="status">
      {{ errorLabel }}
      <button type="button" class="dash-text-link" @click="retry">{{ retryLabel }}</button>
    </p>

    <div
      v-else
      class="learner-playback-track__timeline"
      :dir="timelineDir"
    >
      <div class="learner-playback-track__seek-row">
        <input
          ref="seekEl"
          class="learner-playback-track__seek"
          type="range"
          min="0"
          max="1000"
          step="1"
          role="slider"
          :disabled="!seekReady"
          :aria-label="seekAriaLabel"
          :aria-valuemin="0"
          :aria-valuemax="seekAriaMax"
          :aria-valuenow="seekAriaNow"
          :aria-valuetext="progressText"
          :value="seekValue"
          :style="seekStyle"
          @input="previewSeek"
          @change="commitSeek"
        >
        <div class="learner-playback-track__markers" aria-hidden="false">
          <button
            v-for="marker in markers"
            :key="marker.index"
            type="button"
            class="learner-playback-track__marker"
            :class="`is-${marker.mistake.type}`"
            :style="{ insetInlineStart: `${marker.percent}%` }"
            :aria-label="marker.ariaLabel"
            @click="onMarkerActivate(marker)"
            @focus="activeMarker = marker.index"
            @blur="activeMarker = null"
          >
            <i class="bi" :class="markerIcon(marker.mistake.type)" aria-hidden="true"></i>
          </button>
          <div
            v-if="activeMarkerDetail"
            class="learner-playback-track__tooltip"
            role="tooltip"
            :style="{ insetInlineStart: `${activeMarkerDetail.percent}%` }"
          >
            {{ activeMarkerDetail.text }}
          </div>
        </div>
      </div>
      <div class="learner-playback-track__times">
        <span>{{ currentClock }}</span>
        <span>{{ durationClock }}</span>
      </div>
    </div>
    <span class="visually-hidden" aria-live="polite">{{ liveMessage }}</span>
  </section>
</template>

<script>
import {
  bindAudioSource,
  formatClock,
  playAudioElement,
  readMediaDuration,
} from '@/scripts/audio/recordingPlayback.js'
import { claimTrackPlayback, releaseTrackPlayback } from '@/scripts/audio/attemptTrackCoordinator.js'

export default {
  name: 'LearnerAttemptPlaybackTrack',
  props: {
    trackId: { type: String, required: true },
    label: { type: String, default: '' },
    src: { type: String, default: '' },
    durationMs: { type: Number, default: null },
    markers: { type: Array, default: () => [] },
    playbackRate: { type: Number, default: 1 },
    loopStartSec: { type: Number, default: null },
    loopEndSec: { type: Number, default: null },
    timelineDir: { type: String, default: 'ltr' },
    unavailable: { type: Boolean, default: false },
    loadWhen: { type: Boolean, default: false },
    playLabel: { type: String, default: 'Play' },
    pauseLabel: { type: String, default: 'Pause' },
    seekAriaLabel: { type: String, default: 'Seek' },
    unavailableLabel: { type: String, default: '' },
    errorLabel: { type: String, default: '' },
    retryLabel: { type: String, default: 'Retry' },
  },
  emits: ['marker-activate', 'ended', 'ready'],
  data() {
    return {
      playing: false,
      loading: false,
      error: false,
      loadedSrc: '',
      currentSeconds: 0,
      durationSeconds: 0,
      activeMarker: null,
      liveMessage: '',
    }
  },
  computed: {
    timelineSeconds() {
      if (this.durationSeconds > 0) return this.durationSeconds
      const fromMs = Number(this.durationMs)
      return Number.isFinite(fromMs) && fromMs > 0 ? fromMs / 1000 : 0
    },
    seekReady() {
      return !!this.src && !this.error && !this.unavailable && this.timelineSeconds > 0
    },
    seekValue() {
      if (this.timelineSeconds <= 0) return 0
      return Math.round((this.currentSeconds / this.timelineSeconds) * 1000)
    },
    seekStyle() {
      return { '--playback-seek': `${this.seekValue / 10}%` }
    },
    currentClock() {
      return formatClock(this.currentSeconds)
    },
    durationClock() {
      if (this.timelineSeconds <= 0) return '–:–'
      return formatClock(this.timelineSeconds)
    },
    seekAriaMax() {
      return Math.max(0, Math.round(this.timelineSeconds))
    },
    seekAriaNow() {
      return Math.max(0, Math.round(this.currentSeconds))
    },
    progressText() {
      return `${this.currentClock} / ${this.durationClock}`
    },
    toggleLabel() {
      if (this.loading) return this.playLabel
      return this.playing ? this.pauseLabel : this.playLabel
    },
    activeMarkerDetail() {
      if (this.activeMarker === null) return null
      return this.markers.find((item) => item.index === this.activeMarker) || null
    },
  },
  watch: {
    src() {
      this.resetAudio()
    },
    loadWhen(open) {
      if (open && this.src) this.ensureLoaded()
    },
    playbackRate(rate) {
      const audio = this.$refs.audioEl
      if (audio) audio.playbackRate = Number(rate) || 1
    },
    loopStartSec() {
      this.applyLoopIfNeeded()
    },
  },
  beforeUnmount() {
    this.stopInternal(true)
  },
  methods: {
    markerIcon(type) {
      if (type === 'missed') return 'bi-dash-circle-fill'
      if (type === 'tajweed') return 'bi-bookmark-star-fill'
      return 'bi-x-circle-fill'
    },
    audio() {
      return this.$refs.audioEl
    },
    resetAudio() {
      this.stopInternal(true)
      this.loadedSrc = ''
      this.error = false
      this.durationSeconds = 0
      this.currentSeconds = 0
      const el = this.audio()
      if (el) {
        el.removeAttribute('src')
        try { el.load() } catch { /* ignore */ }
      }
    },
    stopInternal(silent = false) {
      const el = this.audio()
      if (el && !el.paused) el.pause()
      releaseTrackPlayback(this.trackId)
      this.playing = false
      if (!silent) this.liveMessage = this.pauseLabel
    },
    async ensureLoaded() {
      if (!this.src || this.unavailable) return false
      if (this.loadedSrc === this.src) return true
      const el = this.audio()
      if (!el) return false
      this.loading = true
      this.error = false
      try {
        await bindAudioSource(el, this.src)
        this.loadedSrc = this.src
        this.syncDuration()
        this.$emit('ready')
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
        this.stopInternal()
        return
      }
      const ready = await this.ensureLoaded()
      if (!ready) return
      const el = this.audio()
      if (!el) return
      claimTrackPlayback(this.trackId, () => this.stopInternal(true))
      el.playbackRate = Number(this.playbackRate) || 1
      try {
        await playAudioElement(el)
        this.playing = true
        this.liveMessage = this.playLabel
      } catch {
        this.error = true
        releaseTrackPlayback(this.trackId)
      }
    },
    pauseExternal() {
      this.stopInternal(true)
    },
    async playFrom(seconds) {
      const ready = await this.ensureLoaded()
      if (!ready) return
      const el = this.audio()
      if (!el) return
      claimTrackPlayback(this.trackId, () => this.stopInternal(true))
      el.playbackRate = Number(this.playbackRate) || 1
      el.currentTime = Math.max(0, Number(seconds) || 0)
      try {
        await playAudioElement(el)
        this.playing = true
      } catch {
        this.error = true
      }
    },
    retry() {
      this.error = false
      this.loadedSrc = ''
      this.ensureLoaded()
    },
    syncDuration() {
      const el = this.audio()
      const read = readMediaDuration(el)
      if (read > 0) {
        this.durationSeconds = read
        return
      }
      const fromMs = Number(this.durationMs)
      if (Number.isFinite(fromMs) && fromMs > 0) {
        this.durationSeconds = fromMs / 1000
      }
    },
    onTimeUpdate() {
      const el = this.audio()
      if (!el) return
      this.currentSeconds = Number(el.currentTime) || 0
      this.applyLoopIfNeeded()
    },
    applyLoopIfNeeded() {
      const end = Number(this.loopEndSec)
      const start = Number(this.loopStartSec)
      if (!Number.isFinite(end) || end <= 0) return
      const el = this.audio()
      if (!el || el.paused) return
      if (this.currentSeconds >= end) {
        el.currentTime = Number.isFinite(start) && start >= 0 ? start : 0
      }
    },
    previewSeek(event) {
      if (this.timelineSeconds <= 0) return
      const ratio = Number(event.target.value) / 1000
      this.currentSeconds = ratio * this.timelineSeconds
    },
    commitSeek(event) {
      const el = this.audio()
      if (!el || this.timelineSeconds <= 0) return
      const ratio = Number(event.target.value) / 1000
      el.currentTime = ratio * this.timelineSeconds
      this.currentSeconds = el.currentTime
    },
    onPlaying() {
      this.playing = true
    },
    onPause() {
      this.playing = false
    },
    onEnded() {
      this.playing = false
      releaseTrackPlayback(this.trackId)
      this.$emit('ended')
    },
    onError() {
      this.error = true
      this.playing = false
      releaseTrackPlayback(this.trackId)
    },
    onCanPlay() {
      this.loading = false
      this.syncDuration()
    },
    onMarkerActivate(marker) {
      this.activeMarker = marker.index
      this.$emit('marker-activate', marker)
    },
  },
}
</script>

<style scoped>
.learner-playback-track {
  display: grid;
  gap: 0.55rem;
  padding: 0.75rem;
  border: 1px solid var(--dash-border);
  border-radius: 0.75rem;
  background: var(--dash-card-bg);
}

.learner-playback-track__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.learner-playback-track__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 700;
}

.learner-playback-track__toggle {
  inline-size: 2.75rem;
  block-size: 2.75rem;
  min-inline-size: 2.75rem;
  min-block-size: 2.75rem;
}

.learner-playback-track__seek-row {
  position: relative;
}

.learner-playback-track__seek {
  inline-size: 100%;
  min-block-size: 2.75rem;
}

.learner-playback-track__markers {
  position: absolute;
  inset-block-start: 50%;
  inset-inline: 0;
  block-size: 0;
  pointer-events: none;
}

.learner-playback-track__marker {
  position: absolute;
  inset-block-start: -0.65rem;
  pointer-events: auto;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  min-inline-size: 2.75rem;
  min-block-size: 2.75rem;
  margin-inline-start: -1.375rem;
  border: 0;
  border-radius: 999px;
  background: var(--dash-card-bg);
  box-shadow: 0 0 0 2px var(--dash-border);
  cursor: pointer;
}

.learner-playback-track__marker.is-missed { color: var(--danger, #a84638); }
.learner-playback-track__marker.is-wrong { color: var(--danger, #a84638); }
.learner-playback-track__marker.is-tajweed { color: var(--dash-accent-strong); }

.learner-playback-track__tooltip {
  position: absolute;
  inset-block-start: -2.4rem;
  transform: translateX(-50%);
  margin-inline-start: 0;
  padding: 0.25rem 0.45rem;
  border-radius: 0.4rem;
  background: var(--dash-ink);
  color: var(--dash-card-bg);
  font-size: 0.6875rem;
  white-space: nowrap;
  pointer-events: none;
  z-index: 2;
}

.learner-playback-track__times {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--dash-muted);
}

.learner-playback-track__unavailable,
.learner-playback-track__error {
  margin: 0;
  font-size: 0.8125rem;
}
</style>
