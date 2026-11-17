<template>
  <section class="teacher-stack" aria-labelledby="teacher-reviews-heading">
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

    <div v-else class="teacher-overview-columns">
      <TeacherSectionPane :title="t('teacher.reviews_recent')" :hint="t('teacher.reviews_recent_hint')" icon="bi bi-ear" flat>
        <ul v-if="recent.length" class="teacher-activity-list">
          <li v-for="row in recent" :key="row.id">
            <button type="button" @click="openStudent(row.student_id, 'ai')">
              <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.student_name) }}</span>
              <span class="teacher-activity-list__copy">
                <strong>{{ row.student_name }}</strong>
                <small>{{ rangeLabel(row) }} · {{ formatWhen(row.created_at) }}</small>
                <small v-if="bandLabel(row.band)">{{ bandLabel(row.band) }}</small>
              </span>
              <span v-if="typeof row.accuracy_percent === 'number'" class="teacher-activity-list__score" :class="scoreClass(row.accuracy_percent)">
                {{ row.accuracy_percent }}%
                <small>{{ t('teacher.reviews_words_matched') }}</small>
              </span>
              <span v-else></span>
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
        <p v-else class="mb-0">{{ t('teacher.reviews_recent_empty') }}</p>
      </TeacherSectionPane>

      <div class="teacher-overview-secondary">
        <TeacherSectionPane :title="t('teacher.reviews_flags')" :hint="t('teacher.reviews_flags_hint')" icon="bi bi-bullseye" tone="warn" flat>
          <ul v-if="flags.length" class="teacher-activity-list">
            <li v-for="row in flags" :key="row.student_id">
              <button type="button" @click="openStudent(row.student_id, 'ai')">
                <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.student_name) }}</span>
                <span class="teacher-activity-list__copy">
                  <strong>{{ row.student_name }}</strong>
                  <small>{{ flagDetail(row) }}</small>
                  <small v-if="row.last_identified_at">{{ t('teacher.reviews_flag_seen', { when: formatWhen(row.last_identified_at) }) }}</small>
                </span>
                <span class="teacher-activity-list__score">{{ flagCount(row) }}</span>
                <i class="bi bi-chevron-right" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
          <p v-else class="mb-0">{{ t('teacher.reviews_flags_empty') }}</p>
        </TeacherSectionPane>

        <TeacherSectionPane :title="t('teacher.reviews_revision')" :hint="t('teacher.reviews_revision_hint')" icon="bi bi-arrow-repeat" flat>
          <ul v-if="revision.length" class="teacher-activity-list">
            <li v-for="row in revision" :key="row.recipient_id">
              <button type="button" @click="openStudent(row.student_id, 'tasks')">
                <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.student_name) }}</span>
                <span class="teacher-activity-list__copy">
                  <strong>{{ row.student_name }}</strong>
                  <small>{{ row.label }}</small>
                  <small v-if="row.overdue">{{ t('teacher.overdue') }}<template v-if="row.due_at"> · {{ formatWhen(row.due_at) }}</template></small>
                  <small v-else-if="row.due_at">{{ t('teacher.task_due_date', { date: formatWhen(row.due_at) }) }}</small>
                </span>
                <span class="teacher-activity-list__score" :class="{ 'teacher-activity-list__score--warn': row.overdue }">{{ statusLabel(row.status) }}</span>
                <i class="bi bi-chevron-right" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
          <p v-else class="mb-0">{{ t('teacher.reviews_revision_empty') }}</p>
        </TeacherSectionPane>
      </div>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { studentInitial } from '../../scripts/teacher/formatters'
import TeacherSectionPane from './TeacherSectionPane.vue'

export default {
  name: 'TeacherReviewsSection',
  components: { TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    overview: { type: Object, default: null },
    formatWhen: { type: Function, required: true },
  },
  emits: ['open-student'],
  computed: {
    recent() {
      return this.overview?.recent_ai || []
    },
    flags() {
      return this.overview?.difficulty_queue || []
    },
    revision() {
      return [...(this.overview?.outstanding_revision || [])].sort((a, b) => {
        if (Boolean(a.overdue) !== Boolean(b.overdue)) return a.overdue ? -1 : 1
        return String(a.due_at || '9999').localeCompare(String(b.due_at || '9999'))
      })
    },
  },
  methods: {
    initial(name) {
      return studentInitial(name)
    },
    openStudent(id, section) {
      this.$emit('open-student', id, section)
    },
    rangeLabel(row) {
      const name = row.surah_name || ''
      if (!row.ayah_start) return name
      const end = row.ayah_end && row.ayah_end !== row.ayah_start ? `–${row.ayah_end}` : ''
      return `${name} · ${row.ayah_start}${end}`
    },
    bandLabel(band) {
      if (band === 'strong') return this.t('teacher.reviews_band_strong')
      if (band === 'mixed') return this.t('teacher.reviews_band_mixed')
      if (band === 'weak') return this.t('teacher.reviews_band_weak')
      return ''
    },
    scoreClass(percent) {
      if (percent >= 80) return 'teacher-activity-list__score--good'
      if (percent < 60) return 'teacher-activity-list__score--warn'
      return ''
    },
    flagCount(row) {
      const count = Number(row.difficulty_count || 0)
      return count === 1 ? this.t('teacher.reviews_flag_one') : this.t('teacher.reviews_flag_count', { count })
    },
    flagDetail(row) {
      const passages = Array.isArray(row.passages) ? row.passages.filter(Boolean) : []
      if (!passages.length) return this.t('teacher.reviews_flag_count', { count: row.difficulty_count })
      const more = passages.length > 1
        ? this.t('teacher.reviews_flag_more', { count: passages.length - 1 })
        : ''
      return [this.t('teacher.reviews_flag_latest', { passage: passages[0] }), more].filter(Boolean).join(' · ')
    },
    statusLabel(status) {
      const key = {
        pending: 'teacher.status_pending',
        in_progress: 'teacher.status_in_progress',
        awaiting_confirmation: 'teacher.status_awaiting_confirmation',
        completed: 'teacher.status_completed',
        overdue: 'teacher.overdue',
      }[status]
      return key ? this.t(key) : ''
    },
  },
}
</script>
