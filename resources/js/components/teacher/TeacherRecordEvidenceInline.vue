<template>
  <div class="teacher-record-evidence" :aria-label="t('teacher.recitation_evidence')">
    <div v-if="hasAudio" class="teacher-record-evidence__audio">
      <audio controls preload="metadata" :src="row.audio.url">{{ t('teacher.play_recording') }}</audio>
    </div>
    <p v-else-if="evidenceProcessing" class="teacher-record-evidence__muted" role="status">{{ t('teacher.evidence_processing') }}</p>
    <p v-else-if="audioUnavailableLabel" class="teacher-record-evidence__muted">{{ audioUnavailableLabel }}</p>

    <div v-if="hasAssignedCompare" class="teacher-record-evidence__compare">
      <span class="teacher-record-evidence__label">{{ t('teacher.assigned_task_passage') }}</span>
      <p v-if="assignedLoading" class="teacher-record-evidence__muted">{{ t('teacher.loading_quran_text') }}</p>
      <p v-else class="teacher-record-evidence__words teacher-quran is-assigned" lang="ar" dir="rtl">{{ assignedText }}</p>
    </div>

    <div v-if="row?.transcript" class="teacher-record-evidence__said">
      <span class="teacher-record-evidence__label">{{ transcriptLabel }}</span>
      <p class="teacher-quran" lang="ar" dir="rtl">{{ row.transcript }}</p>
    </div>

    <div v-if="practicedOnlyCompare" class="teacher-record-evidence__compare">
      <span class="teacher-record-evidence__label">{{ t('teacher.practiced_passage') }}</span>
      <p v-if="practicedLoading" class="teacher-record-evidence__muted">{{ t('teacher.loading_quran_text') }}</p>
      <p v-else class="teacher-record-evidence__words teacher-quran" lang="ar" dir="rtl">{{ practicedText }}</p>
    </div>

    <div v-if="canonicalWords.length || canonicalLoading" class="teacher-record-evidence__compare">
      <div class="teacher-record-evidence__compare-head">
        <span class="teacher-record-evidence__label">{{ compareLabel }}</span>
      </div>
      <p v-if="canonicalLoading" class="teacher-record-evidence__muted">{{ t('teacher.loading_quran_text') }}</p>
      <div v-else class="teacher-record-evidence__words teacher-quran" lang="ar" dir="rtl">
        <span
          v-for="(word, index) in canonicalWords"
          :key="`${word.ayah || 0}-${word.word_index ?? index}-${index}`"
          class="teacher-record-evidence__word"
        >{{ word.text }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { teacherCanonicalEvidenceWords } from '../../scripts/teacher/quranContent'

export default {
  name: 'TeacherRecordEvidenceInline',
  mixins: [i18nMixin],
  props: { row: { type: Object, required: true } },
  data() {
    return {
      canonicalWords: [],
      canonicalLoading: false,
      assignedText: '',
      assignedLoading: false,
      practicedText: '',
      practicedLoading: false,
      requestId: 0,
    }
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
    hasAssignedCompare() {
      const range = this.row?.assignedRange
      return Boolean(range?.surah && range?.from)
    },
    performanceRange() {
      if (this.row?.range?.surah && this.row?.range?.from) return this.row.range
      const practiced = this.row?.practicedRange
      if (practiced?.surah && practiced?.from) return practiced
      return null
    },
    practicedOnlyCompare() {
      if (!this.hasAssignedCompare || this.performanceRange) return false
      const practiced = this.row?.practicedRange
      if (!practiced?.surah || !practiced?.from) return false
      return this.rangesDiffer(this.row.assignedRange, practiced)
    },
    transcriptLabel() {
      return this.hasAssignedCompare
        ? this.t('teacher.recited_passage')
        : this.t('teacher.transcript_label')
    },
    compareLabel() {
      return this.hasAssignedCompare
        ? this.t('teacher.recitation_compare_label')
        : this.t('teacher.recitation_text')
    },
  },
  watch: {
    row: { immediate: true, handler() { this.loadWords() } },
  },
  methods: {
    rangesDiffer(left, right) {
      if (!left?.surah || !right?.surah) return false
      return left.surah !== right.surah
        || left.from !== right.from
        || Number(left.to || left.from) !== Number(right.to || right.from)
    },
    async loadWords() {
      const request = ++this.requestId
      this.canonicalLoading = true
      this.assignedLoading = Boolean(this.hasAssignedCompare)
      this.practicedLoading = this.practicedOnlyCompare
      this.canonicalWords = []
      this.assignedText = ''
      this.practicedText = ''

      const tasks = []
      if (this.hasAssignedCompare) {
        tasks.push(teacherCanonicalEvidenceWords({ range: this.row.assignedRange, words: [] }).then((words) => {
          if (request !== this.requestId) return
          this.assignedText = words.map((word) => word.text).join(' ')
          this.assignedLoading = false
        }))
      }
      if (this.performanceRange) {
        tasks.push(teacherCanonicalEvidenceWords({ range: this.performanceRange, words: this.row?.words }).then((words) => {
          if (request !== this.requestId) return
          this.canonicalWords = words
          this.canonicalLoading = false
        }))
      } else {
        this.canonicalLoading = false
      }
      if (this.practicedOnlyCompare) {
        tasks.push(teacherCanonicalEvidenceWords({ range: this.row.practicedRange, words: [] }).then((words) => {
          if (request !== this.requestId) return
          this.practicedText = words.map((word) => word.text).join(' ')
          this.practicedLoading = false
        }))
      }

      await Promise.all(tasks)
    },
  },
}
</script>
