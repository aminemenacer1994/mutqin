<template>
  <button
    type="button"
    class="teacher-tile"
    :class="`teacher-tile--${status.key}`"
    :aria-label="ariaLabel"
    @click="$emit('open', student.id)"
  >
    <span class="teacher-tile__rail" aria-hidden="true"></span>
    <span class="teacher-list__avatar" aria-hidden="true">{{ initial }}</span>
    <span class="teacher-tile__copy">
      <strong>{{ student.name }}</strong>
      <span class="teacher-tile__meta">
        <template v-if="lastSeen">{{ lastSeen }} · </template>{{ status.label }}
      </span>
    </span>
    <span class="teacher-tile__go" aria-hidden="true">
      <i class="bi bi-arrow-right-short"></i>
    </span>
  </button>
</template>

<script>
import { studentInitial, studentStatus } from '../../scripts/teacher/formatters'
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'TeacherStudentCard',
  mixins: [i18nMixin],
  props: {
    student: { type: Object, required: true },
    organisationLabel: { type: String, default: '' },
    formatWhen: { type: Function, required: true },
  },
  emits: ['open'],
  computed: {
    initial() {
      return studentInitial(this.student.name)
    },
    status() {
      return studentStatus(this.student, this.t)
    },
    lastSeen() {
      return this.student.last_activity_at ? this.formatWhen(this.student.last_activity_at) : ''
    },
    ariaLabel() {
      const when = this.lastSeen || this.t('teacher.unavailable')
      return `${this.student.name}, ${this.status.label}, ${when}`
    },
  },
}
</script>
