<template>
  <section class="teacher-stack" aria-labelledby="teacher-reviews-heading">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('teacher.workspace_label') }}</p>
        <h1 id="teacher-reviews-heading" class="teacher-page-header__title">{{ t('teacher.nav_reviews') }}</h1>
        <p class="teacher-page-header__hint">{{ t('teacher.reviews_help') }}</p>
        <p v-if="legacyCount" class="teacher-page-header__hint">{{ t('teacher.reviews_legacy_note', { n: legacyCount }) }}</p>
      </div>
    </header>
    <section v-if="deskCounts.reviews || deskCounts.overdue" class="teacher-priorities">
      <p>{{ t('teacher.reviews_today_note') }}</p>
      <div class="teacher-priorities__actions">
        <button v-if="deskCounts.reviews" type="button" class="btn btn-primary btn-sm" @click="$emit('open-assignments', 'submitted')">{{ t('teacher.today_review_submissions') }}</button>
        <button v-if="deskCounts.overdue" type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('open-assignments', 'overdue')">{{ t('teacher.today_overdue_tasks') }}</button>
      </div>
    </section>

    <div v-if="!overview" class="teacher-skeletons" role="status">
      <div class="teacher-skeleton"></div>
      <span class="visually-hidden">{{ t('teacher.loading') }}</span>
    </div>

    <div v-else class="teacher-overview-columns">
      <TeacherSectionPane :title="t('teacher.reviews_recent')" :hint="t('teacher.reviews_recent_hint')" icon="bi bi-ear" flat>
        <ul v-if="recentVisible.length" class="teacher-activity-list">
          <li v-for="row in recentVisible" :key="row.id" :class="{ 'has-wording': typeof row.accuracy_percent === 'number' }">
            <button type="button" @click="openStudent(row.student_id, 'ai')">
              <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.student_name) }}</span>
              <span class="teacher-activity-list__copy">
                <strong>{{ row.student_name }}</strong>
                <small>{{ rangeLabel(row) }} · {{ formatWhen(row.created_at) }}</small>
              </span>
              <span v-if="typeof row.accuracy_percent !== 'number'"></span>
              <i v-if="typeof row.accuracy_percent !== 'number'" class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
            <TeacherWordingMatch v-if="typeof row.accuracy_percent === 'number'" class="teacher-activity-list__score" :class="scoreClass(row.accuracy_percent)">
              {{ row.accuracy_percent }}%
              <small>{{ t('teacher.reviews_words_matched') }}</small>
            </TeacherWordingMatch>
            <i v-if="typeof row.accuracy_percent === 'number'" class="bi bi-chevron-right" aria-hidden="true"></i>
          </li>
        </ul>
        <p v-else class="mb-0">{{ t('teacher.reviews_recent_empty') }}</p>
        <TeacherMore :remaining="recent.length - recentShown" :shown="recentShown" :initial="preview" @more="recentShown = recent.length" @less="recentShown = preview" />
      </TeacherSectionPane>

      <div class="teacher-overview-secondary">
        <TeacherSectionPane :title="t('teacher.reviews_flags')" :hint="t('teacher.reviews_flags_hint')" icon="bi bi-bullseye" tone="warn" flat>
          <ul v-if="flagsVisible.length" class="teacher-activity-list">
            <li v-for="row in flagsVisible" :key="row.student_id">
              <button type="button" @click="openStudent(row.student_id, 'ai')">
                <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.student_name) }}</span>
                <span class="teacher-activity-list__copy">
                  <strong>{{ row.student_name }}</strong>
                  <small>{{ flagDetail(row) }}</small>
                  <small v-if="row.last_identified_at">{{ t('teacher.reviews_flag_seen', { when: formatWhen(row.last_identified_at) }) }}</small>
                </span>
                <span class="teacher-activity-list__score">{{ t('teacher.reviews_flag_action') }}<small>{{ flagCount(row) }}</small></span>
                <i class="bi bi-chevron-right" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
          <p v-else class="mb-0">{{ t('teacher.reviews_flags_empty') }}</p>
          <TeacherMore :remaining="flags.length - flagsShown" :shown="flagsShown" :initial="preview" @more="flagsShown = flags.length" @less="flagsShown = preview" />
        </TeacherSectionPane>

        <TeacherSectionPane :title="t('teacher.reviews_revision')" :hint="t('teacher.reviews_revision_hint')" icon="bi bi-arrow-repeat" flat>
          <ul v-if="revisionVisible.length" class="teacher-activity-list">
            <li v-for="row in revisionVisible" :key="row.recipient_id">
              <button type="button" @click="openStudent(row.student_id, 'tasks')">
                <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.student_name) }}</span>
                <span class="teacher-activity-list__copy">
                  <strong>{{ row.student_name }}</strong>
                  <small>{{ row.label }}</small>
                  <small v-if="row.overdue && row.due_at">{{ t('teacher.reviews_revision_was_due', { date: formatWhen(row.due_at) }) }}</small>
                  <small v-else-if="row.due_at">{{ t('teacher.task_due_date', { date: formatWhen(row.due_at) }) }}</small>
                </span>
                <span class="teacher-activity-list__score" :class="{ 'teacher-activity-list__score--warn': row.overdue }">{{ revisionAction(row) }}</span>
                <i class="bi bi-chevron-right" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
          <p v-else class="mb-0">{{ t('teacher.reviews_revision_empty') }}</p>
          <TeacherMore :remaining="revision.length - revisionShown" :shown="revisionShown" :initial="preview" @more="revisionShown = revision.length" @less="revisionShown = preview" />
        </TeacherSectionPane>
      </div>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { studentInitial, teacherDeskCounts } from '../../scripts/teacher/formatters'
import TeacherMore from './TeacherMore.vue'
import TeacherSectionPane from './TeacherSectionPane.vue'
import TeacherWordingMatch from './TeacherWordingMatch.vue'

const PREVIEW = 4

export default {
  name: 'TeacherReviewsSection',
  components: { TeacherMore, TeacherSectionPane, TeacherWordingMatch },
  mixins: [i18nMixin],
  props: {
    overview: { type: Object, default: null },
    formatWhen: { type: Function, required: true },
  },
  emits: ['open-student', 'open-assignments'],
  data() {
    return {
      preview: PREVIEW,
      recentShown: PREVIEW,
      flagsShown: PREVIEW,
      revisionShown: PREVIEW,
    }
  },
  computed: {
    deskCounts() {
      return teacherDeskCounts(this.overview)
    },
    legacyCount() {
      return Number(this.deskCounts.legacyRecitations || 0)
    },
    recent() {
      const queue = this.overview?.review_queue?.actionable
      return Array.isArray(queue) ? queue : []
    },
    recentVisible() {
      return this.recent.slice(0, this.recentShown)
    },
    flags() {
      return this.overview?.difficulty_queue || []
    },
    flagsVisible() {
      return this.flags.slice(0, this.flagsShown)
    },
    revision() {
      return [...(this.overview?.outstanding_revision || [])].sort((a, b) => {
        if (Boolean(a.overdue) !== Boolean(b.overdue)) return a.overdue ? -1 : 1
        return String(a.due_at || '9999').localeCompare(String(b.due_at || '9999'))
      })
    },
    revisionVisible() {
      return this.revision.slice(0, this.revisionShown)
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
    revisionAction(row) {
      if (row.overdue) return this.t('teacher.reviews_revision_follow_up')
      const key = {
        pending: 'teacher.reviews_revision_open',
        in_progress: 'teacher.reviews_revision_open',
        awaiting_confirmation: 'teacher.reviews_revision_follow_up',
        overdue: 'teacher.reviews_revision_follow_up',
      }[row.status]
      return this.t(key || 'teacher.reviews_revision_open')
    },
  },
}
</script>
