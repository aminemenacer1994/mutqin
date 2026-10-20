<template>
  <div class="teacher-panel">
    <div v-if="title || $slots.head" class="teacher-panel__head">
      <slot name="head">
        <h2>{{ title }}</h2>
      </slot>
    </div>
    <div class="teacher-panel__body" :class="bodyClass">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: 'TeacherPanel',
  props: {
    title: { type: String, default: '' },
    bodyClass: { type: [String, Array, Object], default: '' },
  },
}
</script>
