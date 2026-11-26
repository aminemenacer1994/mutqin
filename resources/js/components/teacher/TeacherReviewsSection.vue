<template>
  <section class="teacher-stack teacher-review-page" aria-labelledby="teacher-reviews-heading">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('teacher.workspace_label') }}</p>
        <h1 id="teacher-reviews-heading" class="teacher-page-header__title">{{ t('teacher.nav_reviews') }}</h1>
        <p class="teacher-page-header__hint">{{ t('teacher.reviews_help') }}</p>
      </div>
    </header>

    <div v-if="!overview" class="teacher-skeletons" role="status">
      <div class="teacher-skeleton"></div>
      <span class="visually-hidden">{{ t('teacher.loading') }}</span>
    </div>

    <template v-else>
      <div class="teacher-recite__segments teacher-review-page__filters" role="group" :aria-label="t('teacher.reviews_filter_label')">
        <button
          v-for="filter in filters"
          :key="filter.id"
          type="button"
          :class="['is-' + filter.id, { 'is-active': filterId === filter.id }]"
          :aria-pressed="filterId === filter.id ? 'true' : 'false'"
          @click="selectFilter(filter.id)"
        >
          {{ filter.label }}<span>{{ filter.count }}</span>
        </button>
      </div>
      <p class="teacher-review-page__hint">{{ filterHint }}</p>

      <ul v-if="visible.length" class="teacher-review-list">
        <li v-for="row in visible" :key="`${row.review_status || filterId}-${row.id}`">
          <button type="button" class="teacher-review-list__row" :aria-label="rowAria(row)" @click="openRow(row)">
            <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.student_name) }}</span>
            <span class="teacher-activity-list__copy">
              <strong>{{ row.student_name }}</strong>
              <small>{{ rangeLabel(row) }} · {{ formatWhen(row.created_at) }}</small>
              <span class="teacher-review-list__meta">
                <span class="teacher-badge" :class="statusClass(row)">{{ statusLabel(row) }}</span>
                <span class="teacher-review-list__recording">{{ recordingLabel(row) }}</span>
              </span>
            </span>
            <TeacherWordingMatch v-if="typeof row.accuracy_percent === 'number'" class="teacher-activity-list__score teacher-review-list__score" :class="scoreClass(row.accuracy_percent)">
              {{ row.accuracy_percent }}%
              <small>{{ t('teacher.reviews_words_matched') }}</small>
            </TeacherWordingMatch>
            <span class="teacher-review-list__action">{{ actionLabel(row) }}</span>
          </button>
        </li>
      </ul>
      <div v-else class="teacher-review-empty">
        <TeacherEmpty illustrated icon="bi bi-ear" :message="emptyMessage" />
        <button v-if="emptyAction" type="button" class="btn btn-primary btn-sm" @click="selectFilter(emptyAction.id)">
          {{ emptyAction.label }}
        </button>
      </div>
      <TeacherMore :remaining="currentRows.length - shown" :shown="shown" :initial="preview" @more="shown = currentRows.length" @less="shown = preview" />
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { studentInitial, teacherDeskCounts, teacherReviewView } from '../../scripts/teacher/formatters'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherMore from './TeacherMore.vue'
import TeacherWordingMatch from './TeacherWordingMatch.vue'

const PREVIEW = 8

export default {
  name: 'TeacherReviewsSection',
  components: { TeacherEmpty, TeacherMore, TeacherWordingMatch },
  mixins: [i18nMixin],
  props: {
    overview: { type: Object, default: null },
    formatWhen: { type: Function, required: true },
  },
  emits: ['open-student'],
  data() {
    return {
      preview: PREVIEW,
      shown: PREVIEW,
      filterId: 'history',
    }
  },
  computed: {
    deskCounts() {
      return teacherDeskCounts(this.overview)
    },
    filters() {
      return [
        { id: 'history', label: this.t('teacher.reviews_filter_history'), count: this.deskCounts.recitationHistory },
        { id: 'awaiting', label: this.t('teacher.reviews_filter_awaiting'), count: this.deskCounts.recitations },
        { id: 'reviewed', label: this.t('teacher.reviews_filter_reviewed'), count: this.deskCounts.reviewedRecitations },
      ]
    },
    filterHint() {
      const key = {
        awaiting: 'teacher.reviews_awaiting_hint',
        reviewed: 'teacher.reviews_reviewed_hint',
        history: 'teacher.reviews_history_hint',
      }[this.filterId]
      return this.t(key || 'teacher.reviews_awaiting_hint')
    },
    currentRows() {
      return teacherReviewView(this.overview, this.filterId)
    },
    visible() {
      return this.currentRows.slice(0, this.shown)
    },
    emptyMessage() {
      const key = {
        awaiting: 'teacher.reviews_empty_awaiting',
        reviewed: 'teacher.reviews_empty_reviewed',
        history: 'teacher.reviews_empty_history',
      }[this.filterId]
      return this.t(key || 'teacher.reviews_empty_awaiting')
    },
    emptyAction() {
      const history = { id: 'history', label: this.t('teacher.reviews_show_history') }
      const reviewed = { id: 'reviewed', label: this.t('teacher.reviews_show_reviewed') }
      const awaiting = { id: 'awaiting', label: this.t('teacher.reviews_show_awaiting') }
      if (this.filterId === 'awaiting') {
        if (this.deskCounts.recitationHistory > 0) return history
        if (this.deskCounts.reviewedRecitations > 0) return reviewed
      }
      if (this.filterId === 'reviewed') {
        if (this.deskCounts.recitations > 0) return awaiting
        if (this.deskCounts.recitationHistory > 0) return history
      }
      if (this.filterId === 'history') {
        if (this.deskCounts.recitations > 0) return awaiting
        if (this.deskCounts.reviewedRecitations > 0) return reviewed
      }
      return null
    },
  },
  methods: {
    selectFilter(id) {
      this.filterId = id === 'reviewed' || id === 'history' ? id : 'awaiting'
      this.shown = this.preview
    },
    initial(name) {
      return studentInitial(name)
    },
    openRow(row) {
      if (!row?.student_id) return
      this.$emit('open-student', row.student_id, 'ai', row.id ? { attemptId: row.id } : null)
    },
    rangeLabel(row) {
      const name = row.surah_name || ''
      if (!row.ayah_start) return name
      const end = row.ayah_end && row.ayah_end !== row.ayah_start ? `–${row.ayah_end}` : ''
      return `${name} · ${row.ayah_start}${end}`
    },
    scoreClass(percent) {
      if (percent >= 80) return 'teacher-activity-list__score--good'
      if (percent < 60) return 'teacher-activity-list__score--warn'
      return ''
    },
    statusLabel(row) {
      const key = {
        awaiting: 'teacher.reviews_status_awaiting',
        reviewed: 'teacher.reviews_status_reviewed',
        history: 'teacher.reviews_status_history',
      }[row?.review_status]
      return this.t(key || 'teacher.reviews_status_history')
    },
    statusClass(row) {
      if (row?.review_status === 'reviewed') return 'teacher-badge--good'
      if (row?.review_status === 'awaiting') return 'teacher-badge--warn'
      return 'teacher-badge--muted'
    },
    recordingLabel(row) {
      return this.t(row?.has_recording ? 'teacher.reviews_recording_ready' : 'teacher.reviews_recording_none')
    },
    actionLabel(row) {
      return this.t(row?.has_recording ? 'teacher.reviews_hear' : 'teacher.reviews_open')
    },
    rowAria(row) {
      return [row.student_name, this.rangeLabel(row), this.statusLabel(row), this.recordingLabel(row), this.actionLabel(row)].filter(Boolean).join('. ')
    },
  },
}
</script>
