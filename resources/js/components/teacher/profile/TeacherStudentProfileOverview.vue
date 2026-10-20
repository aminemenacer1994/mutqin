<template>
  <div class="teacher-now">
    <article class="teacher-stage" :class="`teacher-stage--${stage.key}`">
      <p class="teacher-stage__label">{{ t('teacher.stage_label') }}</p>
      <strong>{{ stage.label }}</strong>
      <p>{{ stage.hint }}</p>
    </article>

    <p v-if="nowOn" class="teacher-saved">
      <span class="teacher-saved__label">
        <i class="bi bi-bookmark" aria-hidden="true"></i>
        {{ t('teacher.now_on') }}
      </span>
      <strong>{{ nowOn }}</strong>
    </p>

    <dl class="teacher-facts">
      <div>
        <dt>{{ t('teacher.last') }}</dt>
        <dd>{{ lastSeen || t('teacher.unavailable') }}</dd>
      </div>
      <div>
        <dt>{{ t('teacher.ayahs') }}</dt>
        <dd>{{ ayahs }}</dd>
      </div>
      <div>
        <dt>{{ t('teacher.ai_rate') }}</dt>
        <dd>{{ score }}</dd>
      </div>
      <div>
        <dt>{{ t('teacher.weak') }}</dt>
        <dd>{{ metric('weak_count') }}</dd>
      </div>
    </dl>
  </div>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { studentStatus } from '../../../scripts/teacher/formatters'

export default {
  name: 'TeacherStudentProfileOverview',
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    metric: { type: Function, required: true },
    practiceTime: { type: String, required: true },
    sessionLabel: { type: Function, required: true },
    formatWhen: { type: Function, required: true },
  },
  computed: {
    stage() {
      return studentStatus({
        ...(this.profile.student || {}),
        ...(this.profile.payload?.metrics || {}),
      }, this.t)
    },
    nowOn() {
      const saved = this.profile.payload?.latest_saved
      return saved ? this.sessionLabel(saved) : ''
    },
    lastSeen() {
      return this.formatWhen(this.profile.payload?.metrics?.last_activity_at)
    },
    score() {
      const rate = this.profile.payload?.metrics?.ai_success_rate
      return typeof rate === 'number' ? this.t('teacher.score_n', { n: rate }) : this.t('teacher.unavailable')
    },
    ayahs() {
      const n = this.profile.payload?.metrics?.ayahs_practised
      return n === null || n === undefined ? this.t('teacher.unavailable') : this.t('teacher.ayahs_n', { n })
    },
  },
}
</script>
