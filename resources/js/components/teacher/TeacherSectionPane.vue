<template>
  <section class="card teacher-pane" :class="tone ? `teacher-pane--${tone}` : ''">
    <header v-if="title || hint" class="card-header teacher-pane__head d-flex align-items-start gap-2">
      <span v-if="icon" class="teacher-pane__icon d-inline-flex align-items-center justify-content-center" aria-hidden="true"><i :class="icon"></i></span>
      <div class="teacher-pane__titles flex-grow-1">
        <h3 v-if="title" class="card-title teacher-pane__title mb-0">{{ title }}</h3>
        <p v-if="hint" class="card-text teacher-pane__hint mb-0">{{ hint }}</p>
      </div>
    </header>
    <div class="card-body teacher-pane__body">
      <slot />
    </div>
  </section>
</template>

<script>
export default {
  name: 'TeacherSectionPane',
  props: {
    title: { type: String, default: '' },
    hint: { type: String, default: '' },
    icon: { type: String, default: '' },
    tone: { type: String, default: 'neutral' },
  },
}
</script>
