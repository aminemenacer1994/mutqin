<template>
  <section
    class="dash-section dash-section--learner-teacher dash-reveal"
    aria-labelledby="learner-teacher-heading"
    style="--dash-delay: 15ms"
  >
    <div class="dash-section__head learner-teacher__hero">
      <div class="dash-section__head-row">
        <div class="dash-section__title">
          <span class="dash-section__icon learner-teacher__hero-icon" aria-hidden="true">
            <i class="bi bi-mortarboard" aria-hidden="true"></i>
          </span>
          <div class="dash-section__title-copy">
            <span class="learner-teacher__eyebrow">{{ t('teacher.learner_assignments_title') }}</span>
            <h2 id="learner-teacher-heading">{{ t('teacher.learner_section_title') }}</h2>
            <p>{{ t('teacher.learner_section_subtitle') }}</p>
          </div>
        </div>
        <div v-if="assignments.length" class="learner-teacher__summary" aria-live="polite">
          <span><strong>{{ pendingCount }}</strong>{{ t('teacher.learner_assignments_filter_todo') }}</span>
          <span><strong>{{ completedCount }}</strong>{{ t('teacher.status_completed') }}</span>
        </div>
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
                :aria-controls="`learner-teacher-panel-${filter.id}`"
                @click="setFilter(filter.id)"
              >
                {{ filter.label }}
                <span class="learner-teacher__filter-count">{{ filter.count }}</span>
              </button>
            </div>

            <p
              v-if="activeFilter === 'todo' && pendingCount === 0"
              class="learner-teacher__uptodate"
            >
              <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
              {{ t('teacher.learner_assignments_caught_up') }}
            </p>
            <p v-if="activeFilter === 'done' && completedCount === 0" class="learner-teacher__uptodate">
              {{ t('teacher.learner_assignments_no_completed') }}
            </p>

            <ul v-if="listItems.length" :id="`learner-teacher-panel-${activeFilter}`" class="learner-teacher__list learner-teacher__card-list" role="tabpanel">
              <li v-for="item in listItems" :key="item.id">
                <article
                  class="learner-teacher__row"
                  :class="[`is-${item.status}`, { 'is-completed': isCompleted(item) }]"
                >
                  <div class="learner-teacher__task-icon" :class="`is-${item.assignment?.kind || 'practice'}`" aria-hidden="true">
                    <i :class="kindIcon(item)"></i>
                  </div>
                  <div class="learner-teacher__row-main">
                    <div class="learner-teacher__row-top">
                      <div class="learner-teacher__row-copy">
                        <span class="learner-teacher__kind">{{ kindLabel(item) }}</span>
                        <strong>{{ rangeLabel(item) }}</strong>
                      </div>
                      <span class="learner-teacher__status" :class="`is-${item.status}`">
                        <i class="bi" :class="statusIcon(item)" aria-hidden="true"></i>
                        {{ statusLabel(item) }}
                      </span>
                    </div>

                    <div class="learner-teacher__meta-grid">
                      <span><i class="bi bi-person" aria-hidden="true"></i>{{ item.teacher_name || t('teacher.teacher') }}</span>
                      <span v-if="dueLabel(item)"><i class="bi bi-calendar-event" aria-hidden="true"></i>{{ dueLabel(item) }}</span>
                      <span><i class="bi bi-arrow-repeat" aria-hidden="true"></i>{{ progressLabel(item) }}</span>
                      <span v-if="messageCount(item)"><i class="bi bi-chat-dots" aria-hidden="true"></i>{{ t('teacher.task_messages_count', { n: messageCount(item) }) }}</span>
                    </div>

                    <div class="learner-teacher__progress" :aria-label="progressLabel(item)">
                      <span :style="{ width: `${progressPercent(item)}%` }"></span>
                    </div>

                    <p v-if="item.assignment?.feedback" class="learner-teacher__note-preview">
                      <i class="bi bi-chat-quote" aria-hidden="true"></i>
                      <span><strong>{{ t('teacher.teacher_note') }}</strong>{{ item.assignment.feedback }}</span>
                    </p>
                    <span v-if="isCompleted(item) && item.completed_at" class="learner-teacher__row-done">
                      <i class="bi bi-check2" aria-hidden="true"></i>{{ completedWhen(item) }}
                    </span>

                    <div class="learner-teacher__row-actions">
                      <button
                        v-if="!isCompleted(item) && !canConfirm(item)"
                        type="button"
                        class="dash-btn dash-btn--primary"
                        :disabled="savingId === item.id"
                        @click="$emit('start', item)"
                      >
                        <i class="bi" :class="actionIcon(item)" aria-hidden="true"></i>
                        {{ actionLabel(item) }}
                      </button>
                      <button
                        v-if="!isCompleted(item) && canConfirm(item)"
                        type="button"
                        class="dash-btn dash-btn--primary learner-teacher__complete"
                        :disabled="savingId === item.id"
                        @click="$emit('complete', item)"
                      >
                        <i class="bi bi-check2-circle" aria-hidden="true"></i>
                        {{ t('teacher.mark_complete') }}
                      </button>
                      <a v-if="canConfirm(item) && item.href" class="dash-btn dash-btn--ghost" :href="item.href">
                        <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                        {{ t('teacher.practice_again') }}
                      </a>
                      <button
                        type="button"
                        class="dash-btn dash-btn--ghost learner-teacher__details-button"
                        :aria-label="`${t('teacher.task_conversation')}: ${rangeLabel(item)}`"
                        @click="openDetails(item)"
                      >
                        <i class="bi bi-chat-dots" aria-hidden="true"></i>
                        {{ messageCount(item) ? t('teacher.task_conversation') : t('teacher.message_teacher') }}
                      </button>
                    </div>
                  </div>
                </article>
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

    <Teleport to="body">
    <div v-if="selectedItem" class="user-dashboard learner-teacher__portal">
    <div class="learner-teacher__modal-backdrop" @click.self="closeDetails">
      <section
        ref="detailsModal"
        class="learner-teacher__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="learner-teacher-details-title"
        tabindex="-1"
        @keydown="handleModalKeydown"
      >
        <header class="learner-teacher__modal-head">
          <div>
            <span class="learner-teacher__modal-kicker">{{ t('teacher.task_conversation') }}</span>
            <h3 id="learner-teacher-details-title">{{ rangeLabel(selectedItem) }}</h3>
          </div>
          <button ref="modalClose" type="button" class="learner-teacher__modal-close" :aria-label="t('common.close')" @click="closeDetails"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
        </header>
        <div class="learner-teacher__modal-body">
          <dl class="learner-teacher__facts">
            <div><dt>{{ t('teacher.teacher') }}</dt><dd>{{ selectedItem.teacher_name || t('teacher.unavailable') }}</dd></div>
            <div><dt>{{ t('teacher.group') }}</dt><dd>{{ selectedItem.organisation_name || t('teacher.unavailable') }}</dd></div>
            <div><dt>{{ t('teacher.kind') }}</dt><dd>{{ kindLabel(selectedItem) }}</dd></div>
            <div><dt>{{ t('teacher.task_status') }}</dt><dd><span class="learner-teacher__status" :class="`is-${selectedItem.status}`"><i class="bi" :class="statusIcon(selectedItem)" aria-hidden="true"></i> {{ statusLabel(selectedItem) }}</span></dd></div>
            <div><dt>{{ t('teacher.due') }}</dt><dd>{{ dueValue(selectedItem) || t('teacher.unavailable') }}</dd></div>
            <div><dt>{{ t('teacher.task_progress') }}</dt><dd>{{ progressLabel(selectedItem) || t('teacher.unavailable') }}</dd></div>
            <div v-if="isCompleted(selectedItem) && selectedItem.completed_at"><dt>{{ t('teacher.status_completed') }}</dt><dd>{{ completedWhen(selectedItem) }}</dd></div>
          </dl>
          <div v-if="selectedItem.assignment?.feedback" class="learner-teacher__teacher-note">
            <strong><i class="bi bi-chat-left-text" aria-hidden="true"></i> {{ t('teacher.teacher_note') }}</strong>
            <p>{{ selectedItem.assignment.feedback }}</p>
          </div>
          <section class="learner-teacher__conversation" :aria-label="t('teacher.task_conversation')">
            <div class="learner-teacher__conversation-head">
              <div>
                <h4>{{ t('teacher.task_conversation') }}</h4>
                <p>{{ t('teacher.task_conversation_hint') }}</p>
              </div>
              <i class="bi bi-shield-check" aria-hidden="true"></i>
            </div>
            <div v-if="selectedItem.messages?.length" class="learner-teacher__thread" aria-live="polite">
              <article
                v-for="message in selectedItem.messages"
                :key="message.id"
                class="learner-teacher__bubble"
                :class="`is-${message.sender}`"
              >
                <span>{{ message.sender === 'student' ? t('teacher.you') : (message.sender_name || selectedItem.teacher_name || t('teacher.teacher')) }}</span>
                <p>{{ message.body }}</p>
                <time v-if="message.created_at" :datetime="message.created_at">{{ messageWhen(message) }}</time>
              </article>
            </div>
            <div v-else class="learner-teacher__thread-empty">
              <i class="bi bi-chat-heart" aria-hidden="true"></i>
              <span>{{ t('teacher.task_conversation_empty') }}</span>
            </div>
            <form class="learner-teacher__composer" @submit.prevent="sendMessage">
              <label :for="`task-message-${selectedItem.id}`">{{ t('teacher.message_teacher') }}</label>
              <textarea
                :id="`task-message-${selectedItem.id}`"
                v-model="messageDraft"
                rows="3"
                maxlength="2000"
                :placeholder="t('teacher.message_teacher_placeholder')"
                :disabled="messageSaving"
              ></textarea>
              <div class="learner-teacher__composer-foot">
                <span v-if="messageError" class="learner-teacher__message-error" role="alert">{{ messageError }}</span>
                <span v-else-if="messageSent" class="learner-teacher__message-success" role="status"><i class="bi bi-check2-circle" aria-hidden="true"></i>{{ t('teacher.message_sent') }}</span>
                <span v-else>{{ messageDraft.length }}/2000</span>
                <button type="submit" class="dash-btn dash-btn--primary" :disabled="messageSaving || !messageDraft.trim()">
                  <i class="bi" :class="messageSaving ? 'bi-arrow-repeat' : 'bi-send'" aria-hidden="true"></i>
                  {{ messageSaving ? t('teacher.saving') : t('teacher.send_message') }}
                </button>
              </div>
            </form>
          </section>
        </div>
        <footer class="learner-teacher__modal-foot">
          <button type="button" class="dash-btn dash-btn--ghost" @click="closeDetails">{{ t('common.close') }}</button>
          <a v-if="selectedItem.href && !isCompleted(selectedItem)" class="dash-btn dash-btn--primary" :href="selectedItem.href" @click="closeDetails">
            <i class="bi" :class="actionIcon(selectedItem)" aria-hidden="true"></i> {{ actionLabel(selectedItem) }}
          </a>
          <a v-else-if="selectedItem.href" class="dash-btn dash-btn--primary" :href="selectedItem.href" @click="closeDetails"><i class="bi bi-arrow-repeat" aria-hidden="true"></i>{{ t('teacher.practice_again') }}</a>
        </footer>
      </section>
    </div>
    </div>
    </Teleport>
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
    onSendNote: { type: Function, required: true },
  },
  emits: ['start', 'complete', 'view-completed', 'dismiss-completion'],
  data() {
    return {
      activeFilter: 'todo',
      listLimit: 4,
      visibleLimit: 4,
      selectedItem: null,
      previouslyFocused: null,
      messageDraft: '',
      messageSaving: false,
      messageError: '',
      messageSent: false,
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
          id: 'todo',
          label: this.t('teacher.learner_assignments_filter_todo'),
          count: this.pendingCount,
        },
        {
          id: 'done',
          label: this.t('teacher.status_completed'),
          count: this.completedCount,
        },
      ]
      return filters
    },
    filteredByStatus() {
      if (this.activeFilter === 'done') {
        return this.assignments.filter((row) => row.status === 'completed')
      }
      if (this.activeFilter === 'all') return this.assignments
      if (this.activeFilter === 'todo') {
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
    selectedItem(value) {
      if (typeof document !== 'undefined') document.body.classList.toggle('modal-open', Boolean(value))
    },
  },
  beforeUnmount() {
    if (typeof document !== 'undefined') document.body.classList.remove('modal-open')
  },
  methods: {
    setFilter(id) {
      this.activeFilter = id
      this.visibleLimit = this.listLimit
    },
    openDetails(row) {
      this.previouslyFocused = typeof document !== 'undefined' ? document.activeElement : null
      this.selectedItem = row
      this.messageDraft = ''
      this.messageError = ''
      this.messageSent = false
      this.$nextTick(() => this.$refs.modalClose?.focus())
    },
    closeDetails() {
      this.selectedItem = null
      this.$nextTick(() => this.previouslyFocused?.focus?.())
    },
    async sendMessage() {
      const body = this.messageDraft.trim()
      if (!body || !this.selectedItem || this.messageSaving) return
      this.messageSaving = true
      this.messageError = ''
      this.messageSent = false
      try {
        const message = await this.onSendNote(this.selectedItem, body)
        if (message) {
          this.selectedItem.messages = [...(this.selectedItem.messages || []), message]
        }
        this.messageDraft = ''
        this.messageSent = true
      } catch (error) {
        this.messageError = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.messageSaving = false
      }
    },
    handleModalKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.closeDetails()
        return
      }
      if (event.key !== 'Tab') return
      const root = this.$refs.detailsModal
      const focusable = root ? [...root.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled) : []
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
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
    progressPercent(row) {
      const completed = Number(row?.progress?.completed || 0)
      const target = Math.max(1, Number(row?.progress?.target || 1))
      return Math.max(0, Math.min(100, Math.round((completed / target) * 100)))
    },
    messageCount(row) {
      return Array.isArray(row?.messages) ? row.messages.length : 0
    },
    messageWhen(message) {
      try {
        const date = new Date(message?.created_at)
        if (Number.isNaN(date.getTime())) return ''
        return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      } catch (_) {
        return ''
      }
    },
    canConfirm(row) {
      return Number(row?.progress?.activity_count || 0) >= Number(row?.progress?.target || 1)
    },
    dueLabel(row) {
      const value = this.dueValue(row)
      return value ? `${this.t('teacher.due')}: ${value}` : ''
    },
    dueValue(row) {
      const due = row?.assignment?.due_at
      if (!due) return ''
      try {
        const date = new Date(due)
        if (Number.isNaN(date.getTime())) return ''
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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
      if (this.isCompleted(row)) return this.t('teacher.practice_again')
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
