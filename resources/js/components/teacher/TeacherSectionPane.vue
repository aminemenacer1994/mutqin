<template>
  <section
    class="teacher-pane"
    :class="[
      tone ? `teacher-pane--${tone}` : '',
      flat ? 'teacher-pane--flat' : 'card',
    ]"
  >
    <header v-if="title || hint || $slots.head" class="teacher-pane__head d-flex align-items-start gap-2" :class="{ 'card-header': !flat }">
      <slot name="head">
        <span v-if="icon" class="teacher-pane__icon d-inline-flex align-items-center justify-content-center" aria-hidden="true"><i :class="icon"></i></span>
        <div class="teacher-pane__titles flex-grow-1">
          <h3 v-if="title" class="teacher-pane__title mb-0" :class="{ 'card-title': !flat }">{{ title }}</h3>
          <p v-if="hint" class="teacher-pane__hint mb-0" :class="{ 'card-text': !flat }">{{ hint }}</p>
        </div>
      </slot>
      <slot name="actions" />
    </header>
    <div class="teacher-pane__body" :class="{ 'card-body': !flat }">
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
    flat: { type: Boolean, default: false },
  },
}
</script>
