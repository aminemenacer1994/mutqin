<template>
  <TeacherSectionPane tone="neutral">
    <h4 class="teacher-section-label">
      <i class="bi bi-pin-angle" aria-hidden="true"></i>
      {{ t('teacher.revisit') }}
    </h4>
    <TeacherRecordList v-if="revisitRows.length" :rows="revisitRows" />
    <TeacherEmpty v-else inline icon="bi bi-check2-circle" :message="t('teacher.revision_empty')" />

    <h4 class="teacher-section-label">
      <i class="bi bi-calendar-event" aria-hidden="true"></i>
      {{ t('teacher.plans') }}
    </h4>
    <TeacherRecordList v-if="planRows.length" :rows="planRows" />
    <TeacherEmpty v-else inline icon="bi bi-calendar" :message="t('teacher.revision_empty')" />
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { ayahRangeLabel, groupAyahFindings } from '../../../scripts/teacher/formatters'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecordList from '../TeacherRecordList.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentProfileRevision',
  components: { TeacherEmpty, TeacherRecordList, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    comparisons: { type: Array, default: () => [] },
    formatWhen: { type: Function, required: true },
  },
  computed: {
    revisitRows() {
      return groupAyahFindings(this.profile.payload.revisit, this.t).map((group) => ({
        key: `revisit-${group.key}`,
        icon: 'bi bi-arrow-repeat',
        iconTone: 'accent',
        title: group.title,
        hint: group.findings.join(' · '),
      }))
    },
    planRows() {
      return (this.profile.payload.plans || []).map((plan) => ({
        key: plan.id,
        icon: 'bi bi-journal-bookmark',
        iconTone: plan.overdue ? 'warn' : 'accent',
        title: ayahRangeLabel(plan.surah_name, plan.ayah_start, plan.ayah_end, this.t),
        hint: plan.overdue ? this.t('teacher.plan_overdue_hint') : this.t('teacher.plan_due_hint'),
        badge: plan.overdue
          ? this.t('teacher.overdue')
          : (plan.recommended_review_at ? this.formatWhen(plan.recommended_review_at) : this.t('teacher.unavailable')),
        badgeTone: plan.overdue ? 'danger' : 'muted',
      }))
    },
  },
}
</script>
