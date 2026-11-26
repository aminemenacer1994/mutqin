<template>
  <section class="teacher-stack teacher-attendance teacher-attendance--workspace">
    <header class="teacher-attendance__page-head">
      <div class="teacher-page-header">
        <h1 class="teacher-page-header__title">{{ t('teacher.nav_attendance') }}</h1>
        <p class="teacher-page-header__hint">{{ t('teacher.attendance_intro') }}</p>
      </div>
      <div class="teacher-attendance__page-actions">
        <div class="teacher-attendance__range" role="tablist" :aria-label="t('teacher.attendance_status')">
          <button
            type="button"
            role="tab"
            :class="{ 'is-active': panelMode === 'register' }"
            :aria-selected="panelMode === 'register' ? 'true' : 'false'"
            @click="panelMode = 'register'"
          >
            <i class="bi bi-clipboard-check" aria-hidden="true"></i>
            <span>{{ t('teacher.attendance_day_view') }}</span>
          </button>
          <button
            type="button"
            role="tab"
            :class="{ 'is-active': panelMode === 'history' }"
            :aria-selected="panelMode === 'history' ? 'true' : 'false'"
            @click="panelMode = 'history'"
          >
            <i class="bi bi-clock-history" aria-hidden="true"></i>
            <span>{{ t('teacher.attendance_recent') }}</span>
          </button>
        </div>
        <button
          v-if="groupId"
          type="button"
          class="btn btn-primary btn-sm"
          @click="openSchedule"
        >
          <i class="bi bi-calendar-plus" aria-hidden="true"></i>
          {{ t('teacher.attendance_schedule_action') }}
        </button>
      </div>
    </header>

    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
    <p v-if="loading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>

    <div v-else-if="!groups.length" class="teacher-attendance__empty">
      <p>{{ t('teacher.attendance_no_group') }}</p>
    </div>
    <div v-else-if="!students.length" class="teacher-attendance__empty">
      <p>{{ t('teacher.attendance_no_students') }}</p>
    </div>

    <template v-else>
      <div class="teacher-attendance__toolbar">
        <label v-if="groups.length > 1" class="teacher-attendance__field">
          <span class="teacher-attendance__field-label">{{ t('teacher.attendance_group') }}</span>
          <select v-model="groupId" class="form-select form-select-sm" @change="load">
            <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
          </select>
        </label>
        <label v-if="lessonsOnFocusDay.length > 1" class="teacher-attendance__field">
          <span class="teacher-attendance__field-label">{{ t('teacher.attendance_schedule_name') }}</span>
          <select v-model="selectedLessonId" class="form-select form-select-sm">
            <option v-for="lesson in lessonsOnFocusDay" :key="lesson.id" :value="lesson.id">
              {{ lesson.title || t('teacher.attendance_lesson_untitled') }}
            </option>
          </select>
        </label>
        <p v-else-if="lessonsOnFocusDay.length === 1" class="teacher-attendance__lesson-pill" role="status">
          <i class="bi bi-bookmark" aria-hidden="true"></i>
          {{ lessonsOnFocusDay[0].title || t('teacher.attendance_lesson_untitled') }}
        </p>
      </div>

      <div v-if="panelMode === 'register'" class="teacher-attendance__controls">
        <div class="teacher-attendance__weekbar">
          <button type="button" class="btn btn-outline-secondary btn-sm" :aria-label="t('teacher.attendance_previous_week')" @click="shiftWeek(-1)">
            <i class="bi bi-chevron-left" aria-hidden="true"></i>
          </button>
          <strong>{{ weekLabel }}</strong>
          <button type="button" class="btn btn-outline-secondary btn-sm" :aria-label="t('teacher.attendance_next_week')" @click="shiftWeek(1)">
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
          <button type="button" class="btn btn-link btn-sm teacher-attendance__today" @click="goToday">{{ t('teacher.attendance_today') }}</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" :aria-label="t('teacher.attendance_calendar')" @click="monthOpen = true">
            <i class="bi bi-calendar3" aria-hidden="true"></i>
          </button>
        </div>
        <div class="teacher-attendance__day-strip" role="group" :aria-label="t('teacher.attendance_week_days')">
          <button
            v-for="day in weekDays"
            :key="day.date"
            type="button"
            :class="{
              'is-active': day.date === focusDay,
              'is-today': day.date === today,
              'is-future': !canMark(day.date),
              'has-lesson': lessonDates.has(day.date),
              'has-marks': day.marked,
            }"
            :disabled="!canMark(day.date)"
            :aria-pressed="day.date === focusDay ? 'true' : 'false'"
            @click="pickDay(day.date)"
          >
            <span>{{ day.weekday }}</span>
            <strong>{{ day.dayNum }}</strong>
          </button>
        </div>
      </div>

      <div
        v-if="panelMode === 'history'"
        class="teacher-attendance__toolbar teacher-attendance__toolbar--history"
      >
        <label class="teacher-attendance__field">
          <span class="teacher-attendance__field-label">{{ t('teacher.attendance_schedule_date') }}</span>
          <input v-model="historyFrom" type="date" class="form-control form-control-sm">
        </label>
        <label class="teacher-attendance__field">
          <span class="teacher-attendance__field-label">{{ t('teacher.attendance_history_to') }}</span>
          <input v-model="historyTo" type="date" class="form-control form-control-sm">
        </label>
        <label class="teacher-attendance__field">
          <span class="teacher-attendance__field-label">{{ t('teacher.attendance_filter_student') }}</span>
          <input
            v-model.trim="historyStudentQuery"
            type="search"
            class="form-control form-control-sm"
            :placeholder="t('teacher.attendance_filter_student_placeholder')"
            autocomplete="off"
          >
        </label>
        <label class="teacher-attendance__field">
          <span class="teacher-attendance__field-label">{{ t('teacher.attendance_status') }}</span>
          <select v-model="historyStatus" class="form-select form-select-sm">
            <option value="">{{ t('teacher.task_filter_all') }}</option>
            <option v-for="option in registerStatusOptions" :key="option.id" :value="option.id">{{ t(option.label) }}</option>
          </select>
        </label>
        <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="!filteredHistoryRows.length" @click="exportCsv">
          <i class="bi bi-download" aria-hidden="true"></i>
          {{ t('teacher.attendance_export_csv') }}
        </button>
      </div>

      <div v-if="panelMode === 'register' && focusDay" class="teacher-attendance__metrics" role="status">
        <div class="teacher-attendance__metric" v-for="chip in metricChips" :key="chip.id">
          <strong :class="chip.className">{{ chip.value }}</strong>
          <span>{{ chip.label }}</span>
        </div>
        <div class="teacher-attendance__completion">
          <span>{{ t('teacher.attendance_register_completion', { marked: rosterCounts.marked, total: rosterCounts.total }) }}</span>
          <div class="teacher-attendance__progress" :aria-valuenow="rosterCounts.marked" :aria-valuemax="rosterCounts.total" role="progressbar">
            <i :style="{ width: `${completionPercent}%` }"></i>
          </div>
        </div>
      </div>

      <p v-if="panelError" class="alert alert-danger teacher-attendance__panel-error" role="alert">{{ panelError }}</p>

      <div v-if="panelMode === 'register' && focusDay" class="teacher-attendance__register">
        <div class="teacher-attendance__register-toolbar">
          <label class="teacher-attendance__field teacher-attendance__field--grow">
            <span class="visually-hidden">{{ t('teacher.attendance_filter_student') }}</span>
            <input
              v-model.trim="studentQuery"
              type="search"
              class="form-control form-control-sm"
              :placeholder="t('teacher.attendance_filter_student_placeholder')"
              autocomplete="off"
            >
          </label>
          <label class="teacher-attendance__field">
            <span class="visually-hidden">{{ t('teacher.attendance_status') }}</span>
            <select v-model="registerStatusFilter" class="form-select form-select-sm">
              <option value="">{{ t('teacher.task_filter_all') }}</option>
              <option value="unmarked">{{ t('teacher.attendance_unmarked') }}</option>
              <option v-for="option in registerStatusOptions" :key="option.id" :value="option.id">{{ t(option.label) }}</option>
            </select>
          </label>
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            :disabled="!canMark(focusDay) || markAllSaving || !registerRows.length"
            :title="markAllScopeLabel"
            @click="markAllPresent"
          >
            <i class="bi bi-check2-all" aria-hidden="true"></i>
            {{ t('teacher.attendance_mark_all_present') }}
          </button>
        </div>

        <p v-if="!registerRows.length" class="teacher-attendance__filter-empty">{{ t('teacher.attendance_filter_empty') }}</p>
        <div v-else class="teacher-attendance__scroll">
          <table class="teacher-attendance__table teacher-attendance__table--register">
            <colgroup>
              <col class="teacher-attendance__col-name">
              <col class="teacher-attendance__col-status">
              <col class="teacher-attendance__col-notes">
            </colgroup>
            <thead>
              <tr>
                <th scope="col">{{ t('teacher.col_name') }}</th>
                <th scope="col">{{ t('teacher.attendance_status') }}</th>
                <th scope="col">{{ t('teacher.attendance_notes') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="student in pagedRegisterRows"
                :key="student.id"
                class="teacher-attendance__row"
                :class="`is-${rowStatus(student)}`"
              >
                <th scope="row">
                  <span class="teacher-attendance__student">
                    <span class="teacher-attendance__avatar" aria-hidden="true">{{ studentInitial(student.name) }}</span>
                    <span class="teacher-attendance__student-name">{{ student.name }}</span>
                    <span v-if="isRowSaving(student.id)" class="teacher-attendance__saving" role="status">{{ t('teacher.loading') }}</span>
                  </span>
                </th>
                <td>
                  <div class="teacher-attendance__segmented" role="group" :aria-label="`${t('teacher.attendance_mark_as')}: ${student.name}`">
                    <button
                      v-for="option in registerStatusOptions"
                      :key="option.id"
                      type="button"
                      :class="[option.className, { 'is-active': rowStatus(student) === option.id }]"
                      :disabled="!canMark(focusDay) || isRowSaving(student.id)"
                      :aria-pressed="rowStatus(student) === option.id ? 'true' : 'false'"
                      @click="setStudentStatus(student, option.id)"
                    >
                      <span class="teacher-attendance__segmented-text">{{ t(option.label) }}</span>
                    </button>
                  </div>
                  <span v-if="rowErrors[student.id]" class="teacher-attendance__row-error" role="alert">{{ rowErrors[student.id] }}</span>
                </td>
                <td class="teacher-attendance__notes-col">
                  <button
                    type="button"
                    class="teacher-attendance__note-toggle"
                    :class="{ 'has-note': Boolean(rowNote(student)) }"
                    :aria-label="t('teacher.attendance_notes')"
                    :disabled="!canMark(focusDay) || rowStatus(student) === 'unmarked'"
                    @click="openNote(student)"
                  >
                    <i class="bi bi-sticky" aria-hidden="true"></i>
                    <span v-if="rowNote(student)" class="teacher-attendance__note-preview">{{ rowNote(student) }}</span>
                    <span v-else class="teacher-attendance__note-preview is-muted">{{ t('teacher.attendance_notes_placeholder') }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <TeacherPagination
          :current-page="registerPage"
          :page-count="registerPageCount"
          :total="registerRows.length"
          :loading="loading"
          summary-mode="rows"
          root-class="teacher-attendance__pagination"
          @page="registerPage = $event"
        />
      </div>

      <div v-else-if="panelMode === 'history'" class="teacher-attendance__history">
        <p v-if="periodSummary.total" class="teacher-attendance__period-summary" role="status">
          {{ t('teacher.attendance_period_summary', periodSummary) }}
        </p>
        <p v-if="!filteredHistoryRows.length" class="teacher-attendance__empty">{{ t('teacher.attendance_not_marked') }}</p>
        <div v-else class="teacher-attendance__scroll">
          <table class="teacher-attendance__table teacher-attendance__table--history">
            <thead>
              <tr>
                <th scope="col">{{ t('teacher.col_name') }}</th>
                <th scope="col">{{ t('teacher.col_active') }}</th>
                <th scope="col">{{ t('teacher.col_status') }}</th>
                <th scope="col">{{ t('teacher.attendance_notes') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pagedHistoryRows" :key="`${row.studentId}-${row.date}`" :class="`is-${row.status}`">
                <th scope="row">{{ row.studentName }}</th>
                <td>{{ formatDay(row.date) }}</td>
                <td><span class="teacher-status-pill" :class="`is-${row.status}`">{{ statusLabel(row.status) }}</span></td>
                <td>{{ row.notes || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <TeacherPagination
          :current-page="historyPage"
          :page-count="historyPageCount"
          :total="filteredHistoryRows.length"
          :loading="loading"
          summary-mode="rows"
          root-class="teacher-attendance__pagination"
          @page="historyPage = $event"
        />
      </div>
    </template>

    <TeacherDialog
      :open="scheduleOpen"
      size="sm"
      :title="t('teacher.attendance_schedule_title')"
      :close-label="t('teacher.close')"
      @close="closeSchedule"
    >
      <form class="teacher-attendance__schedule-form" @submit.prevent="scheduleLesson">
        <label>
          <span>{{ t('teacher.attendance_schedule_date') }}</span>
          <input v-model="lessonDate" type="date" class="form-control" required>
        </label>
        <label>
          <span>{{ t('teacher.attendance_schedule_name') }}</span>
          <input
            v-model.trim="lessonTitle"
            type="text"
            class="form-control"
            maxlength="120"
            :placeholder="t('teacher.attendance_schedule_name_placeholder')"
          >
        </label>
        <p v-if="scheduleError" class="text-danger small mb-0" role="alert">{{ scheduleError }}</p>
      </form>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="closeSchedule">{{ t('common.cancel') }}</button>
        <button type="button" class="btn btn-primary btn-sm" :disabled="scheduleSaving || !lessonDate" @click="scheduleLesson">
          {{ t('teacher.attendance_schedule_action') }}
        </button>
      </template>
    </TeacherDialog>

    <TeacherDialog
      :open="Boolean(noteStudent)"
      size="sm"
      compact
      :title="noteStudent ? noteStudent.name : ''"
      :close-label="t('teacher.close')"
      @close="closeNote"
    >
      <label class="d-grid gap-1">
        <span>{{ t('teacher.attendance_notes') }}</span>
        <textarea
          v-model="noteDraft"
          class="form-control"
          rows="4"
          maxlength="500"
          :placeholder="t('teacher.attendance_notes_placeholder')"
          :disabled="noteStudent && isRowSaving(noteStudent.id)"
        ></textarea>
      </label>
      <p v-if="noteStudent && rowErrors[noteStudent.id]" class="text-danger small mb-0" role="alert">{{ rowErrors[noteStudent.id] }}</p>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="noteStudent && isRowSaving(noteStudent.id)" @click="closeNote">{{ t('common.cancel') }}</button>
        <button type="button" class="btn btn-primary btn-sm" :disabled="!noteStudent || isRowSaving(noteStudent.id)" @click="saveNoteDialog">{{ t('teacher.attendance_notes_save') }}</button>
      </template>
    </TeacherDialog>

    <TeacherDialog
      :open="monthOpen"
      size="sm"
      compact
      :title="calendarMonthLabel"
      :close-label="t('teacher.close')"
      @close="monthOpen = false"
    >
      <div class="teacher-attendance__month-grid" role="application" :aria-label="t('teacher.attendance_calendar')">
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
            @click="pickCalendarDay(cell.date)"
          >
            <strong>{{ cell.day }}</strong>
          </button>
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="shiftCalendarMonth(-1)">
          <i class="bi bi-chevron-left" aria-hidden="true"></i>
          {{ t('teacher.attendance_previous_month') }}
        </button>
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="shiftCalendarMonth(1)">
          {{ t('teacher.attendance_next_month') }}
          <i class="bi bi-chevron-right" aria-hidden="true"></i>
        </button>
      </template>
    </TeacherDialog>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { formatTeacherWhen, studentInitial } from '../../scripts/teacher/formatters'
import TeacherDialog from './TeacherDialog.vue'
import TeacherPagination from './TeacherPagination.vue'
import { tablePageCount, tablePageSlice } from '../../scripts/teacher/tablePagination.js'

const ATTENDANCE_TABLE_PAGE_SIZE = 20

export default {
  name: 'TeacherAttendanceSection',
  components: { TeacherDialog, TeacherPagination },
  mixins: [i18nMixin],
  data() {
    return {
      groups: [],
      groupId: null,
      periodSummary: { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate_percent: null },
      panelMode: 'register',
      historyStatus: '',
      historyFrom: '',
      historyTo: '',
      historyStudentQuery: '',
      registerStatusFilter: '',
      days: [],
      focusDay: '',
      calendarMonth: '',
      students: [],
      lessons: [],
      selectedLessonId: null,
      lessonDate: '',
      lessonTitle: '',
      scheduleOpen: false,
      scheduleSaving: false,
      scheduleError: '',
      monthOpen: false,
      studentQuery: '',
      loading: true,
      error: '',
      panelError: '',
      requestId: 0,
      markAllSaving: false,
      savingRows: {},
      rowErrors: {},
      noteStudent: null,
      noteDraft: '',
      registerStatusOptions: [
        { id: 'present', label: 'teacher.attendance_present', className: 'is-present' },
        { id: 'absent', label: 'teacher.attendance_absent', className: 'is-absent' },
        { id: 'late', label: 'teacher.attendance_late', className: 'is-late' },
        { id: 'excused', label: 'teacher.attendance_excused', className: 'is-excused' },
      ],
      registerPage: 1,
      historyPage: 1,
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
    lessonsOnFocusDay() {
      if (!this.focusDay) return []
      return this.lessons.filter((lesson) => lesson.date === this.focusDay)
    },
    weekLabel() {
      const days = this.weekDays
      if (!days.length) return ''
      return `${this.formatDay(days[0].date)} – ${this.formatDay(days[days.length - 1].date)}`
    },
    weekDays() {
      const start = this.localDate(this.weekStartDate())
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start)
        date.setDate(start.getDate() + index)
        const dateKey = this.dateString(date)
        const summary = this.daySummary(dateKey)
        return {
          date: dateKey,
          weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }),
          dayNum: date.getDate(),
          marked: summary.marked,
        }
      })
    },
    registerRows() {
      const query = this.studentQuery.trim().toLowerCase()
      const status = this.registerStatusFilter
      return this.students.filter((student) => {
        const nameOk = !query || String(student.name || '').toLowerCase().includes(query)
        const row = this.rowStatus(student)
        if (!status) return nameOk
        if (status === 'unmarked') return nameOk && row === 'unmarked'
        return nameOk && row === status
      })
    },
    rosterCounts() {
      const counts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0, marked: 0, total: this.students.length }
      if (!this.focusDay) return counts
      for (const student of this.students) {
        const status = student.attendance?.[this.focusDay] || 'unmarked'
        if (counts[status] !== undefined) counts[status] += 1
        else counts.unmarked += 1
      }
      counts.marked = counts.present + counts.absent + counts.late + counts.excused
      return counts
    },
    completionPercent() {
      if (!this.rosterCounts.total) return 0
      return Math.round((this.rosterCounts.marked / this.rosterCounts.total) * 100)
    },
    metricChips() {
      const c = this.rosterCounts
      return [
        { id: 'total', value: c.total, label: this.t('teacher.kpi_students'), className: '' },
        { id: 'present', value: c.present, label: this.t('teacher.attendance_present'), className: 'is-present' },
        { id: 'absent', value: c.absent, label: this.t('teacher.attendance_absent'), className: 'is-absent' },
        { id: 'late', value: c.late, label: this.t('teacher.attendance_late'), className: 'is-late' },
        { id: 'excused', value: c.excused, label: this.t('teacher.attendance_excused'), className: 'is-excused' },
        { id: 'unmarked', value: c.unmarked, label: this.t('teacher.attendance_unmarked'), className: 'is-muted' },
      ]
    },
    markAllScopeLabel() {
      if (this.studentQuery.trim() || this.registerStatusFilter) {
        return this.t('teacher.attendance_mark_filtered_hint')
      }
      return ''
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
    historyRows() {
      const rows = []
      for (const student of this.students) {
        const attendance = student.attendance || {}
        const notes = student.notes || {}
        for (const date of this.days) {
          const status = attendance[date]
          if (!status) continue
          rows.push({
            studentId: student.id,
            studentName: student.name,
            date,
            status,
            notes: notes[date] || '',
          })
        }
      }
      return rows.sort((a, b) => b.date.localeCompare(a.date) || String(a.studentName).localeCompare(String(b.studentName)))
    },
    filteredHistoryRows() {
      const q = this.historyStudentQuery.trim().toLowerCase()
      const from = this.historyFrom
      const to = this.historyTo
      return this.historyRows.filter((row) => {
        if (this.historyStatus && row.status !== this.historyStatus) return false
        if (from && row.date < from) return false
        if (to && row.date > to) return false
        if (q && !String(row.studentName || '').toLowerCase().includes(q)) return false
        return true
      })
    },
    registerPageCount() {
      return tablePageCount(this.registerRows.length, ATTENDANCE_TABLE_PAGE_SIZE)
    },
    pagedRegisterRows() {
      return tablePageSlice(this.registerRows, this.registerPage, ATTENDANCE_TABLE_PAGE_SIZE)
    },
    historyPageCount() {
      return tablePageCount(this.filteredHistoryRows.length, ATTENDANCE_TABLE_PAGE_SIZE)
    },
    pagedHistoryRows() {
      return tablePageSlice(this.filteredHistoryRows, this.historyPage, ATTENDANCE_TABLE_PAGE_SIZE)
    },
  },
  watch: {
    focusDay() {
      this.registerPage = 1
      this.panelError = ''
      this.rowErrors = {}
      this.noteStudent = null
      this.noteDraft = ''
      const dayLessons = this.lessonsOnFocusDay
      this.selectedLessonId = dayLessons[0]?.id || null
    },
    lessonsOnFocusDay: {
      immediate: true,
      handler(rows) {
        if (!rows.find((row) => row.id === this.selectedLessonId)) {
          this.selectedLessonId = rows[0]?.id || null
        }
      },
    },
    studentQuery() { this.registerPage = 1 },
    registerStatusFilter() { this.registerPage = 1 },
    historyStudentQuery() { this.historyPage = 1 },
    historyStatus() { this.historyPage = 1 },
    historyFrom() { this.historyPage = 1 },
    historyTo() { this.historyPage = 1 },
  },
  mounted() {
    this.calendarMonth = this.today.slice(0, 7)
    this.lessonDate = this.today
    this.historyFrom = `${this.today.slice(0, 7)}-01`
    this.historyTo = this.today
    this.load()
  },
  methods: {
    studentInitial,
    statusLabel(status) {
      if (status === 'present') return this.t('teacher.attendance_present')
      if (status === 'absent') return this.t('teacher.attendance_absent')
      if (status === 'late') return this.t('teacher.attendance_late')
      if (status === 'excused') return this.t('teacher.attendance_excused')
      return status
    },
    weekStartDate() {
      const anchor = this.focusDay || this.today
      const date = this.localDate(anchor)
      const offset = (date.getDay() + 6) % 7
      date.setDate(date.getDate() - offset)
      return this.dateString(date)
    },
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
      if (!this.students.length) return { marked: false, tone: '' }
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
    pickDay(day) {
      if (!day || !this.canMark(day)) return
      this.focusDay = day
      if (day.slice(0, 7) !== (this.calendarMonth || '')) {
        this.calendarMonth = day.slice(0, 7)
        this.load()
      }
    },
    pickCalendarDay(day) {
      this.pickDay(day)
      this.monthOpen = false
    },
    shiftWeek(step) {
      const anchor = this.localDate(this.focusDay || this.today)
      anchor.setDate(anchor.getDate() + step * 7)
      const next = this.dateString(anchor)
      if (next.slice(0, 7) !== (this.calendarMonth || '')) {
        this.calendarMonth = next.slice(0, 7)
        this.load().then(() => { this.focusDay = next })
        return
      }
      this.focusDay = next
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
      if (this.days.includes(today) || today.slice(0, 7) === this.calendarMonth) {
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
        this.periodSummary = payload.summary || this.periodSummary
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
    openSchedule() {
      this.lessonDate = this.focusDay || this.today
      this.scheduleError = ''
      this.scheduleOpen = true
    },
    closeSchedule() {
      this.scheduleOpen = false
      this.scheduleError = ''
    },
    async scheduleLesson() {
      if (!this.groupId || !this.lessonDate || this.scheduleSaving) return
      this.scheduleSaving = true
      this.scheduleError = ''
      try {
        await learningApi.scheduleTeacherLesson(this.groupId, this.lessonDate, this.lessonTitle)
        this.lessonTitle = ''
        this.scheduleOpen = false
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
    openNote(student) {
      if (this.rowStatus(student) === 'unmarked') return
      this.noteStudent = student
      this.noteDraft = this.rowNote(student)
    },
    closeNote() {
      this.noteStudent = null
      this.noteDraft = ''
    },
    async saveNoteDialog() {
      if (!this.noteStudent) return
      await this.persistStatus(this.noteStudent, this.rowStatus(this.noteStudent), this.noteDraft)
      this.closeNote()
    },
    async setStudentStatus(student, status) {
      if (!this.groupId || !this.focusDay || !this.canMark(this.focusDay)) return
      const previous = this.rowStatus(student)
      if (previous === status) {
        await this.persistStatus(student, 'clear')
        return
      }
      await this.persistStatus(student, status)
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
      const snapshots = this.registerRows.map((student) => ({
        student,
        previous: this.rowStatus(student),
        previousNote: this.rowNote(student),
      }))
      const targets = snapshots.filter((entry) => entry.previous !== 'present')
      for (const entry of targets) this.applyLocalStatus(entry.student, 'present')
      try {
        if (targets.length) {
          await learningApi.bulkTeacherAttendance(
            this.groupId,
            this.focusDay,
            'present',
            targets.map((entry) => entry.student.id),
          )
        }
      } catch {
        for (const entry of targets) this.revertLocalStatus(entry.student, entry.previous, entry.previousNote)
        this.panelError = this.t('teacher.action_failed')
      } finally {
        this.markAllSaving = false
      }
    },
    exportCsv() {
      const rows = this.filteredHistoryRows
      if (!rows.length) return
      const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
      const lines = [
        ['Student', 'Date', 'Status', 'Note'].map(escape).join(','),
        ...rows.map((row) => [row.studentName, row.date, row.status, row.notes].map(escape).join(',')),
      ]
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `attendance-${this.calendarMonth || this.today.slice(0, 7)}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    },
  },
}
</script>