<template>
  <section class="parent-home">
    <header class="parent-page">
      <span class="parent-page__icon" aria-hidden="true"><i class="bi bi-chat-heart"></i></span>
      <div>
        <h1>{{ t('parent.nav_messages') }}</h1>
        <p>{{ t('parent.messages_hint') }}</p>
      </div>
    </header>
    <div class="parent-filters">
      <ParentChildFilter :children="children" :selected-id="selectedId" @select="$emit('select-child', $event)" />
    </div>
    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
    <TeacherSectionPane v-else-if="!shared" :title="t('parent.nav_messages')" icon="bi bi-chat-dots" flat>
      <TeacherEmpty inline icon="bi bi-lock" :message="t('parent.permission_messages')" />
    </TeacherSectionPane>
    <template v-else>
      <p v-if="loadError" class="alert alert-danger" role="alert">
        {{ t('parent.messages_failed') }}
        <button type="button" class="btn btn-link btn-sm" @click="loadInbox">{{ t('parent.retry') }}</button>
      </p>
      <TeacherSectionPane :title="t('parent.nav_messages')" icon="bi bi-chat-dots" flat>
        <p v-if="loading" class="teacher-meta">{{ t('parent.loading') }}</p>
        <TeacherEmpty v-else-if="!visibleConversations.length" inline icon="bi bi-chat" :message="t('parent.messages_empty')" />
        <div v-else class="teacher-messages-layout">
          <ul class="teacher-activity-list">
            <li v-for="row in visibleConversations" :key="`${row.teacher_id}-${row.child_id}`">
              <button type="button" :aria-current="isActive(row) ? 'true' : null" @click="openConversation(row)">
                <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.teacher_name) }}</span>
                <span class="teacher-activity-list__copy">
                  <strong>{{ row.teacher_name || t('parent.teacher_fallback') }}</strong>
                  <small>{{ row.child_name }}<template v-if="row.preview"> · {{ row.preview }}</template></small>
                </span>
                <span v-if="row.unread" class="teacher-pill is-flagged">{{ t('parent.messages_unread', { n: row.unread }) }}</span>
              </button>
            </li>
          </ul>
          <GuardianConversation
            v-if="active"
            :messages="thread"
            viewer="parent"
            :title="active.teacher_name || t('parent.teacher_fallback')"
            :subtitle="active.child_name"
            :sending="sending"
            :reporting="reporting"
            :error="sendError"
            :sent-token="sentToken"
            :has-earlier="hasEarlier"
            @send="send"
            @report="report"
            @load-earlier="loadEarlier"
          />
          <p v-else class="teacher-meta mb-0">{{ t('parent.messages_pick') }}</p>
        </div>
      </TeacherSectionPane>
      <TeacherSectionPane v-if="recentNotes.length" :title="t('parent.profile_feedback')" icon="bi bi-chat-left-text" flat>
        <ul class="teacher-activity-list">
          <li v-for="item in recentNotes" :key="item.id">
            <button type="button" @click="$emit('select-child', item.child_id)">
              <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(item.teacher_name || item.child_name) }}</span>
              <span class="teacher-activity-list__copy">
                <strong>{{ item.teacher_name || t('parent.teacher_fallback') }}</strong>
                <small>{{ item.child_name }} · {{ formatWhen(item.at) }}</small>
                <small>{{ item.excerpt }}</small>
              </span>
            </button>
          </li>
        </ul>
      </TeacherSectionPane>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { formatWhen, initial } from '../../scripts/parent/dashboard'
import GuardianConversation from '../shared/GuardianConversation.vue'
import ParentChildFilter from './ParentChildFilter.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import TeacherSectionPane from '../teacher/TeacherSectionPane.vue'

export default {
  name: 'ParentFamilyMessages',
  components: { GuardianConversation, ParentChildFilter, TeacherEmpty, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    feedback: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
    shared: { type: Boolean, default: false },
  },
  emits: ['select-child', 'unread-change'],
  data() {
    return {
      conversations: [],
      thread: [],
      hasEarlier: false,
      active: null,
      loading: false,
      sending: false,
      reporting: false,
      loadError: false,
      sendError: '',
      sentToken: 0,
    }
  },
  computed: {
    visibleConversations() {
      if (!this.selectedId) return this.conversations
      return this.conversations.filter((row) => row.child_id === this.selectedId)
    },
    visibleFeedback() {
      if (!this.selectedId) return this.feedback
      return this.feedback.filter((item) => item.child_id === this.selectedId)
    },
    recentNotes() {
      return this.visibleFeedback.slice(0, 2)
    },
  },
  watch: {
    selectedId() {
      if (this.active && this.selectedId && this.active.child_id !== this.selectedId) {
        this.active = null
        this.thread = []
        this.hasEarlier = false
      }
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
    formatWhen,
    isActive(row) {
      return this.active && this.active.teacher_id === row.teacher_id && this.active.child_id === row.child_id
    },
    async loadInbox() {
      this.loading = this.conversations.length === 0
      this.loadError = false
      try {
        const data = await learningApi.getParentMessages()
        this.conversations = Array.isArray(data.conversations) ? data.conversations : []
        this.$emit('unread-change', this.conversations.reduce((sum, row) => sum + Number(row.unread || 0), 0))
      } catch {
        this.loadError = true
      } finally {
        this.loading = false
      }
    },
    async openConversation(row) {
      this.active = row
      this.sendError = ''
      try {
        const data = await learningApi.getParentMessageThread(row.teacher_id, row.child_id)
        this.thread = Array.isArray(data.messages) ? data.messages : []
        this.hasEarlier = Boolean(data.has_earlier)
        row.unread = 0
        this.$emit('unread-change', this.conversations.reduce((sum, item) => sum + Number(item.unread || 0), 0))
      } catch {
        this.sendError = this.t('parent.messages_failed')
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
      if (!this.active) return
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
