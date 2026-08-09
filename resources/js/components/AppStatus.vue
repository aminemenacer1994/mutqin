<template>
  <div
    class="app-status"
    :class="rootClasses"
    :role="roleAttr"
    :aria-live="ariaLive"
    :aria-busy="variant === 'loading' ? 'true' : undefined"
  >
    <div class="app-status__icon" aria-hidden="true">
      <span v-if="variant === 'loading'" class="app-status__spinner"></span>
      <i v-else class="bi" :class="resolvedIcon"></i>
    </div>

    <div class="app-status__copy">
      <strong v-if="title" class="app-status__title">{{ title }}</strong>
      <p v-if="description" class="app-status__desc">{{ description }}</p>
      <slot name="description" />
    </div>

    <div v-if="showActions" class="app-status__actions">
      <slot name="actions">
        <a
          v-if="actionHref && actionLabel"
          class="app-status__btn app-status__btn--primary"
          :href="actionHref"
        >{{ actionLabel }}</a>
        <button
          v-else-if="actionLabel"
          type="button"
          class="app-status__btn app-status__btn--primary"
          @click="$emit('action')"
        >{{ actionLabel }}</button>
        <button
          v-if="secondaryActionLabel"
          type="button"
          class="app-status__btn app-status__btn--secondary"
          @click="$emit('secondary-action')"
        >{{ secondaryActionLabel }}</button>
      </slot>
    </div>
  </div>
</template>

<script>
const VARIANT_ICONS = {
  loading: 'bi-hourglass-split',
  empty: 'bi-inbox',
  'no-results': 'bi-funnel',
  error: 'bi-exclamation-triangle',
  offline: 'bi-wifi-off',
  auth: 'bi-lock',
  unavailable: 'bi-slash-circle',
}

export default {
  name: 'AppStatus',
  props: {
    /** loading | empty | no-results | error | offline | auth | unavailable */
    variant: {
      type: String,
      default: 'empty',
      validator: (value) => Object.prototype.hasOwnProperty.call(VARIANT_ICONS, value),
    },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    actionLabel: { type: String, default: '' },
    actionHref: { type: String, default: '' },
    secondaryActionLabel: { type: String, default: '' },
    /** Preserve layout height to reduce content jump */
    fill: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
    size: {
      type: String,
      default: 'md',
      validator: (value) => ['sm', 'md', 'lg'].includes(value),
    },
  },
  emits: ['action', 'secondary-action'],
  computed: {
    resolvedIcon() {
      return this.icon || VARIANT_ICONS[this.variant] || VARIANT_ICONS.empty
    },
    rootClasses() {
      return [
        `app-status--${this.variant}`,
        `app-status--${this.size}`,
        {
          'app-status--fill': this.fill,
          'app-status--compact': this.compact,
        },
      ]
    },
    roleAttr() {
      if (
        this.variant === 'error'
        || this.variant === 'offline'
        || this.variant === 'auth'
        || this.variant === 'unavailable'
      ) {
        return 'alert'
      }
      return 'status'
    },
    ariaLive() {
      return this.variant === 'loading' ? 'polite' : undefined
    },
    showActions() {
      if (this.$slots.actions) return true
      return !!(this.actionLabel || this.secondaryActionLabel)
    },
  },
}
</script>

<style src="../styles/app-status.css"></style>
