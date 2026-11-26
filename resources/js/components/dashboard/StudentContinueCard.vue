<template>
  <a class="teacher-pane student-continue" :href="action.href" :aria-label="action.ariaLabel || undefined">
    <span class="teacher-metric__icon" aria-hidden="true"><i :class="action.icon"></i></span>
    <div class="student-continue__copy">
      <p class="teacher-meta">{{ label || action.label }}</p>
      <h2 class="teacher-pane__title">{{ action.title }}</h2>
      <p v-if="action.hint || action.range" class="teacher-meta">{{ action.hint || action.range }}</p>
    </div>
    <span class="btn btn-primary">{{ action.cta }}</span>
  </a>
</template>

<script>
export default {
  name: 'StudentContinueCard',
  props: {
    action: { type: Object, required: true },
    label: { type: String, default: '' },
  },
}
</script>
