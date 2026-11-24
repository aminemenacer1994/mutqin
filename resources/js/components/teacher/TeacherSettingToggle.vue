<template>
  <button
    :id="id"
    type="button"
    role="switch"
    class="teacher-setting-toggle"
    :class="{ 'is-on': modelValue, 'is-disabled': disabled }"
    :aria-checked="modelValue ? 'true' : 'false'"
    :aria-label="ariaLabel || undefined"
    :disabled="disabled"
    @click="toggle"
    @keydown.space.prevent="toggle"
    @keydown.enter.prevent="toggle"
  >
    <span class="teacher-setting-toggle__track" aria-hidden="true">
      <span class="teacher-setting-toggle__thumb" />
    </span>
  </button>
</template>

<script>
export default {
  name: 'TeacherSettingToggle',
  props: {
    modelValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  methods: {
    toggle() {
      if (this.disabled) return
      this.$emit('update:modelValue', !this.modelValue)
    },
  },
}
</script>