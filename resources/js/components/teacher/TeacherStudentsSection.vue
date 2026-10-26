<template>
  <section class="teacher-stack">
    <h2 class="visually-hidden">{{ t('teacher.nav_students') }}</h2>
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
        type="button"
        class="btn btn-outline-secondary btn-sm teacher-density-toggle"
        :class="{ 'is-active': compactView }"
        :aria-pressed="compactView ? 'true' : 'false'"
        :title="compactView ? t('teacher.comfortable_view_help') : t('teacher.compact_view_help')"
        @click="toggleCompactView"
      >
        <i :class="compactView ? 'bi bi-arrows-expand' : 'bi bi-arrows-collapse'" aria-hidden="true"></i>
        <span>{{ compactView ? t('teacher.comfortable_view') : t('teacher.compact_view') }}</span>
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
    <TeacherEmpty v-else-if="!students.length" icon="bi bi-people" :message="t(hasFilters ? 'teacher.students_filter_empty' : 'teacher.students_empty')" />
    <TeacherStudentTable
      v-else
      :students="students"
      :format-when="formatWhen"
      :compact="compactView"
      @open="$emit('open-student', $event)"
      @assign="$emit('assign-revision', $event)"
      @delete="openDelete"
    />
    <div v-if="deleteTarget" class="teacher-delete-confirm" role="dialog" aria-modal="true" :aria-labelledby="deleteTitleId" @keydown.esc="closeDelete">
        <div class="teacher-delete-confirm__box">
          <h3 :id="deleteTitleId">{{ t('teacher.delete_student') }}</h3>
          <p>{{ t('teacher.delete_student_warning') }}</p>
          <label :for="deleteInputId">{{ t('teacher.delete_student_confirm', { email: deleteTarget.email }) }}</label>
          <input :id="deleteInputId" ref="deleteField" v-model.trim="deleteConfirmation" class="form-control" autocomplete="off" />
          <p v-if="deleteError" class="text-danger" role="alert">{{ deleteError }}</p>
          <div class="teacher-delete-confirm__actions">
            <button type="button" class="btn btn-outline-secondary" @click="closeDelete">{{ t('common.cancel') }}</button>
            <button type="button" class="btn btn-danger" :disabled="deleting || !confirmationMatches" @click="deleteStudent">{{ t('teacher.delete_student_permanently') }}</button>
          </div>
        </div>
    </div>
    <nav v-if="pageCount > 1" class="teacher-pagination d-flex flex-wrap align-items-center justify-content-between gap-2" :aria-label="t('teacher.pagination_label')">
      <span class="teacher-pagination__summary">
        {{ t('teacher.pagination_summary', { page: currentPage, pages: pageCount, total: meta.total || 0 }) }}
      </span>
      <div class="btn-group teacher-pagination__controls">
        <button type="button" class="btn btn-outline-secondary teacher-pagination__button teacher-pagination__button--icon" :disabled="loading || currentPage === 1" :aria-label="t('teacher.previous')" @click="$emit('page', currentPage - 1)"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
        <button v-for="page in pages" :key="page" type="button" class="btn btn-outline-secondary teacher-pagination__button" :class="{ 'is-active': page === currentPage }" :aria-current="page === currentPage ? 'page' : undefined" :disabled="loading" @click="$emit('page', page)">{{ page }}</button>
        <button type="button" class="btn btn-outline-secondary teacher-pagination__button teacher-pagination__button--icon" :disabled="loading || currentPage === pageCount" :aria-label="t('teacher.next')" @click="$emit('page', currentPage + 1)"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
      </div>
    </nav>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherStudentTable from './TeacherStudentTable.vue'

export default {
  name: 'TeacherStudentsSection',
  components: { TeacherEmpty, TeacherStudentTable },
  mixins: [i18nMixin],
  props: {
    filters: { type: Object, required: true },
    groups: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
    meta: { type: Object, required: true },
    loading: { type: Boolean, default: false },
    loadingMore: { type: Boolean, default: false },
    formatWhen: { type: Function, required: true },
  },
  emits: ['update:filters', 'search', 'queue-search', 'page', 'open-student', 'assign-revision', 'deleted'],
  data() {
    const uid = Math.random().toString(36).slice(2, 9)
    return {
      compactView: false,
      deleteTarget: null,
      deleteConfirmation: '',
      deleting: false,
      deleteError: '',
      deleteTitleId: `teacher-delete-title-${uid}`,
      deleteInputId: `teacher-delete-input-${uid}`,
    }
  },
  mounted() {
    this.compactView = window.localStorage.getItem('mutqin.teacher.students.compact') === '1'
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
    pages() {
      const count = this.pageCount
      const start = Math.max(1, Math.min(this.currentPage - 2, count - 4))
      return Array.from({ length: Math.min(5, count) }, (_, index) => start + index)
    },
    confirmationMatches() {
      return Boolean(this.deleteTarget?.email)
        && this.deleteConfirmation.toLowerCase() === this.deleteTarget.email.toLowerCase()
    },
  },
  methods: {
    openDelete(student) {
      this.deleteTarget = student
      this.deleteConfirmation = ''
      this.deleteError = ''
      this.$nextTick(() => this.$refs.deleteField?.focus())
    },
    closeDelete() {
      if (this.deleting) return
      this.deleteTarget = null
      this.deleteConfirmation = ''
      this.deleteError = ''
    },
    async deleteStudent() {
      if (!this.confirmationMatches || this.deleting) return
      this.deleting = true
      this.deleteError = ''
      try {
        await learningApi.deleteTeacherStudent(this.deleteTarget.id, this.deleteConfirmation)
        this.deleteTarget = null
        this.deleteConfirmation = ''
        this.$emit('deleted')
      } catch (error) {
        this.deleteError = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.deleting = false
      }
    },
    toggleCompactView() {
      this.compactView = !this.compactView
      window.localStorage.setItem('mutqin.teacher.students.compact', this.compactView ? '1' : '0')
    },
    resetFilters() {
      this.$emit('update:filters', { ...this.filters, q: '', activity: '', performance: '', attention: '', sort: 'name' })
      this.$emit('search')
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
