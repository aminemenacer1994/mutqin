<template>
  <nav
    v-if="visible"
    class="teacher-pagination d-flex flex-wrap align-items-center justify-content-between gap-2"
    :class="rootClass"
    :aria-label="ariaLabel || t('teacher.pagination_label')"
  >
    <span v-if="showSummary" class="teacher-pagination__summary">{{ summaryText }}</span>
    <div class="btn-group teacher-pagination__controls">
      <button
        type="button"
        class="btn btn-outline-secondary teacher-pagination__button teacher-pagination__button--icon"
        :disabled="disablePrev"
        :aria-label="t('teacher.previous')"
        @click="$emit('page', currentPage - 1)"
      ><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
      <button
        v-for="page in pageButtons"
        :key="page"
        type="button"
        class="btn btn-outline-secondary teacher-pagination__button"
        :class="{ 'is-active': page === currentPage }"
        :aria-current="page === currentPage ? 'page' : undefined"
        :disabled="loading"
        @click="$emit('page', page)"
      >{{ page }}</button>
      <button
        type="button"
        class="btn btn-outline-secondary teacher-pagination__button teacher-pagination__button--icon"
        :disabled="disableNext"
        :aria-label="t('teacher.next')"
        @click="$emit('page', currentPage + 1)"
      ><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
    </div>
  </nav>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { tablePageWindow } from '../../scripts/teacher/tablePagination.js'

export default {
  name: 'TeacherPagination',
  mixins: [i18nMixin],
  props: {
    currentPage: { type: Number, default: 1 },
    pageCount: { type: Number, default: 1 },
    total: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    hasNext: { type: Boolean, default: null },
    showNumbers: { type: Boolean, default: true },
    showSummary: { type: Boolean, default: true },
    summaryMode: { type: String, default: 'students' },
    ariaLabel: { type: String, default: '' },
    rootClass: { type: [String, Object, Array], default: '' },
    minVisiblePageCount: { type: Number, default: 2 },
  },
  emits: ['page'],
  computed: {
    visible() {
      if (this.pageCount >= this.minVisiblePageCount) return true
      if (this.currentPage > 1) return true
      if (this.hasNext === true) return true
      return false
    },
    pageButtons() {
      if (!this.showNumbers) return []
      return tablePageWindow(this.currentPage, this.pageCount)
    },
    disablePrev() {
      return this.disabled || this.loading || this.currentPage <= 1
    },
    disableNext() {
      if (this.disabled || this.loading) return true
      if (this.hasNext !== null) return !this.hasNext
      return this.currentPage >= this.pageCount
    },
    summaryText() {
      if (this.summaryMode === 'page') {
        return `${this.t('teacher.pagination_page')} ${this.currentPage}`
      }
      if (this.summaryMode === 'rows') {
        return this.t('teacher.pagination_summary_rows', {
          page: this.currentPage,
          pages: this.pageCount,
          total: this.total || 0,
        })
      }
      return this.t('teacher.pagination_summary', {
        page: this.currentPage,
        pages: this.pageCount,
        total: this.total || 0,
      })
    },
  },
}
</script>