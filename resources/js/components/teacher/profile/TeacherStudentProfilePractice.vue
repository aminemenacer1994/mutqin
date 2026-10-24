<template>
  <TeacherSectionPane tone="practice">
    <div class="teacher-section-summary" role="list">
      <div role="listitem">
        <span>{{ t('teacher.practice_sessions_shown') }}</span>
        <strong>{{ sessionCount }}</strong>
        <small>{{ t('teacher.practice_sessions_help') }}</small>
      </div>
      <div role="listitem">
        <span>{{ t('teacher.practice_time') }}</span>
        <strong>{{ totalMinutes }}</strong>
        <small>{{ t('teacher.practice_time_help') }}</small>
      </div>
      <div role="listitem">
        <span>{{ t('teacher.last') }}</span>
        <strong>{{ latestActivity }}</strong>
        <small>{{ t('teacher.last_activity_help') }}</small>
      </div>
    </div>
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
    sessionCount() {
      return (this.profile.payload.sessions || []).length
    },
    totalMinutes() {
      const seconds = (this.profile.payload.sessions || []).reduce((total, session) => total + Number(session.duration_seconds || 0), 0)
      return this.t('teacher.minutes', { n: Math.round(seconds / 60) })
    },
    latestActivity() {
      const latest = this.profile.payload.sessions?.[0]?.last_activity_at
      return latest ? this.formatWhen(latest) : this.t('teacher.no_activity')
    },
    sessionGroups() {
      const groups = new Map()
      for (const session of this.profile.payload.sessions || []) {
        const title = this.sessionLabel(session)
        if (!groups.has(title)) groups.set(title, { key: title, title, rows: [] })
        groups.get(title).rows.push({
          key: session.id,
          icon: 'bi bi-journal-text',
          iconTone: 'accent',
          title: this.t('teacher.practice_session'),
          hint: [
            this.formatWhen(session.last_activity_at) || this.t('teacher.unavailable'),
            session.duration_seconds ? this.t('teacher.session_duration_minutes', { n: Math.max(1, Math.round(Number(session.duration_seconds) / 60)) }) : '',
          ].filter(Boolean).join(' · '),
          badge: session.status ? this.statusLabel(session.status) : '',
          badgeTone: session.status === 'completed' ? 'good' : 'muted',
        })
      }
      return [...groups.values()]
    },
  },
  methods: {
    statusLabel(status) {
      if (status === 'completed') return this.t('teacher.status_completed')
      return this.t('teacher.practice_saved_status')
    },
  },
}
</script>
