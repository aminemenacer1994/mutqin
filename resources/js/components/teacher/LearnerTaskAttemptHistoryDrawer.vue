<template>
  <div
    v-if="open"
    class="dash-drawer-root user-dashboard"
    @keydown="onKeydown"
  >
    <button
      type="button"
      class="dash-drawer__backdrop"
      :aria-label="t('dashboard.drawer_close')"
      @click="$emit('close')"
    ></button>
    <aside
      ref="panel"
      class="dash-drawer"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="dash-drawer__handle" aria-hidden="true"></div>
      <header class="dash-drawer__head">
        <div class="dash-drawer__head-main">
          <span class="dash-drawer__head-icon" aria-hidden="true">
            <i class="bi bi-graph-up"></i>
          </span>
          <div class="dash-drawer__head-copy">
            <h2 :id="titleId" class="dash-drawer__title">{{ t('teacher.learner_attempt_history_title') }}</h2>
            <p v-if="subtitle" class="dash-drawer__subtitle">{{ subtitle }}</p>
          </div>
        </div>
        <button
          ref="closeBtn"
          type="button"
          class="dash-icon-btn dash-drawer__close"
          :aria-label="t('dashboard.drawer_close')"
          @click="$emit('close')"
        >
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </header>
      <div class="dash-drawer__body">
        <div class="dash-drawer__content">
          <ul class="learner-teacher__attempt-history">
            <li v-for="attempt in attemptsNewestFirst" :key="attemptKey(attempt)">
              <article class="learner-teacher__attempt-history-row">
                <div class="learner-teacher__attempt-history-main">
                  <strong>{{ t('teacher.learner_attempt_row', { n: attempt.n }) }}</strong>
                  <span v-if="attemptDate(attempt)" class="learner-teacher__attempt-history-date">
                    {{ attemptDate(attempt) }}
                  </span>
                  <span
                    v-if="Number.isFinite(Number(attempt.score))"
                    class="learner-teacher__attempt-history-score"
                  >{{ attempt.score }}%</span>
                </div>
                <p
                  v-if="attempt.teacherNote"
                  class="learner-teacher__attempt-history-note"
                >{{ attempt.teacherNote }}</p>
                <div v-if="attempt.hasRecording && attempt.recordingUrl" class="learner-teacher__attempt-history-listen">
                  <AudioClip :src="attempt.recordingUrl" :label="t('teacher.learner_attempt_listen')" />
                  <span>{{ t('teacher.learner_attempt_listen') }}</span>
                </div>
              </article>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatLearnerDisplayDate } from '../../utils/learnerDisplayDate.js'
import AudioClip from '../AudioClip.vue'

export default {
  name: 'LearnerTaskAttemptHistoryDrawer',
  components: { AudioClip },
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    attempts: { type: Array, default: () => [] },
    subtitle: { type: String, default: '' },
    titleId: { type: String, required: true },
  },
  emits: ['close'],
  computed: {
    attemptsNewestFirst() {
      return [...(this.attempts || [])].sort((a, b) => Number(b.n) - Number(a.n))
    },
  },
  watch: {
    open(value) {
      if (value) {
        this.$nextTick(() => this.$refs.closeBtn?.focus())
      }
    },
  },
  methods: {
    attemptKey(attempt) {
      return attempt.attemptId || `n-${attempt.n}-${attempt.completedAt || ''}`
    },
    attemptDate(attempt) {
      if (!attempt.completedAt) return ''
      const locale = this.$i18n?.locale?.value || 'en'
      return formatLearnerDisplayDate(attempt.completedAt, this.t.bind(this), locale)
    },
    onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.$emit('close')
      }
    },
  },
}
</script>
