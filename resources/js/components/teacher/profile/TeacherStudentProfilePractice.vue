<template>
  <TeacherSectionPane tone="practice">
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
    <div v-else class="teacher-profile-empty teacher-profile-empty--row">
      <TeacherEmpty icon="bi bi-play-circle" :message="t('teacher.practice_empty')" />
      <button type="button" class="btn btn-primary btn-sm" @click="$emit('assign-revision', profile.student)"><i class="bi bi-journal-plus" aria-hidden="true"></i>{{ t('teacher.assign_first_practice') }}</button>
    </div>
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { practiceMinutes, teacherRecitationEvidenceRow } from '../../../scripts/teacher/formatters'
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
  emits: ['assign-revision'],
  computed: {
    sessionGroups() {
      const groups = new Map()
      for (const session of this.profile.payload.sessions || []) {
        const title = this.sessionLabel(session)
        if (!groups.has(title)) groups.set(title, { key: title, title, surah: session.surah_number, rows: [] })
        groups.get(title).rows.push(teacherRecitationEvidenceRow({
          key: session.id,
          icon: 'bi bi-journal-text',
          iconTone: 'accent',
          title: this.sessionTitle(session),
          reviewable: true,
          hint: this.sessionContext(session),
          badge: session.status ? this.statusLabel(session.status) : '',
          badgeTone: session.status === 'completed' ? 'good' : 'muted',
        }, session.evidence, {
          surah: session.surah_number,
          from: session.ayah_start || session.ayah_number,
          to: session.ayah_end || session.ayah_number,
        }))
      }
      return [...groups.values()]
    },
  },
  methods: {
    sessionTitle(session) {
      const when = this.formatWhen(session.last_activity_at) || this.t('teacher.practice_session')
      const range = session.ayah_start && session.ayah_end
        ? this.t('teacher.ayahs_range', { from: session.ayah_start, to: session.ayah_end })
        : (session.ayah_number ? this.t('teacher.ayah_n', { n: session.ayah_number }) : '')
      return range ? `${when} · ${range}` : when
    },
    sessionContext(session) {
      const when = this.formatWhen(session.last_activity_at) || ''
      const duration = session.duration_seconds
        ? this.t('teacher.session_duration_minutes', { n: practiceMinutes(session.duration_seconds) })
        : ''
      return [when, duration].filter(Boolean).join(' · ')
    },
    statusLabel(status) {
      if (status === 'completed') return this.t('teacher.status_completed')
      return this.t('teacher.practice_saved_status')
    },
  },
}
</script>
