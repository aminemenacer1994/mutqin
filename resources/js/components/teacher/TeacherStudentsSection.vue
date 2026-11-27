<template>
  <section class="teacher-stack" :class="mobileShell ? 'teacher-students--mobile' : 'teacher-students--desktop'">
    <header class="teacher-page-header teacher-page-header--actions">
      <div><p class="teacher-kicker">{{ t('teacher.workspace_label') }}</p><h1 class="teacher-page-header__title">{{ t('teacher.nav_students') }}</h1></div>
      <div class="teacher-page-header__aside d-flex flex-wrap align-items-center gap-2">
        <span class="teacher-page-count">{{ meta.total || students.length }} {{ t('teacher.kpi_students') }}</span>
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('import-students')">
          <i class="bi bi-upload" aria-hidden="true"></i>
          {{ t('teacher.import_title') }}
        </button>
      </div>
    </header>
    <div class="teacher-toolbar teacher-toolbar--filters teacher-toolbar--notion teacher-student-toolbar d-flex flex-wrap align-items-center gap-2">
      <label class="input-group teacher-search teacher-search--compact flex-grow-1">
        <span class="visually-hidden">{{ t('teacher.search') }}</span>
        <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
        <input
          class="form-control"
          :value="filters.q"
          type="search"
          :placeholder="t('teacher.search_placeholder')"
          autocomplete="off"
          @input="onQueryInput"
        >
      </label>
      <div class="teacher-student-toolbar__fields d-flex flex-wrap gap-2">
        <label class="teacher-field teacher-field--inline teacher-student-toolbar__field">
          <span class="visually-hidden">{{ t('teacher.follow_up_reason') }}</span>
          <select class="form-select form-select-sm" :value="filters.attention" @change="onFilterChange('attention', $event.target.value)">
            <option value="">{{ t('teacher.follow_up_reason') }} · {{ t('teacher.any') }}</option>
            <option value="1">{{ t('teacher.need_look') }}</option>
          </select>
        </label>
        <label class="teacher-field teacher-field--inline teacher-student-toolbar__field">
          <span class="visually-hidden">{{ t('teacher.activity_filter') }}</span>
          <select class="form-select form-select-sm" :value="filters.activity" @change="onFilterChange('activity', $event.target.value)">
            <option value="">{{ t('teacher.activity_filter') }} · {{ t('teacher.any') }}</option>
            <option value="active_7">{{ t('teacher.activity_filter') }} · {{ t('teacher.active_7') }}</option>
            <option value="active_30">{{ t('teacher.activity_filter') }} · {{ t('teacher.active_30') }}</option>
            <option value="inactive_7">{{ t('teacher.activity_filter') }} · {{ t('teacher.inactive_7') }}</option>
          </select>
        </label>
        <label class="teacher-field teacher-field--inline teacher-student-toolbar__field">
          <span class="visually-hidden">{{ t('teacher.sort_by') }}</span>
          <select class="form-select form-select-sm" :value="filters.sort || 'name'" @change="onFilterChange('sort', $event.target.value)">
            <option value="name">{{ t('teacher.sort_name') }}</option>
            <option value="last_seen">{{ t('teacher.sort_recent') }}</option>
            <option value="score">{{ t('teacher.sort_score') }}</option>
            <option value="attention">{{ t('teacher.sort_attention') }}</option>
          </select>
        </label>
      </div>
      <button
        v-if="desktopShell"
        type="button"
        class="btn btn-outline-secondary btn-sm teacher-density-toggle"
        :class="{ 'is-active': compactView }"
        :aria-pressed="compactView ? 'true' : 'false'"
        :aria-label="compactView ? t('teacher.switch_comfortable_view') : t('teacher.switch_compact_view')"
        :title="compactView ? t('teacher.comfortable_view_help') : t('teacher.compact_view_help')"
        @click="toggleCompactView"
      >
        <i :class="compactView ? 'bi bi-arrows-angle-expand' : 'bi bi-list'" aria-hidden="true"></i>
        <span class="visually-hidden">{{ compactView ? t('teacher.switch_comfortable_view') : t('teacher.switch_compact_view') }}</span>
      </button>
      <button
        v-if="hasFilters"
        type="button"
        class="btn btn-link teacher-directory-actions__clear"
        @click="resetFilters"
      >
        <i class="bi bi-x-circle" aria-hidden="true"></i>
        <span>{{ t('teacher.clear_filters') }}</span>
      </button>
    </div>

    <p v-if="loading" class="teacher-loading-inline" role="status">
      <span class="dash-spinner" aria-hidden="true"></span>
      {{ t('teacher.loading') }}
    </p>
    <div v-else-if="!students.length" class="teacher-students-empty">
      <TeacherEmpty icon="bi bi-people" :message="t(hasFilters ? 'teacher.students_filter_empty' : 'teacher.students_empty')" />
      <button
        v-if="!hasFilters"
        type="button"
        class="btn btn-primary btn-sm"
        @click="$emit('import-students')"
      >
        {{ t('teacher.import_empty_action') }}
      </button>
    </div>
    <template v-else>
    <div v-if="selectedIds.length" class="teacher-priorities">
      <p>{{ t('teacher.task_bulk_selected', { n: selectedIds.length }) }}</p>
      <div class="teacher-priorities__actions">
        <button type="button" class="btn btn-primary btn-sm" @click="$emit('assign-selected', selectedIds)">{{ t('teacher.task_bulk_assign') }}</button>
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="selectedIds = []">{{ t('teacher.clear') }}</button>
      </div>
    </div>
    <TeacherStudentTable
      :students="students"
      :format-when="formatWhen"
      :compact="compactView"
      :selected="selectedIds"
      @open="$emit('open-student', $event)"
      @toggle="toggleStudent"
    />
    </template>
    <TeacherPagination
      :current-page="currentPage"
      :page-count="pageCount"
      :total="meta.total || 0"
      :loading="loading"
      summary-mode="students"
      :aria-label="t('teacher.pagination_label')"
      @page="$emit('page', $event)"
    />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { teacherViewportMixin } from '../../mixins/teacherViewportMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherPagination from './TeacherPagination.vue'
import TeacherStudentTable from './TeacherStudentTable.vue'

export default {
  name: 'TeacherStudentsSection',
  components: { TeacherEmpty, TeacherPagination, TeacherStudentTable },
  mixins: [i18nMixin, teacherViewportMixin],
  props: {
    filters: { type: Object, required: true },
    groups: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
    meta: { type: Object, required: true },
    loading: { type: Boolean, default: false },
    loadingMore: { type: Boolean, default: false },
    formatWhen: { type: Function, required: true },
  },
  emits: ['update:filters', 'search', 'queue-search', 'page', 'open-student', 'assign-revision', 'assign-selected', 'import-students'],
  data() {
    return { compactView: true, selectedIds: [] }
  },
  watch: {
    mobileShell: {
      immediate: true,
      handler(mobile) {
        if (mobile) {
          this.compactView = true
          return
        }
        try {
          const saved = window.localStorage.getItem('mutqin.teacher.students.compact')
          this.compactView = saved === null ? false : saved === '1'
        } catch {
          this.compactView = false
        }
      },
    },
  },
  computed: {
    hasFilters() {
      return Boolean(this.filters.q || this.filters.activity || this.filters.attention || this.filters.performance || (this.filters.sort && this.filters.sort !== 'name'))
    },
    currentPage() {
      return Number(this.meta.current_page || 1)
    },
    pageCount() {
      return Math.max(1, Number(this.meta.last_page || 1))
    },
  },
  methods: {
    toggleCompactView() {
      this.compactView = !this.compactView
      try { window.localStorage.setItem('mutqin.teacher.students.compact', this.compactView ? '1' : '0') } catch { /* Storage is optional. */ }
    },
    resetFilters() {
      this.$emit('update:filters', { ...this.filters, q: '', activity: '', performance: '', attention: '', sort: 'name' })
      this.$emit('search')
    },
    toggleStudent(id) {
      const key = String(id)
      this.selectedIds = this.selectedIds.includes(key)
        ? this.selectedIds.filter((item) => item !== key)
        : [...this.selectedIds, key]
    },
    onQueryInput(event) {
      this.$emit('update:filters', { ...this.filters, q: event.target.value })
      this.$emit('queue-search')
    },
    onFilterChange(key, value) {
      this.$emit('update:filters', { ...this.filters, [key]: value })
      this.$emit('search')
    },
  },
}
</script>
