<template>
  <TeacherSectionPane
    class="teacher-messages-pane teacher-messages-pane--student"
    tone="neutral"
    flat
    :title="embeddedInTabs ? '' : t('teacher.messages_private_title')"
    :hint="embeddedInTabs ? '' : t('teacher.messages_private_hint')"
    :icon="embeddedInTabs ? '' : 'bi bi-chat-dots'"
  >
    <div class="teacher-messages-layout teacher-messages-layout--profile">
    <section class="teacher-direct-thread teacher-direct-thread--chat teacher-direct-thread--full" :aria-label="t('teacher.messages_private_title')">
      <header class="teacher-direct-thread__head">
        <div class="teacher-direct-thread__head-copy visually-hidden">
          <p>{{ t('teacher.messages_private_title') }}</p>
        </div>
        <label class="teacher-direct-thread__search">
          <span class="visually-hidden">{{ t('teacher.message_search') }}</span>
          <input v-model="search" type="search" :placeholder="t('teacher.message_search')">
        </label>
        <div class="teacher-direct-thread__tools">
          <button v-if="unreadCount" type="button" class="btn btn-outline-secondary btn-sm" @click="jumpToUnread">
            {{ t('teacher.message_unread_jump', { n: unreadCount }) }}
          </button>
          <button v-if="hasTaskLink" type="button" class="btn btn-outline-secondary btn-sm teacher-direct-thread__related" @click="$emit('open-tasks')">
            {{ t('teacher.messages_related_tasks') }}
          </button>
        </div>
      </header>

      <p v-if="taskContext?.title" class="teacher-direct-thread__context">
        <span>{{ t('teacher.messages_about_task', { task: taskContext.title }) }}</span>
        <button type="button" class="btn btn-link btn-sm" @click="$emit('open-task', taskContext)">{{ t('teacher.task_view') }}</button>
        <button type="button" class="btn btn-link btn-sm" @click="$emit('clear-context')">{{ t('teacher.messages_clear_context') }}</button>
      </p>

      <div ref="thread" class="teacher-direct-thread__list" role="log" :aria-relevant="'additions'">
        <div v-if="!messages.length && !loadError" class="teacher-direct-thread__empty">
          <span aria-hidden="true"><i class="bi bi-chat-dots"></i></span>
          <p>{{ t('teacher.messages_start') }}</p>
        </div>
        <p v-else-if="search.trim() && !visibleMessages.length" class="teacher-direct-thread__empty">{{ t('teacher.message_search_empty') }}</p>
        <button v-if="hiddenCount > 0" type="button" class="teacher-direct-thread__earlier" @click="loadEarlier">
          {{ t('teacher.messages_load_earlier') }}
        </button>
        <p v-if="loadError" class="teacher-direct-thread__status is-error" role="alert">
          {{ loadError }}
          <button type="button" class="btn btn-link btn-sm" @click="refreshThread">{{ t('teacher.retry') }}</button>
        </p>
        <template v-for="(message, index) in visibleMessages" :key="message.id">
          <p v-if="startsDay(index)" class="teacher-direct-thread__day">{{ messageDay(message.created_at) }}</p>
          <article class="teacher-direct-thread__bubble" :class="bubbleClass(message, index)">
            <header v-if="!isGrouped(index)" class="teacher-direct-thread__bubble-head">
              <strong>{{ senderName(message) }}</strong>
            </header>
            <p v-if="message.body" dir="auto">{{ message.body }}</p>
            <div v-if="message.audio?.available && message.audio?.url" class="teacher-direct-thread__audio">
              <TeacherAudioFeedbackPlayer :src="message.audio.url" :duration-ms="message.audio.duration_ms" compact />
            </div>
            <button v-if="message.task?.surah_name" type="button" class="teacher-direct-thread__task" @click="$emit('open-task', { assignmentId: message.task.id, title: taskTitle(message.task) })">
              {{ t('teacher.task_view') }} · {{ taskTitle(message.task) }}
            </button>
            <footer class="teacher-direct-thread__bubble-foot">
              <time :datetime="message.created_at">{{ formatMessageWhen(message.created_at) }}</time>
              <small v-if="showReceipt(message)">{{ t('teacher.message_read') }}</small>
              <button
                v-if="message.body"
                type="button"
                class="teacher-direct-thread__tool"
                :aria-label="copiedId === message.id ? t('teacher.message_copied') : t('teacher.message_copy')"
                :title="copiedId === message.id ? t('teacher.message_copied') : t('teacher.message_copy')"
                @click="copyMessage(message)"
              >
                <i class="bi" :class="copiedId === message.id ? 'bi-check2' : 'bi-clipboard'" aria-hidden="true"></i>
              </button>
              <button
                v-if="message.sender === 'teacher' && !message.task"
                type="button"
                class="teacher-direct-thread__delete"
                :aria-label="t('teacher.delete_message')"
                :title="t('teacher.delete_message')"
                :disabled="deletingId === message.id"
                @click="deleteMessage(message)"
              >
                <i class="bi bi-trash3" aria-hidden="true"></i>
              </button>
            </footer>
          </article>
        </template>
      </div>

      <form class="teacher-direct-thread__composer" :aria-busy="saving ? 'true' : 'false'" @submit.prevent="send">
        <div class="teacher-direct-thread__replies" role="group" :aria-label="t('teacher.message_replies')">
          <button v-for="key in quickReplies" :key="key" type="button" class="btn btn-sm btn-outline-secondary" :disabled="saving" @click="useReply(key)">{{ t(key) }}</button>
        </div>
        <label class="visually-hidden" for="teacher-direct-reply">{{ t('teacher.message') }}</label>
        <textarea
          id="teacher-direct-reply"
          v-model="draft"
          v-auto-grow
          rows="1"
          maxlength="2000"
          dir="auto"
          :placeholder="t('teacher.direct_message_prompt')"
          :disabled="saving"
          @keydown.enter.exact="onEnterSend"
        ></textarea>
        <div class="teacher-direct-thread__composer-foot">
          <TeacherVoiceNoteControls ref="voice" :disabled="saving" @state-change="onVoiceChange" />
          <p v-if="error" role="alert" class="teacher-direct-thread__status is-error">{{ error }}<span class="teacher-direct-thread__status-timer" aria-hidden="true"></span></p>
          <p v-else-if="success" role="status" class="teacher-direct-thread__status is-success">{{ success }}<span class="teacher-direct-thread__status-timer" aria-hidden="true"></span></p>
          <div class="teacher-direct-thread__composer-actions">
            <button v-if="draft || hasVoiceNote" type="button" class="teacher-direct-thread__tool" :disabled="saving" :aria-label="t('teacher.clear_message')" :title="t('teacher.clear_message')" @click="clearComposer">
              <i class="bi bi-eraser" aria-hidden="true"></i>
            </button>
            <button type="submit" class="btn btn-primary btn-sm teacher-direct-thread__send" :disabled="!canSend" :aria-label="t('teacher.send_message')">
              <i class="bi" :class="saving ? 'bi-arrow-repeat' : 'bi-send-fill'" aria-hidden="true"></i>
              <span>{{ saving ? t('teacher.saving') : t('teacher.send_message') }}</span>
            </button>
          </div>
        </div>
      </form>
    </section>
    </div>
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { learningApi } from '../../../scripts/api/learning'
import TeacherAudioFeedbackPlayer from '../TeacherAudioFeedbackPlayer.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'
import TeacherVoiceNoteControls from '../TeacherVoiceNoteControls.vue'
import autoGrow from '../../../directives/autoGrow.js'
import { formatLearnerDisplayDate } from '../../../utils/learnerDisplayDate.js'
import { startVisiblePoll } from '../../../scripts/teacher/pollWhenVisible'
import { taskIsOverdue } from '../../../scripts/teacher/taskState'

const PAGE_SIZE = 40

export default {
  name: 'TeacherStudentProfileMessages',
  directives: { autoGrow },
  components: { TeacherAudioFeedbackPlayer, TeacherSectionPane, TeacherVoiceNoteControls },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    formatWhen: { type: Function, required: true },
    taskContext: { type: Object, default: null },
    embeddedInTabs: { type: Boolean, default: false },
  },
  emits: ['open-task', 'open-tasks', 'open-recitations', 'clear-context', 'unsent-change', 'unread-change', 'marked-read', 'sent'],
  data() {
    return {
      draft: '',
      saving: false,
      deletingId: null,
      error: '',
      success: '',
      loadError: '',
      sent: [],
      synced: [],
      removed: [],
      stopPoll: null,
      threadRequest: 0,
      disposed: false,
      stickToBottom: true,
      savedScroll: 0,
      visibleCount: PAGE_SIZE,
      restoring: false,
      voiceState: { hasRecording: false, active: false },
      search: '',
      copiedId: null,
      announcedUnread: 0,
      noticeTimer: null,
      pendingDelivery: null,
    }
  },
  watch: {
    'profile.student.id'() { this.resetThread() },
    draft(value) {
      if (this.restoring) return
      this.persistDraft(value)
      this.reportUnsent()
    },
    canSend() { this.reportUnsent() },
    'voiceState.hasRecording'() { this.reportUnsent() },
    'voiceState.active'() { this.reportUnsent() },
    messages: {
      immediate: true,
      handler(list) {
        const unread = (list || []).filter((message) => message?.unread && message?.sender !== 'teacher').length
        this.$emit('unread-change', unread)
        if (unread > this.announcedUnread) this.$emit('marked-read')
        this.announcedUnread = unread
      },
    },
  },
  computed: {
    messages() {
      const removed = new Set(this.removed)
      const rows = [...(this.profile.payload?.messages || []), ...this.synced, ...this.sent]
      return [...new Map(rows.map((message) => [message.id, message])).values()]
        .filter((message) => !removed.has(message.id))
        .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')) || Number(a.id) - Number(b.id))
    },
    quickReplies() {
      return [
        'teacher.message_reply_well_done',
        'teacher.message_reply_repeat',
        'teacher.message_reply_record',
        'teacher.message_reply_keep_going',
      ]
    },
    filteredMessages() {
      const needle = this.search.trim().toLocaleLowerCase()
      if (!needle) return this.messages
      return this.messages.filter((message) => `${message.body || ''} ${this.taskTitle(message.task)}`.toLocaleLowerCase().includes(needle))
    },
    hiddenCount() {
      if (this.search.trim()) return 0
      return Math.max(0, this.filteredMessages.length - this.visibleCount)
    },
    visibleMessages() {
      return this.filteredMessages.slice(this.hiddenCount)
    },
    unreadCount() {
      return this.messages.filter((message) => message?.unread && message?.sender !== 'teacher').length
    },
    hasTaskLink() {
      return this.messages.some((message) => message.task?.id)
    },
    hasVoiceNote() { return this.voiceState.hasRecording },
    overdueCount() {
      return Number(this.profile?.meta?.assignments_overdue || 0)
    },
    wordingLabel() {
      const rate = this.profile?.meta?.ai_success_rate
      return typeof rate === 'number' ? `${rate}%` : ''
    },
    latestRecitation() {
      const attempt = this.profile?.sectionPayloads?.ai?.attempts?.[0]
      if (!attempt) return null
      const range = attempt.range
      const label = range?.surah_name && range.from
        ? `${range.surah_name} ${range.from}–${range.to || range.from}`
        : ''
      if (!label) return null
      return {
        range: label,
        status: attempt.review?.status === 'reviewed'
          ? this.t('teacher.messages_context_reviewed')
          : this.t('teacher.messages_context_pending'),
      }
    },
    contextTasks() {
      const items = this.profile?.sectionPayloads?.tasks?.assignments
      if (!Array.isArray(items)) return []
      return items.filter((item) => taskIsOverdue(item)).slice(0, 3).map((item) => {
        const assignment = item.assignment || {}
        return {
          id: item.id,
          title: `${assignment.surah_name || ''} ${assignment.ayah_start}–${assignment.ayah_end}`.trim(),
        }
      }).filter((item) => item.title)
    },
    showMessageContext() {
      return Boolean(this.latestRecitation || this.wordingLabel || this.overdueCount || this.contextTasks.length)
    },
    canSend() {
      if (this.saving || this.voiceState.active) return false
      return Boolean(this.draft.trim() || this.voiceState.hasRecording)
    },
    draftKey() {
      return `mutqin-teacher-message-draft:${this.profile.student.id}`
    },
  },
  mounted() {
    this.restoreDraft()
    this.refreshThread()
    this.stopPoll = startVisiblePoll(() => this.refreshThread(), 10000)
    this.$nextTick(() => this.scrollThread())
    this.reportUnsent()
  },
  beforeUpdate() {
    const thread = this.$refs.thread
    if (!thread) return
    this.stickToBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 96
  },
  updated() {
    if (this.stickToBottom) this.scrollThread()
  },
  deactivated() {
    this.savedScroll = this.$refs.thread?.scrollTop || 0
  },
  activated() {
    this.$nextTick(() => {
      const thread = this.$refs.thread
      if (thread && Number.isFinite(this.savedScroll)) thread.scrollTop = this.savedScroll
    })
  },
  beforeUnmount() {
    this.disposed = true
    this.threadRequest += 1
    this.stopPoll?.()
    window.clearTimeout(this.noticeTimer)
  },
  methods: {
    reportUnsent() {
      this.$emit('unsent-change', Boolean(this.draft.trim() || this.voiceState.hasRecording || this.voiceState.active))
    },
    showNotice(field, message) {
      window.clearTimeout(this.noticeTimer)
      this.success = field === 'success' ? message : ''
      this.error = field === 'error' ? message : ''
      if (!message) return
      this.noticeTimer = window.setTimeout(() => {
        if (field === 'success') this.success = ''
        else this.error = ''
      }, 4000)
    },
    persistDraft(value) {
      try {
        if (String(value || '').trim()) sessionStorage.setItem(this.draftKey, value)
        else sessionStorage.removeItem(this.draftKey)
      } catch (_) { /* private mode can refuse storage */ }
    },
    restoreDraft() {
      this.restoring = true
      try { this.draft = sessionStorage.getItem(this.draftKey) || '' } catch (_) { this.draft = '' }
      this.restoring = false
    },
    resetThread() {
      this.threadRequest += 1
      this.saving = false
      this.deletingId = null
      this.$refs.voice?.discardRecording()
      this.sent = []
      this.synced = []
      this.removed = []
      this.search = ''
      this.copiedId = null
      this.pendingDelivery = null
      this.announcedUnread = 0
      this.error = ''
      this.success = ''
      this.loadError = ''
      this.visibleCount = PAGE_SIZE
      this.restoreDraft()
      this.refreshThread()
    },
    onVoiceChange(state) {
      this.voiceState = state || { hasRecording: false, active: false }
    },
    async copyMessage(message) {
      const body = String(message?.body || '').trim()
      if (!body) return
      try {
        await navigator.clipboard.writeText(body)
        this.copiedId = message.id
        window.setTimeout(() => { if (this.copiedId === message.id) this.copiedId = null }, 1600)
      } catch (_) {
        this.showNotice('error', this.t('teacher.action_failed'))
      }
    },
    jumpToUnread() {
      const index = this.messages.findIndex((message) => message?.unread && message?.sender !== 'teacher')
      if (index < 0) return
      this.search = ''
      const needed = this.messages.length - index
      if (needed > this.visibleCount) this.visibleCount = needed
      this.stickToBottom = false
      this.$nextTick(() => this.$refs.thread?.querySelector('.is-unread')?.scrollIntoView({ block: 'center' }))
    },
    useReply(key) {
      this.draft = this.t(key)
      this.$nextTick(() => document.getElementById('teacher-direct-reply')?.focus())
    },
    clearComposer() {
      this.draft = ''
      this.$refs.voice?.discardRecording()
      this.pendingDelivery = null
      this.error = ''
      this.success = ''
    },
    deliveryIdFor(body, recording) {
      const prior = this.pendingDelivery
      // A retry of the same text and Blob must retain its idempotency key. A
      // changed draft (or a re-recorded note) is intentionally a new message.
      if (prior && prior.body === body && prior.audio === (recording?.blob || null)) return prior.id
      const id = globalThis.crypto?.randomUUID?.()
        || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
          const value = Math.floor(Math.random() * 16)
          return (character === 'x' ? value : ((value & 0x3) | 0x8)).toString(16)
        })
      this.pendingDelivery = { id, body, audio: recording?.blob || null }
      return id
    },
    async send() {
      const body = this.draft.trim()
      const recording = this.$refs.voice?.recordingPayload?.() || null
      if ((!body && !recording) || this.saving) return
      const studentId = this.profile.student.id
      const recipientId = this.taskContext?.recipientId || null
      const clientMessageId = this.deliveryIdFor(body, recording)
      this.saving = true
      this.error = ''
      this.success = ''
      try {
        const payload = recipientId
          ? await learningApi.sendTeacherAssignmentMessage(recipientId, body, recording, clientMessageId)
          : await learningApi.sendTeacherStudentMessage(studentId, body, recording, clientMessageId)
        if (this.disposed || studentId !== this.profile.student.id) return
        if (!recipientId && payload?.message) this.sent.push(payload.message)
        this.draft = ''
        this.$refs.voice?.discardRecording()
        this.pendingDelivery = null
        this.showNotice('success', this.t('teacher.message_sent'))
        this.stickToBottom = true
        this.$emit('sent')
      } catch (error) {
        if (!this.disposed && studentId === this.profile.student.id) this.showNotice('error', error?.response?.data?.message || this.t('teacher.action_failed'))
      } finally {
        if (!this.disposed && studentId === this.profile.student.id) this.saving = false
      }
      if (recipientId && !this.disposed && studentId === this.profile.student.id) this.refreshThread()
    },
    async deleteMessage(message) {
      if (!message?.id || this.deletingId) return
      const studentId = this.profile.student.id
      this.deletingId = message.id
      this.error = ''
      try {
        await learningApi.deleteTeacherStudentMessage(studentId, message.id)
        if (!this.disposed && studentId === this.profile.student.id) this.removed.push(message.id)
      } catch (error) {
        if (!this.disposed && studentId === this.profile.student.id) this.showNotice('error', error?.response?.data?.message || this.t('teacher.action_failed'))
      } finally {
        if (!this.disposed && studentId === this.profile.student.id) this.deletingId = null
      }
    },
    async refreshThread() {
      if (!this.profile?.student?.id || this.saving || this.disposed) return
      const studentId = this.profile.student.id
      const request = ++this.threadRequest
      try {
        const payload = await learningApi.getTeacherStudentMessages(studentId)
        if (this.disposed || request !== this.threadRequest || studentId !== this.profile.student.id) return
        this.synced = payload?.messages || []
        this.loadError = ''
      } catch (error) {
        if (!this.disposed && request === this.threadRequest && studentId === this.profile.student.id && !this.messages.length) {
          this.loadError = error?.response?.data?.message || this.t('teacher.action_failed')
        }
      }
    },
    loadEarlier() {
      const thread = this.$refs.thread
      const previous = thread ? thread.scrollHeight - thread.scrollTop : 0
      this.stickToBottom = false
      this.visibleCount += PAGE_SIZE
      this.$nextTick(() => {
        if (thread) thread.scrollTop = thread.scrollHeight - previous
      })
    },
    senderName(message) {
      return message.sender_name || (message.sender === 'teacher' ? this.t('teacher.you') : this.profile.student.name)
    },
    taskTitle(task) {
      if (!task?.surah_name) return ''
      return `${task.surah_name} ${task.ayah_start}–${task.ayah_end}`
    },
    startsDay(index) {
      const current = this.visibleMessages[index]
      const previous = this.visibleMessages[index - 1]
      return !previous || new Date(current?.created_at).toDateString() !== new Date(previous?.created_at).toDateString()
    },
    messageDay(value) { return formatLearnerDisplayDate(value, this.t.bind(this), this.$i18n?.locale?.value || this.$i18n?.locale || 'en') },
    onEnterSend(event) {
      if (event.isComposing || event.shiftKey || !this.canSend) return
      event.preventDefault()
      this.send()
    },
    isGrouped(index) {
      const previous = this.visibleMessages[index - 1]
      const current = this.visibleMessages[index]
      return Boolean(previous && previous.sender === current.sender && !this.startsDay(index))
    },
    bubbleClass(message, index) {
      return [`is-${message.sender}`, { 'is-unread': message.unread, 'is-grouped': this.isGrouped(index) }]
    },
    showReceipt(message) {
      return message.sender === 'teacher' && message.delivery_status === 'read' && Boolean(message.read_at)
    },
    scrollThread() {
      const thread = this.$refs.thread
      if (thread) thread.scrollTop = thread.scrollHeight
    },
    formatMessageWhen(value) {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    },
  },
}
</script>
