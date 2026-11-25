<template>
  <article class="card parent-child-summary">
    <header class="parent-child-summary__head">
      <span class="parent-avatar parent-avatar--lg" aria-hidden="true">{{ initial(child.name) }}</span>
      <div class="parent-child-summary__identity">
        <h2 class="parent-child-summary__title">
          <button type="button" class="parent-child-summary__profile-link" @click="$emit('open-profile', child.id)">
            {{ child.name }}
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
        </h2>
        <p class="parent-child-summary__meta">{{ teacherLine }}</p>
        <p v-if="learningLine" class="parent-child-summary__meta">{{ learningLine }}</p>
        <span class="parent-status" :class="`is-${homeworkPill.tone}`">
          <i v-if="homeworkPill.icon" :class="homeworkPill.icon" aria-hidden="true"></i>
          {{ homeworkPill.text }}
        </span>
      </div>
    </header>

  <div v-if="statCards.length" class="parent-stats parent-child-summary__stats" role="list">
      <article v-for="card in statCards" :key="card.key" class="parent-stat" role="listitem">
        <span aria-hidden="true"><i :class="card.icon"></i></span>
        <strong>{{ card.value }}</strong>
        <small>{{ card.label }}</small>
      </article>
    </div>

    <section v-if="upcoming.length" class="parent-child-summary__section" :aria-label="t('parent.single_child_homework')">
      <h3><i class="bi bi-journal-check" aria-hidden="true"></i>{{ t('parent.single_child_homework') }}</h3>
      <ul class="teacher-activity-list">
        <li v-for="row in upcoming" :key="row.id">
          <button type="button" @click="$emit('open-learning', child.id, row.id)">
            <span class="teacher-activity-list__avatar" aria-hidden="true"><i :class="activityIcon(row.activity)"></i></span>
            <span class="teacher-activity-list__copy">
              <strong>{{ taskTitle(row) }}</strong>
              <small>{{ taskMeta(row) }}</small>
            </span>
            <span class="parent-status" :class="taskStatusClass(row)">{{ taskStatusLabel(row) }}</span>
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
        </li>
      </ul>
    </section>

    <section v-if="recentActivity.length" class="parent-child-summary__section" :aria-label="t('parent.overview_activity')">
      <h3><i class="bi bi-activity" aria-hidden="true"></i>{{ t('parent.overview_activity') }}</h3>
      <ul class="teacher-activity-list">
        <li v-for="row in recentActivity" :key="row.id">
          <button type="button" @click="$emit('open-progress', child.id)">
            <span class="teacher-activity-list__avatar" aria-hidden="true"><i class="bi bi-graph-up-arrow"></i></span>
            <span class="teacher-activity-list__copy">
              <strong>{{ activityLine(row) }}</strong>
              <small>{{ formatWhen(row.at) }}</small>
            </span>
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
        </li>
      </ul>
    </section>

  </article>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import {
  activityIcon,
  activityName,
  formatWhen,
  initial,
  learningLabel,
  passageLabel,
} from '../../scripts/parent/dashboard'
import {
  childHomeworkPill,
  homeworkForChild,
  homeworkRowStatusClass,
  upcomingHomeworkRows,
} from '../../scripts/parent/homeDashboard'

export default {
  name: 'ParentSingleChildSummary',
  mixins: [i18nMixin],
  props: {
    child: { type: Object, required: true },
    homework: { type: Array, default: () => [] },
    activity: { type: Array, default: () => [] },
  },
  emits: ['open-learning', 'open-progress', 'open-messages', 'open-profile'],
  computed: {
    teacherLine() {
      const name = this.child.teachers?.[0]?.name
      return name ? this.t('parent.teacher_named', { name }) : this.t('parent.teachers_empty')
    },
    learningLine() {
      if (!this.child.permissions?.progress) return ''
      return learningLabel(this.t, this.child.learning) || ''
    },
    homeworkPill() {
      return childHomeworkPill(this.t, this.child, this.homework)
    },
    upcoming() {
      return upcomingHomeworkRows(homeworkForChild(this.homework, this.child.id), 3)
    },
    recentActivity() {
      return (this.activity || []).filter((row) => Number(row.child_id) === Number(this.child.id)).slice(0, 3)
    },
    statCards() {
      const cards = []
      const summary = this.child.assignments
      if (this.child.permissions?.progress && this.child.progress?.recent_ayahs != null) {
        cards.push({
          key: 'practice',
          label: this.t('parent.kpi_practice'),
          value: this.child.progress.recent_ayahs,
          icon: 'bi bi-activity',
        })
      }
      if (this.child.permissions?.assignments && summary) {
        cards.push(
          { key: 'active', label: this.t('parent.kpi_active'), value: summary.active || 0, icon: 'bi bi-journal-text' },
          { key: 'attention', label: this.t('parent.kpi_attention'), value: summary.needs_attention || 0, icon: 'bi bi-exclamation-circle' },
        )
      }
      return cards.slice(0, 3)
    },
  },
  methods: {
    initial,
    formatWhen,
    activityIcon,
    taskTitle(row) {
      return [activityName(this.t, row.activity), passageLabel(row)].filter(Boolean).join(' · ') || this.t('parent.nav_learning')
    },
    taskMeta(row) {
      return [
        row.teacher_name,
        row.due_at ? this.t('parent.homework_due_short', { when: formatWhen(row.due_at) }) : '',
      ].filter(Boolean).join(' · ')
    },
    taskStatusClass(row) {
      return homeworkRowStatusClass(row)
    },
    taskStatusLabel(row) {
      if (row.overdue) return this.t('parent.homework_overdue')
      if (row.due_soon) return this.t('parent.homework_due_soon')
      const key = `parent.homework_${row.status}`
      const label = this.t(key)
      return label && label !== key ? label : this.t('parent.homework_pending')
    },
    activityLine(row) {
      if (row.kind === 'practice') {
        const count = Number(row.recent_ayahs || 0)
        return count === 1 ? this.t('parent.activity_practice_one') : this.t('parent.activity_practice', { count })
      }
      const task = [activityName(this.t, row.activity), passageLabel(row)].filter(Boolean).join(' · ')
      return this.t('parent.activity_completed', { task: task || this.t('parent.nav_learning') })
    },
  },
}
</script>