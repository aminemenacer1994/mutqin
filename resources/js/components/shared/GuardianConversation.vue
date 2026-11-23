<template>
  <section class="teacher-direct-thread teacher-direct-thread--chat" :aria-label="title">
    <header class="teacher-direct-thread__head">
      <div class="teacher-direct-thread__head-copy">
        <p>{{ title }}</p>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
    </header>
    <div class="teacher-direct-thread__list" role="log">
      <button v-if="hasEarlier" type="button" class="teacher-direct-thread__earlier" @click="$emit('load-earlier')">{{ t('teacher.messages_load_earlier') }}</button>
      <div v-if="!messages.length" class="teacher-direct-thread__empty">
        <span aria-hidden="true"><i class="bi bi-chat-dots"></i></span>
        <p>{{ t('parent.messages_start') }}</p>
      </div>
      <template v-for="(message, index) in messages" :key="message.id">
        <p v-if="startsDay(index)" class="teacher-direct-thread__day">{{ dayLabel(message.created_at) }}</p>
        <article class="teacher-direct-thread__bubble" :class="message.sender === viewer ? 'is-own' : 'is-student'">
          <header class="teacher-direct-thread__bubble-head">
            <strong>{{ message.sender_name || (message.sender === 'parent' ? t('parent.account_role') : t('parent.teacher_fallback')) }}</strong>
          </header>
          <p v-if="message.body" dir="auto">{{ message.body }}</p>
          <footer class="teacher-direct-thread__bubble-foot">
            <time :datetime="message.created_at">{{ when(message.created_at) }}</time>
            <small v-if="message.sender === viewer">{{ message.state === 'read' ? t('parent.messages_read') : t('parent.messages_sent') }}</small>
            <span v-if="message.reported" class="teacher-pill is-flagged">{{ t('parent.messages_reported') }}</span>
            <small v-if="viewer === 'teacher' && message.report_reason">{{ message.report_reason }}</small>
            <button
              v-if="viewer === 'parent' && message.sender !== 'parent' && !message.reported"
              type="button"
              class="teacher-direct-thread__tool"
              @click="reportingId = message.id"
            >{{ t('parent.messages_report') }}</button>
          </footer>
          <form v-if="reportingId === message.id" class="d-flex flex-wrap gap-2 mt-2" @submit.prevent="submitReport(message)">
            <label class="visually-hidden" :for="`report-${message.id}`">{{ t('parent.messages_report_reason') }}</label>
            <input :id="`report-${message.id}`" v-model="reason" class="form-control form-control-sm" maxlength="500" required :placeholder="t('parent.messages_report_reason')">
            <button type="submit" class="btn btn-outline-secondary btn-sm" :disabled="reporting">{{ t('parent.messages_report_submit') }}</button>
          </form>
        </article>
      </template>
    </div>
    <form class="teacher-direct-thread__composer" @submit.prevent="submit">
      <label class="visually-hidden" :for="composerId">{{ t('parent.messages_placeholder') }}</label>
      <textarea
        :id="composerId"
        v-model="draft"
        rows="2"
        maxlength="2000"
        dir="auto"
        :placeholder="t('parent.messages_placeholder')"
        :disabled="sending"
        @keydown.enter.exact.prevent="submit"
      ></textarea>
      <div class="teacher-direct-thread__composer-foot">
        <p v-if="error" role="alert" class="teacher-direct-thread__status is-error">{{ error }}</p>
        <div class="teacher-direct-thread__composer-actions">
          <button type="submit" class="btn btn-primary btn-sm teacher-direct-thread__send" :disabled="sending || !draft.trim()">
            {{ sending ? t('parent.messages_sending') : t('parent.messages_send') }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

let composerSeq = 0

export default {
  name: 'GuardianConversation',
  mixins: [i18nMixin],
  props: {
    messages: { type: Array, default: () => [] },
    viewer: { type: String, default: 'parent' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    sending: { type: Boolean, default: false },
    hasEarlier: { type: Boolean, default: false },
    reporting: { type: Boolean, default: false },
    error: { type: String, default: '' },
    sentToken: { type: Number, default: 0 },
  },
  emits: ['send', 'report', 'load-earlier'],
  data() {
    composerSeq += 1
    return { draft: '', reason: '', reportingId: null, composerId: `guardian-composer-${composerSeq}` }
  },
  watch: {
    sentToken() {
      this.draft = ''
    },
  },
  methods: {
    submit() {
      const body = this.draft.trim()
      if (!body || this.sending) return
      this.$emit('send', body)
    },
    submitReport(message) {
      const reason = this.reason.trim()
      if (!reason || this.reporting) return
      this.$emit('report', { message, reason })
      this.reportingId = null
      this.reason = ''
    },
    startsDay(index) {
      if (index === 0) return true
      return this.dayKey(this.messages[index]?.created_at) !== this.dayKey(this.messages[index - 1]?.created_at)
    },
    dayKey(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toDateString()
    },
    dayLabel(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    },
    when(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })
    },
  },
}
</script>
