<template>
  <div class="teacher-recite-modal">
    <div v-if="hasAudio" class="teacher-recite-modal__audio">
      <audio
        ref="player"
        :src="row.audio.url"
        preload="metadata"
        @loadedmetadata="$emit('metadata')"
        @timeupdate="$emit('timeupdate')"
        @play="$emit('play-state', true)"
        @pause="$emit('play-state', false)"
        @ended="$emit('play-state', false)"
      ></audio>
      <button type="button" class="teacher-recite-modal__play" :aria-label="playing ? playPauseLabels.pause : playPauseLabels.play" @click="$emit('toggle-playback')">
        <i class="bi" :class="playing ? 'bi-pause-fill' : 'bi-mic-fill'" aria-hidden="true"></i>
      </button>
      <div class="teacher-recite-modal__timeline">
        <input type="range" min="0" :max="Math.max(duration, 0)" step="0.1" :value="currentTime" :aria-label="positionLabel" @input="$emit('seek', $event)">
        <div><span>{{ formatTime(currentTime) }}</span><span>{{ formatTime(duration) }}</span></div>
      </div>
    </div>
    <p v-else-if="evidenceProcessing" class="teacher-recite-modal__muted" role="status">{{ processingLabel }}</p>
    <p v-else-if="mode === 'audio'" class="teacher-recite-modal__muted">{{ audioUnavailableLabel }}</p>

    <div v-if="mode === 'mushaf'" class="teacher-recite-modal__body">
      <section v-if="hasAssignedRange" class="teacher-recite-mushaf__block is-assigned">
        <h3>{{ assignedPassageLabel }}</h3>
        <p v-if="loading" class="teacher-recite-modal__muted" role="status">{{ loadingQuranLabel }}</p>
        <TeacherReciteMushafAyahs v-else-if="assignedAyahs.length" :ayahs="assignedAyahs" />
        <p v-else class="teacher-recite-modal__muted">{{ madaniUnavailableLabel }}</p>
      </section>

      <section class="teacher-recite-mushaf__block">
        <div class="teacher-recite-mushaf__block-head">
          <h3>{{ compareLabel }}</h3>
        </div>
        <p v-if="loading" class="teacher-recite-modal__muted" role="status">{{ loadingQuranLabel }}</p>
        <TeacherReciteMushafAyahs v-else-if="ayahs.length" :ayahs="ayahs" />
        <p v-else class="teacher-recite-modal__muted">{{ madaniUnavailableLabel }}</p>
      </section>

      <details v-if="row?.transcript" class="teacher-recite-modal__asr">
        <summary>{{ transcriptLabel }}</summary>
        <p class="teacher-recognition-transcript" lang="ar" dir="rtl">{{ row.transcript }}</p>
        <small>{{ transcriptNoteLabel }}</small>
      </details>
    </div>
  </div>
</template>

<script>
import TeacherReciteMushafAyahs from './TeacherReciteMushafAyahs.vue'

export default {
  name: 'TeacherReciteEvidenceContent',
  components: { TeacherReciteMushafAyahs },
  props: {
    row: { type: Object, default: null },
    mode: { type: String, default: 'mushaf' },
    ayahs: { type: Array, default: () => [] },
    assignedAyahs: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    hasAudio: { type: Boolean, default: false },
    evidenceProcessing: { type: Boolean, default: false },
    hasAssignedRange: { type: Boolean, default: false },
    playing: { type: Boolean, default: false },
    currentTime: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    audioUnavailableLabel: { type: String, default: '' },
    processingLabel: { type: String, default: '' },
    assignedPassageLabel: { type: String, default: '' },
    loadingQuranLabel: { type: String, default: '' },
    madaniUnavailableLabel: { type: String, default: '' },
    compareLabel: { type: String, default: '' },
    transcriptLabel: { type: String, default: '' },
    transcriptNoteLabel: { type: String, default: '' },
    positionLabel: { type: String, default: '' },
    playPauseLabels: { type: Object, default: () => ({ play: 'Play', pause: 'Pause' }) },
  },
  emits: ['metadata', 'timeupdate', 'play-state', 'toggle-playback', 'seek'],
  methods: {
    formatTime(value) {
      const seconds = Math.max(0, Math.floor(Number(value) || 0))
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    },
    player() {
      return this.$refs.player
    },
  },
}
</script>