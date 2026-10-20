<template>
  <TeacherSectionPane
    :title="t('teacher.tab_overview')"
    :hint="t('teacher.profile_tab_overview_hint')"
    icon="bi bi-house-door"
    tone="neutral"
  >
    <div class="teacher-stage-badge" :class="`teacher-stage-badge--${stage.key}`">
      <i :class="stageMeta.icon" aria-hidden="true"></i>
      <span>{{ stage.label }}</span>
    </div>
    <p class="teacher-profile-summary__lead">{{ stage.hint }}</p>

    <div v-if="nowOn" class="teacher-spotlight teacher-spotlight--practice">
      <span class="teacher-spotlight__icon" aria-hidden="true"><i class="bi bi-bookmark-fill"></i></span>
      <div class="teacher-spotlight__copy">
        <span class="teacher-spotlight__label">{{ t('teacher.now_on') }}</span>
        <span class="teacher-quran teacher-spotlight__value">{{ nowOn }}</span>
      </div>
    </div>

    <ul v-else class="teacher-quick-notes">
      <li>
        <i class="bi bi-calendar3" aria-hidden="true"></i>
        {{ t('teacher.profile_last_seen', { when: lastSeen || t('teacher.unavailable') }) }}
      </li>
      <li v-if="hasScore">
        <i class="bi bi-mic" aria-hidden="true"></i>
        {{ t('teacher.profile_recite_avg', { score: scoreValue }) }}
      </li>
      <li v-if="weakCount">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        {{ t('teacher.profile_weak_n', { n: weakCount }) }}
      </li>
    </ul>
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { stageMeta, studentStatus } from '../../../scripts/teacher/formatters'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentProfileOverview',
  components: { TeacherSectionPane },
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
    stageMeta() {
      return stageMeta(this.stage.key)
    },
    nowOn() {
      const saved = this.profile.payload?.latest_saved
      return saved ? this.sessionLabel(saved) : ''
    },
    lastSeen() {
      return this.formatWhen(this.profile.payload?.metrics?.last_activity_at)
    },
    scoreValue() {
      return this.profile.payload?.metrics?.ai_success_rate
    },
    hasScore() {
      return typeof this.scoreValue === 'number'
    },
    weakCount() {
      return Number(this.profile.payload?.metrics?.weak_count || 0)
    },
  },
}
</script>
