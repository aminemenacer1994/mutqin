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
          <div v-for="fact in progressFacts" :key="fact.key" class="teacher-metric" :class="`is-${fact.key}`">
            <dt><i :class="fact.icon" aria-hidden="true"></i>{{ fact.label }}</dt>
            <dd>
              <strong>{{ fact.value }}</strong>
              <span>{{ fact.hint }}</span>
            </dd>
          </div>
        </dl>

        <div class="teacher-support-actions">
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('change-section', 'tasks')">{{ t('teacher.profile_open_assignments') }}</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('change-section', 'ai')">{{ t('teacher.profile_open_recitations') }}</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('change-section', 'plan')">{{ t('teacher.profile_open_plan') }}</button>
        </div>
      </section>

      <section class="teacher-profile-sheet" :aria-label="t('teacher.profile_plan_title')">
        <header class="teacher-profile-sheet__head">
          <div class="teacher-profile-sheet__copy">
            <strong>{{ t('teacher.profile_plan_title') }}</strong>
            <p v-if="learningPlan">{{ learningPlan.title }}</p>
            <p v-else>{{ t('teacher.profile_plan_empty') }}</p>
          </div>
          <span v-if="learningPlan" class="teacher-fact">{{ planStatus }}</span>
        </header>
        <div class="teacher-support-split">
          <div>
            <h3>{{ t('teacher.profile_upcoming_title') }}</h3>
            <ul v-if="upcoming.length" class="teacher-activity-list">
              <li v-for="row in upcoming" :key="`up-${row.id}`">
                <span class="teacher-activity-list__copy">
                  <strong>{{ row.label }}</strong>
                  <small>{{ taskMeta(row) }}</small>
                </span>
                <span class="teacher-fact" :class="row.overdue ? 'teacher-fact--danger' : 'teacher-fact--neutral'">{{ statusLabel(row.overdue ? 'overdue' : row.status) }}</span>
              </li>
            </ul>
            <p v-else class="mb-0">{{ t('teacher.profile_upcoming_empty') }}</p>
          </div>
          <div>
            <h3>{{ t('teacher.profile_completed_title') }}</h3>
            <ul v-if="completed.length" class="teacher-activity-list">
              <li v-for="row in completed" :key="`done-${row.id}`">
                <span class="teacher-activity-list__copy">
                  <strong>{{ row.label }}</strong>
                  <small>{{ activityLabel(row.activity) }}</small>
                </span>
                <span class="teacher-fact teacher-fact--good">{{ statusLabel(row.status) }}</span>
              </li>
            </ul>
            <p v-else class="mb-0">{{ t('teacher.profile_completed_empty') }}</p>
          </div>
        </div>
      </section>

      <section class="teacher-profile-sheet" :aria-label="t('teacher.profile_practice_title')">
        <header class="teacher-profile-sheet__head">
          <div class="teacher-profile-sheet__copy">
            <strong>{{ t('teacher.profile_practice_title') }}</strong>
          </div>
        </header>
        <div class="teacher-support-split">
          <div>
            <h3>{{ t('teacher.profile_practice_word_match') }}</h3>
            <p>{{ t('teacher.profile_practice_word_match_help') }}</p>
            <ul v-if="practiceAreas.word_match.length" class="teacher-activity-list">
              <li v-for="row in practiceAreas.word_match" :key="`match-${row.id}`">
                <span class="teacher-activity-list__copy">
                  <strong>{{ row.label }}</strong>
                  <small>{{ t('teacher.profile_practice_count', { count: row.count }) }}</small>
                </span>
              </li>
            </ul>
            <p v-else class="mb-0">{{ t('teacher.profile_practice_empty') }}</p>
          </div>
          <div>
            <h3>{{ t('teacher.profile_practice_confirmed') }}</h3>
            <p>{{ t('teacher.profile_practice_confirmed_help') }}</p>
            <ul v-if="practiceAreas.teacher_confirmed.length" class="teacher-activity-list">
              <li v-for="row in practiceAreas.teacher_confirmed" :key="`${row.kind}-${row.id}`">
                <span class="teacher-activity-list__copy">
                  <strong>{{ row.label }}</strong>
                  <small>{{ row.focus ? focusLabel(row.focus) : t('teacher.profile_practice_count', { count: row.count }) }}</small>
                </span>
              </li>
            </ul>
            <p v-else class="mb-0">{{ t('teacher.profile_practice_empty') }}</p>
          </div>
          <div>
            <h3>{{ t('teacher.profile_practice_resolved') }}</h3>
            <ul v-if="practiceAreas.resolved.length" class="teacher-activity-list">
              <li v-for="row in practiceAreas.resolved" :key="`resolved-${row.id}`">
                <span class="teacher-activity-list__copy">
                  <strong>{{ row.label }}</strong>
                </span>
                <span class="teacher-fact teacher-fact--good">{{ t('teacher.profile_practice_resolved') }}</span>
              </li>
            </ul>
            <p v-else class="mb-0">{{ t('teacher.profile_practice_empty') }}</p>
          </div>
        </div>
      </section>

      <section class="teacher-profile-sheet" :aria-label="t('teacher.profile_history_title')">
        <header class="teacher-profile-sheet__head">
          <div class="teacher-profile-sheet__copy">
            <strong>{{ t('teacher.profile_history_title') }}</strong>
            <p>{{ t('teacher.profile_history_help') }}</p>
          </div>
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('change-section', 'ai')">{{ t('teacher.profile_open_recitations') }}</button>
        </header>
        <ul v-if="learningHistory.length" class="teacher-activity-list">
          <li v-for="row in learningHistory" :key="row.id">
            <span class="teacher-activity-list__copy">
              <strong>{{ row.surah_name || row.title }}</strong>
              <small>{{ historyMeta(row) }}</small>
            </span>
          </li>
        </ul>
        <p v-else class="mb-0">{{ t('teacher.coaching_history_empty') }}</p>
      </section>

      <section v-if="reflections.length" class="teacher-profile-sheet" :aria-label="t('teacher.student_reflections')">
        <header class="teacher-profile-sheet__head">
          <div class="teacher-profile-sheet__copy">
            <strong>{{ t('teacher.student_reflections') }}</strong>
            <p>{{ t('teacher.reflection_not_verified') }}</p>
          </div>
        </header>
        <ul class="teacher-activity-list">
          <li v-for="row in reflections" :key="row.id">
            <span class="teacher-activity-list__copy">
              <strong>{{ reflectionFeeling(row.feeling) }}</strong>
              <small>{{ row.help_request || row.surah_name || t('teacher.reflection_not_verified') }}</small>
            </span>
          </li>
        </ul>
      </section>

      <TeacherStudentProfileNotes
        :profile="profile"
        :format-when="formatWhen"
      />

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
import TeacherStudentProfileNotes from './TeacherStudentProfileNotes.vue'

export default {
  name: 'TeacherStudentProfileOverview',
  components: { TeacherSectionPane, TeacherStudentProfileNotes },
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
    learningHistory() {
      return (this.profile.payload?.learning_history || []).slice(0, 8)
    },
    reflections() {
      return this.profile.payload?.self_assessments || []
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
    attendanceHistory() {
      return Array.isArray(this.profile.payload?.attendance) ? this.profile.payload.attendance.slice(0, 8) : []
    },
    teaching() {
      return this.profile.payload?.teaching || {}
    },
    upcoming() {
      return this.teaching.upcoming || []
    },
    completed() {
      return this.teaching.completed || []
    },
    practiceAreas() {
      const areas = this.teaching.practice_areas || {}
      return {
        word_match: areas.word_match || [],
        teacher_confirmed: areas.teacher_confirmed || [],
        resolved: areas.resolved || [],
      }
    },
    learningPlan() {
      return this.profile.meta?.learning_plan || null
    },
    planStatus() {
      const status = this.learningPlan?.status
      if (!status) return ''
      const key = `teacher.plan_status_${status}`
      const label = this.t(key)
      return label && label !== key ? label : status
    },
    progressFacts() {
      const metrics = this.profile.payload?.metrics || {}
      const week = this.profile.payload?.hifz_this_week || {}
      return [
        {
          key: 'memorised',
          icon: 'bi bi-check2-circle',
          label: this.t('teacher.profile_progress_memorised'),
          value: String(Number(metrics.memorised_ayahs || 0)),
          hint: this.t('teacher.profile_progress_memorised_help'),
        },
        {
          key: 'learning',
          icon: 'bi bi-book',
          label: this.t('teacher.profile_progress_learning'),
          value: String(Number(metrics.learning_ayahs || 0)),
          hint: this.t('teacher.profile_progress_learning_help'),
        },
        {
          key: 'week',
          icon: 'bi bi-calendar-week',
          label: this.t('teacher.profile_progress_week'),
          value: String(Number(week.total || 0)),
          hint: this.t('teacher.profile_progress_week_help', {
            sabaq: Number(week.sabaq || 0),
            sabqi: Number(week.sabqi || 0),
            manzil: Number(week.manzil || 0),
          }),
        },
      ]
    },
    nextAction() {
      if (this.recommendation.type === 'focus') {
        return { type: 'tab', tab: 'ai', label: this.t('teacher.profile_open_recitations'), icon: 'bi bi-ear' }
      }
      if (this.recommendation.type === 'needs_help') {
        return { type: 'tab', tab: this.overdueTasks > 0 ? 'tasks' : 'ai', label: this.t('teacher.review_evidence'), icon: 'bi bi-search' }
      }
      if (this.recommendation.type === 'ready_next') {
        return { type: 'assign', label: this.t('teacher.assign_next_passage'), icon: 'bi bi-journal-plus' }
      }
      return null
    },
  },
  methods: {
    historyMeta(row) {
      if (row?.authority === 'ai_word_match') return this.t('dashboard.activity_word_match_not_tajweed')
      if (row?.type === 'self_assessment') return this.t('teacher.reflection_not_verified')
      if (row?.authority === 'teacher') return this.t('dashboard.activity_authority_teacher')
      return row?.outcome || ''
    },
    reflectionFeeling(feeling) {
      const key = {
        easy: 'dashboard.home_reflection_easy',
        manageable: 'dashboard.home_reflection_manageable',
        difficult: 'dashboard.home_reflection_difficult',
      }[feeling]
      return key ? this.t(key) : feeling
    },
    statusLabel(status) {
      if (status === 'present') return this.t('teacher.attendance_present')
      if (status === 'absent') return this.t('teacher.attendance_absent')
      if (status === 'late') return this.t('teacher.attendance_late')
      if (status === 'excused') return this.t('teacher.attendance_excused')
      const key = `teacher.status_${status}`
      const label = this.t(key)
      return label && label !== key ? label : status
    },
    activityLabel(activity) {
      const key = `teacher.activity_${activity}`
      const label = this.t(key)
      return label && label !== key ? label : activity
    },
    focusLabel(focus) {
      const key = `teacher.focus_${focus}`
      const label = this.t(key)
      return label && label !== key ? label : focus
    },
    taskMeta(row) {
      const activity = this.activityLabel(row.activity)
      return row.due_on ? `${activity} · ${row.due_on}` : activity
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
