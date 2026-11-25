<template>
  <section class="parent-home parent-reports-page teacher-stack">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.reports_title') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.reports_hint') }}</p>
      </div>
    </header>

    <div class="parent-filters parent-report-controls">
      <div class="parent-pills" role="group" :aria-label="t('parent.reports_cadence')">
        <button type="button" :class="{ 'is-active': cadence === 'week' }" :aria-pressed="cadence === 'week' ? 'true' : 'false'" @click="setCadence('week')">{{ t('parent.reports_week') }}</button>
        <button type="button" :class="{ 'is-active': cadence === 'month' }" :aria-pressed="cadence === 'month' ? 'true' : 'false'" @click="setCadence('month')">{{ t('parent.reports_month') }}</button>
      </div>
      <label v-if="selectedId && reportOptions.length > 1" class="parent-report-field">
        <span class="parent-report-field__label">{{ t('parent.reports_previous') }}</span>
        <select
          class="parent-report-select"
          :value="activeId || ''"
          :aria-label="t('parent.reports_previous')"
          @change="onReportChange"
        >
          <option v-for="report in reports" :key="report.id" :value="report.id">{{ report.period_label }}</option>
        </select>
      </label>
    </div>

    <div v-if="loading" class="teacher-skeletons" role="status">
      <div v-for="n in 3" :key="n" class="teacher-skeleton"></div>
      <span class="visually-hidden">{{ t('parent.reports_loading') }}</span>
    </div>
    <NetworkFallback v-else-if="error" @retry="load" />

    <template v-else>
      <p v-if="!selectedId && family?.plain" class="parent-lead">{{ t('parent.reports_family_hint') }}</p>

      <ul v-if="!selectedId && family?.children?.length" class="parent-tasks">
        <li v-for="child in family.children" :key="child.child_id" class="parent-task">
          <button type="button" @click="$emit('select-child', child.child_id)">
            <span class="parent-task__icon" aria-hidden="true"><i class="bi bi-person"></i></span>
            <span class="parent-task__copy">
              <strong>{{ child.name }}</strong>
              <small>{{ child.plain || child.period_label || t('parent.reports_empty') }}</small>
            </span>
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
        </li>
      </ul>

      <TeacherEmpty v-if="!reports.length && (selectedId || !family?.children?.length)" illustrated icon="bi bi-calendar2" :message="t('parent.reports_empty')" />
      <TeacherEmpty v-else-if="selectedId && active?.insufficient" illustrated icon="bi bi-calendar2" :message="t('parent.reports_empty')" />

      <div v-else-if="selectedId && active" class="parent-report-stack">
        <header class="parent-report__head">
          <div class="parent-report__head-copy">
            <h2>{{ active.period_label }}</h2>
            <p v-if="preparedLabel">{{ preparedLabel }}</p>
          </div>
          <a
            class="parent-download"
            :href="`/api/parent/reports/${active.id}/download`"
            :title="t('parent.reports_download_hint')"
            :aria-label="t('parent.reports_download_pdf')"
          >
            <i class="bi bi-download" aria-hidden="true"></i>{{ t('parent.reports_download_pdf') }}
          </a>
        </header>

        <section v-if="parentHighlights.length" class="parent-panel parent-reports-parent-focus">
          <h2 class="parent-report__subhead">{{ t('parent.reports_parent_summary') }}</h2>
          <ul class="parent-report-parent-list">
            <li v-for="(line, index) in parentHighlights" :key="index">{{ line }}</li>
          </ul>
        </section>

        <div v-if="chartPanels.length" class="parent-reports-charts">
          <section v-for="panel in chartPanels" :key="panel.key" class="parent-panel parent-reports-chart-panel">
            <h2 class="parent-report__subhead">{{ panel.title }}</h2>
            <p v-if="panel.hint" class="parent-stat__hint">{{ panel.hint }}</p>
            <ParentSimpleBarChart :bars="panel.bars" :aria-label="panel.title" />
          </section>
        </div>

        <div v-if="kpiCards.length" class="parent-stats parent-stats--reports" role="list">
          <article v-for="card in kpiCards" :key="card.key" class="parent-stat" role="listitem">
            <span aria-hidden="true"><i :class="card.icon"></i></span>
            <strong>{{ card.value }}</strong>
            <small>{{ card.label }}</small>
            <p class="parent-stat__hint">{{ card.hint }}</p>
          </article>
        </div>

        <section v-if="showOverview" class="parent-panel" :class="{ 'parent-reports-overview--parent': parentFirstLayout }">
          <h2><i class="bi bi-card-text" aria-hidden="true"></i>{{ t('parent.reports_overview') }}</h2>
          <details v-if="parentFirstLayout && active.narrative?.text" class="parent-report-details parent-reports-detail-fold">
            <summary>{{ t('parent.reports_read_more') }}</summary>
            <p class="parent-report-prose">{{ active.narrative.text }}</p>
          </details>
          <template v-else-if="active.narrative?.text">
            <p v-if="!needsFold(active.narrative.text)" class="parent-report-prose">{{ active.narrative.text }}</p>
            <template v-else>
              <p class="parent-report-prose parent-report-prose--preview">{{ prosePreview(active.narrative.text) }}</p>
              <details class="parent-report-details">
                <summary>{{ t('parent.reports_read_more') }}</summary>
                <p class="parent-report-prose">{{ active.narrative.text }}</p>
              </details>
            </template>
          </template>
          <div v-if="periodStats.length || lifetimeStats.length" class="parent-report-split">
            <div v-if="periodStats.length">
              <h3 class="parent-report__subhead">{{ t('parent.reports_period_stats') }}</h3>
              <ul class="parent-report-metrics">
                <li v-for="row in periodStats" :key="row.key">
                  <span>{{ row.label }}</span>
                  <strong>{{ row.value }}</strong>
                </li>
              </ul>
            </div>
            <div v-if="lifetimeStats.length">
              <h3 class="parent-report__subhead">{{ t('parent.reports_lifetime_stats') }}</h3>
              <ul class="parent-report-metrics">
                <li v-for="row in lifetimeStats" :key="row.key">
                  <span>{{ row.label }}</span>
                  <strong>{{ row.value }}</strong>
                </li>
              </ul>
            </div>
          </div>
          <details v-if="active.comparison?.plain" class="parent-report-details">
            <summary>{{ t('parent.reports_compare') }}</summary>
            <p class="parent-report-prose">{{ active.comparison.plain }}</p>
          </details>
          <details v-if="active.goals?.plain" class="parent-report-details">
            <summary>{{ t('parent.reports_goals') }}</summary>
            <p class="parent-report-prose">{{ active.goals.plain }}</p>
          </details>
          <p v-if="sourceLabels.length" class="parent-stat__hint">{{ t('parent.reports_evidence_note') }}</p>
          <details v-if="sourceLabels.length" class="parent-report-details">
            <summary>{{ t('parent.reports_sources') }}</summary>
            <ul class="parent-pills--sources" role="list">
              <li v-for="(label, index) in sourceLabels" :key="`${label}-${index}`" role="listitem">
                <span class="parent-report-source">{{ label }}</span>
              </li>
            </ul>
          </details>
          <div class="parent-report-attention parent-report-attention--spaced">
            <h3 class="parent-report__subhead">{{ t('parent.reports_attention') }}</h3>
            <p v-if="!hasAttention" class="parent-report-prose">{{ t('parent.reports_attention_empty') }}</p>
            <ul v-else class="parent-report-list">
              <li v-for="(item, index) in active.attention" :key="`${item.kind}-${index}`">{{ item.label }}</li>
            </ul>
          </div>
        </section>

        <section v-if="showHomework" class="parent-panel">
          <h2><i class="bi bi-journal-check" aria-hidden="true"></i>{{ t('parent.reports_section_homework') }}</h2>
          <template v-if="active.assignments?.plain">
            <p v-if="!needsFold(active.assignments.plain)" class="parent-report-prose">{{ active.assignments.plain }}</p>
            <template v-else>
              <p class="parent-report-prose parent-report-prose--preview">{{ prosePreview(active.assignments.plain) }}</p>
              <details class="parent-report-details">
                <summary>{{ t('parent.reports_read_more') }}</summary>
                <p class="parent-report-prose">{{ active.assignments.plain }}</p>
              </details>
            </template>
          </template>
          <ul v-if="assignmentItems.length" class="parent-report-items">
            <li v-for="(item, index) in assignmentItems" :key="`${item.label}-${index}`">
              <span class="parent-report-item__label" :title="item.label">{{ item.label }}</span>
              <span class="parent-status" :class="statusClass(assignmentStatus(item))">{{ statusLabel(assignmentStatus(item)) }}</span>
            </li>
          </ul>
        </section>

        <section v-if="showAttendance" class="parent-panel">
          <h2><i class="bi bi-calendar-week" aria-hidden="true"></i>{{ t('parent.reports_section_attendance') }}</h2>
          <p v-if="active.attendance?.plain" class="parent-report-prose">{{ active.attendance.plain }}</p>
          <div v-if="attendanceCards.length" class="parent-stats parent-stats--compact" role="list">
            <article v-for="card in attendanceCards" :key="card.key" class="parent-stat parent-stat--compact" role="listitem">
              <span aria-hidden="true"><i :class="card.icon"></i></span>
              <strong>{{ card.value }}</strong>
              <small>{{ card.label }}</small>
            </article>
          </div>
        </section>

        <section v-if="showHomePractice" class="parent-panel">
          <h2><i class="bi bi-house-heart" aria-hidden="true"></i>{{ t('parent.reports_home_practice') }}</h2>
          <p class="parent-stat__hint">{{ t('parent.reports_home_practice_hint') }}</p>
          <p v-if="active.home_practice?.plain" class="parent-report-prose">{{ active.home_practice.plain }}</p>
          <p v-if="!homePracticeItems.length" class="parent-report-prose">{{ t('parent.reports_home_practice_empty') }}</p>
          <ul v-else class="parent-suggest">
            <li v-for="(item, index) in homePracticeItems" :key="`${item.label}-${index}`">
              <strong v-if="item.label">{{ item.label }}</strong>
              <span v-if="item.text">{{ item.text }}</span>
            </li>
          </ul>
        </section>

        <section v-if="showPractice" class="parent-panel">
          <h2><i class="bi bi-activity" aria-hidden="true"></i>{{ t('parent.reports_section_practice') }}</h2>
          <template v-if="active.activity?.plain">
            <p v-if="!needsFold(active.activity.plain)" class="parent-report-prose">{{ active.activity.plain }}</p>
            <template v-else>
              <p class="parent-report-prose parent-report-prose--preview">{{ prosePreview(active.activity.plain) }}</p>
              <details class="parent-report-details">
                <summary>{{ t('parent.reports_read_more') }}</summary>
                <p class="parent-report-prose">{{ active.activity.plain }}</p>
              </details>
            </template>
          </template>
        </section>

        <section v-if="showFeedback" class="parent-panel">
          <h2><i class="bi bi-chat-left-quote" aria-hidden="true"></i>{{ t('parent.reports_feedback') }}</h2>
          <p v-if="!feedbackNotes.length" class="parent-report-prose">{{ t('parent.reports_feedback_empty') }}</p>
          <ul v-else class="parent-report-feedback">
            <li v-for="(note, index) in feedbackNotes" :key="`${note.teacher}-${index}`">
              <blockquote>
                <p>“{{ note.excerpt }}”</p>
                <footer>
                  {{ note.teacher }}
                  <template v-if="noteWhen(note.at)"> · {{ noteWhen(note.at) }}</template>
                </footer>
              </blockquote>
            </li>
          </ul>
        </section>

      </div>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { formatWhen } from '../../scripts/parent/dashboard'
import { periodMetricRowsFromReport, proseNeedsFold, prosePreview } from '../../scripts/parent/reportsView'
import { reportAttendanceChart, reportHomeworkChart, reportParentHighlights, reportPracticeChart } from '../../scripts/parent/reportCharts'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import NetworkFallback from '../NetworkFallback.vue'
import ParentSimpleBarChart from './ParentSimpleBarChart.vue'

export default {
  name: 'ParentFamilyReports',
  components: { TeacherEmpty, NetworkFallback, ParentSimpleBarChart },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
  },
  emits: ['select-child'],
  data() {
    return {
      cadence: 'week',
      loading: false,
      error: false,
      family: null,
      reports: [],
      activeId: null,
    }
  },
  computed: {
    childSelectValue() {
      return this.selectedId ? String(this.selectedId) : ''
    },
    reportOptions() {
      return this.reports
    },
    active() {
      return this.reports.find((report) => report.id === this.activeId) || this.reports[0] || null
    },
    preparedLabel() {
      if (!this.active?.generated_at) return ''
      const when = new Date(this.active.generated_at)
      if (Number.isNaN(when.getTime())) return ''
      const label = when.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      return `${this.t('parent.reports_prepared')} ${label}`
    },
    kpiCards() {
      if (!this.active) return []
      const cards = []
      if (this.active.assignments) {
        const completed = Number(this.active.assignments.completed || 0)
        const assigned = Number(this.active.assignments.assigned || 0)
        cards.push({
          key: 'homework',
          icon: 'bi bi-journal-check',
          label: this.t('parent.reports_kpi_homework'),
          value: assigned ? `${completed}/${assigned}` : String(completed),
          hint: this.t('parent.reports_kpi_homework_hint'),
        })
      }
      if (this.active.activity) {
        const practice = Number(this.active.activity.practice_rows || 0)
        cards.push({
          key: 'practice',
          icon: 'bi bi-activity',
          label: this.t('parent.reports_kpi_practice'),
          value: String(practice),
          hint: this.t('parent.reports_kpi_practice_hint'),
        })
        const revision = Number(this.active.activity.revision_sessions || 0)
        cards.push({
          key: 'revision',
          icon: 'bi bi-arrow-repeat',
          label: this.t('parent.reports_kpi_revision'),
          value: String(revision),
          hint: this.t('parent.reports_kpi_revision_hint'),
        })
      }
      if (this.active.assignments) {
        const overdue = Number(this.active.assignments.overdue || 0)
        cards.push({
          key: 'outstanding',
          icon: 'bi bi-exclamation-circle',
          label: this.t('parent.reports_kpi_outstanding'),
          value: String(overdue),
          hint: this.t('parent.reports_kpi_outstanding_hint'),
        })
      }
      return cards
    },
    showOverview() {
      if (!this.active) return false
      return Boolean(
        this.active.narrative?.text
          || this.periodStats.length
          || this.lifetimeStats.length
          || this.active.comparison?.plain
          || this.active.goals?.plain
          || this.sourceLabels.length
          || this.hasAttention,
      )
    },
    periodStats() {
      if (!this.active || this.kpiCards.length) return []
      return periodMetricRowsFromReport(this.t, this.active)
    },
    lifetimeStats() {
      const current = this.active?.activity?.current_memorised
      if (current === null || current === undefined) return []
      return [{
        key: 'memorised_total',
        label: this.t('parent.reports_lifetime_memorised'),
        value: String(current),
      }]
    },
    sourceLabels() {
      if (!Array.isArray(this.active?.sources)) return []
      return this.active.sources.map((source) => source.label).filter(Boolean)
    },
    hasAttention() {
      return Array.isArray(this.active?.attention) && this.active.attention.length > 0
    },
    assignmentItems() {
      const items = this.active?.assignments?.items
      return Array.isArray(items) ? items : []
    },
    feedbackNotes() {
      const notes = this.active?.feedback?.notes
      return Array.isArray(notes) ? notes : []
    },
    homePracticeItems() {
      const rows = this.active?.home_practice?.items
      return Array.isArray(rows) ? rows : []
    },
    showHomePractice() {
      return this.active?.home_practice !== null && this.active?.home_practice !== undefined
    },
    showAttendance() {
      return Boolean(this.active?.attendance && (this.active.attendance.plain || this.attendanceCards.length))
    },
    attendanceCards() {
      const counts = this.active?.attendance?.counts
      if (!counts) return []
      const cards = []
      if (this.active.attendance.rate_percent !== null && this.active.attendance.rate_percent !== undefined) {
        cards.push({
          key: 'rate',
          icon: 'bi bi-percent',
          label: this.t('parent.progress_attendance_rate'),
          value: `${this.active.attendance.rate_percent}%`,
        })
      }
      const chips = [
        { key: 'present', icon: 'bi bi-check-circle', label: this.t('teacher.attendance_present'), field: 'present' },
        { key: 'late', icon: 'bi bi-clock', label: this.t('teacher.attendance_late'), field: 'late' },
        { key: 'absent', icon: 'bi bi-x-circle', label: this.t('teacher.attendance_absent'), field: 'absent' },
        { key: 'excused', icon: 'bi bi-slash-circle', label: this.t('teacher.attendance_excused'), field: 'excused' },
      ]
      for (const chip of chips) {
        const value = Number(counts[chip.field] || 0)
        if (value > 0) {
          cards.push({ key: chip.key, icon: chip.icon, label: chip.label, value: String(value) })
        }
      }
      return cards
    },
    showHomework() {
      return Boolean(this.active?.assignments && (this.active.assignments.plain || this.assignmentItems.length))
    },
    showPractice() {
      return Boolean(this.active?.activity?.plain)
    },
    parentHighlights() {
      return reportParentHighlights(this.t, this.active)
    },
    parentFirstLayout() {
      return this.parentHighlights.length > 0 || this.chartPanels.length > 0
    },
    chartPanels() {
      if (!this.active) return []
      const panels = []
      const homeworkBars = reportHomeworkChart(this.t, this.active.assignments)
      if (homeworkBars.length) {
        panels.push({
          key: 'homework',
          title: this.t('parent.reports_chart_homework_title'),
          hint: this.t('parent.reports_chart_homework_hint'),
          bars: homeworkBars,
        })
      }
      const practiceBars = reportPracticeChart(this.t, this.active.activity)
      if (practiceBars.length) {
        panels.push({
          key: 'practice',
          title: this.t('parent.reports_chart_practice_title'),
          hint: this.t('parent.reports_chart_practice_hint'),
          bars: practiceBars,
        })
      }
      const attendanceBars = reportAttendanceChart(this.t, this.active.attendance)
      if (attendanceBars.length) {
        panels.push({
          key: 'attendance',
          title: this.t('parent.reports_chart_attendance_title'),
          hint: this.t('parent.reports_chart_attendance_hint'),
          bars: attendanceBars,
        })
      }
      return panels
    },
    showFeedback() {
      return this.active?.feedback !== null && this.active?.feedback !== undefined
    },
  },
  watch: {
    selectedId() {
      this.load()
    },
  },
  mounted() {
    this.load()
  },
  methods: {
    onChildChange(event) {
      const value = event.target.value
      this.$emit('select-child', value ? Number(value) : null)
    },
    onReportChange(event) {
      const id = Number(event.target.value)
      this.activeId = Number.isNaN(id) ? this.activeId : id
    },
    setCadence(cadence) {
      this.cadence = cadence
      this.load()
    },
    async load() {
      this.loading = true
      this.error = false
      try {
        const data = await learningApi.getParentReports({ cadence: this.cadence, childId: this.selectedId })
        this.family = data.family || null
        this.reports = Array.isArray(data.reports) ? data.reports : []
        this.activeId = this.reports[0]?.id || null
      } catch {
        this.error = true
        this.reports = []
        this.family = null
      } finally {
        this.loading = false
      }
    },
    noteWhen(value) {
      return formatWhen(value)
    },
    assignmentStatus(item) {
      if (item.overdue) return 'overdue'
      return String(item.status || 'pending')
    },
    statusLabel(status) {
      if (status === 'overdue') return this.t('parent.homework_overdue')
      const key = `parent.homework_${status}`
      const label = this.t(key)
      return label && label !== key ? label : status
    },
    statusClass(status) {
      if (status === 'overdue') return 'is-late'
      if (status === 'completed') return 'is-ok'
      if (status === 'awaiting_confirmation') return 'is-wait'
      if (status === 'needs_correction') return 'is-late'
      return 'is-open'
    },
    needsFold(text) {
      return proseNeedsFold(text)
    },
    prosePreview(text) {
      return prosePreview(text)
    },
  },
}
</script>