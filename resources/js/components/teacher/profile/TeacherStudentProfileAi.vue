<template>
  <TeacherSectionPane
    :title="t('teacher.tab_ai')"
    :hint="aiHint"
    icon="bi bi-mic"
    tone="recite"
  >
    <TeacherRecordList v-if="attemptRows.length" :rows="attemptRows" />
    <TeacherEmpty v-else icon="bi bi-mic" :message="t('teacher.ai_empty')" />
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { scoreBadgeTone } from '../../../scripts/teacher/formatters'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecordList from '../TeacherRecordList.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentProfileAi',
  components: { TeacherEmpty, TeacherRecordList, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    issueLabel: { type: Function, required: true },
  },
  computed: {
    aiHint() {
      const rate = this.profile.payload.success_rate
      if (typeof rate === 'number') {
        return this.t('teacher.profile_tab_ai_hint_score', { score: rate })
      }
      return this.t('teacher.profile_tab_ai_hint')
    },
    attemptRows() {
      return (this.profile.payload.attempts || []).map((attempt) => {
        const name = attempt.range?.surah_name || this.t('teacher.unavailable')
        const from = attempt.range?.from
        const to = attempt.range?.to
        const title = from && to ? `${name} ${from}–${to}` : name
        const issues = attempt.issues
        const hint = issues ? this.issueLabel(issues) : ''
        return {
          key: attempt.id,
          icon: 'bi bi-mic',
          iconTone: scoreBadgeTone(attempt.accuracy_percent),
          title,
          quran: true,
          hint: hint || this.t('teacher.profile_recite_attempt'),
          badge: typeof attempt.accuracy_percent === 'number' ? `${attempt.accuracy_percent}%` : this.t('teacher.unavailable'),
          badgeTone: scoreBadgeTone(attempt.accuracy_percent),
        }
      })
    },
  },
}
</script>
