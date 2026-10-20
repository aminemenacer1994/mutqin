<template>
  <div>
    <p v-if="profile.payload.latest_saved">
      <strong>{{ t('teacher.saved_session') }}</strong> {{ sessionLabel(profile.payload.latest_saved) }}
    </p>
    <TeacherEmpty v-else :message="t('teacher.saved_empty')" />
    <ul v-if="profile.payload.sessions?.length" class="teacher-list teacher-list--bordered">
      <li v-for="session in profile.payload.sessions" :key="session.id">
        <span>{{ sessionLabel(session) }}</span>
        <span>{{ session.status }} · {{ formatWhen(session.last_activity_at) }}</span>
      </li>
    </ul>
    <TeacherEmpty v-else :message="t('teacher.practice_empty')" />
  </div>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import TeacherEmpty from '../TeacherEmpty.vue'

export default {
  name: 'TeacherStudentProfilePractice',
  components: { TeacherEmpty },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    sessionLabel: { type: Function, required: true },
    formatWhen: { type: Function, required: true },
  },
}
</script>
