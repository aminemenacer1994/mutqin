<template>
  <section class="teacher-stack teacher-attendance">
    <div class="teacher-attendance__header">
      <div>
        <h2>{{ t('teacher.nav_attendance') }}</h2>
        <p>{{ t('teacher.attendance_register_hint') }}</p>
      </div>
      <label v-if="groups.length > 1" class="teacher-attendance__group">
        <span>{{ t('teacher.attendance_group') }}</span>
        <select v-model="groupId" class="form-select form-select-sm" @change="load">
          <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
        </select>
      </label>
    </div>

    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
    <p v-if="success" class="alert alert-success" role="status">{{ success }}</p>

    <p v-if="loading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
    <div v-else-if="!groups.length" class="teacher-attendance__empty">{{ t('teacher.attendance_no_group') }}</div>
    <div v-else-if="!students.length" class="teacher-attendance__empty">{{ t('teacher.attendance_no_students') }}</div>
    <div v-else class="teacher-attendance__shell card">
      <div class="teacher-attendance__calendar" role="application" :aria-label="t('teacher.attendance_calendar')">
        <div class="teacher-attendance__calendar-head">
          <button type="button" class="btn btn-outline-secondary btn-sm" :aria-label="t('teacher.attendance_previous_month')" @click="shiftCalendarMonth(-1)"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
          <div class="teacher-attendance__calendar-title">
            <strong>{{ calendarMonthLabel }}</strong>
            <button type="button" class="btn btn-link btn-sm teacher-attendance__today" @click="goToday">{{ t('teacher.attendance_today') }}</button>
          </div>
          <button type="button" class="btn btn-outline-secondary btn-sm" :aria-label="t('teacher.attendance_next_month')" @click="shiftCalendarMonth(1)"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
        </div>
        <div class="teacher-attendance__calendar-weekdays" aria-hidden="true">
          <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
        </div>
        <div class="teacher-attendance__calendar-grid">
          <button
            v-for="cell in calendarCells"
            :key="cell.date"
            type="button"
            class="teacher-attendance__calendar-day"
            :class="{
              'is-active': cell.date === focusDay,
              'is-today': cell.date === today,
              'is-outside': !cell.inMonth,
              'is-future': !canMark(cell.date),
              [`has-${cell.summary}`]: Boolean(cell.summary),
            }"
            :disabled="!cell.inMonth || !canMark(cell.date)"
            :aria-label="formatDay(cell.date)"
            :aria-pressed="cell.date === focusDay ? 'true' : 'false'"
            @click="pickCalendarDay(cell.date)"
          >
            <strong>{{ cell.day }}</strong>
            <span v-if="cell.marked" class="teacher-attendance__calendar-dot" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      <div v-if="focusDay" class="teacher-attendance__panel">
        <header class="teacher-attendance__panel-head">
          <h3>{{ formatDay(focusDay) }}</h3>
          <div class="teacher-attendance__chips" role="status">
            <span class="is-present">{{ dayCounts.present }} {{ t('teacher.attendance_present') }}</span>
            <span class="is-absent">{{ dayCounts.absent }} {{ t('teacher.attendance_absent') }}</span>
            <span class="is-late">{{ dayCounts.late }} {{ t('teacher.attendance_late') }}</span>
            <span class="is-excused">{{ dayCounts.excused }} {{ t('teacher.attendance_excused') }}</span>
            <span class="is-unmarked">{{ dayCounts.unmarked }} {{ t('teacher.attendance_unmarked') }}</span>
          </div>
        </header>
        <div class="teacher-attendance__list" role="list" :aria-label="t('teacher.attendance_grid')">
          <article v-for="student in students" :key="student.id" class="teacher-attendance__row" role="listitem" :class="`is-${student.attendance?.[focusDay] || 'unmarked'}`">
            <span class="teacher-attendance__row-name">{{ student.name }}</span>
            <div class="teacher-attendance__row-actions" role="group" :aria-label="student.name">
              <button
                v-for="option in dayStatusOptions"
                :key="option.value"
                type="button"
                class="teacher-attendance__day-btn"
                :class="[`is-${option.value}`, { 'is-selected': student.attendance?.[focusDay] === option.value }]"
                :disabled="!canMark(focusDay) || saving[`${student.id}:${focusDay}`]"
                :aria-label="option.label"
                :title="option.label"
                @click="setStatus(student, focusDay, student.attendance?.[focusDay] === option.value ? 'clear' : option.value)"
              >
                <i :class="option.icon" aria-hidden="true"></i>
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
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
    return {
      groups: [],
      groupId: null,
      days: [],
      focusDay: '',
      calendarMonth: '',
      students: [],
      loading: true,
      error: '',
      success: '',
      successTimer: null,
      saving: {},
      requestId: 0,
    }
  },
  computed: {
    today() {
      return this.dateString(new Date())
    },
    calendarMonthLabel() {
      const anchor = this.monthAnchor()
      return this.localDate(anchor).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    },
    weekdayLabels() {
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(Date.UTC(2024, 0, 1 + index))
        return date.toLocaleDateString('en-GB', { weekday: 'short' })
      })
    },
    calendarCells() {
      const anchor = this.monthAnchor()
      const monthDate = this.localDate(anchor)
      const year = monthDate.getFullYear()
      const month = monthDate.getMonth()
      const first = new Date(year, month, 1)
      const startOffset = (first.getDay() + 6) % 7
      const gridStart = new Date(year, month, 1 - startOffset)
      const cells = []
      for (let index = 0; index < 42; index++) {
        const date = new Date(gridStart)
        date.setDate(gridStart.getDate() + index)
        const dateKey = this.dateString(date)
        const summary = this.daySummary(dateKey)
        cells.push({
          date: dateKey,
          day: date.getDate(),
          inMonth: date.getMonth() === month,
          marked: summary.marked,
          summary: summary.tone,
        })
      }
      return cells
    },
    dayStatusOptions() {
      return [
        { value: 'present', icon: 'bi bi-check-lg', label: this.t('teacher.attendance_present') },
        { value: 'absent', icon: 'bi bi-x-lg', label: this.t('teacher.attendance_absent') },
        { value: 'late', icon: 'bi bi-clock', label: this.t('teacher.attendance_late') },
        { value: 'excused', icon: 'bi bi-shield-check', label: this.t('teacher.attendance_excused') },
      ]
    },
    dayCounts() {
      const counts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 }
      if (!this.focusDay) return counts
      for (const student of this.students) {
        const status = student.attendance?.[this.focusDay] || 'unmarked'
        if (counts[status] !== undefined) counts[status] += 1
        else counts.unmarked += 1
      }
      return counts
    },
  },
  mounted() {
    this.calendarMonth = this.today.slice(0, 7)
    this.load()
  },
  beforeUnmount() { window.clearTimeout(this.successTimer) },
  methods: {
    monthAnchor() {
      const value = this.calendarMonth || this.focusDay || this.today
      return `${value.slice(0, 7)}-01`
    },
    localDate(value) { return new Date(`${value}T12:00:00`) },
    dateString(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` },
    formatDay(day) { return formatTeacherWhen(`${day}T12:00:00`) },
    canMark(day) { return day <= this.today },
    daySummary(day) {
      if (!this.days.includes(day) || !this.students.length) return { marked: false, tone: '' }
      let present = 0
      let absent = 0
      let late = 0
      let excused = 0
      for (const student of this.students) {
        const status = student.attendance?.[day]
        if (status === 'present') present++
        else if (status === 'absent') absent++
        else if (status === 'late') late++
        else if (status === 'excused') excused++
      }
      const marked = present + absent + late + excused > 0
      const tone = absent > present ? 'absent' : late > 0 ? 'late' : present > 0 ? 'present' : excused > 0 ? 'excused' : ''
      return { marked, tone }
    },
    pickCalendarDay(day) {
      if (!day || !this.canMark(day)) return
      this.focusDay = day
      if (day.slice(0, 7) !== (this.calendarMonth || this.today.slice(0, 7))) {
        this.calendarMonth = day.slice(0, 7)
        this.load()
      }
    },
    shiftCalendarMonth(step) {
      const anchor = this.monthAnchor()
      const date = this.localDate(anchor)
      date.setMonth(date.getMonth() + step, 1)
      this.calendarMonth = date.toISOString().slice(0, 7)
      this.load()
    },
    selectDefaultDay() {
      const today = this.today
      if (this.days.includes(today)) {
        this.focusDay = today
        return
      }
      this.focusDay = [...this.days].reverse().find((day) => this.canMark(day)) || this.days[0] || ''
    },
    async load() {
      const id = ++this.requestId
      this.loading = true
      this.error = ''
      this.success = ''
      try {
        const month = this.calendarMonth || this.today.slice(0, 7)
        const payload = await learningApi.getTeacherAttendance({ group_id: this.groupId || undefined, month })
        if (id !== this.requestId) return
        this.groups = payload.groups || []
        this.groupId = payload.group_id
        this.days = payload.days || []
        this.students = payload.students || []
        this.selectDefaultDay()
      } catch {
        if (id === this.requestId) this.error = this.t('teacher.attendance_load_error')
      } finally {
        if (id === this.requestId) this.loading = false
      }
    },
    goToday() {
      this.calendarMonth = this.today.slice(0, 7)
      this.focusDay = this.today
      this.load()
    },
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
        if (saved?.source === 'teacher_recorded') this.showSuccess(this.t('teacher.attendance_saved'))
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
