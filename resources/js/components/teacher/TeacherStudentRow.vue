<template>
  <button
    type="button"
    class="teacher-student-row"
    :aria-label="ariaLabel"
    @click="$emit('open', student.id)"
  >
    <span class="teacher-list__avatar" aria-hidden="true">{{ initial }}</span>
    <span class="teacher-student-row__copy">
      <strong>{{ student.name }}</strong>
      <span>{{ lastSeen || t('teacher.no_activity') }}</span>
    </span>
    <span class="teacher-student-row__stats" aria-hidden="true">
      <span class="teacher-student-row__stat">
        <span class="teacher-student-row__stat-label">{{ t('teacher.ayahs') }}</span>
        <span class="teacher-student-row__stat-value">{{ ayahsLabel }}</span>
      </span>
      <span class="teacher-student-row__stat">
        <span class="teacher-student-row__stat-label">{{ t('teacher.ai_rate') }}</span>
        <span class="teacher-student-row__stat-value">{{ scoreLabel }}</span>
      </span>
      <span class="teacher-student-row__stat">
        <span class="teacher-student-row__stat-label">{{ t('teacher.weak') }}</span>
        <span class="teacher-student-row__stat-value">{{ weakShort }}</span>
      </span>
    </span>
    <span v-if="student.needs_attention" class="teacher-chip teacher-chip--attention teacher-student-row__flag">
      {{ t('teacher.need_look') }}
    </span>
    <span class="teacher-student-row__go" aria-hidden="true">
      <i class="bi bi-arrow-right-short"></i>
    </span>
  </button>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { studentInitial, weakLabel } from '../../scripts/teacher/formatters'

export default {
  name: 'TeacherStudentRow',
  mixins: [i18nMixin],
  props: {
    student: { type: Object, required: true },
    formatWhen: { type: Function, required: true },
  },
  emits: ['open'],
  computed: {
    initial() {
      return studentInitial(this.student.name)
    },
    lastSeen() {
      return this.student.last_activity_at ? this.formatWhen(this.student.last_activity_at) : ''
    },
    ayahsLabel() {
      const n = this.student.ayahs_practised
      return n === null || n === undefined ? '—' : String(n)
    },
    scoreLabel() {
      const rate = this.student.ai_success_rate
      return typeof rate === 'number' ? `${rate}%` : '—'
    },
    weakShort() {
      if (!this.student.weak_count) return '—'
      const example = this.student.weak_example
      if (example?.ayah_number) return String(example.ayah_number)
      return String(this.student.weak_count)
    },
    ariaLabel() {
      return `${this.student.name}, ${this.scoreLabel}, ${weakLabel(this.student, this.t)}`
    },
  },
}
</script>
