<template>
  <div class="learner-messages-workspace">
    <section class="teacher-pane learner-messages__teachers" :aria-labelledby="teachersHeadingId">
      <header class="teacher-pane__head">
        <div class="teacher-pane__titles">
          <h2 :id="teachersHeadingId" class="teacher-pane__title">{{ t('dashboard.messages_teachers_title') }}</h2>
          <p class="teacher-pane__hint">{{ t('dashboard.messages_teachers_hint') }}</p>
        </div>
      </header>
      <div class="teacher-pane__body">
        <p v-if="pending" class="teacher-meta" role="status" aria-live="polite">{{ t('teacher.loading') }}</p>
        <div v-else-if="!threads.length" class="learner-messages__empty">
          <i class="bi bi-chat-left-text" aria-hidden="true"></i>
          <p>{{ t('dashboard.messages_teachers_empty') }}</p>
        </div>
        <ul v-else class="learner-messages__list">
          <li
            v-for="thread in threads"
            :key="thread.teacher_id"
            :class="{ 'has-unread': threadUnread(thread) > 0 }"
          >
            <button type="button" @click="$emit('open-teacher', thread.teacher_id)">
              <span class="learner-messages__avatar" aria-hidden="true">{{ initials(thread.teacher_name) }}</span>
              <span class="learner-messages__copy">
                <span class="learner-messages__title-row">
                  <strong>{{ thread.teacher_name || t('teacher.teacher') }}</strong>
                  <time v-if="threadLastAt(thread)" :datetime="threadLastAt(thread)">{{ formatWhen(threadLastAt(thread)) }}</time>
                </span>
                <span v-if="thread.can_message === false" class="teacher-meta">{{ t('dashboard.circle_message_blocked') }}</span>
                <span v-else-if="threadPreview(thread)" class="learner-messages__preview" dir="auto">{{ threadPreview(thread) }}</span>
                <span v-else class="learner-messages__preview is-muted">{{ t('teacher.direct_messages_empty_student') }}</span>
              </span>
              <span
                v-if="threadUnread(thread) > 0"
                class="learner-messages__badge"
                :aria-label="ldtp('teacher.learner_feedback_unread', threadUnread(thread))"
              >{{ threadUnread(thread) }}</span>
            </button>
          </li>
        </ul>
      </div>
    </section>

    <LearnerTeacherLearning
      class="learner-messages__feedback"
      variant="drawer"
      :limit="40"
      :learning="learning"
      :pending="pending"
      @open-feedback="$emit('open-feedback', $event)"
    />
  </div>
</template>

<script>
import './LearnerStudentMessages.css'
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatLearnerDisplayDate } from '../../utils/learnerDisplayDate.js'
import { learnerDashboardTp } from '../../scripts/teacher/learnerDashboardI18n.js'
import LearnerTeacherLearning from './LearnerTeacherLearning.vue'

export default {
  name: 'LearnerStudentMessages',
  components: { LearnerTeacherLearning },
  mixins: [i18nMixin],
  props: {
    threads: { type: Array, default: () => [] },
    learning: { type: Object, default: null },
    pending: { type: Boolean, default: false },
  },
  emits: ['open-teacher', 'open-feedback'],
  data() {
    return {
      teachersHeadingId: `learner-messages-teachers-${Math.random().toString(36).slice(2, 9)}`,
    }
  },
  computed: {
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
    initials(name) {
      const label = String(name || '').trim()
      if (!label) return 'T'
      return label.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    },
    formatWhen(value) {
      return formatLearnerDisplayDate(value, this.t.bind(this), this.learnerLocale)
    },
    threadMessages(thread) {
      return Array.isArray(thread?.messages) ? thread.messages : []
    },
    threadLastAt(thread) {
      const messages = this.threadMessages(thread)
      if (!messages.length) return ''
      return messages[messages.length - 1]?.created_at || ''
    },
    threadPreview(thread) {
      const messages = this.threadMessages(thread)
      if (!messages.length) return ''
      const last = messages[messages.length - 1]
      return String(last?.preview || last?.body || '').trim()
    },
    threadUnread(thread) {
      return this.threadMessages(thread).filter((message) => message.unread && message.sender === 'teacher').length
    },
  },
}
</script>