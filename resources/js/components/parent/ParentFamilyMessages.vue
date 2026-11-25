<template>
  <section class="parent-home parent-messages teacher-stack">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.nav_messages') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.messages_hint') }}</p>
      </div>
    </header>
    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
    <TeacherEmpty v-else-if="!shared" illustrated icon="bi bi-lock" :message="t('parent.permission_messages')" />
    <NetworkFallback v-else-if="loadError" @retry="loadInbox" />
    <div v-else-if="loading && !conversations.length" class="teacher-skeletons" role="status">
      <div v-for="n in 3" :key="n" class="teacher-skeleton"></div>
      <span class="visually-hidden">{{ t('parent.loading') }}</span>
    </div>
    <template v-else>
      <TeacherSectionPane flat>
        <div
          class="parent-messages-workspace"
          :class="{
            'is-detail-open': Boolean(active) && isMobileViewport,
            'is-empty-inbox': !conversations.length,
          }"
        >
          <aside class="parent-messages-inbox" :aria-label="t('parent.nav_messages')">
            <div v-if="conversations.length" class="parent-messages-inbox-bar">
              <label class="parent-messages-search">
                <span class="visually-hidden">{{ t('parent.messages_search') }}</span>
                <i class="bi bi-search" aria-hidden="true"></i>
                <input
                  v-model="searchDraft"
                  type="search"
                  :placeholder="t('parent.messages_search')"
                  autocomplete="off"
                >
              </label>
              <div
                v-if="children.length"
                class="parent-pills parent-messages-pills"
                role="group"
                :aria-label="t('parent.child_filter')"
              >
                <button
                  type="button"
                  :class="{ 'is-active': !selectedId && !unreadOnly }"
                  :aria-pressed="!selectedId && !unreadOnly ? 'true' : 'false'"
                  @click="resetInboxFilters"
                >
                  {{ t('parent.child_all') }}
                </button>
                <button
                  v-if="unreadTotal"
                  type="button"
                  :class="{ 'is-active': unreadOnly }"
                  :aria-pressed="unreadOnly ? 'true' : 'false'"
                  @click="toggleUnreadFilter"
                >
                  {{ t('parent.messages_unread_filter', { n: unreadTotal }) }}
                </button>
                <button
                  v-for="child in children"
                  :key="child.id"
                  type="button"
                  :class="{ 'is-active': selectedId === child.id }"
                  :aria-pressed="selectedId === child.id ? 'true' : 'false'"
                  @click="selectChildFilter(child.id)"
                >
                  {{ child.name }}
                </button>
              </div>
            </div>
            <TeacherEmpty
              v-if="!conversations.length"
              inline
              icon="bi bi-chat"
              :message="t('parent.messages_empty')"
            />
            <div v-else-if="!visibleConversations.length" class="parent-messages-inbox-empty">
              <TeacherEmpty inline icon="bi bi-funnel" :message="t('parent.messages_search_empty')" />
              <button v-if="inboxFiltersActive" type="button" class="btn btn-outline-secondary btn-sm" @click="resetInboxFilters">
                {{ t('parent.messages_clear_filters') }}
              </button>
            </div>
            <ul v-else class="parent-messages-list">
              <li
                v-for="row in visibleConversations"
                :key="conversationKey(row)"
                :class="{ 'is-active': isActive(row), 'has-unread': Number(row.unread) > 0 }"
              >
                <button
                  type="button"
                  :aria-current="isActive(row) ? 'true' : null"
                  @click="openConversation(row)"
                >
                  <span class="parent-messages-list__avatar" aria-hidden="true">{{ initial(row.teacher_name) }}</span>
                  <span class="parent-messages-list__copy">
                    <span class="parent-messages-list__title">
                      <strong>{{ row.teacher_name || t('parent.teacher_fallback') }}</strong>
                      <time v-if="row.last_at" :datetime="row.last_at">{{ formatConversationWhen(row.last_at) }}</time>
                    </span>
                    <small class="parent-messages-list__child">{{ row.child_name }}</small>
                    <small v-if="row.preview" class="parent-messages-list__preview" dir="auto">{{ row.preview }}</small>
                    <small v-else class="parent-messages-list__preview is-muted">{{ t('parent.messages_start') }}</small>
                  </span>
                  <span v-if="row.unread" class="parent-messages-list__badge" :aria-label="t('parent.messages_unread', { n: row.unread })">
                    {{ row.unread }}
                  </span>
                </button>
              </li>
            </ul>
          </aside>
          <div class="parent-messages-thread-pane">
            <GuardianConversation
              v-if="active"
              :messages="thread"
              viewer="parent"
              :viewer-display-name="parentName"
              :header-line="activeHeaderLine"
              :sending="sending"
              :loading="threadLoading"
              :reporting="reporting"
              :error="sendError"
              :sent-token="sentToken"
              :has-earlier="hasEarlier"
              :show-back="isMobileViewport"
              :context-feedback="contextFeedback"
              :read-only="threadReadOnly"
              @send="send"
              @report="report"
              @load-earlier="loadEarlier"
              @back="closeConversation"
              @open-learning="$emit('open-learning', $event)"
            />
            <div v-else-if="!isMobileViewport" class="parent-messages-thread-empty">
              <TeacherEmpty inline icon="bi bi-chat-left-text" :message="t('parent.messages_pick')" />
            </div>
          </div>
        </div>
      </TeacherSectionPane>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { formatConversationWhen, initial } from '../../scripts/parent/dashboard'
import { contextFeedbackForThread, conversationKey, createSearchDebouncer, filterConversations } from '../../scripts/parent/messages'
import GuardianConversation from '../shared/GuardianConversation.vue'
import NetworkFallback from '../NetworkFallback.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import TeacherSectionPane from '../teacher/TeacherSectionPane.vue'

const MOBILE_DETAIL_MQ = '(max-width: 767.98px)'

export default {
  name: 'ParentFamilyMessages',
  components: { GuardianConversation, NetworkFallback, TeacherEmpty, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    feedback: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
    shared: { type: Boolean, default: false },
    parentName: { type: String, default: '' },
  },
  emits: ['select-child', 'unread-change', 'open-learning'],
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
      searchDraft: '',
      searchQuery: '',
      unreadOnly: false,
      threadReadOnly: false,
      isMobileViewport: false,
      media: null,
      searchDebouncer: createSearchDebouncer(),
    }
  },
  computed: {
    visibleConversations() {
      return filterConversations(this.conversations, {
        selectedId: this.selectedId,
        query: this.searchQuery,
        unreadOnly: this.unreadOnly,
      })
    },
    unreadTotal() {
      return this.conversations.reduce((sum, row) => sum + Number(row.unread || 0), 0)
    },
    contextFeedback() {
      return contextFeedbackForThread(this.feedback, this.active, this.thread)
    },
    inboxFiltersActive() {
      return Boolean(this.searchDraft.trim() || this.searchQuery.trim() || this.unreadOnly || this.selectedId)
    },
    activeHeaderLine() {
      if (!this.active) return ''
      return this.t('parent.messages_header_line', {
        teacher: this.active.teacher_name || this.t('parent.teacher_fallback'),
        child: this.active.child_name,
      })
    },
  },
  watch: {
    selectedId() {
      if (this.active && this.selectedId && this.active.child_id !== this.selectedId) {
        this.closeConversation()
      }
    },
    shared: {
      immediate: true,
      handler(value) {
        if (value) this.loadInbox()
      },
    },
    visibleConversations(rows) {
      if (this.active && !rows.some((row) => this.isActive(row))) {
        this.closeConversation()
      }
    },
    searchDraft(value) {
      this.searchDebouncer.push(() => {
        this.searchQuery = String(value || '').trim()
      })
    },
  },
  mounted() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.media = window.matchMedia(MOBILE_DETAIL_MQ)
      this.media.addEventListener('change', this.onMediaChange)
      this.onMediaChange()
    }
  },
  beforeUnmount() {
    this.searchDebouncer.cancel()
    this.media?.removeEventListener('change', this.onMediaChange)
  },
  methods: {
    initial,
    formatConversationWhen,
    conversationKey,
    onMediaChange() {
      this.isMobileViewport = Boolean(this.media?.matches)
    },
    isActive(row) {
      return this.active && this.active.teacher_id === row.teacher_id && this.active.child_id === row.child_id
    },
    resetInboxFilters() {
      this.unreadOnly = false
      this.searchDraft = ''
      this.searchQuery = ''
      this.$emit('select-child', null)
    },
    toggleUnreadFilter() {
      this.unreadOnly = !this.unreadOnly
      if (this.unreadOnly) this.$emit('select-child', null)
    },
    selectChildFilter(childId) {
      this.unreadOnly = false
      this.$emit('select-child', childId)
    },
    closeConversation() {
      this.active = null
      this.thread = []
      this.hasEarlier = false
      this.sendError = ''
      this.threadLoading = false
      this.threadReadOnly = false
    },
    async loadInbox() {
      this.loading = this.conversations.length === 0
      this.loadError = false
      try {
        const data = await learningApi.getParentMessages()
        this.conversations = Array.isArray(data.conversations) ? data.conversations : []
        this.$emit('unread-change', this.unreadTotal)
        if (!this.active && !this.isMobileViewport && this.visibleConversations.length === 1) {
          this.openConversation(this.visibleConversations[0])
        } else if (this.active) {
          const refreshed = this.conversations.find((row) => this.isActive(row))
          if (refreshed) this.active = refreshed
          else this.closeConversation()
        }
      } catch {
        this.loadError = true
        this.conversations = []
        this.closeConversation()
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
        this.$emit('unread-change', this.unreadTotal)
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
        const inboxRow = this.conversations.find((row) => this.isActive(row))
        if (inboxRow) {
          inboxRow.preview = body
          inboxRow.last_at = this.active.last_at
        }
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