<template>
  <TeacherSectionPane tone="neutral">
    <section class="teacher-direct-thread teacher-direct-thread--compact" :aria-label="t('teacher.messages')">
      <header class="teacher-direct-thread__head">
        <div class="teacher-direct-thread__head-copy">
          <h3>{{ profile.student.name }}</h3>
        </div>
        <span v-if="messages.length" class="teacher-direct-thread__badge">{{ messages.length }}</span>
      </header>

      <div v-if="messages.length" class="teacher-direct-thread__list" aria-live="polite">
        <article
          v-for="message in messages"
          :key="message.id"
          class="teacher-direct-thread__bubble"
          :class="[`is-${message.sender}`, { 'is-unread': message.unread }]"
        >
          <header class="teacher-direct-thread__bubble-head">
            <strong>{{ message.sender_name || (message.sender === 'teacher' ? t('teacher.you') : profile.student.name) }}</strong>
            <div class="teacher-direct-thread__bubble-tools">
              <time :datetime="message.created_at">{{ formatMessageWhen(message.created_at) }}</time>
              <button
                v-if="message.sender === 'teacher'"
                type="button"
                class="btn btn-link btn-sm teacher-direct-thread__delete"
                :aria-label="t('teacher.delete_message')"
                :title="t('teacher.delete_message')"
                :disabled="deletingId === message.id"
                @click="deleteMessage(message)"
              >
                <i class="bi bi-trash3" aria-hidden="true"></i>
              </button>
            </div>
          </header>
          <p v-if="message.body">{{ message.body }}</p>
          <div v-if="message.audio?.available && message.audio?.url" class="teacher-direct-thread__audio">
            <audio controls preload="metadata" :src="message.audio.url">{{ t('teacher.voice_note') }}</audio>
          </div>
          <footer v-if="message.sender === 'teacher'" class="teacher-direct-thread__bubble-foot">
            <small>{{ deliveryLabel(message) }}</small>
          </footer>
        </article>
      </div>
      <p v-else class="teacher-direct-thread__empty">{{ t('teacher.direct_messages_empty') }}</p>

      <form class="teacher-direct-thread__composer teacher-direct-thread__composer--compact" @submit.prevent="send">
        <label class="visually-hidden" for="teacher-direct-reply">{{ t('teacher.message') }}</label>
        <textarea id="teacher-direct-reply" v-model="draft" rows="2" maxlength="2000" :placeholder="t('teacher.direct_message_prompt')" :disabled="saving"></textarea>
        <TeacherVoiceNoteControls ref="voice" :disabled="saving" />
        <div class="teacher-direct-thread__composer-foot">
          <span v-if="error" role="alert" class="alert alert-danger py-1 px-2 mb-0">{{ error }}</span>
          <span v-else-if="success" role="status" class="alert alert-success py-1 px-2 mb-0">{{ success }}</span>
          <div class="teacher-direct-thread__composer-actions">
            <button type="button" class="btn btn-link btn-sm" :disabled="!draft && !hasVoiceNote" :aria-label="t('teacher.clear_message')" @click="clearComposer">
              <i class="bi bi-eraser" aria-hidden="true"></i>
              <span class="d-none d-sm-inline">{{ t('teacher.clear_message') }}</span>
            </button>
            <button type="submit" class="btn btn-primary btn-sm" :disabled="saving || !canSend">
              <i class="bi" :class="saving ? 'bi-arrow-repeat' : 'bi-send'" aria-hidden="true"></i>
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
import TeacherSectionPane from '../TeacherSectionPane.vue'
import TeacherVoiceNoteControls from '../TeacherVoiceNoteControls.vue'

export default {
  name: 'TeacherStudentProfileMessages',
  components: { TeacherSectionPane, TeacherVoiceNoteControls },
  mixins: [i18nMixin],
  props: { profile: { type: Object, required: true }, formatWhen: { type: Function, required: true } },
  data() { return { draft: '', saving: false, deletingId: null, error: '', success: '', sent: [], synced: [], removed: [], pollTimer: null } },
  watch: { 'profile.student.id'() { this.resetThread() } },
  computed: {
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
  mounted() { this.pollTimer = window.setInterval(() => this.refreshThread(), 10000) },
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
