<template>
  <Teleport to="body">
    <div v-if="open" ref="dialogRoot" class="teacher-report-overlay" role="dialog" aria-modal="true" :aria-label="t('teacher.report_title')" tabindex="-1" @click.self="$emit('close')" @keydown="onKeydown">
      <div class="teacher-report">
        <header class="teacher-report__toolbar">
          <h2>{{ t('teacher.report_title') }}</h2>
          <div><button type="button" class="btn btn-primary" :disabled="loading || !!error" @click="printReport"><i class="bi bi-printer" aria-hidden="true"></i> {{ t('teacher.report_print_pdf') }}</button><button ref="closeButton" type="button" class="btn btn-outline-secondary" @click="$emit('close')">{{ t('common.close') }}</button></div>
        </header>
        <div v-if="loading" class="teacher-report__loading" role="status">{{ t('teacher.loading') }}</div>
        <p v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
        <main v-else class="teacher-report__paper">
          <header class="teacher-report__identity">
            <div>
              <h1>{{ profile.student.name }}</h1>
              <p class="teacher-report__meta">{{ [profile.student.organisation, profile.student.groups?.map((group) => group.name).join(', ')].filter(Boolean).join(' · ') }}</p>
            </div>
            <span class="teacher-report__period">{{ periodLabel }}</span>
          </header>

          <section class="teacher-report__summary" :aria-labelledby="reportSummaryId">
            <h2 :id="reportSummaryId">{{ t('teacher.report_progress_summary') }}</h2>
            <div class="teacher-report__summary-grid">
              <div v-for="item in summaryItems" :key="item.key" :class="`is-${item.tone || 'neutral'}`">
                <i :class="item.icon" aria-hidden="true"></i>
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { captureReturnFocus, handleModalKeydown, restoreReturnFocus } from '../../utils/modalFocus'

export default {
  name: 'TeacherStudentReport',
  mixins: [i18nMixin],
  props: { open: { type: Boolean, default: false }, mode: { type: String, default: 'parent' }, profile: { type: Object, required: true } },
  emits: ['close'],
  data() {
    return { loading: false, error: '', summary: {}, requestId: 0, returnFocusEl: null, reportSummaryId: `teacher-report-summary-${Math.random().toString(36).slice(2, 9)}` }
  },
  computed: {
    today() { return new Date().toLocaleDateString() },
    semesterStart() {
      const today = new Date()
      const month = today.getMonth()
      return new Date(today.getFullYear() - (month < 2 ? 1 : 0), month >= 8 || month < 2 ? 8 : 2, 1)
    },
    requestKey() { return `${this.open}:${this.mode}:${this.profile.student.id}` },
    periodLabel() {
      return this.mode === 'semester'
        ? `${this.shortDate(this.semesterStart)} – ${this.today}`
        : this.t('teacher.report_all_activity')
    },
    summaryItems() {
      return [
        { key: 'sessions', icon: 'bi bi-play-circle', label: this.t('teacher.sessions'), value: Number(this.summary.sessions_recorded || 0) },
        { key: 'average', icon: 'bi bi-graph-up', label: this.t('teacher.report_average_score'), value: this.summary.ai_word_match_average == null ? '—' : `${this.summary.ai_word_match_average}%` },
        { key: 'tasks', icon: 'bi bi-journal-check', label: this.t('teacher.report_tasks'), value: Number(this.summary.tasks_assigned || 0) },
        { key: 'present', tone: 'good', icon: 'bi bi-check-lg', label: this.t('teacher.attendance_present'), value: Number(this.summary.attendance?.present || 0) },
        { key: 'absent', tone: 'danger', icon: 'bi bi-x-lg', label: this.t('teacher.attendance_absent'), value: Number(this.summary.attendance?.absent || 0) },
        { key: 'late', tone: 'warning', icon: 'bi bi-clock', label: this.t('teacher.attendance_late'), value: Number(this.summary.attendance?.late || 0) },
        { key: 'excused', icon: 'bi bi-shield-check', label: this.t('teacher.attendance_excused'), value: Number(this.summary.attendance?.excused || 0) },
      ]
    },
  },
  watch: {
    requestKey() { if (this.open) this.load() },
    open(value) {
      document.body.classList.toggle('modal-open', value)
      if (value) {
        this.returnFocusEl = captureReturnFocus()
        this.$nextTick(() => this.$refs.closeButton?.focus())
      } else if (this.returnFocusEl) {
        const target = this.returnFocusEl
        this.returnFocusEl = null
        this.$nextTick(() => restoreReturnFocus(target))
      }
    },
  },
  beforeUnmount() {
    document.body.classList.remove('modal-open')
    restoreReturnFocus(this.returnFocusEl)
  },
  methods: {
    shortDate(value) { return value ? new Date(value).toLocaleDateString() : '—' },
    async load() {
      const requestId = ++this.requestId
      this.loading = true; this.error = ''
      try {
        const id = this.profile.student.id
        const params = this.mode === 'semester' ? { from: this.dateKey(this.semesterStart), to: this.dateKey(new Date()) } : {}
        const summary = await learningApi.getTeacherStudentReport(id, params)
        if (requestId !== this.requestId) return
        this.summary = summary || {}
      } catch (error) { if (requestId === this.requestId) this.error = error?.response?.data?.message || this.t('teacher.action_failed') }
      finally { if (requestId === this.requestId) this.loading = false }
    },
    printReport() { window.print() },
    onKeydown(event) {
      handleModalKeydown(event, { container: this.$refs.dialogRoot, open: this.open, onEscape: () => this.$emit('close') })
    },
    dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` },
  },
}
</script>
