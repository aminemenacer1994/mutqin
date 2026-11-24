<template>
  <section class="teacher-direct-thread teacher-direct-thread--chat" :aria-label="title || headerLine">
    <p v-if="readOnly" class="teacher-direct-thread__readonly" role="status">{{ readOnlyNotice }}</p>
    <header v-if="!hideHeader" class="teacher-direct-thread__head">
      <button
        v-if="showBack"
        type="button"
        class="parent-messages-back teacher-direct-thread__back"
        @click="$emit('back')"
      >
        <i class="bi bi-arrow-left" aria-hidden="true"></i>
        {{ t('parent.messages_back') }}
      </button>
      <div class="teacher-direct-thread__head-copy">
        <p v-if="headerLine" class="teacher-direct-thread__head-line">{{ headerLine }}</p>
        <template v-else>
          <p>{{ title }}</p>
          <p v-if="subtitle">{{ subtitle }}</p>
        </template>
      </div>
      <label v-if="searchable && messages.length" class="teacher-direct-thread__search">
        <span class="visually-hidden">{{ searchLabel }}</span>
        <input v-model="search" type="search" :placeholder="searchLabel" autocomplete="off">
      </label>
    </header>
    <p v-if="contextFeedback" class="teacher-direct-thread__context parent-messages-context-feedback is-formal">
      <span class="parent-messages-context-feedback__copy">
        <strong>{{ t('parent.messages_context_feedback') }}</strong>
        <span dir="auto">{{ contextFeedback.excerpt }}</span>
      </span>
      <button type="button" class="parent-messages-context-feedback__link" @click="$emit('open-learning', contextFeedback.child_id)">
        {{ t('parent.open_learning') }}
      </button>
    </p>
    <div ref="thread" class="teacher-direct-thread__list" role="log" :aria-busy="loading ? 'true' : 'false'">
      <button v-if="hasEarlier && !search.trim()" type="button" class="teacher-direct-thread__earlier" :disabled="loading" @click="$emit('load-earlier')">
        {{ t('teacher.messages_load_earlier') }}
      </button>
      <div v-if="loading" class="teacher-direct-thread__empty">
        <p>{{ t('parent.loading') }}</p>
      </div>
      <div v-else-if="!messages.length && !error" class="teacher-direct-thread__empty">
        <span aria-hidden="true"><i class="bi bi-chat-dots"></i></span>
        <p>{{ t('parent.messages_start') }}</p>
      </div>
      <p v-else-if="search.trim() && !visibleMessages.length" class="teacher-direct-thread__empty">{{ searchEmptyLabel }}</p>
      <template v-for="(message, index) in visibleMessages" :key="message.id">
        <p v-if="startsDay(index)" class="teacher-direct-thread__day">{{ dayLabel(message.created_at) }}</p>
        <article class="teacher-direct-thread__bubble" :class="bubbleClass(message, index)">
          <header v-if="!isGrouped(index)" class="teacher-direct-thread__bubble-head">
            <strong>{{ senderLabel(message) }}</strong>
          </header>
          <p v-if="message.body" class="teacher-direct-thread__bubble-text" dir="auto">{{ message.body }}</p>
          <footer class="teacher-direct-thread__bubble-foot">
            <span class="teacher-direct-thread__bubble-meta">
              <time :datetime="message.created_at">{{ formatMessageWhen(message.created_at) }}</time>
              <small v-if="message.sender === viewer">{{ message.state === 'read' ? t('parent.messages_read') : t('parent.messages_sent') }}</small>
            </span>
            <span v-if="message.reported" class="teacher-pill is-flagged">{{ t('parent.messages_reported') }}</span>
            <small v-if="viewer === 'teacher' && message.report_reason">{{ message.report_reason }}</small>
            <div
              v-if="viewer === 'parent' && message.sender !== 'parent' && !message.reported"
              class="teacher-direct-thread__bubble-menu"
            >
              <button
                type="button"
                class="teacher-direct-thread__tool teacher-direct-thread__menu"
                :aria-expanded="menuOpenId === message.id ? 'true' : 'false'"
                :aria-label="t('parent.messages_more_actions')"
                @click.stop="toggleMenu(message.id)"
              >
                <i class="bi bi-three-dots" aria-hidden="true"></i>
              </button>
              <div v-if="menuOpenId === message.id" class="teacher-direct-thread__menu-panel" role="menu">
                <button type="button" role="menuitem" @click="openReport(message)">{{ t('parent.messages_report_flag') }}</button>
              </div>
            </div>
          </footer>
          <form v-if="reportingId === message.id" class="teacher-direct-thread__report-form" @submit.prevent="submitReport(message)">
            <label class="visually-hidden" :for="`report-${message.id}`">{{ t('parent.messages_report_reason') }}</label>
            <input :id="`report-${message.id}`" v-model="reason" class="form-control form-control-sm" maxlength="500" required :placeholder="t('parent.messages_report_reason')">
            <button type="submit" class="btn btn-outline-secondary btn-sm" :disabled="reporting">{{ t('parent.messages_report_submit') }}</button>
          </form>
        </article>
      </template>
    </div>
    <form
      v-if="!readOnly"
      class="teacher-direct-thread__composer"
      :aria-busy="sending ? 'true' : 'false'"
      @submit.prevent="submit"
    >
      <label class="visually-hidden" :for="composerId">{{ t('parent.messages_placeholder') }}</label>
      <textarea
        :id="composerId"
        v-model="draft"
        v-auto-grow
        rows="1"
        maxlength="2000"
        dir="auto"
        :placeholder="t('parent.messages_placeholder')"
        :disabled="sending || loading"
        @keydown.enter.exact="onEnterSend"
      ></textarea>
      <div class="teacher-direct-thread__composer-foot">
        <p v-if="error" role="alert" class="teacher-direct-thread__status is-error">{{ error }}</p>
        <div class="teacher-direct-thread__composer-actions">
          <button type="button" v-if="draft.trim()" class="teacher-direct-thread__tool" :disabled="sending" :aria-label="t('teacher.clear_message')" :title="t('teacher.clear_message')" @click="draft = ''">
            <i class="bi bi-eraser" aria-hidden="true"></i>
          </button>
          <button type="submit" class="btn btn-primary btn-sm teacher-direct-thread__send" :disabled="sending || loading || !draft.trim()" :aria-label="t('parent.messages_send')">
            <i class="bi" :class="sending ? 'bi-arrow-repeat' : 'bi-send-fill'" aria-hidden="true"></i>
            <span>{{ sending ? t('parent.messages_sending') : t('parent.messages_send') }}</span>
          </button>
        </div>
      </div>
    </form>
    <p v-else-if="error" role="alert" class="teacher-direct-thread__status is-error teacher-direct-thread__composer-solo">{{ error }}</p>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import autoGrow from '../../directives/autoGrow.js'

let composerSeq = 0

export default {
  name: 'GuardianConversation',
  directives: { autoGrow },
  mixins: [i18nMixin],
  props: {
    messages: { type: Array, default: () => [] },
    viewer: { type: String, default: 'parent' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    headerLine: { type: String, default: '' },
    viewerDisplayName: { type: String, default: '' },
    sending: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    hasEarlier: { type: Boolean, default: false },
    reporting: { type: Boolean, default: false },
    error: { type: String, default: '' },
    sentToken: { type: Number, default: 0 },
    showBack: { type: Boolean, default: false },
    searchable: { type: Boolean, default: false },
    contextFeedback: { type: Object, default: null },
    hideHeader: { type: Boolean, default: false },
    readOnly: { type: Boolean, default: false },
    readOnlyLabel: { type: String, default: '' },
  },
  emits: ['send', 'report', 'load-earlier', 'back', 'open-learning'],
  data() {
    composerSeq += 1
    return {
      draft: '',
      reason: '',
      reportingId: null,
      menuOpenId: null,
      composerId: `guardian-composer-${composerSeq}`,
      search: '',
      stickToBottom: true,
      savedScroll: 0,
    }
  },
  computed: {
    searchLabel() {
      return this.viewer === 'teacher' ? this.t('teacher.message_search') : this.t('parent.messages_search')
    },
    searchEmptyLabel() {
      return this.viewer === 'teacher' ? this.t('teacher.message_search_empty') : this.t('parent.messages_search_empty')
    },
    visibleMessages() {
      const needle = this.search.trim().toLocaleLowerCase()
      if (!needle) return this.messages
      return this.messages.filter((message) => String(message.body || '').toLocaleLowerCase().includes(needle))
    },
    readOnlyNotice() {
      return this.readOnlyLabel || this.t('parent.permission_messages')
    },
  },
  watch: {
    sentToken() {
      this.draft = ''
      this.stickToBottom = true
    },
    messages() {
      if (this.stickToBottom) this.$nextTick(() => this.scrollThread())
    },
    loading(value) {
      if (!value && this.stickToBottom) this.$nextTick(() => this.scrollThread())
    },
  },
  beforeUpdate() {
    const thread = this.$refs.thread
    if (!thread) return
    this.stickToBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 96
  },
  updated() {
    if (this.stickToBottom) this.scrollThread()
  },
  activated() {
    this.$nextTick(() => {
      const thread = this.$refs.thread
      if (thread && Number.isFinite(this.savedScroll)) thread.scrollTop = this.savedScroll
    })
  },
  deactivated() {
    this.savedScroll = this.$refs.thread?.scrollTop || 0
  },
  mounted() {
    document.addEventListener('click', this.onDocumentClick)
    this.$nextTick(() => this.scrollThread())
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocumentClick)
  },
  methods: {
    onDocumentClick() {
      this.menuOpenId = null
    },
    toggleMenu(id) {
      this.menuOpenId = this.menuOpenId === id ? null : id
    },
    openReport(message) {
      this.menuOpenId = null
      this.reportingId = message.id
      this.reason = ''
    },
    senderLabel(message) {
      if (message.sender === this.viewer) return this.t('parent.messages_you')
      if (message.sender_name) return message.sender_name
      return message.sender === 'parent' ? (this.viewerDisplayName || this.t('parent.account_role')) : this.t('parent.teacher_fallback')
    },
    submit() {
      const body = this.draft.trim()
      if (!body || this.sending || this.loading || this.readOnly) return
      this.stickToBottom = true
      this.$emit('send', body)
    },
    onEnterSend(event) {
      if (event.isComposing || event.shiftKey || !this.draft.trim() || this.sending || this.loading) return
      event.preventDefault()
      this.submit()
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
      return this.dayKey(this.visibleMessages[index]?.created_at) !== this.dayKey(this.visibleMessages[index - 1]?.created_at)
    },
    isGrouped(index) {
      const previous = this.visibleMessages[index - 1]
      const current = this.visibleMessages[index]
      return Boolean(previous && previous.sender === current.sender && !this.startsDay(index))
    },
    bubbleClass(message, index) {
      const own = message.sender === this.viewer
      return [
        own ? 'is-own' : 'is-student',
        { 'is-grouped': this.isGrouped(index), 'is-unread': message.unread, 'is-tight-gap': this.isGrouped(index) },
      ]
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
    formatMessageWhen(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    },
    scrollThread() {
      const thread = this.$refs.thread
      if (thread) thread.scrollTop = thread.scrollHeight
    },
  },
}
</script>