<template>
  <div class="table-responsive teacher-table-wrap">
    <table class="table table-hover align-middle mb-0 teacher-table teacher-table--students" :aria-label="t('teacher.nav_students')">
      <thead class="table-light">
        <tr>
          <th scope="col"><i class="bi bi-person me-1" aria-hidden="true"></i>{{ t('teacher.col_name') }}</th>
          <th scope="col"><i class="bi bi-clock-history me-1" aria-hidden="true"></i>{{ t('teacher.last') }}</th>
          <th scope="col" class="text-end"><i class="bi bi-journal-check me-1" aria-hidden="true"></i>{{ t('teacher.col_practice') }}</th>
          <th scope="col" class="text-end"><i class="bi bi-stars me-1" aria-hidden="true"></i>{{ t('teacher.ai_rate') }}</th>
          <th scope="col"><i class="bi bi-flag me-1" aria-hidden="true"></i>{{ t('teacher.need_look') }}</th>
          <th scope="col"><span class="visually-hidden">{{ t('teacher.open') }}</span></th>
        </tr>
      </thead>
      <tbody>
      <tr
        v-for="student in students"
        :key="student.id"
        class="teacher-table__row"
        :class="rowClasses(student)"
        tabindex="0"
        role="row"
        :aria-label="rowLabel(student)"
        @click="$emit('open', student.id)"
        @keydown.enter.prevent="$emit('open', student.id)"
        @keydown.space.prevent="$emit('open', student.id)"
      >
        <td class="teacher-table__cell teacher-table__cell--name">
          <span class="teacher-table__avatar" aria-hidden="true">{{ initial(student.name) }}</span>
          <span class="teacher-table__name">{{ student.name }}</span>
        </td>
        <td class="teacher-table__cell teacher-table__cell--meta">
          {{ lastSeen(student) }}
        </td>
        <td class="teacher-table__cell teacher-table__cell--num text-end">
          <span class="teacher-table__metric">
            <strong>{{ ayahs(student) }}</strong>
            <small>{{ t('teacher.col_practice') }}</small>
          </span>
        </td>
        <td class="teacher-table__cell teacher-table__cell--num text-end">
          <span class="badge rounded-pill teacher-table__score" :class="scoreClass(student)"><i class="bi bi-stars me-1" aria-hidden="true"></i>{{ score(student) }}</span>
        </td>
        <td class="teacher-table__cell teacher-table__cell--concern">
          <span v-if="concern(student)" class="teacher-table__concern" :class="`is-${concern(student).tone}`">
            <i :class="concern(student).icon" class="me-1" aria-hidden="true"></i>
            {{ concern(student).label }}
          </span>
          <span v-else class="teacher-table__quiet">{{ t('teacher.none') }}</span>
        </td>
        <td class="teacher-table__cell teacher-table__cell--flag text-end">
          <span class="teacher-table__open" aria-hidden="true"><i class="bi bi-arrow-up-right"></i></span>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { attentionReasonTags, scoreBadgeTone, studentInitial } from '../../scripts/teacher/formatters'

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
    rowClasses(student) {
      const concern = this.concern(student)
      const tone = typeof student.ai_success_rate === 'number'
        ? scoreBadgeTone(student.ai_success_rate)
        : 'muted'
      return [
        concern ? `is-${concern.tone}` : 'is-quiet',
        `is-performance-${tone}`,
      ]
    },
    weak(student) {
      if (!student.weak_count) return '—'
      if (student.weak_example?.surah_name) {
        return `${student.weak_example.surah_name} ${student.weak_example.ayah_number}`
      }
      return String(student.weak_count)
    },
    concern(student) {
      return attentionReasonTags(student, this.t)[0] || null
    },
    rowLabel(student) {
      const concern = this.concern(student)?.label
      return [student.name, this.score(student), this.lastSeen(student), concern].filter(Boolean).join(', ')
    },
  },
}
</script>
