<template>
  <TeacherSectionPane tone="recite">
    <p class="teacher-profile-ai__note">{{ t('teacher.profile_recite_ai_note') }}</p>
    <p v-if="scoreSummary" class="teacher-profile-ai__window">{{ scoreSummary }}</p>
    <div v-if="attemptGroups.length" class="teacher-history-groups">
      <details v-for="group in attemptGroups" :key="group.key" class="teacher-history-group" :open="group.rows.length === 1">
        <summary class="teacher-history-group__summary">
          <span class="teacher-history-group__title">{{ group.title }}</span>
          <span class="teacher-history-group__count">{{ group.rows.length }} {{ group.rows.length === 1 ? t('teacher.check_one') : t('teacher.check_many') }}</span>
          <i class="bi bi-chevron-down" aria-hidden="true"></i>
        </summary>
        <TeacherRecordList :rows="group.rows" />
      </details>
    </div>
    <TeacherEmpty v-else icon="bi bi-mic" :message="t('teacher.ai_empty')" />
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { ayahRangeLabel, scoreBadgeTone } from '../../../scripts/teacher/formatters'
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
    formatWhen: { type: Function, required: true },
  },
  computed: {
    scoreSummary() {
      const count = Number(this.profile.payload?.score_count || 0)
      if (!count) return ''
      const start = this.formatWhen(this.profile.payload?.score_window_start)
      const end = this.formatWhen(this.profile.payload?.score_window_end)
      const window = start && end ? this.t('teacher.profile_recite_score_dates', { start, end }) : ''
      return this.t('teacher.profile_recite_score_window', { count, window })
    },
    attemptGroups() {
      const groups = new Map()
      for (const attempt of this.profile.payload.attempts || []) {
        const name = attempt.range?.surah_name || this.t('teacher.unavailable')
        const from = attempt.range?.from
        const to = attempt.range?.to
        const title = ayahRangeLabel(name, from, to, this.t)
        const issues = attempt.issues
        const issueHint = issues && Object.values(issues).some((value) => Number(value) > 0) ? this.issueLabel(issues) : ''
        const when = this.formatWhen(attempt.created_at)
        const row = {
          key: attempt.id,
          icon: 'bi bi-mic',
          iconTone: scoreBadgeTone(attempt.accuracy_percent),
          title: when || this.t('teacher.unavailable'),
          hint: issueHint,
          badge: typeof attempt.accuracy_percent === 'number'
            ? this.t('teacher.score_n', { n: attempt.accuracy_percent })
            : this.t('teacher.unavailable'),
          badgeTone: scoreBadgeTone(attempt.accuracy_percent),
        }
        if (!groups.has(title)) groups.set(title, { key: title, title, rows: [] })
        groups.get(title).rows.push(row)
      }
      return [...groups.values()]
    },
  },
}
</script>
