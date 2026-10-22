<template>
  <section
    class="dash-section dash-section--flat dash-section--learner-teacher dash-reveal"
    aria-labelledby="learner-teacher-heading"
    style="--dash-delay: 15ms"
  >
    <div class="dash-section__head dash-section__head--compact">
      <div class="dash-section__head-row">
        <div class="dash-section__title">
          <span class="dash-section__icon dash-section__icon--activity" aria-hidden="true">
            <i class="bi bi-person-workspace" aria-hidden="true"></i>
          </span>
          <div class="dash-section__title-copy">
            <h2 id="learner-teacher-heading">{{ t('teacher.learner_section_title') }}</h2>
          </div>
        </div>
        <span class="learner-teacher__count" aria-live="polite">
          {{ t('teacher.learner_assignments_total', { n: assignments.length }) }}
        </span>
      </div>
    </div>

    <div class="dash-section__body learner-teacher">
      <div v-if="error" class="alert alert-danger learner-teacher__alert" role="alert">
        <span>{{ error }}</span>
        <button
          v-if="failedItem"
          type="button"
          class="btn btn-sm btn-outline-danger"
          :disabled="savingId === failedItem.id"
          @click="$emit('complete', failedItem)"
        >{{ t('common.retry') }}</button>
      </div>
      <div v-if="completionMessage" class="alert alert-success learner-teacher__alert" role="status" aria-live="polite">
        <span>{{ completionMessage }}</span>
        <span class="learner-teacher__alert-actions">
          <button type="button" class="btn btn-sm btn-outline-success" @click="$emit('view-completed')">
            {{ t('teacher.learner_assignments_view_completed') }}
          </button>
          <button type="button" class="btn-close" :aria-label="t('common.close')" @click="$emit('dismiss-completion')"></button>
        </span>
      </div>
      <p v-if="groupsError" class="teacher-alert" role="alert">{{ groupsError }}</p>

      <div v-if="loading" class="learner-teacher__loading" role="status" aria-live="polite">
        <div class="dash-spinner" aria-hidden="true"></div>
        <span>{{ t('teacher.loading') }}</span>
      </div>

      <template v-else>
        <div class="learner-teacher__block">
          <div v-if="!assignments.length" class="learner-teacher__empty">
            <strong>{{ t('teacher.learner_assignments_empty_title') }}</strong>
            <span>{{ t('teacher.learner_assignments_empty') }}</span>
          </div>

          <template v-else>
            <div
              class="learner-teacher__filters"
              role="tablist"
              :aria-label="t('teacher.learner_assignments_filter_label')"
            >
              <button
                v-for="filter in primaryFilters"
                :key="filter.id"
                type="button"
                class="learner-teacher__filter"
                :class="[`is-${filter.id}`, { 'is-active': activeFilter === filter.id }]"
                role="tab"
                :aria-selected="activeFilter === filter.id ? 'true' : 'false'"
                @click="setFilter(filter.id)"
              >
                {{ filter.label }}
                <span class="learner-teacher__filter-count">{{ filter.count }}</span>
              </button>
            </div>

            <p
              v-if="activeFilter === 'actionable' && pendingCount === 0"
              class="learner-teacher__uptodate"
            >
              <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
              {{ t('teacher.learner_assignments_caught_up') }}
            </p>
            <p v-if="activeFilter === 'completed' && completedCount === 0" class="learner-teacher__uptodate">
              {{ t('teacher.learner_assignments_no_completed') }}
            </p>

            <ul v-if="listItems.length" class="learner-teacher__list">
              <li v-for="item in listItems" :key="item.id">
                <div
                  class="learner-teacher__row"
                  :class="{ 'is-completed': isCompleted(item) }"
                >
                  <div class="learner-teacher__row-copy">
                    <strong>{{ rangeLabel(item) }}</strong>
                    <span class="learner-teacher__row-meta">{{ metaLine(item) }}</span>
                    <span v-if="item.assignment?.feedback" class="learner-teacher__message-preview">
                      {{ item.assignment.feedback }}
                    </span>
                    <details v-if="hasDetails(item)" class="learner-teacher__details">
                      <summary>{{ t('teacher.learner_assignments_details') }}</summary>
                      <span v-if="completionHint(item)">{{ completionHint(item) }}</span>
                      <span v-if="item.assignment?.feedback">{{ item.assignment.feedback }}</span>
                    </details>
                    <span v-if="isCompleted(item) && item.completed_at" class="learner-teacher__row-done">
                      {{ completedWhen(item) }}
                    </span>
                  </div>
                  <div class="learner-teacher__row-actions">
                    <span class="learner-teacher__status" :class="`is-${item.status}`">
                      <i class="bi" :class="statusIcon(item)" aria-hidden="true"></i>
                      {{ statusLabel(item) }}
                    </span>
                    <button
                      v-if="!isCompleted(item) && !canConfirm(item)"
                      type="button"
                      class="dash-btn dash-btn--ghost dash-btn--sm"
                      :disabled="savingId === item.id"
                      @click="$emit('start', item)"
                    >
                      {{ actionLabel(item) }}
                    </button>
                    <button
                      v-if="!isCompleted(item) && canConfirm(item)"
                      type="button"
                      class="dash-btn dash-btn--ghost dash-btn--sm learner-teacher__complete"
                      :disabled="savingId === item.id"
                      @click="$emit('complete', item)"
                    >
                      <i class="bi bi-check2-circle" aria-hidden="true"></i>
                      {{ t('teacher.mark_complete') }}
                    </button>
                    <a v-if="isCompleted(item) && item.href" class="dash-btn dash-btn--ghost dash-btn--sm" :href="item.href">
                      {{ t('teacher.view') }}
                    </a>
                  </div>
                </div>
              </li>
            </ul>

            <div v-if="showViewAll" class="learner-teacher__footer">
              <button type="button" class="dash-text-link" @click="visibleLimit += listLimit">
                {{ t('teacher.learner_assignments_view_more', { n: Math.min(listLimit, remainingCount) }) }}
              </button>
            </div>
          </template>
        </div>

        <div v-if="support?.feedback?.length" class="learner-teacher__secondary">
          <ul v-if="support.feedback?.length" class="learner-teacher__messages">
            <li v-for="note in support.feedback" :key="note.id">
              <i class="bi bi-chat-quote" aria-hidden="true"></i>
              <div>
                <span class="learner-teacher__message-label">
                  {{ t('teacher.feedback') }}<template v-if="note.teacher_name"> · {{ note.teacher_name }}</template>
                </span>
                <p class="learner-teacher__message-body">{{ note.body }}</p>
              </div>
            </li>
          </ul>

        </div>
      </template>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { assignmentProgressLabel } from '../../scripts/teacher/formatters'

const ACTIVE_STATUSES = new Set(['pending', 'in_progress', 'awaiting_confirmation', 'overdue'])

export default {
  name: 'LearnerTeacherSection',
  mixins: [i18nMixin],
  props: {
    support: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    savingId: { type: Number, default: 0 },
    completionMessage: { type: String, default: '' },
    failedItem: { type: Object, default: null },
  },
  emits: ['start', 'complete', 'view-completed', 'dismiss-completion'],
  data() {
    return {
      activeFilter: 'actionable',
      listLimit: 4,
      visibleLimit: 4,
    }
  },
  computed: {
    assignments() {
      return Array.isArray(this.support?.assignments) ? this.support.assignments : []
    },
    pendingCount() {
      return this.assignments.filter((row) => ACTIVE_STATUSES.has(row.status)).length
    },
    completedCount() {
      return this.assignments.filter((row) => row.status === 'completed').length
    },
    primaryFilters() {
      const filters = [
        {
          id: 'all',
          label: this.t('teacher.learner_assignments_filter_all'),
          count: this.assignments.length,
        },
        {
          id: 'actionable',
          label: this.t('teacher.learner_assignments_filter_todo'),
          count: this.pendingCount,
        },
        {
          id: 'completed',
          label: this.t('teacher.status_completed'),
          count: this.completedCount,
        },
      ]
      return filters
    },
    filteredByStatus() {
      if (this.activeFilter === 'completed') {
        return this.assignments.filter((row) => row.status === 'completed')
      }
      if (this.activeFilter === 'all') return this.assignments
      if (this.activeFilter === 'actionable') {
        return this.assignments.filter((row) => ACTIVE_STATUSES.has(row.status))
      }
      return this.assignments
    },
    listItems() {
      return this.filteredByStatus.slice(0, this.visibleLimit)
    },
    openListCount() {
      return this.filteredByStatus.length
    },
    remainingCount() {
      return Math.max(0, this.openListCount - this.visibleLimit)
    },
    showViewAll() {
      return this.remainingCount > 0
    },
  },
  watch: {
    assignments() {
      this.visibleLimit = this.listLimit
    },
  },
  methods: {
    setFilter(id) {
      this.activeFilter = id
      this.visibleLimit = this.listLimit
    },
    isCompleted(row) {
      return row?.status === 'completed'
    },
    statusLabel(row) {
      if (this.isCompleted(row)) return this.t('teacher.status_completed')
      return this.t(`teacher.status_${row.status}`)
    },
    statusIcon(row) {
      if (this.isCompleted(row)) return 'bi-check2-circle'
      if (row?.status === 'overdue') return 'bi-exclamation-circle'
      if (row?.status === 'awaiting_confirmation') return 'bi-check-circle'
      if (row?.status === 'in_progress') return 'bi-arrow-repeat'
      return 'bi-circle'
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
      return row?.progress ? assignmentProgressLabel(row, this.t.bind(this)) : ''
    },
    canConfirm(row) {
      return Number(row?.progress?.activity_count || 0) >= Number(row?.progress?.target || 1)
    },
    hasDetails(row) {
      return Boolean(row?.assignment?.feedback || this.completionHint(row))
    },
    completionHint(row) {
      if (this.canConfirm(row)) return ''
      const progress = row?.progress || {}
      return `${progress.activity_count || 0} of ${progress.target || 1} qualifying activities complete`
    },
    dueLabel(row) {
      const due = row?.assignment?.due_at
      if (!due || this.isCompleted(row)) return ''
      try {
        const date = new Date(due)
        if (Number.isNaN(date.getTime())) return ''
        return `${this.t('teacher.due')}: ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      } catch (_) {
        return ''
      }
    },
    completedWhen(row) {
      const at = row?.completed_at
      if (!at) return ''
      try {
        const date = new Date(at)
        if (Number.isNaN(date.getTime())) return ''
        return this.t('teacher.learner_assignments_completed_at', {
          date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        })
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
      if (this.isCompleted(row)) return this.t('teacher.view')
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
