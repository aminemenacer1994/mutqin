<template>
  <TeacherDialog
    :open="open"
    :title="t('teacher.task_remind')"
    size="sm"
    :close-label="t('teacher.close')"
    @close="close"
  >
    <p class="teacher-task-remind__context">{{ studentName }} · {{ taskTitle }}<span v-if="dueLabel"> · {{ dueLabel }}</span></p>
    <label class="teacher-playback__field">
      <span>{{ t('teacher.task_remind_edit') }}</span>
      <textarea v-model="draft" rows="4" maxlength="2000" :disabled="sending || sent"></textarea>
    </label>
    <p v-if="error" class="teacher-playback__alert" role="alert">{{ error }}</p>
    <p v-else-if="notice" class="teacher-playback__saved" role="status">{{ notice }}</p>
    <template #footer>
      <button type="button" class="btn btn-outline-secondary" :disabled="sending" @click="close">{{ t('teacher.close') }}</button>
      <button type="button" class="btn btn-primary" :disabled="!canSend" @click="send">
        {{ sending ? t('teacher.task_remind_sending') : t('teacher.task_remind_send') }}
      </button>
    </template>
  </TeacherDialog>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi, stableClientMessageId } from '../../scripts/api/learning'
import TeacherDialog from './TeacherDialog.vue'

export default {
  name: 'TeacherTaskReminder',
  components: { TeacherDialog },
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    studentName: { type: String, default: '' },
    taskTitle: { type: String, default: '' },
    dueLabel: { type: String, default: '' },
    dueAt: { type: String, default: '' },
    recipientId: { type: [Number, String], default: null },
  },
  emits: ['close', 'sent'],
  data() {
    return {
      draft: '',
      sending: false,
      sent: false,
      notice: '',
      error: '',
      sentKeys: {},
    }
  },
  computed: {
    reminderKey() {
      const due = this.dueAt ? String(this.dueAt).slice(0, 10) : 'open'
      return `${this.recipientId}:${due}`
    },
    canSend() {
      return Boolean(this.open && this.recipientId && this.draft.trim() && !this.sending && !this.sent)
    },
  },
  watch: {
    open(value) {
      if (value) this.prepare()
    },
    reminderKey() {
      if (this.open) this.prepare()
    },
  },
  methods: {
    prepare() {
      const already = Boolean(this.sentKeys[this.reminderKey])
      this.sending = false
      this.sent = already
      this.error = ''
      this.notice = already ? this.t('teacher.task_reminded') : ''
      this.draft = already
        ? (this.sentKeys[this.reminderKey] || '')
        : this.t('teacher.task_remind_draft', {
          name: this.studentName,
          task: this.taskTitle,
          due: this.dueLabel || this.dueAt,
        })
    },
    close() {
      if (this.sending) return
      this.$emit('close')
    },
    async send() {
      if (!this.canSend) return
      const key = this.reminderKey
      const recipientId = this.recipientId
      const body = this.draft.trim()
      this.sending = true
      this.error = ''
      this.notice = ''
      try {
        const clientId = await stableClientMessageId(`mutqin-task-remind:${key}`)
        const payload = await learningApi.sendTeacherAssignmentMessage(recipientId, body, null, clientId)
        if (key !== this.reminderKey) return
        const created = Date.parse(payload?.message?.created_at || '')
        const fresh = Number.isFinite(created) && Date.now() - created < 20000
        this.sentKeys = { ...this.sentKeys, [key]: body }
        this.sent = true
        this.notice = this.t(fresh ? 'teacher.task_remind_sent' : 'teacher.task_reminded')
        this.$emit('sent', { recipientId, fresh })
      } catch (error) {
        if (key === this.reminderKey) this.error = error?.response?.data?.message || this.t('teacher.task_remind_failed')
      } finally {
        if (key === this.reminderKey) this.sending = false
      }
    },
  },
}
</script>
