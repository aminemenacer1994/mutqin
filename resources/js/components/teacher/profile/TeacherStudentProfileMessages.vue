<template>
  <TeacherSectionPane tone="neutral" flat>
    <section class="teacher-direct-thread teacher-direct-thread--chat" :aria-label="t('teacher.messages')">
      <header class="teacher-direct-thread__head">
        <div class="teacher-direct-thread__head-copy">
          <h2>{{ t('teacher.messages') }}</h2>
        </div>
        <span v-if="messages.length" class="teacher-direct-thread__badge">{{ messages.length }}</span>
      </header>

      <div ref="thread" class="teacher-direct-thread__list" role="log" aria-live="polite" :aria-relevant="'additions'">
        <div v-if="!messages.length" class="teacher-direct-thread__empty">
          <span aria-hidden="true"><i class="bi bi-chat-dots"></i></span>
          <p>{{ t('teacher.direct_messages_empty') }}</p>
        </div>
        <template v-for="(message, index) in messages" :key="message.id">
        <p v-if="startsDay(index)" class="teacher-direct-thread__day">{{ messageDay(message.created_at) }}</p>
        <article
          class="teacher-direct-thread__bubble"
          :class="bubbleClass(message, index)"
        >
          <header v-if="!isGrouped(index)" class="teacher-direct-thread__bubble-head">
            <strong>{{ senderName(message) }}</strong>
          </header>
          <p v-if="message.body" dir="auto">{{ message.body }}</p>
          <div v-if="message.audio?.available && message.audio?.url" class="teacher-direct-thread__audio">
            <TeacherAudioFeedbackPlayer
              :src="message.audio.url"
              :duration-ms="message.audio.duration_ms"
              compact
            />
          </div>
          <footer class="teacher-direct-thread__bubble-foot">
            <time :datetime="message.created_at">{{ formatMessageWhen(message.created_at) }}</time>
            <small v-if="message.sender === 'teacher'">{{ deliveryLabel(message) }}</small>
            <button
              v-if="message.sender === 'teacher'"
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

      <form class="teacher-direct-thread__composer" @submit.prevent="send">
        <label class="visually-hidden" for="teacher-direct-reply">{{ t('teacher.message') }}</label>
        <div class="teacher-direct-thread__composer-box">
          <textarea
            v-auto-grow
            id="teacher-direct-reply"
            v-model="draft"
            rows="1"
            maxlength="2000"
            dir="auto"
            :placeholder="t('teacher.direct_message_prompt')"
            :disabled="saving"
            @keydown.enter.exact="onEnterSend"
          ></textarea>
        </div>
        <div class="teacher-direct-thread__composer-foot">
          <TeacherVoiceNoteControls ref="voice" :disabled="saving" @state-change="voiceState = $event" />
          <p v-if="error" role="alert" class="teacher-direct-thread__status is-error">{{ error }}</p>
          <p v-else-if="success" role="status" class="teacher-direct-thread__status is-success">{{ success }}</p>
          <div class="teacher-direct-thread__composer-actions">
            <button v-if="draft || hasVoiceNote" type="button" class="teacher-direct-thread__tool" :disabled="saving" :aria-label="t('teacher.clear_message')" :title="t('teacher.clear_message')" @click="clearComposer">
              <i class="bi bi-eraser" aria-hidden="true"></i>
            </button>
            <button type="submit" class="btn btn-primary btn-sm teacher-direct-thread__send" :disabled="saving || !canSend" :aria-label="t('teacher.send_message')">
              <i class="bi" :class="saving ? 'bi-arrow-repeat' : 'bi-send-fill'" aria-hidden="true"></i>
              <span>{{ t('teacher.send_message') }}</span>
            </button>
          </div>
        </div>
      </form>
    </section>
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

export default {
  name: 'TeacherStudentProfileMessages',
  directives: { autoGrow },
  components: { TeacherAudioFeedbackPlayer, TeacherSectionPane, TeacherVoiceNoteControls },
  mixins: [i18nMixin],
  props: { profile: { type: Object, required: true }, formatWhen: { type: Function, required: true } },
  data() { return { draft: '', saving: false, deletingId: null, error: '', success: '', sent: [], synced: [], removed: [], pollTimer: null, threadRequest: 0, disposed: false, stickToBottom: true, voiceState: { hasRecording: false, active: false } } },
  watch: {
    'profile.student.id'() { this.resetThread() },
  },
  computed: {
    messages() {
      const removed = new Set(this.removed)
      const rows = [...(this.profile.payload?.messages || []), ...this.synced, ...this.sent]
      return [...new Map(rows.map((message) => [message.id, message])).values()]
        .filter((message) => !removed.has(message.id))
        .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')) || Number(a.id) - Number(b.id))
    },
    hasVoiceNote() { return this.voiceState.hasRecording },
    canSend() {
      if (this.saving || this.voiceState.active) return false
      return Boolean(this.draft.trim() || this.voiceState.hasRecording)
    },
  },
  mounted() {
    this.pollTimer = window.setInterval(() => this.refreshThread(), 10000)
    this.$nextTick(() => this.scrollThread())
  },
  beforeUpdate() {
    const thread = this.$refs.thread
    if (!thread) return
    this.stickToBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 96
  },
  updated() {
    if (this.stickToBottom) this.scrollThread()
  },
  beforeUnmount() { this.disposed = true; this.threadRequest += 1; window.clearInterval(this.pollTimer) },
  methods: {
    resetThread() {
      this.threadRequest += 1
      this.saving = false
      this.deletingId = null
      this.$refs.voice?.discardRecording()
      this.sent = []
      this.synced = []
      this.removed = []
      this.draft = ''
      this.error = ''
      this.success = ''
      this.refreshThread()
    },
    clearComposer() {
      this.draft = ''
      this.$refs.voice?.discardRecording()
      this.error = ''
      this.success = ''
    },
    async send() {
      const body = this.draft.trim()
      const recording = this.$refs.voice?.recordingPayload?.() || null
      if ((!body && !recording) || this.saving) return
      const studentId = this.profile.student.id
      this.threadRequest += 1
      this.saving = true
      this.error = ''
      try {
        const payload = await learningApi.sendTeacherStudentMessage(studentId, body, recording)
        if (this.disposed || studentId !== this.profile.student.id) return
        this.sent.push(payload.message)
        this.draft = ''
        this.$refs.voice?.discardRecording()
        this.success = this.t('teacher.message_sent')
      } catch (error) {
        if (!this.disposed && studentId === this.profile.student.id) this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally { if (!this.disposed && studentId === this.profile.student.id) this.saving = false }
    },
    async deleteMessage(message) {
      if (!message?.id || this.deletingId) return
      const studentId = this.profile.student.id
      this.threadRequest += 1
      this.deletingId = message.id
      this.error = ''
      try {
        await learningApi.deleteTeacherStudentMessage(studentId, message.id)
        if (!this.disposed && studentId === this.profile.student.id) this.removed.push(message.id)
      } catch (error) {
        if (!this.disposed && studentId === this.profile.student.id) this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally { if (!this.disposed && studentId === this.profile.student.id) this.deletingId = null }
    },
    async refreshThread() {
      if (!this.profile?.student?.id || this.saving || this.disposed) return
      const studentId = this.profile.student.id
      const request = ++this.threadRequest
      try {
        const payload = await learningApi.getTeacherStudentMessages(studentId)
        if (this.disposed || request !== this.threadRequest || studentId !== this.profile.student.id) return
        this.synced = payload?.messages || []
      } catch (_) { /* keep thread during polling failures */ }
    },
    senderName(message) {
      return message.sender_name || (message.sender === 'teacher' ? this.t('teacher.you') : this.profile.student.name)
    },
    startsDay(index) { return !index || new Date(this.messages[index]?.created_at).toDateString() !== new Date(this.messages[index - 1]?.created_at).toDateString() },
    messageDay(value) { return formatLearnerDisplayDate(value, this.t.bind(this), this.$i18n?.locale?.value || this.$i18n?.locale || 'en') },
    onEnterSend(event) { if (event.isComposing || event.shiftKey) return; event.preventDefault(); this.send() },
    isGrouped(index) {
      const previous = this.messages[index - 1]
      const current = this.messages[index]
      return Boolean(previous && previous.sender === current.sender && !this.startsDay(index))
    },
    bubbleClass(message, index) {
      return [
        `is-${message.sender}`,
        {
          'is-unread': message.unread,
          'is-grouped': this.isGrouped(index),
        },
      ]
    },
    scrollThread() {
      const thread = this.$refs.thread
      if (thread) thread.scrollTop = thread.scrollHeight
    },
    formatMessageWhen(value) {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    },
    deliveryLabel(message) {
      return message.delivery_status === 'read' ? this.t('teacher.message_read') : this.t('teacher.message_sent_status')
    },
  },
}
</script>
