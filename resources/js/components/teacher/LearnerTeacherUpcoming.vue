<template>
  <section class="learner-teacher__upcoming-panel" :aria-label="t('teacher.learner_upcoming_title')">
    <header class="learner-teacher__upcoming-head" :class="{ 'is-collapsible': mobileCollapsible }">
      <button
        v-if="mobileCollapsible"
        type="button"
        class="learner-teacher__panel-toggle learner-teacher__panel-toggle--upcoming"
        :aria-expanded="panelOpen ? 'true' : 'false'"
        :aria-controls="panelBodyId"
        @click="panelOpen = !panelOpen"
      >
        <span class="learner-teacher__panel-toggle-label">
          <span class="learner-teacher__sidebar-panel-icon" aria-hidden="true"><i class="bi bi-calendar-event"></i></span>
          <h3 class="learner-teacher__section-title">{{ t('teacher.learner_upcoming_title') }}</h3>
        </span>
        <i class="bi learner-teacher__panel-toggle-icon" :class="panelOpen ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
      </button>
      <template v-else>
        <span class="learner-teacher__sidebar-panel-icon" aria-hidden="true"><i class="bi bi-calendar-event"></i></span>
        <h3 class="learner-teacher__section-title">{{ t('teacher.learner_upcoming_title') }}</h3>
      </template>
    </header>
    <div v-show="!mobileCollapsible || panelOpen" :id="panelBodyId" class="learner-teacher__panel-body">
    <p v-if="!items.length" class="learner-teacher__upcoming-empty">{{ t('teacher.learner_upcoming_empty') }}</p>
    <ul v-else class="learner-teacher__upcoming-list">
      <li v-for="item in items" :key="item.id">
        <div class="learner-teacher__upcoming-row">
          <button type="button" class="learner-teacher__upcoming-main-hit" @click="$emit('open-task', item)">
            <span class="learner-teacher__upcoming-main">
              <strong class="learner-teacher__upcoming-title">{{ rangeLabel(item) }}</strong>
              <span class="learner-teacher__upcoming-meta">
                <span v-if="dueLabel(item)" class="learner-teacher__upcoming-due" :class="dueTone(item)">{{ dueLabel(item) }}</span>
                <time class="learner-teacher__upcoming-date" :datetime="item.assignment.due_at">{{ dateLabel(item) }}</time>
              </span>
            </span>
          </button>
          <component
            :is="actionHref(item) ? 'a' : 'button'"
            type="button"
            class="learner-teacher__upcoming-action"
            :href="actionHref(item) || undefined"
            @click="onActionClick(item, $event)"
          >
            <i class="bi" :class="actionIcon(item)" aria-hidden="true"></i>
            {{ actionLabel(item) }}
          </component>
        </div>
      </li>
    </ul>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatLearnerDisplayDate } from '../../utils/learnerDisplayDate.js'
import { buildUpcomingAssignments, dueDaysFromNow, upcomingTaskActionKey } from '../../scripts/teacher/learnerUpcoming.js'
import { learnerDashboardTp } from '../../scripts/teacher/learnerDashboardI18n.js'

export default {
  name: 'LearnerTeacherUpcoming',
  mixins: [i18nMixin],
  props: {
    assignments: { type: Array, default: () => [] },
    todoIds: { type: Array, default: () => [] },
    isComplete: { type: Function, required: true },
    mobileCollapsible: { type: Boolean, default: false },
  },
  emits: ['open-task', 'start-task'],
  data() {
    return {
      panelOpen: true,
      panelBodyId: `learner-upcoming-panel-${Math.random().toString(36).slice(2, 9)}`,
    }
  },
  watch: {
    mobileCollapsible: {
      handler(value) {
        this.panelOpen = !value
      },
      immediate: true,
    },
  },
  computed: {
    items() {
      return buildUpcomingAssignments(this.assignments, this.isComplete, 3, {
        excludeTodoIds: [],
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
    actionKey(row) {
      return upcomingTaskActionKey(row)
    },
    actionLabel(row) {
      return this.actionKey(row) === 'review'
        ? this.t('teacher.learner_upcoming_review')
        : this.t('teacher.learner_upcoming_start')
    },
    actionIcon(row) {
      return this.actionKey(row) === 'review' ? 'bi-arrow-repeat' : 'bi-play-fill'
    },
    actionHref(row) {
      return row?.href || ''
    },
    onActionClick(row, event) {
      if (this.actionHref(row)) return
      event.preventDefault()
      this.$emit('start-task', row)
    },
    ldtp(key, count, params = {}) {
      return learnerDashboardTp(this.learnerLocale, this.$i18n, key, count, params)
    },
  },
}
</script>
