<template>
  <section class="teacher-stack">
    <button type="button" class="teacher-back" @click="$emit('back')">
      <i class="bi bi-arrow-left" aria-hidden="true"></i>
      {{ t('teacher.back_students') }}
    </button>

    <div v-if="loading" class="teacher-skeletons"><div class="teacher-skeleton"></div></div>

    <template v-else-if="profile">
      <TeacherPageHeader
        :title="profile.student.name"
        display-title
        :subtitle="profileHeaderSubtitle"
      />

      <div class="dash-section dash-section--flat teacher-profile-body">
        <div class="dash-section__body">
          <TeacherStudentProfileOverview
            :profile="profile"
            :metric="metric"
            :practice-time="practiceTime"
            :session-label="sessionLabel"
            :format-when="formatWhen"
          />
        </div>
      </div>
    </template>

    <TeacherEmpty v-else :message="t('teacher.student_unavailable')" />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherPageHeader from './TeacherPageHeader.vue'
import TeacherStudentProfileOverview from './profile/TeacherStudentProfileOverview.vue'

export default {
  name: 'TeacherStudentProfileSection',
  components: {
    TeacherEmpty,
    TeacherPageHeader,
    TeacherStudentProfileOverview,
  },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, default: null },
    section: { type: String, required: true },
    tabs: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    metric: { type: Function, required: true },
    practiceTime: { type: String, required: true },
    comparisons: { type: Array, default: () => [] },
    studentInitial: { type: Function, required: true },
    sessionLabel: { type: Function, required: true },
    issueLabel: { type: Function, required: true },
    formatWhen: { type: Function, required: true },
  },
  emits: ['back', 'change-section'],
  computed: {
    profileHeaderSubtitle() {
      const org = this.profile?.student?.organisation
      const detail = this.profileSubtitle
      if (org && detail) return `${org} · ${detail}`
      return org || detail
    },
    profileSubtitle() {
      const metrics = this.profile?.payload?.metrics
      if (!metrics) return this.t('teacher.profile_subtitle_default')
      const saved = this.profile.payload?.latest_saved
      if (saved) {
        return this.t('teacher.profile_subtitle_position', { place: this.sessionLabel(saved) })
      }
      if (metrics.needs_attention) {
        return this.t('teacher.profile_subtitle_attention')
      }
      return this.t('teacher.profile_subtitle_default')
    },
  },
}
</script>
