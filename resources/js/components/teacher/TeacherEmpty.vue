<template>
  <p class="teacher-empty" :class="{ 'teacher-empty--inline': inline }">
    <i v-if="icon" :class="icon" aria-hidden="true"></i>
    <slot>{{ message }}</slot>
  </p>
</template>

<script>
export default {
  name: 'TeacherEmpty',
  props: {
    message: { type: String, default: '' },
    icon: { type: String, default: '' },
    inline: { type: Boolean, default: false },
  },
}
</script>
