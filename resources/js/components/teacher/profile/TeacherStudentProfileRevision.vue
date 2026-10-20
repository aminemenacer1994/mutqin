<template>
  <div class="teacher-stack">
    <h3 class="teacher-subhead">{{ t('teacher.revisit') }}</h3>
    <ul v-if="profile.payload.revisit?.length" class="teacher-list teacher-list--bordered">
      <li v-for="(item, index) in profile.payload.revisit" :key="index">
        <span>{{ item.surah_name }} {{ item.ayah_number }}</span>
        <span class="teacher-chip teacher-chip--practising">{{ t('teacher.times', { n: item.affected_attempt_count }) }}</span>
      </li>
    </ul>
    <TeacherEmpty v-else icon="bi bi-check2-circle" :message="t('teacher.revision_empty')" />

    <h3 class="teacher-subhead">{{ t('teacher.plans') }}</h3>
    <ul v-if="profile.payload.plans?.length" class="teacher-list teacher-list--bordered">
      <li v-for="plan in profile.payload.plans" :key="plan.id">
        <span>{{ plan.surah_name }} {{ plan.ayah_start }} to {{ plan.ayah_end }}</span>
        <span class="teacher-chip" :class="plan.overdue ? 'teacher-chip--attention' : 'teacher-chip--quiet'">
          {{ plan.overdue ? t('teacher.overdue') : (plan.recommended_review_at ? formatWhen(plan.recommended_review_at) : t('teacher.unavailable')) }}
        </span>
      </li>
    </ul>
    <TeacherEmpty v-else icon="bi bi-calendar" :message="t('teacher.revision_empty')" />
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
