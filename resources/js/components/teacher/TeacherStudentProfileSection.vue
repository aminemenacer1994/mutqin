<template>
  <section class="teacher-stack teacher-profile">
    <button type="button" class="teacher-back" @click="$emit('back')">
      <i class="bi bi-arrow-left" aria-hidden="true"></i>
      {{ t('teacher.back_students') }}
    </button>

    <div v-if="loading" class="teacher-skeletons"><div class="teacher-skeleton"></div></div>

    <template v-else-if="profile">
      <header class="teacher-profile-hero teacher-profile-hero--compact">
        <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ studentInitial(profile.student.name) }}</span>
        <div class="teacher-profile-hero__copy">
          <h2>{{ profile.student.name }}</h2>
          <p class="teacher-meta">
            <i class="bi bi-building" aria-hidden="true"></i>
            {{ profile.student.organisation || t('teacher.no_group') }}
          </p>
        </div>
      </header>

      <div class="teacher-tabs teacher-tabs--scroll" role="tablist" :aria-label="t('teacher.nav_students')">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="teacher-tabs__tab"
          :class="{ 'is-active': section === tab.id }"
          :aria-selected="section === tab.id ? 'true' : 'false'"
          @click="$emit('change-section', tab.id)"
        >
          <i :class="tab.icon" aria-hidden="true"></i>
          <span>{{ t(tab.label) }}</span>
        </button>
      </div>

      <div class="teacher-tab-panel teacher-profile-stack">
        <TeacherStudentProfileOverview
          v-if="section === 'overview'"
          :profile="profile"
          :metric="metric"
          :practice-time="practiceTime"
          :session-label="sessionLabel"
          :format-when="formatWhen"
        />
        <TeacherStudentProfilePractice
          v-else-if="section === 'practice'"
          :profile="profile"
          :session-label="sessionLabel"
          :format-when="formatWhen"
        />
        <TeacherStudentProfileAi
          v-else-if="section === 'ai'"
          :profile="profile"
          :issue-label="issueLabel"
        />
        <TeacherStudentProfileWeak
          v-else-if="section === 'weak'"
          :profile="profile"
          :format-when="formatWhen"
          @assign-revision="$emit('assign-revision', $event)"
        />
        <TeacherStudentProfileRevision
          v-else-if="section === 'revision'"
          :profile="profile"
          :comparisons="comparisons"
          :format-when="formatWhen"
        />
        <TeacherStudentProfileTasks
          v-else-if="section === 'tasks'"
          :profile="profile"
          :format-when="formatWhen"
        />
      </div>
    </template>

    <TeacherEmpty v-else :message="t('teacher.student_unavailable')" />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherStudentProfileAi from './profile/TeacherStudentProfileAi.vue'
import TeacherStudentProfileOverview from './profile/TeacherStudentProfileOverview.vue'
import TeacherStudentProfilePractice from './profile/TeacherStudentProfilePractice.vue'
import TeacherStudentProfileRevision from './profile/TeacherStudentProfileRevision.vue'
import TeacherStudentProfileTasks from './profile/TeacherStudentProfileTasks.vue'
import TeacherStudentProfileWeak from './profile/TeacherStudentProfileWeak.vue'

export default {
  name: 'TeacherStudentProfileSection',
  components: {
    TeacherEmpty,
    TeacherStudentProfileAi,
    TeacherStudentProfileOverview,
    TeacherStudentProfilePractice,
    TeacherStudentProfileRevision,
    TeacherStudentProfileTasks,
    TeacherStudentProfileWeak,
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
  emits: ['back', 'change-section', 'assign-revision'],
}
</script>
