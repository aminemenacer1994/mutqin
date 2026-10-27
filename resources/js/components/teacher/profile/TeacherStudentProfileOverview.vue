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
    recommendation() {
      return this.profile.payload?.metrics?.recommendation || { type: 'insufficient_data', reason: this.t('teacher.recommendation_insufficient') }
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
    repeatedAbsence() {
      return this.profile.payload?.metrics?.repeated_absence === true
    },
    activeRecently() {
      return this.profile.payload?.metrics?.active_7 === true
    },
    priorityLabel() {
      if (this.recommendation.type === 'ready_next') return this.t('teacher.ready_next_passage')
      if (this.recommendation.type === 'focus') return this.t('teacher.recommendation_focus')
      if (this.recommendation.type === 'needs_help') return this.t('teacher.stage_help')
      return this.t('teacher.recommendation_insufficient_title')
    },
    priorityDetail() {
      return this.recommendation.reason || this.t('teacher.recommendation_insufficient')
    },
    priorityIcon() {
      if (this.recommendation.type === 'focus') return 'bi bi-bullseye'
      if (this.recommendation.type === 'needs_help') return 'bi bi-exclamation-circle'
      if (this.recommendation.type === 'insufficient_data') return 'bi bi-info-circle'
      return this.stageMeta.icon
    },
    attendanceSummary() {
      const rows = this.profile.payload?.attendance || []
      if (!rows.length) {
        return {
          value: this.t('teacher.attendance_not_marked'),
          hint: this.t('teacher.attendance_summary_empty'),
        }
      }
      const present = rows.filter((row) => row.status === 'present').length
      const absent = rows.filter((row) => row.status === 'absent').length
      const late = rows.filter((row) => row.status === 'late').length
      return {
        value: this.t('teacher.attendance_present_of_n', { present, total: rows.length }),
        hint: this.t('teacher.attendance_absent_late', { absent, late }),
      }
    },
    summaryFacts() {
      const metrics = this.profile.payload?.metrics || {}
      return [
        {
          key: 'practice',
          icon: 'bi bi-play-circle',
          label: this.t('teacher.practice_summary'),
          value: this.t('teacher.practice_sessions_time', { sessions: Number(metrics.sessions || 0), time: this.practiceTime }),
          hint: this.lastSeen ? this.t('teacher.profile_last_seen', { when: this.lastSeen }) : this.t('teacher.no_activity'),
        },
        {
          key: 'recite',
          icon: 'bi bi-soundwave',
          label: this.t('teacher.profile_recite_avg_label'),
          value: this.hasScore
            ? this.t('teacher.profile_recite_avg_with_count', { score: this.scoreValue, count: Number(metrics.ai_attempts || 0) })
            : this.t('teacher.no_scored_checks'),
          hint: this.t('teacher.ai_check_average_help'),
        },
        {
          key: 'attendance',
          icon: 'bi bi-calendar-check',
          label: this.t('teacher.nav_attendance'),
          value: this.attendanceSummary.value,
          hint: this.attendanceSummary.hint,
        },
        {
          key: 'saved',
          icon: 'bi bi-bookmark-fill',
          label: this.t('teacher.saved_session'),
          value: this.nowOn || this.t('teacher.no_saved_passage'),
          hint: this.t('teacher.active_days_n', { n: Number(metrics.active_days || 0) }),
        },
      ]
    },
    nextAction() {
      if (this.recommendation.type === 'focus') {
        return { type: 'tab', tab: 'focus', label: `${this.t('teacher.open')} ${this.t('teacher.tab_focus')}`, icon: 'bi bi-bullseye' }
      }
      if (this.recommendation.type === 'needs_help') {
        return { type: 'tab', tab: this.overdueTasks > 0 ? 'tasks' : 'focus', label: this.t('teacher.review_evidence'), icon: 'bi bi-search' }
      }
      if (this.recommendation.type === 'ready_next') {
        return { type: 'assign', label: this.t('teacher.assign_next_passage'), icon: 'bi bi-journal-plus' }
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
