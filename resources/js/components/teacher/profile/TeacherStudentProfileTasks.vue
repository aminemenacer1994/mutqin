<template>
  <TeacherSectionPane tone="neutral">
    <TeacherRecordList v-if="taskRows.length" :rows="taskRows" />
    <TeacherEmpty v-else icon="bi bi-clipboard-check" :message="t('teacher.assignments_empty')" />
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { assignmentProgressLabel } from '../../../scripts/teacher/formatters'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecordList from '../TeacherRecordList.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentProfileTasks',
  components: { TeacherEmpty, TeacherRecordList, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    formatWhen: { type: Function, required: true },
  },
  computed: {
    taskRows() {
      return (this.profile.payload.assignments || []).map((item) => {
        const a = item.assignment || {}
        const kind = a.kind === 'ai_recite' ? 'bi bi-mic' : 'bi bi-journal-text'
        const statusKey = item.status || 'pending'
        const tone = statusKey === 'completed'
          ? 'good'
          : (statusKey === 'overdue' ? 'danger' : (statusKey === 'pending' ? 'muted' : 'mid'))
        return {
          key: item.id,
          icon: kind,
          iconTone: tone,
          title: `${a.surah_name} ${a.ayah_start}–${a.ayah_end}`,
          hint: [
            a.kind === 'ai_recite' ? this.t('teacher.kind_ai') : this.t('teacher.kind_practice'),
            a.due_at ? this.t('teacher.task_due_date', { date: this.formatWhen(a.due_at) }) : this.t('teacher.no_due_date'),
            this.completionEvidenceLabel(item),
          ].filter(Boolean).join(' · '),
          badge: this.t(`teacher.status_${statusKey}`),
          badgeTone: tone,
          source: this.progressLabel(item),
          href: a.surah_number && a.ayah_start
            ? `/memorisation?surah=${a.surah_number}&from=${a.ayah_start}&to=${a.ayah_end || a.ayah_start}&review=1&assignment_recipient=${item.id}`
            : '',
        }
      })
    },
  },
  methods: {
    progressLabel(item) {
      return item?.progress ? assignmentProgressLabel(item, this.t.bind(this)) : ''
    },
    completionEvidenceLabel(item) {
      if (item?.status !== 'completed' || !item?.completed_at) return ''
      return this.t('teacher.learner_assignments_completed_at', {
        date: this.formatWhen(item.completed_at),
      })
    },
  },
}
</script>
