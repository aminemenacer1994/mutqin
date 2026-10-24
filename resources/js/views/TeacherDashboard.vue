<template>
  <div
    v-if="featuresEnabled"
    class="user-dashboard teacher-dashboard"
    data-teacher-ui="2026-10-23"
    tabindex="-1"
  >
    <div class="container user-dashboard__shell teacher-dashboard__shell">
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
        <div class="teacher-dashboard__layout">
          <TeacherNav
            variant="desktop"
            :items="TEACHER_NAV"
            :active-view="view"
            style="--dash-delay: 40ms"
            @select="openView"
          />

          <div class="teacher-dashboard__main dash-reveal" style="--dash-delay: 80ms">
            <p v-if="formError && view !== 'assignments'" class="alert alert-danger mb-0" role="alert">{{ formError }}</p>
            <p v-if="formSuccess && view !== 'assignments'" class="alert alert-success mb-0" role="status">{{ formSuccess }}</p>

            <Transition name="teacher-view" mode="out-in">
              <div :key="view" class="teacher-view-stage">
            <TeacherHero
              v-if="view === 'overview'"
              :first-name="firstName"
              :organisation-name="overview?.teacher?.organisation?.name || ''"
              :student-count="Number(overview?.kpis?.authorised_students || 0)"
              :support-count="Number(overview?.kpis?.needs_attention || 0)"
            />

            <TeacherOverviewSection
              v-if="view === 'overview' && overview"
              :overview="overview"
              :kpi-cards="kpiCards"
              :attention-preview="attentionPreview"
              :format-when="formatWhen"
              @open-student="openStudent"
              @select-kpi="openStudentsFromKpi"
              @assign-revision="openAssignRevision"
            />

            <TeacherStudentsSection
              v-else-if="view === 'students'"
              :filters="filters"
              :groups="teacherGroups"
              :students="students"
              :meta="studentMeta"
              :loading="studentsLoading"
              :loading-more="studentsLoadingMore"
              :format-when="formatWhen"
              @update:filters="updateFilters"
              @search="loadStudents(1)"
              @queue-search="queueStudentSearch"
              @page="loadStudents"
              @open-student="openStudent"
              @assign-revision="openAssignRevision"
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
              @assign-revision="openAssignRevision"
            />

            <TeacherAssignmentsSection
              v-else-if="view === 'assignments'"
              :form="assignment"
              :form-open="assignmentFormOpen"
              :editing="Boolean(editingAssignmentId)"
              :saving="assignmentSaving"
              :success="formSuccess"
              :error="formError"
              :rows="assignmentRows"
              :loading="assignmentsLoading"
              :students="students"
              :surahs="surahs"
              :on-send-message="sendTeacherMessage"
              @update:form="assignment = $event"
              @update:form-open="assignmentFormOpen = $event"
              @new="beginCreateAssignment"
              @edit="beginEditAssignment"
              @save="saveAssignment"
              @remove="removeAssignment"
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
            </Transition>
          </div>
        </div>

        <TeacherNav variant="mobile" :items="TEACHER_NAV" :active-view="view" @select="openView" />
      </template>
    </div>
  </div>
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
      dashboard.syncUrl()
    }
    function onProfileSection(tab) {
      if (!dashboard.profile.value?.student?.id) return
      dashboard.loadProfile(dashboard.profile.value.student.id, tab, true)
    }
    return {
      ...dashboard,
      updateFilters,
      onProfileSection,
    }
  },
}
</script>
