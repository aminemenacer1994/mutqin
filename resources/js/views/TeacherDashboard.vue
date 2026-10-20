<template>
  <main v-if="featuresEnabled" id="mainContent" class="user-dashboard teacher-dashboard" tabindex="-1">
    <div class="container user-dashboard__shell">
      <div v-if="loading && !overview" class="teacher-skeletons" role="status" aria-live="polite">
        <div v-for="n in 4" :key="n" class="teacher-skeleton"></div>
        <span class="visually-hidden">{{ t('teacher.loading') }}</span>
      </div>

      <NetworkFallback
        v-else-if="error && !overview"
        class="user-dashboard__error"
        page
        :kind="failureKind"
        :auto-retry-on-reconnect="false"
        home-href="/"
        @retry="loadOverview"
      />

      <template v-else>
        <TeacherHero
          v-if="view === 'overview'"
          :first-name="firstName"
          :organisation-name="overview?.teacher?.organisation?.name || ''"
          :practice-url="practiceUrl"
        />

        <div class="teacher-dashboard__layout">
          <TeacherNav
            variant="desktop"
            :items="TEACHER_NAV"
            :active-view="view"
            style="--dash-delay: 40ms"
            @select="openView"
          />

          <div class="teacher-dashboard__main dash-reveal" style="--dash-delay: 80ms">
            <p v-if="formError" class="teacher-alert" role="alert">{{ formError }}</p>

            <TeacherOverviewSection
              v-if="view === 'overview' && overview"
              :overview="overview"
              :kpi-cards="kpiCards"
              :format-when="formatWhen"
              @open-student="openStudent"
              @select-kpi="openStudentsFromKpi"
            />

            <TeacherStudentsSection
              v-else-if="view === 'students'"
              :filters="filters"
              :organisation-name="overview?.teacher?.organisation?.name || ''"
              :students="students"
              :meta="studentMeta"
              :loading="studentsLoading"
              :loading-more="studentsLoadingMore"
              :format-when="formatWhen"
              @update:filters="updateFilters"
              @search="loadStudents(1)"
              @queue-search="queueStudentSearch"
              @more="loadMoreStudents"
              @open-student="openStudent"
            />

            <TeacherStudentProfileSection
              v-else-if="view === 'student'"
              :profile="profile"
              :section="profileSection"
              :tabs="TEACHER_PROFILE_TABS"
              :loading="profileLoading"
              :metric="metric"
              :practice-time="practiceTime"
              :comparisons="comparisons"
              :student-initial="studentInitial"
              :session-label="sessionLabel"
              :issue-label="issueLabel"
              :format-when="formatWhen"
              @back="openView('students')"
              @change-section="onProfileSection"
            />

            <TeacherAssignmentsSection
              v-else-if="view === 'assignments'"
              :form="assignment"
              :saving="assignmentSaving"
              :rows="assignmentRows"
              :students="students"
              :surahs="surahs"
              @update:form="assignment = $event"
              @create="createAssignment"
              @open-student="openStudent"
            />

            <TeacherSettingsSection
              v-else
              :teacher="overview?.teacher"
              :teacher-name="overview?.teacher?.name || firstName"
              :student-initial="studentInitial"
              :practice-url="practiceUrl"
              :profile-url="profileUrl"
            />
          </div>
        </div>

        <TeacherNav variant="mobile" :items="TEACHER_NAV" :active-view="view" @select="openView" />
      </template>
    </div>
  </main>
</template>

<script>
import NetworkFallback from '../components/NetworkFallback.vue'
import TeacherAssignmentsSection from '../components/teacher/TeacherAssignmentsSection.vue'
import TeacherHero from '../components/teacher/TeacherHero.vue'
import TeacherNav from '../components/teacher/TeacherNav.vue'
import TeacherOverviewSection from '../components/teacher/TeacherOverviewSection.vue'
import TeacherSettingsSection from '../components/teacher/TeacherSettingsSection.vue'
import TeacherStudentProfileSection from '../components/teacher/TeacherStudentProfileSection.vue'
import TeacherStudentsSection from '../components/teacher/TeacherStudentsSection.vue'
import { useTeacherDashboard } from '../scripts/composables/useTeacherDashboard'
import './Dashboard.css'
import './TeacherDashboard.css'

export default {
  name: 'TeacherDashboard',
  components: {
    NetworkFallback,
    TeacherAssignmentsSection,
    TeacherHero,
    TeacherNav,
    TeacherOverviewSection,
    TeacherSettingsSection,
    TeacherStudentProfileSection,
    TeacherStudentsSection,
  },
  props: {
    auth: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const dashboard = useTeacherDashboard(props.auth)
    function updateFilters(next) {
      dashboard.filters.value = next
    }
    function onProfileSection(tab) {
      if (!dashboard.profile.value?.student?.id) return
      dashboard.loadProfile(dashboard.profile.value.student.id, tab)
    }
    return {
      ...dashboard,
      updateFilters,
      onProfileSection,
    }
  },
}
</script>
