<template>
  <component
    :is="tag"
    class="dash-btn"
    :class="buttonClasses"
    :type="tag === 'button' ? type : undefined"
    :href="tag === 'a' ? href : undefined"
    :disabled="tag === 'button' ? isInactive : undefined"
    :aria-disabled="isInactive ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :aria-label="ariaLabel || undefined"
    @click="onClick"
  >
    <i v-if="loading" class="bi bi-arrow-repeat is-loading" aria-hidden="true"></i>
    <i v-else-if="icon" class="bi" :class="icon" aria-hidden="true"></i>
    <span v-if="$slots.default"><slot /></span>
  </component>
</template>

<script>
const VARIANT_CLASS = {
  primary: 'dash-btn--primary',
  secondary: 'dash-btn--secondary',
  tertiary: 'dash-btn--tertiary',
  ghost: 'dash-btn--ghost',
  danger: 'dash-btn--danger',
}

export default {
  name: 'AppButton',
  props: {
    variant: {
      type: String,
      default: 'primary',
      validator: (v) => ['primary', 'secondary', 'tertiary', 'ghost', 'danger'].includes(v),
    },
    size: { type: String, default: 'md' },
    type: { type: String, default: 'button' },
    href: { type: String, default: '' },
    icon: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    ariaLabel: { type: String, default: '' },
  },
  emits: ['click'],
  computed: {
    tag() {
      return this.href ? 'a' : 'button'
    },
    isInactive() {
      return this.disabled || this.loading
    },
    buttonClasses() {
      return [
        VARIANT_CLASS[this.variant] || VARIANT_CLASS.primary,
        this.size === 'sm' ? 'dash-btn--sm' : null,
        this.loading ? 'is-loading' : null,
      ]
    },
  },
  methods: {
    onClick(event) {
      if (this.isInactive) {
        event.preventDefault()
        return
      }
      this.$emit('click', event)
    },
  },
}
</script>