<template>
  <div
    v-if="featuresEnabled"
    class="user-dashboard teacher-dashboard"
    data-teacher-ui="2026-11-15-unified-workspace"
    data-platform-shell="teacher"
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
            :counts="deskCounts"
            :active-view="view"
            style="--dash-delay: 40ms"
            @select="openView"
          />

          <div class="teacher-dashboard__main dash-reveal" style="--dash-delay: 80ms">
            <p v-if="formError && view !== 'assignments' && !assignmentFormOpen" class="alert alert-danger mb-0" role="alert">{{ formError }}</p>
            <p v-if="formSuccess && view !== 'assignments'" class="alert alert-success mb-0" role="status">{{ formSuccess }}</p>

              <div :key="view" class="teacher-view-stage">
            <TeacherHero
              v-if="view === 'overview'"
              :first-name="firstName"
              :organisation-name="overview?.teacher?.organisation?.name || ''"
              :student-count="Number(overview?.kpis?.authorised_students || 0)"
              :support-count="Number(overview?.kpis?.needs_attention || 0)"
              @open-students="openView('students')"
              @open-attention="openStudentsFromKpi('attention')"
              @create-assignment="startAssignment"
            />

            <TeacherOverviewSection
              v-if="view === 'overview' && overview"
              :overview="overview"
              :kpi-cards="kpiCards"
              :attention-preview="attentionPreview"
              :format-when="formatWhen"
              :chart-days="chartDays"
              :chart-day-options="TEACHER_CHART_DAY_OPTIONS"
              :trend-loading="overviewRefreshing"
              :trend-error="overviewError"
              @open-student="openStudent"
              @select-kpi="openStudentsFromKpi"
              @assign-revision="openAssignRevision"
              @set-chart-days="setDays"
              @open-assignments="openAssignments"
              @open-plans="openView('plans')"
              @open-reviews="openView('reviews')"
              @create-assignment="startAssignment"
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
              @assign-selected="beginAssignStudents"
              @assign-revision="openAssignRevision"
            />

            <TeacherPlansView v-else-if="view === 'plans'" />

            <TeacherStudentProfileSection
              v-else-if="view === 'student'"
              :profile="profile"
              :section="profileSection"
              :learning-subview="profileLearningSubview"
              :task-focus="profileFocus"
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
              @clear-focus="profileFocus = null"
              @assign-revision="openAssignRevision"
              @mark-reviewed="markReviewReviewed"
              @refresh="refreshStudentProfile"
              @edit-task="beginEditStudentTask"
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
              :initial-status-filter="assignmentEntryFilter"
              :loading="assignmentsLoading"
              :students="assignmentRoster.length ? assignmentRoster : students"
              :surahs="surahs"
              :on-send-message="sendTeacherMessage"
              @update:form="assignment = $event"
              @update:form-open="assignmentFormOpen = $event"
              @new="beginCreateAssignment"
              @edit="beginEditAssignment"
              @save="saveAssignment"
              @remove="removeAssignment"
              @refresh="refreshAssignments"
              @open-student="openStudent"
            />

            <TeacherReviewsSection
              v-else-if="view === 'reviews'"
              :overview="overview"
              :format-when="formatWhen"
              @open-student="openStudent"
              @open-assignments="openAssignments"
            />

            <TeacherSettingsSection
              v-else
              :teacher="overview?.teacher"
              :teacher-name="overview?.teacher?.name || firstName"
              :student-initial="studentInitial"
              :practice-url="practiceUrl"
              :profile-url="profileUrl"
              :groups="teacherGroups"
              @export="exportStudentProgress"
              @refresh-classes="loadTeacherGroups"
            />
              </div>
          </div>
        </div>

        <TeacherNav variant="mobile" :items="TEACHER_NAV" :counts="deskCounts" :active-view="view" @select="openView" />

        <TeacherTaskSheet
          :open="assignmentFormOpen"
          :editing="Boolean(editingAssignmentId)"
          :form="assignment"
          :saving="assignmentSaving"
          :error="formError"
          :students="assignmentRoster.length ? assignmentRoster : students"
          :surahs="surahs"
          @close="assignmentFormOpen = false"
          @submit="saveAssignment"
          @update:form="assignment = $event"
        />
      </template>
    </div>
  </div>
</template>

<script>
import { computed, provide } from 'vue'
import NetworkFallback from '../components/NetworkFallback.vue'
import TeacherAssignmentsSection from '../components/teacher/TeacherAssignmentsSection.vue'
import TeacherPlansView from '../components/teacher/TeacherPlansView.vue'
import TeacherHero from '../components/teacher/TeacherHero.vue'
import TeacherNav from '../components/teacher/TeacherNav.vue'
import TeacherOverviewSection from '../components/teacher/TeacherOverviewSection.vue'
import TeacherReviewsSection from '../components/teacher/TeacherReviewsSection.vue'
import TeacherSettingsSection from '../components/teacher/TeacherSettingsSection.vue'
import TeacherStudentProfileSection from '../components/teacher/TeacherStudentProfileSection.vue'
import TeacherStudentsSection from '../components/teacher/TeacherStudentsSection.vue'
import TeacherTaskSheet from '../components/teacher/TeacherTaskSheet.vue'
import { useTeacherDashboard } from '../scripts/composables/useTeacherDashboard'
import { teacherDeskCounts } from '../scripts/teacher/formatters'

export default {
  name: 'TeacherDashboard',
  components: {
    NetworkFallback,
    TeacherAssignmentsSection,
    TeacherPlansView,
    TeacherHero,
    TeacherNav,
    TeacherOverviewSection,
    TeacherReviewsSection,
    TeacherSettingsSection,
    TeacherStudentProfileSection,
    TeacherStudentsSection,
    TeacherTaskSheet,
  },
  props: {
    auth: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const dashboard = useTeacherDashboard(props.auth)
    const deskCounts = computed(() => teacherDeskCounts(dashboard.overview.value))
    provide('teacherSurahs', dashboard.surahs)
    provide('openTeacherStudent', dashboard.openStudent)
    function updateFilters(next) {
      dashboard.filters.value = next
      dashboard.syncUrl()
    }
    function onProfileSection(tab) {
      if (!dashboard.profile.value?.student?.id) return
      dashboard.noteNavigation()
      dashboard.profileFocus.value = null
      dashboard.loadProfile(dashboard.profile.value.student.id, tab, true)
    }
    function openAssignments(filter = 'all') {
      dashboard.assignmentEntryFilter.value = typeof filter === 'string' && filter ? filter : 'all'
      dashboard.openView('assignments')
    }
    function refreshAssignments(studentId = null) {
      const ids = Number(studentId) > 0 ? [studentId] : []
      dashboard.loadAssignments()
      dashboard.publishTeacherWork(ids)
    }
    function startAssignment() {
      dashboard.beginCreateAssignment()
    }
    return {
      ...dashboard,
      deskCounts,
      updateFilters,
      onProfileSection,
      openAssignments,
      refreshAssignments,
      startAssignment,
    }
  },
}
</script>
