<template>
  <TeacherDialog
    :open="open"
    size="xl"
    :title="row?.title || t('teacher.profile_recite_attempt')"
    :eyebrow="eyebrowLabel"
    :close-label="t('teacher.close')"
    @close="$emit('close')"
  >
    <template #pills>
      <span v-if="row?.hint" class="badge rounded-pill text-bg-light border">{{ row.hint }}</span>
    </template>
    <div class="teacher-recite-modal">
          <div v-if="hasAudio" class="teacher-recite-modal__audio">
            <audio
              ref="player"
              :src="row.audio.url"
              preload="metadata"
              @loadedmetadata="onMetadata"
              @timeupdate="onTimeUpdate"
              @play="playing = true"
              @pause="playing = false"
              @ended="playing = false"
            ></audio>
            <button type="button" class="teacher-recite-modal__play" :aria-label="playing ? t('teacher.pause_recording') : t('teacher.play_recording')" @click="togglePlayback">
              <i class="bi" :class="playing ? 'bi-pause-fill' : 'bi-mic-fill'" aria-hidden="true"></i>
            </button>
            <div class="teacher-recite-modal__timeline">
              <input type="range" min="0" :max="Math.max(duration, 0)" step="0.1" :value="currentTime" :aria-label="t('teacher.audio_position')" @input="seek">
              <div><span>{{ formatTime(currentTime) }}</span><span>{{ formatTime(duration) }}</span></div>
            </div>
          </div>
          <p v-else-if="evidenceProcessing" class="teacher-recite-modal__muted" role="status">{{ t('teacher.evidence_processing') }}</p>
          <p v-else-if="mode === 'audio'" class="teacher-recite-modal__muted">{{ audioUnavailableLabel }}</p>

          <div v-if="mode === 'mushaf'" class="teacher-recite-modal__body">
            <section v-if="hasAssignedRange" class="teacher-recite-mushaf__block is-assigned">
              <h3>{{ t('teacher.assigned_task_passage') }}</h3>
              <p v-if="loading" class="teacher-recite-modal__muted" role="status">{{ t('teacher.loading_quran_text') }}</p>
              <TeacherReciteMushafAyahs v-else-if="assignedAyahs.length" :ayahs="assignedAyahs" />
              <p v-else class="teacher-recite-modal__muted">{{ t('teacher.madani_text_unavailable') }}</p>
            </section>

            <section class="teacher-recite-mushaf__block">
              <div class="teacher-recite-mushaf__block-head">
                <h3>{{ t('teacher.recitation_compare_label') }}</h3>
              </div>
              <p v-if="loading" class="teacher-recite-modal__muted" role="status">{{ t('teacher.loading_quran_text') }}</p>
              <TeacherReciteMushafAyahs v-else-if="ayahs.length" :ayahs="ayahs" />
              <p v-else class="teacher-recite-modal__muted">{{ t('teacher.madani_text_unavailable') }}</p>
            </section>

            <details v-if="row?.transcript" class="teacher-recite-modal__asr">
              <summary>{{ t('teacher.transcript_label') }}</summary>
              <p class="teacher-recognition-transcript" lang="ar" dir="rtl">{{ row.transcript }}</p>
              <small>{{ t('teacher.transcript_asr_note') }}</small>
            </details>
          </div>
    </div>
  </TeacherDialog>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { buildTeacherReciteMushafView } from '../../scripts/teacher/teacherReciteMushafView'
import TeacherDialog from './TeacherDialog.vue'
import TeacherReciteMushafAyahs from './TeacherReciteMushafAyahs.vue'

let modalUid = 0

export default {
  name: 'TeacherReciteEvidenceModal',
  components: { TeacherDialog, TeacherReciteMushafAyahs },
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    row: { type: Object, default: null },
    mode: { type: String, default: 'mushaf' },
  },
  emits: ['close'],
  data() {
    modalUid += 1
    return {
      titleId: `teacher-recite-modal-title-${modalUid}`,
      ayahs: [],
      assignedAyahs: [],
      loading: false,
      loadToken: 0,
      currentTime: 0,
      duration: 0,
      playing: false,
    }
  },
  computed: {
    hasAudio() {
      return Boolean(this.row?.audio?.available && this.row?.audio?.url)
    },
    evidenceProcessing() {
      return this.row?.evidenceState === 'processing'
    },
    eyebrowLabel() {
      return this.mode === 'audio' ? this.t('teacher.audio_review') : this.t('teacher.recitation_mushaf_review')
    },
    hasAssignedRange() {
      const range = this.row?.assignedRange
      const performance = this.row?.range
      if (!range?.surah || !range?.from) return false
      if (!performance?.surah || !performance?.from) return true
      return range.surah !== performance.surah
        || range.from !== performance.from
        || Number(range.to || range.from) !== Number(performance.to || performance.from)
    },
    audioUnavailableLabel() {
      const reason = this.row?.audio?.reason
      if (reason === 'expired' || reason === 'purged' || reason === 'missing') return this.t('teacher.recording_not_retained')
      return this.t('teacher.recording_unavailable')
    },
  },
  watch: {
    open(value) {
      document.body.classList.toggle('teacher-recite-modal-open', value)
      if (value) {
        this.resetPlayer()
        this.loadMushaf()
        this.$nextTick(() => {
          if (this.mode === 'audio' && this.hasAudio) this.togglePlayback()
        })
      } else {
        this.$refs.player?.pause()
      }
    },
    row() {
      this.resetPlayer()
      if (this.open) this.loadMushaf()
    },
    mode() {
      if (this.open && this.mode === 'mushaf') this.loadMushaf()
    },
  },
  beforeUnmount() {
    document.body.classList.remove('teacher-recite-modal-open')
  },
  methods: {
    async loadMushaf() {
      if (this.mode !== 'mushaf' || !this.row) return
      const token = ++this.loadToken
      this.loading = true
      this.ayahs = []
      this.assignedAyahs = []
      try {
        const view = await buildTeacherReciteMushafView(this.row)
        if (token !== this.loadToken) return
        this.ayahs = view.ayahs
        this.assignedAyahs = view.assignedAyahs
      } finally {
        if (token === this.loadToken) this.loading = false
      }
    },
    resetPlayer() {
      this.currentTime = 0
      this.duration = Number(this.row?.audio?.duration_ms || 0) / 1000
      this.playing = false
      const player = this.$refs.player
      if (player) {
        player.pause()
        player.currentTime = 0
      }
    },
    async togglePlayback() {
      const player = this.$refs.player
      if (!player) return
      if (player.paused) {
        try { await player.play() } catch { this.playing = false }
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
    formatTime(value) {
      const seconds = Math.max(0, Math.floor(Number(value) || 0))
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    },
  },
}
</script>
