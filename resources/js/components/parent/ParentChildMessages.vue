<template>
  <section class="parent-home parent-child-messages teacher-stack">
    <header class="teacher-page-header parent-child-messages__head">
      <div class="parent-progress__head-copy">
        <button type="button" class="parent-back" @click="$emit('back')">
          <i class="bi bi-arrow-left" aria-hidden="true"></i>
          {{ t('parent.nav_children') }}
        </button>
        <template v-if="child">
          <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
          <h1 class="teacher-page-header__title">{{ t('parent.messages_child_title', { name: child.name }) }}</h1>
          <p class="teacher-page-header__hint">{{ t('parent.messages_hint') }}</p>
        </template>
      </div>
    </header>

    <TeacherEmpty v-if="!child" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
    <TeacherEmpty v-else-if="!shared" illustrated icon="bi bi-lock" :message="t('parent.permission_messages')" />
    <NetworkFallback v-else-if="loadError" @retry="loadInbox" />
    <div v-else-if="loading && !conversations.length" class="teacher-skeletons" role="status">
      <div v-for="n in 2" :key="n" class="teacher-skeleton"></div>
      <span class="visually-hidden">{{ t('parent.loading') }}</span>
    </div>
    <template v-else>
      <div v-if="childConversations.length > 1 && !active" class="parent-child-messages__pick">
        <p class="parent-lead">{{ t('parent.messages_pick_teacher') }}</p>
        <ul class="parent-messages-list">
          <li v-for="row in childConversations" :key="conversationKey(row)">
            <button type="button" @click="openConversation(row)">
              <span class="parent-messages-list__avatar" aria-hidden="true">{{ initial(row.teacher_name) }}</span>
              <span class="parent-messages-list__copy">
                <span class="parent-messages-list__title">
                  <strong>{{ row.teacher_name || t('parent.teacher_fallback') }}</strong>
                </span>
                <small v-if="row.preview" class="parent-messages-list__preview" dir="auto">{{ row.preview }}</small>
              </span>
            </button>
          </li>
        </ul>
      </div>
      <TeacherEmpty
        v-else-if="!childConversations.length"
        illustrated
        icon="bi bi-chat"
        :message="t('parent.messages_empty')"
      />
      <GuardianConversation
        v-else-if="active"
        class="parent-child-messages__thread"
        :messages="thread"
        viewer="parent"
        :viewer-display-name="parentName"
        :header-line="headerLine"
        :sending="sending"
        :loading="threadLoading"
        :reporting="reporting"
        :error="sendError"
        :sent-token="sentToken"
        :has-earlier="hasEarlier"
        show-back
        :context-feedback="contextFeedback"
        :read-only="threadReadOnly"
        @send="send"
        @report="report"
        @load-earlier="loadEarlier"
        @back="handleThreadBack"
        @open-learning="$emit('open-learning', $event)"
      />
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { initial } from '../../scripts/parent/dashboard'
import { contextFeedbackForThread, conversationKey } from '../../scripts/parent/messages'
import NetworkFallback from '../NetworkFallback.vue'
import GuardianConversation from '../shared/GuardianConversation.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'

export default {
  name: 'ParentChildMessages',
  components: { GuardianConversation, NetworkFallback, TeacherEmpty },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    feedback: { type: Array, default: () => [] },
    childId: { type: Number, default: null },
    parentName: { type: String, default: '' },
    shared: { type: Boolean, default: false },
    autoOpen: { type: Boolean, default: true },
  },
  emits: ['back', 'unread-change', 'open-learning'],
  data() {
    return {
      conversations: [],
      thread: [],
      hasEarlier: false,
      active: null,
      loading: false,
      threadLoading: false,
      sending: false,
      reporting: false,
      loadError: false,
      sendError: '',
      sentToken: 0,
      threadReadOnly: false,
      pendingAutoOpen: false,
    }
  },
  computed: {
    child() {
      return this.children.find((row) => row.id === this.childId) || null
    },
    childConversations() {
      if (!this.childId) return []
      return this.conversations.filter((row) => row.child_id === this.childId)
    },
    contextFeedback() {
      return contextFeedbackForThread(this.feedback, this.active, this.thread)
    },
    headerLine() {
      if (!this.active) return ''
      return this.t('parent.messages_header_line', {
        teacher: this.active.teacher_name || this.t('parent.teacher_fallback'),
        child: this.active.child_name || this.child?.name || '',
      })
    },
  },
  watch: {
    childId: {
      immediate: true,
      handler() {
        this.resetThread()
        if (this.shared) this.loadInbox()
      },
    },
    shared: {
      immediate: true,
      handler(value) {
        if (value) this.loadInbox()
      },
    },
  },
  methods: {
    initial,
    conversationKey,
    resetThread() {
      this.active = null
      this.thread = []
      this.hasEarlier = false
      this.sendError = ''
      this.threadReadOnly = false
      this.pendingAutoOpen = this.autoOpen
    },
    handleThreadBack() {
      if (this.childConversations.length > 1) {
        this.active = null
        this.thread = []
        this.hasEarlier = false
        return
      }
      this.$emit('back')
    },
    unreadTotal() {
      return this.conversations.reduce((sum, row) => sum + Number(row.unread || 0), 0)
    },
    maybeAutoOpen() {
      if (!this.pendingAutoOpen || this.active) return
      const rows = this.childConversations
      if (rows.length === 1) {
        this.pendingAutoOpen = false
        this.openConversation(rows[0])
      }
    },
    async loadInbox() {
      this.loading = this.conversations.length === 0
      this.loadError = false
      try {
        const data = await learningApi.getParentMessages()
        this.conversations = Array.isArray(data.conversations) ? data.conversations : []
        this.$emit('unread-change', this.unreadTotal())
        this.maybeAutoOpen()
      } catch {
        this.loadError = true
        this.conversations = []
      } finally {
        this.loading = false
      }
    },
    async openConversation(row) {
      this.active = row
      this.sendError = ''
      this.thread = []
      this.hasEarlier = false
      this.threadReadOnly = false
      this.threadLoading = true
      try {
        const data = await learningApi.getParentMessageThread(row.teacher_id, row.child_id)
        this.thread = Array.isArray(data.messages) ? data.messages : []
        this.hasEarlier = Boolean(data.has_earlier)
        row.unread = 0
        this.$emit('unread-change', this.unreadTotal())
      } catch {
        this.sendError = this.t('parent.messages_thread_failed')
        this.thread = []
        this.threadReadOnly = true
      } finally {
        this.threadLoading = false
      }
    },
    async loadEarlier() {
      if (!this.active || !this.thread.length) return
      try {
        const data = await learningApi.getParentMessageThread(this.active.teacher_id, this.active.child_id, this.thread[0].id)
        const older = Array.isArray(data.messages) ? data.messages : []
        const seen = new Set(this.thread.map((row) => row.id))
        this.thread = [...older.filter((row) => !seen.has(row.id)), ...this.thread]
        this.hasEarlier = Boolean(data.has_earlier)
      } catch {
        this.sendError = this.t('parent.messages_failed')
      }
    },
    async send(body) {
      if (!this.active || this.threadReadOnly) return
      this.sending = true
      this.sendError = ''
      try {
        const data = await learningApi.sendParentMessage(this.active.teacher_id, this.active.child_id, body)
        if (data.message) this.thread = [...this.thread, data.message]
        this.sentToken += 1
        this.active.preview = body
        this.active.last_at = data.message?.created_at || this.active.last_at
      } catch {
        this.sendError = this.t('parent.messages_failed')
        this.threadReadOnly = true
        await this.loadInbox()
      } finally {
        this.sending = false
      }
    },
    async report({ message, reason }) {
      this.reporting = true
      this.sendError = ''
      try {
        const data = await learningApi.reportParentMessage(message.id, reason)
        this.thread = this.thread.map((row) => (row.id === message.id ? { ...row, ...(data.message || {}), reported: true } : row))
      } catch {
        this.sendError = this.t('parent.messages_failed')
      } finally {
        this.reporting = false
      }
    },
  },
}
</script>