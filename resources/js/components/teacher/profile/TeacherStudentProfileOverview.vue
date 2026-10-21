<template>
  <TeacherSectionPane tone="neutral">
    <div class="teacher-profile-overview">
      <div class="teacher-profile-overview__priority" :class="`is-${stage.key}`">
        <span class="teacher-profile-overview__priority-icon" aria-hidden="true">
          <i :class="priorityIcon"></i>
        </span>
        <div>
          <span class="teacher-profile-overview__eyebrow">{{ priorityLabel }}</span>
          <p>{{ priorityDetail }}</p>
        </div>
      </div>

      <div v-if="summaryFacts.length" class="teacher-profile-overview__facts" role="list">
        <div v-for="fact in summaryFacts" :key="fact.key" class="teacher-profile-overview__fact" role="listitem">
          <i :class="fact.icon" aria-hidden="true"></i>
          <div>
            <span>{{ fact.label }}</span>
            <strong :class="{ 'teacher-quran': fact.quran }">{{ fact.value }}</strong>
          </div>
        </div>
      </div>

      <button
        v-if="nextAction"
        type="button"
        class="dash-btn dash-btn--primary dash-btn--sm teacher-profile-overview__action"
        @click="runNextAction"
      >
        <i :class="nextAction.icon" aria-hidden="true"></i>
        {{ nextAction.label }}
      </button>
    </div>
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
  emits: ['assign-revision', 'change-section'],
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
    revisionOverdue() {
      return Number(this.profile.payload?.metrics?.revision_overdue || 0)
    },
    activeRecently() {
      return this.profile.payload?.metrics?.active_7 === true
    },
    priorityLabel() {
      if (this.revisionOverdue > 0) return this.t('teacher.overdue_revisions')
      if (this.weakCount > 0) return this.t('teacher.reason_hard_ayahs')
      if (!this.activeRecently) return this.t('teacher.reason_inactive')
      if (this.hasScore && this.scoreValue < 65) return this.t('teacher.reason_low_score')
      return this.stage.label
    },
    priorityDetail() {
      if (this.revisionOverdue > 0) return this.t('teacher.overdue_n', { n: this.revisionOverdue })
      if (this.weakCount > 0) return this.t('teacher.profile_weak_n', { n: this.weakCount })
      if (!this.activeRecently) return this.lastSeen
        ? this.t('teacher.profile_last_seen', { when: this.lastSeen })
        : this.t('teacher.no_activity')
      if (this.hasScore && this.scoreValue < 65) return this.t('teacher.profile_recite_avg', { score: this.scoreValue })
      return this.stage.hint
    },
    priorityIcon() {
      if (this.revisionOverdue > 0) return 'bi bi-arrow-repeat'
      if (this.weakCount > 0) return 'bi bi-exclamation-triangle'
      if (!this.activeRecently) return 'bi bi-moon'
      if (this.hasScore && this.scoreValue < 65) return 'bi bi-mic'
      return this.stageMeta.icon
    },
    summaryFacts() {
      const facts = []
      if (this.nowOn) {
        facts.push({
          key: 'saved',
          icon: 'bi bi-bookmark-fill',
          label: this.t('teacher.saved_session'),
          value: this.nowOn,
          quran: true,
        })
      }
      if (this.lastSeen) {
        facts.push({
          key: 'activity',
          icon: 'bi bi-clock-history',
          label: this.t('teacher.last'),
          value: this.lastSeen,
        })
      }
      if (this.hasScore) {
        facts.push({
          key: 'recite',
          icon: 'bi bi-mic',
          label: this.t('teacher.tab_ai'),
          value: this.t('teacher.score_n', { n: this.scoreValue }),
        })
      }
      return facts
    },
    nextAction() {
      if (this.revisionOverdue > 0) {
        return { type: 'tab', tab: 'revision', label: `${this.t('teacher.open')} ${this.t('teacher.tab_revision')}`, icon: 'bi bi-arrow-repeat' }
      }
      if (this.weakCount > 0) {
        return { type: 'assign', label: this.t('teacher.assign_revision'), icon: 'bi bi-journal-plus' }
      }
      if (this.hasScore && this.scoreValue < 65) {
        return { type: 'tab', tab: 'ai', label: `${this.t('teacher.open')} ${this.t('teacher.tab_ai')}`, icon: 'bi bi-mic' }
      }
      if (this.nowOn) {
        return { type: 'tab', tab: 'practice', label: `${this.t('teacher.open')} ${this.t('teacher.tab_practice')}`, icon: 'bi bi-play-circle' }
      }
      return null
    },
  },
  methods: {
    runNextAction() {
      if (!this.nextAction) return
      if (this.nextAction.type === 'assign') {
        this.$emit('assign-revision', this.profile.student)
        return
      }
      this.$emit('change-section', this.nextAction.tab)
    },
  },
}
</script>
