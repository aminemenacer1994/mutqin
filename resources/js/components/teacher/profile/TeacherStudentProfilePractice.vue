<template>
  <div>
    <p v-if="profile.payload.latest_saved" class="teacher-saved">
      <span class="teacher-pill teacher-pill--practice">
        <i class="bi bi-bookmark-fill" aria-hidden="true"></i>
        {{ t('teacher.saved_session') }}
      </span>
      {{ sessionLabel(profile.payload.latest_saved) }}
    </p>
    <TeacherEmpty v-else icon="bi bi-bookmark" :message="t('teacher.saved_empty')" />
    <ul v-if="profile.payload.sessions?.length" class="teacher-list teacher-list--bordered">
      <li v-for="session in profile.payload.sessions" :key="session.id">
        <span>{{ sessionLabel(session) }}</span>
        <span class="teacher-chip teacher-chip--practising">{{ formatWhen(session.last_activity_at) }}</span>
      </li>
    </ul>
    <TeacherEmpty v-else icon="bi bi-play-circle" :message="t('teacher.practice_empty')" />
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
