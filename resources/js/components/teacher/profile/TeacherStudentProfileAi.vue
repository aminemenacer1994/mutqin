<template>
  <div>
    <p v-if="profile.payload.success_rate !== null" class="teacher-saved">
      <span class="teacher-pill teacher-pill--recite">
        <i class="bi bi-mic-fill" aria-hidden="true"></i>
        {{ t('teacher.ai_rate') }} {{ profile.payload.success_rate }}%
      </span>
    </p>
    <TeacherEmpty v-else icon="bi bi-mic" :message="t('teacher.ai_empty')" />
    <ul v-if="profile.payload.attempts?.length" class="teacher-list teacher-list--bordered">
      <li v-for="attempt in profile.payload.attempts" :key="attempt.id">
        <span>{{ attempt.range?.surah_name || t('teacher.unavailable') }} {{ attempt.range?.from }} to {{ attempt.range?.to }}</span>
        <span class="teacher-chip" :class="scoreChip(attempt.accuracy_percent)">
          {{ attempt.accuracy_percent === null ? t('teacher.unavailable') : `${attempt.accuracy_percent}%` }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import TeacherEmpty from '../TeacherEmpty.vue'

export default {
  name: 'TeacherStudentProfileAi',
  components: { TeacherEmpty },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    issueLabel: { type: Function, required: true },
  },
  methods: {
    scoreChip(score) {
      if (typeof score !== 'number') return 'teacher-chip--quiet'
      if (score >= 85) return 'teacher-chip--strong'
      if (score >= 65) return 'teacher-chip--practising'
      return 'teacher-chip--attention'
    },
  },
}
</script>
