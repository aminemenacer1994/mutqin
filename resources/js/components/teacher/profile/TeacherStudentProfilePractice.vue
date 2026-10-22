<template>
  <TeacherSectionPane tone="practice">
    <div v-if="profile.payload.latest_saved" class="teacher-spotlight teacher-spotlight--practice teacher-spotlight--inline">
      <span class="teacher-spotlight__icon" aria-hidden="true"><i class="bi bi-bookmark-fill"></i></span>
      <div class="teacher-spotlight__copy">
        <span class="teacher-spotlight__label">{{ t('teacher.saved_session') }}</span>
        <span class="teacher-spotlight__value">{{ sessionLabel(profile.payload.latest_saved) }}</span>
      </div>
    </div>
    <div v-if="sessionGroups.length" class="teacher-history-groups">
      <details v-for="group in sessionGroups" :key="group.key" class="teacher-history-group" :open="group.rows.length === 1">
        <summary class="teacher-history-group__summary">
          <span class="teacher-history-group__title">{{ group.title }}</span>
          <span class="teacher-history-group__count">{{ group.rows.length }} {{ group.rows.length === 1 ? t('teacher.session_one') : t('teacher.session_many') }}</span>
          <i class="bi bi-chevron-down" aria-hidden="true"></i>
        </summary>
        <TeacherRecordList :rows="group.rows" />
      </details>
    </div>
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
    sessionGroups() {
      const groups = new Map()
      for (const session of this.profile.payload.sessions || []) {
        const title = this.sessionLabel(session)
        if (!groups.has(title)) groups.set(title, { key: title, title, rows: [] })
        groups.get(title).rows.push({
          key: session.id,
          icon: 'bi bi-journal-text',
          iconTone: 'accent',
          title: this.formatWhen(session.last_activity_at) || this.t('teacher.unavailable'),
        })
      }
      return [...groups.values()]
    },
  },
}
</script>
