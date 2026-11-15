<template>
  <span class="teacher-badge" :class="toneClass" :title="title || undefined">
    <i v-if="icon" :class="icon" aria-hidden="true"></i>
    <slot>{{ label }}</slot>
  </span>
</template>

<script>
export default {
  name: 'TeacherStatusBadge',
  props: {
    label: { type: String, default: '' },
    tone: { type: String, default: 'muted' },
    icon: { type: String, default: '' },
    title: { type: String, default: '' },
  },
  computed: {
    toneClass() {
      const tone = String(this.tone || 'muted')
      const map = {
        good: 'teacher-badge--good',
        approved: 'teacher-badge--good',
        positive: 'teacher-badge--good',
        mid: 'teacher-badge--mid',
        focus: 'teacher-badge--mid',
        warn: 'teacher-badge--warn',
        warning: 'teacher-badge--warn',
        danger: 'teacher-badge--danger',
        urgent: 'teacher-badge--danger',
        overdue: 'teacher-badge--danger',
        info: 'teacher-badge--mid',
        submitted: 'teacher-badge--mid',
        active: 'teacher-badge--mid',
        muted: 'teacher-badge--muted',
        default: 'teacher-badge--muted',
        neutral: 'teacher-badge--muted',
      }
      return map[tone] || `teacher-badge--${tone}` || 'teacher-badge--muted'
    },
  },
}
</script>
