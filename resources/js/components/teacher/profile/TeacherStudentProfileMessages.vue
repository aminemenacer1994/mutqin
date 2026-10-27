<template>
  <TeacherSectionPane tone="neutral">
    <section class="teacher-direct-thread" :aria-label="t('teacher.messages')">
      <h3>{{ t('teacher.messages') }}</h3>
      <div v-if="messages.length" class="teacher-direct-thread__list" aria-live="polite">
        <article v-for="message in messages" :key="message.id" :class="[`is-${message.sender}`, { 'is-unread': message.unread }]">
          <strong>{{ message.sender_name || (message.sender === 'teacher' ? t('teacher.you') : profile.student.name) }}</strong>
          <p>{{ message.body }}</p>
          <span><time :datetime="message.created_at">{{ formatMessageWhen(message.created_at) }}</time><small v-if="message.sender === 'teacher'"> · {{ deliveryLabel(message) }}</small></span>
        </article>
      </div>
      <p v-else class="teacher-direct-thread__empty">{{ t('teacher.direct_messages_empty') }}</p>
      <form class="teacher-direct-thread__composer" @submit.prevent="send">
        <label for="teacher-direct-reply">{{ t('teacher.message') }}</label>
        <textarea id="teacher-direct-reply" v-model="draft" rows="2" maxlength="2000" :placeholder="t('teacher.direct_message_prompt')"></textarea>
        <div>
          <span v-if="error" role="alert" class="alert alert-danger py-1 px-2 mb-0">{{ error }}</span>
          <span v-else-if="success" role="status" class="alert alert-success py-1 px-2 mb-0">{{ success }}</span>
          <span v-else></span>
          <button type="button" class="btn btn-outline-secondary" :disabled="saving || !draft" @click="clearDraft"><i class="bi bi-eraser" aria-hidden="true"></i>{{ t('teacher.clear_message_short') }}</button>
          <button type="submit" class="btn btn-primary" :disabled="saving || !draft.trim()"><i class="bi bi-send" aria-hidden="true"></i>{{ saving ? t('teacher.saving_message') : t('teacher.send_message') }}</button>
        </div>
      </form>
    </section>
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { learningApi } from '../../../scripts/api/learning'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentProfileMessages',
  components: { TeacherSectionPane },
  mixins: [i18nMixin],
  props: { profile: { type: Object, required: true }, formatWhen: { type: Function, required: true } },
  data() { return { draft: '', saving: false, error: '', success: '', sent: [], synced: [], pollTimer: null } },
  watch: { 'profile.student.id'() { this.sent = []; this.synced = []; this.draft = ''; this.error = ''; this.success = ''; this.refreshThread() } },
  computed: {
    messages() {
      const rows = [...(this.profile.payload?.messages || []), ...this.synced, ...this.sent]
      return [...new Map(rows.map((message) => [message.id, message])).values()]
        .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')) || Number(a.id) - Number(b.id))
    },
  },
  mounted() { this.pollTimer = window.setInterval(() => this.refreshThread(), 10000) },
  beforeUnmount() { window.clearInterval(this.pollTimer) },
  methods: {
    clearDraft() {
      this.draft = ''
      this.error = ''
      this.success = ''
    },
    async send() {
      const body = this.draft.trim()
      if (!body || this.saving) return
      this.saving = true
      this.error = ''
      try {
        const payload = await learningApi.sendTeacherStudentMessage(this.profile.student.id, body)
        this.sent.push(payload.message)
        this.draft = ''
        this.success = this.t('teacher.message_sent')
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally { this.saving = false }
    },
    async refreshThread() {
      if (!this.profile?.student?.id || this.saving) return
      try {
        const payload = await learningApi.getTeacherStudentMessages(this.profile.student.id)
        this.synced = payload?.messages || []
      } catch (_) { /* keep the current thread during transient polling failures */ }
    },
    formatMessageWhen(value) {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    },
    deliveryLabel(message) {
      return message.delivery_status === 'read' ? this.t('teacher.message_read') : this.t('teacher.message_sent_status')
    },
  },
}
</script>
