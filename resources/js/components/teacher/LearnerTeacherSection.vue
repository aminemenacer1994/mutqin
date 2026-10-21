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
        <span v-if="pendingCount > 0" class="learner-teacher__count" aria-live="polite">
          {{ t('teacher.pending_n', { n: pendingCount }) }}
        </span>
      </div>
    </div>

    <div class="dash-section__body learner-teacher">
      <p v-if="error" class="teacher-alert" role="alert">{{ error }}</p>
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
              v-if="primaryFilters.length"
              class="dash-range-toggle learner-teacher__filters"
              role="group"
              :aria-label="t('teacher.learner_assignments_filter_label')"
            >
              <button
                v-for="filter in primaryFilters"
                :key="filter.id"
                type="button"
                class="dash-btn dash-btn--ghost dash-btn--sm"
                :class="{ 'is-active': activeFilter === filter.id }"
                :aria-pressed="activeFilter === filter.id ? 'true' : 'false'"
                @click="setFilter(filter.id)"
              >
                {{ filter.label }}
                <span v-if="filter.count > 0" class="learner-teacher__filter-count">{{ filter.count }}</span>
              </button>
            </div>

            <p
              v-if="activeFilter === 'actionable' && pendingCount === 0 && completedCount > 0"
              class="learner-teacher__uptodate"
            >
              <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
              {{ t('teacher.learner_assignments_caught_up') }}
            </p>

            <article
              v-if="featured"
              class="learner-teacher__featured dash-continue-card dash-continue-card--fresh"
              :class="{ 'is-busy': startingId === featured.id }"
            >
              <span class="dash-continue-card__icon" aria-hidden="true">
                <i :class="kindIcon(featured)" aria-hidden="true"></i>
              </span>
              <div class="dash-continue-card__main">
                <span class="dash-continue-card__label">{{ t('teacher.learner_assignments_next') }}</span>
                <strong class="dash-continue-card__title">{{ rangeLabel(featured) }}</strong>
                <p class="dash-continue-card__hint">{{ metaLine(featured) }}</p>
                <p v-if="featured.assignment?.feedback" class="learner-teacher__message-preview">
                  {{ featured.assignment.feedback }}
                </p>
              </div>
              <button
                type="button"
                class="dash-btn dash-btn--primary dash-btn--sm learner-teacher__cta"
                :disabled="startingId === featured.id"
                @click="$emit('start', featured)"
              >
                <i class="bi" :class="actionIcon(featured)" aria-hidden="true"></i>
                {{ actionLabel(featured) }}
              </button>
            </article>

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
                    <span v-if="isCompleted(item) && item.completed_at" class="learner-teacher__row-done">
                      {{ completedWhen(item) }}
                    </span>
                  </div>
                  <div class="learner-teacher__row-actions">
                    <span class="learner-teacher__status" :class="`is-${item.status}`">
                      {{ statusLabel(item) }}
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

            <div v-if="showViewAll" class="learner-teacher__footer">
              <button type="button" class="dash-text-link" @click="expanded = true">
                {{ t('teacher.learner_assignments_view_all', { n: openListCount }) }}
              </button>
            </div>
          </template>
        </div>

        <div v-if="hasSecondary" class="learner-teacher__secondary">
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

          <ul v-if="support.groups?.length" class="learner-teacher__groups">
            <li v-for="group in support.groups" :key="group.id">
              <div class="learner-teacher__group-copy">
                <strong>{{ group.name }}</strong>
                <span>{{ group.status ? t(`teacher.status_${group.status}`) : t('teacher.not_joined') }}</span>
              </div>
              <div class="teacher-actions">
                <button
                  v-if="!group.membership_id || group.status === 'rejected'"
                  type="button"
                  class="dash-btn dash-btn--ghost dash-btn--sm"
                  @click="$emit('request-group', group)"
                >
                  {{ t('teacher.ask_join') }}
                </button>
                <button
                  v-if="group.membership_id && !group.sharing && group.status !== 'rejected'"
                  type="button"
                  class="dash-btn dash-btn--primary dash-btn--sm"
                  @click="$emit('grant-consent', group)"
                >
                  {{ t('teacher.allow_sharing') }}
                </button>
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

const ACTIVE_STATUSES = new Set(['pending', 'in_progress', 'overdue'])

export default {
  name: 'LearnerTeacherSection',
  mixins: [i18nMixin],
  props: {
    support: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    groupsError: { type: String, default: '' },
    startingId: { type: Number, default: 0 },
  },
  emits: ['start', 'request-group', 'grant-consent'],
  data() {
    return {
      activeFilter: 'actionable',
      expanded: false,
      listLimit: 4,
    }
  },
  computed: {
    assignments() {
      return Array.isArray(this.support?.assignments) ? this.support.assignments : []
    },
    hasSecondary() {
      return Boolean(this.support?.feedback?.length || this.support?.groups?.length)
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
          id: 'actionable',
          label: this.t('teacher.learner_assignments_filter_actionable'),
          count: this.pendingCount,
        },
        {
          id: 'completed',
          label: this.t('teacher.status_completed'),
          count: this.completedCount,
        },
      ]
      return filters.filter((row) => row.id === 'actionable' || row.count > 0)
    },
    filteredByStatus() {
      if (this.activeFilter === 'completed') {
        return this.assignments.filter((row) => row.status === 'completed')
      }
      if (this.activeFilter === 'actionable') {
        return this.assignments.filter((row) => ACTIVE_STATUSES.has(row.status))
      }
      return this.assignments
    },
    featured() {
      if (this.activeFilter === 'completed') return null
      const pool = this.assignments.filter((row) => ACTIVE_STATUSES.has(row.status))
      return pool[0] || null
    },
    showCompletedInList() {
      return this.activeFilter === 'completed'
        || (this.activeFilter === 'actionable' && this.pendingCount === 0 && this.completedCount > 0)
    },
    listItems() {
      let pool = []
      if (this.activeFilter === 'completed' || this.showCompletedInList) {
        pool = this.assignments.filter((row) => row.status === 'completed')
      } else {
        pool = this.filteredByStatus.filter((row) => {
          if (this.featured && row.id === this.featured.id) return false
          return true
        })
      }
      if (this.expanded) return pool
      return pool.slice(0, this.listLimit)
    },
    openListCount() {
      return this.filteredByStatus.filter((row) => {
        if (this.featured && row.id === this.featured.id) return false
        return true
      }).length
    },
    showViewAll() {
      if (this.expanded || this.activeFilter === 'completed') return false
      return this.openListCount > this.listLimit
    },
  },
  watch: {
    assignments() {
      this.expanded = false
      if (this.activeFilter === 'completed' && this.completedCount === 0) {
        this.activeFilter = 'actionable'
      }
    },
  },
  methods: {
    setFilter(id) {
      this.activeFilter = id
      this.expanded = false
    },
    isCompleted(row) {
      return row?.status === 'completed'
    },
    statusLabel(row) {
      if (this.isCompleted(row)) return this.t('teacher.status_completed')
      return this.t(`teacher.status_${row.status}`)
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
      if (this.isCompleted(row)) return ''
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
