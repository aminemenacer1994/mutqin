<template>
  <section class="teacher-stack teacher-progress-reports">
    <div class="teacher-progress-reports__toolbar card">
      <div class="card-body teacher-progress-reports__toolbar-inner">
        <header class="teacher-progress-reports__intro">
          <h3>{{ t('teacher.progress_reports_title') }}</h3>
          <p class="teacher-progress-reports__lead">{{ t('teacher.progress_reports_lead_short') }}</p>
        </header>

        <div class="teacher-progress-reports__composer">
          <label class="teacher-progress-reports__field">
            <span>{{ t('teacher.progress_reports_period_type') }}</span>
            <select id="progress-report-period-type" v-model="periodType" class="form-select form-select-sm">
              <option value="week">{{ t('teacher.progress_reports_period_week') }}</option>
              <option value="month">{{ t('teacher.progress_reports_period_month') }}</option>
              <option value="custom">{{ t('teacher.progress_reports_period_custom') }}</option>
            </select>
          </label>
          <template v-if="periodType === 'custom'">
            <label class="teacher-progress-reports__field">
              <span>{{ t('teacher.progress_reports_from') }}</span>
              <input v-model="from" type="date" class="form-control form-control-sm" />
            </label>
            <label class="teacher-progress-reports__field">
              <span>{{ t('teacher.progress_reports_to') }}</span>
              <input v-model="to" type="date" class="form-control form-control-sm" />
            </label>
          </template>
          <button type="button" class="btn btn-primary btn-sm teacher-progress-reports__prepare" :disabled="busy" @click="createDraft">
            <i class="bi bi-file-earmark-plus" aria-hidden="true"></i>
            {{ t('teacher.progress_reports_create_draft') }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
    <p v-if="message" class="alert alert-success" role="status">{{ message }}</p>

    <div v-if="loading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</div>

    <div v-else class="teacher-progress-reports__workspace">
      <article v-if="active" class="teacher-progress-reports__detail card">
        <header class="card-body teacher-progress-reports__hero">
          <div class="teacher-progress-reports__hero-copy">
            <div class="teacher-progress-reports__title-row">
              <h4>{{ active.period_label }}</h4>
              <span class="teacher-progress-reports__pill" :class="`is-${active.status}`">
                {{ t(`teacher.progress_reports_status_${active.status}`) }}
              </span>
            </div>
            <label v-if="reports.length > 1" class="teacher-progress-reports__report-picker">
              <span class="visually-hidden">{{ t('teacher.progress_reports_open_report') }}</span>
              <select class="form-select form-select-sm" :value="activeId" @change="onReportPick">
                <option v-for="row in reports" :key="row.id" :value="row.id">
                  {{ row.period_label }} · {{ t(`teacher.progress_reports_status_${row.status}`) }}
                </option>
              </select>
            </label>
            <p v-if="heroMeta" class="teacher-progress-reports__hero-meta">{{ heroMeta }}</p>
          </div>
          <div class="teacher-progress-reports__actions">
            <a
              v-if="pdfDownloadHref"
              class="btn btn-outline-secondary btn-sm"
              :href="pdfDownloadHref"
              :aria-label="t('teacher.progress_reports_download_pdf')"
            >
              <i class="bi bi-download" aria-hidden="true"></i>
              {{ t('teacher.progress_reports_download_pdf') }}
            </a>
            <button v-if="active.status === 'draft'" type="button" class="btn btn-outline-secondary btn-sm" :disabled="busy" @click="refreshDraft">
              <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
              {{ t('teacher.progress_reports_refresh') }}
            </button>
            <button v-if="active.status === 'draft'" type="button" class="btn btn-primary btn-sm" :disabled="busy" @click="approve(true)">
              <i class="bi bi-check2-circle" aria-hidden="true"></i>
              {{ t('teacher.progress_reports_approve_share') }}
            </button>
          </div>
        </header>

        <div class="card-body teacher-progress-reports__body">
          <section v-if="kpiCards.length" class="teacher-progress-reports__overview" :aria-label="t('teacher.report_progress_summary')">
            <div v-for="card in kpiCards" :key="card.key" class="teacher-progress-reports__stat">
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
            </div>
          </section>

          <p v-if="contextLine" class="teacher-progress-reports__context">{{ contextLine }}</p>

          <section v-if="!activityEmpty || homeworkInsight" class="teacher-progress-reports__insight">
            <div v-if="!activityEmpty" class="teacher-progress-reports__chart-compact">
              <h5>{{ t('teacher.activity') }}</h5>
              <div class="teacher-progress-reports__chart-wrap">
                <Bar :data="activityChartData" :options="barOptions" />
              </div>
            </div>
            <div v-if="homeworkInsight" class="teacher-progress-reports__chart-compact">
              <h5>{{ homeworkInsight.title }}</h5>
              <ParentSimpleBarChart :bars="homeworkInsight.bars" :aria-label="homeworkInsight.title" />
            </div>
          </section>

          <section class="teacher-progress-reports__panel teacher-progress-reports__categories">
            <h5>{{ t('teacher.progress_reports_categories') }}</h5>
            <div class="teacher-progress-reports__table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{{ t('teacher.progress_reports_category') }}</th>
                    <th>{{ t('teacher.progress_reports_tasks') }}</th>
                    <th>{{ t('teacher.progress_reports_evidence') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in categoryRows" :key="row.key">
                    <td>{{ row.label }}</td>
                    <td>{{ row.tasksLabel }}</td>
                    <td class="is-muted">{{ evidenceShort(row.evidence) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div v-if="active.status === 'draft' || strengths.length || targets.length" class="teacher-progress-reports__secondary">
            <section v-if="active.status === 'draft'" class="teacher-progress-reports__panel teacher-progress-reports__notes">
              <label :for="notesId">{{ t('teacher.progress_reports_teacher_notes') }}</label>
              <textarea
                :id="notesId"
                v-model="notes"
                class="form-control"
                rows="4"
                :placeholder="t('teacher.progress_reports_notes_placeholder')"
              />
              <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="busy" @click="saveNotes">
                {{ t('teacher.progress_reports_save_notes') }}
              </button>
            </section>

            <section v-if="strengths.length || targets.length" class="teacher-progress-reports__panel teacher-progress-reports__guidance">
              <h5>{{ t('teacher.progress_reports_guidance') }}</h5>
              <ul v-if="strengths.length">
                <li v-for="(item, index) in strengths" :key="`s-${index}`">{{ item.label }}</li>
              </ul>
              <ul v-if="targets.length" class="teacher-progress-reports__targets">
                <li v-for="(item, index) in targets" :key="`t-${index}`">{{ item.label }}</li>
              </ul>
            </section>
          </div>

          <p v-if="wordingLine" class="teacher-progress-reports__footnote">{{ wordingLine }}</p>
          <p class="teacher-progress-reports__disclaimer">{{ t('teacher.progress_reports_disclaimer') }}</p>
        </div>
      </article>

      <TeacherEmpty v-else class="teacher-progress-reports__empty" :message="t('teacher.progress_reports_empty')" />
    </div>
  </section>
</template>

<script>
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { shallowRef } from 'vue'
import { i18nMixin } from '../../../mixins/i18nMixin'
import { learningApi } from '../../../scripts/api/learning'
import { reportHomeworkChart } from '../../../scripts/parent/reportCharts'
import { cssThemeColor } from '../../../scripts/teacher/formatters'
import ParentSimpleBarChart from '../../parent/ParentSimpleBarChart.vue'
import TeacherEmpty from '../TeacherEmpty.vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export default {
  name: 'TeacherStudentProfileReports',
  components: {
    Bar,
    ParentSimpleBarChart,
    TeacherEmpty,
  },
  mixins: [i18nMixin],
  props: {
    studentId: { type: Number, required: true },
  },
  data() {
    const uid = Math.random().toString(36).slice(2, 9)
    return {
      loading: false,
      busy: false,
      error: '',
      message: '',
      reports: shallowRef([]),
      active: null,
      activeId: null,
      periodType: 'month',
      from: '',
      to: '',
      notes: '',
      notesId: `teacher-progress-notes-${uid}`,
    }
  },
  computed: {
    payload() {
      return this.active?.payload || {}
    },
    summary() {
      return this.payload.summary || {}
    },
    kpiCards() {
      const summary = this.summary
      return [
        { key: 'sessions', label: this.t('teacher.sessions'), value: Number(summary.sessions_recorded || 0) },
        { key: 'checks', label: this.t('teacher.scored_checks'), value: Number(summary.scored_checks || 0) },
        {
          key: 'wording',
          label: this.t('teacher.report_average_score'),
          value: summary.ai_word_match_average == null ? '—' : `${summary.ai_word_match_average}%`,
        },
        {
          key: 'tajweed',
          label: this.t('teacher.progress_reports_teacher_tajweed'),
          value: summary.teacher_tajweed_average == null ? '—' : summary.teacher_tajweed_average,
        },
      ]
    },
    heroMeta() {
      const parts = []
      if (this.active?.shared_with_parents) parts.push(this.t('teacher.progress_reports_shared_parents'))
      if (this.payload.insufficient) parts.push(this.t('teacher.progress_reports_sparse_data'))
      return parts.join(' · ')
    },
    contextLine() {
      const parts = []
      const attendance = this.summary.attendance || {}
      if (attendance.rate_percent != null && Number(attendance.total || 0) > 0) {
        parts.push(this.t('teacher.attendance_rate_percent', { rate: attendance.rate_percent }))
      } else if (this.attendanceEmpty) {
        parts.push(this.t('teacher.report_attendance_empty'))
      }
      const homework = this.payload.assignments?.plain
      if (homework) parts.push(homework)
      return parts.join(' ')
    },
    categoryRows() {
      const categories = this.payload.categories || {}
      const labels = {
        sabaq: 'Sabaq',
        sabqi: 'Sabqi',
        manzil: 'Manzil',
        nazra: 'Nazra',
        tajweed: 'Tajweed',
        memorisation: this.t('teacher.progress_reports_memorisation'),
      }
      return Object.keys(labels).map((key) => {
        const row = categories[key] || {}
        const assigned = Number(row.assigned || 0)
        const completed = Number(row.completed || 0)
        return {
          key,
          label: labels[key],
          assigned,
          completed,
          evidence: row.evidence || 'unassessed',
          tasksLabel: assigned > 0 ? `${completed}/${assigned}` : '—',
        }
      })
    },
    strengths() {
      return Array.isArray(this.payload.strengths) ? this.payload.strengths : []
    },
    targets() {
      return Array.isArray(this.payload.next_targets) ? this.payload.next_targets : []
    },
    activityEmpty() {
      return Boolean(this.summary.activity_chart?.is_empty)
    },
    attendanceEmpty() {
      const attendance = this.summary.attendance || {}
      return !['present', 'absent', 'late', 'excused'].some((key) => Number(attendance[key] || 0) > 0)
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
          maxBarThickness: 10,
        }],
      }
    },
    barOptions() {
      const muted = cssThemeColor('--teacher-text-soft', '#6b635a')
      const grid = cssThemeColor('--teacher-line', 'rgba(120, 100, 70, 0.12)')
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 9 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: muted, precision: 0, font: { size: 9 } }, grid: { color: grid } },
        },
      }
    },
    homeworkInsight() {
      const bars = reportHomeworkChart(this.t, this.payload.assignments)
      if (!bars.length) return null
      return {
        title: this.t('parent.reports_chart_homework_title'),
        bars,
      }
    },
    wordingLine() {
      const wording = this.payload.wording || {}
      if (!wording.plain) return ''
      return wording.plain
    },
    pdfDownloadHref() {
      if (!this.activeId) return ''
      return `/api/teacher/progress-reports/${this.activeId}/download`
    },
  },
  mounted() {
    this.loadList()
  },
  methods: {
    evidenceShort(key) {
      const map = {
        teacher_verified: this.t('teacher.progress_reports_evidence_teacher'),
        automated: this.t('teacher.progress_reports_evidence_automated'),
        unassessed: this.t('teacher.progress_reports_evidence_unassessed'),
      }
      return map[key] || key
    },
    async loadList(selectId = null) {
      this.loading = true
      this.error = ''
      try {
        const data = await learningApi.getTeacherStudentProgressReports(this.studentId)
        this.reports = Array.isArray(data.reports) ? data.reports : []
        const id = selectId || this.activeId || this.reports[0]?.id
        if (id) await this.openReport(id)
      } catch (err) {
        this.error = err?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.loading = false
      }
    },
    onReportPick(event) {
      const id = Number(event.target?.value)
      if (id) this.openReport(id)
    },
    async openReport(id) {
      this.activeId = id
      this.error = ''
      try {
        const data = await learningApi.getTeacherStudentProgressReport(id)
        this.active = data.report || null
        this.notes = this.active?.teacher_notes || ''
      } catch (err) {
        this.error = err?.response?.data?.message || this.t('teacher.action_failed')
      }
    },
    async createDraft() {
      this.busy = true
      this.error = ''
      this.message = ''
      try {
        const body = { period_type: this.periodType }
        if (this.periodType === 'custom') {
          body.from = this.from
          body.to = this.to
        }
        const data = await learningApi.createTeacherStudentProgressReport(this.studentId, body)
        this.message = this.t('teacher.progress_reports_draft_ready')
        await this.loadList(data.report?.id)
      } catch (err) {
        this.error = err?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.busy = false
      }
    },
    async refreshDraft() {
      if (!this.activeId) return
      this.busy = true
      this.error = ''
      try {
        const data = await learningApi.refreshTeacherStudentProgressReport(this.activeId)
        this.active = data.report
        this.message = this.t('teacher.progress_reports_refreshed')
      } catch (err) {
        this.error = err?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.busy = false
      }
    },
    async saveNotes() {
      if (!this.activeId) return
      this.busy = true
      this.error = ''
      try {
        const data = await learningApi.updateTeacherStudentProgressReport(this.activeId, { teacher_notes: this.notes })
        this.active = data.report
        this.message = this.t('teacher.progress_reports_notes_saved')
      } catch (err) {
        this.error = err?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.busy = false
      }
    },
    async approve(shareWithParents) {
      if (!this.activeId) return
      this.busy = true
      this.error = ''
      try {
        const data = await learningApi.approveTeacherStudentProgressReport(this.activeId, { share_with_parents: shareWithParents })
        this.message = this.t('teacher.progress_reports_approved')
        await this.loadList(data.report?.id)
      } catch (err) {
        this.error = err?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.busy = false
      }
    },
  },
}
</script>