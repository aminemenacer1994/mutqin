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
            this.t(`teacher.status_${statusKey}`),
            this.completionEvidenceLabel(item),
          ].filter(Boolean).join(' · '),
          badge: this.progressLabel(item) || (a.due_at ? this.formatWhen(a.due_at) : ''),
          badgeTone: tone,
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
