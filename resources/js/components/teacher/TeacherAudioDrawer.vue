<template>
  <Teleport to="body">
    <Transition name="teacher-audio-drawer">
      <div v-if="open" class="teacher-audio-drawer" @keydown.esc.prevent="$emit('close')">
        <button class="teacher-audio-drawer__scrim" type="button" :aria-label="t('teacher.close_audio_player')" @click="$emit('close')"></button>
        <section ref="drawer" class="teacher-audio-drawer__sheet" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1">
          <div class="teacher-audio-drawer__handle" aria-hidden="true"></div>
          <header class="teacher-audio-drawer__head">
            <span class="teacher-audio-drawer__mark" aria-hidden="true"><i :class="hasAudio ? 'bi bi-soundwave' : 'bi bi-file-text'"></i></span>
            <div>
              <span>{{ mode === 'transcript' ? t('teacher.recitation_transcript') : t('teacher.audio_review') }}</span>
              <h2 :id="titleId">{{ row?.title || t('teacher.practice_session') }}</h2>
              <p v-if="row?.hint">{{ row.hint }}</p>
            </div>
            <button type="button" class="teacher-audio-drawer__close" :aria-label="t('teacher.close_audio_player')" @click="$emit('close')">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>

          <div v-if="hasAudio" class="teacher-audio-player">
            <audio
              ref="player"
              :src="row.audio.url"
              preload="metadata"
              @loadedmetadata="onMetadata"
              @durationchange="onMetadata"
              @timeupdate="onTimeUpdate"
              @play="playing = true"
              @pause="playing = false"
              @ended="playing = false"
            ></audio>
            <button type="button" class="teacher-audio-player__play" :aria-label="playing ? t('teacher.pause_recording') : t('teacher.play_recording')" @click="togglePlayback">
              <i class="bi" :class="playing ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
            </button>
            <div class="teacher-audio-player__timeline">
              <input
                type="range"
                min="0"
                :max="Math.max(duration, 0)"
                step="0.1"
                :value="currentTime"
                :aria-label="t('teacher.audio_position')"
                @input="seek"
              >
              <div><span>{{ formatTime(currentTime) }}</span><span>{{ formatTime(duration) }}</span></div>
            </div>
            <button type="button" class="teacher-audio-player__speed" :aria-label="t('teacher.playback_speed')" @click="cycleSpeed">{{ speed }}×</button>
          </div>

          <div v-if="evidenceProcessing" class="teacher-audio-drawer__no-audio" role="status">
            <i class="bi bi-hourglass-split" aria-hidden="true"></i>
            <span>{{ t('teacher.evidence_processing') }}</span>
          </div>

          <div v-else-if="mode === 'transcript' && !row?.transcript" class="teacher-audio-drawer__no-audio">
            <i class="bi bi-file-text" aria-hidden="true"></i>
            <span>{{ transcriptUnavailableLabel }}</span>
          </div>

          <div v-else-if="mode === 'audio' && !hasAudio" class="teacher-audio-drawer__no-audio">
            <i class="bi bi-file-earmark-text" aria-hidden="true"></i>
            <span>{{ audioUnavailableLabel }}</span>
          </div>

          <section v-if="row?.transcript" class="teacher-audio-transcript" :class="{ 'is-featured': mode === 'transcript' }">
            <div><h3>{{ t('teacher.transcript_label') }}</h3><small v-if="!hasAudio">{{ t('teacher.transcript_no_recording') }}</small></div>
            <p dir="auto">{{ row.transcript }}</p>
          </section>

          <section v-if="canonicalWords.length" class="teacher-audio-evidence" :aria-labelledby="evidenceTitleId">
            <div class="teacher-audio-evidence__heading">
              <h3 :id="evidenceTitleId">{{ t('teacher.recitation_text') }}</h3>
              <span v-if="missCount">{{ t('teacher.misses_n', { n: missCount }) }}</span>
              <span v-else>{{ t('teacher.recite_no_issues') }}</span>
            </div>
            <p class="teacher-audio-evidence__words" lang="ar" dir="rtl">
              <span v-for="(word, index) in canonicalWords" :key="`${word.ayah || 0}-${word.word_index ?? index}-${index}`" :class="{ 'is-miss': isMiss(word.status) }" :title="isMiss(word.status) ? evidenceWordTitle(word) : undefined">{{ word.text }}</span>
            </p>
          </section>
          <p v-else-if="canonicalLoading" class="teacher-loading-inline" role="status">{{ t('teacher.loading_quran_text') }}</p>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { teacherCanonicalEvidenceWords } from '../../scripts/teacher/quranContent'

let drawerUid = 0

export default {
  name: 'TeacherAudioDrawer',
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    row: { type: Object, default: null },
    mode: { type: String, default: 'audio' },
  },
  emits: ['close'],
  data() {
    drawerUid += 1
    return {
      titleId: `teacher-audio-title-${drawerUid}`,
      evidenceTitleId: `teacher-audio-evidence-title-${drawerUid}`,
      currentTime: 0,
      duration: 0,
      playing: false,
      speed: 1,
      canonicalWords: [],
      canonicalLoading: false,
      canonicalRequest: 0,
    }
  },
  computed: {
    hasAudio() {
      return Boolean(this.row?.audio?.available && this.row?.audio?.url)
    },
    missCount() {
      return this.canonicalWords.filter((word) => this.isMiss(word.status)).length
    },
    evidenceProcessing() {
      return this.row?.evidenceState === 'processing'
    },
    transcriptUnavailableLabel() {
      return this.row?.transcriptState === 'processing'
        ? this.t('teacher.evidence_processing')
        : this.t('teacher.transcript_not_recorded')
    },
    audioUnavailableLabel() {
      const reason = this.row?.audio?.reason
      if (reason === 'expired' || reason === 'purged' || reason === 'missing') return this.t('teacher.recording_not_retained')
      return this.t('teacher.recording_not_recorded')
    },
  },
  watch: {
    open(value) {
      document.body.classList.toggle('teacher-audio-open', value)
      if (value) {
        this.resetPlayer()
        this.loadCanonicalWords()
        this.$nextTick(() => this.$refs.drawer?.focus({ preventScroll: true }))
      } else {
        this.$refs.player?.pause()
      }
    },
    row() {
      this.resetPlayer()
      if (this.open) this.loadCanonicalWords()
    },
  },
  beforeUnmount() {
    document.body.classList.remove('teacher-audio-open')
  },
  methods: {
    async loadCanonicalWords() {
      const request = ++this.canonicalRequest
      this.canonicalLoading = true
      this.canonicalWords = []
      const words = await teacherCanonicalEvidenceWords({
        range: this.row?.range,
        words: this.row?.words,
      })
      if (request === this.canonicalRequest) {
        this.canonicalWords = words
        this.canonicalLoading = false
      }
    },
    resetPlayer() {
      this.currentTime = 0
      this.duration = Number(this.row?.audio?.duration_ms || 0) / 1000
      this.playing = false
      this.speed = 1
      const player = this.$refs.player
      if (player) {
        player.pause()
        player.currentTime = 0
        player.playbackRate = 1
      }
    },
    async togglePlayback() {
      const player = this.$refs.player
      if (!player) return
      if (player.paused) {
        try { await player.play() } catch (_) { this.playing = false }
      } else {
        player.pause()
      }
    },
    onMetadata() {
      const seconds = Number(this.$refs.player?.duration)
      if (Number.isFinite(seconds)) this.duration = seconds
    },
    onTimeUpdate() {
      this.currentTime = Number(this.$refs.player?.currentTime || 0)
    },
    seek(event) {
      const seconds = Number(event.target.value || 0)
      this.currentTime = seconds
      if (this.$refs.player) this.$refs.player.currentTime = seconds
    },
    cycleSpeed() {
      const speeds = [1, 1.25, 1.5, 0.75]
      this.speed = speeds[(speeds.indexOf(this.speed) + 1) % speeds.length]
      if (this.$refs.player) this.$refs.player.playbackRate = this.speed
    },
    isMiss(status) {
      return ['incorrect', 'skipped', 'extra', 'repeated', 'wrong'].includes(String(status || '').toLowerCase())
    },
    evidenceWordTitle(word) {
      const status = String(word.status || 'incorrect').toLowerCase()
      const labelKey = ['incorrect', 'wrong'].includes(status) ? 'teacher.issue_missed' : `teacher.issue_${status}`
      return word.detected
        ? `${this.t(labelKey)}: ${word.detected}`
        : this.t(labelKey)
    },
    formatTime(value) {
      const seconds = Math.max(0, Math.floor(Number(value) || 0))
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    },
  },
}
</script>
