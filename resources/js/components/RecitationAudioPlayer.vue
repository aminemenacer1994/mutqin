<template>
  <div
    class="sa-ov__player sa-ov__player--bento"
    :class="{ 'is-playing': playing, 'has-error': error, 'is-loading': loading }"
    role="group"
    :aria-label="playerTitle"
  >
    <audio
      ref="player"
      preload="metadata"
      @timeupdate="syncClock"
      @loadedmetadata="syncClock"
      @durationchange="syncClock"
      @seeked="syncClock"
      @playing="onPlaying"
      @pause="onPause"
      @ended="onEnded"
      @error="onError"
      @canplay="onCanPlay"
    ></audio>
    <button
      type="button"
      class="sa-ov__player-toggle"
      :disabled="!src || error || loading"
      :aria-label="playing ? resolvedPauseLabel : resolvedPlayLabel"
      :title="playing ? resolvedPauseLabel : resolvedPlayLabel"
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
          :style="seekStyle"
          :disabled="!seekReady"
          :aria-label="seekLabel"
          :aria-valuetext="progressLabel"
          @input="previewSeek"
          @change="commitSeek"
        >
      </div>
      <div class="sa-ov__player-meta">
        <span class="sa-ov__player-time">{{ currentLabel }}</span>
        <div class="sa-ov__player-meta-actions">
          <button
            type="button"
            class="sa-ov__player-speed"
            :disabled="!src || error || loading"
            :aria-label="playbackSpeedLabel"
            :title="playbackSpeedLabel"
            @click="cycleSpeed"
          >{{ playbackRate }}×</button>
          <button
            type="button"
            class="sa-ov__player-restart"
            :disabled="!src || error || loading"
            :aria-label="resolvedRestartLabel"
            :title="resolvedRestartLabel"
            @click="restart"
          >
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
          </button>
        </div>
        <span class="sa-ov__player-time sa-ov__player-time--end">{{ durationLabel }}</span>
      </div>
    </div>
    <p v-if="error" class="sa-ov__player-error" role="status">{{ resolvedErrorLabel }}</p>
  </div>
</template>

<script>
import {
  bindAudioSource,
  playAudioElement,
  probeIndeterminateMediaDuration,
  readMediaDuration,
} from '@/scripts/audio/recordingPlayback.js'

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
    playLabel: { type: String, default: '' },
    pauseLabel: { type: String, default: '' },
    restartLabel: { type: String, default: '' },
    errorLabel: { type: String, default: '' },
  },
  data() {
    return {
      playing: false,
      current: 0,
      duration: 0,
      maxSeenTime: 0,
      loading: false,
      error: false,
      playbackRate: 1,
      attachToken: 0,
    }
  },
  computed: {
    knownDuration() {
      return this.duration > 0 && Number.isFinite(this.duration) ? this.duration : 0
    },
    timelineDuration() {
      if (this.knownDuration > 0) return this.knownDuration
      return Math.max(this.maxSeenTime, this.current)
    },
    seekReady() {
      return !!this.src && !this.error && !this.loading && this.timelineDuration > 0
    },
    seekValue() {
      if (this.timelineDuration <= 0) return 0
      return Math.round((this.current / this.timelineDuration) * 1000)
    },
    seekStyle() {
      return { '--player-seek-progress': `${this.seekValue / 10}%` }
    },
    currentLabel() {
      if (this.loading && this.current <= 0) return this.loadingLabel
      return formatClock(this.current)
    },
    durationLabel() {
      if (this.error) return '–:–'
      if (this.loading && this.knownDuration <= 0) return '…'
      if (this.knownDuration > 0) return formatClock(this.knownDuration)
      if (this.timelineDuration > 0) return formatClock(this.timelineDuration)
      return '–:–'
    },
    progressLabel() {
      return `${this.currentLabel} / ${this.durationLabel}`
    },
    loadingLabel() {
      if (typeof this.$t === 'function') {
        const value = this.$t('memorisation.a11y.loadingRecording')
        if (value && value !== 'memorisation.a11y.loadingRecording') return value
      }
      return 'Loading…'
    },
    playerTitle() {
      return this.title || this.$t('memorisation.player.audioPlayer')
    },
    seekLabel() {
      return this.title || this.$t('dashboard.analysis_recitation_label')
    },
    resolvedPlayLabel() {
      return this.playLabel || this.$t('dashboard.ai_recite.play')
    },
    resolvedPauseLabel() {
      return this.pauseLabel || this.$t('dashboard.ai_recite.pause')
    },
    resolvedRestartLabel() {
      return this.restartLabel || this.$t('dashboard.ai_recite.restart')
    },
    resolvedErrorLabel() {
      return this.errorLabel || this.$t('dashboard.analysis_audio_unavailable')
    },
    playbackSpeedLabel() {
      return this.$t('memorisation.player.playbackSpeedAria', { rate: `${this.playbackRate}×` })
    },
  },
  watch: {
    src: {
      immediate: true,
      handler(next) {
        this.resetClock()
        if (next) this.attachSource(next)
      },
    },
    active(isActive) {
      if (!isActive) this.pause()
    },
  },
  beforeUnmount() {
    this.attachToken += 1
    this.pause()
    const audio = this.player()
    if (audio) {
      try {
        audio.removeAttribute('src')
        audio.load()
      } catch { /* ignore */ }
    }
  },
  methods: {
    player() {
      return this.$refs.player
    },
    async attachSource(url) {
      const token = ++this.attachToken
      await this.$nextTick()
      const audio = this.player()
      if (!audio || !url || token !== this.attachToken) return

      this.loading = true
      this.error = false
      try {
        await bindAudioSource(audio, url)
        if (token !== this.attachToken) return

        let resolved = readMediaDuration(audio)
        if (!resolved) {
          resolved = await probeIndeterminateMediaDuration(audio)
        }
        if (token !== this.attachToken) return

        if (resolved > 0) this.duration = resolved
        this.syncClock()
      } catch {
        if (token !== this.attachToken) return
        this.error = true
        this.playing = false
      } finally {
        if (token === this.attachToken) this.loading = false
      }
    },
    async toggle() {
      const audio = this.player()
      if (!audio || !this.src || this.error) return
      if (this.playing) {
        this.pause()
        return
      }
      if (!readMediaDuration(audio) && !audio.currentSrc) {
        await this.attachSource(this.src)
        if (this.error) return
      }
      audio.playbackRate = this.playbackRate
      try {
        await playAudioElement(audio)
        this.playing = true
      } catch (error) {
        this.playing = false
        if (error?.name !== 'NotAllowedError') this.error = true
      }
    },
    pause() {
      const audio = this.player()
      try { audio?.pause?.() } catch { /* ignore */ }
      this.playing = false
    },
    async restart() {
      const audio = this.player()
      if (!audio || !this.src || this.error) return
      if (this.loading) await this.attachSource(this.src)
      this.setCurrentTime(0)
      if (!this.error) {
        audio.playbackRate = this.playbackRate
        try {
          await playAudioElement(audio)
          this.playing = true
        } catch {
          this.playing = false
        }
      }
    },
    cycleSpeed() {
      const rates = [1, 1.25, 1.5, 0.75]
      const currentIndex = rates.indexOf(this.playbackRate)
      this.playbackRate = rates[(currentIndex + 1) % rates.length]
      const audio = this.player()
      if (audio) audio.playbackRate = this.playbackRate
    },
    seekTarget(event) {
      const raw = Number(event?.target?.value)
      if (!Number.isFinite(raw) || this.timelineDuration <= 0) return null
      return Math.max(0, Math.min(this.timelineDuration, (raw / 1000) * this.timelineDuration))
    },
    setCurrentTime(nextTime) {
      const audio = this.player()
      const cap = this.timelineDuration > 0 ? this.timelineDuration : Math.max(0, Number(nextTime) || 0)
      const safe = Math.max(0, Math.min(cap, Number(nextTime) || 0))
      this.current = safe
      if (safe > this.maxSeenTime) this.maxSeenTime = safe
      if (!audio) return safe
      const mediaDuration = readMediaDuration(audio)
      const target = mediaDuration > 0 ? Math.min(safe, mediaDuration) : safe
      try { audio.currentTime = target } catch { /* metadata may still be loading */ }
      return target
    },
    previewSeek(event) {
      const target = this.seekTarget(event)
      if (target == null) return
      this.setCurrentTime(target)
    },
    commitSeek(event) {
      const target = this.seekTarget(event)
      if (target == null) return
      this.setCurrentTime(target)
    },
    syncClock() {
      const audio = this.player()
      if (!audio) return
      const nextCurrent = Number(audio.currentTime) || 0
      this.current = nextCurrent
      if (nextCurrent > this.maxSeenTime) this.maxSeenTime = nextCurrent
      const mediaDuration = readMediaDuration(audio)
      if (mediaDuration > 0) this.duration = mediaDuration
      if (!audio.paused) this.playing = true
    },
    onPlaying() {
      this.playing = true
      this.syncClock()
    },
    onPause() {
      this.playing = false
      this.syncClock()
    },
    onCanPlay() {
      this.syncClock()
    },
    onEnded() {
      this.playing = false
      const audio = this.player()
      if (!audio) return
      const seen = Math.max(this.maxSeenTime, this.current, readMediaDuration(audio))
      if (this.duration <= 0 && seen > 0) this.duration = seen
      this.current = 0
      this.maxSeenTime = Math.max(this.maxSeenTime, seen)
      try { audio.currentTime = 0 } catch { /* ignore */ }
    },
    onError() {
      this.error = true
      this.playing = false
      this.loading = false
    },
    resetClock() {
      this.attachToken += 1
      this.pause()
      this.current = 0
      this.duration = 0
      this.maxSeenTime = 0
      this.error = false
      this.loading = false
      this.playbackRate = 1
      const audio = this.player()
      if (audio) {
        try {
          audio.pause()
          audio.currentTime = 0
          audio.playbackRate = 1
          if (audio.getAttribute('src')) {
            audio.removeAttribute('src')
            audio.load()
          }
        } catch { /* ignore */ }
      }
    },
  },
}
</script>
