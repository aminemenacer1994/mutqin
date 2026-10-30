<template>
  <div class="teacher-record-evidence teacher-record-evidence--mushaf" :aria-label="t('teacher.recitation_evidence')">
    <div v-if="hasAudio" class="teacher-record-evidence__audio">
      <audio controls preload="metadata" :src="row.audio.url">{{ t('teacher.play_recording') }}</audio>
    </div>
    <p v-else-if="evidenceProcessing" class="teacher-record-evidence__muted" role="status">{{ t('teacher.evidence_processing') }}</p>
    <p v-else-if="audioUnavailableLabel" class="teacher-record-evidence__muted">{{ audioUnavailableLabel }}</p>

    <div v-if="hasMushafRange" class="teacher-record-evidence__mushaf">
      <div v-if="compareLabel" class="teacher-record-evidence__compare-head">
        <span class="teacher-record-evidence__label">{{ compareLabel }}</span>
      </div>
      <p v-if="loading" class="teacher-record-evidence__muted" role="status">{{ t('teacher.loading_quran_text') }}</p>
      <TeacherReciteMushafAyahs v-else-if="ayahs.length" :ayahs="ayahs" />
    </div>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { buildTeacherReciteMushafView } from '../../scripts/teacher/teacherReciteMushafView'
import TeacherReciteMushafAyahs from './TeacherReciteMushafAyahs.vue'

export default {
  name: 'TeacherRecordEvidenceMushafInline',
  components: { TeacherReciteMushafAyahs },
  mixins: [i18nMixin],
  props: { row: { type: Object, required: true } },
  data() {
    return { ayahs: [], loading: false, loadToken: 0 }
  },
  computed: {
    hasAudio() { return Boolean(this.row?.audio?.available && this.row?.audio?.url) },
    evidenceProcessing() { return this.row?.evidenceState === 'processing' },
    audioUnavailableLabel() {
      if (this.hasAudio || this.evidenceProcessing) return ''
      const reason = String(this.row?.audio?.reason || '')
      if (!reason || reason === 'available' || reason === 'none') return ''
      if (reason === 'expired' || reason === 'purged' || reason === 'missing') return this.t('teacher.recording_not_retained')
      return this.t('teacher.recording_unavailable')
    },
    hasMushafRange() {
      return Boolean(this.row?.range?.surah && this.row?.range?.from)
    },
    hasAssignedCompare() {
      const range = this.row?.assignedRange
      return Boolean(range?.surah && range?.from)
    },
    compareLabel() {
      if (!this.hasAssignedCompare) return ''
      return this.t('teacher.recitation_compare_label')
    },
  },
  watch: {
    row: { immediate: true, handler() { this.loadMushaf() } },
  },
  methods: {
    async loadMushaf() {
      if (!this.hasMushafRange) {
        this.ayahs = []
        return
      }
      const token = ++this.loadToken
      this.loading = true
      this.ayahs = []
      try {
        const view = await buildTeacherReciteMushafView(this.row)
        if (token !== this.loadToken) return
        this.ayahs = view.ayahs
      } finally {
        if (token === this.loadToken) this.loading = false
      }
    },
  },
}
</script>
