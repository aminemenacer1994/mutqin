<template>
  <section class="parent-home">
    <header class="parent-page">
      <span class="parent-page__icon" aria-hidden="true"><i class="bi bi-calendar2-heart"></i></span>
      <div>
        <h1>{{ t('parent.reports_title') }}</h1>
        <p>{{ t('parent.reports_hint') }}</p>
      </div>
    </header>

    <div class="parent-filters parent-report-controls">
      <label v-if="children.length" class="parent-report-field">
        <span class="parent-report-field__label">{{ t('parent.child_filter') }}</span>
        <select
          class="parent-report-select"
          :value="childSelectValue"
          :aria-label="t('parent.child_filter')"
          @change="onChildChange"
        >
          <option value="">{{ t('parent.child_all') }}</option>
          <option v-for="child in children" :key="child.id" :value="child.id">{{ child.name }}</option>
        </select>
      </label>
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
    <p v-else-if="error" class="alert alert-danger" role="alert">
      {{ t('parent.reports_failed') }}
      <button type="button" class="btn btn-link" @click="load">{{ t('parent.reports_retry') }}</button>
    </p>

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

        <div v-if="kpiCards.length" class="parent-stats parent-stats--reports" role="list">
          <article v-for="card in kpiCards" :key="card.key" class="parent-stat" role="listitem">
            <span aria-hidden="true"><i :class="card.icon"></i></span>
            <strong>{{ card.value }}</strong>
            <small>{{ card.label }}</small>
            <p class="parent-stat__hint">{{ card.hint }}</p>
          </article>
        </div>

        <section v-if="showOverview" class="parent-panel">
          <h2><i class="bi bi-card-text" aria-hidden="true"></i>{{ t('parent.reports_overview') }}</h2>
          <div v-if="active.narrative?.text" class="parent-report-prose">
            <p>{{ active.narrative.text }}</p>
          </div>
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
          <p v-if="active.comparison?.plain" class="parent-report-prose">{{ active.comparison.plain }}</p>
          <p v-if="active.goals?.plain" class="parent-report-prose">{{ active.goals.plain }}</p>
          <div v-if="sourceLabels.length" class="parent-report-sources">
            <span class="parent-report__subhead">{{ t('parent.reports_sources') }}</span>
            <ul class="parent-pills--sources" role="list">
              <li v-for="(label, index) in sourceLabels" :key="`${label}-${index}`" role="listitem">
                <span class="parent-report-source">{{ label }}</span>
              </li>
            </ul>
          </div>
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
          <p v-if="active.assignments?.plain" class="parent-report-prose">{{ active.assignments.plain }}</p>
          <ul v-if="assignmentItems.length" class="parent-report-items">
            <li v-for="(item, index) in assignmentItems" :key="`${item.label}-${index}`">
              <span class="parent-report-item__label" :title="item.label">{{ item.label }}</span>
              <span class="parent-status" :class="statusClass(assignmentStatus(item))">{{ statusLabel(assignmentStatus(item)) }}</span>
            </li>
          </ul>
        </section>

        <section v-if="showPractice" class="parent-panel">
          <h2><i class="bi bi-activity" aria-hidden="true"></i>{{ t('parent.reports_section_practice') }}</h2>
          <p v-if="active.activity?.plain" class="parent-report-prose">{{ active.activity.plain }}</p>
          <p v-if="active.wording?.plain" class="parent-report-prose">
            <strong>{{ t('parent.reports_wording') }}.</strong>
            {{ active.wording.plain }}
          </p>
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

        <section v-if="recommendations.length" class="parent-suggest">
          <h2><i class="bi bi-lightbulb" aria-hidden="true"></i>{{ t('parent.reports_next_steps') }}</h2>
          <ul>
            <li v-for="(item, index) in recommendations" :key="`${item.label}-${index}`">
              <strong v-if="item.label">{{ item.label }}</strong>
              <span v-if="item.text">{{ item.text }}</span>
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
import TeacherEmpty from '../teacher/TeacherEmpty.vue'

export default {
  name: 'ParentFamilyReports',
  components: { TeacherEmpty },
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
      if (!this.active) return []
      const rows = []
      const activity = this.active.activity
      const assignments = this.active.assignments
      if (assignments) {
        rows.push({
          key: 'assigned',
          label: this.t('parent.reports_period_assigned'),
          value: String(assignments.assigned ?? 0),
        })
        rows.push({
          key: 'completed',
          label: this.t('parent.reports_period_completed'),
          value: String(assignments.completed ?? 0),
        })
      }
      if (activity) {
        rows.push({
          key: 'practice',
          label: this.t('parent.reports_period_practice'),
          value: String(activity.practice_rows ?? 0),
        })
        rows.push({
          key: 'revision',
          label: this.t('parent.reports_period_revision'),
          value: String(activity.revision_sessions ?? 0),
        })
        rows.push({
          key: 'memorised',
          label: this.t('parent.reports_period_memorised'),
          value: String(activity.memorised_in_period ?? 0),
        })
      }
      return rows
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
    recommendations() {
      const rows = this.active?.feedback?.recommendations
      return Array.isArray(rows) ? rows : []
    },
    showHomework() {
      return Boolean(this.active?.assignments && (this.active.assignments.plain || this.assignmentItems.length))
    },
    showPractice() {
      return Boolean(this.active?.activity?.plain || this.active?.wording?.plain)
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
  },
}
</script>