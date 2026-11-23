<template>
  <section class="teacher-profile-sheet teacher-hifz" :aria-label="t('teacher.hifz_progress_title')">
    <header class="teacher-hifz__head">
      <strong>{{ t('teacher.hifz_progress_title') }}</strong>
      <span v-if="validated.validated_ayahs">{{ t('teacher.hifz_validated_ayahs', { n: validated.validated_ayahs }) }}</span>
    </header>

    <div class="teacher-hifz__summary">
      <section class="teacher-hifz__summary-section">
        <header>
          <span class="teacher-hifz__label">{{ t('teacher.hifz_summary_validated') }}</span>
          <span class="teacher-hifz__count">{{ validated.validated_ayahs }}</span>
        </header>
        <p v-if="validatedLine" class="teacher-hifz__lead">{{ validatedLine }}</p>
        <p v-else class="teacher-hifz__quiet">{{ t('teacher.hifz_validated_empty') }}</p>
        <p v-if="validated.last_validated_at" class="teacher-hifz__quiet">{{ t('teacher.hifz_last_validated', { when: formatWhen(validated.last_validated_at) }) }}</p>
        <p v-if="coverage.memorised_ayahs" class="teacher-hifz__quiet">{{ t('teacher.hifz_recorded_progress', { n: coverage.memorised_ayahs }) }}</p>
      </section>

      <section class="teacher-hifz__summary-section">
        <header>
          <span class="teacher-hifz__label">{{ t('teacher.hifz_summary_learning') }}</span>
          <span v-if="coverage.learning_ayahs || lessons.pending" class="teacher-hifz__count">{{ coverage.learning_ayahs || lessons.pending }}</span>
        </header>
        <p v-if="sabaqLine" class="teacher-hifz__lead">{{ sabaqLine }}</p>
        <p v-else-if="nextLesson" class="teacher-hifz__lead">{{ nextLesson.label }}</p>
        <p v-else class="teacher-hifz__quiet">{{ t('teacher.hifz_learning_empty') }}</p>
        <div v-if="nextLesson" class="teacher-hifz__row">
          <p class="teacher-hifz__quiet">{{ nextLessonMeta }}</p>
          <button v-if="!lessons.next && next" type="button" class="btn btn-primary btn-sm" @click="$emit('assign', next)">{{ t('teacher.hifz_assign_next') }}</button>
        </div>
      </section>

      <section class="teacher-hifz__summary-section">
        <header>
          <span class="teacher-hifz__label">{{ t('teacher.hifz_summary_revision') }}</span>
          <span v-if="revisionCount" class="teacher-hifz__count">{{ revisionCount }}</span>
        </header>
        <p v-if="revisionLine" class="teacher-hifz__lead">{{ revisionLine }}</p>
        <p v-else class="teacher-hifz__quiet">{{ t('teacher.hifz_revision_empty') }}</p>
        <p v-if="nextRevisionMeta" class="teacher-hifz__quiet">{{ nextRevisionMeta }}</p>
      </section>
    </div>

    <aside class="teacher-hifz__evidence" aria-label="AI wording match">
      <strong>{{ t('teacher.hifz_wording_match_title') }}</strong>
      <span>{{ wordingSummary }}</span>
      <small>{{ t('teacher.hifz_wording_not_validation') }}</small>
    </aside>
  </section>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'

const EMPTY_RANGES = { items: [], total: 0, ayahs: 0, omitted: 0 }

export default {
  name: 'TeacherHifzProgress',
  mixins: [i18nMixin],
  props: {
    studentId: { type: [Number, String], required: true },
    hifz: { type: Object, default: null },
    recommendations: { type: Array, default: () => [] },
    formatWhen: { type: Function, required: true },
  },
  emits: ['assign'],
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
    validated() {
      return this.hifz?.validated_memorisation || {
        source: 'teacher_approved_assignments',
        validated_ayahs: 0,
        ranges: EMPTY_RANGES,
        last_validated_at: null,
        empty: true,
      }
    },
    wording() {
      return this.hifz?.wording_match || { direction: 'insufficient', comparable_passages: 0, is_tajweed: false }
    },
    lessons() {
      return this.hifz?.lessons || { completed: 0, pending: 0, next: null }
    },
    next() {
      return this.hifz?.next || null
    },
    passageLine() {
      return this.bucketLine(this.coverage.ranges)
    },
    validatedLine() {
      return this.bucketLine(this.validated.ranges)
    },
    wordingSummary() {
      if (!this.wording.comparable_passages) return this.t('teacher.hifz_wording_empty')
      return this.t('teacher.hifz_wording_summary', {
        n: this.wording.comparable_passages,
        direction: this.t(`teacher.hifz_wording_${this.wording.direction}`),
      })
    },
    sabaqLine() {
      return this.bucketLine(this.coverage.new_memorisation)
    },
    nextLesson() {
      return this.lessons.next || (this.next?.activity === 'hifz' ? this.next : null)
    },
    nextLessonMeta() {
      const parts = []
      if (this.nextLesson?.due_at) parts.push(this.t('teacher.task_due_date', { date: this.formatWhen(this.nextLesson.due_at) }))
      if (this.lessons.pending) parts.push(this.t('teacher.hifz_active_lessons', { n: this.lessons.pending }))
      return parts.join(' · ')
    },
    nextRevision() {
      return this.recommendations[0] || (this.next?.activity === 'revision' ? this.next : null)
    },
    revisionCount() {
      return this.recommendations.length || Number(this.coverage.reviewing_ayahs || 0)
    },
    revisionLine() {
      if (this.nextRevision?.label) return this.nextRevision.label
      return this.bucketLine(this.coverage.older_revision) || this.bucketLine(this.coverage.recent_revision)
    },
    nextRevisionMeta() {
      if (!this.nextRevision) return ''
      const parts = []
      if (this.nextRevision.last_reviewed_at) parts.push(this.t('teacher.hifz_last_reviewed', { when: this.formatWhen(this.nextRevision.last_reviewed_at) }))
      if (this.nextRevision.due_on) parts.push(this.t('teacher.task_due_date', { date: this.formatWhen(this.nextRevision.due_on) }))
      return parts.join(' · ')
    },
    lastMemorisedReview() {
      return (this.coverage.ranges?.items || []).reduce((latest, range) => {
        const value = range?.last_reviewed_at || ''
        return value && (!latest || value > latest) ? value : latest
      }, '')
    },
  },
  methods: {
    bucketLine(bucket) {
      const items = bucket?.items || []
      if (!items.length) return ''
      const shown = items.map((range) => this.rangeLabel(range))
      if (bucket.omitted) shown.push(this.t('teacher.hifz_ranges_more', { n: bucket.omitted }))
      return shown.join(', ')
    },
    rangeLabel(range) {
      const end = range.ayah_end !== range.ayah_start ? `–${range.ayah_end}` : ''
      return `${range.surah_name} · ${range.ayah_start}${end}`
    },
  },
}
</script>
