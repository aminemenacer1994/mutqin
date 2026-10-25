<template>
  <div v-if="illustrated" class="teacher-empty teacher-empty--illustrated">
    <svg viewBox="0 0 160 96" role="img" :aria-label="message">
      <path d="M34 29.5h78a8 8 0 0 1 8 8v38a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8v-38a8 8 0 0 1 8-8Z" />
      <path d="M48 19.5v19m50-19v19M26 46h94M45 61h18m9 0h28M45 71h12m9 0h22" />
      <path d="m118 68 7 7 15-18" class="teacher-empty__accent" />
      <circle cx="129" cy="65" r="22" />
    </svg>
    <p><slot>{{ message }}</slot></p>
  </div>
  <p v-else class="teacher-empty" :class="{ 'teacher-empty--inline': inline }">
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
    illustrated: { type: Boolean, default: false },
  },
}
</script>
