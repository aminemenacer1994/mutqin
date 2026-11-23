<template>
  <section class="parent-home">
    <header class="parent-page">
      <span class="parent-page__icon" aria-hidden="true"><i class="bi bi-calendar2-heart"></i></span>
      <div>
        <h1>{{ t('parent.reports_title') }}</h1>
        <p>{{ t('parent.reports_hint') }}</p>
      </div>
    </header>

    <div class="parent-filters">
      <ParentChildFilter :children="children" :selected-id="selectedId" @select="$emit('select-child', $event)" />
      <div class="parent-pills" role="group" :aria-label="t('parent.reports_cadence')">
        <button type="button" :class="{ 'is-active': cadence === 'week' }" :aria-pressed="cadence === 'week' ? 'true' : 'false'" @click="setCadence('week')">{{ t('parent.reports_week') }}</button>
        <button type="button" :class="{ 'is-active': cadence === 'month' }" :aria-pressed="cadence === 'month' ? 'true' : 'false'" @click="setCadence('month')">{{ t('parent.reports_month') }}</button>
      </div>
    </div>

    <p v-if="loading" class="teacher-meta" role="status">{{ t('parent.reports_loading') }}</p>
    <p v-else-if="error" class="alert alert-danger" role="alert">
      {{ t('parent.reports_failed') }}
      <button type="button" class="btn btn-link" @click="load">{{ t('parent.reports_retry') }}</button>
    </p>

    <template v-else>
      <ul v-if="!selectedId && family?.children?.length" class="parent-tasks">
        <li v-for="child in family.children" :key="child.child_id" class="parent-task">
          <button type="button" @click="$emit('select-child', child.child_id)">
            <span class="parent-task__icon" aria-hidden="true"><i class="bi bi-person"></i></span>
            <span class="parent-task__copy">
              <strong>{{ child.name }}</strong>
              <small>{{ child.period_label || t('parent.reports_empty') }}</small>
            </span>
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
        </li>
      </ul>

      <TeacherEmpty v-if="!reports.length && (selectedId || !family?.children?.length)" illustrated icon="bi bi-calendar2" :message="t('parent.reports_empty')" />

      <article v-else-if="selectedId && active" class="parent-report">
        <header>
          <div>
            <h2>{{ active.period_label }}</h2>
            <p v-if="preparedHint">{{ preparedHint }}</p>
          </div>
          <a class="parent-download" :href="`/api/parent/reports/${active.id}/download`">
            <i class="bi bi-download" aria-hidden="true"></i>{{ t('parent.reports_download') }}
          </a>
        </header>
        <p v-if="active.assignments?.plain">{{ active.assignments.plain }}</p>
        <p v-if="active.activity?.plain">{{ active.activity.plain }}</p>
        <p v-if="active.goals?.plain">{{ active.goals.plain }}</p>
        <ul v-if="active.attention?.length">
          <li v-for="(item, index) in active.attention.slice(0, 3)" :key="`${item.kind}-${index}`">{{ item.label }}</li>
        </ul>
        <blockquote v-if="active.feedback?.notes?.[0]">
          <p>“{{ active.feedback.notes[0].excerpt }}”</p>
          <footer>{{ active.feedback.notes[0].teacher }}</footer>
        </blockquote>
        <div v-if="reports.length > 1" class="parent-pills">
          <button
            v-for="report in reports"
            :key="report.id"
            type="button"
            :class="{ 'is-active': report.id === active.id }"
            @click="activeId = report.id"
          >
            {{ report.period_label }}
          </button>
        </div>
      </article>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import ParentChildFilter from './ParentChildFilter.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'

export default {
  name: 'ParentFamilyReports',
  components: { ParentChildFilter, TeacherEmpty },
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
    active() {
      return this.reports.find((report) => report.id === this.activeId) || this.reports[0] || null
    },
    preparedHint() {
      if (!this.active?.generated_at) return ''
      const when = new Date(this.active.generated_at)
      const label = Number.isNaN(when.getTime()) ? this.active.generated_at : when.toLocaleString()
      return `${this.t('parent.reports_prepared')} ${label}`
    },
    metrics() {
      if (!this.active) return []
      const rows = []
      if (this.active.assignments) {
        rows.push({ label: this.t('parent.reports_homework'), value: `${this.active.assignments.completed}/${this.active.assignments.assigned}` })
      }
      if (this.active.activity) {
        rows.push({ label: this.t('parent.reports_practice'), value: String(this.active.activity.practice_rows) })
      }
      return rows
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
  },
}
</script>
