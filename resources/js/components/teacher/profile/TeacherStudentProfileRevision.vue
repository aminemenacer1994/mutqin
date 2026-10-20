<template>
  <div>
    <h3>{{ t('teacher.revisit') }}</h3>
    <ul v-if="profile.payload.revisit?.length" class="teacher-list teacher-list--bordered">
      <li v-for="(item, index) in profile.payload.revisit" :key="index">
        <span>{{ item.surah_name }} {{ item.ayah_number }}</span>
        <span>{{ t('teacher.times', { n: item.affected_attempt_count }) }}</span>
      </li>
    </ul>
    <TeacherEmpty v-else :message="t('teacher.revision_empty')" />

    <h3>{{ t('teacher.plans') }}</h3>
    <ul v-if="profile.payload.plans?.length" class="teacher-list teacher-list--bordered">
      <li v-for="plan in profile.payload.plans" :key="plan.id">
        <span>{{ plan.surah_name }} {{ plan.ayah_start }}–{{ plan.ayah_end }}</span>
        <span>{{ plan.overdue ? t('teacher.overdue') : (plan.recommended_review_at ? formatWhen(plan.recommended_review_at) : t('teacher.unavailable')) }}</span>
      </li>
    </ul>
    <TeacherEmpty v-else :message="t('teacher.revision_empty')" />

    <h3>{{ t('teacher.comparisons') }}</h3>
    <ul v-if="comparisons.length" class="teacher-list teacher-list--bordered">
      <li v-for="item in comparisons" :key="item.id">
        <span>{{ item.assignment.surah_name }} {{ item.assignment.ayah_start }}–{{ item.assignment.ayah_end }}</span>
        <span v-if="item.comparison?.available">
          {{ item.comparison.before.accuracy_percent }}% → {{ item.comparison.after.accuracy_percent }}%
          ({{ item.comparison.accuracy_delta > 0 ? '+' : '' }}{{ item.comparison.accuracy_delta }})
        </span>
        <span v-else>{{ t('teacher.comparison_unavailable') }}</span>
      </li>
    </ul>
    <TeacherEmpty v-else :message="t('teacher.comparison_unavailable')" />
  </div>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import TeacherEmpty from '../TeacherEmpty.vue'

export default {
  name: 'TeacherStudentProfileRevision',
  components: { TeacherEmpty },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    comparisons: { type: Array, default: () => [] },
    formatWhen: { type: Function, required: true },
  },
}
</script>
