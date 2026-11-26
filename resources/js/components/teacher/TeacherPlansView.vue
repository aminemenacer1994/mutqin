<template>
  <section class="teacher-stack teacher-plan-hub" data-feature="learning-plans">
    <header class="teacher-page-header teacher-page-header--actions">
      <div>
        <p class="teacher-kicker">{{ t('teacher.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('teacher.nav_plans') }}</h1>
      </div>
      <div class="teacher-page-header__aside d-flex flex-wrap align-items-center gap-2">
        <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="$emit('import-students')">
          <i class="bi bi-upload" aria-hidden="true"></i>
          {{ t('teacher.import_title') }}
        </button>
        <button type="button" class="btn btn-primary btn-sm" :disabled="loading || !students.length" @click="startPlan">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          {{ t('teacher.plan_create') }}
        </button>
      </div>
    </header>

    <div class="teacher-toolbar teacher-toolbar--filters teacher-toolbar--notion teacher-plan-toolbar d-flex flex-wrap align-items-center gap-2">
      <label class="input-group teacher-search teacher-search--compact flex-grow-1">
        <span class="visually-hidden">{{ t('teacher.plan_search') }}</span>
        <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
        <input
          v-model="query"
          class="form-control"
          type="search"
          :placeholder="t('teacher.plan_search_placeholder')"
          autocomplete="off"
        >
      </label>
      <div class="teacher-student-toolbar__fields d-flex flex-wrap gap-2">
        <label class="teacher-field teacher-field--inline teacher-student-toolbar__field">
          <span class="visually-hidden">{{ t('teacher.student') }}</span>
          <select ref="picker" v-model="studentId" class="form-select form-select-sm">
            <option value="">{{ t('teacher.all_students') }}</option>
            <option v-for="student in students" :key="student.id" :value="String(student.id)">{{ student.name }}</option>
          </select>
        </label>
        <label class="teacher-field teacher-field--inline teacher-student-toolbar__field">
          <span class="visually-hidden">{{ t('teacher.plan_sort') }}</span>
          <select v-model="sort" class="form-select form-select-sm">
            <option value="recent">{{ t('teacher.plan_sort_recent') }}</option>
            <option value="due">{{ t('teacher.plan_sort_due') }}</option>
            <option value="progress">{{ t('teacher.plan_sort_progress') }}</option>
          </select>
        </label>
      </div>
      <div class="teacher-task-filter-shell">
        <div class="btn-group btn-group-sm teacher-task-filters flex-wrap" role="group" :aria-label="t('teacher.col_status')">
          <button
            v-for="filter in statusFilters"
            :key="filter.id"
            type="button"
            class="btn btn-outline-secondary btn-sm"
            :class="{ 'is-active': status === filter.id }"
            :aria-pressed="status === filter.id ? 'true' : 'false'"
            @click="status = filter.id"
          >
            {{ filter.label }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" class="alert alert-danger" role="alert">{{ error }} <button type="button" class="btn btn-link btn-sm" @click="load">{{ t('teacher.retry') }}</button></p>
    <p v-if="loading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>

    <TeacherStudentProfilePlan
      v-else
      ref="workspace"
      embedded
      :student-id="studentId"
      :student-name="studentName(studentId)"
      :students="students"
      :status-filter="status"
      :query="query"
      :sort="sort"
      :focus-plan-id="focusPlanId"
      @leave="clearStudent"
      @created="onCreated"
      @open-task="openLinkedTask"
    />
  </section>
</template>
<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import TeacherStudentProfilePlan from './profile/TeacherStudentProfilePlan.vue'
export default {
  name: 'TeacherPlansView',
  components: { TeacherStudentProfilePlan },
  mixins: [i18nMixin],
  inject: {
    openTeacherStudent: { default: null },
  },
  emits: ['import-students'],
  data() {
    return {
      loading: true,
      students: [],
      studentId: '',
      status: 'all',
      query: '',
      sort: 'recent',
      focusPlanId: null,
      error: '',
    }
  },
  computed: {
    statusFilters() {
      return [
        { id: 'all', label: this.t('teacher.plan_filter_all') },
        { id: 'active', label: this.t('teacher.plan_status_active') },
        { id: 'draft', label: this.t('teacher.plan_filter_drafts') },
        { id: 'paused', label: this.t('teacher.plan_status_paused') },
        { id: 'completed', label: this.t('teacher.plan_status_completed') },
      ]
    },
  },
  mounted() { this.load() },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        const data = await learningApi.getTeacherStudents({ per_page: 50 })
        this.students = data?.data || []
        const last = Number(data?.meta?.last_page || data?.last_page || 1)
        for (let page = 2; page <= last; page += 1) {
          const next = await learningApi.getTeacherStudents({ per_page: 50, page })
          this.students.push(...(next?.data || []))
        }
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_load_error')
      } finally {
        this.loading = false
      }
    },
    startPlan() {
      this.$refs.workspace?.openComposer()
    },
    clearStudent() {
      this.studentId = ''
      this.focusPlanId = null
    },
    onCreated(plan) {
      const id = plan?.student?.id || plan?.student_id
      if (id) this.studentId = String(id)
      if (plan?.id) this.focusPlanId = plan.id
    },
    studentName(id) { return this.students.find((student) => String(student.id) === String(id))?.name || '' },
    openLinkedTask(payload) {
      const studentId = payload?.studentId
      if (!studentId || typeof this.openTeacherStudent !== 'function') return
      this.openTeacherStudent(studentId, 'tasks', { taskId: payload.assignmentId || null })
    },
  },
}
</script>