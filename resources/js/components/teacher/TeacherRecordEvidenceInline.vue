<template>
  <div class="teacher-record-evidence" :aria-label="t('teacher.recitation_evidence')">
    <div v-if="hasAudio" class="teacher-record-evidence__audio">
      <audio controls preload="metadata" :src="row.audio.url">{{ t('teacher.play_recording') }}</audio>
    </div>
    <p v-else-if="evidenceProcessing" class="teacher-record-evidence__muted" role="status">{{ t('teacher.evidence_processing') }}</p>
    <p v-else-if="audioUnavailableLabel" class="teacher-record-evidence__muted">{{ audioUnavailableLabel }}</p>

    <div v-if="row?.transcript" class="teacher-record-evidence__said">
      <span class="teacher-record-evidence__label">{{ t('teacher.transcript_label') }}</span>
      <p class="teacher-quran" lang="ar" dir="rtl">{{ row.transcript }}</p>
    </div>

    <div v-if="canonicalWords.length || canonicalLoading" class="teacher-record-evidence__compare">
      <div class="teacher-record-evidence__compare-head">
        <span class="teacher-record-evidence__label">{{ t('teacher.recitation_text') }}</span>
        <span v-if="missCount" class="teacher-record-evidence__badge is-warn">{{ t('teacher.misses_n', { n: missCount }) }}</span>
      </div>
      <p v-if="canonicalLoading" class="teacher-record-evidence__muted">{{ t('teacher.loading_quran_text') }}</p>
      <div v-else class="teacher-record-evidence__words teacher-quran" lang="ar" dir="rtl">
        <span
          v-for="(word, index) in canonicalWords"
          :key="`${word.ayah || 0}-${word.word_index ?? index}-${index}`"
          class="teacher-record-evidence__word"
          :class="{ 'is-miss': isMiss(word.status) }"
          :title="wordTitle(word)"
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
  data() { return { canonicalWords: [], canonicalLoading: false, requestId: 0 } },
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
    missCount() { return this.canonicalWords.filter((word) => this.isMiss(word.status)).length },
  },
  watch: {
    row: { immediate: true, handler() { this.loadWords() } },
  },
  methods: {
    async loadWords() {
      const request = ++this.requestId
      this.canonicalLoading = true
      this.canonicalWords = []
      const words = await teacherCanonicalEvidenceWords({ range: this.row?.range, words: this.row?.words })
      if (request === this.requestId) {
        this.canonicalWords = words
        this.canonicalLoading = false
      }
    },
    isMiss(status) {
      return ['incorrect', 'skipped', 'extra', 'repeated', 'wrong'].includes(String(status || '').toLowerCase())
    },
    wordTitle(word) {
      if (!this.isMiss(word.status)) return ''
      if (word.detected) return `${this.t('teacher.transcript_label')}: ${word.detected}`
      return this.t('teacher.issue_missed')
    },
  },
}
</script>
