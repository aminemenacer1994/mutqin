<template>
  <TeacherSectionPane tone="practice">
    <div v-if="profile.payload.latest_saved" class="teacher-spotlight teacher-spotlight--practice teacher-spotlight--inline">
      <span class="teacher-spotlight__icon" aria-hidden="true"><i class="bi bi-bookmark-fill"></i></span>
      <div class="teacher-spotlight__copy">
        <span class="teacher-spotlight__label">{{ t('teacher.saved_session') }}</span>
        <span class="teacher-quran teacher-spotlight__value">{{ sessionLabel(profile.payload.latest_saved) }}</span>
      </div>
    </div>
    <TeacherRecordList v-if="sessionRows.length" :rows="sessionRows" />
    <TeacherEmpty v-else icon="bi bi-play-circle" :message="t('teacher.practice_empty')" />
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecordList from '../TeacherRecordList.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentProfilePractice',
  components: { TeacherEmpty, TeacherRecordList, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    sessionLabel: { type: Function, required: true },
    formatWhen: { type: Function, required: true },
  },
  computed: {
    sessionRows() {
      return (this.profile.payload.sessions || []).map((session) => ({
        key: session.id,
        icon: 'bi bi-journal-text',
        iconTone: 'accent',
        title: this.sessionLabel(session),
        quran: true,
        hint: this.t('teacher.profile_session_when', { when: this.formatWhen(session.last_activity_at) }),
        badge: this.formatWhen(session.last_activity_at),
        badgeTone: 'muted',
      }))
    },
  },
}
</script>
