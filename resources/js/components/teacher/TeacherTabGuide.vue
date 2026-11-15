<template>
  <header class="teacher-tab-guide" :class="`is-${kind}`">
    <span v-if="step" class="teacher-tab-guide__step" aria-hidden="true">{{ step }}</span>
    <div class="teacher-tab-guide__copy">
      <h2 v-if="kind === 'page'">{{ title }}</h2>
      <h3 v-else>{{ title }}</h3>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="teacher-tab-guide__action">
      <slot name="action" />
    </div>
  </header>
</template>

<script>
export default {
  name: 'TeacherTabGuide',
  props: {
    kind: { type: String, default: 'page' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    step: { type: [String, Number], default: '' },
  },
}
</script>
