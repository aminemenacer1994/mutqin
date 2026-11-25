<template>
  <section class="teacher-stack" aria-labelledby="teacher-overview-heading">
    <h2 id="teacher-overview-heading" class="visually-hidden">{{ t('teacher.nav_overview') }}</h2>
    <TeacherKpiGrid :cards="kpiCards" compact selectable @select="$emit('select-kpi', $event)" />

    <TeacherSectionPane v-if="actionQueue.length" class="teacher-overview-queue" :title="t('teacher.overview_action_queue')" icon="bi bi-lightning" flat>
      <ul class="teacher-activity-list">
        <li v-for="item in actionQueue" :key="`${item.kind}-${item.recordId}`">
          <button type="button" :aria-label="queueAria(item)" @click="openQueueItem(item)">
            <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(item.name) }}</span>
            <span class="teacher-activity-list__copy"><strong>{{ item.name }}</strong><small>{{ item.detail }}</small></span>
            <span class="teacher-activity-list__score">{{ queueAction(item) }}</span>
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
        </li>
      </ul>
    </TeacherSectionPane>
    <p v-else class="teacher-overview-clear" role="status">{{ t('teacher.overview_action_queue_empty') }}</p>

    <section class="teacher-overview-facts" :aria-label="t('teacher.today_priorities')">
      <header class="teacher-overview-facts__head">
        <h3>{{ t('teacher.today_priorities') }}</h3>
        <p class="visually-hidden">{{ t('teacher.today_priorities_help') }}</p>
      </header>
      <div class="teacher-overview-facts__grid teacher-overview-facts__grid--quad">
        <component
          :is="item.count ? 'button' : 'div'"
          v-for="item in todayItems"
          :key="item.id"
          :type="item.count ? 'button' : null"
          class="teacher-overview-facts__card"
          :class="item.count ? ['is-attention', item.tone] : 'is-clear'"
          :role="item.count ? null : 'status'"
          :aria-label="item.aria"
          @click="item.count && openPriority(item)"
        >
          <strong aria-hidden="true">{{ item.count }}</strong>
          <span aria-hidden="true">{{ item.label }}</span>
          <small aria-hidden="true">{{ item.count ? item.action : item.clear }}</small>
        </component>
      </div>
    </section>

    <div class="teacher-overview-columns">
      <TeacherSectionPane :title="t('teacher.overview_need_look')" icon="bi bi-exclamation-circle" tone="warn" flat>
        <TeacherAttentionList v-if="attentionRows.length" :rows="attentionRows" :format-when="formatWhen" @open-student="openStudent" @assign-revision="$emit('assign-revision', $event)" />
        <TeacherEmpty v-else inline icon="bi bi-check2-circle" :message="attentionEmpty" />
      </TeacherSectionPane>
      <TeacherSectionPane :title="t('teacher.overview_recent_activity')" icon="bi bi-activity" flat>
        <ul v-if="recentActivity.length" class="teacher-activity-list">
          <li v-for="student in recentActivity" :key="student.id" :class="{ 'has-wording': typeof student.ai_success_rate === 'number' }">
            <button type="button" @click="openActivity(student)">
              <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(student.name) }}</span>
              <span class="teacher-activity-list__copy"><strong>{{ student.name }}</strong><small>{{ activityLabel(student) }}</small></span>
              <i v-if="typeof student.ai_success_rate !== 'number'" class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
            <TeacherWordingMatch v-if="typeof student.ai_success_rate === 'number'" class="teacher-activity-list__score" :class="`teacher-activity-list__score--${scoreTone(student.ai_success_rate)}`">{{ student.ai_success_rate }}%<small>{{ t('teacher.ai_word_match_short') }}</small></TeacherWordingMatch>
            <i v-if="typeof student.ai_success_rate === 'number'" class="bi bi-chevron-right" aria-hidden="true"></i>
          </li>
        </ul>
        <TeacherEmpty v-else inline icon="bi bi-calendar2" :message="t('teacher.activity_empty')" />
      </TeacherSectionPane>
    </div>

    <section class="teacher-insights teacher-overview-trends" :aria-labelledby="trendHeadingId">
      <header class="teacher-insights__head">
        <div class="teacher-insights__copy">
          <h3 :id="trendHeadingId" class="teacher-insights__title">{{ t('teacher.overview_trends') }}</h3>
          <p class="teacher-insights__hint">{{ t('teacher.overview_trends_hint') }}</p>
        </div>
        <div class="dash-range-toggle" role="group" :aria-label="t('teacher.chart_range')">
          <button
            v-for="days in chartDayOptions"
            :key="days"
            type="button"
            class="dash-btn dash-btn--ghost dash-btn--sm"
            :class="{ 'is-active': chartDays === days }"
            :aria-pressed="chartDays === days ? 'true' : 'false'"
            :disabled="trendLoading"
            @click="$emit('set-chart-days', days)"
          >
            {{ t('teacher.days', { n: days }) }}
          </button>
        </div>
      </header>
      <div class="teacher-insights__body">
        <div class="teacher-insights__charts">
          <TeacherActivityChart
            :title="t('teacher.assignment_completion_trend')"
            :caption="assignmentCaption"
            :empty-message="t('teacher.assignment_completion_empty')"
            :show-range="false"
            :chart-days="chartDays"
            :loading="trendLoading"
            :error-message="trendError"
            :is-empty="assignmentTrend.is_empty"
            :chart-ready="!trendLoading"
            :chart-data="assignmentChartData"
            :chart-options="trendChartOptions"
          />
          <TeacherActivityChart
            :title="t('teacher.revision_consistency')"
            :caption="revisionCaption"
            :empty-message="t('teacher.revision_consistency_empty')"
            :show-range="false"
            :chart-days="chartDays"
            :loading="trendLoading"
            :error-message="trendError"
            :is-empty="revisionTrend.is_empty"
            :chart-ready="!trendLoading"
            :chart-data="revisionChartData"
            :chart-options="trendChartOptions"
          />
        </div>
      </div>
    </section>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { cssThemeColor, scoreBadgeTone, studentInitial, teacherActionQueue, teacherAttentionAction, teacherAttentionRank, teacherDeskCounts } from '../../scripts/teacher/formatters'
import TeacherAttentionList from './TeacherAttentionList.vue'
import TeacherActivityChart from './TeacherActivityChart.vue'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherKpiGrid from './TeacherKpiGrid.vue'
import TeacherSectionPane from './TeacherSectionPane.vue'
import TeacherWordingMatch from './TeacherWordingMatch.vue'

export default {
  name: 'TeacherOverviewSection',
  components: {
    TeacherAttentionList,
    TeacherActivityChart,
    TeacherEmpty,
    TeacherKpiGrid,
    TeacherSectionPane,
    TeacherWordingMatch,
  },
  mixins: [i18nMixin],
  props: {
    overview: { type: Object, required: true },
    kpiCards: { type: Array, default: () => [] },
    attentionPreview: { type: Array, default: () => [] },
    formatWhen: { type: Function, required: true },
    chartDays: { type: Number, default: 30 },
    chartDayOptions: { type: Array, default: () => [7, 30, 90] },
    trendLoading: { type: Boolean, default: false },
    trendError: { type: String, default: '' },
  },
  emits: ['open-student', 'select-kpi', 'assign-revision', 'set-chart-days', 'open-assignments', 'open-plans', 'open-reviews', 'create-assignment'],
  computed: {
    deskCounts() {
      return teacherDeskCounts(this.overview)
    },
    trendHeadingId() {
      return 'teacher-overview-trends-heading'
    },
    assignmentTrend() {
      return this.overview?.trends?.assignment_completion || { points: [], is_empty: true, completed_sample_size: 0, scheduled_sample_size: 0 }
    },
    revisionTrend() {
      return this.overview?.trends?.revision_consistency || { points: [], is_empty: true, completed_sample_size: 0, scheduled_sample_size: 0 }
    },
    assignmentCaption() {
      const completed = this.assignmentTrend.completed_sample_size || 0
      const due = this.assignmentTrend.scheduled_sample_size || 0
      if (!completed && !due) return ''
      return this.t('teacher.assignment_completion_caption_short', { completed, due })
    },
    revisionCaption() {
      const completed = this.revisionTrend.completed_sample_size || 0
      const scheduled = this.revisionTrend.scheduled_sample_size || 0
      if (!completed && !scheduled) return ''
      return this.t('teacher.revision_consistency_caption_short', { completed, scheduled })
    },
    assignmentChartData() {
      return this.trendSeries(this.assignmentTrend.points, this.t('teacher.trend_due'))
    },
    revisionChartData() {
      return this.trendSeries(this.revisionTrend.points, this.t('teacher.trend_scheduled'))
    },
    trendChartOptions() {
      const ink = cssThemeColor('--text', '#1c1917')
      const muted = cssThemeColor('--text-muted', '#6b635a')
      const grid = cssThemeColor('--border', 'rgba(120, 100, 70, 0.2)')
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 420, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { color: muted, boxWidth: 10, boxHeight: 10, padding: 12, font: { size: 11, weight: '600' } },
          },
          tooltip: {
            enabled: true,
            backgroundColor: cssThemeColor('--surface-strong', '#fffaf3'),
            titleColor: ink,
            bodyColor: ink,
            borderColor: grid,
            borderWidth: 1,
            padding: 10,
            displayColors: true,
          },
        },
        scales: {
          x: { ticks: { color: muted, maxRotation: 0, autoSkip: true, font: { size: 11, weight: '600' } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: muted, precision: 0, font: { size: 11, weight: '600' } }, grid: { color: grid, drawBorder: false } },
        },
      }
    },
    classHifz() {
      const hifz = this.overview?.hifz
      if (!hifz || !hifz.students) return null
      return hifz
    },
    recentActivity() {
      return (this.overview.recently_active || []).slice(0, 5)
    },
    outstandingRevision() {
      return [...(this.overview?.outstanding_revision || [])].sort((a, b) => {
        if (Boolean(a.overdue) !== Boolean(b.overdue)) return a.overdue ? -1 : 1
        return String(a.due_at || '9999').localeCompare(String(b.due_at || '9999'))
      })
    },
    todayItems() {
      const counts = this.deskCounts
      return [
        {
          id: 'recitations',
          count: counts.recitations,
          label: this.t('teacher.today_chip_recitations'),
          action: this.t('teacher.today_chip_go_recitations'),
          clear: this.t('teacher.today_chip_clear_recitations'),
          aria: counts.recitations
            ? this.t('teacher.today_chip_recitations_label', { count: counts.recitations })
            : this.t('teacher.today_chip_clear_recitations'),
          tone: '',
        },
        {
          id: 'overdue',
          count: counts.overdue,
          label: this.t('teacher.today_chip_overdue'),
          action: this.t('teacher.today_chip_go_overdue'),
          clear: this.t('teacher.today_chip_clear_overdue'),
          aria: counts.overdue
            ? this.t('teacher.today_chip_overdue_label', { count: counts.overdue })
            : this.t('teacher.today_chip_clear_overdue'),
          tone: 'is-overdue',
        },
        {
          id: 'plans',
          count: counts.plans,
          label: this.t('teacher.today_chip_plans'),
          action: this.t('teacher.today_chip_go_plans'),
          clear: this.t('teacher.today_chip_clear_plans'),
          aria: counts.plans
            ? this.t('teacher.today_chip_plans_label', { count: counts.plans })
            : this.t('teacher.today_chip_clear_plans'),
          tone: '',
        },
        {
          id: 'messages',
          count: counts.unread,
          label: this.t('teacher.today_chip_messages'),
          action: this.t('teacher.today_chip_go_messages'),
          clear: this.t('teacher.today_chip_clear_messages'),
          aria: counts.unread
            ? this.t('teacher.today_chip_messages_label', { count: counts.unread })
            : this.t('teacher.today_chip_clear_messages'),
          tone: '',
        },
      ]
    },
    recentCompletions() {
      return this.overview?.recent_completions || []
    },
    planRows() {
      return this.overview?.plan_progress?.rows || []
    },
    attentionSource() {
      if (this.attentionPreview.length) return this.attentionPreview
      const inactive = this.overview.inactive || []
      const extra = (this.overview.recently_active || []).filter((student) => student.needs_attention)
      const seen = new Set()
      return [...inactive, ...extra].filter((student) => {
        if (!student?.needs_attention || seen.has(student.id)) return false
        seen.add(student.id)
        return true
      }).sort((a, b) => teacherAttentionRank(a) - teacherAttentionRank(b))
    },
    actionQueue() {
      return teacherActionQueue(this.overview, this.attentionSource)
    },
    attentionRows() {
      const queued = new Set(this.actionQueue.map((item) => item.studentId))
      return this.attentionSource.filter((student) => !queued.has(Number(student.id)))
    },
    attentionEmpty() {
      if (this.actionQueue.length) return this.t('teacher.overview_attention_rest_empty')
      return this.t('teacher.need_look_empty')
    },
  },
  methods: {
    trendSeries(points, secondaryLabel) {
      const completed = cssThemeColor('--teacher-accent', cssThemeColor('--accent', '#3f6f6d'))
      const scheduled = cssThemeColor('--teacher-warning', '#a66d2c')
      return {
        labels: points.map((point) => String(point.date || '').slice(5)),
        datasets: [
          {
            label: this.t('teacher.trend_completed'),
            data: points.map((point) => Number(point.completed || 0)),
            backgroundColor: completed,
            hoverBackgroundColor: cssThemeColor('--teacher-accent-strong', completed),
            borderRadius: 5,
            borderSkipped: false,
            maxBarThickness: this.chartDays <= 30 ? 14 : 9,
          },
          {
            label: secondaryLabel,
            data: points.map((point) => Number(point.scheduled || 0)),
            backgroundColor: scheduled,
            hoverBackgroundColor: cssThemeColor('--teacher-warning-strong', scheduled),
            borderRadius: 5,
            borderSkipped: false,
            maxBarThickness: this.chartDays <= 30 ? 14 : 9,
          },
        ],
      }
    },
    initial: studentInitial,
    scoreTone: scoreBadgeTone,
    activityLabel(student) {
      const action = teacherAttentionAction(student, this.t)
      const when = this.formatWhen(student.last_activity_at)
      return when ? `${action.label} · ${when}` : action.label
    },
    openActivity(student) {
      const action = teacherAttentionAction(student, this.t)
      if (action.assign) {
        this.$emit('assign-revision', student)
        return
      }
      this.openStudent(student.id, action.section || 'ai', action.focus || null)
    },
    openStudent(id, section = 'ai', focus = null) {
      this.$emit('open-student', id, section, focus)
    },
    queueAction(item) {
      if (item.kind === 'recitation') return this.t('teacher.overview_action_review')
      if (item.kind === 'overdue') return this.t('teacher.overview_action_overdue')
      if (item.kind === 'decision') {
        return item.status === 'accepted'
          ? this.t('teacher.overview_queue_open_plan')
          : this.t('teacher.overview_queue_decide')
      }
      const student = this.attentionSource.find((row) => Number(row.id) === item.studentId)
      return student ? teacherAttentionAction(student, this.t).label : this.t('teacher.overview_action_progress')
    },
    queueAria(item) {
      return `${item.name}. ${item.detail}. ${this.queueAction(item)}`
    },
    openQueueItem(item) {
      if (item.kind === 'recitation') {
        this.openStudent(item.studentId, 'ai', { attemptId: item.recordId })
        return
      }
      if (item.kind === 'overdue') {
        this.openStudent(item.studentId, 'tasks', { taskId: item.recordId })
        return
      }
      if (item.kind === 'decision') {
        this.openStudent(item.studentId, 'plan')
        return
      }
      const student = this.attentionSource.find((row) => Number(row.id) === item.studentId)
      if (student) {
        this.openActivity(student)
        return
      }
      this.openStudent(item.studentId, 'ai')
    },
    openPriority(item) {
      if (!item.count) return
      if (item.id === 'recitations') {
        this.$emit('open-reviews')
        return
      }
      if (item.id === 'plans') {
        this.$emit('open-plans')
        return
      }
      if (item.id === 'messages') {
        const studentId = Number(this.overview?.snapshot?.unread_student_id || 0)
        if (studentId > 0) this.openStudent(studentId, 'messages')
        return
      }
      this.$emit('open-assignments', 'overdue')
    },
    planDetail(row) {
      const progress = this.t('teacher.plan_progress', { done: row.completed || 0, total: row.total || 0 })
      return row.title ? `${row.title} · ${progress}` : progress
    },
    revisionWhen(row) {
      if (row.overdue && row.due_at) return this.t('teacher.reviews_revision_was_due', { date: this.formatWhen(row.due_at) })
      if (row.due_at) return this.t('teacher.task_due_date', { date: this.formatWhen(row.due_at) })
      return this.t('teacher.no_due_date')
    },
    revisionDetail(row) {
      const when = this.revisionWhen(row)
      return when ? `${row.label} · ${when}` : row.label
    },
    revisionStatus(row) {
      if (row.overdue || row.status === 'overdue') return this.t('teacher.status_overdue')
      const key = {
        pending: 'teacher.status_pending',
        in_progress: 'teacher.status_in_progress',
        awaiting_confirmation: 'teacher.status_awaiting_confirmation',
      }[row.status]
      return this.t(key || 'teacher.status_pending')
    },
  },
}
</script>
