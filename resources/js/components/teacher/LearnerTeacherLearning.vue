<template>
  <section
    class="learner-teacher__feedback-panel"
    :class="{ 'is-drawer': variant === 'drawer' }"
    :aria-label="panelAriaLabel"
  >
    <header class="learner-teacher__feedback-head">
      <h3 class="learner-teacher__section-title">{{ panelTitle }}</h3>
      <span v-if="unreadCount" class="learner-teacher__feedback-new">
        {{ ldtp('teacher.learner_feedback_unread', unreadCount) }}
      </span>
    </header>

    <p v-if="!feedbackItems.length" class="learner-teacher__feedback-empty">
      {{ t('teacher.learner_feedback_empty') }}
    </p>

    <ul v-else class="learner-teacher__feedback-grid">
      <li v-for="item in feedbackPreview" :key="`fb-${item.id}`">
        <button
          type="button"
          class="learner-teacher__feedback-card"
          :class="{ 'is-unread': item.unread, 'is-read': !item.unread && item.read_at }"
          @click="$emit('open-feedback', item)"
        >
          <span class="learner-teacher__feedback-icon" aria-hidden="true">
            <i class="bi bi-chat-left-quote"></i>
          </span>
          <span class="learner-teacher__feedback-body">
            <span class="learner-teacher__feedback-top">
              <strong>{{ item.task_title || t('teacher.feedback') }}</strong>
              <span v-if="item.unread" class="learner-teacher__dot" :aria-label="t('teacher.unread')"></span>
            </span>
            <span class="learner-teacher__feedback-sender">
              {{ item.teacher_name || t('teacher.teacher') }}
              <time>{{ formatWhen(item.created_at) }}</time>
            </span>
            <p class="learner-teacher__feedback-preview">{{ item.preview || item.body }}</p>
          </span>
          <i class="bi bi-chevron-right learner-teacher__feedback-go" aria-hidden="true"></i>
        </button>
      </li>
    </ul>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatLearnerDisplayDate } from '../../utils/learnerDisplayDate.js'
import { mergeFeedbackReadState, readFeedbackReadMap, sortFeedbackInbox } from '../../scripts/teacher/learnerDashboard.js'
import { learnerDashboardTp } from '../../scripts/teacher/learnerDashboardI18n.js'

const SIDEBAR_PREVIEW_LIMIT = 2

export default {
  name: 'LearnerTeacherLearning',
  mixins: [i18nMixin],
  props: {
    learning: { type: Object, default: null },
    variant: { type: String, default: 'panel' },
  },
  emits: ['open-feedback'],
  computed: {
    feedbackItems() {
      const raw = Array.isArray(this.learning?.feedback_inbox) ? this.learning.feedback_inbox : []
      const map = readFeedbackReadMap()
      return sortFeedbackInbox(mergeFeedbackReadState(raw, map))
    },
    feedbackPreview() {
      const limit = this.variant === 'drawer' ? 20 : SIDEBAR_PREVIEW_LIMIT
      return this.feedbackItems.slice(0, limit)
    },
    unreadCount() {
      return this.feedbackItems.filter((item) => item.unread).length
    },
    panelTitle() {
      return this.variant === 'drawer'
        ? this.t('teacher.learner_feedback_inbox')
        : this.t('teacher.learner_feedback_latest')
    },
    panelAriaLabel() {
      return this.panelTitle
    },
    learnerLocale() {
      return this.$i18n?.global?.locale?.value
        || (typeof document !== 'undefined' ? document.documentElement.getAttribute('lang') : null)
        || 'en'
    },
  },
  methods: {
    ldtp(key, count, params = {}) {
      return learnerDashboardTp(this.learnerLocale, this.$i18n, key, count, params)
    },
    formatWhen(value) {
      const locale = this.learnerLocale
      return formatLearnerDisplayDate(value, this.t.bind(this), locale)
    },
  },
}
</script>
