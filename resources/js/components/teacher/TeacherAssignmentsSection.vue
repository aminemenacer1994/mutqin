<template>
  <section class="teacher-stack">
    <header class="teacher-page-header teacher-page-header--context">
      <div class="teacher-page-header__main">
        <p class="teacher-page-header__eyebrow">{{ t('teacher.nav_assignments') }}</p>
        <h2 class="teacher-page-header__title teacher-page-header__title--display">{{ t('teacher.tasks_section_title') }}</h2>
        <p class="teacher-page-header__subtitle">{{ t('teacher.tasks_section_subtitle') }}</p>
      </div>
    </header>
    <p v-if="success" class="alert alert-success mb-0" role="status">{{ success }}</p>
    <p v-if="error && !formOpen" class="alert alert-danger mb-0" role="alert">{{ error }}</p>

    <div class="teacher-toolbar teacher-toolbar--tasks d-flex flex-wrap align-items-center gap-2">
      <label class="input-group teacher-search teacher-search--tasks flex-grow-1">
        <span class="visually-hidden">{{ t('teacher.search') }}</span>
        <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
        <input v-model="query" class="form-control" type="search" :placeholder="t('teacher.task_search_placeholder')" autocomplete="off">
      </label>
      <div class="btn-group btn-group-sm teacher-task-filters flex-wrap" role="group" :aria-label="t('teacher.task_filter_label')">
        <button
          v-for="filter in taskFilters"
          :key="filter.id"
          type="button"
          class="btn btn-outline-secondary btn-sm"
          :class="{ 'is-active': statusFilter === filter.id }"
          :aria-pressed="statusFilter === filter.id ? 'true' : 'false'"
          @click="setStatusFilter(filter.id)"
        >
          {{ filter.label }}<span class="teacher-task-filter__count">{{ filter.count }}</span>
        </button>
      </div>
      <button type="button" class="btn btn-primary btn-sm teacher-task-add" @click="$emit('new')">
        <i class="bi bi-plus-lg" aria-hidden="true"></i>
        {{ t('teacher.add_task') }}
      </button>
    </div>

    <p v-if="loading" class="teacher-loading-inline" role="status" aria-live="polite">
      <span class="dash-spinner" aria-hidden="true"></span>
      {{ t('teacher.loading') }}
    </p>

    <TeacherSectionPane
      v-else-if="filteredItems.length"
      tone="neutral"
    >
      <ul class="list-group list-group-flush teacher-task-list teacher-task-list--compact">
        <li v-for="item in visibleItems" :key="item.key" class="list-group-item p-0" :class="`teacher-task-list__item--${item.statusTone}`">
          <div class="teacher-task-row teacher-task-row--compact">
            <span class="teacher-task-row__icon" :class="`is-${item.statusTone}`" aria-hidden="true">
              <i :class="item.kind === 'ai_recite' ? 'bi bi-mic' : 'bi bi-journal-text'"></i>
            </span>
            <button type="button" class="teacher-task-row__copy teacher-task-row__open" :disabled="!item.studentId" @click="$emit('open-student', item.studentId)">
              <span class="teacher-task-row__student">{{ item.studentName }}</span>
              <span class="teacher-task-row__range">{{ item.title }}</span>
              <span class="teacher-task-row__meta">
                <span>{{ item.kindLabel }}</span>
                <span v-if="item.due">{{ item.due }}</span>
                <span v-if="item.progress">{{ item.progress }}</span>
                <span v-if="item.completionEvidence">{{ item.completionEvidence }}</span>
              </span>
            </button>
            <span class="teacher-task-row__aside">
              <span class="teacher-task-row__status" :class="`is-${item.statusTone}`">
                <i :class="item.statusIcon" aria-hidden="true"></i>
                <span>{{ item.statusLabel }}</span>
              </span>
              <span class="teacher-task-row__controls">
              <button type="button" class="btn btn-sm teacher-task-row__manage teacher-task-row__message" :aria-label="`${t('teacher.task_conversation')} ${item.studentName}`" :title="t('teacher.task_conversation')" @click="openMessages(item)">
                <i class="bi bi-chat-dots" aria-hidden="true"></i>
                <span v-if="item.messages.length" class="teacher-task-row__message-count">{{ item.messages.length }}</span>
              </button>
              <button v-if="item.canManage" type="button" class="btn btn-sm teacher-task-row__manage" :aria-label="`${t('teacher.task_edit')} ${item.studentName}`" :title="t('teacher.task_edit')" @click="$emit('edit', item.sourceRow)">
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button v-if="item.canManage" type="button" class="btn btn-sm teacher-task-row__manage" :aria-label="`${t('teacher.task_remove')} ${item.studentName}`" :title="t('teacher.task_remove')" @click="openRemove(item)">
                <i class="bi bi-trash" aria-hidden="true"></i>
              </button>
              <button v-else-if="item.studentId" type="button" class="teacher-task-row__go" :aria-label="`${t('teacher.open')} ${item.studentName}`" @click="$emit('open-student', item.studentId)">
                <i class="bi bi-chevron-right teacher-task-row__chev" aria-hidden="true"></i>
              </button>
              </span>
            </span>
          </div>
        </li>
      </ul>
      <TeacherMore :remaining="filteredItems.length - shown" :shown="shown" :initial="STEP" @more="shown += STEP" @less="shown = STEP" />
    </TeacherSectionPane>
    <div v-else class="teacher-task-empty">
      <TeacherEmpty
        icon="bi bi-clipboard-check"
        :message="rows.length ? t('teacher.task_filter_empty') : t('teacher.assignments_empty')"
      />
      <button
        v-if="rows.length && (query || statusFilter !== 'all')"
        type="button"
        class="btn btn-outline-secondary btn-sm"
        @click="resetFilters"
      >
        {{ t('teacher.clear_filters') }}
      </button>
    </div>

    <TeacherTaskSheet
      :open="formOpen"
      :editing="editing"
      :form="form"
      :saving="saving"
      :error="error"
      :students="students"
      :surahs="surahs"
      @close="closeForm"
      @submit="$emit('save')"
      @update:form="$emit('update:form', $event)"
    />
    <Teleport to="body">
      <template v-if="removeItem">
        <div class="modal-backdrop fade show teacher-task-backdrop" @click="closeRemove"></div>
        <div ref="removeDialog" class="modal fade show d-block teacher-task-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-remove-title" tabindex="-1" @keydown="onRemoveKeydown">
          <div class="modal-dialog modal-dialog-centered teacher-task-modal__dialog">
            <div class="modal-content teacher-task-modal__content teacher-task-modal__content--remove">
              <div class="modal-header teacher-task-modal__header">
                <div class="teacher-task-modal__intro">
                  <span class="teacher-task-modal__eyebrow teacher-task-modal__eyebrow--danger"><i class="bi bi-trash3" aria-hidden="true"></i> {{ t('teacher.task_remove') }}</span>
                  <h2 id="teacher-remove-title" class="modal-title h5 teacher-task-modal__title">{{ t('teacher.task_remove') }}</h2>
                </div>
                <button type="button" class="btn-close" :aria-label="t('teacher.close')" @click="closeRemove"></button>
              </div>
              <div class="modal-body teacher-task-modal__remove-body">
                <span class="teacher-task-modal__remove-icon" aria-hidden="true"><i class="bi bi-exclamation-triangle"></i></span>
                <p class="mb-0">{{ t('teacher.task_remove_confirm', { student: removeItem.studentName, range: removeItem.title }) }}</p>
              </div>
              <div class="modal-footer teacher-task-modal__footer">
                <button type="button" class="btn btn-outline-secondary" @click="closeRemove">{{ t('teacher.close') }}</button>
                <button ref="removeButton" type="button" class="btn btn-danger" :disabled="saving" @click="confirmRemove">{{ t('teacher.task_remove') }}</button>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template v-if="messageItem">
        <div class="modal-backdrop fade show teacher-task-backdrop" @click="closeMessages"></div>
        <div ref="messageDialog" class="modal fade show d-block teacher-task-modal teacher-message-modal" role="dialog" aria-modal="true" aria-labelledby="teacher-message-title" tabindex="-1" @keydown="onMessageKeydown">
          <div class="modal-dialog modal-dialog-centered teacher-task-modal__dialog teacher-message-modal__dialog">
            <div class="modal-content teacher-task-modal__content teacher-message-modal__content">
              <div class="modal-header teacher-task-modal__header">
                <div class="teacher-task-modal__intro">
                  <span class="teacher-task-modal__eyebrow"><i class="bi bi-chat-dots" aria-hidden="true"></i> {{ t('teacher.task_conversation') }}</span>
                  <h2 id="teacher-message-title" class="modal-title h5 teacher-task-modal__title">{{ messageItem.studentName }}</h2>
                  <p>{{ messageItem.title }} · {{ messageItem.kindLabel }}</p>
                </div>
                <button ref="messageClose" type="button" class="btn-close" :aria-label="t('teacher.close')" @click="closeMessages"></button>
              </div>
              <div class="modal-body teacher-message-modal__body">
                <div v-if="messageItem.messages.length" class="teacher-message-thread" aria-live="polite">
                  <article v-for="message in messageItem.messages" :key="message.id" class="teacher-message-bubble" :class="`is-${message.sender}`">
                    <span>{{ message.sender === 'teacher' ? t('teacher.you') : messageItem.studentName }}</span>
                    <p>{{ message.body }}</p>
                    <time v-if="message.created_at" :datetime="message.created_at">{{ messageWhen(message) }}</time>
                  </article>
                </div>
                <div v-else class="teacher-message-empty">
                  <i class="bi bi-chat-heart" aria-hidden="true"></i>
                  <p>{{ t('teacher.teacher_conversation_empty', { student: messageItem.studentName }) }}</p>
                </div>
                <form class="teacher-message-composer" @submit.prevent="sendMessage">
                  <label for="teacher-task-reply">{{ t('teacher.reply_to_student') }}</label>
                  <textarea id="teacher-task-reply" v-model="messageDraft" rows="4" maxlength="2000" :placeholder="t('teacher.reply_placeholder')" :disabled="messageSaving"></textarea>
                  <div class="teacher-message-composer__foot">
                    <span v-if="messageError" class="text-danger" role="alert">{{ messageError }}</span>
                    <span v-else-if="messageSent" class="text-success" role="status"><i class="bi bi-check2-circle" aria-hidden="true"></i> {{ t('teacher.message_sent') }}</span>
                    <span v-else>{{ messageDraft.length }}/2000</span>
                    <button type="submit" class="btn btn-primary" :disabled="messageSaving || !messageDraft.trim()">
                      <i class="bi" :class="messageSaving ? 'bi-arrow-repeat' : 'bi-send'" aria-hidden="true"></i>
                      {{ messageSaving ? t('teacher.saving') : t('teacher.send_reply') }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Teleport>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { assignmentProgressLabel, formatTeacherWhen } from '../../scripts/teacher/formatters'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherMore from './TeacherMore.vue'
import TeacherSectionPane from './TeacherSectionPane.vue'
import TeacherTaskSheet from './TeacherTaskSheet.vue'
import { captureReturnFocus, handleModalKeydown, restoreReturnFocus } from '../../utils/modalFocus'

const STEP = 5

export default {
  name: 'TeacherAssignmentsSection',
  components: { TeacherEmpty, TeacherMore, TeacherSectionPane, TeacherTaskSheet },
  mixins: [i18nMixin],
  props: {
    form: { type: Object, required: true },
    formOpen: { type: Boolean, default: false },
    editing: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    success: { type: String, default: '' },
    error: { type: String, default: '' },
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    students: { type: Array, default: () => [] },
    surahs: { type: Array, default: () => [] },
    onSendMessage: { type: Function, required: true },
  },
  emits: ['update:form', 'update:formOpen', 'new', 'edit', 'save', 'remove', 'open-student'],
  data() {
    return {
      shown: STEP,
      STEP,
      query: '',
      statusFilter: 'all',
      removeItem: null,
      messageItem: null,
      messageDraft: '',
      messageSaving: false,
      messageError: '',
      messageSent: false,
      returnFocusEl: null,
    }
  },
  watch: {
    removeItem(value) {
      this.syncModalState(Boolean(value) || Boolean(this.messageItem))
    },
    messageItem(value) {
      this.syncModalState(Boolean(value) || Boolean(this.removeItem))
    },
  },
  beforeUnmount() {
    document.body.classList.remove('modal-open', 'teacher-task-modal-open')
  },
  computed: {
    taskFilters() {
      const counts = this.flatItems.reduce((result, item) => {
        result.all += 1
        if (item.status === 'completed') result.done += 1
        else if (item.status === 'overdue') result.overdue += 1
        else if (item.status === 'in_progress' || item.status === 'awaiting_confirmation') result.progress += 1
        else result.waiting += 1
        return result
      }, { all: 0, waiting: 0, progress: 0, overdue: 0, done: 0 })
      return [
        { id: 'all', label: this.t('teacher.task_filter_all'), count: counts.all },
        { id: 'waiting', label: this.t('teacher.task_filter_waiting'), count: counts.waiting },
        { id: 'progress', label: this.t('teacher.task_filter_progress'), count: counts.progress },
        { id: 'overdue', label: this.t('teacher.task_filter_overdue'), count: counts.overdue },
        { id: 'done', label: this.t('teacher.task_filter_completed'), count: counts.done },
      ]
    },
    flatItems() {
      return this.rows.flatMap((row) => {
        const assignment = row.assignment || {}
        const title = `${assignment.surah_name} ${assignment.ayah_start}–${assignment.ayah_end}`
        const recipients = row.recipients || []
        return recipients.map((recipient, recipientIndex) => {
          const status = recipient.status || 'pending'
          return {
            key: `${assignment.id}-${recipient.id}`,
            kind: assignment.kind,
            title,
            studentId: recipient.student_id,
            studentName: recipient.student_name || this.t('teacher.unavailable'),
            assignment,
            sourceRow: row,
            canManage: Boolean(row.can_manage) && !assignment.learning_group_id && recipients.length === 1 && recipientIndex === 0,
            status,
            statusTone: this.statusTone(status),
            statusIcon: this.statusIcon(status),
            statusLabel: this.t(`teacher.status_${status}`),
            kindLabel: assignment.kind === 'ai_recite' ? this.t('teacher.kind_ai') : this.t('teacher.kind_practice'),
            due: assignment.due_at ? `${this.t('teacher.due')}: ${formatTeacherWhen(assignment.due_at)}` : '',
            progress: this.progressLabel(recipient, assignment),
            completionEvidence: this.completionEvidenceLabel(recipient),
            recipientId: recipient.id,
            messages: Array.isArray(recipient.messages) ? recipient.messages : [],
          }
        })
      })
    },
    filteredItems() {
      const needle = this.query.trim().toLowerCase()
      const items = needle ? this.flatItems.filter((item) => (
        item.title.toLowerCase().includes(needle)
        || item.studentName.toLowerCase().includes(needle)
      )) : [...this.flatItems]
      const filtered = this.statusFilter === 'all'
        ? items
        : items.filter((item) => this.statusFilter === 'done'
          ? item.status === 'completed'
          : this.statusFilter === 'overdue'
            ? item.status === 'overdue'
            : this.statusFilter === 'progress'
              ? item.status === 'in_progress' || item.status === 'awaiting_confirmation'
              : item.status === 'pending')
      const urgency = { overdue: 0, in_progress: 1, pending: 2, completed: 3 }
      return filtered.sort((a, b) => (urgency[a.status] ?? 2) - (urgency[b.status] ?? 2))
    },
    visibleItems() {
      return this.filteredItems.slice(0, this.shown)
    },
  },
  methods: {
    syncModalState(open) {
      document.body.classList.toggle('modal-open', open)
      document.body.classList.toggle('teacher-task-modal-open', open)
    },
    openRemove(item) {
      this.returnFocusEl = captureReturnFocus()
      this.removeItem = item
      this.$nextTick(() => this.$refs.removeButton?.focus())
    },
    closeRemove() {
      this.removeItem = null
      this.$nextTick(() => restoreReturnFocus(this.returnFocusEl))
    },
    confirmRemove() {
      if (!this.removeItem || this.saving) return
      this.$emit('remove', this.removeItem.assignment.id)
      this.closeRemove()
    },
    onRemoveKeydown(event) {
      handleModalKeydown(event, { container: this.$refs.removeDialog, open: Boolean(this.removeItem), onEscape: this.closeRemove })
    },
    openMessages(item) {
      this.returnFocusEl = captureReturnFocus()
      this.messageItem = item
      this.messageDraft = ''
      this.messageError = ''
      this.messageSent = false
      this.$nextTick(() => this.$refs.messageClose?.focus())
    },
    closeMessages() {
      this.messageItem = null
      this.$nextTick(() => restoreReturnFocus(this.returnFocusEl))
    },
    onMessageKeydown(event) {
      handleModalKeydown(event, { container: this.$refs.messageDialog, open: Boolean(this.messageItem), onEscape: this.closeMessages })
    },
    async sendMessage() {
      const body = this.messageDraft.trim()
      if (!body || !this.messageItem || this.messageSaving) return
      this.messageSaving = true
      this.messageError = ''
      this.messageSent = false
      try {
        const message = await this.onSendMessage(this.messageItem.recipientId, body)
        if (message) this.messageItem.messages.push(message)
        this.messageDraft = ''
        this.messageSent = true
      } catch (error) {
        this.messageError = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.messageSaving = false
      }
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
    patch(key, value) {
      this.$emit('update:form', { ...this.form, [key]: value })
    },
    closeForm() {
      this.$emit('update:formOpen', false)
    },
    setStatusFilter(filter) {
      this.statusFilter = filter
      this.shown = STEP
    },
    resetFilters() {
      this.query = ''
      this.statusFilter = 'all'
      this.shown = STEP
    },
    progressLabel(recipient, assignment) {
      if (!recipient?.progress) return ''
      return assignmentProgressLabel({ ...recipient, assignment }, this.t.bind(this))
    },
    completionEvidenceLabel(recipient) {
      if (recipient?.status !== 'completed' || !recipient?.completed_at) return ''
      return this.t('teacher.learner_assignments_completed_at', {
        date: formatTeacherWhen(recipient.completed_at),
      })
    },
    statusTone(status) {
      if (status === 'completed') return 'good'
      if (status === 'overdue') return 'danger'
      if (status === 'in_progress' || status === 'awaiting_confirmation') return 'mid'
      return 'muted'
    },
    statusIcon(status) {
      if (status === 'completed') return 'bi bi-check2'
      if (status === 'overdue') return 'bi bi-exclamation-circle'
      if (status === 'in_progress' || status === 'awaiting_confirmation') return 'bi bi-arrow-repeat'
      return 'bi bi-clock'
    },
  },
}
</script>
