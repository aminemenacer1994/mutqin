<template>
  <div
    v-if="visible"
    class="network-status-banner"
    :class="{ 'network-status-banner--offline': !online }"
    role="status"
    aria-live="polite"
  >
    <div class="network-status-banner__inner">
      <i class="bi" :class="online ? 'bi-wifi' : 'bi-wifi-off'" aria-hidden="true"></i>
      <span>{{ message }}</span>
    </div>
  </div>
</template>

<script>
import { isBrowserOnline, subscribeNetworkStatus } from '../utils/networkStatus'

export default {
  name: 'NetworkStatusBanner',
  data() {
    return {
      online: isBrowserOnline(),
      showBackOnline: false,
      unsubscribe: null,
      backOnlineTimer: null,
      /** Pages that already surface feature-specific offline copy. */
      suppressForLocalHandler: false,
    }
  },
  computed: {
    visible() {
      if (this.suppressForLocalHandler && !this.online) return false
      return !this.online || this.showBackOnline
    },
    message() {
      if (!this.online) return this.t('common.status.offlineTitle')
      return this.t('common.status.backOnline')
    },
  },
  mounted() {
    this.suppressForLocalHandler = !!document.querySelector('memorisation')
    this.unsubscribe = subscribeNetworkStatus((online) => {
      const wasOffline = !this.online
      this.online = online
      if (online && wasOffline) {
        this.flashBackOnline()
      }
      if (!online) {
        this.clearBackOnline()
      }
    })
  },
  beforeUnmount() {
    if (typeof this.unsubscribe === 'function') this.unsubscribe()
    this.clearBackOnline()
  },
  methods: {
    t(key, params) {
      if (typeof this.$t === 'function') return this.$t(key, params)
      return key
    },
    flashBackOnline() {
      this.clearBackOnline()
      this.showBackOnline = true
      this.backOnlineTimer = window.setTimeout(() => {
        this.showBackOnline = false
        this.backOnlineTimer = null
      }, 2400)
    },
    clearBackOnline() {
      if (this.backOnlineTimer) {
        window.clearTimeout(this.backOnlineTimer)
        this.backOnlineTimer = null
      }
      this.showBackOnline = false
    },
  },
}
</script>

<style>
.network-status-banner {
  position: sticky;
  top: 0;
  z-index: 1080;
  display: grid;
  justify-items: center;
  padding: 0.45rem 0.75rem;
  background: color-mix(in srgb, var(--warning, #c9973a) 18%, var(--surface, #fff));
  border-bottom: 1px solid color-mix(in srgb, var(--warning, #c9973a) 35%, var(--border, #d6d0c6));
  color: var(--text, #1f1812);
  font-size: 0.86rem;
  font-weight: 600;
  text-align: center;
}

.network-status-banner--offline {
  background: color-mix(in srgb, var(--warning, #c9973a) 22%, var(--surface, #fff));
}

.network-status-banner:not(.network-status-banner--offline) {
  background: color-mix(in srgb, var(--success, #3d7a5a) 16%, var(--surface, #fff));
  border-bottom-color: color-mix(in srgb, var(--success, #3d7a5a) 32%, var(--border, #d6d0c6));
}

.network-status-banner__inner {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: 40rem;
}

.network-status-banner__inner .bi {
  font-size: 1rem;
  color: var(--warning, #c9973a);
}

.network-status-banner:not(.network-status-banner--offline) .bi {
  color: var(--success, #3d7a5a);
}

[data-theme="dark"] .network-status-banner,
html[data-theme="dark"] .network-status-banner {
  color: var(--text, #f3eee7);
}

@media (max-width: 480px) {
  .network-status-banner {
    font-size: 0.82rem;
    padding: 0.4rem 0.65rem;
  }
}
</style>
