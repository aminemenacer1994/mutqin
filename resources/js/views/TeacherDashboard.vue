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
              :chart-days="chartDays"
              :day-options="TEACHER_CHART_DAY_OPTIONS"
              :chart-ready="chartReady"
              :chart-data="chartData"
              :chart-options="chartOptions"
              :format-when="formatWhen"
              @set-days="setDays"
              @open-student="openStudent"
            />

            <TeacherStudentsSection
              v-else-if="view === 'students'"
              :filters="filters"
              :teaching-groups="teachingGroups"
              :students="students"
              :meta="studentMeta"
              :loading="studentsLoading"
              :group-label="groupLabel"
              :weak-label="weakLabel"
              :revision-label="revisionLabel"
              :assignment-label="assignmentLabel"
              :format-when="formatWhen"
              @update:filters="updateFilters"
              @search="loadStudents(1)"
              @queue-search="queueStudentSearch"
              @page="loadStudents"
              @open-student="openStudent"
            />

            <TeacherStudentProfileSection
              v-else-if="view === 'student'"
              :profile="profile"
              :section="profileSection"
              :tabs="TEACHER_PROFILE_TABS"
              :loading="profileLoading"
              :note="note"
              :note-saving="noteSaving"
              :metric="metric"
              :practice-time="practiceTime"
              :comparisons="comparisons"
              :student-initial="studentInitial"
              :session-label="sessionLabel"
              :issue-label="issueLabel"
              :format-when="formatWhen"
              @back="openView('students')"
              @change-section="onProfileSection"
              @update:note="note = $event"
              @save-note="saveNote"
            />

            <TeacherAssignmentsSection
              v-else-if="view === 'assignments'"
              :form="assignment"
              :saving="assignmentSaving"
              :rows="assignmentRows"
              :students="students"
              :teaching-groups="teachingGroups"
              :surahs="surahs"
              @update:form="assignment = $event"
              @create="createAssignment"
              @open-student="openStudent"
            />

            <TeacherGroupsSection
              v-else-if="view === 'groups'"
              :groups="groups"
              :group-name="groupName"
              :saving="groupSaving"
              :open-group-id="openGroupId"
              :group-detail="groupDetail"
              @update:group-name="groupName = $event"
              @create="createGroup"
              @join="joinGroup"
              @toggle="toggleGroup"
              @review="reviewMembership"
              @open-student="openStudent"
            />

            <TeacherSettingsSection
              v-else
              :teacher="overview?.teacher"
              :teacher-name="overview?.teacher?.name || firstName"
              :roster="overview?.roster"
              :student-initial="studentInitial"
              :practice-url="practiceUrl"
              :profile-url="profileUrl"
              @open-student="openStudent"
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
import TeacherGroupsSection from '../components/teacher/TeacherGroupsSection.vue'
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
    TeacherGroupsSection,
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
