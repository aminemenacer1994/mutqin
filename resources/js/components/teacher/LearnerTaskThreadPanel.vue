<template>
  <DashModalRoot
    :open="open && Boolean(task)"
    :labelled-by="titleId"
    root-class="learner-task-thread-modal"
    panel-class="learner-task-thread-modal__panel"
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
        class="dash-modal__close dash-icon-btn"
        :aria-label="t('common.close')"
        @click="close"
      >
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>
    </header>

    <p v-if="pinnedContext" class="learner-task-thread-modal__context" role="status">
      <i class="bi bi-pin-angle" aria-hidden="true"></i>
      {{ pinnedContext }}
    </p>

    <div class="dash-modal__body learner-task-thread-modal__body">
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
        :on-send="handleSend"
      />
    </div>
  </DashModalRoot>
</template>

<script>
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
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default {
  name: 'LearnerTaskThreadPanel',
  components: { DashModalRoot, TeacherTaskConversation },
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    task: { type: Object, default: null },
    pinnedContext: { type: String, default: '' },
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
    displayMessages() {
      const server = normalizeThreadMessages(this.task?.messages || [], this.task?.id)
      const merged = [...server]
      for (const local of this.localMessages) {
        if (!merged.some((row) => row.id === local.id)) merged.push(local)
      }
      return merged.sort(
        (a, b) => String(a.sentAt || '').localeCompare(String(b.sentAt || '')) || String(a.id).localeCompare(String(b.id)),
      )
    },
  },
  watch: {
    open(value) {
      if (value && this.task) {
        this.previouslyFocused = captureReturnFocus()
        this.refreshThread(true)
        this.$nextTick(() => this.$refs.closeBtn?.focus())
      } else {
        restoreReturnFocus(this.previouslyFocused)
        this.previouslyFocused = null
        this.localMessages = []
      }
    },
  },
  methods: {
    focusComposer() {
      this.$refs.conversation?.focusComposer?.()
    },
    async refreshThread(markRead = false) {
      if (!this.task?.id) return
      this.loadingThread = true
      try {
        const payload = await learningApi.getLearnerAssignmentMessages(this.task.id)
        this.$emit('messages-updated', {
          taskId: this.task.id,
          messages: payload.messages,
          threadUnreadCount: payload.threadUnreadCount,
        })
      } catch (_) {
        if (!markRead) {
          // keep embedded support messages
        }
      } finally {
        this.loadingThread = false
      }
    },
    async handleSend(body, recording = null) {
      if (!this.task) return
      const clientMessageId = createClientMessageId()
      const optimistic = createOptimisticMessage(this.task.id, body, recording, clientMessageId)
      this.localMessages = [...this.localMessages, optimistic]
      this.$nextTick(() => this.$refs.conversation?.scrollThread?.())
      try {
        const payload = await this.onSend(this.task, body, recording, clientMessageId)
        const serverRow = payload?.message || payload
        if (serverRow) {
          this.localMessages = this.localMessages.filter((row) => row.id !== optimistic.id)
          this.$emit('messages-updated', {
            taskId: this.task.id,
            append: serverRow,
            threadUnreadCount: 0,
          })
          this.$nextTick(() => this.$refs.conversation?.scrollThread?.())
          return normalizeThreadMessages([serverRow], this.task.id)[0]
        }
        throw new Error('missing message')
      } catch (error) {
        this.localMessages = markOptimisticFailed(this.localMessages, optimistic.id)
        throw error
      }
    },
    close() {
      this.$emit('close')
    },
  },
}
</script>
