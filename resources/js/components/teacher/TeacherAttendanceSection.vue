<template>
  <section class="teacher-stack teacher-attendance">
    <div class="teacher-attendance__header">
      <div>
        <h2>{{ t('teacher.nav_attendance') }}</h2>
        <p>{{ t('teacher.attendance_schedule_lead') }}</p>
      </div>
      <div class="teacher-attendance__filters">
        <label v-if="groups.length > 1" class="teacher-attendance__group">
          <span>{{ t('teacher.attendance_group') }}</span>
          <select v-model="groupId" class="form-select form-select-sm" @change="load">
            <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </label>
        <label v-if="students.length" class="teacher-attendance__student-filter">
          <span>{{ t('teacher.attendance_filter_student') }}</span>
          <input
            v-model.trim="studentQuery"
            type="search"
            class="form-control form-control-sm"
            :placeholder="t('teacher.attendance_filter_student_placeholder')"
            autocomplete="off"
          >
        </label>
      </div>
    </div>

    <form v-if="groupId && !loading" class="teacher-attendance__schedule" @submit.prevent="scheduleLesson">
      <div class="teacher-attendance__schedule-copy">
        <h3>{{ t('teacher.attendance_schedule_title') }}</h3>
        <p>{{ t('teacher.attendance_schedule_hint') }}</p>
      </div>
      <label>
        <span>{{ t('teacher.attendance_schedule_date') }}</span>
        <input v-model="lessonDate" type="date" class="form-control form-control-sm" required>
      </label>
      <label>
        <span>{{ t('teacher.attendance_schedule_name') }}</span>
        <input v-model.trim="lessonTitle" type="text" class="form-control form-control-sm" maxlength="120" :placeholder="t('teacher.attendance_schedule_name_placeholder')">
      </label>
      <button type="submit" class="btn btn-primary btn-sm" :disabled="scheduleSaving || !lessonDate">
        {{ t('teacher.attendance_schedule_action') }}
      </button>
      <p v-if="scheduleError" class="teacher-attendance__schedule-error" role="alert">{{ scheduleError }}</p>
      <p v-else-if="scheduleSaved" class="teacher-attendance__schedule-saved" role="status">{{ t('teacher.attendance_schedule_saved') }}</p>
    </form>

    <ul v-if="lessons.length && !loading" class="teacher-attendance__lessons">
      <li v-for="lesson in lessons" :key="lesson.id">
        <button type="button" :class="{ 'is-active': lesson.date === focusDay }" @click="openLesson(lesson)">
          <strong>{{ lesson.title || t('teacher.attendance_lesson_untitled') }}</strong>
          <span>{{ formatDay(lesson.date) }}</span>
        </button>
      </li>
    </ul>

    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>

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
              'is-lesson': lessonDates.has(cell.date),
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

        <p v-if="panelError" class="alert alert-danger teacher-attendance__panel-error" role="alert">{{ panelError }}</p>

        <div class="teacher-attendance__roster">
          <header class="teacher-attendance__roster-head">
            <div>
              <strong>{{ formatDay(focusDay) }}</strong>
              <span v-if="!canMark(focusDay)">{{ t('teacher.attendance_future_disabled') }}</span>
              <span v-else>{{ t('teacher.attendance_register_hint') }}</span>
            </div>
            <button
              type="button"
              class="teacher-attendance__mark-all-day"
              :disabled="!canMark(focusDay) || markAllSaving || !visibleStudents.length"
              @click="markAllPresent"
            >
              <i class="bi bi-check2-all" aria-hidden="true"></i>
              {{ t('teacher.attendance_mark_all_present') }}
            </button>
          </header>

          <p v-if="!visibleStudents.length" class="teacher-attendance__filter-empty">{{ t('teacher.attendance_filter_empty') }}</p>
          <table v-else class="teacher-attendance__table teacher-attendance__table--day">
            <thead>
              <tr>
                <th scope="col">{{ t('teacher.col_name') }}</th>
                <th scope="col">{{ t('teacher.attendance_summary') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in visibleStudents" :key="student.id" class="teacher-attendance__row" :class="{ 'is-selected': noteDrafts[student.id] !== undefined }">
                <th scope="row">
                  <span>{{ student.name }}</span>
                  <button
                    type="button"
                    class="teacher-attendance__note-toggle"
                    :class="{ 'has-note': Boolean(rowNote(student)) }"
                    :aria-expanded="noteDrafts[student.id] !== undefined ? 'true' : 'false'"
                    :aria-label="t('teacher.attendance_notes')"
                    :disabled="!canMark(focusDay) || rowStatus(student) === 'unmarked'"
                    @click="toggleNoteEditor(student)"
                  >
                    <i class="bi bi-sticky" aria-hidden="true"></i>
                  </button>
                </th>
                <td>
                  <div class="teacher-attendance__status-picker" role="group" :aria-label="`${t('teacher.attendance_mark_as')}: ${student.name}`">
                    <button
                      v-for="option in statusOptions"
                      :key="option.id"
                      type="button"
                      :class="[option.className, { 'is-active': isStatusActive(student, option.id) }]"
                      :disabled="!canMark(focusDay) || isRowSaving(student.id)"
                      :aria-pressed="isStatusActive(student, option.id) ? 'true' : 'false'"
                      @click="setStudentStatus(student, option.id)"
                    >
                      <i :class="option.icon" aria-hidden="true"></i>
                      <span>{{ t(option.label) }}</span>
                    </button>
                  </div>
                  <div v-if="noteDrafts[student.id] !== undefined" class="teacher-attendance__note-editor">
                    <label class="visually-hidden" :for="`attendance-note-${student.id}`">{{ t('teacher.attendance_notes') }}</label>
                    <textarea
                      :id="`attendance-note-${student.id}`"
                      v-model="noteDrafts[student.id]"
                      class="form-control form-control-sm"
                      rows="2"
                      maxlength="500"
                      :placeholder="t('teacher.attendance_notes_placeholder')"
                      :disabled="isRowSaving(student.id)"
                    ></textarea>
                    <div class="teacher-attendance__note-actions">
                      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="isRowSaving(student.id)" @click="cancelNoteEditor(student)">{{ t('common.cancel') }}</button>
                      <button type="button" class="btn btn-sm btn-primary" :disabled="isRowSaving(student.id)" @click="saveNote(student)">{{ t('teacher.attendance_notes_save') }}</button>
                    </div>
                  </div>
                  <p v-else-if="rowNote(student)" class="teacher-attendance__note-preview">{{ rowNote(student) }}</p>
                  <span v-if="rowErrors[student.id]" class="teacher-attendance__row-error" role="alert">{{ rowErrors[student.id] }}</span>
                </td>
              </tr>
            </tbody>
          </table>
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
      lessons: [],
      lessonDate: '',
      lessonTitle: '',
      scheduleSaving: false,
      scheduleError: '',
      scheduleSaved: false,
      studentQuery: '',
      loading: true,
      error: '',
      panelError: '',
      requestId: 0,
      markAllSaving: false,
      savingRows: {},
      rowErrors: {},
      noteDrafts: {},
      statusOptions: [
        { id: 'present', label: 'teacher.attendance_present', className: 'is-present', icon: 'bi bi-check-circle' },
        { id: 'absent', label: 'teacher.attendance_absent', className: 'is-absent', icon: 'bi bi-x-circle' },
        { id: 'late', label: 'teacher.attendance_late', className: 'is-late', icon: 'bi bi-clock' },
        { id: 'excused', label: 'teacher.attendance_excused', className: 'is-excused', icon: 'bi bi-info-circle' },
        { id: 'clear', label: 'teacher.attendance_clear', className: 'is-clear', icon: 'bi bi-eraser' },
      ],
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
    lessonDates() {
      return new Set(this.lessons.map((lesson) => lesson.date))
    },
    visibleStudents() {
      const query = this.studentQuery.trim().toLowerCase()
      if (!query) return this.students
      return this.students.filter((student) => String(student.name || '').toLowerCase().includes(query))
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
    dayCounts() {
      const counts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 }
      if (!this.focusDay) return counts
      for (const student of this.visibleStudents) {
        const status = student.attendance?.[this.focusDay] || 'unmarked'
        if (counts[status] !== undefined) counts[status] += 1
        else counts.unmarked += 1
      }
      return counts
    },
  },
  mounted() {
    this.calendarMonth = this.today.slice(0, 7)
    this.lessonDate = this.today
    this.load()
  },
  watch: {
    focusDay() {
      this.panelError = ''
      this.rowErrors = {}
      this.noteDrafts = {}
    },
  },
  methods: {
    monthAnchor() {
      const value = this.calendarMonth || this.focusDay || this.today
      return `${value.slice(0, 7)}-01`
    },
    localDate(value) { return new Date(`${value}T12:00:00`) },
    dateString(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` },
    formatDay(day) { return formatTeacherWhen(`${day}T12:00:00`) },
    canMark(day) { return day <= this.today },
    rowNote(student) {
      return student.notes?.[this.focusDay] || ''
    },
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
      try {
        const month = this.calendarMonth || this.today.slice(0, 7)
        const payload = await learningApi.getTeacherAttendance({ group_id: this.groupId || undefined, month })
        if (id !== this.requestId) return
        this.groups = payload.groups || []
        this.groupId = payload.group_id
        this.days = payload.days || []
        this.lessons = payload.lessons || []
        this.students = (payload.students || []).map((student) => ({
          ...student,
          notes: student.notes || {},
        }))
        this.selectDefaultDay()
      } catch {
        if (id === this.requestId) this.error = this.t('teacher.attendance_load_error')
      } finally {
        if (id === this.requestId) this.loading = false
      }
    },
    openLesson(lesson) {
      if (!lesson?.date) return
      this.calendarMonth = lesson.date.slice(0, 7)
      this.focusDay = lesson.date
      if (!this.days.includes(lesson.date)) this.load()
    },
    async scheduleLesson() {
      if (!this.groupId || !this.lessonDate || this.scheduleSaving) return
      this.scheduleSaving = true
      this.scheduleError = ''
      this.scheduleSaved = false
      try {
        await learningApi.scheduleTeacherLesson(this.groupId, this.lessonDate, this.lessonTitle)
        this.scheduleSaved = true
        this.lessonTitle = ''
        const scheduled = this.lessonDate
        if (scheduled.slice(0, 7) !== (this.calendarMonth || '').slice(0, 7)) {
          this.calendarMonth = scheduled.slice(0, 7)
        }
        await this.load()
        if (this.canMark(scheduled)) this.focusDay = scheduled
      } catch {
        this.scheduleError = this.t('teacher.attendance_schedule_error')
      } finally {
        this.scheduleSaving = false
      }
    },
    goToday() {
      this.calendarMonth = this.today.slice(0, 7)
      this.focusDay = this.today
      this.load()
    },
    rowStatus(student) {
      return student.attendance?.[this.focusDay] || 'unmarked'
    },
    isStatusActive(student, status) {
      const current = this.rowStatus(student)
      if (status === 'clear') return current === 'unmarked'
      return current === status
    },
    isRowSaving(studentId) {
      return Boolean(this.savingRows[studentId])
    },
    applyLocalStatus(student, status) {
      if (!student.attendance) student.attendance = {}
      if (!student.notes) student.notes = {}
      if (status === 'clear') {
        delete student.attendance[this.focusDay]
        delete student.notes[this.focusDay]
      } else {
        student.attendance[this.focusDay] = status
      }
    },
    revertLocalStatus(student, previous, previousNote) {
      if (!student.attendance) student.attendance = {}
      if (!student.notes) student.notes = {}
      if (!previous || previous === 'unmarked') delete student.attendance[this.focusDay]
      else student.attendance[this.focusDay] = previous
      if (!previousNote) delete student.notes[this.focusDay]
      else student.notes[this.focusDay] = previousNote
    },
    toggleNoteEditor(student) {
      if (this.noteDrafts[student.id] !== undefined) {
        this.cancelNoteEditor(student)
        return
      }
      this.noteDrafts = { ...this.noteDrafts, [student.id]: this.rowNote(student) }
    },
    cancelNoteEditor(student) {
      const next = { ...this.noteDrafts }
      delete next[student.id]
      this.noteDrafts = next
    },
    async saveNote(student) {
      const status = this.rowStatus(student)
      if (status === 'unmarked') return
      const notes = String(this.noteDrafts[student.id] ?? '')
      await this.persistStatus(student, status, notes)
      this.cancelNoteEditor(student)
    },
    async setStudentStatus(student, status) {
      if (!this.groupId || !this.focusDay || !this.canMark(this.focusDay)) return
      const previous = this.rowStatus(student)
      if (status !== 'clear' && previous === status) return
      if (status === 'clear' && previous === 'unmarked') return
      await this.persistStatus(student, status)
      if (status === 'clear') this.cancelNoteEditor(student)
    },
    async persistStatus(student, status, notes) {
      const previous = this.rowStatus(student)
      const previousNote = this.rowNote(student)
      this.panelError = ''
      this.rowErrors = { ...this.rowErrors, [student.id]: '' }
      this.savingRows = { ...this.savingRows, [student.id]: true }
      this.applyLocalStatus(student, status)
      if (notes !== undefined && status !== 'clear') {
        if (!student.notes) student.notes = {}
        const trimmed = String(notes).trim()
        if (trimmed) student.notes[this.focusDay] = trimmed
        else delete student.notes[this.focusDay]
      }
      try {
        const saved = await learningApi.setTeacherAttendance(
          this.groupId,
          student.id,
          this.focusDay,
          status,
          notes !== undefined ? notes : undefined,
        )
        if (!student.notes) student.notes = {}
        if (status === 'clear') delete student.notes[this.focusDay]
        else if (saved?.notes) student.notes[this.focusDay] = saved.notes
        else if (notes !== undefined && !String(notes).trim()) delete student.notes[this.focusDay]
      } catch {
        this.revertLocalStatus(student, previous, previousNote)
        this.rowErrors = { ...this.rowErrors, [student.id]: this.t('teacher.action_failed') }
      } finally {
        const next = { ...this.savingRows }
        delete next[student.id]
        this.savingRows = next
      }
    },
    async markAllPresent() {
      if (!this.groupId || !this.focusDay || !this.canMark(this.focusDay) || this.markAllSaving) return
      this.panelError = ''
      this.markAllSaving = true
      const snapshots = this.visibleStudents.map((student) => ({
        student,
        previous: this.rowStatus(student),
        previousNote: this.rowNote(student),
      }))
      for (const entry of snapshots) this.applyLocalStatus(entry.student, 'present')
      try {
        await Promise.all(snapshots.map((entry) => learningApi.setTeacherAttendance(this.groupId, entry.student.id, this.focusDay, 'present')))
      } catch {
        for (const entry of snapshots) this.revertLocalStatus(entry.student, entry.previous, entry.previousNote)
        this.panelError = this.t('teacher.action_failed')
      } finally {
        this.markAllSaving = false
      }
    },
  },
}
</script>
