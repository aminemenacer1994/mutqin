<template>
  <section class="teacher-stack teacher-attendance">
    <div class="teacher-attendance__header">
      <div>
        <h2>{{ t('teacher.nav_attendance') }}</h2>
        <p>{{ t('teacher.attendance_tap_hint') }}</p>
      </div>
      <label v-if="groups.length" class="teacher-attendance__group">
        <span>{{ t('teacher.attendance_group') }}</span>
        <select v-model="groupId" class="form-select form-select-sm" @change="load">
          <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
        </select>
      </label>
    </div>

    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
    <p v-if="success" class="alert alert-success" role="status">{{ success }}</p>
    <p v-if="groups.length" class="teacher-attendance__note"><i class="bi bi-person-check" aria-hidden="true"></i> {{ t('teacher.attendance_teacher_recorded_source') }}</p>
    <div v-if="groups.length" class="teacher-attendance__controls">
      <div class="teacher-attendance__weekbar">
        <button type="button" class="btn btn-outline-secondary" :aria-label="t('teacher.attendance_previous_week')" @click="shiftWeek(-7)"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
        <strong>{{ weekLabel }}</strong>
        <button type="button" class="btn btn-outline-secondary" :aria-label="t('teacher.attendance_next_week')" @click="shiftWeek(7)"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
        <button type="button" class="btn btn-link teacher-attendance__today" @click="goToday">{{ t('teacher.attendance_this_week') }}</button>
      </div>
      <div class="teacher-attendance__range" role="group" :aria-label="t('teacher.attendance_days_visible')">
        <button v-for="count in dayCountOptions" :key="count" type="button" :class="{ 'is-active': visibleDayCount === count }" :aria-pressed="visibleDayCount === count ? 'true' : 'false'" @click="visibleDayCount = count">
          <i :class="count === 7 ? 'bi bi-calendar-week' : 'bi bi-calendar-range'" aria-hidden="true"></i>
          <span>{{ count === 7 ? t('teacher.attendance_week') : t('teacher.attendance_days_n', { n: count }) }}</span>
        </button>
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
      <div class="teacher-attendance__scroll teacher-attendance__roster" role="region" :aria-label="t('teacher.attendance_grid')" tabindex="0">
        <table ref="attendanceTable" class="teacher-attendance__table teacher-attendance__table--range" :style="{ '--attendance-days': visibleDays.length }">
          <thead><tr><th scope="col">{{ t('teacher.student') }}</th><th v-for="day in visibleDays" :key="day" scope="col" :class="{ 'is-future': !canMark(day) }"><span>{{ weekday(day) }}</span><strong>{{ dayNumber(day) }}</strong><button type="button" class="teacher-attendance__mark-all" :disabled="!canMark(day) || bulkSavingDay === day" :aria-label="`${t('teacher.attendance_mark_all_present')}: ${formatDay(day)}`" :title="canMark(day) ? t('teacher.attendance_mark_all_present') : t('teacher.attendance_future_disabled')" @click="markAllPresent(day)"><i class="bi bi-check-all" aria-hidden="true"></i></button></th></tr></thead>
          <tbody>
            <tr v-for="(student, studentIndex) in students" :key="student.id">
              <th scope="row">{{ student.name }}</th>
              <td v-for="(day, dayIndex) in visibleDays" :key="day" :class="{ 'is-future': !canMark(day) }">
                <button
                  type="button"
                  class="teacher-attendance__cell"
                  :class="`is-${student.attendance?.[day] || 'unmarked'}`"
                  :disabled="!canMark(day) || saving[`${student.id}:${day}`]"
                  :aria-label="`${student.name}, ${formatDay(day)}: ${t(`teacher.attendance_${student.attendance?.[day] || 'unmarked'}`)}`"
                  :title="canMark(day) ? t(`teacher.attendance_${student.attendance?.[day] || 'unmarked'}`) : t('teacher.attendance_future_disabled')"
                  @click="markStatus(student, day)"
                  @keydown="onCellKeydown($event, studentIndex, dayIndex)"
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
    return { groups: [], groupId: null, weekStart: '', days: [], selectedDay: '', visibleDayCount: 3, students: [], loading: true, error: '', success: '', successTimer: null, saving: {}, requestId: 0, selectedStatus: 'present', bulkSavingDay: '' }
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
    dayCountOptions() {
      return [1, 3, 5, 7]
    },
    visibleDays() {
      if (!this.days.length) return []
      const count = Math.min(this.visibleDayCount, this.days.length)
      const anchor = Math.max(0, this.days.indexOf(this.selectedDay))
      let start = Math.max(0, anchor - count + 1)
      let end = Math.min(this.days.length, start + count)
      start = Math.max(0, end - count)
      return this.days.slice(start, end)
    },
  },
  mounted() { this.load() },
  beforeUnmount() { window.clearTimeout(this.successTimer) },
  methods: {
    localDate(value) { return new Date(`${value}T12:00:00`) },
    dateString(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` },
    formatDay(day) { return formatTeacherWhen(`${day}T12:00:00`) },
    weekday(day) { return this.localDate(day).toLocaleDateString('en-GB', { weekday: 'short' }) },
    dayNumber(day) { return this.localDate(day).getDate() },
    canMark(day) { return day <= this.dateString(new Date()) },
    cellLabel(status) { return status ? this.t(`teacher.attendance_${status}`) : this.t('teacher.attendance_unmarked') },
    statusIcon(status) {
      return {
        present: 'bi bi-check-lg',
        absent: 'bi bi-x-lg',
        late: 'bi bi-clock',
        excused: 'bi bi-shield-check',
      }[status] || 'bi bi-dash'
    },
    attendanceCount(status) {
      return this.students.reduce((total, student) => total + this.visibleDays.filter((day) => student.attendance?.[day] === status).length, 0)
    },
    markStatus(student, day) {
      const current = student.attendance?.[day] || 'clear'
      this.setStatus(student, day, current === this.selectedStatus ? 'clear' : this.selectedStatus)
    },
    async markAllPresent(day) {
      if (!this.canMark(day) || this.bulkSavingDay) return
      this.bulkSavingDay = day
      await Promise.all(this.students.filter((student) => student.attendance?.[day] !== 'present').map((student) => this.setStatus(student, day, 'present')))
      this.bulkSavingDay = ''
      if (!this.error) this.showSuccess(this.t('teacher.attendance_bulk_saved'))
    },
    onCellKeydown(event, rowIndex, columnIndex) {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
      const shortcuts = { p: 'present', a: 'absent', l: 'late', e: 'excused', c: 'clear' }
      const shortcut = shortcuts[String(event.key || '').toLowerCase()]
      if (shortcut) {
        event.preventDefault()
        const student = this.students[rowIndex]
        const day = this.visibleDays[columnIndex]
        if (student && day && this.canMark(day)) this.setStatus(student, day, shortcut)
        return
      }
      if (!keys.includes(event.key)) return
      event.preventDefault()
      let nextRow = rowIndex
      let nextColumn = columnIndex
      if (event.key === 'ArrowLeft') nextColumn--
      if (event.key === 'ArrowRight') nextColumn++
      if (event.key === 'ArrowUp') nextRow--
      if (event.key === 'ArrowDown') nextRow++
      if (event.key === 'Home') nextColumn = 0
      if (event.key === 'End') nextColumn = this.visibleDays.length - 1
      nextRow = Math.max(0, Math.min(this.students.length - 1, nextRow))
      nextColumn = Math.max(0, Math.min(this.visibleDays.length - 1, nextColumn))
      this.$refs.attendanceTable?.querySelectorAll('tbody tr')?.[nextRow]?.querySelectorAll('.teacher-attendance__cell')?.[nextColumn]?.focus()
    },
    selectDefaultDay() {
      if (this.days.includes(this.selectedDay) && this.canMark(this.selectedDay)) return
      const today = this.dateString(new Date())
      if (this.days.includes(today)) {
        this.selectedDay = today
        return
      }
      this.selectedDay = [...this.days].reverse().find((day) => this.canMark(day)) || this.days[0] || ''
    },
    async load() {
      const id = ++this.requestId
      this.loading = true
      this.error = ''
      this.success = ''
      try {
        const payload = await learningApi.getTeacherAttendance({ group_id: this.groupId || undefined, week_start: this.weekStart || undefined })
        if (id !== this.requestId) return
        this.groups = payload.groups || []
        this.groupId = payload.group_id
        this.weekStart = payload.week_start
        this.days = payload.days || []
        this.students = payload.students || []
        this.selectDefaultDay()
      } catch {
        if (id === this.requestId) this.error = this.t('teacher.attendance_load_error')
      } finally {
        if (id === this.requestId) this.loading = false
      }
    },
    shiftWeek(days) { const date = this.localDate(this.weekStart); date.setDate(date.getDate() + days); this.weekStart = this.dateString(date); this.load() },
    goToday() { this.weekStart = ''; this.load() },
    async setStatus(student, day, status) {
      const previous = student.attendance?.[day]
      const savingKey = `${student.id}:${day}`
      this.saving = { ...this.saving, [savingKey]: true }
      this.error = ''
      this.success = ''
      if (status === 'clear') delete student.attendance[day]
      else student.attendance[day] = status
      try {
        const saved = await learningApi.setTeacherAttendance(this.groupId, student.id, day, status)
        if (saved?.source === 'teacher_recorded' && !this.bulkSavingDay) this.showSuccess(this.t('teacher.attendance_saved'))
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
    showSuccess(message) {
      window.clearTimeout(this.successTimer)
      this.success = message
      this.successTimer = window.setTimeout(() => { this.success = '' }, 3000)
    },
  },
}
</script>
