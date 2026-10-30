<template>
  <section class="teacher-stack teacher-assignments" :class="{ 'is-compact': compactView }">
    <h2 class="visually-hidden">{{ t('teacher.nav_assignments') }}</h2>
    <p v-if="success" class="alert alert-success mb-0" role="status">{{ success }}</p>
    <p v-if="error && !formOpen" class="alert alert-danger mb-0" role="alert">{{ error }}</p>

    <div class="teacher-toolbar teacher-toolbar--tasks d-flex flex-wrap align-items-center gap-2">
      <label class="input-group teacher-search teacher-search--tasks flex-grow-1">
        <span class="visually-hidden">{{ t('teacher.search') }}</span>
        <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
        <input v-model="query" class="form-control" type="search" :placeholder="t('teacher.task_search_placeholder')" autocomplete="off">
      </label>
      <div class="teacher-task-filter-shell">
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
          <button
            v-if="hasActiveTaskFilters"
            type="button"
            class="btn btn-outline-secondary btn-sm teacher-task-filters__clear"
            @click="resetFilters"
          >
            <i class="bi bi-x-lg" aria-hidden="true"></i>
            <span class="visually-hidden">{{ t('teacher.clear_filters') }}</span>
          </button>
        </div>
      </div>
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm teacher-density-toggle"
        :class="{ 'is-active': compactView }"
        :aria-pressed="compactView ? 'true' : 'false'"
        :aria-label="compactView ? t('teacher.switch_comfortable_view') : t('teacher.switch_compact_view')"
        :title="compactView ? t('teacher.comfortable_view_help') : t('teacher.compact_view_help')"
        @click="toggleCompactView"
      >
        <i :class="compactView ? 'bi bi-arrows-expand' : 'bi bi-arrows-collapse'" aria-hidden="true"></i>
        <span class="visually-hidden">{{ compactView ? t('teacher.switch_comfortable_view') : t('teacher.switch_compact_view') }}</span>
      </button>
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
      <div class="teacher-task-list-heading">
        <strong>{{ t('teacher.tasks_count', { n: filteredItems.length }) }}</strong>
        <span>{{ t('teacher.tasks_order_help') }}</span>
      </div>
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
                <span class="teacher-hifz-tag" :class="`is-${item.category}`">{{ item.categoryLabel }}</span>
                <span>{{ item.actionLabel }}</span>
                <span v-if="item.status === 'completed' && item.completionEvidence">{{ item.completionEvidence }}</span>
                <template v-else>
                  <span v-if="item.dueText" class="teacher-task-row__due" :class="`is-${item.dueTone}`">{{ item.dueText }}</span>
                  <span v-if="item.status === 'in_progress' && item.progress">{{ item.progress }}</span>
                </template>
              </span>
            </button>
            <span class="teacher-task-row__aside">
              <span class="teacher-task-row__status" :class="`is-${item.statusTone}`">
                <i :class="item.statusIcon" aria-hidden="true"></i>
                <span>{{ item.statusLabel }}</span>
              </span>
              <span class="teacher-task-row__controls">
              <button type="button" class="btn btn-sm teacher-task-row__manage teacher-task-row__manage--icon teacher-task-row__message" :aria-label="`${t('teacher.task_conversation')} ${item.studentName}${item.messages.length ? `, ${t('teacher.task_messages_count', { n: item.messages.length })}` : ''}`" :title="`${t('teacher.task_conversation')}${item.messages.length ? ` · ${t('teacher.task_messages_count', { n: item.messages.length })}` : ''}`" @click="openMessages(item)">
                <i class="bi bi-chat-dots" aria-hidden="true"></i>
                <span class="visually-hidden">{{ t('teacher.conversation') }}</span>
              </button>
              <button v-if="item.evidence?.audio?.available || item.evidence?.transcript" type="button" class="btn btn-sm teacher-task-row__manage teacher-task-row__manage--icon" :aria-label="t('teacher.open_session_review')" :title="t('teacher.open_session_review')" @click="openMessages(item)"><i class="bi bi-play-circle" aria-hidden="true"></i></button>
              <button v-if="item.canManage" type="button" class="btn btn-sm teacher-task-row__manage teacher-task-row__manage--icon" :aria-label="`${t('teacher.task_edit')} ${item.studentName}`" :title="t('teacher.task_edit')" @click="$emit('edit', item.sourceRow)">
                <i class="bi bi-pencil" aria-hidden="true"></i>
                <span class="visually-hidden">{{ t('teacher.task_edit') }}</span>
              </button>
              <button v-if="item.canManage" type="button" class="btn btn-sm teacher-task-row__manage teacher-task-row__manage--icon" :aria-label="`${t('teacher.task_remove_prompt')} ${item.studentName}`" :title="t('teacher.task_remove_prompt')" @click="openRemove(item)">
                <i class="bi bi-trash" aria-hidden="true"></i>
                <span class="visually-hidden">{{ t('teacher.task_remove_prompt') }}</span>
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
      <button v-if="!rows.length" type="button" class="btn btn-primary btn-sm" @click="$emit('new')">{{ t('teacher.add_task') }}</button>
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
              <div class="modal-header teacher-task-modal__header teacher-message-modal__header teacher-message-modal__header--simple">
                <div class="teacher-task-modal__intro">
                  <h2 id="teacher-message-title" class="modal-title h5 teacher-task-modal__title">{{ messageItem.studentName }}</h2>
                  <p class="teacher-message-modal__subtitle">{{ messageItem.title }} · {{ messageItem.statusLabel }}</p>
                </div>
                <button ref="messageClose" type="button" class="btn-close" :aria-label="t('teacher.close')" @click="closeMessages"></button>
              </div>
              <div class="modal-body teacher-message-modal__body">
                <p v-if="messageItem.assignment.feedback" class="teacher-message-modal__note-line"><strong>{{ t('teacher.task_note_label') }}</strong> {{ messageItem.assignment.feedback }}</p>
                <audio v-if="messageItem.evidence?.audio?.available" class="teacher-message-modal__audio" controls preload="metadata" :src="messageItem.evidence.audio.url"></audio>
                <div v-if="messageItem.messages.length" class="teacher-message-thread" aria-live="polite">
                  <article v-for="message in messageItem.messages" :key="message.id" class="teacher-message-bubble" :class="[`is-${message.sender}`, { 'is-unread': message.unread }]">
                    <span>{{ message.sender === 'teacher' ? t('teacher.you') : messageItem.studentName }}</span>
                    <p v-if="message.body">{{ message.body }}</p>
                    <div v-if="message.audio?.available && message.audio?.url" class="teacher-message-bubble__audio">
                      <i class="bi bi-mic-fill" aria-hidden="true"></i>
                      <audio controls preload="metadata" :src="message.audio.url">{{ t('teacher.voice_note') }}</audio>
                    </div>
                    <time v-if="message.created_at" :datetime="message.created_at">{{ messageWhen(message) }}<template v-if="message.sender === 'teacher'"> · {{ message.delivery_status === 'read' ? t('teacher.message_read') : t('teacher.message_sent_status') }}</template></time>
                  </article>
                </div>
                <div v-else class="teacher-message-empty">
                  <i class="bi bi-chat-left-text" aria-hidden="true"></i>
                  <p>{{ t('teacher.messages_empty_short') }}</p>
                </div>
                <form class="teacher-message-composer teacher-message-composer--compact" @submit.prevent="sendMessage">
                  <label class="visually-hidden" for="teacher-task-reply">{{ t('teacher.message') }}</label>
                  <textarea id="teacher-task-reply" v-model="messageDraft" rows="3" maxlength="2000" :placeholder="t('teacher.reply_placeholder')" :disabled="messageSaving"></textarea>
                  <TeacherVoiceNoteControls ref="taskVoice" :disabled="messageSaving" />
                  <div v-if="messageItem.status === 'awaiting_confirmation'" class="teacher-message-composer__review">
                    <button type="button" class="btn btn-success btn-sm" :disabled="reviewSaving" @click="approveSubmission">
                      <i class="bi bi-check2-circle" aria-hidden="true"></i>{{ t('teacher.task_approve') }}
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="reviewSaving" @click="requestCorrection">
                      <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>{{ t('teacher.task_request_correction') }}
                    </button>
                  </div>
                  <div class="teacher-message-composer__foot">
                    <span v-if="messageError" class="alert alert-danger py-1 px-2 mb-0" role="alert">{{ messageError }}</span>
                    <span v-else-if="messageSent" class="alert alert-success py-1 px-2 mb-0" role="status">{{ t('teacher.message_sent') }}</span>
                    <span v-else aria-hidden="true"></span>
                    <button type="submit" class="btn btn-primary teacher-message-composer__send" :disabled="messageSaving || !canSendTaskMessage" :aria-label="messageSaving ? t('teacher.saving_message') : t('teacher.send_message')" :title="t('teacher.send_message')">
                      <i class="bi" :class="messageSaving ? 'bi-arrow-repeat' : 'bi-send'" aria-hidden="true"></i>
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
import {
  TASK_STATE,
  formatTaskDueUrgency,
  resolveDisplayTaskState,
  taskStateFromTeacherItem,
  taskStateIcon,
  taskStateLabelKey,
  teacherListStatusTone,
} from '../../scripts/teacher/taskState'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherMore from './TeacherMore.vue'
import TeacherSectionPane from './TeacherSectionPane.vue'
import TeacherTaskSheet from './TeacherTaskSheet.vue'
import { captureReturnFocus, handleModalKeydown, restoreReturnFocus } from '../../utils/modalFocus'
import TeacherVoiceNoteControls from './TeacherVoiceNoteControls.vue'
import { learningApi } from '../../scripts/api/learning'

const STEP = 25

export default {
  name: 'TeacherAssignmentsSection',
  components: { TeacherEmpty, TeacherMore, TeacherSectionPane, TeacherTaskSheet, TeacherVoiceNoteControls },
  mixins: [i18nMixin],
  props: {
    form: { type: Object, required: true },
    formOpen: { type: Boolean, default: false },
    editing: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    success: { type: String, default: '' },
    error: { type: String, default: '' },
    rows: { type: Array, default: () => [] },
    initialStatusFilter: { type: String, default: 'all' },
    loading: { type: Boolean, default: false },
    students: { type: Array, default: () => [] },
    surahs: { type: Array, default: () => [] },
    onSendMessage: { type: Function, required: true },
  },
  emits: ['update:form', 'update:formOpen', 'new', 'edit', 'save', 'remove', 'open-student', 'refresh'],
  data() {
    return {
      shown: STEP,
      STEP,
      query: '',
      statusFilter: this.initialStatusFilter,
      removeItem: null,
      messageItem: null,
      messageDraft: '',
      messageSaving: false,
      messageError: '',
      messageSent: false,
      messageSentTimer: null,
      reviewSaving: false,
      returnFocusEl: null,
      compactView: false,
    }
  },
  mounted() {
    this.compactView = window.localStorage.getItem('mutqin.teacher.tasks.compact') === '1'
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
    if (this.messageSentTimer) clearTimeout(this.messageSentTimer)
    this.$refs.taskVoice?.discardRecording()
    document.body.classList.remove('modal-open', 'teacher-task-modal-open')
  },
  computed: {
    hasActiveTaskFilters() { return Boolean(this.query || this.statusFilter !== 'all') },
    canSendTaskMessage() {
      if (this.messageSaving || this.$refs.taskVoice?.isRecordingActive) return false
      return Boolean(this.messageDraft.trim() || this.$refs.taskVoice?.hasRecording)
    },
    taskFilters() {
      const counts = this.flatItems.reduce((result, item) => {
        result.all += 1
        if (item.status === 'completed') result.done += 1
        else if (item.status === 'overdue') result.overdue += 1
        else if (item.status === 'in_progress') result.progress += 1
        else if (item.status === 'awaiting_confirmation') result.submitted += 1
        else result.waiting += 1
        return result
      }, { all: 0, waiting: 0, progress: 0, submitted: 0, overdue: 0, done: 0 })
      return [
        { id: 'all', label: this.t('teacher.task_filter_all'), count: counts.all },
        { id: 'waiting', label: this.t('teacher.task_filter_waiting'), count: counts.waiting },
        { id: 'progress', label: this.t('teacher.task_filter_progress'), count: counts.progress },
        { id: 'submitted', label: this.t('status_submitted'), count: counts.submitted },
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
          const status = this.normalizedStatus(recipient.status)
          const category = assignment.hifz_category || this.inferHifzCategory(assignment)
          const snapshot = taskStateFromTeacherItem(recipient, assignment)
          const displayState = snapshot.display
          const dueUrgency = formatTaskDueUrgency(assignment.due_at, {
            done: snapshot.base === TASK_STATE.DONE,
            t: this.t.bind(this),
            formatDate: formatTeacherWhen,
          })
          return {
            key: `${assignment.id}-${recipient.id}`,
            kind: assignment.kind,
            category,
            categoryLabel: this.t(`teacher.hifz_${category}`),
            actionLabel: assignment.kind === 'ai_recite' ? this.t('teacher.kind_ai') : this.t('teacher.kind_practice'),
            title,
            studentId: recipient.student_id,
            studentName: recipient.student_name || this.t('teacher.unavailable'),
            assignment,
            sourceRow: row,
            canManage: Boolean(row.can_manage) && !assignment.learning_group_id && recipients.length === 1 && recipientIndex === 0,
            status,
            taskStateDisplay: displayState,
            statusTone: teacherListStatusTone(recipient, displayState),
            statusIcon: `bi ${taskStateIcon(displayState)}`,
            statusLabel: recipient.review_state === 'needs_correction'
              ? this.t('teacher.status_needs_correction')
              : this.t(taskStateLabelKey(displayState)),
            dueText: dueUrgency.text,
            dueTone: dueUrgency.tone,
            due: dueUrgency.text,
            progress: this.progressLabel(recipient, assignment),
            completionEvidence: this.completionEvidenceLabel(recipient),
            recipientId: recipient.id,
            evidence: recipient.evidence || null,
            messages: Array.isArray(recipient.messages) ? recipient.messages : [],
            occurredAt: recipient.updated_at || assignment.created_at || '',
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
        : items.filter((item) => {
          if (this.statusFilter === 'done') return item.status === 'completed'
          if (this.statusFilter === 'overdue') return item.status === 'overdue'
          if (this.statusFilter === 'progress') return item.status === 'in_progress'
          if (this.statusFilter === 'submitted') return item.status === 'awaiting_confirmation'
          return item.status === 'pending'
        })
      return filtered.sort((a, b) => {
        const rank = (item) => {
          if (item.taskStateDisplay === TASK_STATE.OVERDUE) return 0
          if (item.taskStateDisplay === TASK_STATE.NOT_STARTED) return 1
          if (item.taskStateDisplay === TASK_STATE.IN_PROGRESS) return 2
          if (item.taskStateDisplay === TASK_STATE.WAITING_REVIEW) return 3
          return 4
        }
        const urgencyDifference = rank(a) - rank(b)
        if (urgencyDifference) return urgencyDifference
        const dateA = Date.parse(a.occurredAt || '') || 0
        const dateB = Date.parse(b.occurredAt || '') || 0
        return dateB - dateA || String(b.key).localeCompare(String(a.key), undefined, { numeric: true })
      })
    },
    visibleItems() {
      return this.filteredItems.slice(0, this.shown)
    },
  },
  methods: {
    normalizedStatus(status) {
      return status || 'pending'
    },
    inferHifzCategory(assignment) {
      if (assignment.kind === 'ai_recite') return 'sabqi'
      return Number(assignment.repetition_target || 0) >= 5 ? 'manzil' : 'sabaq'
    },
    toggleCompactView() {
      this.compactView = !this.compactView
      window.localStorage.setItem('mutqin.teacher.tasks.compact', this.compactView ? '1' : '0')
    },
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
      if (this.messageSentTimer) clearTimeout(this.messageSentTimer)
      this.$refs.taskVoice?.discardRecording()
      this.returnFocusEl = captureReturnFocus()
      this.messageItem = item
      this.messageDraft = ''
      this.messageError = ''
      this.messageSent = false
      this.$nextTick(() => this.$refs.messageClose?.focus())
    },
    closeMessages() {
      if (this.messageSentTimer) clearTimeout(this.messageSentTimer)
      this.$refs.taskVoice?.discardRecording()
      this.messageItem = null
      this.$nextTick(() => restoreReturnFocus(this.returnFocusEl))
    },
    clearMessageComposer() {
      this.messageDraft = ''
      this.messageError = ''
      this.messageSent = false
      this.$refs.taskVoice?.discardRecording()
    },
    openMessageStudent() {
      const id = this.messageItem?.studentId
      this.closeMessages()
      if (id) this.$emit('open-student', id)
    },
    onMessageKeydown(event) {
      handleModalKeydown(event, { container: this.$refs.messageDialog, open: Boolean(this.messageItem), onEscape: this.closeMessages })
    },
    async sendMessage() {
      const body = this.messageDraft.trim()
      const recording = this.$refs.taskVoice?.recordingPayload?.() || null
      if ((!body && !recording) || !this.messageItem || this.messageSaving) return
      this.messageSaving = true
      this.messageError = ''
      this.messageSent = false
      try {
        const message = await this.onSendMessage(this.messageItem.recipientId, body, recording)
        if (message) this.messageItem.messages.push(message)
        this.messageDraft = ''
        this.$refs.taskVoice?.discardRecording()
        this.messageSent = true
        if (this.messageSentTimer) clearTimeout(this.messageSentTimer)
        this.messageSentTimer = window.setTimeout(() => {
          this.messageSent = false
          this.messageSentTimer = null
        }, 3000)
      } catch (error) {
        this.messageError = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.messageSaving = false
      }
    },
    async approveSubmission() {
      if (!this.messageItem?.recipientId || this.reviewSaving) return
      this.reviewSaving = true
      this.messageError = ''
      try {
        const payload = await learningApi.approveTeacherAssignmentRecipient(this.messageItem.recipientId)
        if (payload?.recipient) {
          this.syncMessageItemState(payload.recipient)
        }
        this.$emit('refresh')
      } catch (error) {
        this.messageError = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.reviewSaving = false
      }
    },
    async requestCorrection() {
      if (!this.messageItem?.recipientId || this.reviewSaving) return
      this.reviewSaving = true
      this.messageError = ''
      try {
        const note = this.messageDraft.trim()
        const payload = await learningApi.requestTeacherAssignmentCorrection(this.messageItem.recipientId, note)
        if (payload?.recipient) {
          this.syncMessageItemState(payload.recipient)
        }
        this.messageDraft = ''
        this.$emit('refresh')
      } catch (error) {
        this.messageError = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.reviewSaving = false
      }
    },
    syncMessageItemState(recipient) {
      if (!this.messageItem) return
      const assignment = this.messageItem.assignment || {}
      const snapshot = taskStateFromTeacherItem(recipient, assignment)
      const displayState = snapshot.display
      this.messageItem.status = recipient.status
      this.messageItem.statusLabel = recipient.review_state === 'needs_correction'
        ? this.t('teacher.status_needs_correction')
        : this.t(taskStateLabelKey(displayState))
      this.messageItem.statusTone = teacherListStatusTone(recipient, displayState)
      this.messageItem.statusIcon = `bi ${taskStateIcon(displayState)}`
      this.messageItem.taskStateDisplay = displayState
    },
    messageWhen(message) {
      try {
        const date = new Date(message?.created_at)
        if (Number.isNaN(date.getTime())) return ''
        return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
  },
}
</script>
