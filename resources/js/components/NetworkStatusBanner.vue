<template>
  <Teleport to="body">
    <div class="network-status-banner-host">
      <Transition name="network-status-banner">
        <div
          v-if="visible"
          class="network-status-banner"
          :class="{ 'network-status-banner--offline': effectivelyOffline }"
          role="status"
          aria-live="polite"
        >
          <div class="network-status-banner__inner">
            <i class="bi" :class="effectivelyOffline ? 'bi-wifi-off' : 'bi-wifi'" aria-hidden="true"></i>
            <span>{{ message }}</span>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script>
import {
  isBrowserOnline,
  NETWORK_UNREACHABLE_EVENT,
  subscribeNetworkStatus,
} from '../utils/networkStatus'

export default {
  name: 'NetworkStatusBanner',
  data() {
    return {
      online: isBrowserOnline(),
      networkBlocked: false,
      showBackOnline: false,
      unsubscribe: null,
      backOnlineTimer: null,
      onNetworkUnreachable: null,
    }
  },
  computed: {
    effectivelyOffline() {
      return !this.online || this.networkBlocked
    },
    visible() {
      return this.effectivelyOffline || this.showBackOnline
    },
    message() {
      if (this.effectivelyOffline) return this.t('common.status.offlineBanner')
      return this.t('common.status.backOnline')
    },
  },
  mounted() {
    this.unsubscribe = subscribeNetworkStatus((online) => {
      const wasOffline = this.effectivelyOffline
      this.online = online
      if (online) this.networkBlocked = false
      if (online && wasOffline) {
        this.flashBackOnline()
      }
      if (!online) {
        this.clearBackOnline()
      }
    })
    this.onNetworkUnreachable = () => {
      this.networkBlocked = true
      this.clearBackOnline()
    }
    window.addEventListener(NETWORK_UNREACHABLE_EVENT, this.onNetworkUnreachable)
  },
  beforeUnmount() {
    if (typeof this.unsubscribe === 'function') this.unsubscribe()
    if (this.onNetworkUnreachable) {
      window.removeEventListener(NETWORK_UNREACHABLE_EVENT, this.onNetworkUnreachable)
    }
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
.network-status-banner-host {
  position: fixed;
  top: calc(var(--nav-h, 64px) + env(safe-area-inset-top, 0px) + 0.65rem);
  inset-inline: 0;
  z-index: 1025;
  display: flex;
  justify-content: center;
  padding-inline: max(0.75rem, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px));
  pointer-events: none;
}

.network-status-banner {
  width: 100%;
  max-width: min(calc(100vw - 1.5rem), 28rem);
  color: var(--text, #1f1812);
  text-align: center;
  pointer-events: none;
}

.network-status-banner__inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  padding: 0.52rem 0.95rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--warning, #c9973a) 32%, var(--border, #d6d0c6));
  background: color-mix(in srgb, var(--warning, #c9973a) 14%, var(--surface-strong, #fff));
  box-shadow:
    0 6px 20px color-mix(in srgb, var(--text, #1f1812) 8%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 40%, transparent);
  font-size: 0.84rem;
  font-weight: 600;
  line-height: 1.35;
}

.network-status-banner--offline .network-status-banner__inner {
  background: color-mix(in srgb, var(--warning, #c9973a) 18%, var(--surface-strong, #fff));
}

.network-status-banner:not(.network-status-banner--offline) .network-status-banner__inner {
  border-color: color-mix(in srgb, var(--success, #3d7a5a) 30%, var(--border, #d6d0c6));
  background: color-mix(in srgb, var(--success, #3d7a5a) 14%, var(--surface-strong, #fff));
}

.network-status-banner__inner .bi {
  flex-shrink: 0;
  font-size: 0.95rem;
  color: var(--warning, #c9973a);
}

.network-status-banner:not(.network-status-banner--offline) .network-status-banner__inner .bi {
  color: var(--success, #3d7a5a);
}

[data-theme="dark"] .network-status-banner,
html[data-theme="dark"] .network-status-banner {
  color: var(--text, #f3eee7);
}

[data-theme="dark"] .network-status-banner__inner,
html[data-theme="dark"] .network-status-banner__inner {
  box-shadow:
    0 8px 24px color-mix(in srgb, #000 28%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 8%, transparent);
}

[data-theme="sepia"] .network-status-banner__inner,
html[data-theme="sepia"] .network-status-banner__inner {
  background: color-mix(in srgb, var(--warning, #c9973a) 12%, var(--surface-strong, #fff9f0));
}

.network-status-banner-enter-active,
.network-status-banner-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.network-status-banner-enter-from,
.network-status-banner-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (min-width: 640px) {
  .network-status-banner {
    width: auto;
    max-width: 24rem;
  }

  .network-status-banner__inner {
    width: auto;
    padding-inline: 1rem;
  }
}

@media (max-width: 480px) {
  .network-status-banner__inner {
    font-size: 0.8rem;
    padding: 0.48rem 0.85rem;
  }
}
</style>
