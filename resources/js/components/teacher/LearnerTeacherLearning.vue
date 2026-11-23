<template>
  <section
    class="learner-teacher__feedback-panel"
    :class="{ 'is-drawer': variant === 'drawer' }"
    :aria-label="panelAriaLabel"
  >
    <header class="learner-teacher__feedback-head" :class="{ 'is-collapsible': mobileCollapsible && variant !== 'drawer' }">
      <button
        v-if="mobileCollapsible && variant !== 'drawer'"
        type="button"
        class="learner-teacher__panel-toggle"
        :aria-expanded="panelOpen ? 'true' : 'false'"
        :aria-controls="panelBodyId"
        @click="panelOpen = !panelOpen"
      >
        <span class="learner-teacher__panel-toggle-label">
          <span class="learner-teacher__sidebar-panel-icon" aria-hidden="true"><i class="bi bi-chat-left-quote"></i></span>
          <h3 class="learner-teacher__section-title">{{ panelTitle }}</h3>
          <span v-if="unreadCount" class="learner-teacher__feedback-new">
            {{ ldtp('teacher.learner_feedback_unread', unreadCount) }}
          </span>
        </span>
        <i class="bi learner-teacher__panel-toggle-icon" :class="panelOpen ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
      </button>
      <template v-else>
        <span class="learner-teacher__sidebar-panel-icon" aria-hidden="true"><i class="bi bi-chat-left-quote"></i></span>
        <h3 class="learner-teacher__section-title">{{ panelTitle }}</h3>
        <span v-if="unreadCount" class="learner-teacher__feedback-new">
          {{ ldtp('teacher.learner_feedback_unread', unreadCount) }}
        </span>
      </template>
    </header>

    <div
      v-show="variant === 'drawer' || !mobileCollapsible || panelOpen"
      :id="panelBodyId"
      class="learner-teacher__panel-body"
    >
    <p v-if="pending" class="learner-teacher__feedback-state is-loading" role="status" aria-live="polite">
      <span class="learner-teacher__feedback-skeleton" aria-hidden="true">
        <span class="learner-teacher__feedback-skeleton-line is-wide"></span>
        <span class="learner-teacher__feedback-skeleton-line"></span>
        <span class="learner-teacher__feedback-skeleton-line is-short"></span>
      </span>
      <span class="learner-teacher__feedback-state-label">{{ t('teacher.loading') }}</span>
    </p>

    <div v-else-if="!feedbackItems.length" class="learner-teacher__feedback-state is-empty">
      <span class="learner-teacher__feedback-empty-icon" aria-hidden="true">
        <i class="bi bi-chat-left-quote"></i>
      </span>
      <p class="learner-teacher__feedback-empty">{{ t('teacher.learner_feedback_empty') }}</p>
    </div>

    <ul v-else class="learner-teacher__feedback-grid">
      <li
        v-for="item in feedbackPreview"
        :key="`fb-${item.id}`"
        class="learner-teacher__feedback-item"
        :class="{ 'is-unread': item.unread, 'is-read': !item.unread && item.read_at }"
      >
        <div class="learner-teacher__feedback-row">
          <button
            type="button"
            class="learner-teacher__feedback-main-hit"
            @click="$emit('open-feedback', item)"
          >
            <span class="learner-teacher__feedback-icon" aria-hidden="true">
              <i class="bi" :class="feedbackIcon(item)"></i>
            </span>
            <span class="learner-teacher__feedback-body">
              <span class="learner-teacher__feedback-top">
                <strong>{{ item.task_title || item.passage?.label || t('teacher.feedback') }}</strong>
                <span v-if="item.unread" class="learner-teacher__dot" :aria-label="t('teacher.unread')"></span>
              </span>
              <span class="learner-teacher__feedback-sender">
                <span class="learner-teacher__feedback-who">
                  {{ item.teacher_name || t('teacher.teacher') }}
                  <span class="learner-teacher__feedback-kind">{{ feedbackTypeLabel(item) }}</span>
                </span>
                <time>{{ formatWhen(item.created_at) }}</time>
              </span>
              <span v-if="(item.preview || item.body) && (item.preview || item.body) !== feedbackTypeLabel(item)" class="learner-teacher__feedback-preview">{{ item.preview || item.body }}</span>
              <span v-if="Number(item.conversation_message_count) > 1" class="learner-teacher__feedback-count">
                {{ t('teacher.feedback_conversation_count', { n: item.conversation_message_count }) }}
              </span>
              <span class="learner-teacher__feedback-read">{{ actionLabel(item) }} <i class="bi bi-arrow-right-short" aria-hidden="true"></i></span>
            </span>
          </button>
        </div>
        <div v-if="variant === 'drawer' && item.audio?.available && item.audio?.url" class="learner-teacher__feedback-audio">
          <TeacherAudioFeedbackPlayer :src="item.audio.url" :duration-ms="item.audio.duration_ms" compact />
        </div>
        <p v-else-if="variant === 'drawer' && item.audio?.reason === 'missing'" class="learner-teacher__feedback-audio-missing" role="status">
          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ t('teacher.voice_feedback_unavailable') }}
        </p>
        <a
          v-if="variant === 'drawer' && item.correction_action?.href"
          class="learner-teacher__feedback-correction-action"
          :href="item.correction_action.href"
        >
          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
          {{ t('teacher.practise_correction') }}
        </a>
      </li>
    </ul>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatLearnerDisplayDate } from '../../utils/learnerDisplayDate.js'
import { mergeFeedbackReadState, readFeedbackReadMap, sortFeedbackInbox } from '../../scripts/teacher/learnerDashboard.js'
import { learnerDashboardTp } from '../../scripts/teacher/learnerDashboardI18n.js'
import TeacherAudioFeedbackPlayer from './TeacherAudioFeedbackPlayer.vue'

const SIDEBAR_PREVIEW_LIMIT = 1

export default {
  name: 'LearnerTeacherLearning',
  components: { TeacherAudioFeedbackPlayer },
  mixins: [i18nMixin],
  props: {
    learning: { type: Object, default: null },
    variant: { type: String, default: 'panel' },
    pending: { type: Boolean, default: false },
    mobileCollapsible: { type: Boolean, default: false },
  },
  emits: ['open-feedback'],
  data() {
    return {
      panelOpen: true,
      panelBodyId: `learner-feedback-panel-${Math.random().toString(36).slice(2, 9)}`,
    }
  },
  watch: {
    mobileCollapsible: {
      handler(value) {
        this.panelOpen = !value
      },
      immediate: true,
    },
  },
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
    actionLabel(item) {
      return item?.unread
        ? this.t('teacher.learner_feedback_read_now')
        : this.t('teacher.open_feedback_conversation')
    },
    feedbackIcon(item) {
      if (item?.feedback_type === 'correction_request') return 'bi-arrow-counterclockwise'
      if (item?.feedback_type === 'recitation_feedback') return 'bi-soundwave'
      if (item?.feedback_type === 'voice_feedback') return 'bi-mic-fill'
      return 'bi-chat-left-quote'
    },
    feedbackTypeLabel(item) {
      if (item?.feedback_type === 'correction_request') return this.t('teacher.correction_request')
      if (item?.feedback_type === 'recitation_feedback') return this.t('teacher.recitation_feedback')
      if (item?.feedback_type === 'voice_feedback') return this.t('teacher.voice_feedback')
      return this.t('teacher.written_feedback')
    },
  },
}
</script>
