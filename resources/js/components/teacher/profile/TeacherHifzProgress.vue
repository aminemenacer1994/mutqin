<template>
  <section class="teacher-profile-sheet teacher-hifz" :aria-label="t('teacher.hifz_progress_title')">
    <header class="teacher-hifz__head">
      <strong>{{ t('teacher.hifz_progress_title') }}</strong>
      <span v-if="coverage.memorised_ayahs">{{ t('teacher.hifz_ayahs', { n: coverage.memorised_ayahs }) }}</span>
    </header>

    <div class="teacher-hifz__line">
      <span class="teacher-hifz__label">{{ t('teacher.hifz_step_knows') }}</span>
      <div>
        <p v-if="passageLine" class="teacher-hifz__lead">{{ passageLine }}</p>
        <p v-else class="teacher-hifz__quiet">{{ t('teacher.hifz_ranges_empty') }}</p>
        <p v-if="coverage.learning_ayahs" class="teacher-hifz__quiet">{{ t('teacher.hifz_still_learning', { n: coverage.learning_ayahs }) }}</p>
      </div>
    </div>

    <div class="teacher-hifz__line">
      <span class="teacher-hifz__label">{{ t('teacher.hifz_step_next') }}</span>
      <div class="teacher-hifz__row">
        <div>
          <p v-if="next" class="teacher-hifz__lead">{{ next.label }}</p>
          <p v-else-if="lessons.next" class="teacher-hifz__lead">{{ lessons.next.label }}</p>
          <p v-else class="teacher-hifz__quiet">{{ t('teacher.hifz_next_none') }}</p>
          <ul v-if="weak.length" class="teacher-hifz__passages">
            <li v-for="spot in weak" :key="spot.id">{{ spot.label }}</li>
          </ul>
        </div>
        <button v-if="next" type="button" class="btn btn-primary btn-sm" @click="$emit('assign', next)">{{ t('teacher.hifz_assign_next') }}</button>
      </div>
    </div>

    <div class="teacher-hifz__line">
      <span class="teacher-hifz__label">{{ t(`teacher.hifz_period_${period}_label`) }}</span>
      <div class="teacher-hifz__status">
        <div class="teacher-hifz__periods" role="group" :aria-label="t('teacher.hifz_period')">
          <button
            v-for="item in periods"
            :key="item"
            type="button"
            :class="{ 'is-active': period === item }"
            :aria-pressed="period === item ? 'true' : 'false'"
            @click="period = item"
          >
            {{ t(`teacher.hifz_period_${item}`) }}
          </button>
        </div>
        <p v-if="reportError" class="teacher-hifz__quiet" role="alert">{{ reportError }}</p>
        <p v-else-if="reportLoading" class="teacher-hifz__quiet" role="status">{{ t('teacher.loading') }}</p>
        <p v-else-if="report">{{ periodLine }}</p>
        <p v-if="showWording" class="teacher-hifz__quiet">{{ wordingLine }}</p>
        <p v-if="mistakeCount" class="teacher-hifz__quiet">{{ t('teacher.hifz_mistakes_count', { n: mistakeCount }) }}</p>
      </div>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { learningApi } from '../../../scripts/api/learning'

const EMPTY_RANGES = { items: [], total: 0, ayahs: 0, omitted: 0 }

export default {
  name: 'TeacherHifzProgress',
  mixins: [i18nMixin],
  props: {
    studentId: { type: [Number, String], required: true },
    hifz: { type: Object, default: null },
    formatWhen: { type: Function, required: true },
  },
  emits: ['assign'],
  data() {
    return {
      periods: ['day', 'week', 'month'],
      period: 'week',
      report: null,
      reportLoading: false,
      reportError: '',
      requestId: 0,
    }
  },
  computed: {
    coverage() {
      return this.hifz?.coverage || {
        memorised_ayahs: 0,
        mushaf_ayahs: 6236,
        coverage_percent: 0,
        learning_ayahs: 0,
        reviewing_ayahs: 0,
        recent_days: 14,
        recent_revision: EMPTY_RANGES,
        older_revision: EMPTY_RANGES,
        ranges: EMPTY_RANGES,
        last_progress_at: null,
      }
    },
    lessons() {
      return this.hifz?.lessons || { completed: 0, pending: 0, next: null }
    },
    weak() {
      return this.hifz?.weak_passages || []
    },
    next() {
      return this.hifz?.next || null
    },
    passageLine() {
      const items = this.coverage.ranges?.items || []
      if (!items.length) return ''
      const shown = items.map((range) => this.rangeLabel(range))
      if (this.coverage.ranges.omitted) shown.push(this.t('teacher.hifz_ranges_more', { n: this.coverage.ranges.omitted }))
      return shown.join(', ')
    },
    periodLine() {
      const tasks = this.report?.tasks || {}
      const revision = this.report?.revision || {}
      const reviewed = Number(revision.reviewed_ayahs || 0)
      const memorised = Number(revision.memorised_ayahs || 0)
      const parts = []
      if (!tasks.due) parts.push(this.t('teacher.hifz_tasks_clear'))
      else {
        parts.push(this.t('teacher.hifz_tasks_simple', { done: tasks.completed || 0, due: tasks.due }))
        if (tasks.missed) parts.push(this.t('teacher.hifz_tasks_missed', { missed: tasks.missed }))
      }
      if (memorised && !reviewed) parts.push(this.t('teacher.hifz_not_reviewed'))
      else if (memorised) parts.push(this.t('teacher.hifz_reviewed_some', { reviewed, memorised }))
      return parts.join(' · ')
    },
    showWording() {
      const wording = this.report?.wording
      return Boolean(wording && wording.direction && wording.direction !== 'insufficient')
    },
    mistakeCount() {
      return Number(this.report?.recurring_mistake_count || 0)
    },
    wordingLine() {
      const wording = this.report?.wording
      if (!wording || wording.direction === 'insufficient') return ''
      const direction = this.t(`teacher.hifz_wording_${wording.direction}`)
      return wording.comparable_passages === 1
        ? this.t('teacher.hifz_wording_direction_one', { direction })
        : this.t('teacher.hifz_wording_direction', { direction, n: wording.comparable_passages })
    },
  },
  watch: {
    studentId: {
      immediate: true,
      handler() { this.loadReport() },
    },
    period() { this.loadReport() },
  },
  methods: {
    rangeLabel(range) {
      const end = range.ayah_end !== range.ayah_start ? `–${range.ayah_end}` : ''
      return `${range.surah_name} · ${range.ayah_start}${end}`
    },
    async loadReport() {
      if (!this.studentId) return
      const requestId = ++this.requestId
      this.reportLoading = true
      this.reportError = ''
      const today = new Date()
      const from = new Date(today)
      if (this.period === 'week') from.setDate(today.getDate() - 6)
      if (this.period === 'month') from.setDate(today.getDate() - 29)
      try {
        const summary = await learningApi.getTeacherStudentReport(this.studentId, {
          from: this.dateKey(from),
          to: this.dateKey(today),
        })
        if (requestId !== this.requestId) return
        this.report = summary?.hifz || null
      } catch (error) {
        if (requestId === this.requestId) this.reportError = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        if (requestId === this.requestId) this.reportLoading = false
      }
    },
    dateKey(date) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    },
  },
}
</script>
