<template>
  <section
    class="learner-teacher__feedback-panel"
    :class="{ 'is-drawer': variant === 'drawer' }"
    :aria-label="t('teacher.learner_feedback_inbox')"
  >
    <header class="learner-teacher__feedback-head">
      <h3 class="learner-teacher__section-title">{{ t('teacher.learner_feedback_inbox') }}</h3>
      <span v-if="unreadCount" class="learner-teacher__feedback-new">
        {{ t('teacher.learner_feedback_unread', { n: unreadCount }) }}
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
          :class="{ 'is-unread': item.unread }"
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

    <button
      v-if="variant !== 'drawer' && feedbackItems.length > previewLimit"
      type="button"
      class="learner-teacher__hub-more"
      @click="showAllFeedback = !showAllFeedback"
    >
      {{ showAllFeedback ? t('teacher.learner_view_all_less') : t('teacher.learner_view_all_feedback', { n: feedbackItems.length }) }}
    </button>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

const PREVIEW_LIMIT = 4

export default {
  name: 'LearnerTeacherLearning',
  mixins: [i18nMixin],
  props: {
    learning: { type: Object, default: null },
    variant: { type: String, default: 'panel' },
  },
  emits: ['open-feedback'],
  data() {
    return {
      showAllFeedback: false,
      previewLimit: PREVIEW_LIMIT,
    }
  },
  computed: {
    feedbackItems() {
      return Array.isArray(this.learning?.feedback_inbox) ? this.learning.feedback_inbox : []
    },
    feedbackPreview() {
      const limit = this.variant === 'drawer' || this.showAllFeedback ? 20 : this.previewLimit
      return this.feedbackItems.slice(0, limit)
    },
    unreadCount() {
      return this.feedbackItems.filter((item) => item.unread).length
    },
  },
  methods: {
    formatWhen(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    },
  },
}
</script>
