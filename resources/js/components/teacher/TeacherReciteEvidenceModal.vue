<template>
  <TeacherDialog
    v-if="shell !== 'student'"
    :open="open"
    size="xl"
    :title="modalTitle"
    :eyebrow="eyebrowLabel"
    :close-label="t('teacher.close')"
    @close="$emit('close')"
  >
    <template #pills>
      <span v-if="row?.hint" class="badge rounded-pill text-bg-light border">{{ row.hint }}</span>
    </template>
    <TeacherReciteEvidenceContent
      ref="content"
      v-bind="contentProps"
      @metadata="onMetadata"
      @timeupdate="onTimeUpdate"
      @play-state="playing = $event"
      @toggle-playback="togglePlayback"
      @seek="seek"
    />
  </TeacherDialog>

  <DashModalRoot workspace
    v-else
    :open="open && Boolean(row)"
    :labelled-by="titleId"
    root-class="dash-student-dialog-root teacher-recite-modal"
    panel-class="dash-student-dialog dash-student-dialog--wide teacher-recite-modal__panel"
    @close="$emit('close')"
  >
    <template v-if="row">
      <header class="dash-drawer__head teacher-recite-modal__head">
        <div class="dash-drawer__head-main">
          <span class="dash-drawer__head-icon" aria-hidden="true"><i class="bi bi-journal-richtext"></i></span>
          <div class="dash-drawer__head-copy">
            <p class="teacher-recite-modal__eyebrow">{{ eyebrowLabel }}</p>
            <h2 :id="titleId" class="dash-drawer__title">{{ modalTitle }}</h2>
            <p v-if="row.hint" class="dash-drawer__subtitle">{{ row.hint }}</p>
          </div>
        </div>
        <button type="button" class="dash-icon-btn dash-drawer__close teacher-recite-modal__close" :aria-label="t('common.close')" @click="$emit('close')">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </header>
      <div class="dash-student-dialog__body">
        <TeacherReciteEvidenceContent
          ref="content"
          v-bind="contentProps"
          @metadata="onMetadata"
          @timeupdate="onTimeUpdate"
          @play-state="playing = $event"
          @toggle-playback="togglePlayback"
          @seek="seek"
        />
      </div>
    </template>
  </DashModalRoot>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { buildTeacherReciteMushafView } from '../../scripts/teacher/teacherReciteMushafView'
import DashModalRoot from '../dashboard/DashModalRoot.vue'
import TeacherDialog from './TeacherDialog.vue'
import TeacherReciteEvidenceContent from './TeacherReciteEvidenceContent.vue'

let modalUid = 0

export default {
  name: 'TeacherReciteEvidenceModal',
  components: { DashModalRoot, TeacherDialog, TeacherReciteEvidenceContent },
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    row: { type: Object, default: null },
    mode: { type: String, default: 'mushaf' },
    shell: { type: String, default: 'teacher' },
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
    modalTitle() {
      return this.row?.title || this.t('teacher.profile_recite_attempt')
    },
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
    contentProps() {
      return {
        row: this.row,
        mode: this.mode,
        ayahs: this.ayahs,
        assignedAyahs: this.assignedAyahs,
        loading: this.loading,
        hasAudio: this.hasAudio,
        evidenceProcessing: this.evidenceProcessing,
        hasAssignedRange: this.hasAssignedRange,
        playing: this.playing,
        currentTime: this.currentTime,
        duration: this.duration,
        audioUnavailableLabel: this.audioUnavailableLabel,
        processingLabel: this.t('teacher.evidence_processing'),
        assignedPassageLabel: this.t('teacher.assigned_task_passage'),
        loadingQuranLabel: this.t('teacher.loading_quran_text'),
        madaniUnavailableLabel: this.t('teacher.madani_text_unavailable'),
        compareLabel: this.t('teacher.recitation_compare_label'),
        transcriptLabel: this.t('teacher.transcript_label'),
        transcriptNoteLabel: this.t('teacher.transcript_asr_note'),
        positionLabel: this.t('teacher.audio_position'),
        playPauseLabels: {
          play: this.t('teacher.play_recording'),
          pause: this.t('teacher.pause_recording'),
        },
      }
    },
  },
  watch: {
    open(value) {
      if (this.shell === 'teacher') {
        document.body.classList.toggle('teacher-recite-modal-open', value)
      }
      if (value) {
        this.resetPlayer()
        this.loadMushaf()
        this.$nextTick(() => {
          if (this.mode === 'audio' && this.hasAudio) this.togglePlayback()
        })
      } else {
        this.$refs.content?.player?.()?.pause()
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
      const player = this.$refs.content?.player?.()
      if (player) {
        player.pause()
        player.currentTime = 0
      }
    },
    async togglePlayback() {
      const player = this.$refs.content?.player?.()
      if (!player) return
      if (player.paused) {
        try { await player.play() } catch { this.playing = false }
      } else {
        player.pause()
      }
    },
    onMetadata() {
      const seconds = Number(this.$refs.content?.player?.()?.duration)
      if (Number.isFinite(seconds)) this.duration = seconds
    },
    onTimeUpdate() {
      this.currentTime = Number(this.$refs.content?.player?.()?.currentTime || 0)
    },
    seek(event) {
      const seconds = Number(event.target.value || 0)
      this.currentTime = seconds
      const player = this.$refs.content?.player?.()
      if (player) player.currentTime = seconds
    },
  },
}
</script>