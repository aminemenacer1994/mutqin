<template>
  <section class="learner-teacher__upcoming-panel" :aria-label="t('teacher.learner_upcoming_title')">
    <header class="learner-teacher__upcoming-head">
      <span class="learner-teacher__upcoming-icon" aria-hidden="true"><i class="bi bi-calendar-event"></i></span>
      <h3 class="learner-teacher__section-title">{{ t('teacher.learner_upcoming_title') }}</h3>
    </header>
    <p v-if="!items.length" class="learner-teacher__upcoming-empty">{{ t('teacher.learner_upcoming_empty') }}</p>
    <ul v-else class="learner-teacher__upcoming-list">
      <li v-for="item in items" :key="item.id">
        <button type="button" class="learner-teacher__upcoming-row" @click="$emit('open-task', item)">
          <span class="learner-teacher__upcoming-main">
            <strong class="learner-teacher__upcoming-title">{{ rangeLabel(item) }}</strong>
            <span class="learner-teacher__upcoming-meta">
              <span v-if="dueLabel(item)" class="learner-teacher__upcoming-due" :class="dueTone(item)">{{ dueLabel(item) }}</span>
              <time class="learner-teacher__upcoming-date" :datetime="item.assignment.due_at">{{ dateLabel(item) }}</time>
            </span>
          </span>
          <i class="bi bi-chevron-right learner-teacher__upcoming-go" aria-hidden="true"></i>
        </button>
      </li>
    </ul>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatLearnerDisplayDate } from '../../utils/learnerDisplayDate.js'
import { buildUpcomingAssignments, dueDaysFromNow } from '../../scripts/teacher/learnerUpcoming.js'
import { learnerDashboardTp } from '../../scripts/teacher/learnerDashboardI18n.js'

export default {
  name: 'LearnerTeacherUpcoming',
  mixins: [i18nMixin],
  props: {
    assignments: { type: Array, default: () => [] },
    todoIds: { type: Array, default: () => [] },
    isComplete: { type: Function, required: true },
  },
  emits: ['open-task'],
  computed: {
    items() {
      return buildUpcomingAssignments(this.assignments, this.isComplete, 3, {
        excludeTodoIds: this.todoIds,
      })
    },
    learnerLocale() {
      return this.$i18n?.global?.locale?.value
        || (typeof document !== 'undefined' ? document.documentElement.getAttribute('lang') : null)
        || 'en'
    },
  },
  methods: {
    rangeLabel(row) {
      const a = row?.assignment
      if (!a) return this.t('teacher.task_conversation')
      return `${a.surah_name} · ${a.ayah_start}–${a.ayah_end}`
    },
    dueLabel(row) {
      const days = dueDaysFromNow(row?.assignment?.due_at)
      if (days === null) return ''
      if (days <= 0) return this.t('teacher.learner_upcoming_due_today')
      return this.ldtp('teacher.learner_upcoming_due_days', days, { n: days })
    },
    dueTone(row) {
      const days = dueDaysFromNow(row?.assignment?.due_at)
      if (days !== null && days <= 2) return 'is-urgent'
      return ''
    },
    dateLabel(row) {
      return formatLearnerDisplayDate(row?.assignment?.due_at, this.t.bind(this), this.learnerLocale)
    },
    ldtp(key, count, params = {}) {
      return learnerDashboardTp(this.learnerLocale, this.$i18n, key, count, params)
    },
  },
}
</script>
