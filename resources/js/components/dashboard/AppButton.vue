<template>
  <component
    :is="tag"
    class="app-btn"
    :class="[`app-btn--${variant}`, sizeClass, { 'is-disabled': disabled }]"
    :type="tag === 'button' ? type : undefined"
    :href="tag === 'a' ? href : undefined"
    :disabled="tag === 'button' ? disabled : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-label="ariaLabel || undefined"
    @click="onClick"
  >
    <i v-if="icon" class="bi" :class="icon" aria-hidden="true"></i>
    <span v-if="$slots.default"><slot /></span>
  </component>
</template>

<script>
export default {
  name: 'AppButton',
  props: {
    variant: {
      type: String,
      default: 'primary',
      validator: (v) => ['primary', 'secondary', 'tertiary', 'ghost'].includes(v),
    },
    size: { type: String, default: 'md' },
    type: { type: String, default: 'button' },
    href: { type: String, default: '' },
    icon: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    ariaLabel: { type: String, default: '' },
  },
  emits: ['click'],
  computed: {
    tag() {
      return this.href ? 'a' : 'button'
    },
    sizeClass() {
      return this.size === 'sm' ? 'app-btn--sm' : 'app-btn--md'
    },
  },
  methods: {
    onClick(event) {
      if (this.disabled) {
        event.preventDefault()
        return
      }
      this.$emit('click', event)
    },
  },
}
</script>
