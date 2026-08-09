<template>
  <AppStatus
    class="network-fallback"
    :class="{ 'network-fallback--page': page }"
    :variant="statusVariant"
    :title="resolvedTitle"
    :description="resolvedDescription"
    :action-label="showRetry ? resolvedRetryLabel : ''"
    :secondary-action-label="showHome ? resolvedHomeLabel : ''"
    :action-href="''"
    :fill="fill"
    :compact="compact"
    :size="size"
    @action="onRetry"
    @secondary-action="goHome"
  />
</template>

<script>
import AppStatus from './AppStatus.vue'
import { onReconnect } from '../utils/networkStatus'

const KIND_VARIANT = {
  offline: 'offline',
  network: 'offline',
  failure: 'error',
  error: 'error',
}

export default {
  name: 'NetworkFallback',
  components: { AppStatus },
  props: {
    /** offline | network | failure | error */
    kind: {
      type: String,
      default: 'failure',
      validator: (value) => ['offline', 'network', 'failure', 'error'].includes(value),
    },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    retryLabel: { type: String, default: '' },
    homeLabel: { type: String, default: '' },
    homeHref: { type: String, default: '/' },
    showRetry: { type: Boolean, default: true },
    showHome: { type: Boolean, default: true },
    /** When true, emit retry once the browser comes back online. */
    autoRetryOnReconnect: { type: Boolean, default: false },
    fill: { type: Boolean, default: true },
    compact: { type: Boolean, default: false },
    size: {
      type: String,
      default: 'lg',
      validator: (value) => ['sm', 'md', 'lg'].includes(value),
    },
    page: { type: Boolean, default: false },
  },
  emits: ['retry', 'home'],
  data() {
    return {
      cancelReconnect: null,
    }
  },
  computed: {
    statusVariant() {
      return KIND_VARIANT[this.kind] || 'error'
    },
    isOfflineKind() {
      return this.kind === 'offline' || this.kind === 'network'
    },
    resolvedTitle() {
      if (this.title) return this.title
      if (this.isOfflineKind) return this.t('common.status.offlineTitle')
      return this.t('common.status.errorTitle')
    },
    resolvedDescription() {
      if (this.description) return this.description
      if (this.isOfflineKind) return this.t('common.status.offlineDesc')
      return this.t('common.status.errorDesc')
    },
    resolvedRetryLabel() {
      return this.retryLabel || this.t('common.status.retry') || this.t('common.retry')
    },
    resolvedHomeLabel() {
      return this.homeLabel || this.t('common.status.returnHome')
    },
  },
  watch: {
    autoRetryOnReconnect: {
      immediate: true,
      handler(enabled) {
        this.teardownReconnect()
        if (enabled) this.setupReconnect()
      },
    },
    kind() {
      if (this.autoRetryOnReconnect) {
        this.teardownReconnect()
        this.setupReconnect()
      }
    },
  },
  beforeUnmount() {
    this.teardownReconnect()
  },
  methods: {
    t(key, params) {
      if (typeof this.$t === 'function') return this.$t(key, params)
      return key
    },
    setupReconnect() {
      if (!this.isOfflineKind && this.kind !== 'failure') return
      this.cancelReconnect = onReconnect(() => {
        this.$emit('retry')
      })
    },
    teardownReconnect() {
      if (typeof this.cancelReconnect === 'function') {
        this.cancelReconnect()
      }
      this.cancelReconnect = null
    },
    onRetry() {
      this.$emit('retry')
    },
    goHome() {
      this.$emit('home')
      const href = this.homeHref || '/'
      if (typeof window !== 'undefined') {
        window.location.assign(href)
      }
    },
  },
}
</script>

<style scoped>
.network-fallback--page {
  min-height: min(52vh, 28rem);
}
</style>
