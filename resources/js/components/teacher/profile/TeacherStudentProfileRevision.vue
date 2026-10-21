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
      return (this.profile.payload.revisit || []).map((item, index) => ({
        key: `revisit-${index}`,
        icon: 'bi bi-arrow-repeat',
        iconTone: 'accent',
        title: `${item.surah_name} ${item.ayah_number}`,
        quran: true,
        hint: this.t('teacher.revisit_spot_hint'),
        badge: this.t('teacher.times', { n: item.affected_attempt_count }),
        badgeTone: 'mid',
      }))
    },
    planRows() {
      return (this.profile.payload.plans || []).map((plan) => ({
        key: plan.id,
        icon: 'bi bi-journal-bookmark',
        iconTone: plan.overdue ? 'warn' : 'accent',
        title: `${plan.surah_name} ${plan.ayah_start}–${plan.ayah_end}`,
        quran: true,
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
