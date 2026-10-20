<template>
  <header class="teacher-page-header">
    <div class="teacher-page-header__main">
      <p v-if="eyebrow" class="teacher-page-header__eyebrow">{{ eyebrow }}</p>
      <h1 class="teacher-page-header__title" :class="{ 'teacher-page-header__title--display': displayTitle }">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="teacher-page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="teacher-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script>
export default {
  name: 'TeacherPageHeader',
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    eyebrow: { type: String, default: '' },
    displayTitle: { type: Boolean, default: false },
  },
}
</script>
