<template>
  <section
    class="dash-section dash-section--flat dash-section--learner-assignments dash-reveal"
    aria-labelledby="learner-assignments-heading"
    style="--dash-delay: 15ms"
  >
    <div class="dash-section__head dash-section__head--compact">
      <div class="dash-section__head-row">
        <div class="dash-section__title">
          <span class="dash-section__icon dash-section__icon--activity" aria-hidden="true">
            <i class="bi bi-journal-check" aria-hidden="true"></i>
          </span>
          <div class="dash-section__title-copy">
            <h2 id="learner-assignments-heading">{{ t('teacher.learner_assignments_title') }}</h2>
            <p class="dash-section__hint">{{ t('teacher.learner_assignments_subtitle') }}</p>
          </div>
        </div>
        <span v-if="pendingCount > 0" class="learner-assignments__count" aria-live="polite">
          {{ t('teacher.pending_n', { n: pendingCount }) }}
        </span>
      </div>
    </div>

    <div class="dash-section__body learner-assignments">
      <p v-if="error" class="teacher-alert" role="alert">{{ error }}</p>

      <div v-if="loading" class="learner-assignments__loading" role="status" aria-live="polite">
        <div class="dash-spinner" aria-hidden="true"></div>
        <span>{{ t('teacher.loading') }}</span>
      </div>

      <template v-else-if="!assignments.length">
        <div class="learner-assignments__empty">
          <strong>{{ t('teacher.learner_assignments_empty_title') }}</strong>
          <span>{{ t('teacher.learner_assignments_empty') }}</span>
        </div>
      </template>

      <template v-else>
        <div
          v-if="statusFilters.length > 1"
          class="dash-range-toggle learner-assignments__filters"
          role="group"
          :aria-label="t('teacher.learner_assignments_filter_label')"
        >
          <button
            v-for="filter in statusFilters"
            :key="filter.id"
            type="button"
            class="dash-btn dash-btn--ghost dash-btn--sm"
            :class="{ 'is-active': activeFilter === filter.id }"
            :aria-pressed="activeFilter === filter.id ? 'true' : 'false'"
            @click="activeFilter = filter.id"
          >
            {{ filter.label }}
            <span v-if="filter.count > 0" class="learner-assignments__filter-count">{{ filter.count }}</span>
          </button>
        </div>

        <article
          v-if="featured"
          class="learner-assignments__featured dash-continue-card dash-continue-card--fresh"
          :class="{ 'is-busy': startingId === featured.id }"
        >
          <span class="dash-continue-card__icon" aria-hidden="true">
            <i :class="kindIcon(featured)" aria-hidden="true"></i>
          </span>
          <div class="dash-continue-card__main">
            <span class="dash-continue-card__label">{{ t('teacher.learner_assignments_next') }}</span>
            <strong class="dash-continue-card__title">{{ rangeLabel(featured) }}</strong>
            <p class="dash-continue-card__hint">{{ metaLine(featured) }}</p>
            <p v-if="featured.assignment?.feedback" class="learner-assignments__feedback">
              {{ featured.assignment.feedback }}
            </p>
          </div>
          <button
            type="button"
            class="dash-btn dash-btn--primary dash-btn--sm learner-assignments__cta"
            :disabled="startingId === featured.id"
            @click="$emit('start', featured)"
          >
            <i class="bi" :class="actionIcon(featured)" aria-hidden="true"></i>
            {{ actionLabel(featured) }}
          </button>
        </article>

        <div
          v-if="!featured && !listItems.length && assignments.length && activeFilter === 'actionable'"
          class="learner-assignments__empty learner-assignments__empty--inline"
        >
          <strong>{{ t('teacher.learner_assignments_caught_up') }}</strong>
          <span>{{ t('teacher.learner_assignments_caught_up_hint') }}</span>
        </div>

        <ul v-if="listItems.length" class="learner-assignments__list">
          <li v-for="item in listItems" :key="item.id">
            <div class="learner-assignments__row">
              <div class="learner-assignments__row-copy">
                <strong>{{ rangeLabel(item) }}</strong>
                <span class="learner-assignments__row-meta">{{ metaLine(item) }}</span>
              </div>
              <div class="learner-assignments__row-actions">
                <span class="learner-assignments__status" :class="`is-${item.status}`">
                  {{ t(`teacher.status_${item.status}`) }}
                </span>
                <button
                  v-if="!isCompleted(item)"
                  type="button"
                  class="dash-btn dash-btn--ghost dash-btn--sm"
                  :disabled="startingId === item.id"
                  @click="$emit('start', item)"
                >
                  {{ actionLabel(item) }}
                </button>
              </div>
            </div>
          </li>
        </ul>

        <div v-if="showViewAll || completedHiddenCount > 0" class="learner-assignments__footer">
          <button
            v-if="showViewAll"
            type="button"
            class="dash-text-link"
            @click="expanded = true"
          >
            {{ t('teacher.learner_assignments_view_all', { n: filteredActive.length }) }}
          </button>
          <button
            v-if="completedHiddenCount > 0"
            type="button"
            class="dash-text-link"
            :aria-expanded="showCompleted ? 'true' : 'false'"
            @click="showCompleted = !showCompleted"
          >
            {{
              showCompleted
                ? t('teacher.hide')
                : t('teacher.learner_assignments_show_done', { n: completedHiddenCount })
            }}
          </button>
        </div>
      </template>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

const ACTIVE_STATUSES = new Set(['pending', 'in_progress', 'overdue'])

export default {
  name: 'LearnerTeacherAssignments',
  mixins: [i18nMixin],
  props: {
    assignments: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    startingId: { type: Number, default: 0 },
  },
  emits: ['start'],
  data() {
    return {
      activeFilter: 'actionable',
      expanded: false,
      showCompleted: false,
      listLimit: 3,
    }
  },
  computed: {
    pendingCount() {
      return this.assignments.filter((row) => ACTIVE_STATUSES.has(row.status)).length
    },
    statusFilters() {
      const counts = {
        actionable: 0,
        pending: 0,
        in_progress: 0,
        overdue: 0,
        completed: 0,
      }
      this.assignments.forEach((row) => {
        const status = row.status
        if (ACTIVE_STATUSES.has(status)) counts.actionable += 1
        if (counts[status] !== undefined) counts[status] += 1
      })
      const filters = [
        { id: 'actionable', label: this.t('teacher.learner_assignments_filter_actionable'), count: counts.actionable },
        { id: 'overdue', label: this.t('teacher.status_overdue'), count: counts.overdue },
        { id: 'in_progress', label: this.t('teacher.status_in_progress'), count: counts.in_progress },
        { id: 'pending', label: this.t('teacher.status_pending'), count: counts.pending },
      ].filter((row) => row.id === 'actionable' || row.count > 0)
      if (counts.completed > 0) {
        filters.push({
          id: 'completed',
          label: this.t('teacher.status_completed'),
          count: counts.completed,
        })
      }
      return filters
    },
    filteredByStatus() {
      if (this.activeFilter === 'actionable') {
        return this.assignments.filter((row) => ACTIVE_STATUSES.has(row.status))
      }
      if (this.activeFilter === 'completed') {
        return this.assignments.filter((row) => row.status === 'completed')
      }
      return this.assignments.filter((row) => row.status === this.activeFilter)
    },
    filteredActive() {
      return this.filteredByStatus.filter((row) => !this.isCompleted(row))
    },
    featured() {
      const pool = this.filteredByStatus.filter((row) => ACTIVE_STATUSES.has(row.status))
      return pool[0] || null
    },
    listItems() {
      const pool = this.filteredByStatus.filter((row) => {
        if (this.isCompleted(row)) return this.showCompleted || this.activeFilter === 'completed'
        if (this.featured && row.id === this.featured.id) return false
        return true
      })
      if (this.expanded || this.activeFilter === 'completed') return pool
      return pool.slice(0, this.listLimit)
    },
    showViewAll() {
      if (this.expanded || this.activeFilter === 'completed') return false
      const pool = this.filteredByStatus.filter((row) => {
        if (this.featured && row.id === this.featured.id) return false
        if (this.isCompleted(row)) return false
        return true
      })
      return pool.length > this.listLimit
    },
    completedHiddenCount() {
      if (this.activeFilter === 'completed') return 0
      return this.assignments.filter((row) => row.status === 'completed').length
    },
  },
  watch: {
    assignments() {
      this.expanded = false
      if (this.activeFilter !== 'actionable' && !this.statusFilters.some((row) => row.id === this.activeFilter)) {
        this.activeFilter = 'actionable'
      }
    },
  },
  methods: {
    isCompleted(row) {
      return row?.status === 'completed'
    },
    rangeLabel(row) {
      const assignment = row?.assignment
      if (!assignment) return ''
      return `${assignment.surah_name} · ${assignment.ayah_start}–${assignment.ayah_end}`
    },
    kindLabel(row) {
      return row?.assignment?.kind === 'ai_recite'
        ? this.t('teacher.kind_ai')
        : this.t('teacher.kind_practice')
    },
    kindIcon(row) {
      return row?.assignment?.kind === 'ai_recite' ? 'bi bi-mic' : 'bi bi-book'
    },
    progressLabel(row) {
      const progress = row?.progress
      if (!progress) return ''
      const completed = Number(progress.completed ?? 0)
      const target = Number(progress.target ?? 1)
      if (row?.assignment?.kind === 'ai_recite') {
        return completed >= target
          ? this.t('teacher.learner_assignments_ai_done')
          : this.t('teacher.learner_assignments_progress', { completed, target })
      }
      return this.t('teacher.learner_assignments_progress', { completed, target })
    },
    dueLabel(row) {
      const due = row?.assignment?.due_at
      if (!due) return ''
      try {
        const date = new Date(due)
        if (Number.isNaN(date.getTime())) return ''
        return this.t('teacher.due') + ': ' + date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      } catch (_) {
        return ''
      }
    },
    metaLine(row) {
      const parts = [
        this.kindLabel(row),
        this.progressLabel(row),
        row.teacher_name || '',
        this.dueLabel(row),
      ].filter(Boolean)
      return parts.join(' · ')
    },
    actionLabel(row) {
      if (row?.progress?.resume_available || row?.status === 'in_progress' || row?.started_at) {
        return this.t('common.resume')
      }
      return this.t('teacher.start')
    },
    actionIcon(row) {
      return this.actionLabel(row) === this.t('common.resume') ? 'bi-arrow-repeat' : 'bi-play-fill'
    },
  },
}
</script>
