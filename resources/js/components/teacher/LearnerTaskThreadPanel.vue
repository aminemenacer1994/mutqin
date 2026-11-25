<template>
  <DashModalRoot
    :open="open && Boolean(task)"
    :labelled-by="titleId"
    root-class="dash-student-dialog-root learner-task-thread-modal"
    panel-class="dash-student-dialog dash-student-dialog--thread learner-task-thread-modal__panel dash-modal"
    :dir="textDirection"
    :close-on-backdrop="!sending"
    :close-on-escape="!sending"
    @close="close"
  >
    <header class="dash-modal__head learner-task-thread-modal__head">
      <div class="dash-modal__head-copy">
        <h2 :id="titleId">{{ taskTitle }}</h2>
        <p class="dash-modal__subtitle">{{ teacherName }}</p>
      </div>
      <button
        ref="closeBtn"
        type="button"
        class="dash-modal__close dash-btn dash-btn--tertiary dash-btn--sm"
        :aria-label="t('common.back')"
        :title="t('common.back')"
        :disabled="sending"
        @click="close"
      >
        <i class="bi bi-arrow-left" aria-hidden="true"></i>
        <span>{{ t('common.back') }}</span>
      </button>
    </header>

    <div v-if="confirmVoiceDiscard" class="learner-task-thread-modal__discard" role="alert">
      <p>{{ t('teacher.unsent_recording') }}</p>
      <button ref="keepRecording" type="button" class="dash-btn" @click="keepEditing">{{ t('teacher.keep_editing') }}</button>
      <button type="button" class="dash-btn" @click="discardAndClose">{{ t('teacher.discard_changes') }}</button>
    </div>

    <div class="dash-modal__body learner-task-thread-modal__body">
      <section v-if="correctionRequest" class="learner-task-thread-modal__correction" role="status">
        <div>
          <span class="learner-task-thread-modal__correction-kind">
            <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>{{ t('teacher.correction_request') }}
          </span>
          <p>{{ correctionRequest.note }}</p>
        </div>
        <a v-if="correctionRequest.href" class="dash-btn dash-btn--primary" :href="correctionRequest.href">
          {{ t('teacher.practise_correction') }}
        </a>
      </section>
      <TeacherTaskConversation
        ref="conversation"
        :messages="displayMessages"
        variant="learner"
        thread-class="learner-task-thread-modal__thread"
        viewer-role="student"
        :peer-name="teacherName"
        :teacher-note="''"
        :compose="true"
        :task-id="task?.id"
        :composer-id="composerId"
        :composer-placeholder="t('teacher.learner_thread_composer_placeholder')"
        :empty-label="t('teacher.learner_thread_empty')"
        :ui-direction="textDirection"
        :on-send="handleSend"
        :on-retry="retryMessage"
        @sending-change="sending = $event"
      />
    </div>
  </DashModalRoot>
</template>

<script>
import './LearnerFeedbackExperience.css'
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import DashModalRoot from '../dashboard/DashModalRoot.vue'
import TeacherTaskConversation from './TeacherTaskConversation.vue'
import {
  createOptimisticMessage,
  markOptimisticFailed,
  normalizeThreadMessages,
} from '../../scripts/teacher/learnerTaskThread.js'
import { captureReturnFocus, restoreReturnFocus } from '../../utils/modalFocus.js'

function createClientMessageId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16)
    return (character === 'x' ? value : ((value & 0x3) | 0x8)).toString(16)
  })
}

export default {
  name: 'LearnerTaskThreadPanel',
  components: { DashModalRoot, TeacherTaskConversation },
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    task: { type: Object, default: null },
    isMobileLayout: { type: Boolean, default: false },
    onSend: { type: Function, required: true },
  },
  emits: ['close', 'messages-updated'],
  data() {
    return {
      titleId: `learner-task-thread-${Math.random().toString(36).slice(2, 9)}`,
      composerId: `learner-task-composer-${Math.random().toString(36).slice(2, 9)}`,
      localMessages: [],
      loadingThread: false,
      previouslyFocused: null,
      sending: false,
      confirmVoiceDiscard: false,
      pendingPayloads: {},
      pollTimer: null,
      threadRequest: 0,
    }
  },
  computed: {
    taskTitle() {
      const assignment = this.task?.assignment
      if (!assignment) return this.t('teacher.task_conversation')
      return `${assignment.surah_name} · ${assignment.ayah_start}–${assignment.ayah_end}`
    },
    teacherName() {
      return this.task?.teacher_name || this.t('teacher.teacher')
    },
    textDirection() {
      const locale = this.$i18n?.locale?.value
        || (typeof document !== 'undefined' ? document.documentElement.getAttribute('lang') : null)
        || 'en'
      return ['ar', 'ur'].includes(String(locale).split('-')[0]) ? 'rtl' : 'ltr'
    },
    displayMessages() {
      const server = normalizeThreadMessages(this.task?.messages || [], this.task?.id)
      const merged = [...server]
      for (const local of this.localMessages) {
        if (!merged.some((row) => row.id === local.id || (row.clientMessageId && row.clientMessageId === local.clientMessageId))) merged.push(local)
      }
      return merged.sort(
        (a, b) => String(a.sentAt || '').localeCompare(String(b.sentAt || '')) || String(a.id).localeCompare(String(b.id)),
      )
    },
    correctionRequest() {
      if (this.task?.review_state !== 'needs_correction') return null
      const note = String(this.task?.completion_evidence?.correction_note || '').trim()
        || this.t('teacher.learner_correction_default')
      return { note, href: this.task?.href || '' }
    },
  },
  watch: {
    open(value) {
      if (value && this.task) {
        this.confirmVoiceDiscard = false
        this.previouslyFocused = captureReturnFocus()
        this.refreshThread(true)
        window.clearInterval(this.pollTimer)
        this.pollTimer = window.setInterval(() => this.refreshThread(), 10000)
        this.$nextTick(() => this.$refs.closeBtn?.focus())
      } else {
        this.threadRequest += 1
        this.loadingThread = false
        window.clearInterval(this.pollTimer)
        restoreReturnFocus(this.previouslyFocused)
        this.previouslyFocused = null
        this.clearLocalMessages()
      }
    },
  },
  beforeUnmount() {
    this.threadRequest += 1
    window.clearInterval(this.pollTimer)
    this.clearLocalMessages()
  },
  methods: {
    clearLocalMessages() {
      for (const message of this.localMessages) if (message.audioUrl?.startsWith('blob:')) URL.revokeObjectURL(message.audioUrl)
      this.localMessages = []
      this.pendingPayloads = {}
    },
    focusComposer() {
      this.$refs.conversation?.focusComposer?.()
    },
    async refreshThread(markRead = false) {
      if (!this.open || !this.task?.id || this.sending || this.loadingThread) return
      const taskId = this.task.id
      const request = ++this.threadRequest
      this.loadingThread = true
      try {
        const payload = await learningApi.getLearnerAssignmentMessages(taskId)
        if (!this.open || request !== this.threadRequest || String(taskId) !== String(this.task?.id)) return
        this.$emit('messages-updated', {
          taskId,
          messages: payload.messages,
          threadUnreadCount: payload.threadUnreadCount,
        })
      } catch (_) {
        if (!markRead) {
          // keep embedded support messages
        }
      } finally {
        if (request === this.threadRequest) this.loadingThread = false
      }
    },
    async handleSend(body, recording = null) {
      if (!this.task) return
      const clientMessageId = createClientMessageId()
      const optimistic = createOptimisticMessage(this.task.id, body, recording, clientMessageId)
      this.localMessages = [...this.localMessages, optimistic]
      this.pendingPayloads[optimistic.id] = { body, recording, clientMessageId }
      return this.deliverMessage(optimistic.id)
    },
    async retryMessage(message) {
      const pending = this.pendingPayloads[message.id]
      if (!pending) throw new Error(this.t('teacher.action_failed'))
      const server = await this.deliverMessage(message.id)
      return { message: server, body: pending.body, blob: pending.recording?.blob }
    },
    async deliverMessage(optimisticId) {
      this.threadRequest += 1
      this.loadingThread = false
      const task = this.task
      const { body, recording, clientMessageId } = this.pendingPayloads[optimisticId]
      this.localMessages = this.localMessages.map(row => row.id === optimisticId ? { ...row, pending: true, failed: false } : row)
      this.$nextTick(() => this.$refs.conversation?.scrollThread?.())
      try {
        const payload = await this.onSend(task, body, recording, clientMessageId)
        const serverRow = payload?.message || payload
        if (serverRow?.id) {
          this.threadRequest += 1
          this.loadingThread = false
          const optimistic = this.localMessages.find(row => row.id === optimisticId)
          if (optimistic?.audioUrl?.startsWith('blob:')) URL.revokeObjectURL(optimistic.audioUrl)
          this.localMessages = this.localMessages.filter((row) => row.id !== optimisticId)
          delete this.pendingPayloads[optimisticId]
          this.$emit('messages-updated', {
            taskId: task.id,
            append: serverRow,
            threadUnreadCount: 0,
          })
          this.$nextTick(() => this.$refs.conversation?.scrollThread?.())
          return normalizeThreadMessages([serverRow], task.id)[0]
        }
        throw new Error('missing message')
      } catch (error) {
        this.localMessages = markOptimisticFailed(this.localMessages, optimisticId)
        throw error
      }
    },
    close() {
      if (this.sending) return
      if (this.confirmVoiceDiscard) { this.keepEditing(); return }
      if (this.$refs.conversation?.hasVoiceDraft) {
        this.confirmVoiceDiscard = true
        this.$nextTick(() => this.$refs.keepRecording?.focus())
        return
      }
      this.$emit('close')
    },
    keepEditing() { this.confirmVoiceDiscard = false; this.$nextTick(() => this.focusComposer()) },
    discardAndClose() { this.$refs.conversation?.discardRecording(); this.confirmVoiceDiscard = false; this.$emit('close') },
  },
}
</script>
