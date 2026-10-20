<template>
  <div class="teacher-table-wrap">
    <div class="teacher-table teacher-table--students" role="table" :aria-label="t('teacher.nav_students')">
      <div class="teacher-table__head" role="row">
        <span class="teacher-table__cell teacher-table__cell--name" role="columnheader">{{ t('teacher.col_name') }}</span>
        <span class="teacher-table__cell teacher-table__cell--meta" role="columnheader">{{ t('teacher.last') }}</span>
        <span class="teacher-table__cell teacher-table__cell--num" role="columnheader">{{ t('teacher.col_practice') }}</span>
        <span class="teacher-table__cell teacher-table__cell--num" role="columnheader">{{ t('teacher.ai_rate') }}</span>
        <span class="teacher-table__cell teacher-table__cell--num" role="columnheader">{{ t('teacher.weak') }}</span>
        <span class="teacher-table__cell teacher-table__cell--flag" role="columnheader"><span class="visually-hidden">{{ t('teacher.need_look') }}</span></span>
      </div>
      <button
        v-for="student in students"
        :key="student.id"
        type="button"
        class="teacher-table__row"
        role="row"
        :aria-label="rowLabel(student)"
        @click="$emit('open', student.id)"
      >
        <span class="teacher-table__cell teacher-table__cell--name" role="cell">
          <span class="teacher-table__avatar" aria-hidden="true">{{ initial(student.name) }}</span>
          <span class="teacher-table__name">{{ student.name }}</span>
        </span>
        <span class="teacher-table__cell teacher-table__cell--meta" role="cell">
          {{ lastSeen(student) }}
        </span>
        <span class="teacher-table__cell teacher-table__cell--num" role="cell">
          {{ ayahs(student) }}
        </span>
        <span class="teacher-table__cell teacher-table__cell--num" role="cell">
          <span class="teacher-table__score" :class="scoreClass(student)">{{ score(student) }}</span>
        </span>
        <span class="teacher-table__cell teacher-table__cell--num" role="cell">
          {{ weak(student) }}
        </span>
        <span class="teacher-table__cell teacher-table__cell--flag" role="cell">
          <span v-if="student.needs_attention" class="teacher-table__dot" :title="t('teacher.need_look')">
            <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
            <span class="teacher-table__dot-label">{{ t('teacher.need_look') }}</span>
          </span>
        </span>
        <span class="teacher-table__mobile-stats" aria-hidden="true">
          {{ mobileStats(student) }}
        </span>
      </button>
    </div>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { scoreBadgeTone, studentInitial } from '../../scripts/teacher/formatters'

export default {
  name: 'TeacherStudentTable',
  mixins: [i18nMixin],
  props: {
    students: { type: Array, default: () => [] },
    formatWhen: { type: Function, required: true },
  },
  emits: ['open'],
  methods: {
    initial: studentInitial,
    lastSeen(student) {
      return student.last_activity_at ? this.formatWhen(student.last_activity_at) : this.t('teacher.no_activity')
    },
    ayahs(student) {
      const n = student.ayahs_practised
      return n === null || n === undefined ? '—' : String(n)
    },
    score(student) {
      const rate = student.ai_success_rate
      return typeof rate === 'number' ? `${rate}%` : '—'
    },
    scoreClass(student) {
      const rate = student.ai_success_rate
      if (typeof rate !== 'number') return ''
      return `teacher-table__score--${scoreBadgeTone(rate)}`
    },
    weak(student) {
      if (!student.weak_count) return '—'
      if (student.weak_example?.surah_name) {
        return `${student.weak_example.surah_name} ${student.weak_example.ayah_number}`
      }
      return String(student.weak_count)
    },
    rowLabel(student) {
      return `${student.name}, ${this.score(student)}, ${this.lastSeen(student)}`
    },
    mobileStats(student) {
      return this.t('teacher.student_row_mobile', {
        ayahs: this.ayahs(student),
        score: this.score(student),
        weak: this.weak(student),
      })
    },
  },
}
</script>
