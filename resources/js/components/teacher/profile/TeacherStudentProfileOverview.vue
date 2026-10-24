<template>
  <TeacherSectionPane tone="neutral">
    <div class="teacher-profile-overview">
      <div class="teacher-profile-overview__top">
        <div class="teacher-profile-overview__priority" :class="`is-${stage.key}`">
          <span class="teacher-profile-overview__priority-icon" aria-hidden="true">
            <i :class="priorityIcon"></i>
          </span>
          <div>
            <span class="teacher-profile-overview__eyebrow">{{ t('teacher.teaching_focus') }}</span>
            <strong>{{ priorityLabel }}</strong>
            <p>{{ priorityDetail }}</p>
          </div>
        </div>

        <button
          v-if="nextAction"
          type="button"
          class="btn btn-primary btn-sm teacher-profile-overview__action"
          @click="runNextAction"
        >
          <i :class="nextAction.icon" aria-hidden="true"></i>
          {{ nextAction.label }}
        </button>
      </div>

      <div v-if="summaryFacts.length" class="teacher-profile-overview__facts" role="list">
        <div v-for="fact in summaryFacts" :key="fact.key" class="teacher-profile-overview__fact" role="listitem">
          <i :class="fact.icon" aria-hidden="true"></i>
          <div>
            <span>{{ fact.label }}</span>
            <strong :class="{ 'teacher-quran': fact.quran }">{{ fact.value }}</strong>
            <small>{{ fact.hint }}</small>
          </div>
        </div>
      </div>

      <p v-if="hasScore" class="teacher-profile-overview__score-note" role="note">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        {{ t('teacher.profile_recite_ai_note') }}
      </p>
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
    overdueTasks() {
      return Number(this.profile.payload?.metrics?.assignments?.overdue || 0)
    },
    activeRecently() {
      return this.profile.payload?.metrics?.active_7 === true
    },
    priorityLabel() {
      if (this.overdueTasks > 0) return this.t('teacher.kpi_overdue_tasks')
      if (this.revisionOverdue > 0) return this.t('teacher.overdue_revisions')
      if (this.hasScore && this.scoreValue < 65) return this.t('teacher.reason_low_score')
      if (this.weakCount > 0) return this.t('teacher.reason_hard_ayahs')
      if (!this.activeRecently) return this.t('teacher.reason_inactive')
      return this.stage.label
    },
    priorityDetail() {
      if (this.overdueTasks > 0) return this.t('teacher.overdue_n', { n: this.overdueTasks })
      if (this.revisionOverdue > 0) return this.t('teacher.overdue_n', { n: this.revisionOverdue })
      if (this.hasScore && this.scoreValue < 65) return this.t('teacher.profile_recite_avg', { score: this.scoreValue })
      if (this.weakCount > 0) return this.t(this.weakCount === 1 ? 'teacher.profile_weak_one' : 'teacher.profile_weak_n', { n: this.weakCount })
      if (!this.activeRecently) return this.lastSeen
        ? this.t('teacher.profile_last_seen', { when: this.lastSeen })
        : this.t('teacher.no_activity')
      return this.stage.hint
    },
    priorityIcon() {
      if (this.overdueTasks > 0) return 'bi bi-clock'
      if (this.revisionOverdue > 0) return 'bi bi-arrow-repeat'
      if (this.hasScore && this.scoreValue < 65) return 'bi bi-mic'
      if (this.weakCount > 0) return 'bi bi-exclamation-triangle'
      if (!this.activeRecently) return 'bi bi-moon'
      return this.stageMeta.icon
    },
    summaryFacts() {
      const metrics = this.profile.payload?.metrics || {}
      const facts = [
        {
          key: 'sessions',
          icon: 'bi bi-play-circle',
          label: this.t('teacher.sessions_recorded'),
          value: Number(metrics.sessions || 0),
          hint: this.t('teacher.sessions_recorded_help'),
        },
        {
          key: 'time',
          icon: 'bi bi-stopwatch',
          label: this.t('teacher.practice_time'),
          value: this.practiceTime,
          hint: this.t('teacher.practice_time_help'),
        },
        {
          key: 'days',
          icon: 'bi bi-calendar-check',
          label: this.t('teacher.active_days'),
          value: Number(metrics.active_days || 0),
          hint: this.t('teacher.active_days_help'),
        },
      ]
      if (this.nowOn) {
        facts.push({
          key: 'saved',
          icon: 'bi bi-bookmark-fill',
          label: this.t('teacher.saved_session'),
          value: this.nowOn,
          hint: this.t('teacher.saved_session_help'),
        })
      }
      if (this.hasScore) {
        facts.push({
          key: 'recite',
          icon: 'bi bi-mic',
          label: this.t('teacher.profile_recite_avg_label'),
          value: this.t('teacher.profile_recite_avg_with_count', {
            score: this.scoreValue,
            count: Number(this.profile.payload?.metrics?.ai_attempts || 0),
          }),
          hint: this.t('teacher.ai_check_average_help'),
        })
      }
      facts.push({
        key: 'last',
        icon: 'bi bi-clock-history',
        label: this.t('teacher.last'),
        value: this.lastSeen || this.t('teacher.no_activity'),
        hint: this.t('teacher.last_activity_help'),
      })
      return facts
    },
    nextAction() {
      if (this.overdueTasks > 0) {
        return { type: 'tab', tab: 'tasks', label: `${this.t('teacher.open')} ${this.t('teacher.nav_assignments')}`, icon: 'bi bi-clock' }
      }
      if (this.revisionOverdue > 0) {
        return { type: 'tab', tab: 'revision', label: `${this.t('teacher.open')} ${this.t('teacher.tab_revision')}`, icon: 'bi bi-arrow-repeat' }
      }
      if (this.hasScore && this.scoreValue < 65) {
        return { type: 'tab', tab: 'ai', label: `${this.t('teacher.open')} ${this.t('teacher.tab_ai')}`, icon: 'bi bi-mic' }
      }
      if (this.weakCount > 0) {
        return { type: 'assign', label: this.t('teacher.assign_revision'), icon: 'bi bi-journal-plus' }
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
