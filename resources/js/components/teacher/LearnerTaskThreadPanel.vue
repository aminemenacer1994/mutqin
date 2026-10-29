<template>
  <Teleport to="body">
    <div
      v-if="open && task"
      class="dash-drawer-root user-dashboard dash-student-thread-root"
      :class="{ 'is-mobile-sheet': isMobileLayout }"
      @keydown="onKeydown"
    >
      <button
        type="button"
        class="dash-drawer__backdrop"
        :aria-label="t('dashboard.drawer_close')"
        @click="close"
      ></button>
      <aside
        ref="panel"
        class="dash-drawer dash-student-thread"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
      >
        <div class="dash-drawer__handle" aria-hidden="true"></div>
        <header class="dash-drawer__head">
          <div class="dash-drawer__head-main">
            <span class="dash-drawer__head-icon" aria-hidden="true">
              <i class="bi bi-chat-dots"></i>
            </span>
            <div class="dash-drawer__head-copy">
              <h2 :id="titleId" class="dash-drawer__title">{{ taskTitle }}</h2>
              <p class="dash-drawer__subtitle">{{ teacherName }}</p>
            </div>
          </div>
          <button
            ref="closeBtn"
            type="button"
            class="dash-icon-btn dash-drawer__close"
            :aria-label="t('common.close')"
            @click="close"
          >
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <p v-if="pinnedContext" class="dash-student-thread__context" role="status">
          <i class="bi bi-pin-angle" aria-hidden="true"></i>
          {{ pinnedContext }}
        </p>

        <div class="dash-drawer__body dash-student-thread__body">
          <div class="dash-drawer__content">
            <TeacherTaskConversation
              ref="conversation"
              :messages="displayMessages"
              variant="learner"
              thread-class="dash-student-thread__thread"
              viewer-role="student"
              :peer-name="teacherName"
              :teacher-note="''"
              :compose="true"
              :task-id="task.id"
              :composer-id="composerId"
              :composer-placeholder="t('teacher.learner_thread_composer_placeholder')"
              :empty-label="t('teacher.learner_thread_empty')"
              :on-send="handleSend"
            />
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import TeacherTaskConversation from './TeacherTaskConversation.vue'
import {
  createOptimisticMessage,
  markOptimisticFailed,
  normalizeThreadMessages,
} from '../../scripts/teacher/learnerTaskThread.js'

function createClientMessageId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default {
  name: 'LearnerTaskThreadPanel',
  components: { TeacherTaskConversation },
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
        this.previouslyFocused = typeof document !== 'undefined' ? document.activeElement : null
        this.refreshThread(true)
        this.lockScroll(true)
        this.$nextTick(() => this.$refs.closeBtn?.focus())
      } else {
        this.lockScroll(false)
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
      try {
        const payload = await this.onSend(this.task, body, recording, clientMessageId)
        const serverRow = payload?.message || payload
        if (serverRow) {
          this.localMessages = this.localMessages.filter((row) => row.id !== optimistic.id)
          this.$emit('messages-updated', {
            taskId: this.task.id,
            append: serverRow,
          })
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
      this.$nextTick(() => this.previouslyFocused?.focus?.())
    },
    onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.close()
      }
    },
    lockScroll(open) {
      if (typeof document === 'undefined') return
      document.documentElement.classList.toggle('dash-drawer-open', open)
      document.body.classList.toggle('dash-drawer-open', open)
    },
  },
  beforeUnmount() {
    this.lockScroll(false)
  },
}
</script>
