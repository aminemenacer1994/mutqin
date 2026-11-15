<template>
  <TeacherSectionPane tone="neutral" flat>
    <div class="teacher-profile-overview">
      <section class="teacher-profile-sheet" :aria-label="t('teacher.tab_overview')">
        <header class="teacher-profile-sheet__head">
          <div class="teacher-profile-sheet__copy">
            <span class="teacher-profile-overview__eyebrow">{{ t('teacher.teaching_focus') }}</span>
            <strong>{{ priorityLabel }}</strong>
            <p>{{ priorityDetail }}</p>
          </div>
          <button
            v-if="nextAction"
            type="button"
            class="btn btn-primary btn-sm teacher-profile-sheet__action"
            @click="runNextAction"
          >
            <i :class="nextAction.icon" aria-hidden="true"></i>
            {{ nextAction.label }}
          </button>
        </header>

        <dl class="teacher-metric-grid">
          <div v-for="fact in summaryFacts" :key="fact.key" class="teacher-metric" :class="`is-${fact.key}`">
            <dt><i :class="fact.icon" aria-hidden="true"></i>{{ fact.label }}</dt>
            <dd>
              <strong :class="{ 'teacher-quran': fact.quran }">{{ fact.value }}</strong>
              <span>{{ fact.hint }}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section v-if="attendanceHistory.length" class="teacher-profile-sheet" :aria-label="t('teacher.attendance_recent')">
        <header class="teacher-profile-sheet__head">
          <div class="teacher-profile-sheet__copy">
            <strong>{{ t('teacher.attendance_recent') }}</strong>
            <p>{{ t('teacher.attendance_teacher_recorded_short') }}</p>
          </div>
        </header>
        <div class="table-responsive">
          <table class="table align-middle mb-0 teacher-profile-table">
            <thead>
              <tr>
                <th scope="col">{{ t('teacher.col_status') }}</th>
                <th scope="col">{{ t('teacher.col_active') }}</th>
                <th scope="col">{{ t('teacher.group') }}</th>
                <th scope="col">{{ t('teacher.private_notes_body') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in attendanceHistory" :key="`${row.date}-${row.status}-${row.group}`" :class="`is-${row.status}`">
                <th scope="row"><span class="teacher-status-pill" :class="`is-${row.status}`">{{ statusLabel(row.status) }}</span></th>
                <td>{{ formatWhen(`${row.date}T12:00:00`) }}</td>
                <td>{{ row.group || '—' }}</td>
                <td>{{ row.notes || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
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
    recommendation() {
      return this.profile.payload?.metrics?.recommendation || { type: 'insufficient_data', reason: this.t('teacher.recommendation_insufficient') }
    },
    nowOn() {
      const saved = this.profile.payload?.latest_saved
      return saved ? this.sessionLabel(saved) : ''
    },
    scoreValue() {
      return this.profile.payload?.metrics?.ai_success_rate
    },
    hasScore() {
      return typeof this.scoreValue === 'number'
    },
    overdueTasks() {
      return Number(this.profile.payload?.metrics?.assignments?.overdue || 0)
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
      return 'bi bi-check-circle'
    },
    attendanceHistory() {
      return Array.isArray(this.profile.payload?.attendance) ? this.profile.payload.attendance.slice(0, 8) : []
    },
    attendanceSummary() {
      const summary = this.profile.payload?.attendance_summary || {}
      const rows = this.attendanceHistory
      const rate = summary.rate_percent
      const total = Number(summary.total || rows.length || 0)
      if (!total && !rows.length) {
        return {
          value: this.t('teacher.attendance_not_marked'),
          hint: this.t('teacher.attendance_summary_empty'),
        }
      }
      const counts = summary.counts || {}
      const present = Number(counts.present ?? rows.filter((row) => row.status === 'present').length)
      const absent = Number(counts.absent ?? rows.filter((row) => row.status === 'absent').length)
      const late = Number(counts.late ?? rows.filter((row) => row.status === 'late').length)
      return {
        value: rate == null
          ? this.t('teacher.attendance_present_of_n', { present, total })
          : this.t('teacher.attendance_rate_percent', { rate }),
        hint: `${this.t('teacher.attendance_absent_late', { absent, late })} · ${this.t('teacher.attendance_teacher_recorded_short')}`,
      }
    },
    summaryFacts() {
      const metrics = this.profile.payload?.metrics || {}
      return [
        {
          key: 'recite',
          icon: 'bi bi-soundwave',
          label: this.t('teacher.profile_recite_avg_label'),
          value: this.hasScore
            ? this.t('teacher.profile_recite_avg_with_count', { score: this.scoreValue, count: Number(metrics.ai_attempts || 0) })
            : this.t('teacher.no_scored_checks'),
          hint: this.t('teacher.profile_overview_recite_help'),
        },
        {
          key: 'attendance',
          icon: 'bi bi-calendar-check',
          label: this.t('teacher.nav_attendance'),
          value: this.attendanceSummary.value,
          hint: this.t('teacher.profile_overview_attendance_help'),
        },
        {
          key: 'saved',
          icon: 'bi bi-bookmark-fill',
          label: this.t('teacher.saved_session'),
          value: this.nowOn || this.t('teacher.no_saved_passage'),
          hint: this.t('teacher.profile_overview_saved_help'),
        },
      ]
    },
    nextAction() {
      if (this.recommendation.type === 'focus') {
        return { type: 'tab', tab: 'practice', label: `${this.t('teacher.open')} ${this.t('teacher.tab_learning')}`, icon: 'bi bi-bullseye' }
      }
      if (this.recommendation.type === 'needs_help') {
        return { type: 'tab', tab: this.overdueTasks > 0 ? 'tasks' : 'practice', label: this.t('teacher.review_evidence'), icon: 'bi bi-search' }
      }
      if (this.recommendation.type === 'ready_next') {
        return { type: 'assign', label: this.t('teacher.assign_next_passage'), icon: 'bi bi-journal-plus' }
      }
      return null
    },
  },
  methods: {
    statusLabel(status) {
      if (status === 'present') return this.t('teacher.attendance_present')
      if (status === 'absent') return this.t('teacher.attendance_absent')
      if (status === 'late') return this.t('teacher.attendance_late')
      if (status === 'excused') return this.t('teacher.attendance_excused')
      return status
    },
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
