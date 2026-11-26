<template>
  <div class="teacher-stack teacher-profile-attendance">
    <section class="teacher-profile-sheet" :aria-label="t('teacher.nav_attendance')">
      <header class="teacher-profile-sheet__head">
        <div class="teacher-profile-sheet__copy">
          <strong>{{ t('teacher.attendance_summary') }}</strong>
          <p>{{ t('teacher.profile_overview_attendance_help') }}</p>
        </div>
        <span v-if="summary.rate_percent !== null && summary.rate_percent !== undefined" class="teacher-fact teacher-fact--good">
          {{ t('teacher.attendance_rate_percent', { rate: summary.rate_percent }) }}
        </span>
      </header>
      <dl v-if="summary.total" class="teacher-metric-grid teacher-metric-grid--compact">
        <div v-for="chip in countChips" :key="chip.id" class="teacher-metric" :class="`is-${chip.id}`">
          <dt>{{ chip.label }}</dt>
          <dd><strong>{{ chip.value }}</strong></dd>
        </div>
      </dl>
      <p v-else class="mb-0">{{ t('teacher.attendance_not_marked') }}</p>
    </section>

    <section v-if="filteredHistory.length" class="teacher-profile-sheet" :aria-label="t('teacher.attendance_recent')">
      <header class="teacher-profile-sheet__head">
        <div class="teacher-profile-sheet__copy">
          <strong>{{ t('teacher.attendance_recent') }}</strong>
        </div>
        <label class="teacher-attendance__student-filter">
          <span class="visually-hidden">{{ t('teacher.attendance_status') }}</span>
          <select v-model="statusFilter" class="form-select form-select-sm">
            <option value="">{{ t('teacher.task_filter_all') }}</option>
            <option value="present">{{ t('teacher.attendance_present') }}</option>
            <option value="absent">{{ t('teacher.attendance_absent') }}</option>
            <option value="late">{{ t('teacher.attendance_late') }}</option>
            <option value="excused">{{ t('teacher.attendance_excused') }}</option>
          </select>
        </label>
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
            <tr v-for="row in filteredHistory" :key="`${row.date}-${row.status}-${row.group}`" :class="`is-${row.status}`">
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
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'

export default {
  name: 'TeacherStudentProfileAttendance',
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    formatWhen: { type: Function, required: true },
  },
  data() {
    return {
      statusFilter: '',
    }
  },
  computed: {
    summary() {
      return this.profile.payload?.attendance_summary || { counts: {}, total: 0, rate_percent: null }
    },
    history() {
      return Array.isArray(this.profile.payload?.attendance) ? this.profile.payload.attendance : []
    },
    filteredHistory() {
      if (!this.statusFilter) return this.history
      return this.history.filter((row) => row.status === this.statusFilter)
    },
    countChips() {
      const counts = this.summary.counts || {}
      return [
        { id: 'present', label: this.t('teacher.attendance_present'), value: counts.present || 0 },
        { id: 'absent', label: this.t('teacher.attendance_absent'), value: counts.absent || 0 },
        { id: 'late', label: this.t('teacher.attendance_late'), value: counts.late || 0 },
        { id: 'excused', label: this.t('teacher.attendance_excused'), value: counts.excused || 0 },
      ]
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
  },
}
</script>