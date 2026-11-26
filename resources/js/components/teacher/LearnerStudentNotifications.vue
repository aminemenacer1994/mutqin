<template>
  <section
    class="teacher-pane learner-notifications"
    :class="{ 'learner-notifications--compact': compact }"
    :aria-label="t('dashboard.notifications_inbox_title')"
    data-testid="student-notifications"
  >
    <header class="teacher-pane__head learner-home__section-head">
      <div class="teacher-pane__titles">
        <h2 class="teacher-pane__title">{{ t('dashboard.notifications_inbox_title') }} <span v-if="unreadCount" class="teacher-badge is-info">{{ unreadCount }} {{ t('dashboard.notifications_unread') }}</span></h2>
        <p v-if="!compact" class="teacher-meta">{{ t('dashboard.notifications_inbox_hint') }}</p>
      </div>
      <button
        v-if="unreadCount"
        type="button"
        class="dash-text-link"
        :disabled="markingAll"
        @click="markAllRead"
      >
        {{ t('dashboard.notifications_mark_all_read') }}
      </button>
    </header>
  <div class="teacher-pane__body">
    <p v-if="loading" class="teacher-meta" role="status">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="teacher-meta" role="alert">
      {{ t('dashboard.notifications_error') }}
      <button type="button" class="dash-text-link" @click="refreshNotifications">{{ t('common.retry') }}</button>
    </p>
    <p v-else-if="!visibleRows.length" class="teacher-meta">{{ t('dashboard.notifications_empty') }}</p>
    <ul v-else class="learner-notifications__list list-unstyled mb-0">
      <li
        v-for="item in visibleRows"
        :key="item.id"
        class="learner-notifications__item"
        :class="{ 'is-unread': item.unread }"
      >
        <button type="button" class="learner-notifications__row" @click="openNotice(item)">
          <span class="learner-notifications__mark" aria-hidden="true">
            <i class="bi" :class="iconFor(item.type)"></i>
          </span>
          <span class="learner-notifications__copy">
            <strong>{{ item.title || typeLabel(item.type) }}</strong>
            <span v-if="item.body" class="teacher-meta">{{ item.body }}</span>
            <time v-if="item.created_at" class="teacher-meta" :datetime="item.created_at">{{ when(item.created_at) }}</time>
          </span>
          <span v-if="item.unread" class="learner-notifications__unread">{{ t('dashboard.notifications_unread') }}</span>
        </button>
      </li>
    </ul>
    <button
      v-if="compact && hasMore"
      type="button"
      class="dash-text-link learner-notifications__more"
      @click="$emit('expand')"
    >
      {{ t('dashboard.notifications_view_all') }}
    </button>
    <button v-if="!compact && nextCursor" type="button" class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="refreshNotifications(true)">{{ t('teacher.load_more') }}</button>
  </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatTeacherWhen } from '../../scripts/teacher/formatters.js'
import learningApi from '../../scripts/api/learning.js'

const TYPE_ICONS = {
  deadline: 'bi-calendar-event',
  revision: 'bi-arrow-repeat',
  lesson: 'bi-mortarboard',
  teacher_feedback: 'bi-chat-square-text',
  assignment_approved: 'bi-check-circle',
  assignment_correction: 'bi-exclamation-circle',
}

export default {
  name: 'LearnerStudentNotifications',
  mixins: [i18nMixin],
  props: {
    compact: { type: Boolean, default: false },
    limit: { type: Number, default: 5 },
  },
  emits: ['expand', 'open', 'unread-change'],
  data() {
    return {
      loading: false,
      error: false,
      markingAll: false,
      rows: [],
      unreadCount: 0,
      nextCursor: null,
    }
  },
  computed: {
    visibleRows() {
      const rows = Array.isArray(this.rows) ? this.rows : []
      return this.compact ? rows.slice(0, Math.max(1, Number(this.limit) || 5)) : rows
    },
    hasMore() {
      return this.rows.length > this.visibleRows.length || Boolean(this.nextCursor)
    },
  },
  watch: {
    compact(value) { if (!value) this.refreshNotifications() },
  },
  mounted() {
    this.refreshNotifications()
  },
  methods: {
    async refreshNotifications(append = false) {
      if (this.loading) return
      this.loading = true
      this.error = false
      try {
        const data = await learningApi.getStudentNotifications({ limit: this.compact ? this.limit : 10, cursor: append ? this.nextCursor : undefined })
        this.rows = [...new Map([...(append ? this.rows : []), ...(data?.notifications || [])].map(row => [row.id, row])).values()]
        this.unreadCount = Number(data?.unread_count || 0)
        this.nextCursor = data?.next_cursor || null
        this.$emit('unread-change', this.unreadCount)
      } catch (_) {
        this.error = true
      } finally {
        this.loading = false
      }
    },
    async markAllRead() {
      if (this.markingAll) return
      this.markingAll = true
      try {
        await learningApi.markAllStudentNotificationsRead()
        this.rows = this.rows.map((row) => ({ ...row, unread: false, read_at: row.read_at || new Date().toISOString() }))
        this.unreadCount = 0
        this.$emit('unread-change', 0)
      } catch (_) {
        this.error = true
      } finally {
        this.markingAll = false
      }
    },
    async openNotice(item) {
      if (!item?.id) return
      if (item.unread) {
        try {
          const data = await learningApi.markStudentNotificationRead(item.id)
          this.unreadCount = Number(data?.unread_count ?? Math.max(0, this.unreadCount - 1))
          const row = this.rows.find((r) => r.id === item.id)
          if (row) row.unread = false
          this.$emit('unread-change', this.unreadCount)
        } catch (_) { /* still navigate */ }
      }
      this.$emit('open', item)
    },
    iconFor(type) {
      return TYPE_ICONS[type] || 'bi-bell'
    },
    typeLabel(type) {
      const key = `dashboard.notifications_type_${type}`
      const translated = this.t(key)
      return translated !== key ? translated : type
    },
    when(value) {
      return formatTeacherWhen(value)
    },
  },
}
</script>