<template>
  <div
    class="learner-messages-workspace"
    :class="{
      'is-detail-open': Boolean(active) && isMobileViewport,
      'is-empty-inbox': !sortedThreads.length,
    }"
  >
    <aside class="learner-messages-inbox" :aria-label="t('dashboard.messages_teachers_title')">
      <header class="learner-messages-inbox__head">
        <div class="learner-messages-inbox__titles">
          <h2 class="learner-messages-inbox__title">{{ t('dashboard.messages_teachers_title') }}</h2>
          <p class="learner-messages-inbox__hint">{{ t('dashboard.messages_teachers_hint') }}</p>
        </div>
      </header>
      <div v-if="sortedThreads.length" class="learner-messages-inbox-bar">
        <label class="learner-messages-search">
          <span class="visually-hidden">{{ t('dashboard.messages_search') }}</span>
          <i class="bi bi-search" aria-hidden="true"></i>
          <input
            v-model="searchDraft"
            type="search"
            :placeholder="t('dashboard.messages_search')"
            autocomplete="off"
          >
        </label>
        <button
          v-if="unreadTotal"
          type="button"
          class="learner-messages-unread-toggle"
          :class="{ 'is-active': unreadOnly }"
          :aria-pressed="unreadOnly ? 'true' : 'false'"
          @click="toggleUnreadFilter"
        >
          {{ t('dashboard.messages_unread_filter', { n: unreadTotal }) }}
        </button>
      </div>
      <div class="learner-messages-inbox__body">
        <p v-if="pending && !sortedThreads.length" class="teacher-meta" role="status" aria-live="polite">{{ t('teacher.loading') }}</p>
        <p v-else-if="loadError" class="alert alert-danger" role="alert">
          {{ t('dashboard.messages_thread_failed') }}
          <button type="button" class="btn btn-link btn-sm" @click="retryInbox">{{ t('common.retry') }}</button>
        </p>
        <div v-else-if="!sortedThreads.length" class="learner-messages__empty">
          <i class="bi bi-chat-left-text" aria-hidden="true"></i>
          <p>{{ t('dashboard.messages_teachers_empty') }}</p>
        </div>
        <div v-else-if="!visibleThreads.length" class="learner-messages-inbox-empty">
          <TeacherEmpty inline icon="bi bi-funnel" :message="t('dashboard.messages_search_empty')" />
          <button v-if="inboxFiltersActive" type="button" class="btn btn-outline-secondary btn-sm" @click="resetInboxFilters">
            {{ t('dashboard.messages_clear_filters') }}
          </button>
        </div>
        <ul v-else class="learner-messages__list">
          <li
            v-for="thread in visibleThreads"
            :key="thread.teacher_id"
            :class="{
              'is-active': isActive(thread),
              'has-unread': directThreadUnreadCount(thread) > 0,
              'is-blocked': thread.can_message === false,
            }"
          >
            <button
              type="button"
              :aria-current="isActive(thread) ? 'true' : null"
              @click="openTeacher(thread)"
            >
              <span class="learner-messages__avatar" aria-hidden="true">{{ initials(thread.teacher_name) }}</span>
              <span class="learner-messages__copy">
                <span class="learner-messages__title-row">
                  <strong>{{ thread.teacher_name || t('teacher.teacher') }}</strong>
                  <time v-if="threadLastAt(thread)" :datetime="threadLastAt(thread)">{{ formatWhen(threadLastAt(thread)) }}</time>
                </span>
                <span
                  v-if="threadKindBadge(thread)"
                  class="learner-messages__kind"
                  :class="`is-${threadKindBadge(thread)}`"
                >{{ threadKindLabel(thread) }}</span>
                <span v-if="thread.can_message === false" class="learner-messages__blocked">{{ t('dashboard.circle_message_blocked') }}</span>
                <span v-else-if="threadPreview(thread)" class="learner-messages__preview" dir="auto">{{ threadPreview(thread) }}</span>
                <span v-else class="learner-messages__preview is-muted">{{ t('teacher.direct_messages_empty_student') }}</span>
              </span>
              <span
                v-if="directThreadUnreadCount(thread) > 0"
                class="learner-messages__badge"
                :aria-label="ldtp('teacher.learner_feedback_unread', directThreadUnreadCount(thread))"
              >{{ directThreadUnreadCount(thread) }}</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>

    <div class="learner-messages-thread-pane">
      <template v-if="active">
        <header class="learner-messages-thread-head">
          <button
            v-if="isMobileViewport"
            ref="backButton"
            type="button"
            class="learner-messages-back"
            :aria-label="t('common.back')"
            :disabled="directSending"
            @click="closeThread"
          >
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
            {{ t('common.back') }}
          </button>
          <div class="learner-messages-thread-head__copy">
            <h3>{{ active.teacher_name || t('teacher.teacher') }}</h3>
            <p>{{ t('teacher.messages') }}</p>
          </div>
        </header>
        <p v-if="threadLoadError" class="alert alert-danger learner-messages-thread-alert" role="alert">
          {{ threadLoadError }}
          <button type="button" class="btn btn-link btn-sm" @click="reloadActiveThread">{{ t('common.retry') }}</button>
        </p>
        <p v-else-if="active.can_message === false" class="learner-messages-readonly" role="status">
          {{ t('dashboard.messaging_age_restricted') }}
        </p>
        <p v-if="threadLoading" class="teacher-meta learner-messages-thread-alert" role="status" aria-live="polite">{{ t('teacher.loading') }}</p>
        <button v-if="threadNextBefore" type="button" class="btn btn-outline-secondary btn-sm align-self-start" :disabled="threadLoading" @click="loadActiveThread(true)">{{ t('dashboard.messages_load_older') }}</button>
        <TeacherTaskConversation
          ref="conversation"
          :messages="activeMessages"
          variant="learner"
          thread-class="learner-teacher__thread learner-messages-thread"
          viewer-role="student"
          :peer-name="active.teacher_name"
          :task-id="`direct-${active.teacher_id}`"
          :composer-id="`direct-message-${active.teacher_id}`"
          :composer-placeholder="active.can_message === false ? t('dashboard.messaging_age_restricted') : t('teacher.direct_message_prompt_student')"
          :empty-label="t('teacher.direct_messages_empty_student')"
          :ui-direction="threadDirection"
          :allow-recording="false"
          :compose="active.can_message !== false"
          :on-send="sendDirectMessage"
          @sending-change="directSending = $event"
          @open-assignment="$emit('open-assignment', $event)"
        />
      </template>
      <div v-else-if="!isMobileViewport" class="learner-messages-thread-empty">
        <TeacherEmpty inline icon="bi bi-chat-left-text" :message="t('dashboard.messages_pick_teacher')" />
      </div>
    </div>
  </div>
</template>

<script>
import './LearnerStudentMessages.css'
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatLearnerDisplayDate } from '../../utils/learnerDisplayDate.js'
import { learnerDashboardTp } from '../../scripts/teacher/learnerDashboardI18n.js'
import { learningApi } from '../../scripts/api/learning'
import { createSearchDebouncer } from '../../scripts/parent/messages'
import {
  directThreadUnreadCount,
  filterTeacherThreads,
  mergeThreadMessages,
  patchThreadRow,
  sortTeacherThreads,
  threadLastActivityKind,
  threadLastAt,
  threadPreview,
} from '../../scripts/teacher/learnerStudentMessages.js'
import { startVisiblePoll } from '../../scripts/teacher/pollWhenVisible'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherTaskConversation from './TeacherTaskConversation.vue'

const MOBILE_DETAIL_MQ = '(max-width: 767.98px)'
const POLL_MS = 10000

export default {
  name: 'LearnerStudentMessages',
  components: { TeacherEmpty, TeacherTaskConversation },
  mixins: [i18nMixin],
  props: {
    threads: { type: Array, default: () => [] },
    pending: { type: Boolean, default: false },
    error: { type: String, default: '' },
    onSend: { type: Function, default: null },
    pickTeacherId: { type: Number, default: null },
  },
  emits: ['threads-updated', 'open-assignment'],
  data() {
    return {
      inbox: [],
      active: null,
      activeMessages: [],
      threadLoading: false,
      threadLoadError: '',
      loadError: false,
      directSending: false,
      sentOptimistic: {},
      pollVersions: {},
      threadNextBefore: null,
      stopPoll: null,
      disposed: false,
      isMobileViewport: false,
      media: null,
      searchDraft: '',
      searchQuery: '',
      unreadOnly: false,
      searchDebouncer: createSearchDebouncer(),
    }
  },
  computed: {
    learnerLocale() {
      return this.$i18n?.global?.locale?.value
        || (typeof document !== 'undefined' ? document.documentElement.getAttribute('lang') : null)
        || 'en'
    },
    sortedThreads() {
      return sortTeacherThreads(this.inbox)
    },
    visibleThreads() {
      return filterTeacherThreads(this.inbox, {
        query: this.searchQuery,
        unreadOnly: this.unreadOnly,
      })
    },
    unreadTotal() {
      return this.sortedThreads.reduce((sum, row) => sum + directThreadUnreadCount(row), 0)
    },
    inboxFiltersActive() {
      return Boolean(this.searchDraft.trim() || this.searchQuery.trim() || this.unreadOnly)
    },
    threadDirection() {
      const locale = String(this.learnerLocale || '').split('-')[0]
      return ['ar', 'ur'].includes(locale) ? 'rtl' : 'ltr'
    },
  },
  watch: {
    threads: {
      immediate: true,
      deep: true,
      handler(rows) {
        const next = Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []
        this.inbox = next.map((row) => {
          const existing = this.inbox.find((item) => Number(item.teacher_id) === Number(row.teacher_id))
          const synced = Number(row.teacher_id) === Number(this.active?.teacher_id) && this.activeMessages.length
            ? this.activeMessages
            : (existing?.messages || row.messages)
          return { ...row, messages: synced || [] }
        })
        if (this.active) {
          const refreshed = this.inbox.find((row) => Number(row.teacher_id) === Number(this.active.teacher_id))
          if (refreshed) {
            this.active = refreshed
            if (!this.threadLoading) {
              this.activeMessages = refreshed.messages || []
            }
          } else {
            this.closeThread()
          }
        }
        this.loadError = Boolean(this.error)
      },
    },
    error(value) {
      this.loadError = Boolean(value)
    },
    pickTeacherId(id) {
      if (!id) return
      const thread = this.inbox.find((row) => Number(row.teacher_id) === Number(id))
      if (thread) this.openTeacher(thread)
    },
    active(value) {
      if (value) this.startPolling()
      else this.stopPolling()
    },
    visibleThreads(rows) {
      if (this.active && !rows.some((row) => Number(row.teacher_id) === Number(this.active.teacher_id))) {
        this.closeThread()
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
    if (this.pickTeacherId) {
      const thread = this.inbox.find((row) => Number(row.teacher_id) === Number(this.pickTeacherId))
      if (thread) this.openTeacher(thread)
    }
  },
  beforeUnmount() {
    this.disposed = true
    this.stopPolling()
    this.searchDebouncer.cancel()
    this.media?.removeEventListener('change', this.onMediaChange)
  },
  methods: {
    openTeacherById(teacherId) {
      this.openTeacher(teacherId)
    },
    directThreadUnreadCount,
    threadLastAt,
    threadPreview,
    threadKindBadge(thread) {
      return threadLastActivityKind(thread)
    },
    threadKindLabel(thread) {
      const kind = threadLastActivityKind(thread)
      if (kind === 'feedback') return this.t('dashboard.messages_kind_feedback')
      if (kind === 'assignment') return this.t('dashboard.messages_kind_assignment')
      return ''
    },
    ldtp(key, count, params = {}) {
      return learnerDashboardTp(this.learnerLocale, this.$i18n, key, count, params)
    },
    initials(name) {
      const label = String(name || '').trim()
      if (!label) return 'T'
      return label.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    },
    formatWhen(value) {
      return formatLearnerDisplayDate(value, this.t.bind(this), this.learnerLocale)
    },
    isActive(thread) {
      return this.active && Number(this.active.teacher_id) === Number(thread.teacher_id)
    },
    onMediaChange() {
      this.isMobileViewport = Boolean(this.media?.matches)
    },
    resetInboxFilters() {
      this.unreadOnly = false
      this.searchDraft = ''
      this.searchQuery = ''
    },
    toggleUnreadFilter() {
      this.unreadOnly = !this.unreadOnly
    },
    retryInbox() {
      this.loadError = false
      this.$emit('threads-updated', { refreshSupport: true })
    },
    openTeacher(teacherIdOrRow) {
      const row = typeof teacherIdOrRow === 'object'
        ? teacherIdOrRow
        : this.inbox.find((item) => Number(item.teacher_id) === Number(teacherIdOrRow))
      if (!row) return
      this.activeMessages = []
      this.threadNextBefore = null
      this.active = row
      this.threadLoadError = ''
      this.sentOptimistic = {}
      this.loadActiveThread()
      if (this.isMobileViewport) {
        this.$nextTick(() => this.$refs.backButton?.focus?.({ preventScroll: true }))
      }
    },
    closeThread() {
      if (this.directSending) return
      this.active = null
      this.activeMessages = []
      this.threadLoadError = ''
      this.threadLoading = false
    },
    async loadActiveThread(older = false) {
      if (!this.active?.teacher_id) return
      const teacherId = Number(this.active.teacher_id)
      this.threadLoading = true
      this.threadLoadError = ''
      const request = Number(this.pollVersions[teacherId] || 0) + 1
      this.pollVersions = { ...this.pollVersions, [teacherId]: request }
      try {
        const payload = await learningApi.getLearnerTeacherMessages(teacherId, { before: older ? this.threadNextBefore : undefined })
        if (this.disposed || request !== this.pollVersions[teacherId] || Number(this.active?.teacher_id) !== teacherId) return
        if (older || !this.activeMessages.length) this.threadNextBefore = payload?.next_before || null
        const merged = mergeThreadMessages([...this.activeMessages, ...(payload?.messages || [])], this.sentOptimistic[teacherId] || [])
        this.activeMessages = merged
        this.inbox = patchThreadRow(this.inbox, teacherId, merged)
        if (this.active?.teacher_id === teacherId) {
          this.active = { ...this.active, messages: merged }
        }
        this.$emit('threads-updated', { teacherId, messages: merged })
      } catch {
        if (this.disposed || request !== this.pollVersions[teacherId] || Number(this.active?.teacher_id) !== teacherId) return
        this.threadLoadError = this.t('dashboard.messages_thread_failed')
        this.activeMessages = this.active?.messages || []
      } finally {
        if (request === this.pollVersions[teacherId] && Number(this.active?.teacher_id) === teacherId) this.threadLoading = false
      }
    },
    reloadActiveThread() {
      this.loadActiveThread()
    },
    async sendDirectMessage(body) {
      if (!this.active?.teacher_id || typeof this.onSend !== 'function') {
        throw new Error(this.t('teacher.action_failed'))
      }
      if (this.active.can_message === false) {
        throw new Error(this.t('dashboard.messaging_age_restricted'))
      }
      const teacherId = Number(this.active.teacher_id)
      const message = await this.onSend(teacherId, body)
      if (!message?.id) throw new Error(this.t('teacher.action_failed'))
      const bucket = this.sentOptimistic[teacherId] || []
      this.sentOptimistic = { ...this.sentOptimistic, [teacherId]: [...bucket, message] }
      const merged = mergeThreadMessages(this.activeMessages, [message])
      this.activeMessages = merged
      this.inbox = patchThreadRow(this.inbox, teacherId, merged)
      this.active = { ...this.active, messages: merged }
      this.$emit('threads-updated', { teacherId, messages: merged })
      return message
    },
    startPolling() {
      this.stopPolling()
      this.stopPoll = startVisiblePoll(() => {
        if (this.active && !this.directSending && !this.threadLoading) this.loadActiveThread()
      }, POLL_MS)
    },
    stopPolling() {
      this.stopPoll?.()
      this.stopPoll = null
    },
  },
}
</script>