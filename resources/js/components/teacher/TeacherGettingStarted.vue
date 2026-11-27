<template>
  <section
    v-if="visible && mobileShell"
    class="teacher-getting-started teacher-pane teacher-getting-started--mobile"
    :aria-label="t('teacher.getting_started_title')"
  >
    <header class="teacher-pane__head teacher-getting-started__head">
      <div>
        <h3 class="teacher-pane__title">{{ t('teacher.getting_started_title') }}</h3>
        <p class="teacher-pane__hint">{{ t('teacher.getting_started_hint') }}</p>
      </div>
      <button type="button" class="btn btn-link btn-sm" @click="dismiss">{{ t('teacher.getting_started_dismiss') }}</button>
    </header>
    <ol class="teacher-getting-started__list">
      <li v-for="step in steps" :key="step.id" :class="{ 'is-done': step.done }">
        <span class="teacher-getting-started__mark" aria-hidden="true">
          <i :class="step.done ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i>
        </span>
        <span class="teacher-getting-started__copy">
          <strong>{{ t(step.label) }}</strong>
          <small>{{ t(step.hint) }}</small>
        </span>
        <button
          v-if="!step.done"
          type="button"
          class="btn btn-outline-secondary btn-sm"
          @click="runStep(step)"
        >
          {{ t(step.action) }}
        </button>
        <span v-else class="teacher-getting-started__done">{{ t('teacher.getting_started_done') }}</span>
      </li>
    </ol>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { teacherViewportMixin } from '../../mixins/teacherViewportMixin'

const DISMISS_KEY = 'mutqin.teacher.gettingStarted.dismissed'
const ATTENDANCE_KEY = 'mutqin.teacher.gettingStarted.attendance'

export default {
  name: 'TeacherGettingStarted',
  mixins: [i18nMixin, teacherViewportMixin],
  props: {
    studentCount: { type: Number, default: 0 },
    outstandingAssignments: { type: Number, default: 0 },
    overdueAssignments: { type: Number, default: 0 },
  },
  emits: ['import-students', 'create-assignment', 'open-attendance'],
  data() {
    return { dismissed: false, attendanceDone: false }
  },
  computed: {
    steps() {
      const hasStudents = Number(this.studentCount) > 0
      const hasAssignments = Number(this.outstandingAssignments) > 0 || Number(this.overdueAssignments) > 0
      return [
        {
          id: 'students',
          done: hasStudents,
          label: 'teacher.getting_started_students',
          hint: 'teacher.getting_started_students_hint',
          action: 'teacher.getting_started_students_action',
          event: 'import-students',
        },
        {
          id: 'assignment',
          done: hasAssignments,
          label: 'teacher.getting_started_assignment',
          hint: 'teacher.getting_started_assignment_hint',
          action: 'teacher.getting_started_assignment_action',
          event: 'create-assignment',
        },
        {
          id: 'attendance',
          done: this.attendanceDone,
          label: 'teacher.getting_started_attendance',
          hint: 'teacher.getting_started_attendance_hint',
          action: 'teacher.getting_started_attendance_action',
          event: 'open-attendance',
        },
      ]
    },
    incompleteCount() {
      return this.steps.filter((step) => !step.done).length
    },
    visible() {
      if (this.dismissed) return false
      return this.incompleteCount > 0
    },
  },
  mounted() {
    try {
      this.dismissed = localStorage.getItem(DISMISS_KEY) === '1'
      this.attendanceDone = localStorage.getItem(ATTENDANCE_KEY) === '1'
    } catch {
      this.dismissed = false
    }
  },
  methods: {
    runStep(step) {
      if (step.id === 'attendance') {
        this.attendanceDone = true
        try {
          localStorage.setItem(ATTENDANCE_KEY, '1')
        } catch {
          /* storage unavailable */
        }
      }
      this.$emit(step.event)
    },
    dismiss() {
      this.dismissed = true
      try {
        localStorage.setItem(DISMISS_KEY, '1')
      } catch {
        /* storage unavailable */
      }
    },
  },
}
</script>