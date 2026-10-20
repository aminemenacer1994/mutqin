<template>
  <section class="teacher-pane" :class="tone ? `teacher-pane--${tone}` : ''">
    <header v-if="title || hint" class="teacher-pane__head">
      <span v-if="icon" class="teacher-pane__icon" aria-hidden="true"><i :class="icon"></i></span>
      <div class="teacher-pane__titles">
        <h3 v-if="title" class="teacher-pane__title">{{ title }}</h3>
        <p v-if="hint" class="teacher-pane__hint">{{ hint }}</p>
      </div>
    </header>
    <div class="teacher-pane__body">
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
