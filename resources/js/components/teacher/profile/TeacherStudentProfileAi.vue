<template>
  <div>
    <TeacherEmpty v-if="profile.payload.success_rate === null" :message="t('teacher.ai_empty')" />
    <p v-else>{{ t('teacher.ai_rate') }}: {{ profile.payload.success_rate }}%</p>
    <ul v-if="profile.payload.attempts?.length" class="teacher-list teacher-list--bordered">
      <li v-for="attempt in profile.payload.attempts" :key="attempt.id">
        <span>{{ attempt.range?.surah_name || t('teacher.unavailable') }} {{ attempt.range?.from }}–{{ attempt.range?.to }}</span>
        <span>{{ attempt.accuracy_percent === null ? t('teacher.unavailable') : `${attempt.accuracy_percent}%` }} · {{ issueLabel(attempt.issues) }}</span>
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
}
</script>
