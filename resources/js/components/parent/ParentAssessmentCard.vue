<template>
  <article class="parent-assessment">
    <div class="parent-assessment__head">
      <span class="teacher-pill" :class="assessment.source === 'teacher_reviewed' ? 'is-score' : 'is-partial'">{{ sourceLabel }}</span>
      <strong v-if="assessment.word_match_percent !== null">{{ t('parent.word_match_score', { score: assessment.word_match_percent }) }}</strong>
    </div>
    <p class="mb-0">{{ lead }}</p>
    <p class="teacher-meta mb-0">{{ t('parent.word_match_disclaimer') }}</p>
    <p v-if="assessment.teacher_note" class="mb-0">{{ assessment.teacher_note }}</p>
    <audio
      v-if="assessment.has_recording && assessment.recording_url"
      class="w-100"
      controls
      :src="assessment.recording_url"
      preload="none"
    >
      {{ t('parent.recording_label') }}
    </audio>
  </article>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'ParentAssessmentCard',
  mixins: [i18nMixin],
  props: {
    assessment: { type: Object, required: true },
  },
  computed: {
    sourceLabel() {
      return this.assessment.source === 'teacher_reviewed'
        ? this.t('parent.assessment_teacher_reviewed')
        : this.t('parent.assessment_ai_prediction')
    },
    lead() {
      return this.assessment.source === 'teacher_reviewed'
        ? this.t('parent.assessment_teacher_lead')
        : this.t('parent.assessment_ai_lead')
    },
  },
}
</script>
