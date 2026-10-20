<template>
  <section class="teacher-stack">
    <button type="button" class="teacher-back" @click="$emit('back')">
      <i class="bi bi-arrow-left" aria-hidden="true"></i>
      {{ t('teacher.back_students') }}
    </button>

    <div v-if="loading" class="teacher-skeletons"><div class="teacher-skeleton"></div></div>

    <template v-else-if="profile">
      <TeacherPanel compact>
        <div class="teacher-profile-hero">
          <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ studentInitial(profile.student.name) }}</span>
          <div class="teacher-profile-hero__copy">
            <h2>{{ profile.student.name }}</h2>
            <p v-if="profile.student.organisation" class="teacher-meta">
              <i class="bi bi-building" aria-hidden="true"></i>
              {{ profile.student.organisation }}
            </p>
          </div>
        </div>
      </TeacherPanel>

      <div class="dash-section dash-section--flat">
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
import TeacherPanel from './TeacherPanel.vue'
import TeacherStudentProfileOverview from './profile/TeacherStudentProfileOverview.vue'

export default {
  name: 'TeacherStudentProfileSection',
  components: {
    TeacherEmpty,
    TeacherPanel,
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
}
</script>
