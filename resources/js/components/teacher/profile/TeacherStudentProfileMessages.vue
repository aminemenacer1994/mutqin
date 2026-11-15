<template>
  <TeacherSectionPane tone="neutral" flat>
    <TeacherTabGuide kind="page" :title="t('teacher.messages')" :description="t('teacher.messages_page_desc')" />
    <section class="teacher-direct-thread teacher-direct-thread--chat" :aria-label="t('teacher.messages')">
      <header class="teacher-direct-thread__head">
        <span class="teacher-direct-thread__mark" aria-hidden="true">{{ studentInitial }}</span>
        <div class="teacher-direct-thread__head-copy">
          <h3>{{ profile.student.name }}</h3>
        </div>
        <span v-if="messages.length" class="teacher-direct-thread__badge">{{ messages.length }}</span>
      </header>

      <div ref="thread" class="teacher-direct-thread__list" role="log" aria-live="polite" :aria-relevant="'additions'">
        <div v-if="!messages.length" class="teacher-direct-thread__empty">
          <span aria-hidden="true"><i class="bi bi-chat-dots"></i></span>
          <p>{{ t('teacher.direct_messages_empty') }}</p>
        </div>
        <article
          v-for="(message, index) in messages"
          :key="message.id"
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
      </div>

      <form class="teacher-direct-thread__composer" @submit.prevent="send">
        <label class="visually-hidden" for="teacher-direct-reply">{{ t('teacher.message') }}</label>
        <div class="teacher-direct-thread__composer-box">
          <textarea
            id="teacher-direct-reply"
            v-model="draft"
            rows="1"
            maxlength="2000"
            dir="auto"
            :placeholder="t('teacher.direct_message_prompt')"
            :disabled="saving"
            @keydown.enter.exact.prevent="send"
          ></textarea>
          <span class="teacher-direct-thread__count">{{ draft.length }}/2000</span>
        </div>
        <div class="teacher-direct-thread__composer-foot">
          <TeacherVoiceNoteControls ref="voice" :disabled="saving" />
          <p v-if="error" role="alert" class="teacher-direct-thread__status is-error">{{ error }}</p>
          <p v-else-if="success" role="status" class="teacher-direct-thread__status is-success">{{ success }}</p>
          <div class="teacher-direct-thread__composer-actions">
            <button type="button" class="teacher-direct-thread__tool" :disabled="!draft && !hasVoiceNote" :aria-label="t('teacher.clear_message')" :title="t('teacher.clear_message')" @click="clearComposer">
              <i class="bi bi-eraser" aria-hidden="true"></i>
            </button>
            <button type="submit" class="btn btn-primary btn-sm teacher-direct-thread__send" :disabled="saving || !canSend">
              <i class="bi" :class="saving ? 'bi-arrow-repeat' : 'bi-send-fill'" aria-hidden="true"></i>
              <span class="d-none d-sm-inline">{{ t('teacher.send_message') }}</span>
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
import TeacherTabGuide from '../TeacherTabGuide.vue'
import TeacherVoiceNoteControls from '../TeacherVoiceNoteControls.vue'

export default {
  name: 'TeacherStudentProfileMessages',
  components: { TeacherAudioFeedbackPlayer, TeacherSectionPane, TeacherTabGuide, TeacherVoiceNoteControls },
  mixins: [i18nMixin],
  props: { profile: { type: Object, required: true }, formatWhen: { type: Function, required: true } },
  data() { return { draft: '', saving: false, deletingId: null, error: '', success: '', sent: [], synced: [], removed: [], pollTimer: null, stickToBottom: true } },
  watch: {
    'profile.student.id'() { this.resetThread() },
  },
  computed: {
    studentInitial() {
      const name = String(this.profile?.student?.name || '').trim()
      return name ? name.charAt(0).toUpperCase() : '?'
    },
    messages() {
      const removed = new Set(this.removed)
      const rows = [...(this.profile.payload?.messages || []), ...this.synced, ...this.sent]
      return [...new Map(rows.map((message) => [message.id, message])).values()]
        .filter((message) => !removed.has(message.id))
        .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')) || Number(a.id) - Number(b.id))
    },
    hasVoiceNote() { return Boolean(this.$refs.voice?.hasRecording) },
    canSend() {
      if (this.saving || this.$refs.voice?.isRecordingActive) return false
      return Boolean(this.draft.trim() || this.$refs.voice?.hasRecording)
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
  beforeUnmount() { window.clearInterval(this.pollTimer) },
  methods: {
    resetThread() {
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
      this.saving = true
      this.error = ''
      try {
        const payload = await learningApi.sendTeacherStudentMessage(this.profile.student.id, body, recording)
        this.sent.push(payload.message)
        this.draft = ''
        this.$refs.voice?.discardRecording()
        this.success = this.t('teacher.message_sent')
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally { this.saving = false }
    },
    async deleteMessage(message) {
      if (!message?.id || this.deletingId) return
      this.deletingId = message.id
      this.error = ''
      try {
        await learningApi.deleteTeacherStudentMessage(this.profile.student.id, message.id)
        this.removed.push(message.id)
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally { this.deletingId = null }
    },
    async refreshThread() {
      if (!this.profile?.student?.id || this.saving) return
      try {
        const payload = await learningApi.getTeacherStudentMessages(this.profile.student.id)
        this.synced = payload?.messages || []
      } catch (_) { /* keep thread during polling failures */ }
    },
    senderName(message) {
      return message.sender_name || (message.sender === 'teacher' ? this.t('teacher.you') : this.profile.student.name)
    },
    isGrouped(index) {
      const previous = this.messages[index - 1]
      const current = this.messages[index]
      return Boolean(previous && previous.sender === current.sender)
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
