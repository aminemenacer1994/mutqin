<template>
  <TeacherSectionPane tone="practice">
    <p v-if="sessionGroups.length" class="teacher-tab-context">{{ t('teacher.practice_tab_context') }}</p>
    <div v-if="sessionGroups.length" class="teacher-context-stats" :aria-label="t('teacher.practice_summary')">
      <span><strong>{{ sessionCount }}</strong> {{ t('teacher.session_many') }}</span>
      <span><strong>{{ totalMinutes }}</strong> {{ t('teacher.minutes_short') }}</span>
      <span><strong>{{ sessionGroups.length }}</strong> {{ t('teacher.passages') }}</span>
    </div>
    <div v-if="sessionGroups.length" class="teacher-history-groups">
      <details v-for="(group, index) in sessionGroups" :key="group.key" class="teacher-history-group" :open="index === 0">
        <summary class="teacher-history-group__summary">
          <span class="teacher-history-group__title">{{ group.title }} <small v-if="arabicNames[group.surah]" lang="ar" dir="rtl">{{ arabicNames[group.surah] }}</small></span>
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
import { practiceMinutes } from '../../../scripts/teacher/formatters'
import { teacherArabicSurahNames } from '../../../scripts/teacher/quranContent'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecordList from '../TeacherRecordList.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentProfilePractice',
  components: { TeacherEmpty, TeacherRecordList, TeacherSectionPane },
  mixins: [i18nMixin],
  data() { return { arabicNames: {} } },
  mounted() { teacherArabicSurahNames().then((names) => { this.arabicNames = names }) },
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
      return practiceMinutes((this.profile.payload.sessions || []).reduce((total, session) => total + Number(session.duration_seconds || 0), 0))
    },
    sessionGroups() {
      const groups = new Map()
      for (const session of this.profile.payload.sessions || []) {
        const title = this.sessionLabel(session)
        if (!groups.has(title)) groups.set(title, { key: title, title, surah: session.surah_number, rows: [] })
        groups.get(title).rows.push({
          key: session.id,
          icon: 'bi bi-journal-text',
          iconTone: 'accent',
          title: this.formatWhen(session.last_activity_at) || this.t('teacher.practice_session'),
          reviewable: Boolean(session.evidence?.audio?.available || session.evidence?.transcript),
          hint: session.duration_seconds ? this.t('teacher.session_duration_minutes', { n: practiceMinutes(session.duration_seconds) }) : this.t('teacher.session_duration_unknown'),
          badge: session.status ? this.statusLabel(session.status) : '',
          badgeTone: session.status === 'completed' ? 'good' : 'muted',
          audio: session.evidence?.audio || null,
          transcript: session.evidence?.transcript || '',
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
