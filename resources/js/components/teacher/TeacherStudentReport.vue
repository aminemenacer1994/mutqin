<template>
  <Teleport to="body">
    <div v-if="open" ref="dialogRoot" class="teacher-report-overlay" role="dialog" aria-modal="true" :aria-label="t('teacher.report_title')" tabindex="-1" @click.self="$emit('close')" @keydown="onKeydown">
      <div class="teacher-report">
        <header class="teacher-report__toolbar">
          <div>
            <h2>{{ t('teacher.report_title') }}</h2>
            <p>{{ profile.student.name }}</p>
          </div>
          <button ref="closeButton" type="button" class="btn btn-outline-secondary teacher-report__close" :aria-label="t('common.close')" @click="$emit('close')">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
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

          <section v-if="hasCharts" class="teacher-report__charts" :aria-label="t('teacher.report_charts')">
            <div class="teacher-report__chart-card">
              <h3>{{ t('teacher.activity') }}</h3>
              <div v-if="activityEmpty" class="teacher-report__chart-empty">{{ t('teacher.activity_empty') }}</div>
              <div v-else class="teacher-report__chart-wrap">
                <Bar :data="activityChartData" :options="barOptions" />
              </div>
            </div>
            <div class="teacher-report__chart-card">
              <h3>{{ t('teacher.nav_attendance') }}</h3>
              <div v-if="attendanceEmpty" class="teacher-report__chart-empty">{{ t('teacher.report_attendance_empty') }}</div>
              <div v-else class="teacher-report__chart-wrap teacher-report__chart-wrap--donut">
                <Doughnut :data="attendanceChartData" :options="donutOptions" />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { cssThemeColor } from '../../scripts/teacher/formatters'
import { captureReturnFocus, handleModalKeydown, restoreReturnFocus } from '../../utils/modalFocus'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip)

export default {
  name: 'TeacherStudentReport',
  components: { Bar, Doughnut },
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
        { key: 'checks', icon: 'bi bi-mic', label: this.t('teacher.scored_checks'), value: Number(this.summary.scored_checks || 0) },
        { key: 'average', icon: 'bi bi-graph-up', label: this.t('teacher.report_average_score'), value: this.summary.ai_word_match_average == null ? '—' : `${this.summary.ai_word_match_average}%` },
        { key: 'tasks', icon: 'bi bi-journal-check', label: this.t('teacher.report_tasks'), value: Number(this.summary.tasks_assigned || 0) },
        { key: 'present', tone: 'good', icon: 'bi bi-check-lg', label: this.t('teacher.attendance_present'), value: Number(this.summary.attendance?.present || 0) },
        { key: 'absent', tone: 'danger', icon: 'bi bi-x-lg', label: this.t('teacher.attendance_absent'), value: Number(this.summary.attendance?.absent || 0) },
        { key: 'late', tone: 'warning', icon: 'bi bi-clock', label: this.t('teacher.attendance_late'), value: Number(this.summary.attendance?.late || 0) },
        { key: 'excused', icon: 'bi bi-shield-check', label: this.t('teacher.attendance_excused'), value: Number(this.summary.attendance?.excused || 0) },
      ]
    },
    activityEmpty() {
      return Boolean(this.summary.activity_chart?.is_empty)
    },
    attendanceEmpty() {
      const attendance = this.summary.attendance || {}
      return !['present', 'absent', 'late', 'excused'].some((key) => Number(attendance[key] || 0) > 0)
    },
    hasCharts() {
      return !this.activityEmpty || !this.attendanceEmpty
    },
    activityChartData() {
      const points = this.summary.activity_chart?.points || []
      const color = cssThemeColor('--accent', '#3f6f6d')
      return {
        labels: points.map((point) => point.date.slice(5)),
        datasets: [{
          label: this.t('teacher.sessions'),
          data: points.map((point) => point.sessions),
          backgroundColor: color,
          borderRadius: 6,
          maxBarThickness: 14,
        }],
      }
    },
    attendanceChartData() {
      const attendance = this.summary.attendance || {}
      return {
        labels: [
          this.t('teacher.attendance_present'),
          this.t('teacher.attendance_absent'),
          this.t('teacher.attendance_late'),
          this.t('teacher.attendance_excused'),
        ],
        datasets: [{
          data: [
            Number(attendance.present || 0),
            Number(attendance.absent || 0),
            Number(attendance.late || 0),
            Number(attendance.excused || 0),
          ],
          backgroundColor: ['#2e7d64', '#a5463a', '#9a681f', '#6b635a'],
          borderWidth: 0,
        }],
      }
    },
    barOptions() {
      const muted = cssThemeColor('--text-muted', '#6b635a')
      const grid = cssThemeColor('--border', 'rgba(120, 100, 70, 0.2)')
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: muted, maxRotation: 0, autoSkip: true, font: { size: 10 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: muted, precision: 0, font: { size: 10 } }, grid: { color: grid } },
        },
      }
    },
    donutOptions() {
      const ink = cssThemeColor('--text', '#1c1917')
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: ink, boxWidth: 10, font: { size: 10 } } },
        },
      }
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
    onKeydown(event) {
      handleModalKeydown(event, { container: this.$refs.dialogRoot, open: this.open, onEscape: () => this.$emit('close') })
    },
    dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` },
  },
}
</script>
