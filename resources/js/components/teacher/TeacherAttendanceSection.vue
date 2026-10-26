<template>
  <section class="teacher-stack teacher-attendance">
    <div class="teacher-attendance__header">
      <div>
        <h2>{{ t('teacher.nav_attendance') }}</h2>
        <p>{{ t('teacher.attendance_tap_hint') }}</p>
      </div>
      <label v-if="groups.length" class="teacher-attendance__group">
        <span>{{ t('teacher.attendance_group') }}</span>
        <select class="form-select" :value="groupId || ''" @change="changeGroup($event.target.value)">
          <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
        </select>
      </label>
    </div>

    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
    <div v-if="groups.length" class="teacher-attendance__controls">
      <div class="teacher-attendance__weekbar">
        <button type="button" class="btn btn-outline-secondary" :aria-label="t('teacher.attendance_previous_week')" @click="shiftWeek(-7)"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
        <strong>{{ weekLabel }}</strong>
        <button type="button" class="btn btn-outline-secondary" :aria-label="t('teacher.attendance_next_week')" @click="shiftWeek(7)"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
        <button type="button" class="btn btn-link teacher-attendance__today" @click="goToday">{{ t('teacher.attendance_this_week') }}</button>
      </div>
      <div class="teacher-attendance__status-picker" role="toolbar" :aria-label="t('teacher.attendance_mark_as')">
        <button
          v-for="option in statusTools"
          :key="option.value"
          type="button"
          :class="[`is-${option.value}`, { 'is-active': selectedStatus === option.value }]"
          :aria-pressed="selectedStatus === option.value ? 'true' : 'false'"
          @click="selectedStatus = option.value"
        >
          <i :class="option.icon" aria-hidden="true"></i>
          <span>{{ option.label }}</span>
          <strong v-if="option.value !== 'clear'">{{ attendanceCount(option.value) }}</strong>
        </button>
      </div>
    </div>

    <p v-if="loading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
    <div v-else-if="!groups.length" class="teacher-attendance__empty">{{ t('teacher.attendance_no_group') }}</div>
    <div v-else-if="!students.length" class="teacher-attendance__empty">{{ t('teacher.attendance_no_students') }}</div>
    <template v-else>
      <div class="teacher-attendance__scroll" role="region" :aria-label="t('teacher.attendance_grid')" tabindex="0">
        <table class="teacher-attendance__table">
          <thead><tr><th scope="col">{{ t('teacher.student') }}</th><th v-for="day in days" :key="day" scope="col"><span>{{ weekday(day) }}</span><strong>{{ dayNumber(day) }}</strong></th></tr></thead>
          <tbody>
            <tr v-for="student in students" :key="student.id">
              <th scope="row">{{ student.name }}</th>
              <td v-for="day in days" :key="day">
                <button
                  type="button"
                  class="teacher-attendance__cell"
                  :class="`is-${student.attendance?.[day] || 'unmarked'}`"
                  :disabled="!canMark(day) || saving[`${student.id}:${day}`]"
                  :aria-label="`${student.name}, ${formatDay(day)}: ${t(`teacher.attendance_${student.attendance?.[day] || 'unmarked'}`)}`"
                  :title="t(`teacher.attendance_${student.attendance?.[day] || 'unmarked'}`)"
                  @click="markStatus(student, day)"
                >
                  <i :class="statusIcon(student.attendance?.[day])" aria-hidden="true"></i>
                  <span class="visually-hidden">{{ cellLabel(student.attendance?.[day]) }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { formatTeacherWhen } from '../../scripts/teacher/formatters'

export default {
  name: 'TeacherAttendanceSection',
  mixins: [i18nMixin],
  data() {
    return { groups: [], groupId: null, weekStart: '', days: [], students: [], loading: true, error: '', saving: {}, requestId: 0, selectedStatus: 'present' }
  },
  computed: {
    weekLabel() {
      if (!this.days.length) return ''
      return `${this.formatDay(this.days[0])} – ${this.formatDay(this.days[6])}`
    },
    statusTools() {
      return [
        { value: 'present', icon: 'bi bi-check-lg', label: this.t('teacher.attendance_present') },
        { value: 'absent', icon: 'bi bi-x-lg', label: this.t('teacher.attendance_absent') },
        { value: 'late', icon: 'bi bi-clock', label: this.t('teacher.attendance_late') },
        { value: 'excused', icon: 'bi bi-shield-check', label: this.t('teacher.attendance_excused') },
        { value: 'clear', icon: 'bi bi-eraser', label: this.t('teacher.attendance_clear') },
      ]
    },
  },
  mounted() { this.load() },
  methods: {
    localDate(value) { return new Date(`${value}T12:00:00`) },
    dateString(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` },
    formatDay(day) { return formatTeacherWhen(`${day}T12:00:00`) },
    weekday(day) { return this.localDate(day).toLocaleDateString('en-GB', { weekday: 'short' }) },
    dayNumber(day) { return this.localDate(day).getDate() },
    canMark(day) { return day <= this.dateString(new Date()) },
    cellLabel(status) { return status ? this.t(`teacher.attendance_${status}`) : this.t('teacher.attendance_unmarked_short') },
    statusIcon(status) {
      return {
        present: 'bi bi-check-lg',
        absent: 'bi bi-x-lg',
        late: 'bi bi-clock',
        excused: 'bi bi-shield-check',
      }[status] || 'bi bi-dash'
    },
    attendanceCount(status) {
      return this.students.reduce((total, student) => total + this.days.filter((day) => student.attendance?.[day] === status).length, 0)
    },
    markStatus(student, day) {
      const current = student.attendance?.[day] || 'clear'
      this.setStatus(student, day, current === this.selectedStatus ? 'clear' : this.selectedStatus)
    },
    async load() {
      const id = ++this.requestId
      this.loading = true
      this.error = ''
      try {
        const payload = await learningApi.getTeacherAttendance({ group_id: this.groupId || undefined, week_start: this.weekStart || undefined })
        if (id !== this.requestId) return
        this.groups = payload.groups || []
        this.groupId = payload.group_id
        this.weekStart = payload.week_start
        this.days = payload.days || []
        this.students = payload.students || []
      } catch {
        if (id === this.requestId) this.error = this.t('teacher.attendance_load_error')
      } finally {
        if (id === this.requestId) this.loading = false
      }
    },
    changeGroup(value) { this.groupId = Number(value); this.load() },
    shiftWeek(days) { const date = this.localDate(this.weekStart); date.setDate(date.getDate() + days); this.weekStart = this.dateString(date); this.load() },
    goToday() { this.weekStart = ''; this.load() },
    async setStatus(student, day, status) {
      const previous = student.attendance?.[day]
      const savingKey = `${student.id}:${day}`
      this.saving = { ...this.saving, [savingKey]: true }
      this.error = ''
      if (status === 'clear') delete student.attendance[day]
      else student.attendance[day] = status
      try {
        await learningApi.setTeacherAttendance(this.groupId, student.id, day, status)
      } catch {
        if (previous) student.attendance[day] = previous
        else delete student.attendance[day]
        this.error = this.t('teacher.attendance_save_error')
      } finally {
        const next = { ...this.saving }
        delete next[savingKey]
        this.saving = next
      }
    },
  },
}
</script>
